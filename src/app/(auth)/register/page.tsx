"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTenants, registerUser } from "@/lib/actions/register";
import { loginAction } from "@/lib/actions/auth";
import {
  Factory,
  User,
  Phone,
  Building2,
  ArrowRight,
  Loader2,
  ArrowLeft,
} from "lucide-react";

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
    getTenants()
      .then(setTenants)
      .catch(() => setError("加载工厂列表失败"));
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
            <Factory className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">厂里通</h1>
          <p className="text-blue-100 mt-1 text-sm">轻量级制造执行系统</p>
        </div>

        {/* 注册卡片 */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800">创建账号</h2>
            <p className="text-sm text-gray-500 mt-1">加入工厂，开始使用</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {/* 姓名 */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                姓名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  placeholder="请输入姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* 手机号 */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                手机号
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={11}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* 所属工厂 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">所属工厂</label>
              <Select
                value={tenantId}
                onValueChange={(v) => setTenantId(v || "")}
              >
                <SelectTrigger className="h-11">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="请选择工厂" />
                  </div>
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

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 注册按钮 */}
            <button
              type="button"
              onClick={doRegister}
              disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                <>
                  注册
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* 登录链接 */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              已有账号？{" "}
              <Link
                href="/login"
                className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
              >
                去登录
              </Link>
            </p>
          </div>
        </div>

        {/* 底部 */}
        <p className="text-center text-blue-100/60 text-xs mt-6">
          &copy; {new Date().getFullYear()} 厂里通 MES
        </p>
      </div>
    </div>
  );
}
