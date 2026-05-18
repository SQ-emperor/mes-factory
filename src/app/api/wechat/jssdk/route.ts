import { NextRequest, NextResponse } from "next/server";

// 微信 JSSDK 签名生成
// 实际使用需要配置环境变量:
// WECHAT_APP_ID - 微信公众号 AppID
// WECHAT_APP_SECRET - 微信公众号 AppSecret

interface WeChatTicketResponse {
  errcode: number;
  errmsg: string;
  ticket: string;
  expires_in: number;
}

// 内存缓存 jsapi_ticket
let ticketCache: { ticket: string; expiresAt: number } | null = null;

async function getJsApiTicket(accessToken: string): Promise<string | null> {
  // 检查缓存
  if (ticketCache && Date.now() < ticketCache.expiresAt) {
    return ticketCache.ticket;
  }

  try {
    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi&access_token=${accessToken}`
    );
    const data: WeChatTicketResponse = await res.json();

    if (data.errcode === 0 && data.ticket) {
      ticketCache = {
        ticket: data.ticket,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000, // 提前5分钟过期
      };
      return data.ticket;
    }
    return null;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) return null;

  try {
    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
    );
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

// 简单的 SHA-1 实现（用于签名）
async function sha1(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateNonceStr(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function GET(request: NextRequest) {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "微信配置未设置" },
      { status: 500 }
    );
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      { error: "缺少 url 参数" },
      { status: 400 }
    );
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "获取 access_token 失败" },
      { status: 500 }
    );
  }

  const ticket = await getJsApiTicket(accessToken);
  if (!ticket) {
    return NextResponse.json(
      { error: "获取 jsapi_ticket 失败" },
      { status: 500 }
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const nonceStr = generateNonceStr();

  // 签名算法
  const signStr = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = await sha1(signStr);

  return NextResponse.json({
    appId,
    timestamp,
    nonceStr,
    signature,
  });
}
