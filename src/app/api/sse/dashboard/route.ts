import { NextRequest } from "next/server";
import {
  createSSEResponse,
  sendSSEEvent,
  sendHeartbeat,
  eventBus,
} from "@/lib/sse";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { tenantId } = session.user;

  return createSSEResponse((controller) => {
    // 发送初始连接确认
    sendSSEEvent(controller, "connected", { message: "已连接" });

    // 订阅事件
    const unsubscribe = eventBus.subscribe(tenantId, (event) => {
      try {
        sendSSEEvent(controller, (event as any).type, event);
      } catch {
        // 连接已关闭
        unsubscribe();
      }
    });

    // 心跳 - 每30秒发送一次
    const heartbeatInterval = setInterval(() => {
      try {
        sendHeartbeat(controller);
      } catch {
        clearInterval(heartbeatInterval);
        unsubscribe();
      }
    }, 30000);

    // 客户端断开时清理
    request.signal.addEventListener("abort", () => {
      clearInterval(heartbeatInterval);
      unsubscribe();
    });
  });
}
