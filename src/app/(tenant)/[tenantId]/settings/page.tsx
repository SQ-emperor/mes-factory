import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Factory, Users, Cog, Package, QrCode } from "lucide-react";

const settingsItems = [
  {
    href: "settings/products",
    title: "产品管理",
    description: "管理产品目录和工序流程",
    icon: Package,
  },
  {
    href: "settings/processes",
    title: "工序设置",
    description: "定义生产工序和工时标准",
    icon: Cog,
  },
  {
    href: "settings/machines",
    title: "设备管理",
    description: "管理生产设备和工位",
    icon: Factory,
  },
  {
    href: "settings/users",
    title: "团队管理",
    description: "管理员工和角色权限",
    icon: Users,
  },
  {
    href: "settings/qrcodes",
    title: "二维码管理",
    description: "生成和打印工单/工位二维码",
    icon: QrCode,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-gray-500">配置工厂基础数据</p>
      </div>

      <div className="space-y-3">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-500">{item.description}</div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
