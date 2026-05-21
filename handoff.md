# MES Factory — Handoff Notes

## Goal
中小工厂轻量级 MES 系统（厂里通），支持手机扫码报工。移动端可用是核心需求。

## Current State

| Feature | Status |
|---------|--------|
| 手机登录 | 已修复 |
| 头像显示 | 已修复 |
| 注册功能（默认worker） | 已完成 |
| 人员管理（上下级权限） | 已完成 |
| 摄像头扫码 | 开发环境 HTTP 不能用；Vercel 部署被墙 |
| 手动输入扫码 | 正常可用 |
| 选择订单报工（Task #14） | 已完成 |
| 角色权限控制（RBAC） | 已完成 |

## Server Access
- **本地开发**: `http://10.254.7.253:3000`（IP 可能因 DHCP 变化，每次查 `ipconfig`）
- **启动命令**: `npm run dev`（HTTP），`npm run dev:https`（自签名 HTTPS，手机浏览器会拦截）
- **HTTPS 自签名文件**: `certs/cert.pem` `certs/key.pem`，`server.mjs`

## Key Files Modified

| File | What Changed |
|------|-------------|
| `src/app/(auth)/login/page.tsx` | 用 `loginAction`（Server Action）替代 fetch；登录按钮改用原生 `<button>` |
| `src/app/(auth)/register/page.tsx` | 新建注册页，选工厂→默认worker→自动登录 |
| `src/lib/actions/auth.ts` | `loginAction` — server-side signIn |
| `src/lib/actions/register.ts` | `registerUser` + `getTenants` |
| `src/lib/db.ts` | Prisma 懒加载（Proxy），避免构建时 DATABASE_URL 未注入报错 |
| `src/lib/actions/user.ts` | 导入 `UserRole` from `@/generated/prisma/client` |
| `src/lib/actions/settings.ts` | `createUser`/`deleteUser` 加角色权限检查 |
| `src/hooks/use-scan.ts` | 摄像头错误提示区分 HTTP/HTTPS/权限 |
| `src/components/sw-register.tsx` | 开发模式下禁用 SW 注册并主动清理旧 SW |
| `src/components/layout/header.tsx` | 头像 fallback 逻辑（名称→手机号→"?""） |
| `src/middleware.ts` | 添加 `/register` `/api/login` 到 publicPaths |
| `next.config.ts` | 添加 `allowedDevOrigins`（当前IP: 10.254.7.253） |
| `public/sw.js` | 缓存版本 v6，不预缓存 `/login` |
| `package.json` | build 脚本改为 `prisma generate && next build` |
| `src/lib/actions/work-report.ts` | 新增 `getActiveOrdersForScan` — 返回活跃订单供手动选择报工 |
| `src/app/(tenant)/[tenantId]/scan/page.tsx` | 新增"选择订单" tab，工人无需二维码即可选订单报工 |
| `src/lib/role.ts` | **新建** — 共享角色工具（ROLE_LEVEL, requireMinRole, canManage） |
| `src/lib/actions/settings.ts` | 产品/工序/设备写操作加 requireMinRole 检查（创建: manager+, 删除: admin） |
| `src/lib/actions/order.ts` | createOrder/updateOrderStatus 加 requireMinRole("manager") |
| `src/lib/actions/schedule.ts` | autoSchedule/clearSchedule 加 requireMinRole("manager") |
| `src/lib/actions/quality.ts` | createQualityRecord 加 requireMinRole("manager") |
| `src/lib/actions/user.ts` | 改用共享 `@/lib/role` 模块 |
| `src/components/layout/sidebar.tsx` | 排产/质量/设置/人员 菜单项加 minRole="manager" |
| `src/components/layout/mobile-nav.tsx` | 新增排产/质检 tab，设置加 minRole="manager" |

## What Failed

1. **`signIn()` from next-auth/react on mobile** — 内部先 fetch `/api/auth/csrf`，手机端卡死。改用 Server Action。
2. **`fetch("/api/login")` on mobile** — API Route 返回 `NextResponse.json()` 时 signIn 的 cookie 未正确合并。改用 Server Action。
3. **Base UI Button touch events on mobile** — 按钮 `onClick` 不触发。改用原生 `<button>`。
4. **Service Worker 缓存旧 JS** — 开发模式下频繁改代码，SW 一直提供旧版本。在 dev 模式下完全禁用 SW。
5. **Vercel build: `Module not found: @/generated/prisma/client`** — Prisma client 被 gitignore，build 前没生成。加 `prisma generate` 到 build 脚本。
6. **Vercel build: `DATABASE_URL is not set`** — 构建时模块顶层 `createPrismaClient()` 立即执行。改为 Proxy 懒加载。
7. **Vercel Redeploy 一直用旧 commit** — "Redeploy" 按钮重复部署同一个 commit。需要 Create Deployment 或 push 新 commit 触发。
8. **自签名 HTTPS 证书** — 手机浏览器完全拦截，进不了页面。路走不通。
9. **Vercel `*.vercel.app` 域名** — 在国内被 GFW 墙，手机访问不了。

## Vercel Deployment
- **Repo**: `https://github.com/SQ-emperor/mes-factory`（master 分支）
- **域名**: `mes-factory-five.vercel.app`（国内被墙）
- **环境变量**: `DATABASE_URL`（Neon Postgres）和 `AUTH_SECRET` 已配置
- **数据库**: Neon PostgreSQL（`ep-polished-water-aoy710tv`），可能需要 IP 白名单配置

## Next Steps

1. **摄像头**: 买自定义域名绑到 Vercel 解决墙的问题，或者换国内托管平台（阿里云 SAE 等）
2. **产品选择问题**: Task #14 已完成 — 报工页新增"选择订单" tab，工人可手动浏览活跃订单并报工
3. **如 IP 再变**: 更新 `next.config.ts` 的 `allowedDevOrigins`，手机用新 IP 访问
4. **如头像又变"未知"**: 可能是 SW 又注册了，检查 `SwRegister` 是否正常，清除手机浏览器站点数据
