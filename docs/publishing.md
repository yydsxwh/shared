# 内容导出契约（v0.12.1）

本版本只增加发布契约，不占用收银台计划中的 `v0.13.0`。

- 类型与校验：`src/contracts/publishing.ts`
- 详情地址与逐篇二维码目标：`src/publishing/targets.ts`
- 公众号 HTML：`src/publishing/html.ts`
- SDK：`platform.publishing`

产品服务端必须用自己的数据库重新生成 `PublishableContent`。客户端传来的 `publicVisibility` 不能单独作为授权。

微信正文不执行脚本。每篇卡片默认是可横向滚动的两栏，二维码是 `<img>`。`swipePreserved` 在真机确认前保持 `unknown`。确认为 `no` 时改成上下排列，并去掉「左滑」文案。

`canUseExternalArticleLink` 与 `canLinkMiniProgram` 不是 `yes` 时，不输出可点击链接或小程序入口。
