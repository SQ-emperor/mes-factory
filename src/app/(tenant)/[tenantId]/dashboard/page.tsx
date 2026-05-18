import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getDashboardStats } from "@/lib/actions/order";
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

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { tenantId } = await params;

  // 验证租户权限
  if (session.user.tenantId !== tenantId) {
    redirect(`/${session.user.tenantId}/dashboard`);
  }

  let stats;
  try {
    stats = await getDashboardStats();
  } catch (error) {
    // 如果获取数据失败，使用空数据
    stats = {
      todayOutput: 0,
      inProgressOrders: 0,
      completedToday: 0,
      todayDefects: 0,
      recentReports: [],
      ordersByStatus: [],
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">数据看板</h1>
        <p className="text-gray-500">生产数据概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日产量</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOutput}</div>
            <p className="text-xs text-muted-foreground">件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">进行中订单</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressOrders}</div>
            <p className="text-xs text-muted-foreground">个</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日完成</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">个订单</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">不良品</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayDefects}</div>
            <p className="text-xs text-muted-foreground">件</p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">订单状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.ordersByStatus.length > 0 ? (
              <div className="space-y-3">
                {stats.ordersByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <Badge className={statusColors[item.status] || "bg-gray-100"}>
                      {statusLabels[item.status] || item.status}
                    </Badge>
                    <span className="font-medium">{item.count} 个</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400">
                暂无订单数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近报工记录</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentReports.length > 0 ? (
              <div className="space-y-3">
                {stats.recentReports.slice(0, 5).map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                  >
                    <div>
                      <span className="font-medium">{report.user.name}</span>
                      <span className="text-gray-500 mx-1">|</span>
                      <span className="text-gray-600">
                        {report.orderItem.processStep.process.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-green-600 font-medium">
                        +{report.quantity}
                      </span>
                      {report.defectCount > 0 && (
                        <span className="text-red-500 ml-2">
                          不良 {report.defectCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400">
                暂无报工记录
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
