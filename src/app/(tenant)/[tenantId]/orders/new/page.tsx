"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createOrder, getProducts } from "@/lib/actions/order";
import { useParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  code: string;
  unit: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  // 加载产品列表
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        toast.error("加载产品列表失败");
      }
    }
    loadProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      await createOrder({
        productId: selectedProductId,
        quantity: parseFloat(formData.get("quantity") as string),
        dueDate: formData.get("dueDate") as string,
        priority: parseInt(formData.get("priority") as string) || 0,
        customerName: formData.get("customer") as string,
        notes: formData.get("notes") as string,
      });

      toast.success("订单创建成功");
      router.push(`/${tenantId}/orders`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${tenantId}/orders`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新建订单</h1>
          <p className="text-gray-500">创建新的生产订单</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">订单信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">产品 *</Label>
              <Select
                value={selectedProductId}
                onValueChange={(value) => setSelectedProductId(value || "")}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择产品" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {products.length === 0 && (
                <p className="text-sm text-gray-500">
                  暂无产品，请先在系统设置中添加产品
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">生产数量 *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  placeholder="输入数量"
                  min="1"
                  step="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">单位</Label>
                <Input
                  id="unit"
                  value={
                    products.find((p) => p.id === selectedProductId)?.unit || "件"
                  }
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">交期 *</Label>
                <Input id="dueDate" name="dueDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">优先级</Label>
                <Select name="priority" defaultValue="0">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">普通</SelectItem>
                    <SelectItem value="1">紧急</SelectItem>
                    <SelectItem value="2">非常紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">客户名称</Label>
              <Input id="customer" name="customer" placeholder="输入客户名称" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea id="notes" name="notes" placeholder="订单备注信息..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-4">
          <Link href={`/${tenantId}/orders`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              取消
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1"
            disabled={loading || !selectedProductId}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "保存中..." : "创建订单"}
          </Button>
        </div>
      </form>
    </div>
  );
}
