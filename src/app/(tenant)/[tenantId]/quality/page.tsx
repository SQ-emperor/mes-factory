import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getQualityStats, getQualityRecords } from "@/lib/actions/quality";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const typeLabels: Record<string, string> = {
  incoming: "来料检",
  inProcess: "过程检",
  finished: "成品检",
};

const resultColors: Record<string, string> = {
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  conditional: "bg-yellow-100 text-yellow-700",
};

const resultLabels: Record<string, string> = {
  pass: "合格",
  fail: "不合格",
  conditional: "让步接收",
};

export default async function QualityPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { tenantId } = await params;

  // 验证租户权限
  if (session.user.tenantId !== tenantId) {
    redirect(`/${session.user.tenantId}/quality`);
  }

  let stats, recordsData;
  try {
    [stats, recordsData] = await Promise.all([
      getQualityStats(),
      getQualityRecords({ pageSize: 10 }),
    ]);
  } catch (error) {
    stats = {
      passCount: 0,
      failCount: 0,
      conditionalCount: 0,
      totalRecords: 0,
      defectRate: 0,
      defectTypes: [],
    };
    recordsData = { records: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">质量管理</h1>
          <p className="text-gray-500">检验记录与质量分析</p>
        </div>
        <Link href={`/${tenantId}/quality/inspect`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建检验
          </Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.passCount}</div>
            <div className="text-sm text-gray-500">合格</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.failCount}</div>
            <div className="text-sm text-gray-500">不合格</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.defectRate}%</div>
            <div className="text-sm text-gray-500">不良率</div>
          </CardContent>
        </Card>
      </div>

      {/* 缺陷类型分布 */}
      {stats.defectTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">主要缺陷类型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.defectTypes.map((item, index) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600">
                    {index + 1}. {item.type}
                  </span>
                  <Badge variant="outline">{item.count} 次</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 检验记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近检验记录</CardTitle>
        </CardHeader>
        <CardContent>
          {recordsData.records.length > 0 ? (
            <div className="space-y-4">
              {recordsData.records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {record.order?.orderNo || "无订单"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[record.type]}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {record.inspector.name} -{" "}
                      {new Date(record.inspectedAt).toLocaleString("zh-CN")}
                    </div>
                    {record.defectType && (
                      <div className="text-xs text-red-500 mt-1">
                        缺陷: {record.defectType}
                        {record.defectCount && ` (${record.defectCount}件)`}
                      </div>
                    )}
                  </div>
                  <Badge className={resultColors[record.result]}>
                    {resultLabels[record.result]}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              暂无检验记录，点击上方按钮新建检验
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
