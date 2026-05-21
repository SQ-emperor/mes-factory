"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { requireMinRole } from "@/lib/role";

// 获取订单列表
export async function getOrders(options?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;
  const { status, search, page = 1, pageSize = 20 } = options || {};

  const where: any = { tenantId };

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { orderNo: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { product: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
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
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  // 计算每个订单的进度
  const ordersWithProgress = orders.map((order) => {
    const totalItems = order.items.length;
    const completedItems = order.items.filter((i) => i.status === "completed").length;
    const totalDone = order.items.reduce((sum, i) => sum + i.quantityDone, 0);
    const progress = order.quantity > 0 ? Math.round((totalDone / (order.quantity * totalItems)) * 100) : 0;

    return {
      ...order,
      progress: Math.min(progress, 100),
      completedSteps: completedItems,
      totalSteps: totalItems,
    };
  });

  return {
    orders: ordersWithProgress,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 获取单个订单详情
export async function getOrder(orderId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
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
          assignedUser: true,
          workReports: {
            include: {
              user: true,
            },
            orderBy: {
              reportedAt: "desc",
            },
            take: 5,
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

  return order;
}

// 创建订单
export async function createOrder(data: {
  productId: string;
  quantity: number;
  dueDate?: string;
  priority?: number;
  customerName?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  requireMinRole(session.user.role, "manager");

  const { tenantId } = session.user;

  // 获取产品的工序步骤
  const product = await prisma.product.findFirst({
    where: {
      id: data.productId,
      tenantId,
    },
    include: {
      processSteps: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!product) {
    throw new Error("产品不存在");
  }

  // 生成订单号
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.order.count({
    where: {
      tenantId,
      orderNo: { startsWith: `ORD-${today}` },
    },
  });
  const orderNo = `ORD-${today}-${String(count + 1).padStart(3, "0")}`;

  // 创建订单和订单项
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        tenantId,
        orderNo,
        productId: data.productId,
        quantity: data.quantity,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority || 0,
        customerName: data.customerName,
        notes: data.notes,
        status: "pending",
      },
    });

    // 为每个工序创建订单项
    for (const step of product.processSteps) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          processStepId: step.id,
          status: "waiting",
        },
      });
    }

    return newOrder;
  });

  revalidatePath("/[tenantId]/orders");
  return order;
}

// 更新订单状态
export async function updateOrderStatus(orderId: string, status: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  requireMinRole(session.user.role, "manager");

  const { tenantId } = session.user;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });

  if (!order) {
    throw new Error("订单不存在");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: status as any },
  });

  revalidatePath("/[tenantId]/orders");
  revalidatePath(`/[tenantId]/orders/${orderId}`);
  return { success: true };
}

// 获取产品列表（用于新建订单）
export async function getProducts() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;

  return prisma.product.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

// 获取仪表盘统计数据
export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("未登录");
  }

  const { tenantId } = session.user;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todayOutput,
    inProgressOrders,
    completedToday,
    totalDefects,
    recentReports,
    ordersByStatus,
  ] = await Promise.all([
    // 今日产量
    prisma.workReport.aggregate({
      where: {
        orderItem: {
          order: { tenantId },
        },
        reportedAt: { gte: today },
      },
      _sum: { quantity: true },
    }),
    // 进行中订单数
    prisma.order.count({
      where: {
        tenantId,
        status: "inProgress",
      },
    }),
    // 今日完成订单数
    prisma.order.count({
      where: {
        tenantId,
        status: "completed",
        updatedAt: { gte: today },
      },
    }),
    // 今日不良品数
    prisma.workReport.aggregate({
      where: {
        orderItem: {
          order: { tenantId },
        },
        reportedAt: { gte: today },
      },
      _sum: { defectCount: true },
    }),
    // 最近报工记录
    prisma.workReport.findMany({
      where: {
        orderItem: {
          order: { tenantId },
        },
      },
      include: {
        user: true,
        orderItem: {
          include: {
            processStep: {
              include: {
                process: true,
              },
            },
            order: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { reportedAt: "desc" },
      take: 10,
    }),
    // 订单状态分布
    prisma.order.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),
  ]);

  return {
    todayOutput: todayOutput._sum.quantity || 0,
    inProgressOrders,
    completedToday,
    todayDefects: totalDefects._sum.defectCount || 0,
    recentReports,
    ordersByStatus: ordersByStatus.map((s) => ({
      status: s.status,
      count: s._count,
    })),
  };
}
