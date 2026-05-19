"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
