"use client";
import { useEffect, useState } from "react";
import { loadAimHistory } from "@/utils/statsUtils";
import { AimResult } from "@/types";

export default function StatsPage() {
  const [history, setHistory] = useState<AimResult[]>([]);
  useEffect(() => setHistory(loadAimHistory()), []);

  const last7 = history.filter((h) => {
    const d = new Date(h.date);
    return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold mb-4">통계</h2>
      <div className="card mb-6">
        <h3 className="font-semibold mb-2">최근 7일 Aim 세션</h3>
        <p className="text-sm text-gray-400">총 {last7.length}회</p>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-3">Aim 세션 히스토리</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">기록 없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-400 border-b border-border">
                <tr>
                  <th className="text-left py-2">날짜</th>
                  <th className="text-right">Lv</th>
                  <th className="text-right">점수</th>
                  <th className="text-right">정확도</th>
                  <th className="text-right">반응속도</th>
                  <th className="text-right">CPS</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map((h, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2">{new Date(h.date).toLocaleString()}</td>
                    <td className="text-right">{h.difficulty}</td>
                    <td className="text-right font-semibold text-accent2">{h.score.toFixed(0)}</td>
                    <td className="text-right">{h.accuracy.toFixed(1)}%</td>
                    <td className="text-right">{h.avgReactionMs.toFixed(0)}ms</td>
                    <td className="text-right">{h.cps.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
