# 内容导出契约（v0.12.2）

`0.12.1` 起增加发布契约，`0.12.2` 把小程序文章入口标成尚未接入，并增加 `NEEDS_REVIEW`。
这条线不占用收银台草稿 shared #18 计划中的 `v0.13.0`。两边并行，合并时不要把 `0.13.0` 退回 `0.12.x`，也不要用收银台分支覆盖本契约。消费者 lockfile 指向本分支的提交 SHA；打 tag 之前不要把依赖改成 `v0.13.0`。

- 类型与校验：`src/contracts/publishing.ts`
- 详情地址与逐篇二维码目标：`src/publishing/targets.ts`
- 公众号 HTML：`src/publishing/html.ts`
- SDK：`platform.publishing`

产品服务端必须用自己的数据库重新生成 `PublishableContent`。客户端传来的 `publicVisibility` 不能单独作为授权。

微信正文不执行脚本。每篇卡片默认是可横向滚动的两栏，二维码是 `<img>`。`swipePreserved` 在真机确认前保持 `unknown`。确认为 `no` 时改成上下排列，并去掉「左滑」文案。

`canUseExternalArticleLink` 与 `canLinkMiniProgram` 不是 `yes` 时，不输出可点击链接或小程序入口。
