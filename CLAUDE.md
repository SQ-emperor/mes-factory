# MES Factory（厂里通）

中小工厂轻量级 MES 系统，支持手机扫码报工。移动端可用是核心需求。

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript 5, Tailwind CSS 4
- NextAuth v5 (Credentials provider, JWT session, SMS verification)
- Prisma ORM + Neon PostgreSQL
- shadcn/ui + lucide-react
- html5-qrcode (摄像头扫码), qrcode (生成二维码)
- dexie (IndexedDB, 离线报工), sonner (toast)

## Project Structure

```
src/
  app/
    (auth)/login/          # 登录页
    (auth)/register/       # 注册页
    (tenant)/[tenantId]/   # 租户级路由（所有功能页）
      dashboard/           # 数据看板
      orders/              # 订单列表、详情、新建
      scan/                # 扫码/选择订单报工
      schedule/            # 排产计划（甘特图）
      quality/             # 质量管理、巡检
      users/               # 人员管理（下属）
      settings/            # 产品/工序/设备/人员/二维码管理
      profile/             # 个人设置
    api/auth/              # NextAuth
    api/qr/                # 二维码生成
    api/sms/               # 短信验证码
    api/sse/               # 实时看板推送
  components/
    layout/                # Header, Sidebar, MobileNav
    ui/                    # shadcn 组件
    order-status-button.tsx # 通用订单状态变更按钮
  hooks/
    use-scan.ts            # 摄像头扫码逻辑
    use-offline.ts         # 离线报工 (IndexedDB)
    use-sse.ts             # SSE 实时更新
  lib/
    actions/               # Server Actions（所有业务逻辑）
    auth.ts                # NextAuth 配置
    db.ts                  # Prisma 客户端（Proxy 懒加载）
    role.ts                # 角色权限工具
    qr.ts                  # 二维码生成/解析
    sse.ts                 # Server-Sent Events
prisma/
  schema.prisma            # 数据模型
```

## Database Models (Prisma)

核心关系：Tenant → Product → ProcessStep (junction) → Process，Order → OrderItem → ProcessStep，WorkReport → OrderItem

| 模型 | 用途 |
|------|------|
| Tenant | 多租户工厂 |
| User | 用户（admin/manager/worker 三种角色） |
| Product | 产品目录（name, code, unit） |
| Process | 工序定义 |
| ProcessStep | 产品-工序关联（sortOrder） |
| Machine | 设备/工位 |
| Order | 生产订单（status: pending→scheduled→inProgress→completed→shipped） |
| OrderItem | 订单工序项（per step） |
| WorkReport | 扫码报工记录 |
| QualityRecord | 质检记录 |
| ScheduleSlot | 排产计划（含 AI 生成标记） |
| QRCode | 二维码注册表 |

## Auth & Roles

NextAuth v5，JWT session，30 天有效期。登录用手机号 + SMS 验证码（MVP 阶段 `000000` 为通用验证码）。

Session 携带：`id, name, tenantId, role, phone, department`

### RBAC 权限矩阵

| 操作 | worker | manager | admin |
|------|--------|---------|-------|
| 看板/订单/报工 | 可以 | 可以 | 可以 |
| 创建订单/改状态 | 禁止 | 可以 | 可以 |
| 排产/质检 | 禁止 | 可以 | 可以 |
| 创建产品/工序/设备 | 禁止 | 可以 | 可以 |
| 删除产品/工序/设备 | 禁止 | 禁止 | 可以 |
| 人员管理 | 禁止 | 下属 | 全部 |

实现位置：
- `src/lib/role.ts` — 共享角色工具（ROLE_LEVEL, requireMinRole, canManage）
- Server Actions 中调用 `requireMinRole(session.user.role, "manager")` 等
- Sidebar/MobileNav 用 `minRole` 过滤菜单项

## Dev Server

```bash
npm run dev          # HTTP, http://localhost:3000
npm run dev:https    # 自签名 HTTPS（手机浏览器会拦截，不推荐）
```

手机端访问：手机和电脑连同一 WiFi，手机浏览器打开 `http://<电脑IP>:3000`（IP 用 `ipconfig` 查看）。

IP 变化时需要更新 `next.config.ts` 的 `allowedDevOrigins`，然后重启 dev server。

## Build & Deploy

```bash
npm run build        # prisma generate && next build
npm run db:generate  # Prisma 生成客户端
npm run db:migrate   # Prisma 数据库迁移
npm run db:seed      # 种子数据
```

构建需要环境变量 `DATABASE_URL`（Neon Postgres）和 `AUTH_SECRET`。

部署：GitHub → Vercel（master 分支自动部署）。注意 `*.vercel.app` 域名在国内被墙，需要自定义域名或换国内托管。

## Key Conventions

- Server Actions 放 `src/lib/actions/`，用 `"use server"` 指令
- 所有写操作必须先 `auth()` 验证登录，再 `requireMinRole()` 验证权限
- 页面级认证：Server Component 用 `auth()` + `redirect()`；Client Component 依赖 Server Action 的权限检查
- 租户隔离：所有查询加 `tenantId` 过滤
- `src/lib/db.ts` 用 Proxy 懒加载 Prisma 客户端，避免构建时 DATABASE_URL 未注入报错
- 二维码格式：`mes://{tenantId}/{type}/{refId}`（type: order/workstation/material/employee）
- 手机端按钮用原生 `<button>` 而非 Base UI Button（touch event 兼容问题）
- 开发模式下禁用 Service Worker（避免缓存旧 JS）

## Common Pitfalls

- `signIn()` from next-auth/react 在手机端不工作（fetch CSRF 卡死）→ 用 Server Action
- Base UI Button 在手机端 onClick 不触发 → 用原生 `<button>`
- Prisma client 被 gitignore，Vercel build 前必须 `prisma generate`
- Vercel "Redeploy" 会重复部署同一 commit，需要 Create Deployment 或 push 新 commit
- 客户端组件不要 import `@/lib/role`（会导致运行时模块解析异常）→ 角色常量本地定义
