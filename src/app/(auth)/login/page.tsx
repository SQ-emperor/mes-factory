"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction } from "@/lib/actions/auth";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">厂里通</CardTitle>
          <CardDescription>轻量级制造执行系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => e.preventDefault()}
            onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }}
            className="space-y-4"
          >
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
              <Label htmlFor="code">验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  type="text"
                  placeholder="6位验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendCode}
                  disabled={sending || countdown > 0}
                  className="shrink-0"
                >
                  {countdown > 0 ? `${countdown}s` : sending ? "发送中" : "获取验证码"}
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="button"
              onClick={doLogin}
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-10 px-2.5 text-sm font-medium transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "登录中..." : "登录"}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              测试验证码：000000
            </p>

            <p className="text-sm text-gray-500 text-center">
              还没有账号？{" "}
              <a href="/register" className="text-primary hover:underline">
                注册账号
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
