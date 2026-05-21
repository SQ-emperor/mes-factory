"use server";

import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";

export async function getTenants() {
  return prisma.tenant.findMany({
    select: { id: true, name: true, industry: true },
    orderBy: { name: "asc" },
  });
}

export async function registerUser(data: {
  name: string;
  phone: string;
  tenantId: string;
}) {
  if (!data.name || !data.phone || !data.tenantId) {
    return { error: "请填写完整信息" };
  }

  if (!/^1[3-9]\d{9}$/.test(data.phone)) {
    return { error: "请输入正确的手机号" };
  }

  // 检查手机号是否已在该租户中注册
  const existing = await prisma.user.findFirst({
    where: { phone: data.phone, tenantId: data.tenantId },
  });

  if (existing) {
    return { error: "该手机号已注册，请直接登录" };
  }

  await prisma.user.create({
    data: {
      tenantId: data.tenantId,
      phone: data.phone,
      name: data.name,
      role: "worker",
    },
  });

  return { success: true };
}
