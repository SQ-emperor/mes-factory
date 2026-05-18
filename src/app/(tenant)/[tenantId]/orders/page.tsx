import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { getOrders } from "@/lib/actions/order";
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

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { tenantId } = await params;
  const { status, search, page } = await searchParams;

  // 验证租户权限
  if (session.user.tenantId !== tenantId) {
    redirect(`/${session.user.tenantId}/orders`);
  }

  let ordersData;
  try {
    ordersData = await getOrders({
      status,
      search,
      page: page ? parseInt(page) : 1,
    });
  } catch (error) {
    ordersData = {
      orders: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">订单管理</h1>
          <p className="text-gray-500">管理生产订单和进度</p>
        </div>
        <Link href="orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建订单
          </Button>
        </Link>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <form>
            <Input
              name="search"
              placeholder="搜索订单号或产品名称..."
              className="pl-10"
              defaultValue={search}
            />
          </form>
        </div>
        <div className="flex gap-2">
          <Link href={`/${tenantId}/orders`}>
            <Button variant={!status || status === "all" ? "default" : "outline"} size="sm">
              全部
            </Button>
          </Link>
          <Link href={`/${tenantId}/orders?status=pending`}>
            <Button variant={status === "pending" ? "default" : "outline"} size="sm">
              待排产
            </Button>
          </Link>
          <Link href={`/${tenantId}/orders?status=inProgress`}>
            <Button variant={status === "inProgress" ? "default" : "outline"} size="sm">
              生产中
            </Button>
          </Link>
          <Link href={`/${tenantId}/orders?status=completed`}>
            <Button variant={status === "completed" ? "default" : "outline"} size="sm">
              已完成
            </Button>
          </Link>
        </div>
      </div>

      {/* 订单列表 */}
      {ordersData.orders.length > 0 ? (
        <div className="space-y-4">
          {ordersData.orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{order.orderNo}</CardTitle>
                  <Badge className={statusColors[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">产品：</span>
                    <span>{order.product.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">数量：</span>
                    <span>{order.quantity} {order.product.unit}</span>
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
                </div>

                {/* 进度条 */}
                {order.status === "inProgress" && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-500">进度</span>
                      <span className="text-blue-600 font-medium">
                        {order.completedSteps}/{order.totalSteps} 工序
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${order.progress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Link href={`${tenantId}/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      查看详情
                    </Button>
                  </Link>
                  {order.status === "pending" && (
                    <Button size="sm">开始生产</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            暂无订单数据，点击右上角"新建订单"创建
          </CardContent>
        </Card>
      )}

      {/* 分页 */}
      {ordersData.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: ordersData.totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <Link
                key={pageNum}
                href={`/${tenantId}/orders?page=${pageNum}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
              >
                <Button
                  variant={pageNum === ordersData.page ? "default" : "outline"}
                  size="sm"
                >
                  {pageNum}
                </Button>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
