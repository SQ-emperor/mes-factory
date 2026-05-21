"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parseQRCodeValue } from "@/lib/qr";
import { publishWorkReport } from "@/lib/sse";

// 扫码报工 - 核心功能
export async function submitWorkReport(data: {
  qrCode: string;
  quantity: number;
  defectCount?: number;
  defectType?: string;
  machineId?: string;
  clientTimestamp?: string;
  deviceId?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId, id: userId } = session.user;

  // 解析二维码
  const parsed = parseQRCodeValue(data.qrCode);
  if (!parsed) {
    throw new Error("无效的二维码格式");
  }

  if (parsed.tenantId !== tenantId) {
    throw new Error("二维码不属于当前工厂");
  }

  // 根据类型处理
  if (parsed.type === "order") {
    return await processOrderWorkReport({
      orderId: parsed.refId,
      userId,
      tenantId,
      quantity: data.quantity,
      defectCount: data.defectCount || 0,
      defectType: data.defectType,
      machineId: data.machineId,
      clientTimestamp: data.clientTimestamp,
      deviceId: data.deviceId,
    });
  } else if (parsed.type === "workstation") {
    // 工位扫码 - 需要额外指定订单
    throw new Error("工位扫码功能需要选择订单");
  }

  throw new Error("不支持的二维码类型");
}

// 处理订单报工
async function processOrderWorkReport(data: {
  orderId: string;
  userId: string;
  tenantId: string;
  quantity: number;
  defectCount: number;
  defectType?: string;
  machineId?: string;
  clientTimestamp?: string;
  deviceId?: string;
}) {
  // 获取订单和当前工序
  const order = await prisma.order.findFirst({
    where: {
      id: data.orderId,
      tenantId: data.tenantId,
    },
    include: {
      items: {
        include: {
          processStep: {
            include: {
              process: true,
            },
          },
        },
        orderBy: {
          processStep: {
            sortOrder: "asc",
          },
        },
      },
      product: true,
    },
  });

  if (!order) {
    throw new Error("订单不存在");
  }

  // 找到当前进行中的工序项
  const currentItem = order.items.find(
    (item) => item.status === "inProgress" || item.status === "waiting"
  );

  if (!currentItem) {
    throw new Error("订单所有工序已完成");
  }

  // 使用事务处理报工
  const result = await prisma.$transaction(async (tx) => {
    // 创建报工记录
    const workReport = await tx.workReport.create({
      data: {
        orderItemId: currentItem.id,
        userId: data.userId,
        machineId: data.machineId,
        quantity: data.quantity,
        defectCount: data.defectCount,
        defectType: data.defectType,
        clientTimestamp: data.clientTimestamp ? new Date(data.clientTimestamp) : undefined,
        deviceId: data.deviceId,
      },
    });

    // 更新工序项状态
    const newQuantityDone = currentItem.quantityDone + data.quantity;
    const newQuantityDefect = currentItem.quantityDefect + data.defectCount;

    await tx.orderItem.update({
      where: { id: currentItem.id },
      data: {
        quantityDone: newQuantityDone,
        quantityDefect: newQuantityDefect,
        status: "inProgress",
        startedAt: currentItem.startedAt || new Date(),
      },
    });

    // 检查当前工序是否完成（数量达到订单总量）
    if (newQuantityDone >= order.quantity) {
      // 标记当前工序完成
      await tx.orderItem.update({
        where: { id: currentItem.id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });

      // 检查是否有下一个工序
      const nextItem = order.items.find(
        (item) =>
          item.processStep.sortOrder > currentItem.processStep.sortOrder &&
          item.status === "waiting"
      );

      if (nextItem) {
        // 激活下一工序
        await tx.orderItem.update({
          where: { id: nextItem.id },
          data: {
            status: "waiting", // 保持等待，等待工人开始
          },
        });
      } else {
        // 所有工序完成，更新订单状态
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "completed",
          },
        });
      }
    }

    // 如果订单还在等待排产，更新为生产中
    if (order.status === "pending" || order.status === "scheduled") {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "inProgress",
        },
      });
    }

    return workReport;
  });

  revalidatePath("/[tenantId]/dashboard");
  revalidatePath("/[tenantId]/orders");
  revalidatePath("/[tenantId]/scan");

  // 发布SSE事件，实时更新看板
  publishWorkReport(data.tenantId, {
    orderNo: order.orderNo,
    productName: order.product.name,
    stepName: currentItem.processStep.process.name,
    quantity: data.quantity,
    defectCount: data.defectCount,
    userName: "工人", // 简化处理
  });

  return {
    success: true,
    report: result,
    currentStep: currentItem.processStep.process.name,
    quantityDone: currentItem.quantityDone + data.quantity,
    totalQuantity: order.quantity,
  };
}

// 获取活跃订单列表（用于手动选择报工）
export async function getActiveOrdersForScan() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ["pending", "scheduled", "inProgress"] },
    },
    include: {
      product: true,
      items: {
        include: {
          processStep: {
            include: {
              process: true,
            },
          },
        },
        orderBy: {
          processStep: { sortOrder: "asc" },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return orders.map((order) => {
    const currentItem = order.items.find(
      (item) => item.status === "inProgress" || item.status === "waiting"
    );
    const completedSteps = order.items.filter((i) => i.status === "completed").length;

    return {
      id: order.id,
      orderNo: order.orderNo,
      productName: order.product.name,
      quantity: order.quantity,
      status: order.status,
      currentStep: currentItem
        ? {
            id: currentItem.id,
            name: currentItem.processStep.process.name,
            sortOrder: currentItem.processStep.sortOrder,
            quantityDone: currentItem.quantityDone,
          }
        : null,
      totalSteps: order.items.length,
      completedSteps,
      customerName: order.customerName,
    };
  });
}

// 获取订单当前状态（扫码后显示）
export async function getOrderScanInfo(qrCode: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;
  const parsed = parseQRCodeValue(qrCode);

  if (!parsed || parsed.tenantId !== tenantId) {
    throw new Error("无效的二维码");
  }

  if (parsed.type !== "order") {
    throw new Error("请扫描订单二维码");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: parsed.refId,
      tenantId,
    },
    include: {
      product: true,
      items: {
        include: {
          processStep: {
            include: {
              process: true,
            },
          },
        },
        orderBy: {
          processStep: {
            sortOrder: "asc",
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("订单不存在");
  }

  // 找到当前工序
  const currentItem = order.items.find(
    (item) => item.status === "inProgress" || item.status === "waiting"
  );

  const completedSteps = order.items.filter((i) => i.status === "completed").length;

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    productName: order.product.name,
    quantity: order.quantity,
    status: order.status,
    currentStep: currentItem
      ? {
          id: currentItem.id,
          name: currentItem.processStep.process.name,
          sortOrder: currentItem.processStep.sortOrder,
          quantityDone: currentItem.quantityDone,
          quantityDefect: currentItem.quantityDefect,
        }
      : null,
    totalSteps: order.items.length,
    completedSteps,
    isCompleted: !currentItem,
  };
}
