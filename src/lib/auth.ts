import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";

// 内存存储验证码（MVP阶段，生产环境用Redis）
const verificationCodes = new Map<string, { code: string; expires: number }>();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "phone",
      credentials: {
        phone: { label: "手机号", type: "text" },
        code: { label: "验证码", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;

        const phone = credentials.phone as string;
        const code = credentials.code as string;

        // 验证码检查（MVP阶段支持 "000000" 万能验证码）
        const stored = verificationCodes.get(phone);
        const isValid =
          code === "000000" || (stored && stored.code === code && Date.now() < stored.expires);

        if (!isValid) return null;

        // 清除已使用的验证码
        verificationCodes.delete(phone);

        // 查找或创建用户（需要tenantId，这里简化处理）
        // 实际使用时需要先选择工厂
        const user = await prisma.user.findFirst({
          where: { phone },
        });

        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          tenantId: user.tenantId,
          role: user.role,
          department: user.department,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.name = user.name;
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.phone = user.phone;
        token.department = user.department;
      }
      if (trigger === "update" && session) {
        token.name = session.user.name;
        token.department = session.user.department;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.name = token.name as string | null;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as string;
        session.user.phone = token.phone as string;
        session.user.department = token.department as string | null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 允许同源重定向
      if (url.startsWith("/")) return url;
      // 允许当前 host 的重定向（解决 0.0.0.0 问题）
      try {
        const urlObj = new URL(url);
        if (urlObj.port === new URL(baseUrl).port) {
          return url;
        }
      } catch {}
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  trustHost: true,
});

// 发送验证码（MVP阶段模拟）
export async function sendVerificationCode(phone: string): Promise<boolean> {
  const code = Math.random().toString().slice(2, 8).padStart(6, "0");
  verificationCodes.set(phone, {
    code,
    expires: Date.now() + 5 * 60 * 1000, // 5分钟有效
  });

  // MVP阶段：控制台输出验证码，方便测试
  console.log(`[SMS] 发送验证码到 ${phone}: ${code}`);
  return true;
}

// 类型扩展
declare module "next-auth" {
  interface User {
    tenantId?: string;
    role?: string;
    phone?: string;
    department?: string | null;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      tenantId: string;
      role: string;
      phone: string;
      department?: string | null;
    };
  }
}
