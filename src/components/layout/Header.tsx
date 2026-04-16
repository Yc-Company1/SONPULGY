"use client";
import { useEffect, useState } from "react";
import { todayProgress } from "@/utils/statsUtils";

export default function Header() {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const t = todayProgress().reduce((s, x) => s + x.count, 0);
    setTotal(t);
  }, []);
  return (
    <header className="h-14 border-b border-border bg-panel flex items-center justify-between px-5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent flex items-center justify-center text-accent font-bold">
          G
        </div>
        <h1 className="font-semibold tracking-tight">GameMechanics Trainer</h1>
      </div>
      <div className="text-sm text-gray-400">
        오늘 훈련 <span className="text-accent2 font-semibold">{total}</span> 세션
      </div>
    </header>
  );
}
