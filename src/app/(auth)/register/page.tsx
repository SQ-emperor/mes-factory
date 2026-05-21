"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenants, registerUser } from "@/lib/actions/register";
import { loginAction } from "@/lib/actions/auth";

interface Tenant {
  id: string;
  name: string;
  industry: string | null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getTenants().then(setTenants).catch(() => setError("加载工厂列表失败"));
  }, []);

  const doRegister = async () => {
    if (!name || !phone || !tenantId) {
      setError("请填写完整信息");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await registerUser({ name, phone, tenantId });

      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        // 注册成功后直接用万能验证码自动登录
        const loginResult = await loginAction(phone, "000000");
        if (loginResult.error) {
          router.push("/login");
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch {
      setError("注册失败，请稍后重试");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">注册账号</CardTitle>
          <CardDescription>加入工厂，开始使用厂里通</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                placeholder="请输入姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={11}
              />
            </div>

            <div className="space-y-2">
              <Label>所属工厂</Label>
              <Select value={tenantId} onValueChange={(v) => setTenantId(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择工厂" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.industry ? ` (${t.industry})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="button"
              onClick={doRegister}
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-12 px-4 text-sm font-medium transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "注册中..." : "注册"}
            </button>

            <p className="text-sm text-gray-500 text-center">
              已有账号？{" "}
              <Link href="/login" className="text-primary hover:underline">
                去登录
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
