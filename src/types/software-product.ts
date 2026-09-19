/**
 * 软件产品卡片的数据形状。
 *
 * 类型放公共仓库、目录内容留各站点：主站与软件专栏露出的产品集合本就不同
 * （主站含客户端下载、瞬懂、颗秒日事；软件专栏只列自己承载的产品），
 * 但卡片字段必须一致，否则两边同名的 SOFTWARE_PRODUCTS 会各自长出字段。
 */

export type SoftwareProductStatus = "coming_soon" | "beta" | "live";

export type SoftwareProductAction = {
  label: string;
  href: string;
  primary?: boolean;
  download?: boolean;
};

export type SoftwareProduct = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  status: SoftwareProductStatus;
  /** 正式产品页或外链；空则只展示介绍 */
  href?: string;
  /** 卡片角标文案 */
  badge?: string;
  /** true=仅站长可用（前台仍展示卡片，进入后按登录身份分流） */
  adminOnly?: boolean;
  /** 卡片上的多个入口（网页版、安装包等） */
  actions?: SoftwareProductAction[];
};

/** 软件产品专栏页头部文案的数据形状（文案本身由各站点自己维护） */
export type SoftwareProductsPage = {
  title: string;
  subtitle: string;
};
