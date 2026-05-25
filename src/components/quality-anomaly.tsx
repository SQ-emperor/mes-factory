"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { detectQualityAnomalies } from "@/lib/actions/ai";
import { Sparkles, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export function QualityAnomaly() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary?: string;
    anomalies?: string[];
  } | null>(null);
  const [error, setError] = useState("");

  const runDetection = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await detectQualityAnomalies();
      if (data.error) {
        setError(data.error);
      } else {
        setResult({ summary: data.summary, anomalies: data.anomalies });
      }
    } catch {
      setError("分析失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">AI 质量分析</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={runDetection}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                开始分析
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!result && !error && !loading && (
          <p className="text-sm text-gray-500 text-center py-4">
            点击"开始分析"，AI 将自动检测本周质量异常并给出建议
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.summary && (
              <p className="text-sm text-gray-700 leading-relaxed">
                {result.summary}
              </p>
            )}
            {result.anomalies && result.anomalies.length > 0 && (
              <div className="space-y-2">
                {result.anomalies.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm"
                  >
                    {item.includes("良好") || item.includes("正常") ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
