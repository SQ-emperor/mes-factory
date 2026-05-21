"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { requireMinRole } from "@/lib/role";

// 获取排产数据
export async function getScheduleData(startDate?: Date, endDate?: Date) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;

  // 默认显示本周
  const start = startDate || new Date();
  start.setHours(0, 0, 0, 0);

  const end = endDate || new Date(start);
  end.setDate(end.getDate() + 7);

  // 获取设备列表
  const machines = await prisma.machine.findMany({
    where: { tenantId, isActive: true },
    orderBy: { code: "asc" },
  });

  // 获取排产计划
  const schedules = await prisma.scheduleSlot.findMany({
    where: {
      order: { tenantId },
      startTime: { gte: start },
      endTime: { lte: end },
    },
    include: {
      order: {
        include: { product: true },
      },
      machine: true,
      user: true,
    },
    orderBy: { startTime: "asc" },
  });

  // 获取待排产订单
  const pendingOrders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ["pending", "scheduled"] },
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
      },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  return {
    machines,
    schedules,
    pendingOrders,
    startDate: start,
    endDate: end,
  };
}

// AI 自动排产（规则算法）
export async function autoSchedule() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  requireMinRole(session.user.role, "manager");

  const { tenantId } = session.user;

  // 获取待排产订单
  const pendingOrders = await prisma.order.findMany({
    where: {
      tenantId,
      status: "pending",
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
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  if (pendingOrders.length === 0) {
    return { message: "没有待排产的订单", schedules: [] };
  }

  // 获取设备
  const machines = await prisma.machine.findMany({
    where: { tenantId, isActive: true },
  });

  // 获取工人
  const workers = await prisma.user.findMany({
    where: { tenantId, role: "worker", isActive: true },
  });

  if (machines.length === 0) {
    throw new Error("没有可用设备，请先添加设备");
  }

  // 简单的贪心排产算法
  const newSchedules: any[] = [];
  let currentTime = new Date();
  currentTime.setMinutes(0, 0, 0); // 取整点开始

  // 设备可用时间表
  const machineAvailability = new Map<string, Date>();
  machines.forEach((m) => machineAvailability.set(m.id, currentTime));

  // 工人可用时间表
  const workerAvailability = new Map<string, Date>();
  workers.forEach((w) => workerAvailability.set(w.id, currentTime));

  // 记录每个订单的预计完成时间
  const orderEstimates: { orderNo: string; productName: string; estimatedCompletion: Date }[] = [];

  for (const order of pendingOrders) {
    let orderLastEndTime = currentTime;

    for (const item of order.items) {
      const standardTime = item.processStep.process.standardTime || 60; // 默认60秒/件
      const durationMs = order.quantity * standardTime * 1000;

      // 找最早可用的设备
      let bestMachineId: string | null = null;
      let bestTime = new Date("2099-12-31");

      for (const machine of machines) {
        const availableAt = machineAvailability.get(machine.id)!;
        if (availableAt < bestTime) {
          bestTime = availableAt;
          bestMachineId = machine.id;
        }
      }

      // 找最早可用的工人
      let bestWorkerId: string | null = null;
      let bestWorkerTime = new Date("2099-12-31");

      for (const worker of workers) {
        const availableAt = workerAvailability.get(worker.id)!;
        if (availableAt < bestWorkerTime) {
          bestWorkerTime = availableAt;
          bestWorkerId = worker.id;
        }
      }

      if (bestMachineId) {
        const startTime = machineAvailability.get(bestMachineId)!;
        const endTime = new Date(startTime.getTime() + durationMs);

        // 创建排产记录
        const schedule = await prisma.scheduleSlot.create({
          data: {
            orderId: order.id,
            machineId: bestMachineId,
            userId: bestWorkerId || undefined,
            startTime,
            endTime,
            isAiGenerated: true,
          },
        });

        newSchedules.push(schedule);

        // 更新设备可用时间
        machineAvailability.set(bestMachineId, endTime);

        // 更新工人可用时间
        if (bestWorkerId) {
          workerAvailability.set(bestWorkerId, endTime);
        }

        if (endTime > orderLastEndTime) {
          orderLastEndTime = endTime;
        }
      }
    }

    orderEstimates.push({
      orderNo: order.orderNo,
      productName: order.product.name,
      estimatedCompletion: orderLastEndTime,
    });

    // 更新订单状态
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "scheduled" },
    });
  }

  revalidatePath("/[tenantId]/schedule");
  revalidatePath("/[tenantId]/orders");

  return {
    message: `成功排产 ${newSchedules.length} 个工序`,
    schedules: newSchedules,
    orderEstimates,
  };
}

// 清除排产计划
export async function clearSchedule() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  requireMinRole(session.user.role, "manager");

  const { tenantId } = session.user;

  // 获取所有排产记录关联的订单
  const schedules = await prisma.scheduleSlot.findMany({
    where: {
      order: { tenantId },
    },
    select: { orderId: true },
    distinct: ["orderId"],
  });

  // 删除排产记录
  await prisma.scheduleSlot.deleteMany({
    where: {
      order: { tenantId },
    },
  });

  // 将订单状态改回待排产
  const orderIds = schedules.map((s) => s.orderId);
  if (orderIds.length > 0) {
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
        status: "scheduled",
      },
      data: { status: "pending" },
    });
  }

  revalidatePath("/[tenantId]/schedule");
  revalidatePath("/[tenantId]/orders");

  return { message: "已清除所有排产计划" };
}

// 获取设备列表（用于排产展示）
export async function getMachines() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;

  return prisma.machine.findMany({
    where: { tenantId, isActive: true },
    orderBy: { code: "asc" },
  });
}
