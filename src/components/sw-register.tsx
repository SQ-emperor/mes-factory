"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    // 开发模式下不注册 Service Worker，避免缓存问题导致旧代码残留
    if (process.env.NODE_ENV === "development") {
      // 清理已注册的 SW
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.unregister());
        });
      }
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            });
          }
        });

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
