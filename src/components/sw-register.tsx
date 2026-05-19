"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        // 检测到新版本立即激活
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // 新 SW 已安装，跳过等待并刷新页面
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            });
          }
        });

        // 监听来自 SW 的同步消息
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "DO_SYNC") {
            window.dispatchEvent(new CustomEvent("sw-sync"));
          }
        });
      });
    }
  }, []);

  return null;
}
