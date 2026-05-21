"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { isWeChatBrowser, wechatScan, isWeChatJSSDKReady } from "@/lib/wechat";

interface ScanState {
  isScanning: boolean;
  error: string | null;
  scanResult: string | null;
}

export function useScan() {
  const [state, setState] = useState<ScanState>({
    isScanning: false,
    error: null,
    scanResult: null,
  });

  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 清理扫描器
  const cleanup = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // 开始扫描
  const startScan = useCallback(
    async (containerId?: string) => {
      setState({ isScanning: true, error: null, scanResult: null });

      // 优先尝试微信扫码
      if (isWeChatBrowser() && isWeChatJSSDKReady()) {
        const result = await wechatScan();
        if (result) {
          setState({ isScanning: false, error: null, scanResult: result });
          return result;
        }
      }

      // 降级到 html5-qrcode
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        const elementId = containerId || "qr-reader";
        const container = document.getElementById(elementId);

        if (!container) {
          setState({
            isScanning: false,
            error: "扫描容器不存在",
            scanResult: null,
          });
          return null;
        }

        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        const result = await scanner.start(
          { facingMode: "environment" }, // 后置摄像头
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // 扫描成功
            cleanup();
            setState({
              isScanning: false,
              error: null,
              scanResult: decodedText,
            });
          },
          () => {
            // 扫描失败（继续扫描）
          }
        );

        return null;
      } catch (error: any) {
        const rawMsg = error?.message || error?.toString() || "";
        console.error("[useScan] Camera error:", error?.name, rawMsg);

        const isHttpNonLocal =
          typeof window !== "undefined" &&
          window.location.protocol === "http:" &&
          window.location.hostname !== "localhost" &&
          window.location.hostname !== "127.0.0.1";

        let errorMsg: string;
        if (isHttpNonLocal) {
          errorMsg =
            "摄像头需要 HTTPS 安全连接。当前通过 HTTP 局域网访问，浏览器禁止使用摄像头。请使用下方「手动输入」功能扫码。";
        } else if (error?.name === "NotAllowedError" || rawMsg.includes("Permission")) {
          errorMsg =
            "摄像头权限被拒绝，请在浏览器设置中允许摄像头访问，然后刷新页面重试。";
        } else {
          errorMsg =
            "无法启动摄像头：" + (rawMsg || "未知错误") + "，请使用下方「手动输入」功能扫码。";
        }

        setState({ isScanning: false, error: errorMsg, scanResult: null });
        return null;
      }
    },
    [cleanup]
  );

  // 停止扫描
  const stopScan = useCallback(() => {
    cleanup();
    setState((prev) => ({ ...prev, isScanning: false }));
  }, [cleanup]);

  // 重置状态
  const reset = useCallback(() => {
    cleanup();
    setState({ isScanning: false, error: null, scanResult: null });
  }, [cleanup]);

  // 手动输入
  const manualInput = useCallback((code: string) => {
    setState({ isScanning: false, error: null, scanResult: code });
    return code;
  }, []);

  return {
    ...state,
    startScan,
    stopScan,
    reset,
    manualInput,
    isWeChat: isWeChatBrowser(),
    containerRef,
  };
}
