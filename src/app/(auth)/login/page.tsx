"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/lib/actions/auth";
import { Factory, Phone, KeyRound, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "CredentialsSignin") {
      setError("验证码错误或手机号未注册");
    }
  }, []);

  const sendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (res.ok) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        const data = await res.json();
        setError(data.error || "发送失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSending(false);
    }
  };

  const doLogin = async () => {
    if (!phone || !code) {
      setError("请填写完整信息");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginAction(phone, code);

      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("登录失败，请检查网络");
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

        {/* 登录卡片 */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800">欢迎回来</h2>
            <p className="text-sm text-gray-500 mt-1">登录您的账号</p>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "Enter") doLogin();
            }}
            className="space-y-4"
          >
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

            {/* 验证码 */}
            <div className="space-y-1.5">
              <label htmlFor="code" className="text-sm font-medium text-gray-700">
                验证码
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="code"
                    type="text"
                    placeholder="6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    className="pl-10 h-11"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={sending || countdown > 0}
                  className="shrink-0 h-11 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {countdown > 0 ? `${countdown}s` : sending ? "发送中" : "获取验证码"}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="button"
              onClick={doLogin}
              disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  登录
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* 测试提示 */}
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-blue-600">测试验证码：000000</p>
            </div>
          </form>

          {/* 注册链接 */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              还没有账号？{" "}
              <a href="/register" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                注册账号
              </a>
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
