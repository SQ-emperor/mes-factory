"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  getProducts,
  createProduct,
  deleteProduct,
  getProcesses,
} from "@/lib/actions/settings";

interface Product {
  id: string;
  name: string;
  code: string;
  unit: string;
  processSteps: {
    id: string;
    process: { id: string; name: string };
    sortOrder: number;
  }[];
}

interface Process {
  id: string;
  name: string;
  code: string;
}

export default function ProductsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, processesData] = await Promise.all([
        getProducts(),
        getProcesses(),
      ]);
      setProducts(productsData as any);
      setProcesses(processesData);
    } catch (error) {
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await createProduct({
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        unit: formData.get("unit") as string,
        processIds: selectedProcessIds,
      });
      toast.success("产品创建成功");
      setDialogOpen(false);
      setSelectedProcessIds([]);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个产品吗？")) return;
    try {
      await deleteProduct(id);
      toast.success("已删除");
      await loadData();
    } catch (error) {
      toast.error("删除失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${tenantId}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">产品管理</h1>
          <p className="text-gray-500">管理产品目录和工序流程</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                添加产品
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加产品</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>产品名称 *</Label>
                <Input name="name" required placeholder="输入产品名称" />
              </div>
              <div className="space-y-2">
                <Label>产品编码 *</Label>
                <Input name="code" required placeholder="如 PROD-001" />
              </div>
              <div className="space-y-2">
                <Label>单位</Label>
                <Input name="unit" placeholder="件" defaultValue="件" />
              </div>
              <div className="space-y-2">
                <Label>工序流程（按顺序选择）</Label>
                <div className="flex flex-wrap gap-2">
                  {processes.map((process) => (
                    <Badge
                      key={process.id}
                      variant={
                        selectedProcessIds.includes(process.id)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        if (selectedProcessIds.includes(process.id)) {
                          setSelectedProcessIds(
                            selectedProcessIds.filter((id) => id !== process.id)
                          );
                        } else {
                          setSelectedProcessIds([
                            ...selectedProcessIds,
                            process.id,
                          ]);
                        }
                      }}
                    >
                      {process.name}
                    </Badge>
                  ))}
                </div>
                {processes.length === 0 && (
                  <p className="text-sm text-gray-500">
                    暂无工序，请先添加工序
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full">
                创建产品
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : products.length > 0 ? (
        <div className="space-y-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {product.code} | 单位: {product.unit}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {product.processSteps.map((step, index) => (
                        <span key={step.id} className="text-xs">
                          {index > 0 && <span className="text-gray-300 mx-1">→</span>}
                          <Badge variant="secondary" className="text-xs">
                            {step.process.name}
                          </Badge>
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            暂无产品，点击上方按钮添加
          </CardContent>
        </Card>
      )}
    </div>
  );
}
