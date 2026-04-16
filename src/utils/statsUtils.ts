import { AimResult, ModuleId, SessionRecord } from "@/types";

const AIM_KEY = "gmt.aim.history";
const SESSION_KEY = "gmt.sessions";

export function loadAimHistory(): AimResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(AIM_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAimResult(r: AimResult) {
  if (typeof window === "undefined") return;
  const hist = loadAimHistory();
  hist.unshift(r);
  localStorage.setItem(AIM_KEY, JSON.stringify(hist.slice(0, 100)));
  pushSession({
    module: "aim",
    date: r.date,
    score: r.score,
    payload: {
      accuracy: r.accuracy,
      avgReactionMs: r.avgReactionMs,
      cps: r.cps,
      difficulty: r.difficulty,
    },
  });
}

export function pushSession(s: SessionRecord) {
  if (typeof window === "undefined") return;
  const all: SessionRecord[] = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
  all.unshift(s);
  localStorage.setItem(SESSION_KEY, JSON.stringify(all.slice(0, 500)));
}

export function loadSessions(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
  } catch {
    return [];
  }
}

export function bestAim(): AimResult | null {
  const h = loadAimHistory();
  if (!h.length) return null;
  return h.reduce((a, b) => (b.score > a.score ? b : a));
}

export function todayProgress(): { module: ModuleId; count: number }[] {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = loadSessions().filter((s) => s.date.slice(0, 10) === today);
  const modules: ModuleId[] = ["aim", "dodge", "reaction", "timing"];
  return modules.map((m) => ({
    module: m,
    count: sessions.filter((s) => s.module === m).length,
  }));
}
