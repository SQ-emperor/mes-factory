"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  QrCode,
  CalendarClock,
  ShieldCheck,
  Settings,
} from "lucide-react";

interface SidebarProps {
  tenantId: string;
}

const navItems = [
  { href: "/dashboard", label: "数据看板", icon: LayoutDashboard },
  { href: "/orders", label: "订单管理", icon: ClipboardList },
  { href: "/scan", label: "扫码报工", icon: QrCode },
  { href: "/schedule", label: "排产计划", icon: CalendarClock },
  { href: "/quality", label: "质量管理", icon: ShieldCheck },
  { href: "/settings", label: "系统设置", icon: Settings },
];

export function Sidebar({ tenantId }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r">
      <div className="flex items-center h-16 px-6 border-b">
        <h1 className="text-xl font-bold">厂里通</h1>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
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
