"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  QrCode,
  CalendarClock,
  ShieldCheck,
  Settings,
  UsersRound,
} from "lucide-react";

interface SidebarProps {
  tenantId: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole?: string; // 最低角色要求
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "数据看板", icon: LayoutDashboard },
  { href: "/orders", label: "订单管理", icon: ClipboardList },
  { href: "/scan", label: "扫码报工", icon: QrCode },
  { href: "/schedule", label: "排产计划", icon: CalendarClock },
  { href: "/quality", label: "质量管理", icon: ShieldCheck },
  { href: "/users", label: "人员管理", icon: UsersRound, minRole: "manager" },
  { href: "/settings", label: "系统设置", icon: Settings },
];

const ROLE_LEVEL: Record<string, number> = { admin: 3, manager: 2, worker: 1 };

export function Sidebar({ tenantId }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userLevel = ROLE_LEVEL[session?.user?.role || ""] || 0;

  const visibleItems = navItems.filter(
    (item) => !item.minRole || userLevel >= (ROLE_LEVEL[item.minRole] || 0)
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r">
      <div className="flex items-center h-16 px-6 border-b">
        <h1 className="text-xl font-bold">厂里通</h1>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {visibleItems.map((item) => {
          const href = `/${tenantId}${item.href}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
