export interface ResultData {
  championKr: string;
  kitingScore: number;
  cs: number;
  missedCS: number;
  gold: number;
  skillAccuracy: number;
  dodgeRate: number;
  damageDealt: number;
  damageTaken: number;
  survivalTime: number;
  grade: string;
  won: boolean;
}

export function computeGrade(cs: number, missed: number, kite: number, skill: number, dodge: number, surv: number): string {
  const total = cs + missed;
  const csRate = total > 0 ? (cs / total) * 100 : 0;
  const k = Math.min(100, kite);
  const s = Math.min(100, skill);
  const d = Math.min(100, dodge);
  const sv = Math.min(100, (surv / 120) * 100);
  const score = csRate * 0.3 + k * 0.2 + s * 0.15 + d * 0.2 + sv * 0.15;
  if (score >= 85) return "S";
  if (score >= 72) return "A";
  if (score >= 58) return "B";
  if (score >= 42) return "C";
  return "D";
}

export function drawResult(ctx: CanvasRenderingContext2D, w: number, h: number, d: ResultData) {
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(0, 0, w, h);

  const cw = 480, ch = 460;
  const cx = (w - cw) / 2, cy = (h - ch) / 2;
  ctx.fillStyle = "rgba(12, 28, 24, 0.97)";
  ctx.fillRect(cx, cy, cw, ch);
  ctx.strokeStyle = "rgba(180, 220, 200, 0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(cx, cy, cw, ch);

  ctx.fillStyle = "#e8f7ee";
  ctx.font = "bold 20px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(d.won ? "세션 종료" : "패배", cx + cw / 2, cy + 36);
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillStyle = "#8ccdb9";
  ctx.fillText(d.championKr, cx + cw / 2, cy + 54);

  ctx.fillStyle = gradeColor(d.grade);
  ctx.font = "bold 100px ui-monospace, monospace";
  ctx.fillText(d.grade, cx + cw / 2, cy + 170);

  ctx.font = "13px ui-monospace, monospace";
  const sx = cx + 50;
  let sy = cy + 220;
  const row = (label: string, val: string) => {
    ctx.fillStyle = "#8ccdb9";
    ctx.textAlign = "left";
    ctx.fillText(label, sx, sy);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.fillText(val, cx + cw - 50, sy);
    sy += 22;
  };
  const total = d.cs + d.missedCS;
  row("CS / 가능", `${d.cs} / ${total}`);
  row("골드", `${d.gold} g`);
  row("카이팅", `${d.kitingScore.toFixed(1)}%`);
  row("스킬 명중", `${d.skillAccuracy.toFixed(1)}%`);
  row("스킬샷 회피", `${d.dodgeRate.toFixed(1)}%`);
  row("가한 / 받은 데미지", `${Math.round(d.damageDealt)} / ${Math.round(d.damageTaken)}`);
  row("생존", `${d.survivalTime.toFixed(1)}s`);

  ctx.fillStyle = "#8ccdb9";
  ctx.textAlign = "center";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText("[R] 다시하기   [ESC] 챔피언 선택", cx + cw / 2, cy + ch - 18);
}

function gradeColor(g: string): string {
  return ({ S: "#ffd760", A: "#74e38a", B: "#6cc7ff", C: "#e0a050", D: "#e06060" } as Record<string, string>)[g] || "#fff";
}
