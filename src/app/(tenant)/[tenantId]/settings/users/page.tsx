"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trash2, ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { getUsers, createUser, deleteUser } from "@/lib/actions/settings";

interface UserData {
  id: string;
  name: string;
  phone: string;
  role: string;
  department: string | null;
  isActive: boolean;
}

const roleLabels: Record<string, string> = {
  admin: "管理员",
  manager: "经理",
  worker: "工人",
};

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  worker: "bg-green-100 text-green-700",
};

export default function UsersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("worker");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
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
      await createUser({
        phone: formData.get("phone") as string,
        name: formData.get("name") as string,
        role: selectedRole as any,
        department: formData.get("department") as string,
      });
      toast.success("用户创建成功");
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个用户吗？")) return;
    try {
      await deleteUser(id);
      toast.success("已删除");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
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
          <h1 className="text-2xl font-bold">团队管理</h1>
          <p className="text-gray-500">管理员工和角色权限</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                添加成员
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加团队成员</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input name="name" required placeholder="输入姓名" />
              </div>
              <div className="space-y-2">
                <Label>手机号 *</Label>
                <Input
                  name="phone"
                  type="tel"
                  required
                  placeholder="输入手机号"
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label>角色 *</Label>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value || "")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">工人</SelectItem>
                    <SelectItem value="manager">经理</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>部门</Label>
                <Input name="department" placeholder="如：冲压车间" />
              </div>
              <Button type="submit" className="w-full">
                添加成员
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : users.length > 0 ? (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge className={roleColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                        {!user.isActive && (
                          <Badge variant="outline" className="text-gray-500">
                            已停用
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.phone}
                        {user.department && ` | ${user.department}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
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
            暂无团队成员，点击上方按钮添加
          </CardContent>
        </Card>
      )}
    </div>
  );
}
