"use client";
import { AimResult } from "@/types";

interface Props {
  result: AimResult;
  previous?: AimResult | null;
  onRetry: () => void;
}

function Delta({ cur, prev, inverse = false }: { cur: number; prev?: number; inverse?: boolean }) {
  if (prev === undefined || prev === null) return <span className="text-gray-500 text-xs ml-1">—</span>;
  const diff = cur - prev;
  const better = inverse ? diff < 0 : diff > 0;
  if (Math.abs(diff) < 0.01) return <span className="text-gray-500 text-xs ml-1">＝</span>;
  return (
    <span className={`text-xs ml-1 ${better ? "text-good" : "text-bad"}`}>
      {better ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}
    </span>
  );
}

export default function ResultCard({ result, previous, onRetry }: Props) {
  return (
    <div className="card w-full max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">세션 결과</h2>
        <span className="text-xs text-gray-400">난이도 Lv.{result.difficulty}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="점수" value={result.score.toFixed(0)} delta={<Delta cur={result.score} prev={previous?.score} />} highlight />
        <Stat label="정확도" value={`${result.accuracy.toFixed(1)}%`} delta={<Delta cur={result.accuracy} prev={previous?.accuracy} />} />
        <Stat label="평균 반응속도" value={`${result.avgReactionMs.toFixed(0)}ms`} delta={<Delta cur={result.avgReactionMs} prev={previous?.avgReactionMs} inverse />} />
        <Stat label="CPS" value={result.cps.toFixed(2)} delta={<Delta cur={result.cps} prev={previous?.cps} />} />
        <Stat label="히트" value={String(result.hits)} />
        <Stat label="미스" value={String(result.misses)} />
      </div>
      <button className="btn btn-primary w-full mt-6" onClick={onRetry}>
        다시 하기
      </button>
    </div>
  );
}

function Stat({ label, value, delta, highlight }: { label: string; value: string; delta?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-accent/10 border border-accent/40" : "bg-panel2 border border-border"}`}>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-2xl font-bold mt-1">
        {value}
        {delta}
      </div>
    </div>
  );
}
