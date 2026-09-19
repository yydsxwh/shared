# Shared

公司公共代码仓库，npm 包名 `@yydsxwh/shared`。

四层边界中的 **Shared 层：多仓库在编译期共同依赖的代码**——类型、工具、i18n、校验、
platform API 契约与 SDK、Design Tokens。这里是这些代码的唯一来源，各站点只通过依赖引用，
不再各拷一份。

- **Account** 管身份（用户、OIDC、Session、密码、验证码业务）
- **Platform** 管公共在线能力（Storage / Releases / Catalog / Payments）
- **Shared** 管公共代码（本仓库）
- **Product** 管自己的业务（Andyyyds / softwarelist / 日事 …）

## 已提供

| 子路径 | 内容 |
|---|---|
| `@yydsxwh/shared/types/roles` | 五角色枚举、多角色解析、权限判定 |
| `@yydsxwh/shared/types/domain` | `CourseStatus` / `OrderStatus` / `LessonType` / `Merchant*` 等领域类型 |
| `@yydsxwh/shared/types/product` | 可售产品类型、详情页与支付回跳路径 |
| `@yydsxwh/shared/types/software-product` | 软件产品卡片的数据形状（目录内容仍由各站点维护） |
| `@yydsxwh/shared/utils/format` | 价格、时长、slug、订单号 |
| `@yydsxwh/shared/utils/money` | 元 / 分换算与校验 |
| `@yydsxwh/shared/utils/referral-code` | 邀请码规范化与校验 |
| `@yydsxwh/shared/utils/request-origin` | 反代后还原浏览器可见 Origin |
| `@yydsxwh/shared/validation/username` | 登录名规则 |
| `@yydsxwh/shared/validation/email` | 占位邮箱的生成与识别 |
| `@yydsxwh/shared/validation/phone` | 手机号规范化与校验 |
| `@yydsxwh/shared/validation/order-form` | 下单自定义表单的解析、校验与存取 |
| `@yydsxwh/shared/i18n/locales` | 支持语种、locale cookie、启用列表读写 |
| `@yydsxwh/shared/i18n/resolve-locale` | Accept-Language / cookie 解析 |
| `@yydsxwh/shared/i18n/opencc` | 简繁转换（服务端） |
| `@yydsxwh/shared/i18n/source-hash` | 源文指纹，决定译文是否过期 |
| `@yydsxwh/shared/types/media` | 媒体类型判定、MIME 白名单、上传大小上限 |
| `@yydsxwh/shared/client/wechat-env` | 微信 / 移动端 / Capacitor 环境探测 |
| `@yydsxwh/shared/client/auth-channel-preference` | 登录渠道默认偏好 |
| `@yydsxwh/shared/client/wechat-pay-trade` | 按 UA 纠正微信支付形态 |
| `@yydsxwh/shared/client/wechat-jsapi-pay` | 微信内 JSAPI 调起（浏览器端） |

### platform API 契约

`@yydsxwh/shared/contracts/*` 是 platform 对外接口的唯一类型来源，platform 实现与各产品
调用都以它为准。

| 子路径 | 内容 |
|---|---|
| `contracts/version` | API 版本与统一请求头名 |
| `contracts/error` | 统一错误码、错误体、HTTP 状态映射 |
| `contracts/storage` | 文件、namespace 策略、签名上传 / 分片 / 下载 |
| `contracts/catalog` | 产品目录（机器可读事实，不含运营文案） |
| `contracts/releases` | Release / ReleaseAsset / latest 查询 / 下载 |
| `contracts/payments` | 支付单、支付动作、退款、履约事件 |

### platform SDK

`@yydsxwh/shared/platform-client` —— 产品不要自己手写 fetch 字符串。

```ts
import { createPlatformClient } from "@yydsxwh/shared/platform-client/index";

// 只在服务端构造：serviceToken 绝不能进浏览器包
const platform = createPlatformClient({
  baseUrl: process.env.PLATFORM_API_URL!,
  serviceToken: process.env.PLATFORM_SERVICE_TOKEN!,
  clientId: "andyyyds",
});

const release = await platform.releases.getLatest("rishi", { platform: "ANDROID" });
```

错误一律是 `PlatformApiError`，按 `error.code` 分支，不要 match 文案。

### 身份边界类型

`@yydsxwh/shared/auth/identity` 只有**类型与客户端接口**：`UserSub`、`OidcIdTokenClaims`、
`SessionUser`、`AuthClient`。这里不实现任何身份系统——用户身份、OIDC Server、密码、
Session、登录验证码业务最终属于独立的 account 仓库。详见仓库内 `NEEDS_ACCOUNT_MIGRATION` 说明。

## 不放这里

| 不放 | 归属 |
|---|---|
| Prisma、会话、`next/headers`、服务端密钥 | 各站点或 `platform` |
| OSS / 支付 / 短信的**服务端实现**与任何密钥 | `platform` |
| 账号体系、OIDC Server、密码、Session、验证码业务 | 独立 account 仓库 |
| 商城、优惠券、分销、工作室、门户 CMS | 主站 `Andyyyds` |
| 装扮 / 主题 / 首页挂件 | `@andyyyds/decorate` |
| 各站点自己的产品目录内容与页面文案 | 对应站点 |

判断标准：**纯函数、无 Prisma、无框架运行时、两个以上站点会用到**。达不到就先别进来。

## 使用

```jsonc
// package.json
{
  "dependencies": {
    "@yydsxwh/shared": "git+https://github.com/yydsxwh/shared.git#v0.2.0"
  }
}
```

```ts
import { normalizeRoles } from "@yydsxwh/shared/types/roles";
import { yuanToCents } from "@yydsxwh/shared/utils/money";
```

本包直接发布 TypeScript 源码，不产出编译结果，因此使用方需要：

- `next.config.ts` 的 `transpilePackages` 加上 `@yydsxwh/shared`
- `tsconfig.json` 的 `paths` 加上 `"@yydsxwh/shared/*": ["./node_modules/@yydsxwh/shared/src/*"]`

`i18n/opencc` 需要使用方自带 `opencc-js`（声明为可选 peer 依赖）；不用简繁转换就不必安装。

### 升级版本

以 git tag 固定版本，改动后打新 tag，再由各站点更新依赖并提交 lockfile。不要把使用方指到分支上。

## 开发

```bash
npm install
npm run lint
npm run typecheck
npm test
```
