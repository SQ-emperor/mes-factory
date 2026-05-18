import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { getOrder } from "@/lib/actions/order";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// 状态标签颜色映射
const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  inProgress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  shipped: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  pending: "待排产",
  scheduled: "已排产",
  inProgress: "生产中",
  completed: "已完成",
  shipped: "已发货",
  cancelled: "已取消",
};

const itemStatusColors: Record<string, string> = {
  waiting: "text-gray-500",
  inProgress: "text-yellow-500",
  completed: "text-green-500",
  onHold: "text-red-500",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string; orderId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { tenantId, orderId } = await params;

  // 验证租户权限
  if (session.user.tenantId !== tenantId) {
    redirect(`/${session.user.tenantId}/orders/${orderId}`);
  }

  let order;
  try {
    order = await getOrder(orderId);
  } catch (error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">订单不存在</p>
        <Link href={`/${tenantId}/orders`}>
          <Button variant="link">返回订单列表</Button>
        </Link>
      </div>
    );
  }

  const totalQuantity = order.quantity;
  const completedSteps = order.items.filter((i) => i.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${tenantId}/orders`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{order.orderNo}</h1>
            <Badge className={statusColors[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </div>
          <p className="text-gray-500">{order.product.name}</p>
        </div>
      </div>

      {/* 订单基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">订单信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">产品：</span>
              <span>{order.product.name}</span>
            </div>
            <div>
              <span className="text-gray-500">数量：</span>
              <span>
                {order.quantity} {order.product.unit}
              </span>
            </div>
            <div>
              <span className="text-gray-500">交期：</span>
              <span>
                {order.dueDate
                  ? new Date(order.dueDate).toLocaleDateString("zh-CN")
                  : "未设置"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">客户：</span>
              <span>{order.customerName || "未设置"}</span>
            </div>
            <div>
              <span className="text-gray-500">创建时间：</span>
              <span>{new Date(order.createdAt).toLocaleString("zh-CN")}</span>
            </div>
            <div>
              <span className="text-gray-500">优先级：</span>
              <span>
                {order.priority === 0
                  ? "普通"
                  : order.priority === 1
                    ? "紧急"
                    : "非常紧急"}
              </span>
            </div>
          </div>
          {order.notes && (
            <div className="mt-4 pt-4 border-t text-sm">
              <span className="text-gray-500">备注：</span>
              <span>{order.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 工序流程图 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">工序流程</CardTitle>
            <span className="text-sm text-gray-500">
              {completedSteps}/{order.items.length} 工序完成
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item, index) => {
              const isCompleted = item.status === "completed";
              const isInProgress = item.status === "inProgress";
              const isWaiting = item.status === "waiting";

              return (
                <div key={item.id} className="relative">
                  {/* 连接线 */}
                  {index < order.items.length - 1 && (
                    <div
                      className={`absolute left-4 top-10 w-0.5 h-8 ${
                        isCompleted ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}

                  <div className="flex items-start gap-4">
                    {/* 状态图标 */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? "bg-green-100"
                          : isInProgress
                            ? "bg-yellow-100"
                            : "bg-gray-100"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : isInProgress ? (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {/* 工序信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">
                            {item.processStep.process.name}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({item.processStep.process.code})
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={itemStatusColors[item.status]}
                        >
                          {item.status === "waiting"
                            ? "等待中"
                            : item.status === "inProgress"
                              ? "进行中"
                              : item.status === "completed"
                                ? "已完成"
                                : "暂停"}
                        </Badge>
                      </div>

                      {/* 进度信息 */}
                      <div className="mt-2 text-sm text-gray-500">
                        <span>完成: {item.quantityDone}/{totalQuantity}</span>
                        {item.quantityDefect > 0 && (
                          <span className="text-red-500 ml-4">
                            不良: {item.quantityDefect}
                          </span>
                        )}
                      </div>

                      {/* 进度条 */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isCompleted
                              ? "bg-green-500"
                              : isInProgress
                                ? "bg-yellow-500"
                                : "bg-gray-300"
                          }`}
                          style={{
                            width: `${Math.min(
                              (item.quantityDone / totalQuantity) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      {/* 报工记录 */}
                      {item.workReports.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-gray-400">最近报工:</p>
                          {item.workReports.map((report) => (
                            <div
                              key={report.id}
                              className="text-xs text-gray-500 flex items-center justify-between"
                            >
                              <span>
                                {report.user.name} - {new Date(report.reportedAt).toLocaleString("zh-CN")}
                              </span>
                              <span className="text-green-600">+{report.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        {order.status === "pending" && (
          <Button className="flex-1">开始生产</Button>
        )}
        {order.status === "inProgress" && (
          <Button variant="outline" className="flex-1">
            暂停订单
          </Button>
        )}
        <Link href={`/${tenantId}/orders`} className="flex-1">
          <Button variant="outline" className="w-full">
            返回列表
          </Button>
        </Link>
      </div>
    </div>
  );
}
