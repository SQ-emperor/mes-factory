"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateUserProfile } from "@/lib/actions/user";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  manager: "经理",
  worker: "工人",
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [department, setDept] = useState("");

  if (!session?.user) {
    return (
      <div className="max-w-lg mx-auto">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  const user = session.user;

  const handleEdit = () => {
    setName(user.name || "");
    setDept(user.department || "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("姓名不能为空");
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("department", department.trim());

    try {
      const result = await updateUserProfile(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        await updateSession();
        setEditing(false);
        toast.success("保存成功");
      }
    } catch (error) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">个人设置</h1>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            编辑
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>
            {editing ? "修改您的个人资料" : "查看您的个人资料"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>姓名</Label>
            {editing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名"
              />
            ) : (
              <Input value={user.name || ""} disabled className="bg-muted" />
            )}
          </div>

          <div className="space-y-2">
            <Label>手机号</Label>
            <Input value={user.phone} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>角色</Label>
            <Input
              value={ROLE_LABELS[user.role] || user.role}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>部门</Label>
            {editing ? (
              <Input
                value={department}
                onChange={(e) => setDept(e.target.value)}
                placeholder="请输入部门"
              />
            ) : (
              <Input value={user.department || "未设置"} disabled className="bg-muted" />
            )}
          </div>

          {editing && (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                取消
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
