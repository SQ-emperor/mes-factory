"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  List,
  ChevronRight,
  Search,
} from "lucide-react";
import { useParams } from "next/navigation";
import { getOrderScanInfo, submitWorkReport, getActiveOrdersForScan } from "@/lib/actions/work-report";
import { suggestQuantity } from "@/lib/actions/ai";
import { useScan } from "@/hooks/use-scan";
import { useOffline } from "@/hooks/use-offline";
import { Sparkles } from "lucide-react";

interface ScanResult {
  orderId: string;
  orderNo: string;
  productName: string;
  currentStep: {
    id: string;
    name: string;
    sortOrder: number;
    quantityDone: number;
    quantityDefect: number;
  } | null;
  totalSteps: number;
  completedSteps: number;
  quantity: number;
  isCompleted: boolean;
}

export default function ScanPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const { isScanning, scanResult: scannedCode, error: scanError, startScan, reset: resetScan, manualInput, isWeChat } = useScan();
  const { isOnline, pendingCount, syncing, saveOffline, syncNow } = useOffline();

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [defectCount, setDefectCount] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState<{
    orderNo: string;
    quantity: number;
    stepName: string;
    offline?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"scan" | "select">("scan");
  const [activeOrders, setActiveOrders] = useState<Awaited<
    ReturnType<typeof getActiveOrdersForScan>
  > | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<{ suggested: number; reason: string } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const fetchActiveOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const orders = await getActiveOrdersForScan();
      setActiveOrders(orders);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载订单失败");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // 处理扫码结果
  useEffect(() => {
    if (scannedCode) {
      handleScanResult(scannedCode);
    }
  }, [scannedCode]);

  // 处理扫码/手动输入
  const handleScanResult = async (code: string) => {
    if (!code.trim()) return;

    setLoading(true);
    try {
      // 构建二维码格式
      let qrCode = code;
      if (!code.startsWith("mes://")) {
        toast.error("无效的二维码格式，应以 mes:// 开头");
        setLoading(false);
        return;
      }

      const result = await getOrderScanInfo(qrCode);

      if (result.isCompleted) {
        toast.info("该订单所有工序已完成");
      }
      setScanResult(result);
      setSubmitted(false);

      // AI 建议数量
      if (result.orderId && !result.isCompleted) {
        setLoadingSuggestion(true);
        try {
          const suggestion = await suggestQuantity(result.orderId);
          if (suggestion.suggested) {
            setAiSuggestion({ suggested: suggestion.suggested, reason: suggestion.reason || "" });
          }
        } catch {
          // 静默失败
        } finally {
          setLoadingSuggestion(false);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "扫码失败");
    } finally {
      setLoading(false);
    }
  };

  // 手动输入处理
  const handleManualInput = () => {
    if (!manualCode.trim()) {
      toast.error("请输入二维码内容");
      return;
    }
    handleScanResult(manualCode);
    setManualCode("");
  };

  // 从订单列表选择
  const handleSelectOrder = (orderId: string) => {
    const qrCode = `mes://${tenantId}/order/${orderId}`;
    handleScanResult(qrCode);
    setMode("scan");
  };

  // 提交报工
  const handleSubmit = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      toast.error("请输入有效的完成数量");
      return;
    }

    if (!scanResult) return;

    setSubmitting(true);

    try {
      if (!isOnline) {
        // 离线保存到 IndexedDB
        const result = await saveOffline({
          qrCode: `mes://${tenantId}/order/${scanResult.orderId}`,
          quantity: parseInt(quantity),
          defectCount: parseInt(defectCount) || 0,
        });

        setSubmittedInfo({
          orderNo: scanResult.orderNo,
          quantity: parseInt(quantity),
          stepName: scanResult.currentStep?.name || "",
          offline: true,
        });
        setSubmitted(true);
        toast.success(`已加入离线队列（${result.pendingCount} 条待同步）`);
      } else {
        // 在线提交
        const result = await submitWorkReport({
          qrCode: `mes://${tenantId}/order/${scanResult.orderId}`,
          quantity: parseInt(quantity),
          defectCount: parseInt(defectCount) || 0,
        });

        setSubmittedInfo({
          orderNo: scanResult.orderNo,
          quantity: parseInt(quantity),
          stepName: result.currentStep,
        });
        setSubmitted(true);
        toast.success("报工成功!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 重置
  const handleReset = () => {
    resetScan();
    setScanResult(null);
    setQuantity("");
    setDefectCount("0");
    setSubmitted(false);
    setSubmittedInfo(null);
    setManualCode("");
    setAiSuggestion(null);
  };

  // 手动同步
  const handleSync = async () => {
    const result = await syncNow();
    if (result) {
      toast.success(`同步完成：成功 ${result.success} 条，失败 ${result.failed} 条`);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">扫码报工</h1>
          <p className="text-gray-500">
            {isWeChat ? "微信内扫码" : "扫描工单二维码上报进度"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className={isOnline ? "text-green-600" : "text-red-600"}>
            {isOnline ? "在线" : "离线"}
          </span>
        </div>
      </div>

      {/* 离线提示 */}
      {!isOnline && pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                离线模式，{pendingCount} 条记录待同步
              </span>
            </div>
            {isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
                同步
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 模式切换 */}
      {!scanResult && !submitted && (
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
              mode === "scan"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
            onClick={() => setMode("scan")}
          >
            <QrCode className="h-4 w-4" />
            扫码报工
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
              mode === "select"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
            onClick={() => {
              setMode("select");
              if (!activeOrders) fetchActiveOrders();
            }}
          >
            <List className="h-4 w-4" />
            选择订单
          </button>
        </div>
      )}

      {/* 扫码区域 */}
      {!scanResult && !submitted && mode === "scan" && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-6">
              <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                <QrCode className="h-12 w-12 text-gray-400" />
              </div>
              <div>
                <h3 className="font-medium">扫描工单二维码</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {isWeChat
                    ? "点击下方按钮使用微信扫一扫"
                    : "对准工单上的二维码进行扫描"}
                </p>
              </div>

              {/* 摄像头扫描区域 */}
              <div id="qr-reader" className="w-full max-w-xs mx-auto" />

              <div className="space-y-3">
                {scanError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    {scanError}
                  </div>
                )}

                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-12 px-4 text-sm font-medium transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => startScan("qr-reader")}
                  disabled={isScanning || loading}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {isScanning
                    ? "扫描中..."
                    : isWeChat
                      ? "打开微信扫码"
                      : "打开摄像头扫描"}
                </button>

                <div className="text-sm text-gray-400">或</div>

                <div className="flex gap-2">
                  <Input
                    placeholder="手动输入二维码内容 mes://..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleManualInput();
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleManualInput}
                    disabled={!manualCode.trim() || loading}
                  >
                    确认
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 选择订单列表 */}
      {!scanResult && !submitted && mode === "select" && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索订单号或产品名称..."
                className="pl-10"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>

            {loadingOrders ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : !activeOrders || activeOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无进行中的订单
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {activeOrders
                  .filter(
                    (o) =>
                      !orderSearch ||
                      o.orderNo.toLowerCase().includes(orderSearch.toLowerCase()) ||
                      o.productName.toLowerCase().includes(orderSearch.toLowerCase())
                  )
                  .map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      className="w-full text-left p-4 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-between"
                      onClick={() => handleSelectOrder(order.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{order.orderNo}</span>
                          <Badge
                            className={
                              order.status === "inProgress"
                                ? "bg-yellow-100 text-yellow-700"
                                : order.status === "scheduled"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                            }
                          >
                            {order.status === "inProgress"
                              ? "生产中"
                              : order.status === "scheduled"
                                ? "已排产"
                                : "待排产"}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {order.productName} · {order.quantity}件
                        </div>
                        {order.currentStep && (
                          <div className="text-xs text-gray-400 mt-1">
                            当前工序: {order.currentStep.name}
                            {order.currentStep.quantityDone > 0 &&
                              ` (已完成 ${order.currentStep.quantityDone})`}
                          </div>
                        )}
                        {order.customerName && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate">
                            客户: {order.customerName}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0 ml-2" />
                    </button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 扫码结果 & 报工表单 */}
      {scanResult && !submitted && !scanResult.isCompleted && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{scanResult.orderNo}</CardTitle>
              <Badge>{scanResult.productName}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 工序信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">当前工序</span>
                <span className="text-sm text-gray-500">
                  {scanResult.currentStep?.sortOrder}/{scanResult.totalSteps}
                </span>
              </div>
              <div className="text-xl font-bold">
                {scanResult.currentStep?.name}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                已完成: {scanResult.currentStep?.quantityDone}/{scanResult.quantity} 件
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${((scanResult.currentStep?.quantityDone || 0) / scanResult.quantity) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* 报工数量 */}
            <div className="space-y-2">
              <Label htmlFor="quantity">本次完成数量 *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="输入完成数量"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="text-lg h-12"
              />

              {/* AI 建议 */}
              {loadingSuggestion && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  AI 正在分析历史数据...
                </div>
              )}
              {aiSuggestion && !loadingSuggestion && (
                <button
                  type="button"
                  onClick={() => setQuantity(String(aiSuggestion.suggested))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-300 transition-colors text-left"
                >
                  <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-700">
                        AI 建议: {aiSuggestion.suggested} 件
                      </span>
                      <span className="text-xs text-blue-400">点击填入</span>
                    </div>
                    {aiSuggestion.reason && (
                      <p className="text-xs text-blue-500 mt-0.5 truncate">
                        {aiSuggestion.reason}
                      </p>
                    )}
                  </div>
                </button>
              )}
            </div>

            {/* 不良品数量 */}
            <div className="space-y-2">
              <Label htmlFor="defect">不良品数量</Label>
              <Input
                id="defect"
                type="number"
                placeholder="0"
                value={defectCount}
                onChange={(e) => setDefectCount(e.target.value)}
                min="0"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                返回
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting || !quantity || parseInt(quantity) <= 0}
              >
                {submitting ? "提交中..." : "确认报工"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 订单已完成 */}
      {scanResult && scanResult.isCompleted && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">订单已完成</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {scanResult.orderNo} 所有工序已完成
                </p>
              </div>
              <Button onClick={handleReset} className="w-full">
                扫描其他订单
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 提交成功 */}
      {submitted && submittedInfo && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  {submittedInfo.offline ? "已保存到本地" : "报工成功!"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {submittedInfo.orderNo} - {submittedInfo.stepName} - {submittedInfo.quantity} 件
                </p>
                {submittedInfo.offline && (
                  <p className="text-xs text-yellow-600 mt-1">
                    网络恢复后将自动同步
                  </p>
                )}
              </div>
              <Button onClick={handleReset} className="w-full">
                继续扫码
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
