/**
 * 收银台在不同内置浏览器里能怎么付。
 *
 * 这里只做环境判断，不发起支付、不保存密钥。
 * 微信里选支付宝、支付宝里选微信，不能假装一定能直接跳进对方 App。
 */

import { isMobileBrowser, isWeChatBrowser } from "./wechat-env";

export type CashierProvider = "WECHAT" | "ALIPAY";

export type CashierLaunch =
  | { kind: "WECHAT_JSAPI" }
  | { kind: "WECHAT_H5" }
  | { kind: "WECHAT_NATIVE"; hint: string }
  | { kind: "ALIPAY_WAP" }
  | { kind: "ALIPAY_PAGE" }
  | { kind: "ALIPAY_NATIVE"; hint: string }
  | { kind: "COPY_LINK"; message: string };

export function isAlipayBrowser(ua?: string): boolean {
  const value = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /AlipayClient/i.test(value);
}

/**
 * 按当前浏览器和商户已开通的形态，决定下一步。
 * methods 来自服务端渠道状态，前端不能凭空多开一种。
 */
export function planCashierLaunch(input: {
  provider: CashierProvider;
  ua?: string;
  methods: readonly string[];
}): CashierLaunch {
  const ua = input.ua ?? "";
  const methods = new Set(input.methods);
  const inWechat = isWeChatBrowser(ua);
  const inAlipay = isAlipayBrowser(ua);
  const mobile = isMobileBrowser(ua);

  if (input.provider === "ALIPAY" && inWechat) {
    return {
      kind: "COPY_LINK",
      message: "微信里不能直接打开支付宝。请复制链接到系统浏览器，或用支付宝扫描收款入口二维码。",
    };
  }
  if (input.provider === "WECHAT" && inAlipay) {
    return {
      kind: "COPY_LINK",
      message: "支付宝里不能直接调起微信支付。请复制链接到系统浏览器，或用微信扫描收款入口二维码。",
    };
  }

  if (input.provider === "WECHAT") {
    if (inWechat) {
      if (methods.has("JSAPI")) return { kind: "WECHAT_JSAPI" };
      return {
        kind: "COPY_LINK",
        message: "当前商户还不能在微信内直接支付。请点右上角，用系统浏览器打开后再付。",
      };
    }
    if (mobile && methods.has("H5")) return { kind: "WECHAT_H5" };
    if (methods.has("NATIVE")) {
      return {
        kind: "WECHAT_NATIVE",
        hint: mobile
          ? "请长按或截图付款码，用另一台设备的微信扫码。这是微信支付码，不是收款入口码。"
          : "请用微信扫一扫。这是微信支付码，不是收款入口码。",
      };
    }
    return {
      kind: "COPY_LINK",
      message: "微信支付尚未开通适合当前环境的方式。",
    };
  }

  if (inAlipay && methods.has("WAP")) return { kind: "ALIPAY_WAP" };
  if (mobile && methods.has("WAP")) return { kind: "ALIPAY_WAP" };
  if (!mobile && methods.has("PAGE")) return { kind: "ALIPAY_PAGE" };
  if (methods.has("NATIVE")) {
    return {
      kind: "ALIPAY_NATIVE",
      hint: "请用支付宝扫一扫。这是支付宝付款码，不是收款入口码。",
    };
  }
  if (methods.has("PAGE")) return { kind: "ALIPAY_PAGE" };
  return {
    kind: "COPY_LINK",
    message: "支付宝尚未开通适合当前环境的方式。",
  };
}
