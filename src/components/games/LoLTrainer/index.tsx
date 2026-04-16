"use client";
import { useEffect, useRef, useState } from "react";
import { GameEngine } from "./GameEngine";
import { ResultData } from "./ui/ResultScreen";
import { CHAMPIONS, ChampionId, ChampionStats, Difficulty } from "@/constants/champions";

type Screen = "select" | "play";

export default function LoLTrainer() {
  const [screen, setScreen] = useState<Screen>("select");
  const [champion, setChampion] = useState<ChampionStats | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [result, setResult] = useState<ResultData | null>(null);

  const startGame = (id: ChampionId) => {
    setChampion(CHAMPIONS[id]);
    setResult(null);
    setScreen("play");
  };

  const exitToSelect = () => {
    setScreen("select");
    setChampion(null);
    setResult(null);
  };

  if (screen === "select") {
    return (
      <SelectScreen
        difficulty={difficulty}
        onDifficulty={setDifficulty}
        onPick={startGame}
      />
    );
  }
  return (
    <PlayScreen
      champion={champion!}
      difficulty={difficulty}
      result={result}
      setResult={setResult}
      onExit={exitToSelect}
    />
  );
}

function SelectScreen({
  difficulty, onDifficulty, onPick,
}: {
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onPick: (id: ChampionId) => void;
}) {
  const ids: ChampionId[] = ["caitlyn", "ezreal", "jhin"];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">챔피언을 선택하세요</h3>
        <p className="text-sm text-gray-400">
          각 챔피언은 고유한 스탯과 스킬 메카닉을 가집니다. 실제 LoL과 유사한 수치로 구현되어 있어요.
        </p>
      </div>

      <div>
        <div className="text-sm text-gray-300 mb-2">난이도</div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              onClick={() => onDifficulty(d as Difficulty)}
              className={`w-12 h-12 rounded border text-sm font-bold transition ${
                difficulty === d
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-panel2 text-gray-300 hover:border-accent"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ids.map((id) => {
          const c = CHAMPIONS[id];
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              className="card hover:border-accent transition text-left relative overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${c.primary}, transparent 70%)`,
                }}
              />
              <div className="relative">
                <ChampionIcon stats={c} />
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg" style={{ color: c.primary }}>
                      {c.kr}
                    </div>
                    <div className="text-xs text-gray-400">{c.name}</div>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded border"
                    style={{ borderColor: c.accent, color: c.accent }}
                  >
                    {c.difficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-3">{c.description}</p>
                <div className="text-xs text-gray-500 mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                  <div>이동속도 <span className="text-gray-300">{c.moveSpeed}</span></div>
                  <div>사거리 <span className="text-gray-300">{c.attackRange}</span></div>
                  <div>공속 <span className="text-gray-300">{c.attackSpeed.toFixed(2)}</span></div>
                  <div>{c.skill.key}스킬 <span className="text-gray-300">{c.skill.name}</span></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-gray-500">
        조작: 마우스 클릭(이동), Q/W(스킬). 2분 세션, 30초마다 미니언 웨이브.
      </div>
    </div>
  );
}

function ChampionIcon({ stats }: { stats: ChampionStats }) {
  return (
    <svg viewBox="-50 -50 100 100" className="w-20 h-20">
      <defs>
        <radialGradient id={`g-${stats.id}`}>
          <stop offset="0" stopColor={stats.bodyGlow} />
          <stop offset="1" stopColor={stats.primary} />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="26" rx="28" ry="8" fill={stats.accent} opacity="0.3" />
      <polygon
        points="32,0 0,-26 -24,0 0,26"
        fill={`url(#g-${stats.id})`}
        stroke={stats.accent}
        strokeWidth="2"
      />
      <circle cx="-5" cy="10" r="6" fill={stats.accent} opacity="0.6" />
      <circle cx="30" cy="0" r="4" fill={stats.accent} />
    </svg>
  );
}

function PlayScreen({
  champion, difficulty, result, setResult, onExit,
}: {
  champion: ChampionStats;
  difficulty: Difficulty;
  result: ResultData | null;
  setResult: (r: ResultData | null) => void;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const champImgsRef = useRef<Record<string, HTMLImageElement>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flashKey, setFlashKey] = useState<"D" | "F">("F");

  useEffect(() => {
    try {
      const v = localStorage.getItem("lol-trainer-flash-key");
      if (v === "D" || v === "F") setFlashKey(v);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("lol-trainer-flash-key", flashKey); } catch {}
    engineRef.current?.setFlashKey(flashKey);
  }, [flashKey]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; };
    img.onerror = () => { imgRef.current = null; };
    img.src = "/images/map-bg.png";
    const ids = ["caitlyn", "ezreal", "jhin"];
    let loaded = 0;
    const imgs: Record<string, HTMLImageElement> = {};
    const done = () => { if (++loaded >= ids.length + 1) setImgReady(true); };
    img.addEventListener("load", done);
    img.addEventListener("error", done);
    ids.forEach((id) => {
      const ci = new Image();
      ci.onload = () => { imgs[id] = ci; done(); };
      ci.onerror = () => { done(); };
      ci.src = `/images/champions/${id}.png`;
    });
    champImgsRef.current = imgs;
  }, []);

  useEffect(() => {
    if (!imgReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas, champion, difficulty, {
      onEnd: (r) => setResult(r),
      onExit,
    }, imgRef.current, champImgsRef.current);
    engine.setFlashKey(flashKey);
    engineRef.current = engine;
    engine.start();
    return () => { engine.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champion, difficulty, imgReady]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm">
            <span className="font-bold" style={{ color: champion.primary }}>{champion.kr}</span>
            <span className="text-gray-500"> · 난이도 {difficulty}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            우클릭: 이동 · A+좌클릭: 어택무브 · S: 정지 · {flashKey}: 플래시 · {champion.skill.key}: {champion.skill.name}
          </p>
        </div>
        <div className="flex gap-2">
          {result && (
            <button
              onClick={() => { engineRef.current?.restart(); setResult(null); }}
              className="px-3 py-1.5 text-sm rounded bg-accent hover:opacity-90"
            >
              다시하기 (R)
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1.5 text-sm rounded bg-panel2 border border-border hover:border-accent"
            title="키 설정"
          >
            ⚙️ 설정
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1.5 text-sm rounded bg-panel2 border border-border hover:border-accent"
          >
            챔피언 선택
          </button>
        </div>
      </div>
      <div className="relative rounded-lg overflow-hidden border border-border bg-black">
        <canvas
          ref={canvasRef}
          width={929}
          height={465}
          className="block w-full h-auto select-none cursor-crosshair"
          onContextMenu={(e) => e.preventDefault()}
        />
        {settingsOpen && (
          <SettingsPanel
            flashKey={flashKey}
            onFlashKey={setFlashKey}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function SettingsPanel({
  flashKey, onFlashKey, onClose,
}: {
  flashKey: "D" | "F";
  onFlashKey: (k: "D" | "F") => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-10"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg shadow-2xl"
        style={{ background: "#1a1a2e", border: "1px solid #3a3a5a", minWidth: 340, padding: 20, color: "#e3e3f0" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold">키 설정</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-black/30 text-gray-300"
            aria-label="닫기"
          >✕</button>
        </div>

        <div className="mb-3 text-sm text-gray-400">점멸 (Flash) 키 설정</div>
        <div className="flex gap-4 mb-4">
          {(["D", "F"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="flash-key"
                checked={flashKey === k}
                onChange={() => onFlashKey(k)}
              />
              <span className="font-mono font-bold">{k}키</span>
              {k === "F" && <span className="text-xs text-gray-500">(기본값)</span>}
            </label>
          ))}
        </div>

        <div className="mt-6 space-y-2 text-xs text-gray-500">
          <div className="opacity-60">공격이동 키: A (추후 변경 가능)</div>
          <div className="opacity-60">정지 키: S (추후 변경 가능)</div>
        </div>
      </div>
    </div>
  );
}
