"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(phone: string, code: string) {
  try {
    await signIn("credentials", { phone, code, redirect: false });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "验证码错误或手机号未注册" };
    }
    throw error;
  }
}
