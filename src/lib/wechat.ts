// 微信 JSSDK 配置与扫码集成

interface WeChatConfig {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
}

// 获取微信 JSSDK 配置（需要后端签名）
export async function getWeChatConfig(url: string): Promise<WeChatConfig | null> {
  try {
    const res = await fetch(`/api/wechat/jssdk?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 微信扫码
export async function wechatScan(): Promise<string | null> {
  return new Promise((resolve) => {
    const wx = (window as any).wx;
    if (!wx) {
      resolve(null);
      return;
    }

    wx.scanQRCode({
      needResult: 1, // 直接返回扫描结果
      scanType: ["qrCode", "barCode"],
      success: (res: { resultStr: string }) => {
        // 微信返回格式: "resultStr":"http://weixin.qqwx.qq/qrCode=xxx"
        // 或者直接是扫描内容
        const result = res.resultStr;
        if (result) {
          // 尝试从URL中提取qrCode参数
          try {
            const url = new URL(result);
            const qrCode = url.searchParams.get("qrCode");
            resolve(qrCode || result);
          } catch {
            resolve(result);
          }
        } else {
          resolve(null);
        }
      },
      fail: () => {
        resolve(null);
      },
    });
  });
}

// 检查是否在微信浏览器中
export function isWeChatBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes("micromessenger");
}

// 检查微信 JSSDK 是否可用
export function isWeChatJSSDKReady(): boolean {
  if (typeof window === "undefined") return false;
  const wx = (window as any).wx;
  return !!wx;
}
