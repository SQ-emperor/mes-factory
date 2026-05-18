"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { getProcesses, createProcess, deleteProcess } from "@/lib/actions/settings";

interface Process {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  standardTime: number | null;
  requiresMachine: boolean;
}

export default function ProcessesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getProcesses();
      setProcesses(data);
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
      await createProcess({
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        standardTime: formData.get("standardTime")
          ? parseFloat(formData.get("standardTime") as string)
          : undefined,
      });
      toast.success("工序创建成功");
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个工序吗？")) return;
    try {
      await deleteProcess(id);
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
          <h1 className="text-2xl font-bold">工序设置</h1>
          <p className="text-gray-500">定义生产工序和工时标准</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                添加工序
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加工序</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>工序名称 *</Label>
                <Input name="name" required placeholder="如：冲压、焊接、喷涂" />
              </div>
              <div className="space-y-2">
                <Label>工序编码 *</Label>
                <Input name="code" required placeholder="如：PRESS、WELD、PAINT" />
              </div>
              <div className="space-y-2">
                <Label>标准工时（秒/件）</Label>
                <Input
                  name="standardTime"
                  type="number"
                  placeholder="如：30"
                  min="0"
                  step="0.1"
                />
                <p className="text-xs text-gray-500">
                  每件产品的标准加工时间，用于排产计算
                </p>
              </div>
              <Button type="submit" className="w-full">
                创建工序
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : processes.length > 0 ? (
        <div className="space-y-3">
          {processes.map((process, index) => (
            <Card key={process.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">
                      {process.name}
                      <span className="text-sm text-gray-400 ml-2">
                        ({process.code})
                      </span>
                    </div>
                    {process.standardTime && (
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        标准工时: {process.standardTime} 秒/件
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(process.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            暂无工序，点击上方按钮添加
          </CardContent>
        </Card>
      )}
    </div>
  );
}
