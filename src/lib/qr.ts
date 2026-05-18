import QRCode from "qrcode";

// 二维码格式: mes://{tenantId}/{type}/{refId}
export function buildQRCodeValue(
  tenantId: string,
  type: "order" | "workstation" | "material" | "employee",
  refId: string
): string {
  return `mes://${tenantId}/${type}/${refId}`;
}

// 解析二维码值
export function parseQRCodeValue(code: string): {
  tenantId: string;
  type: string;
  refId: string;
} | null {
  const match = code.match(/^mes:\/\/([^/]+)\/(order|workstation|material|employee)\/(.+)$/);
  if (!match) return null;
  return {
    tenantId: match[1],
    type: match[2],
    refId: match[3],
  };
}

// 生成二维码图片 (Base64)
export async function generateQRCodeImage(
  content: string,
  options?: { size?: number; margin?: number }
): Promise<string> {
  const { size = 256, margin = 2 } = options || {};
  return QRCode.toDataURL(content, {
    width: size,
    margin,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

// 生成二维码 SVG
export async function generateQRCodeSVG(content: string): Promise<string> {
  return QRCode.toString(content, { type: "svg" });
}

// 批量生成订单二维码
export async function generateOrderQRCodes(
  tenantId: string,
  orders: { id: string; orderNo: string }[]
): Promise<{ orderNo: string; qrValue: string; qrImage: string }[]> {
  const results = await Promise.all(
    orders.map(async (order) => {
      const qrValue = buildQRCodeValue(tenantId, "order", order.id);
      const qrImage = await generateQRCodeImage(qrValue, { size: 200 });
      return {
        orderNo: order.orderNo,
        qrValue,
        qrImage,
      };
    })
  );
  return results;
}

// 生成工位二维码
export async function generateWorkstationQRCodes(
  tenantId: string,
  machines: { id: string; name: string; code: string }[]
): Promise<{ name: string; code: string; qrValue: string; qrImage: string }[]> {
  const results = await Promise.all(
    machines.map(async (machine) => {
      const qrValue = buildQRCodeValue(tenantId, "workstation", machine.id);
      const qrImage = await generateQRCodeImage(qrValue, { size: 200 });
      return {
        name: machine.name,
        code: machine.code,
        qrValue,
        qrImage,
      };
    })
  );
  return results;
}
