/**
 * 产品注册表：各产品的稳定入口。
 *
 * 产品之间互相跳转读这里（或构建时注入的环境变量），不要运行时请求
 * `yydsxwh.com/api/products`。主站宕机不能让别的产品导航一起消失。
 *
 * `runtimeDependsOnMain` 为 true 表示今天这个产品的进程和数据库仍在主站里。
 * 这是现状，不是目标。目标是每个产品自己的域名、进程和库。
 */

export type ProductRole = "portal" | "identity" | "platform" | "product";

export type ProductRecord = {
  id: string;
  role: ProductRole;
  /** 用户可以直接打开的地址。没有独立域名时是主站上的路径。 */
  origin: string;
  /** 代码仓库。空字符串表示还没有独立仓库里的实现。 */
  repository: string;
  /**
   * 停掉主站 Node 进程后，这个产品是否还会一起停。
   * 静态文件由 Nginx 直接提供、API 在别的进程时为 false。
   */
  runtimeDependsOnMain: boolean;
  /** 还没有独立域名时写明原因，避免以后有人发明一个并不存在的主机名。 */
  note: string;
};

export const PRODUCT_REGISTRY: readonly ProductRecord[] = [
  {
    id: "main",
    role: "portal",
    origin: "https://www.yydsxwh.com",
    repository: "yydsxwh/Andyyyds",
    runtimeDependsOnMain: true,
    note: "官网、产品入口、营销页。同时仍承载尚未拆出的产品进程。",
  },
  {
    id: "account",
    role: "identity",
    origin: "https://account.yydsxwh.com",
    repository: "yydsxwh/account",
    runtimeDependsOnMain: false,
    note: "身份源。运行不依赖主站。新登录需要它；已签发的产品会话不每次回查它。",
  },
  {
    id: "platform",
    role: "platform",
    origin: "https://api.yydsxwh.com",
    repository: "yydsxwh/platform",
    runtimeDependsOnMain: false,
    note: "模块化单体已写好，生产尚未挂上 api.yydsxwh.com。预发标识是 api-staging.yydsxwh.com。",
  },
  {
    id: "rishi",
    role: "product",
    origin: "https://www.yydsxwh.com/products/days/",
    repository: "yydsxwh/rishi",
    runtimeDependsOnMain: false,
    note: "页面是 Nginx 静态文件，API 是 kemiao-days-sync:3120。没有独立域名，入口仍挂在主站路径下。",
  },
  {
    id: "course",
    role: "product",
    origin: "https://www.yydsxwh.com",
    repository: "yydsxwh/course",
    runtimeDependsOnMain: true,
    note: "网课仍跑在主站同一个 Next 进程和同一份 SQLite 里。course 仓库目前是主站的近副本，不是已拆出的服务。",
  },
  {
    id: "mathcode",
    role: "product",
    origin: "https://www.yydsxwh.com",
    repository: "yydsxwh/mathcode",
    runtimeDependsOnMain: true,
    note: "识图转 LaTeX 在主站 packages/mathcode。独立仓库只有占位 README。",
  },
  {
    id: "meetup",
    role: "product",
    origin: "https://www.yydsxwh.com",
    repository: "yydsxwh/meetup",
    runtimeDependsOnMain: true,
    note: "约搭在主站 packages/meetup。独立仓库只有占位 README。",
  },
  {
    id: "forum",
    role: "product",
    origin: "https://www.yydsxwh.com",
    repository: "yydsxwh/forum",
    runtimeDependsOnMain: true,
    note: "论坛在主站 packages/forum。独立仓库只有占位 README。",
  },
  {
    id: "docs",
    role: "product",
    origin: "https://www.yydsxwh.com",
    repository: "yydsxwh/kemiaodoc",
    runtimeDependsOnMain: true,
    note: "网页文档在主站。日事「另存 Word / 用网页文档打开」是可选能力，失败不影响日事本身。",
  },
];

export function productById(id: string): ProductRecord | undefined {
  return PRODUCT_REGISTRY.find((item) => item.id === id);
}

/** 不依赖主站进程就能打开的产品。 */
export function productsIndependentOfMain(): ProductRecord[] {
  return PRODUCT_REGISTRY.filter((item) => item.role === "product" && !item.runtimeDependsOnMain);
}
