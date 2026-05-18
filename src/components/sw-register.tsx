"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        // 监听来自 SW 的同步消息
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "DO_SYNC") {
            // 触发离线数据同步（通过自定义事件通知 useOffline）
            window.dispatchEvent(new CustomEvent("sw-sync"));
          }
        });
      });
    }
  }, []);

  return null;
}
