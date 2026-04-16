"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AimResult, Difficulty } from "@/types";
import { saveAimResult, loadAimHistory } from "@/utils/statsUtils";
import ResultCard from "@/components/ui/ResultCard";
import DifficultySelector from "@/components/ui/DifficultySelector";

const ROUND_MS = 30_000;
const TARGET_SIZE_BY_DIFF: Record<Difficulty, number> = { 1: 40, 2: 30, 3: 22, 4: 15, 5: 10 };
const TARGET_LIFETIME: Record<Difficulty, number> = { 1: 2200, 2: 1800, 3: 1500, 4: 1200, 5: 900 };

type Phase = "idle" | "playing" | "done";

interface Target {
  x: number;
  y: number;
  r: number;
  bornAt: number;
}

export default function AimTrainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [result, setResult] = useState<AimResult | null>(null);
  const [previous, setPrevious] = useState<AimResult | null>(null);

  const stateRef = useRef({
    target: null as Target | null,
    hits: 0,
    misses: 0,
    reactionSum: 0,
    startedAt: 0,
    width: 800,
    height: 500,
  });

  const spawnTarget = useCallback(() => {
    const s = stateRef.current;
    const r = TARGET_SIZE_BY_DIFF[difficulty];
    const pad = r + 8;
    s.target = {
      x: pad + Math.random() * (s.width - pad * 2),
      y: pad + Math.random() * (s.height - pad * 2),
      r,
      bornAt: performance.now(),
    };
  }, [difficulty]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = container.clientWidth;
    const h = Math.min(600, Math.max(400, Math.floor(w * 0.58)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    stateRef.current.width = w;
    stateRef.current.height = h;
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // render + game loop
  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const draw = () => {
      const s = stateRef.current;
      ctx.fillStyle = "#0f131b";
      ctx.fillRect(0, 0, s.width, s.height);

      // crosshair grid
      ctx.strokeStyle = "#1c2230";
      ctx.lineWidth = 1;
      for (let x = 0; x < s.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s.height);
        ctx.stroke();
      }
      for (let y = 0; y < s.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s.width, y);
        ctx.stroke();
      }

      // target
      if (phase === "playing" && s.target) {
        const now = performance.now();
        const lifetime = TARGET_LIFETIME[difficulty];
        const age = now - s.target.bornAt;
        if (age > lifetime) {
          s.misses++;
          spawnTarget();
        } else {
          const t = s.target;
          const pulse = 1 + Math.sin(now / 140) * 0.04;
          const grad = ctx.createRadialGradient(t.x, t.y, 2, t.x, t.y, t.r * pulse);
          grad.addColorStop(0, "#f87171");
          grad.addColorStop(0.6, "#ef4444");
          grad.addColorStop(1, "#7f1d1d");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r * 0.4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase, difficulty, spawnTarget]);

  // timer
  useEffect(() => {
    if (phase !== "playing") return;
    const tick = () => {
      const s = stateRef.current;
      const elapsed = performance.now() - s.startedAt;
      const left = Math.max(0, ROUND_MS - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        finish();
      }
    };
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    const s = stateRef.current;
    s.hits = 0;
    s.misses = 0;
    s.reactionSum = 0;
    s.startedAt = performance.now();
    s.target = null;
    setResult(null);
    setTimeLeft(ROUND_MS);
    setPhase("playing");
    spawnTarget();
  };

  const finish = () => {
    const s = stateRef.current;
    const total = s.hits + s.misses;
    const accuracy = total ? (s.hits / total) * 100 : 0;
    const avgReactionMs = s.hits ? s.reactionSum / s.hits : 0;
    const cps = s.hits / (ROUND_MS / 1000);
    const reactionScore = avgReactionMs ? Math.max(0, 1000 - avgReactionMs) : 0;
    const score =
      s.hits * 10 * difficulty +
      (accuracy / 100) * 200 +
      reactionScore * 0.3;

    const history = loadAimHistory();
    const prevSameDiff = history.find((h) => h.difficulty === difficulty) || null;
    setPrevious(prevSameDiff);

    const r: AimResult = {
      date: new Date().toISOString(),
      difficulty,
      accuracy,
      avgReactionMs,
      cps,
      hits: s.hits,
      misses: s.misses,
      score,
    };
    saveAimResult(r);
    setResult(r);
    setPhase("done");
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = stateRef.current;
    const t = s.target;
    if (t) {
      const dx = x - t.x;
      const dy = y - t.y;
      if (dx * dx + dy * dy <= t.r * t.r) {
        s.hits++;
        s.reactionSum += performance.now() - t.bornAt;
        spawnTarget();
        return;
      }
    }
    s.misses++;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={phase === "playing"} />
        <div className="flex items-center gap-4">
          <div className="text-sm">
            남은 시간{" "}
            <span className="text-accent2 font-bold tabular-nums">
              {(timeLeft / 1000).toFixed(1)}s
            </span>
          </div>
          {phase === "idle" && (
            <button className="btn btn-primary" onClick={start}>
              시작
            </button>
          )}
          {phase === "playing" && (
            <button className="btn" onClick={finish}>
              종료
            </button>
          )}
          {phase === "done" && (
            <button className="btn btn-primary" onClick={start}>
              다시 시작
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onMouseDown={handleClick}
          className="rounded-xl border border-border cursor-crosshair select-none block"
          style={{ touchAction: "none" }}
        />
      </div>

      {phase === "idle" && (
        <div className="card text-sm text-gray-300">
          <p className="font-semibold mb-1">Aim Trainer</p>
          <p className="text-gray-400">
            30초 동안 빨간 타겟을 최대한 많이 클릭하세요. 타겟은 일정 시간이 지나면 사라지며,
            놓칠 때마다 미스로 기록됩니다. 정확도 · 평균 반응속도 · CPS가 측정됩니다.
          </p>
        </div>
      )}

      {phase === "done" && result && (
        <ResultCard result={result} previous={previous} onRetry={start} />
      )}
    </div>
  );
}
