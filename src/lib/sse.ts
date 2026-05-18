// SSE (Server-Sent Events) 工具函数

// 创建 SSE 响应
export function createSSEResponse(
  handler: (controller: ReadableStreamDefaultController) => void | Promise<void>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      await handler(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// 发送 SSE 事件
export function sendSSEEvent(
  controller: ReadableStreamDefaultController,
  event: string,
  data: unknown
) {
  const encoder = new TextEncoder();
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}

// 发送心跳
export function sendHeartbeat(controller: ReadableStreamDefaultController) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(": heartbeat\n\n"));
}

// SSE 事件类型
export interface SSEEvent {
  type: "work-report" | "order-status-change" | "quality-alert";
  data: unknown;
  timestamp: string;
}

// 内存事件总线（MVP阶段，生产环境用Redis Pub/Sub）
class EventBus {
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  subscribe(tenantId: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(tenantId)) {
      this.listeners.set(tenantId, new Set());
    }
    this.listeners.get(tenantId)!.add(callback);

    return () => {
      this.listeners.get(tenantId)?.delete(callback);
    };
  }

  publish(tenantId: string, event: SSEEvent) {
    const callbacks = this.listeners.get(tenantId);
    if (callbacks) {
      callbacks.forEach((cb) => cb(event));
    }
  }
}

export const eventBus = new EventBus();

// 发布报工事件
export function publishWorkReport(tenantId: string, data: unknown) {
  eventBus.publish(tenantId, {
    type: "work-report",
    data,
    timestamp: new Date().toISOString(),
  });
}

// 发布订单状态变更事件
export function publishOrderStatusChange(tenantId: string, data: unknown) {
  eventBus.publish(tenantId, {
    type: "order-status-change",
    data,
    timestamp: new Date().toISOString(),
  });
}

// 发布质量预警事件
export function publishQualityAlert(tenantId: string, data: unknown) {
  eventBus.publish(tenantId, {
    type: "quality-alert",
    data,
    timestamp: new Date().toISOString(),
  });
}
