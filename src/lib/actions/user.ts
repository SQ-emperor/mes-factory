"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

const ROLE_LEVEL: Record<string, number> = {
  admin: 3,
  manager: 2,
  worker: 1,
};

function canManage(myRole: string, targetRole: string): boolean {
  return (ROLE_LEVEL[myRole] || 0) > (ROLE_LEVEL[targetRole] || 0);
}

export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登录");

  const name = formData.get("name") as string;
  const department = formData.get("department") as string;

  if (!name || name.trim().length === 0) {
    return { error: "姓名不能为空" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name.trim(),
      department: department?.trim() || null,
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export type Subordinate = {
  id: string;
  name: string;
  phone: string;
  role: string;
  department: string | null;
  isActive: boolean;
};

export async function getSubordinates(): Promise<Subordinate[]> {
  const session = await auth();
  if (!session?.user) return [];

  const myRole = session.user.role;
  if (myRole === "worker") return []; // worker 无管理权限

  // admin 看到 manager + worker，manager 只看到 worker
  const subordinateRoles: UserRole[] =
    myRole === "admin" ? ["manager", "worker"] : ["worker"];

  const users = await prisma.user.findMany({
    where: {
      tenantId: session.user.tenantId,
      role: { in: subordinateRoles },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      department: true,
      isActive: true,
    },
    orderBy: { role: "asc" },
  });

  return users;
}

export async function updateSubordinate(
  targetId: string,
  data: { name?: string; department?: string; role?: string }
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "未登录" };

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, tenantId: true },
  });

  if (!target) return { error: "用户不存在" };
  if (target.tenantId !== session.user.tenantId) return { error: "无权操作" };
  if (!canManage(session.user.role, target.role)) return { error: "无权修改该用户" };

  const updateData: Record<string, string | null> = {};
  if (data.name !== undefined) {
    if (!data.name.trim()) return { error: "姓名不能为空" };
    updateData.name = data.name.trim();
  }
  if (data.department !== undefined) {
    updateData.department = data.department.trim() || null;
  }
  if (data.role !== undefined) {
    if (!["admin", "manager", "worker"].includes(data.role)) {
      return { error: "无效的角色" };
    }
    // 新角色也必须低于当前用户
    if (!canManage(session.user.role, data.role)) {
      return { error: "无权设置该角色" };
    }
    updateData.role = data.role;
  }

  if (Object.keys(updateData).length === 0) return { error: "无修改内容" };

  await prisma.user.update({
    where: { id: targetId },
    data: updateData,
  });

  revalidatePath("/", "layout");
  return { success: true };
}
