import Dexie, { type EntityTable } from "dexie";

// 离线报工记录
interface OfflineWorkReport {
  id?: number;
  qrCode: string;
  quantity: number;
  defectCount: number;
  defectType?: string;
  machineId?: string;
  timestamp: string; // ISO string
  deviceId: string;
  synced: boolean;
  syncedAt?: string;
  error?: string;
}

// IndexedDB 数据库
const db = new Dexie("MesFactoryOffline") as Dexie & {
  workReports: EntityTable<OfflineWorkReport, "id">;
};

db.version(1).stores({
  workReports: "++id, qrCode, timestamp, synced, deviceId",
});

export { db };
export type { OfflineWorkReport };

// 添加离线报工记录
export async function addOfflineReport(report: Omit<OfflineWorkReport, "id" | "synced">) {
  return db.workReports.add({
    ...report,
    synced: false,
  });
}

// 获取未同步的报工记录
export async function getUnsyncedReports() {
  return db.workReports.where("synced").equals(0).toArray();
}

// 标记为已同步
export async function markAsSynced(id: number) {
  return db.workReports.update(id, {
    synced: true,
    syncedAt: new Date().toISOString(),
  });
}

// 标记同步失败
export async function markSyncError(id: number, error: string) {
  return db.workReports.update(id, { error });
}

// 获取未同步记录数量
export async function getUnsyncedCount() {
  return db.workReports.where("synced").equals(0).count();
}

// 清除已同步的记录（保留最近7天）
export async function cleanupSyncedReports() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return db.workReports
    .where("synced")
    .equals(1)
    .and((report) => {
      if (!report.syncedAt) return false;
      return new Date(report.syncedAt) < sevenDaysAgo;
    })
    .delete();
}

// 同步所有离线记录
export async function syncAllOfflineReports(submitFn: (report: OfflineWorkReport) => Promise<void>) {
  const unsynced = await getUnsyncedReports();
  const results = { success: 0, failed: 0 };

  for (const report of unsynced) {
    try {
      await submitFn(report);
      await markAsSynced(report.id!);
      results.success++;
    } catch (error: any) {
      await markSyncError(report.id!, error?.message || "同步失败");
      results.failed++;
    }
  }

  // 清理旧数据
  await cleanupSyncedReports();

  return results;
}
