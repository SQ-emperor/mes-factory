"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ==================== 产品管理 ====================

export async function getProducts() {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  return prisma.product.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      processSteps: {
        include: { process: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(data: {
  name: string;
  code: string;
  unit?: string;
  processIds?: string[];
}) {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  const product = await prisma.product.create({
    data: {
      tenantId: session.user.tenantId,
      name: data.name,
      code: data.code,
      unit: data.unit || "件",
    },
  });

  // 添加工序步骤
  if (data.processIds && data.processIds.length > 0) {
    await prisma.processStep.createMany({
      data: data.processIds.map((processId, index) => ({
        productId: product.id,
        processId,
        sortOrder: index + 1,
      })),
    });
  }

  revalidatePath("/[tenantId]/settings/products");
  return product;
}

export async function deleteProduct(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  await prisma.product.delete({
    where: { id, tenantId: session.user.tenantId },
  });

  revalidatePath("/[tenantId]/settings/products");
}

// ==================== 工序管理 ====================

export async function getProcesses() {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  return prisma.process.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createProcess(data: {
  name: string;
  code: string;
  standardTime?: number;
  requiresMachine?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  // 获取当前最大排序号
  const maxOrder = await prisma.process.findFirst({
    where: { tenantId: session.user.tenantId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const process = await prisma.process.create({
    data: {
      tenantId: session.user.tenantId,
      name: data.name,
      code: data.code,
      sortOrder: (maxOrder?.sortOrder || 0) + 1,
      standardTime: data.standardTime,
      requiresMachine: data.requiresMachine || false,
    },
  });

  revalidatePath("/[tenantId]/settings/processes");
  return process;
}

export async function deleteProcess(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  await prisma.process.delete({
    where: { id, tenantId: session.user.tenantId },
  });

  revalidatePath("/[tenantId]/settings/processes");
}

// ==================== 设备管理 ====================

export async function getMachines() {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  return prisma.machine.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { code: "asc" },
  });
}

export async function createMachine(data: {
  name: string;
  code: string;
  type?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  const machine = await prisma.machine.create({
    data: {
      tenantId: session.user.tenantId,
      name: data.name,
      code: data.code,
      type: data.type,
    },
  });

  revalidatePath("/[tenantId]/settings/machines");
  return machine;
}

export async function deleteMachine(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  await prisma.machine.delete({
    where: { id, tenantId: session.user.tenantId },
  });

  revalidatePath("/[tenantId]/settings/machines");
}

// ==================== 用户/团队管理 ====================

export async function getUsers() {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  return prisma.user.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(data: {
  phone: string;
  name: string;
  role: "admin" | "manager" | "worker";
  department?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  // 检查手机号是否已存在
  const existing = await prisma.user.findUnique({
    where: {
      tenantId_phone: {
        tenantId: session.user.tenantId,
        phone: data.phone,
      },
    },
  });

  if (existing) {
    throw new Error("该手机号已存在");
  }

  const user = await prisma.user.create({
    data: {
      tenantId: session.user.tenantId,
      phone: data.phone,
      name: data.name,
      role: data.role,
      department: data.department,
    },
  });

  revalidatePath("/[tenantId]/settings/users");
  return user;
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("未登录");

  // 不能删除自己
  if (id === session.user.id) {
    throw new Error("不能删除当前登录用户");
  }

  await prisma.user.delete({
    where: { id, tenantId: session.user.tenantId },
  });

  revalidatePath("/[tenantId]/settings/users");
}
