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

interface MobileNavProps {
  tenantId: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard },
  { href: "/orders", label: "订单", icon: ClipboardList },
  { href: "/scan", label: "报工", icon: QrCode },
  { href: "/schedule", label: "排产", icon: CalendarClock, minRole: "manager" },
  { href: "/quality", label: "质检", icon: ShieldCheck, minRole: "manager" },
  { href: "/users", label: "人员", icon: UsersRound, minRole: "manager" },
  { href: "/settings", label: "我的", icon: Settings, minRole: "manager" },
];

const ROLE_LEVEL: Record<string, number> = { admin: 3, manager: 2, worker: 1 };

export function MobileNav({ tenantId }: MobileNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userLevel = ROLE_LEVEL[session?.user?.role || ""] || 0;

  const visibleItems = navItems.filter(
    (item) => !item.minRole || userLevel >= (ROLE_LEVEL[item.minRole] || 0)
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {visibleItems.map((item) => {
          const href = `/${tenantId}${item.href}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors",
                isActive ? "text-blue-600" : "text-gray-500"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
