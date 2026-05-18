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
import { Plus, Trash2, ArrowLeft, Factory } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { getMachines, createMachine, deleteMachine } from "@/lib/actions/settings";

interface Machine {
  id: string;
  name: string;
  code: string;
  type: string | null;
  isActive: boolean;
}

export default function MachinesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getMachines();
      setMachines(data);
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
      await createMachine({
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        type: formData.get("type") as string,
      });
      toast.success("设备创建成功");
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个设备吗？")) return;
    try {
      await deleteMachine(id);
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
          <h1 className="text-2xl font-bold">设备管理</h1>
          <p className="text-gray-500">管理生产设备和工位</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                添加设备
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加设备</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>设备名称 *</Label>
                <Input name="name" required placeholder="如：冲压机 01" />
              </div>
              <div className="space-y-2">
                <Label>设备编码 *</Label>
                <Input name="code" required placeholder="如：PRESS-01" />
              </div>
              <div className="space-y-2">
                <Label>设备类型</Label>
                <Input name="type" placeholder="如：冲压、焊接、喷涂" />
              </div>
              <Button type="submit" className="w-full">
                创建设备
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : machines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {machines.map((machine) => (
            <Card key={machine.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Factory className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{machine.name}</div>
                      <div className="text-sm text-gray-500">
                        {machine.code}
                        {machine.type && ` | ${machine.type}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(machine.id)}
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
            暂无设备，点击上方按钮添加
          </CardContent>
        </Card>
      )}
    </div>
  );
}
