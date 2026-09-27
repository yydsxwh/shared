/**
 * Platform Config Center 客户端。
 *
 * 两层：
 * - ConfigClient：薄封装，管理面与运行时都用它调 Platform，产品代码不手写 URL。
 * - ConfigResolver：产品运行时缓存。内存 TTL + revision 轮询 + Last-Known-Good，
 *   Platform 不可达时快速失败并继续用上一次成功的配置；一次业务请求不打 Platform。
 */

import {
  CONFIG_GROUP_LABELS,
  catalogGroup,
  groupMode,
  type ConfigAuditEntry,
  type ConfigCacheState,
  type ConfigCatalogEntry,
  type ConfigExportEntry,
  type ConfigGlobalInput,
  type ConfigGroup,
  type ConfigGroupSnapshot,
  type ConfigHealth,
  type ConfigHistoryEntry,
  type ConfigImpact,
  type ConfigKey,
  type ConfigOverrideInput,
  type ConfigProbeResult,
  type ConfigRevision,
  type ConfigSource,
  type ConfigWriteResult,
  type GlobalConfigGroupView,
  type ProductId,
  type ResolvedConfigEntry,
  type ResolvedConfigGroup,
} from "../contracts/config";
import type { PlatformHttpClient } from "./http";

export type ConfigCatalogResponse = { entries: ConfigCatalogEntry[]; groups: Record<ConfigGroup, string> };
export type ConfigOverridesResponse = {
  productId: ProductId;
  group: ConfigGroup;
  entries: Array<Pick<ResolvedConfigEntry, "key" | "value" | "secret" | "version">>;
  revision: number;
};

export class ConfigClient {
  constructor(private readonly http: PlatformHttpClient) {}

  getCatalog(): Promise<ConfigCatalogResponse> {
    return this.http.request("/config/catalog");
  }

  getRevision(): Promise<ConfigRevision> {
    return this.http.request("/config/revision");
  }

  getHealth(): Promise<ConfigHealth> {
    return this.http.request("/config/health");
  }

  // ---- 全局默认（站长 / 主站服务端） ---------------------------------------

  getGlobalGroup(group: ConfigGroup): Promise<GlobalConfigGroupView> {
    return this.http.request(`/config/global/${encodeURIComponent(group)}`);
  }

  setGlobal(key: ConfigKey, input: ConfigGlobalInput): Promise<ConfigWriteResult> {
    return this.http.request(`/config/global/${encodeURIComponent(key)}`, { method: "PUT", json: input });
  }

  getImpact(key: ConfigKey): Promise<ConfigImpact> {
    return this.http.request(`/config/impact/${encodeURIComponent(key)}`);
  }

  // ---- 产品作用域 -----------------------------------------------------------

  /**
   * 产品有效配置。`reveal: true` 只对产品自己的运行时有效，且只对
   * Catalog 标记 runtimeDeliverable 的 Secret 返回明文。
   */
  getEffectiveGroup(
    productId: ProductId,
    group: ConfigGroup,
    options: { reveal?: boolean } = {},
  ): Promise<ResolvedConfigGroup> {
    return this.http.request(
      `/config/products/${encodeURIComponent(productId)}/effective/${encodeURIComponent(group)}`,
      { query: { reveal: options.reveal ? "runtime" : undefined } },
    );
  }

  getOverrides(productId: ProductId, group: ConfigGroup): Promise<ConfigOverridesResponse> {
    return this.http.request(
      `/config/products/${encodeURIComponent(productId)}/overrides/${encodeURIComponent(group)}`,
    );
  }

  setOverride(productId: ProductId, key: ConfigKey, input: ConfigOverrideInput): Promise<ConfigWriteResult> {
    return this.http.request(
      `/config/products/${encodeURIComponent(productId)}/overrides/${encodeURIComponent(key)}`,
      { method: "PUT", json: input },
    );
  }

  /** 清除覆盖 = 恢复跟随全局。不会把当前全局值复制进产品。 */
  clearOverride(productId: ProductId, key: ConfigKey, expectedVersion?: number): Promise<ConfigWriteResult> {
    return this.http.request(
      `/config/products/${encodeURIComponent(productId)}/overrides/${encodeURIComponent(key)}`,
      { method: "DELETE", query: { expectedVersion } },
    );
  }

  /** 把当前全局快照复制成该产品的独立配置；Secret 也复制（服务端内部完成，不经过调用方） */
  copyGlobal(productId: ProductId, group: ConfigGroup): Promise<ResolvedConfigGroup> {
    return this.http.request(
      `/config/products/${encodeURIComponent(productId)}/copy-global/${encodeURIComponent(group)}`,
      { method: "POST", json: {} },
    );
  }

  /** 测试的是最终有效配置，不只是本地覆盖 */
  testGroup(productId: ProductId, group: ConfigGroup, input: Record<string, unknown> = {}): Promise<ConfigProbeResult> {
    return this.http.request(
      `/config/products/${encodeURIComponent(productId)}/test/${encodeURIComponent(group)}`,
      { method: "POST", json: input },
    );
  }

  // ---- 审计 / 历史 / 备份 ---------------------------------------------------

  listAudit(query: { limit?: number; productId?: ProductId; key?: ConfigKey } = {}): Promise<{ entries: ConfigAuditEntry[] }> {
    return this.http.request("/config/audit", { query: { limit: query.limit, productId: query.productId, key: query.key } });
  }

  listHistory(key: ConfigKey, productId?: ProductId): Promise<{ entries: ConfigHistoryEntry[] }> {
    return this.http.request(`/config/history/${encodeURIComponent(key)}`, { query: { productId } });
  }

  rollback(input: { scope: "GLOBAL" | "PRODUCT"; productId?: ProductId; key: ConfigKey; toVersion: number }): Promise<ConfigWriteResult> {
    return this.http.request("/config/rollback", { method: "POST", json: input });
  }

  /** 只导出 key、非敏感值与 Secret 已配置状态，不导出 Secret */
  exportMetadata(): Promise<{ entries: ConfigExportEntry[]; revision: number }> {
    return this.http.request("/config/export");
  }
}

// ---------------------------------------------------------------------------
// 运行时解析：缓存 + Last-Known-Good
// ---------------------------------------------------------------------------

export type ConfigSnapshotStore = {
  load(group: ConfigGroup): Promise<ConfigGroupSnapshot | null>;
  save(group: ConfigGroup, snapshot: ConfigGroupSnapshot): Promise<void>;
};

export type ConfigResolverOptions = {
  client: ConfigClient;
  productId: ProductId;
  /** 内存缓存有效期，默认 45 秒 */
  ttlMs?: number;
  /** 有 Last-Known-Good 时仍然认为它可用的最长时间；超过后状态标为 STALE，但仍返回 */
  staleAfterMs?: number;
  /** 现有环境变量：Platform 拿不到任何东西时的兜底 */
  envFallback?: (key: ConfigKey) => string | undefined;
  /** 产品自己的持久化（必须加密）；不传则只有内存 */
  store?: ConfigSnapshotStore;
  /** 运行时是否请求可下发的 Secret 明文 */
  reveal?: boolean;
  now?: () => number;
  onError?: (group: ConfigGroup, error: unknown) => void;
};

type MemoryEntry = {
  snapshot: ConfigGroupSnapshot;
  /** 上次向 Platform 确认过的时间 */
  checkedAt: number;
};

const DEFAULT_TTL_MS = 45_000;

export class ConfigResolver {
  private readonly memory = new Map<ConfigGroup, MemoryEntry>();
  private readonly inflight = new Map<ConfigGroup, Promise<ConfigGroupSnapshot>>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(private readonly options: ConfigResolverOptions) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.now = options.now ?? (() => Date.now());
  }

  get productId(): ProductId {
    return this.options.productId;
  }

  /** 当前组的缓存状态；没有任何缓存时为 UNCONFIGURED */
  state(group: ConfigGroup): ConfigCacheState {
    return this.memory.get(group)?.snapshot.state ?? "UNCONFIGURED";
  }

  invalidate(group?: ConfigGroup): void {
    if (group) this.memory.delete(group);
    else this.memory.clear();
  }

  /** 强制向 Platform 拉一次；后台「刷新有效配置」用 */
  refresh(group: ConfigGroup): Promise<ConfigGroupSnapshot> {
    this.memory.delete(group);
    return this.getGroup(group);
  }

  async getGroup(group: ConfigGroup): Promise<ConfigGroupSnapshot> {
    const cached = this.memory.get(group);
    const now = this.now();
    if (cached && now - cached.checkedAt < this.ttlMs) {
      return cached.snapshot;
    }
    const pending = this.inflight.get(group);
    if (pending) return pending;
    const task = this.load(group, cached ?? null).finally(() => this.inflight.delete(group));
    this.inflight.set(group, task);
    return task;
  }

  async getValue(key: ConfigKey): Promise<{ value: string | null; source: ConfigSource; state: ConfigCacheState }> {
    const group = key.split(".")[0] as ConfigGroup;
    const snapshot = await this.getGroup(group);
    const found = snapshot.group.entries.find((item) => item.key === key);
    if (!found) return { value: null, source: "UNSET", state: snapshot.state };
    return { value: found.value, source: found.source, state: snapshot.state };
  }

  async getRecord(group: ConfigGroup): Promise<Record<ConfigKey, string | null>> {
    const snapshot = await this.getGroup(group);
    const out: Record<ConfigKey, string | null> = {};
    for (const item of snapshot.group.entries) out[item.key] = item.value;
    return out;
  }

  private async load(group: ConfigGroup, cached: MemoryEntry | null): Promise<ConfigGroupSnapshot> {
    const now = this.now();
    try {
      if (cached) {
        // 先问 revision，没变就只续期，不重新拉整组
        const revision = await this.options.client.getRevision();
        if (revision.revision === cached.snapshot.group.revision) {
          const next: ConfigGroupSnapshot = { ...cached.snapshot, state: "CACHED", lastError: null };
          this.memory.set(group, { snapshot: next, checkedAt: now });
          return next;
        }
      }
      const resolved = await this.options.client.getEffectiveGroup(this.options.productId, group, {
        reveal: this.options.reveal,
      });
      const snapshot: ConfigGroupSnapshot = {
        group: resolved,
        state: "LIVE",
        fetchedAt: new Date(now).toISOString(),
        lastError: null,
      };
      this.memory.set(group, { snapshot, checkedAt: now });
      await this.options.store?.save(group, snapshot).catch(() => undefined);
      return snapshot;
    } catch (error) {
      this.options.onError?.(group, error);
      const message = error instanceof Error ? error.message : String(error);
      const fallback = cached?.snapshot ?? (await this.options.store?.load(group).catch(() => null)) ?? null;
      if (fallback) {
        const stale: ConfigGroupSnapshot = {
          ...fallback,
          state: "STALE",
          lastError: message,
          group: {
            ...fallback.group,
            entries: fallback.group.entries.map((item) => ({
              ...item,
              source: item.source === "UNSET" ? "UNSET" : "LAST_KNOWN_GOOD",
            })),
          },
        };
        // 记录本次检查时间，避免每个请求都重试 Platform；到 TTL 再试
        this.memory.set(group, { snapshot: stale, checkedAt: now });
        return stale;
      }
      const env = this.fromEnv(group, now, message);
      this.memory.set(group, { snapshot: env, checkedAt: now });
      return env;
    }
  }

  /** 没有任何缓存时用环境变量拼一份，让老生产能启动 */
  private fromEnv(group: ConfigGroup, now: number, lastError: string): ConfigGroupSnapshot {
    const entries: ResolvedConfigEntry[] = catalogGroup(group).map((definition) => {
      const envValue = this.options.envFallback?.(definition.key);
      const value = envValue !== undefined && envValue !== "" ? envValue : definition.builtinDefault ?? null;
      const source: ConfigSource = envValue ? "ENV_FALLBACK" : value !== null ? "BUILTIN_DEFAULT" : "UNSET";
      const isSecret = definition.sensitivity === "SECRET";
      return {
        key: definition.key,
        group: definition.group,
        label: definition.label,
        valueType: definition.valueType,
        sensitivity: definition.sensitivity,
        sharePolicy: definition.sharePolicy,
        clientVisibility: definition.clientVisibility,
        source,
        value: isSecret ? (this.options.reveal && definition.runtimeDeliverable ? value : null) : value,
        secret: isSecret ? { configured: Boolean(value), last4: value ? value.slice(-3) : null, fingerprint: null } : null,
        overridden: false,
        version: 0,
        globalConfigured: false,
      };
    });
    const configured = entries.some((item) => item.source === "ENV_FALLBACK");
    return {
      group: {
        productId: this.options.productId,
        group,
        mode: groupMode(entries),
        entries,
        revision: 0,
        resolvedAt: new Date(now).toISOString(),
      },
      state: configured ? "FALLBACK" : "UNCONFIGURED",
      fetchedAt: new Date(now).toISOString(),
      lastError,
    };
  }
}

/** 后台展示用的一句话状态 */
export function describeConfigState(snapshot: ConfigGroupSnapshot, now: number = Date.now()): string {
  const label = CONFIG_GROUP_LABELS[snapshot.group.group];
  switch (snapshot.state) {
    case "LIVE":
      return `${label}：已从 Platform 读取最新配置`;
    case "CACHED":
      return `${label}：使用缓存配置（revision ${snapshot.group.revision}）`;
    case "STALE": {
      const minutes = Math.max(1, Math.round((now - Date.parse(snapshot.fetchedAt)) / 60_000));
      return `${label}：当前使用缓存配置，Platform ${minutes} 分钟前不可达`;
    }
    case "FALLBACK":
      return `${label}：Platform 不可达，正在使用环境变量`;
    default:
      return `${label}：尚未配置`;
  }
}
