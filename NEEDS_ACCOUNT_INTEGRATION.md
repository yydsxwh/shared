# NEEDS_ACCOUNT_INTEGRATION

**Account 已经上线，是公司正式 Identity Provider。**

本文件记录的是：产品与 platform **如何接到已有 account**，而不是「还要不要建账号中心」。

本工作区没有 account 源码，因此：

- 不修改 account
- 不在 platform 或产品里伪造一套 IdP
- 需要读取 account 真实接口才能确认的事项，继续标 `NEEDS_ACCOUNT_INTEGRATION`

旧文件名 `NEEDS_ACCOUNT_MIGRATION.md` 已废弃，请改用本文件。

## Account 已具备（不要再写成「未来」）

- OAuth 2.0
- OpenID Connect
- Authorization Code Flow
- PKCE
- Discovery
- JWKS
- RS256 ID Token
- UserInfo
- Refresh Token Rotation
- Session / Security
- 全局不可变 user sub（`usr_xxx`）

## 产品侧现状

`Andyyyds` 与 `softwarelist` 仍各持一份实现（`packages/shared/src/`）：

| 模块 | 内容 |
|---|---|
| `auth.ts` | cookie session 签发与校验（jose） |
| `auth-providers.ts` | 微信 / 手机 / 邮箱 / 账号注册与绑定 |
| `password.ts` | bcrypt 哈希与校验 |
| `sms.ts` | 阿里云短信发送与验证码校验 |
| `wechat-oauth-state.ts` | 微信 OAuth state 签名 |
| `role-applications.ts` | 角色申请与站长审批流 |
| `studio.ts` | 后台鉴权入口 |

数据侧：两个站点各有自己的 `User` 表，**同一个人在两边仍是两个账号**。
合并用户或做跨产品 SSO 必须走 account，禁止在产品库之间对拷。

## 已做的接口准备

1. `@yydsxwh/shared/auth/identity`：`UserSub`、`OidcIdTokenClaims`、`SessionUser`、`AuthClient`
2. `@yydsxwh/shared/contracts/identity`：Verified User Context、assertion 头名、account 接入配置形状
3. platform 只在 **Service Identity 通过后** 接受 `X-Platform-Actor`；浏览器不能单独伪造用户

## 目标接入链

```
OIDC 用户身份
  → Product Session
  → Product Backend
  → Platform Verified User Context
```

移动端同样：

```
App → 产品后端（验 Session）→ Platform
```

客户端禁止持有 `PLATFORM_SERVICE_TOKEN` 或 OSS 长期密钥。

## 下一轮需要从 account 拿到的事实

| 项 | 用途 | 状态 |
|---|---|---|
| issuer | 校验 ID Token / assertion | `NEEDS_ACCOUNT_INTEGRATION` |
| JWKS URL | 验 RS256 | `NEEDS_ACCOUNT_INTEGRATION` |
| audience | 各产品 client 的 aud | `NEEDS_ACCOUNT_INTEGRATION` |
| 全局 sub 规则 | 确认 `usr_*` 形态与不可变约束 | 文档已知；接口细节待联调 |
| service / user assertion 策略 | 是否由 account 签发短期 assertion，或产品后端签名 JWT | `NEEDS_ACCOUNT_INTEGRATION` |

## 明确不要做的事

- 不要把登录系统迁进 platform
- 不要在 platform 或任一产品里再造一套统一身份
- 在 account 接入完成前，不要把两个站点的用户数据合并
- 不要猜测 account 的 Discovery 地址或密钥

## 仍被身份接入阻塞的事项

| 事项 | 为什么 |
|---|---|
| docs / mathcode 合并成单一部署 | 额度与发放记录在各自库；跨部署需要全局 sub 与 Entitlements |
| Entitlements | 「用户因此拥有什么能力」必须挂在全局 sub 上。**account 已具备；缺的是 Entitlements 与产品联调** |
| 跨产品单点登录 | 产品尚未接 OIDC |
| Platform 验 account assertion | 需要 issuer / JWKS / aud |
