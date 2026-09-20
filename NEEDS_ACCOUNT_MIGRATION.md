# NEEDS_ACCOUNT_MIGRATION

身份属于独立的 **account** 仓库。account 尚未建立，因此下面这些能力目前仍散落在
两个产品仓库里，**本轮只做了兼容和接口抽象，没有迁移，也没有新建第二套统一身份**。

## 现状

`Andyyyds` 与 `softwarelist` 各持有一份实现（`packages/shared/src/` 下）：

| 模块 | 内容 |
|---|---|
| `auth.ts` | cookie session 签发与校验（jose） |
| `auth-providers.ts` | 微信 / 手机 / 邮箱 / 账号注册与绑定 |
| `password.ts` | bcrypt 哈希与校验 |
| `sms.ts` | 阿里云短信发送与验证码校验 |
| `wechat-oauth-state.ts` | 微信 OAuth state 签名 |
| `role-applications.ts` | 角色申请与站长审批流 |
| `studio.ts` | 后台鉴权入口 |

数据侧：两个站点各有自己的 `User` 表，**同一个人在两边是两个账号**。

## 本轮做了什么

只做接口层面的准备，不动实现：

1. `@yydsxwh/shared/auth/identity` 定义了 `UserSub`、`OidcIdTokenClaims`、
   `SessionUser`、`AuthChannel`、`AuthClient`——**只有类型与接口，没有实现**
2. platform 的 `X-Platform-Actor` 头目前传各站自己的 user id；
   account 上线后换成全局 `sub`，**头名称与接口形状都不变**，调用方不用再改一次

## 目标形态

```
产品 → OIDC → account
```

account 建立后应迁走：

- 用户表与全局 user sub
- 密码、Session 签发与校验
- OIDC Server 与各产品的 OIDC Client 接入
- 登录验证码**业务逻辑**（发信通道可以用 platform communications，但业务属于 account）
- 微信 OAuth 换取身份
- 角色申请与审批流

产品侧保留的只有「这个 sub 在本产品里是什么角色、有什么权限」。

## 明确不要做的事

- 不要把登录系统迁进 platform
- 不要在 platform 或任一产品里再造一套统一身份
- 在 account 就绪前，不要把两个站点的用户数据合并

## 阻塞的其他事项

| 事项 | 为什么被身份阻塞 |
|---|---|
| docs / mathcode 合并成单一部署 | MathCode 的额度、用量、发放记录在各自库里，跨部署合并需要全局身份与 entitlements |
| Entitlements | 「用户因此拥有什么能力」必须挂在全局 sub 上 |
| 跨产品单点登录 | 定义即需要 OIDC |
