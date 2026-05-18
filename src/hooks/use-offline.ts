"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addOfflineReport,
  getUnsyncedCount,
  syncAllOfflineReports,
  type OfflineWorkReport,
} from "@/lib/db-offline";
import { submitWorkReport } from "@/lib/actions/work-report";

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // 检测网络状态
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 加载未同步数量
  const loadPendingCount = useCallback(async () => {
    try {
      const count = await getUnsyncedCount();
      setPendingCount(count);
    } catch {
      // IndexedDB 不可用
    }
  }, []);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  // 同步离线数据
  const syncNow = useCallback(async () => {
    if (syncing) return;

    setSyncing(true);
    try {
      const results = await syncAllOfflineReports(async (report) => {
        await submitWorkReport({
          qrCode: report.qrCode,
          quantity: report.quantity,
          defectCount: report.defectCount,
          defectType: report.defectType,
          machineId: report.machineId,
          clientTimestamp: report.timestamp,
          deviceId: report.deviceId,
        });
      });

      await loadPendingCount();
      return results;
    } finally {
      setSyncing(false);
    }
  }, [syncing, loadPendingCount]);

  // 网络恢复时自动同步
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncNow();
    }
  }, [isOnline]);

  // 监听 Service Worker 同步事件
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSwSync = () => {
      if (navigator.onLine) syncNow();
    };

    window.addEventListener("sw-sync", handleSwSync);
    return () => window.removeEventListener("sw-sync", handleSwSync);
  }, [syncNow]);

  // 保存离线报工
  const saveOffline = useCallback(
    async (data: {
      qrCode: string;
      quantity: number;
      defectCount?: number;
      defectType?: string;
      machineId?: string;
    }) => {
      const report = {
        qrCode: data.qrCode,
        quantity: data.quantity,
        defectCount: data.defectCount || 0,
        defectType: data.defectType,
        machineId: data.machineId,
        timestamp: new Date().toISOString(),
        deviceId: navigator.userAgent.slice(0, 50),
      };

      await addOfflineReport(report);
      await loadPendingCount();

      return { offline: true, pendingCount: pendingCount + 1 };
    },
    [pendingCount, loadPendingCount]
  );

  return {
    isOnline,
    pendingCount,
    syncing,
    saveOffline,
    syncNow,
    refreshCount: loadPendingCount,
  };
}
