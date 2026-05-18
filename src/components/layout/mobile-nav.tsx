"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  QrCode,
  Settings,
} from "lucide-react";

interface MobileNavProps {
  tenantId: string;
}

const navItems = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard },
  { href: "/orders", label: "订单", icon: ClipboardList },
  { href: "/scan", label: "报工", icon: QrCode },
  { href: "/settings", label: "我的", icon: Settings },
];

export function MobileNav({ tenantId }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
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
