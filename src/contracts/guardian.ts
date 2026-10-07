/**
 * 日事「可信好友守护」的跨端契约。
 * 闹钟授权和定位授权是两套记录，有效期也各自独立。
 * 好友关系、邮箱、手机号都不是授权主键，主键只有账号中心的 usr_。
 */

export type GrantScope = "TIME_RANGE" | "PERMANENT" | "ENTITY_BOUND";
export type GrantStatus = "ACTIVE" | "PAUSED" | "REVOKED" | "EXPIRED";
export type LocationShareMode = "LAST_KNOWN" | "LIVE";
export type LocationPrecision = "APPROXIMATE" | "PRECISE";
export type DevicePlatform = "android" | "ios" | "web";
export type PermissionLevel = "granted" | "denied" | "unknown";
export type NativeAlarmSupport = "SUPPORTED" | "UNSUPPORTED" | "NOT_VERIFIED" | "NOT_APPLICABLE";

export type LocationGrantContract = {
  id: string;
  ownerUserId: string;
  granteeUserId: string;
  scope: GrantScope;
  validFrom?: string;
  validUntil?: string;
  entityType?: string;
  entityId?: string;
  entityTitle?: string;
  mode: LocationShareMode;
  precision: LocationPrecision;
  status: GrantStatus;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
};

export type LocationSnapshotContract = {
  ownerUserId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt: string;
  receivedAt: string;
  source: "GPS" | "NETWORK" | "LAST_KNOWN";
};

export type DeviceCapabilitiesContract = {
  platform: DevicePlatform;
  remoteAlarm: {
    supported: boolean;
    exactAlarmPermission: PermissionLevel;
    notificationPermission: PermissionLevel;
    batteryRestricted: boolean;
    lastScheduledAt?: string;
  };
  location: {
    foregroundPermission: PermissionLevel;
    backgroundPermission: PermissionLevel;
    precise: boolean;
    sharingEnabled: boolean;
    lastLocationAt?: string;
  };
  push: {
    ready: boolean;
    lastTokenAt?: string;
    lastPushAt?: string;
  };
  nativeAlarm: NativeAlarmSupport;
};

export type LocationViewStatus = "live" | "last_known" | "stale" | "unavailable" | "offline" | "permission_off";
