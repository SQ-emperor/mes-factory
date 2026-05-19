"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import {
  getScheduleData,
  autoSchedule,
  clearSchedule,
} from "@/lib/actions/schedule";

interface Machine {
  id: string;
  name: string;
  code: string;
  type: string | null;
}

interface ScheduleSlot {
  id: string;
  startTime: string;
  endTime: string;
  order: {
    orderNo: string;
    product: { name: string };
  };
  machine: Machine | null;
  user: { name: string } | null;
}

interface PendingOrder {
  id: string;
  orderNo: string;
  quantity: number;
  dueDate: string | null;
  product: { name: string };
  items: {
    processStep: {
      process: { standardTime: number | null };
    };
  }[];
}

interface OrderEstimate {
  orderNo: string;
  productName: string;
  estimatedCompletion: string;
}

export default function SchedulePage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [orderEstimates, setOrderEstimates] = useState<OrderEstimate[]>([]);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getScheduleData();
      setMachines(data.machines);
      setSchedules(data.schedules as any);
      setPendingOrders(data.pendingOrders as any);
    } catch (error) {
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // AI 自动排产
  const handleAutoSchedule = async () => {
    setScheduling(true);
    setOrderEstimates([]);
    try {
      const result = await autoSchedule();
      toast.success(result.message);
      if (result.orderEstimates) {
        setOrderEstimates(result.orderEstimates as any);
      }
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "排产失败");
    } finally {
      setScheduling(false);
    }
  };

  // 清除排产
  const handleClearSchedule = async () => {
    if (!confirm("确定要清除所有排产计划吗？")) return;

    try {
      const result = await clearSchedule();
      toast.success(result.message);
      setOrderEstimates([]);
      await loadData();
    } catch (error) {
      toast.error("清除失败");
    }
  };

  // 计算订单预估工时（小时）
  const estimateHours = (order: PendingOrder) => {
    let totalSeconds = 0;
    for (const item of order.items) {
      const standardTime = item.processStep.process.standardTime || 60;
      totalSeconds += order.quantity * standardTime;
    }
    return Math.round((totalSeconds / 3600) * 10) / 10;
  };

  // 获取日期标题
  const getDateHeaders = () => {
    const headers = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      headers.push({
        date: date.toLocaleDateString("zh-CN", {
          month: "numeric",
          day: "numeric",
        }),
        weekday: date.toLocaleDateString("zh-CN", { weekday: "short" }),
        isToday: i === 0,
      });
    }
    return headers;
  };

  const dateHeaders = getDateHeaders();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">排产计划</h1>
          <p className="text-gray-500">AI智能排产，优化生产效率</p>
        </div>
        <div className="flex gap-2">
          {schedules.length > 0 && (
            <Button variant="outline" onClick={handleClearSchedule}>
              <Trash2 className="h-4 w-4 mr-2" />
              清除排产
            </Button>
          )}
          <Button onClick={handleAutoSchedule} disabled={scheduling}>
            <Sparkles className="h-4 w-4 mr-2" />
            {scheduling ? "排产中..." : "AI排产"}
          </Button>
        </div>
      </div>

      {/* 待排产订单提示 */}
      {pendingOrders.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-3">
            <p className="text-sm text-blue-700">
              有 {pendingOrders.length} 个订单待排产，点击"AI排产"按钮自动分配。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 甘特图 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">生产排程</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">本周</Badge>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-1" />
                选择日期
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 甘特图表格 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 w-32 sticky left-0 bg-white">
                    设备/人员
                  </th>
                  {dateHeaders.map((header) => (
                    <th
                      key={header.date}
                      className={`text-center py-2 px-1 min-w-[80px] ${
                        header.isToday ? "bg-blue-50" : ""
                      }`}
                    >
                      <div>{header.weekday}</div>
                      <div className="text-xs text-gray-500">{header.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machines.length > 0 ? (
                  machines.map((machine) => (
                    <tr key={machine.id} className="border-b">
                      <td className="py-3 px-2 font-medium sticky left-0 bg-white">
                        <div>{machine.name}</div>
                        <div className="text-xs text-gray-500">{machine.code}</div>
                      </td>
                      {dateHeaders.map((header) => {
                        // 查找该设备在该日期的排产
                        const daySchedules = schedules.filter(
                          (s) =>
                            s.machine?.id === machine.id &&
                            new Date(s.startTime).toLocaleDateString("zh-CN") ===
                              header.date
                        );

                        return (
                          <td
                            key={header.date}
                            className={`py-3 px-1 ${header.isToday ? "bg-blue-50/50" : ""}`}
                          >
                            {daySchedules.length > 0 ? (
                              <div className="space-y-1">
                                {daySchedules.map((schedule) => (
                                  <div
                                    key={schedule.id}
                                    className="bg-blue-100 text-blue-700 rounded px-2 py-1 text-xs truncate"
                                    title={`${schedule.order.orderNo} - ${schedule.order.product.name}`}
                                  >
                                    {schedule.order.orderNo.slice(-6)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-8 bg-gray-50 rounded flex items-center justify-center text-gray-300 text-xs">
                                -
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={dateHeaders.length + 1}
                      className="py-8 text-center text-gray-400"
                    >
                      暂无设备，请先在系统设置中添加设备
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 待排产订单列表 */}
      {pendingOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">待排产订单</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <span className="font-medium">{order.orderNo}</span>
                    <span className="text-gray-500 ml-2">
                      {order.product.name}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <div>{order.quantity} 件</div>
                    <div className="text-gray-500">
                      预估工时: {estimateHours(order)}h
                    </div>
                    {order.dueDate && (
                      <div className="text-gray-500">
                        交期: {new Date(order.dueDate).toLocaleDateString("zh-CN")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 排产建议 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI排产建议</CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length > 0 ? (
            <div className="text-sm text-gray-600 space-y-3">
              <p>
                已为您安排 {schedules.length} 个工序的生产计划。
              </p>
              <p>
                排产策略：按订单优先级和交期排序，优先分配最早可用的设备。
              </p>
              {orderEstimates.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-gray-700 mb-2">预计完成时间：</p>
                  <div className="space-y-1">
                    {orderEstimates.map((est) => (
                      <div key={est.orderNo} className="flex items-center justify-between bg-green-50 rounded px-3 py-2">
                        <span>
                          {est.orderNo} <span className="text-gray-500">({est.productName})</span>
                        </span>
                        <span className="text-green-700 font-medium">
                          {new Date(est.estimatedCompletion).toLocaleString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-gray-500">
                提示：您可以点击"清除排产"后重新排产，或手动调整计划。
              </p>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              点击"AI排产"按钮获取智能排产建议
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
