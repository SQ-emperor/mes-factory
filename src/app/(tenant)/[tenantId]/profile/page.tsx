"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  manager: "经理",
  worker: "工人",
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="max-w-lg mx-auto">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">个人设置</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>查看您的个人资料</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>姓名</Label>
            <Input value={user.name || ""} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>手机号</Label>
            <Input value={user.phone} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>角色</Label>
            <Input value={ROLE_LABELS[user.role] || user.role} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>部门</Label>
            <Input value={user.department || "未设置"} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
