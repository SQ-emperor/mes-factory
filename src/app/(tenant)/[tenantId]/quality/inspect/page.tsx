"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createQualityRecord, getOrdersForQuality } from "@/lib/actions/quality";

interface Order {
  id: string;
  orderNo: string;
  product: { name: string };
}

// 常见缺陷类型
const commonDefectTypes = [
  "尺寸超差",
  "表面划伤",
  "变形",
  "裂纹",
  "气泡",
  "色差",
  "焊接不良",
  "装配不良",
  "其他",
];

export default function QualityInspectPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [inspectType, setInspectType] = useState<string>("inProcess");
  const [result, setResult] = useState<string>("pass");
  const [defectType, setDefectType] = useState("");
  const [defectCount, setDefectCount] = useState("");
  const [notes, setNotes] = useState("");

  // 加载订单列表
  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await getOrdersForQuality();
        setOrders(data);
      } catch (error) {
        toast.error("加载订单列表失败");
      }
    }
    loadOrders();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createQualityRecord({
        orderId: selectedOrderId || undefined,
        type: inspectType as any,
        result: result as any,
        defectType: result === "fail" ? defectType : undefined,
        defectCount: result === "fail" ? parseInt(defectCount) || 0 : undefined,
        notes: notes || undefined,
      });

      toast.success("检验记录已保存");
      router.push(`/${tenantId}/quality`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${tenantId}/quality`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新建检验</h1>
          <p className="text-gray-500">记录质检结果</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">检验信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>检验类型 *</Label>
              <Select value={inspectType} onValueChange={(value) => setInspectType(value || "")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">来料检</SelectItem>
                  <SelectItem value="inProcess">过程检</SelectItem>
                  <SelectItem value="finished">成品检</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>关联订单</Label>
              <Select value={selectedOrderId} onValueChange={(value) => setSelectedOrderId(value || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="选择订单（可选）" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.orderNo} - {order.product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>检验结果 *</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={result === "pass" ? "default" : "outline"}
                  className="flex flex-col items-center py-6"
                  onClick={() => setResult("pass")}
                >
                  <CheckCircle2 className="h-8 w-8 mb-2" />
                  <span>合格</span>
                </Button>
                <Button
                  type="button"
                  variant={result === "conditional" ? "default" : "outline"}
                  className="flex flex-col items-center py-6"
                  onClick={() => setResult("conditional")}
                >
                  <CheckCircle2 className="h-8 w-8 mb-2 text-yellow-500" />
                  <span>让步接收</span>
                </Button>
                <Button
                  type="button"
                  variant={result === "fail" ? "destructive" : "outline"}
                  className="flex flex-col items-center py-6"
                  onClick={() => setResult("fail")}
                >
                  <XCircle className="h-8 w-8 mb-2" />
                  <span>不合格</span>
                </Button>
              </div>
            </div>

            {/* 不合格时显示缺陷信息 */}
            {result === "fail" && (
              <>
                <div className="space-y-2">
                  <Label>缺陷类型 *</Label>
                  <Select value={defectType} onValueChange={(value) => setDefectType(value || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择缺陷类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonDefectTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>缺陷数量</Label>
                  <Input
                    type="number"
                    placeholder="输入缺陷数量"
                    value={defectCount}
                    onChange={(e) => setDefectCount(e.target.value)}
                    min="0"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                placeholder="检验备注..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-4">
          <Link href={`/${tenantId}/quality`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              取消
            </Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "保存中..." : "保存检验记录"}
          </Button>
        </div>
      </form>
    </div>
  );
}
