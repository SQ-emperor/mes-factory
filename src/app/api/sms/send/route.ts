import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/auth";
import { z } from "zod";

const smsSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
});

// 简单的内存限流（生产环境用Redis）
const rateLimitMap = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = smsSchema.parse(body);

    // 限流检查：每分钟每手机号最多1条
    const lastSent = rateLimitMap.get(phone);
    if (lastSent && Date.now() - lastSent < 60 * 1000) {
      return NextResponse.json(
        { error: "发送太频繁，请稍后再试" },
        { status: 429 }
      );
    }

    const success = await sendVerificationCode(phone);

    if (success) {
      rateLimitMap.set(phone, Date.now());
      return NextResponse.json({ message: "验证码已发送" });
    }

    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
