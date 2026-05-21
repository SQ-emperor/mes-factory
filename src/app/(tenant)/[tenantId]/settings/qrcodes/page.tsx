"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, QrCode, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { getOrders } from "@/lib/actions/order";
import { getMachines } from "@/lib/actions/settings";

interface QRItem {
  id: string;
  name: string;
  code: string;
  qrValue: string;
  qrImage: string;
}

export default function QRCodesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<"order" | "workstation">("order");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [orders, setOrders] = useState<{ id: string; orderNo: string; product: { name: string } }[]>([]);
  const [machines, setMachines] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatedQRCodes, setGeneratedQRCodes] = useState<QRItem[]>([]);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    setGeneratedQRCodes([]);

    try {
      if (tab === "order") {
        const data = await getOrders({ pageSize: 100 });
        setOrders(data.orders as any);
      } else {
        const data = await getMachines();
        setMachines(data);
      }
    } catch (error) {
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (tab === "order") {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    } else {
      setSelectedIds(new Set(machines.map((m) => m.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const generateQRCodes = async () => {
    if (selectedIds.size === 0) {
      toast.error("请先选择要生成二维码的项目");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab,
          ids: Array.from(selectedIds),
        }),
      });

      if (!res.ok) throw new Error("生成失败");

      const data = await res.json();
      const items: QRItem[] = data.qrcodes.map((qr: any) => ({
        id: qr.orderNo || qr.code,
        name: tab === "order" ? qr.orderNo : qr.name,
        code: qr.qrValue,
        qrValue: qr.qrValue,
        qrImage: qr.qrImage,
      }));

      setGeneratedQRCodes(items);
      toast.success(`已生成 ${items.length} 个二维码`);
    } catch (error) {
      toast.error("生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (generatedQRCodes.length === 0) return;
    window.print();
  };

  const downloadQR = (item: QRItem) => {
    const link = document.createElement("a");
    link.href = item.qrImage;
    link.download = `${item.name}-qrcode.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 no-print">
        <Link href={`/${tenantId}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">二维码管理</h1>
          <p className="text-gray-500">生成和打印工单/工位二维码</p>
        </div>
        {generatedQRCodes.length > 0 && (
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            打印二维码
          </Button>
        )}
      </div>

      {/* 选择区域 */}
      <div className="no-print">
        <div className="flex gap-2 mb-4">
          <Button
            variant={tab === "order" ? "default" : "outline"}
            onClick={() => setTab("order")}
          >
            订单二维码
          </Button>
          <Button
            variant={tab === "workstation" ? "default" : "outline"}
            onClick={() => setTab("workstation")}
          >
            工位二维码
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                选择{tab === "order" ? "订单" : "设备"}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  全选
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  清除
                </Button>
                <Button
                  size="sm"
                  onClick={generateQRCodes}
                  disabled={selectedIds.size === 0 || generating}
                >
                  <QrCode className="h-4 w-4 mr-1" />
                  {generating ? "生成中..." : `生成 (${selectedIds.size})`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : tab === "order" ? (
              orders.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => toggleSelect(order.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedIds.has(order.id)
                          ? "border-blue-500 bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium text-sm">{order.orderNo}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {order.product.name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">暂无订单</div>
              )
            ) : machines.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {machines.map((machine) => (
                  <div
                    key={machine.id}
                    onClick={() => toggleSelect(machine.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedIds.has(machine.id)
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium text-sm">{machine.name}</div>
                    <div className="text-xs text-gray-500">{machine.code}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">暂无设备</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 生成的二维码 */}
      {generatedQRCodes.length > 0 && (
        <div ref={printRef}>
          <h2 className="text-lg font-bold mb-4 no-print">生成的二维码</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
            {generatedQRCodes.map((item) => (
              <Card key={item.id} className="print:shadow-none print:border">
                <CardContent className="pt-4 text-center">
                  <img
                    src={item.qrImage}
                    alt={item.name}
                    className="w-32 h-32 mx-auto"
                  />
                  <div className="mt-2 font-bold text-sm">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1 break-all">
                    {item.code}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 no-print"
                    onClick={() => downloadQR(item)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    下载
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print\\:grid-cols-3 {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border {
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>
    </div>
  );
}
