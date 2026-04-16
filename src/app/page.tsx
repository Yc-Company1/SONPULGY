"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { bestAim, loadSessions } from "@/utils/statsUtils";
import { AimResult, SessionRecord } from "@/types";

const modules = [
  { href: "/train/lol", title: "LoL 손풀기 트레이너", desc: "탑다운 맵에서 카이팅과 닷지를 동시에 연습하세요.", ready: true },
  { href: "/train/aim", title: "Aim Trainer", desc: "타겟을 빠르고 정확하게 클릭하세요.", ready: true },
  { href: "/train/dodge", title: "Dodge Trainer", desc: "발사체를 회피하며 생존 시간을 늘리세요.", ready: false },
  { href: "/train/reaction", title: "Reaction Test", desc: "색상이 변하는 순간 가장 빠르게 반응하세요.", ready: false },
  { href: "/train/timing", title: "Rhythm & Timing", desc: "타이밍에 맞춰 정확히 클릭하세요.", ready: false },
];

export default function DashboardPage() {
  const [best, setBest] = useState<AimResult | null>(null);
  const [recent, setRecent] = useState<SessionRecord[]>([]);

  useEffect(() => {
    setBest(bestAim());
    setRecent(loadSessions().slice(0, 5));
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      <section>
        <h2 className="text-2xl font-bold mb-1">훈련 대시보드</h2>
        <p className="text-gray-400 text-sm">오늘도 반응속도 한계를 밀어보세요.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.ready ? m.href : "#"}
            className={`card hover:border-accent transition relative ${
              m.ready ? "" : "opacity-60 pointer-events-none"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{m.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{m.desc}</p>
              </div>
              {!m.ready && (
                <span className="text-xs px-2 py-1 rounded bg-panel2 border border-border text-gray-400">
                  Coming Soon
                </span>
              )}
            </div>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3">Aim 최고 기록</h3>
          {best ? (
            <div className="grid grid-cols-3 gap-3">
              <Mini label="점수" value={best.score.toFixed(0)} />
              <Mini label="정확도" value={`${best.accuracy.toFixed(1)}%`} />
              <Mini label="반응속도" value={`${best.avgReactionMs.toFixed(0)}ms`} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">아직 기록이 없어요. Aim Trainer부터 시작해보세요.</p>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">최근 세션</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">기록 없음</p>
          ) : (
            <ul className="text-sm divide-y divide-border">
              {recent.map((s, i) => (
                <li key={i} className="py-2 flex justify-between">
                  <span className="text-gray-300">{s.module}</span>
                  <span className="text-gray-400 tabular-nums">
                    {new Date(s.date).toLocaleString()}
                  </span>
                  <span className="text-accent2 font-semibold">{s.score.toFixed(0)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel2 rounded-lg p-3 border border-border">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
