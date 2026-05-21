"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";
import {
  getSubordinates,
  updateSubordinate,
  type Subordinate,
} from "@/lib/actions/user";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  manager: "经理",
  worker: "工人",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  worker: "bg-gray-100 text-gray-700",
};

export default function UsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [users, setUsers] = useState<Subordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Subordinate | null>(null);
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const myRole = session?.user?.role;
  const ROLE_LEVEL: Record<string, number> = { admin: 3, manager: 2, worker: 1 };

  // 当前用户可设置的角色（低于自己的）
  const availableRoles = Object.entries(ROLE_LABELS).filter(
    ([role]) => (ROLE_LEVEL[myRole || ""] || 0) > (ROLE_LEVEL[role] || 0)
  );

  useEffect(() => {
    getSubordinates().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  // worker 无权限
  if (!loading && myRole === "worker") {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">人员管理</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">您没有管理人员的权限</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function openEdit(user: Subordinate) {
    setEditing(user);
    setEditName(user.name);
    setEditDept(user.department || "");
    setEditRole(user.role);
    setMessage("");
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setMessage("");

    const result = await updateSubordinate(editing.id, {
      name: editName,
      department: editDept,
      role: editRole !== editing.role ? editRole : undefined,
    });

    if (result?.error) {
      setMessage(result.error);
    } else {
      setMessage("保存成功");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editing.id
            ? { ...u, name: editName, department: editDept || null, role: editRole }
            : u
        )
      );
      setTimeout(() => setEditing(null), 800);
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">人员管理</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">没有可管理的人员</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-sm font-medium">
                    {user.name?.charAt(0) || user.phone.slice(-4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name}</span>
                      <Badge className={ROLE_COLORS[user.role]}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.phone}
                      {user.department ? ` · ${user.department}` : ""}
                    </p>
                  </div>
                </div>

                <Dialog
                  open={editing?.id === user.id}
                  onOpenChange={(open) => {
                    if (!open) setEditing(null);
                  }}
                >
                  <DialogTrigger
                    className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-gray-100 cursor-pointer"
                    onClick={() => openEdit(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>编辑 {user.name} 的信息</DialogTitle>
                      <DialogDescription>
                        修改 {user.name} 的姓名、部门和角色
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">姓名</Label>
                        <Input
                          id="edit-name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-dept">部门</Label>
                        <Input
                          id="edit-dept"
                          value={editDept}
                          onChange={(e) => setEditDept(e.target.value)}
                          placeholder="如：生产部、质检部"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>角色</Label>
                        <Select value={editRole} onValueChange={(v) => setEditRole(v || "")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map(([role, label]) => (
                              <SelectItem key={role} value={role}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {message && (
                        <p
                          className={`text-sm ${
                            message === "保存成功"
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {message}
                        </p>
                      )}
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        保存修改
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
