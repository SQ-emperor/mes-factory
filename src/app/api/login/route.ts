import { signIn } from "@/lib/auth";
import { NextResponse } from "next/server";
import { AuthError } from "next-auth";

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: "请填写完整信息" },
        { status: 400 }
      );
    }

    // 服务端调用 signIn，redirect:false 只验证并种 cookie，不跳转
    await signIn("credentials", { phone, code, redirect: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "验证码错误或手机号未注册" },
        { status: 401 }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
