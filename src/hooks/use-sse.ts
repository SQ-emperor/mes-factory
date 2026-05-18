"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SSEOptions {
  onMessage?: (event: string, data: unknown) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
}

interface SSEState {
  isConnected: boolean;
  error: string | null;
}

export function useSSE(url: string, options: SSEOptions = {}) {
  const { onMessage, onError, reconnectInterval = 5000 } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SSEState>({
    isConnected: false,
    error: null,
  });

  const connect = useCallback(() => {
    // 清理旧连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setState({ isConnected: true, error: null });
    };

    // 监听通用消息
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.("message", data);
      } catch {
        onMessage?.("message", event.data);
      }
    };

    // 监听特定事件类型
    const eventTypes = ["work-report", "order-status-change", "quality-alert", "connected"];
    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(eventType, data);
        } catch {
          onMessage?.(eventType, event.data);
        }
      });
    });

    eventSource.onerror = (error) => {
      setState({ isConnected: false, error: "连接断开" });
      eventSource.close();
      onError?.(error);

      // 自动重连
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
    };
  }, [url, onMessage, onError, reconnectInterval]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return state;
}
