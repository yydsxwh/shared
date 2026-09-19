# Shared

公司公共代码仓库，npm 包名 `@yydsxwh/shared`。

多个软件产品共享的 **类型、工具、i18n、校验、客户端环境探测**。这里是这些代码的唯一来源：
各站点只通过依赖引用，不再各拷一份。

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
| `@yydsxwh/shared/client/wechat-env` | 微信 / 移动端 / Capacitor 环境探测 |
| `@yydsxwh/shared/client/auth-channel-preference` | 登录渠道默认偏好 |

## 不放这里

| 不放 | 归属 |
|---|---|
| Prisma、会话、`next/headers`、服务端密钥 | 各站点或 `platform` |
| OSS / 存储、支付、短信、登录实现 | `platform`（后续阶段） |
| 账号体系、OIDC、角色申请审批流 | 独立 account 仓库 |
| 商城、优惠券、分销、工作室、门户 CMS | 主站 `Andyyyds` |
| 装扮 / 主题 / 首页挂件 | `@andyyyds/decorate` |
| 各站点自己的产品目录内容与页面文案 | 对应站点 |

判断标准：**纯函数、无 Prisma、无框架运行时、两个以上站点会用到**。达不到就先别进来。

## 使用

```jsonc
// package.json
{
  "dependencies": {
    "@yydsxwh/shared": "github:yydsxwh/shared#v0.1.0"
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
