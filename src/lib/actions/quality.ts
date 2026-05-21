"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { requireMinRole } from "@/lib/role";

// 创建质检记录
export async function createQualityRecord(data: {
  orderId?: string;
  type: "incoming" | "inProcess" | "finished";
  result: "pass" | "fail" | "conditional";
  defectType?: string;
  defectCount?: number;
  notes?: string;
  photos?: string[];
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  requireMinRole(session.user.role, "manager");

  const { tenantId, id: inspectorId } = session.user;

  const record = await prisma.qualityRecord.create({
    data: {
      tenantId,
      orderId: data.orderId,
      inspectorId,
      type: data.type,
      result: data.result,
      defectType: data.defectType,
      defectCount: data.defectCount,
      notes: data.notes,
      photos: data.photos || [],
    },
    include: {
      order: true,
      inspector: true,
    },
  });

  revalidatePath("/[tenantId]/quality");
  return record;
}

// 获取质检记录列表
export async function getQualityRecords(options?: {
  type?: string;
  result?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;
  const { type, result, page = 1, pageSize = 20 } = options || {};

  const where: any = { tenantId };

  if (type && type !== "all") {
    where.type = type;
  }

  if (result && result !== "all") {
    where.result = result;
  }

  const [records, total] = await Promise.all([
    prisma.qualityRecord.findMany({
      where,
      include: {
        order: true,
        inspector: true,
      },
      orderBy: { inspectedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.qualityRecord.count({ where }),
  ]);

  return {
    records,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 获取质检统计
export async function getQualityStats() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [passCount, failCount, conditionalCount, totalRecords, defectTypes] =
    await Promise.all([
      prisma.qualityRecord.count({
        where: { tenantId, result: "pass" },
      }),
      prisma.qualityRecord.count({
        where: { tenantId, result: "fail" },
      }),
      prisma.qualityRecord.count({
        where: { tenantId, result: "conditional" },
      }),
      prisma.qualityRecord.count({
        where: { tenantId },
      }),
      prisma.qualityRecord.groupBy({
        by: ["defectType"],
        where: {
          tenantId,
          defectType: { not: null },
          result: "fail",
        },
        _count: true,
        orderBy: { _count: { defectType: "desc" } },
        take: 10,
      }),
    ]);

  const defectRate =
    totalRecords > 0
      ? Math.round((failCount / totalRecords) * 10000) / 100
      : 0;

  return {
    passCount,
    failCount,
    conditionalCount,
    totalRecords,
    defectRate,
    defectTypes: defectTypes.map((d) => ({
      type: d.defectType,
      count: d._count,
    })),
  };
}

// 获取订单列表（用于质检选择）
export async function getOrdersForQuality() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;

  return prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ["inProgress", "completed"] },
    },
    include: {
      product: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
