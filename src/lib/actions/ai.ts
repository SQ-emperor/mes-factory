"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import dayjs from "dayjs";

// ============ 生产数据上下文 ============

async function getProductionContext(tenantId: string): Promise<string> {
  const now = dayjs();
  const todayStart = now.startOf("day").toDate();
  const weekStart = now.startOf("week").toDate();

  const [
    orders,
    todayReports,
    weekReports,
    qualityRecords,
    users,
    machines,
    products,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId },
      include: {
        product: { select: { name: true } },
        items: {
          include: {
            processStep: {
              include: { process: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.workReport.findMany({
      where: { reportedAt: { gte: todayStart }, orderItem: { order: { tenantId } } },
      include: {
        user: { select: { name: true } },
        orderItem: {
          include: {
            processStep: { include: { process: { select: { name: true } } } },
            order: { select: { orderNo: true } },
          },
        },
      },
    }),
    prisma.workReport.findMany({
      where: { reportedAt: { gte: weekStart }, orderItem: { order: { tenantId } } },
      select: { quantity: true, defectCount: true, reportedAt: true },
    }),
    prisma.qualityRecord.findMany({
      where: { tenantId, inspectedAt: { gte: weekStart } },
      include: {
        order: { select: { orderNo: true } },
        inspector: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, role: true, department: true, isActive: true },
    }),
    prisma.machine.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true, type: true, isActive: true },
    }),
    prisma.product.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true },
    }),
  ]);

  // 订单统计
  const ordersByStatus = {
    pending: orders.filter((o) => o.status === "pending").length,
    scheduled: orders.filter((o) => o.status === "scheduled").length,
    inProgress: orders.filter((o) => o.status === "inProgress").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  // 今日产量
  const todayOutput = todayReports.reduce((s, r) => s + r.quantity, 0);
  const todayDefects = todayReports.reduce((s, r) => s + r.defectCount, 0);

  // 本周产量
  const weekOutput = weekReports.reduce((s, r) => s + r.quantity, 0);
  const weekDefects = weekReports.reduce((s, r) => s + r.defectCount, 0);

  // 质检统计
  const qualityStats = {
    total: qualityRecords.length,
    pass: qualityRecords.filter((r) => r.result === "pass").length,
    fail: qualityRecords.filter((r) => r.result === "fail").length,
    conditional: qualityRecords.filter((r) => r.result === "conditional").length,
  };

  // 进行中的订单详情
  const activeOrders = orders
    .filter((o) => ["inProgress", "scheduled"].includes(o.status))
    .map((o) => {
      const totalDone = o.items.reduce((s, i) => s + i.quantityDone, 0);
      const totalQty = o.quantity;
      const currentStep = o.items.find((i) => i.status === "inProgress");
      return {
        orderNo: o.orderNo,
        product: o.product.name,
        quantity: totalQty,
        done: totalDone,
        progress: totalQty > 0 ? Math.round((totalDone / totalQty) * 100) : 0,
        currentStep: currentStep?.processStep.process.name || "待开始",
        dueDate: o.dueDate ? dayjs(o.dueDate).format("MM-DD") : "未设定",
        priority: o.priority,
      };
    });

  // 工人效率（本周）
  const workerEfficiency = users
    .filter((u) => u.role === "worker" && u.isActive)
    .map((u) => {
      const userReports = todayReports.filter((r) => r.userId === u.id);
      const userOutput = userReports.reduce((s, r) => s + r.quantity, 0);
      return { name: u.name, todayOutput: userOutput, department: u.department || "未分配" };
    })
    .sort((a, b) => b.todayOutput - a.todayOutput);

  return `
## 系统概览
- 产品种类: ${products.length} 种
- 设备总数: ${machines.length} 台 (活跃 ${machines.filter((m) => m.isActive).length} 台)
- 人员总数: ${users.length} 人 (工人 ${users.filter((u) => u.role === "worker").length} 人)

## 订单状态
- 待排产: ${ordersByStatus.pending} 单
- 已排产: ${ordersByStatus.scheduled} 单
- 生产中: ${ordersByStatus.inProgress} 单
- 已完成: ${ordersByStatus.completed} 单

## 今日生产
- 今日产量: ${todayOutput} 件
- 今日不良: ${todayDefects} 件
- 今日报工记录: ${todayReports.length} 条

## 本周生产
- 本周产量: ${weekOutput} 件
- 本周不良: ${weekDefects} 件
- 本周不良率: ${weekOutput > 0 ? ((weekDefects / weekOutput) * 100).toFixed(1) : 0}%

## 质检统计 (本周)
- 质检总数: ${qualityStats.total} 次
- 合格: ${qualityStats.pass} 次
- 不合格: ${qualityStats.fail} 次
- 让步接收: ${qualityStats.conditional} 次

## 进行中的订单
${activeOrders.map((o) => `- ${o.orderNo} | ${o.product} | ${o.done}/${o.quantity}件 (${o.progress}%) | 当前: ${o.currentStep} | 交期: ${o.dueDate}`).join("\n")}

## 工人今日效率
${workerEfficiency.map((w) => `- ${w.name} (${w.department}): ${w.todayOutput} 件`).join("\n")}
`.trim();
}

// ============ 智能问答 ============

const SYSTEM_PROMPT = `你是"厂里通 AI 助手"，一个专为中小工厂设计的智能生产顾问。

你的职责：
1. 回答关于生产进度、订单状态、工人效率、质量状况的问题
2. 分析生产数据，发现潜在问题并给出建议
3. 用简洁易懂的中文回答，适合工厂管理人员和工人阅读
4. 当数据不足以回答时，坦诚说明并建议查看具体页面

回答风格：
- 简洁直接，先给结论再解释
- 用数字说话，引用具体数据
- 给出可操作的建议
- 适当使用 emoji 让回答更友好`;

export async function aiChat(
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<{ error?: string; reply?: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) return { error: "未登录" };

  try {
    const context = await getProductionContext(session.user.tenantId);

    const fullMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "system" as const, content: `以下是当前工厂的实时生产数据：\n\n${context}` },
      ...messages,
    ];

    const reply = await chatCompletion(fullMessages, {
      temperature: 0.7,
      maxTokens: 1024,
    });

    return { reply };
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    return { error: error instanceof Error ? error.message : "AI 服务暂时不可用" };
  }
}

// ============ 质量异常检测 ============

export async function detectQualityAnomalies(): Promise<{
  error?: string;
  anomalies?: string[];
  summary?: string;
}> {
  const session = await auth();
  if (!session?.user?.tenantId) return { error: "未登录" };

  try {
    const now = dayjs();
    const weekStart = now.startOf("week").toDate();
    const lastWeekStart = now.subtract(1, "week").startOf("week").toDate();

    const [thisWeekReports, lastWeekReports, qualityRecords] = await Promise.all([
      prisma.workReport.findMany({
        where: { reportedAt: { gte: weekStart }, orderItem: { order: { tenantId: session.user.tenantId } } },
        include: {
          orderItem: {
            include: {
              processStep: { include: { process: { select: { name: true } } } },
              order: { select: { orderNo: true } },
            },
          },
          user: { select: { name: true } },
        },
      }),
      prisma.workReport.findMany({
        where: {
          reportedAt: { gte: lastWeekStart, lt: weekStart },
          orderItem: { order: { tenantId: session.user.tenantId } },
        },
        select: { quantity: true, defectCount: true },
      }),
      prisma.qualityRecord.findMany({
        where: { tenantId: session.user.tenantId, inspectedAt: { gte: weekStart } },
        include: { order: { select: { orderNo: true } } },
      }),
    ]);

    // 按工序统计不良率
    const byProcess: Record<string, { total: number; defects: number }> = {};
    for (const r of thisWeekReports) {
      const name = r.orderItem.processStep.process.name;
      if (!byProcess[name]) byProcess[name] = { total: 0, defects: 0 };
      byProcess[name].total += r.quantity;
      byProcess[name].defects += r.defectCount;
    }

    // 对比上周
    const lastWeekTotal = lastWeekReports.reduce((s, r) => s + r.quantity, 0);
    const lastWeekDefects = lastWeekReports.reduce((s, r) => s + r.defectCount, 0);
    const lastWeekRate = lastWeekTotal > 0 ? (lastWeekDefects / lastWeekTotal) * 100 : 0;

    const thisWeekTotal = thisWeekReports.reduce((s, r) => s + r.quantity, 0);
    const thisWeekDefects = thisWeekReports.reduce((s, r) => s + r.defectCount, 0);
    const thisWeekRate = thisWeekTotal > 0 ? (thisWeekDefects / thisWeekTotal) * 100 : 0;

    // 质检不合格记录
    const failRecords = qualityRecords.filter((r) => r.result === "fail");

    const anomalyData = `
## 本周 vs 上周不良率对比
- 上周: ${lastWeekRate.toFixed(1)}% (${lastWeekDefects}/${lastWeekTotal})
- 本周: ${thisWeekRate.toFixed(1)}% (${thisWeekDefects}/${thisWeekTotal})
- 变化: ${(thisWeekRate - lastWeekRate).toFixed(1)}个百分点

## 各工序不良率
${Object.entries(byProcess)
  .map(([name, d]) => `- ${name}: ${d.total > 0 ? ((d.defects / d.total) * 100).toFixed(1) : 0}% (${d.defects}/${d.total})`)
  .join("\n")}

## 质检不合格记录 (本周)
${failRecords.map((r) => `- ${r.order?.orderNo || "无订单"} | ${r.defectType || "未分类"} | ${r.defectCount || 0}件 | ${r.notes || ""}`).join("\n") || "无"}
`;

    const result = await chatCompletion([
      {
        role: "system",
        content: `你是质量分析专家。分析以下生产质量数据，找出异常并给出建议。
返回格式：
1. 先给出一段总体评价（summary）
2. 然后列出发现的异常点（anomalies），每个异常一行，以 "- " 开头

如果没有明显异常，也要给出预防性建议。用中文回答。`,
      },
      { role: "user", content: anomalyData },
    ]);

    // 解析结果
    const lines = result.split("\n").filter((l) => l.trim());
    const anomalies: string[] = [];
    let summary = "";

    for (const line of lines) {
      if (line.startsWith("- ") || line.startsWith("• ")) {
        anomalies.push(line.replace(/^[-•]\s*/, ""));
      } else if (!summary && line.length > 10) {
        summary = line;
      }
    }

    if (!summary && lines.length > 0) summary = lines[0];
    if (anomalies.length === 0) anomalies.push("本周质量状况良好，未发现明显异常");

    return { anomalies, summary };
  } catch (error) {
    console.error("[Quality Anomaly] Error:", error);
    return { error: error instanceof Error ? error.message : "分析失败" };
  }
}

// ============ 报工数量建议 ============

export async function suggestQuantity(orderId: string): Promise<{
  error?: string;
  suggested?: number;
  reason?: string;
}> {
  const session = await auth();
  if (!session?.user?.tenantId) return { error: "未登录" };

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: session.user.tenantId },
      include: {
        items: {
          include: {
            processStep: { include: { process: true } },
            workReports: {
              orderBy: { reportedAt: "desc" },
              take: 20,
            },
          },
        },
      },
    });

    if (!order) return { error: "订单不存在" };

    // 找当前工序
    const currentItem = order.items.find((i) => i.status === "inProgress") ||
      order.items.find((i) => i.status === "waiting");

    if (!currentItem) return { error: "没有待报工的工序" };

    const remaining = order.quantity - currentItem.quantityDone;
    if (remaining <= 0) return { suggested: 0, reason: "该工序已完成" };

    // 分析历史报工记录
    const reports = currentItem.workReports;
    if (reports.length === 0) {
      // 没有历史记录，建议剩余数量
      return {
        suggested: Math.min(remaining, 10),
        reason: "首次报工，建议少量试报",
      };
    }

    // 计算平均每次报工数量
    const avgQuantity = reports.reduce((s, r) => s + r.quantity, 0) / reports.length;
    const maxQuantity = Math.max(...reports.map((r) => r.quantity));
    const lastQuantity = reports[0].quantity;

    // 建议值：取最近一次报工数量和平均值的加权
    let suggested = Math.round(lastQuantity * 0.6 + avgQuantity * 0.4);
    suggested = Math.max(1, Math.min(suggested, remaining));

    const reason =
      reports.length >= 3
        ? `基于最近 ${reports.length} 次报工分析：平均 ${avgQuantity.toFixed(0)} 件/次，上次 ${lastQuantity} 件`
        : `基于已有 ${reports.length} 次报工记录`;

    return { suggested, reason };
  } catch (error) {
    console.error("[Suggest Quantity] Error:", error);
    return { error: error instanceof Error ? error.message : "计算失败" };
  }
}
