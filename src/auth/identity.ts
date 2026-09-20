/**
 * 身份边界类型。
 *
 * Account 已是公司正式 Identity Provider：OAuth 2.0、OIDC、Authorization Code +
 * PKCE、Discovery、JWKS、RS256 ID Token、UserInfo、Refresh Token Rotation、
 * Session、Security、全局不可变 `usr_*` sub。
 *
 * 本文件只定义各产品面向身份时用到的**类型与客户端接口**，
 * 不实现账号系统，也不要在这里或 platform 里再造第二套统一身份。
 *
 * 目标形态：产品 → OIDC → account。
 *
 * NEEDS_ACCOUNT_INTEGRATION：
 * 主站与软件专栏目前仍各持 cookie session、密码、短信与微信登录实现，
 * **还没有**切到 account OIDC。缺的是产品接入联调，不是再建一个账号中心。
 * 接入后这些实现迁走，产品改用本文件的 SessionUser 与 AuthClient，
 * `userId` 换成全局 `sub`，接口形状不变。
 */

/** account 签发的全局用户标识；产品尚未接 OIDC 时仍可能是站点本地 user id */
export type UserSub = string;

/** OIDC 标准 claim 的子集，只列各产品确实会用到的 */
export type OidcIdTokenClaims = {
  iss: string;
  sub: UserSub;
  aud: string | string[];
  exp: number;
  iat: number;
  auth_time?: number;
  nonce?: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
};

/**
 * 产品侧读取的会话视图。
 * 只暴露展示与鉴权需要的字段，不含任何凭证材料。
 */
export type SessionUser = {
  sub: UserSub;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  picture: string | null;
  /** 产品内角色仍由产品自己解释，account 只负责「你是谁」 */
  roles: string[];
  expiresAt: string;
};

export const AUTH_CHANNELS = [
  "PASSWORD",
  "EMAIL",
  "SMS",
  "WECHAT_OAUTH",
  "WECHAT_QR",
  "WECHAT_NATIVE_APP",
] as const;
export type AuthChannel = (typeof AUTH_CHANNELS)[number];

export type AuthMethodsInfo = {
  enabled: AuthChannel[];
  /** 首屏优先展示哪个渠道 */
  preferred: AuthChannel;
};

/**
 * 产品与身份系统之间的最小接口。
 *
 * 当前由各产品用自己的 cookie session 实现；切到 account OIDC 后
 * 换成 OIDC 实现，调用方代码不用改。实现放产品或 account SDK，不要放这里。
 */
export type AuthClient = {
  /** 未登录返回 null，不要抛异常 */
  getSession(): Promise<SessionUser | null>;
  /** 返回用户应跳转的授权地址 */
  getAuthorizeUrl(input: {
    returnTo: string;
    channel?: AuthChannel;
  }): Promise<string>;
  signOut(input?: { returnTo?: string }): Promise<void>;
  getAuthMethods(): Promise<AuthMethodsInfo>;
};
