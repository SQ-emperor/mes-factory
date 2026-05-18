import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOrderQRCodes, generateWorkstationQRCodes, buildQRCodeValue, generateQRCodeImage } from "@/lib/qr";

// 批量生成订单二维码
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { tenantId } = session.user;

  try {
    const body = await request.json();
    const { type, ids } = body;

    if (type === "order") {
      // 获取订单信息
      const orders = await prisma.order.findMany({
        where: {
          id: { in: ids },
          tenantId,
        },
        select: { id: true, orderNo: true },
      });

      const qrcodes = await generateOrderQRCodes(tenantId, orders);
      return NextResponse.json({ qrcodes });
    }

    if (type === "workstation") {
      // 获取设备信息
      const machines = await prisma.machine.findMany({
        where: {
          id: { in: ids },
          tenantId,
        },
        select: { id: true, name: true, code: true },
      });

      const qrcodes = await generateWorkstationQRCodes(tenantId, machines);
      return NextResponse.json({ qrcodes });
    }

    return NextResponse.json({ error: "不支持的类型" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}

// 生成单个二维码图片
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { tenantId } = session.user;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "order" | "workstation" | "material" | "employee";
  const refId = searchParams.get("refId");

  if (!type || !refId) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  try {
    const qrValue = buildQRCodeValue(tenantId, type, refId);
    const qrImage = await generateQRCodeImage(qrValue, { size: 256 });

    return NextResponse.json({ qrValue, qrImage });
  } catch (error) {
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
