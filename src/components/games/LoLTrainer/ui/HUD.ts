import { Champion } from "../entities/Champion";
import { Minion } from "../entities/Minion";
import { EventLog } from "../entities/types";

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  champ: Champion,
  enemyChamp: Champion | null,
  allyMinions: Minion[],
  enemyMinions: Minion[],
  timeLeft: number,
  wave: number,
  gold: number,
  cs: number,
  missedCS: number,
  events: EventLog[],
  flashCooldown = 0,
  flashCooldownMax = 30,
  stopped = false,
  flashKey: "D" | "F" = "F"
) {
  // top bar
  ctx.fillStyle = "rgba(6, 14, 12, 0.92)";
  ctx.fillRect(0, 0, w, 46);
  ctx.strokeStyle = "rgba(120, 200, 180, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(w, 46); ctx.stroke();

  // left: player HP bar (big)
  drawChampHpBar(ctx, 14, 8, 250, 30, champ, "#4dd27a", "ally");

  // right: enemy HP bar
  if (enemyChamp) {
    drawChampHpBar(ctx, w - 14 - 250, 8, 250, 30, enemyChamp, "#ff5050", "enemy");
  }

  // center: timer + wave
  const mm = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const ss = Math.floor(timeLeft % 60).toString().padStart(2, "0");
  ctx.fillStyle = "#e3f3ea";
  ctx.font = "bold 18px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${mm}:${ss}`, w / 2, 22);
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillStyle = "#8ccdb9";
  ctx.fillText(`WAVE ${wave}`, w / 2, 38);

  // gold/cs just below top bar right
  const gx = w - 16;
  ctx.textAlign = "right";
  ctx.font = "bold 14px ui-monospace, monospace";
  ctx.fillStyle = "#ffd24a";
  ctx.fillText(`💰 ${gold}`, gx, 62);
  ctx.fillStyle = "#cfe8e0";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText(`CS ${cs} / ${cs + missedCS}`, gx, 78);

  // bottom: skill slots — Q / F / S
  const slotSize = 54;
  const slotY = h - slotSize - 20;
  const totalW = slotSize * 3 + 20;
  const baseX = (w - totalW) / 2;

  const sP = 1 - Math.max(0, champ.skillCooldown) / champ.stats.skill.cooldown;
  drawSlot(ctx, baseX, slotY, slotSize, champ.stats.skill.key, champ.stats.skill.color, sP, champ.stats.skill.name);

  const fx = baseX + slotSize + 10;
  const fP = 1 - Math.max(0, flashCooldown) / flashCooldownMax;
  const fLabel = flashCooldown > 0 ? `${Math.ceil(flashCooldown)}s` : null;
  drawSlot(ctx, fx, slotY, slotSize, flashKey, "#60b4ff", fP, "FLASH", fLabel);

  const stx = baseX + (slotSize + 10) * 2;
  drawSlot(ctx, stx, slotY, slotSize, "S", stopped ? "#ffd24a" : "#b3d5c6", stopped ? 1 : 0.35, stopped ? "STOP" : "정지(S)");

  // Jhin ammo
  if (champ.stats.id === "jhin") {
    const ax = baseX + slotSize * 2 + 24, ay = slotY + 12;
    for (let i = 0; i < 4; i++) {
      const filled = i < champ.ammo;
      ctx.fillStyle = filled ? champ.stats.accent : "rgba(255,255,255,0.18)";
      ctx.strokeStyle = champ.stats.primary;
      ctx.lineWidth = 1.5;
      const x = ax + i * 16, y = ay;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + 10, y);
      ctx.lineTo(x + 10, y + 12); ctx.lineTo(x + 5, y + 18); ctx.lineTo(x, y + 12);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    if (champ.reloading) {
      ctx.fillStyle = "rgba(255,180,80,0.9)";
      const rp = 1 - champ.reloadTimeLeft / 2.5;
      ctx.fillRect(ax, ay + 22, 72 * rp, 3);
    }
  }
  // Caitlyn headshot bar
  if (champ.stats.id === "caitlyn") {
    const ax = baseX - 80, ay = slotY + 16;
    ctx.fillStyle = "#8ccdb9";
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText("HEADSHOT", ax, ay - 8);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i < champ.headshotStack ? champ.stats.accent : "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.arc(ax + 4 + i * 10, ay, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // event feed (left bottom)
  let ey = h - 24;
  ctx.textAlign = "left";
  ctx.font = "bold 12px ui-monospace, monospace";
  const visible = events.slice(0, 5);
  for (const e of visible) {
    const alpha = Math.min(1, e.life / 0.6);
    ctx.fillStyle = e.color;
    ctx.globalAlpha = alpha;
    ctx.fillText(e.text, 20, ey);
    ey -= 16;
  }
  ctx.globalAlpha = 1;

  // minimap bottom-right
  drawMinimap(ctx, w, h, champ, enemyChamp, allyMinions, enemyMinions);
}

function drawChampHpBar(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, _h: number,
  champ: Champion, color: string, side: "ally" | "enemy"
) {
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(x, y, w, 18);
  const frac = champ.hp / champ.maxHp;
  const dynColor = frac > 0.5 ? color : frac > 0.25 ? "#e0c040" : "#e04040";
  ctx.fillStyle = dynColor;
  ctx.fillRect(x, y, w * frac, 18);
  ctx.strokeStyle = "rgba(200,255,220,0.55)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, 18);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(champ.hp)} / ${champ.maxHp}`, x + w / 2, y + 13);
  // name
  ctx.font = "bold 12px ui-monospace, monospace";
  ctx.fillStyle = side === "ally" ? champ.stats.primary : "#ff9090";
  ctx.textAlign = side === "ally" ? "left" : "right";
  ctx.fillText(`${champ.stats.kr} ${side === "enemy" ? "(적)" : ""}`, side === "ally" ? x : x + w, y + 34);
}

function drawSlot(
  ctx: CanvasRenderingContext2D, x: number, y: number, s: number,
  label: string, color: string, progress: number, sub?: string, overlayText?: string | null
) {
  ctx.fillStyle = "rgba(10, 24, 20, 0.92)";
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = "rgba(180, 220, 200, 0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, s, s);
  if (progress < 1 && progress >= 0) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x, y + s * progress, s, s * (1 - progress));
  }
  ctx.fillStyle = progress >= 1 ? color : "#a0a0a0";
  ctx.font = "bold 22px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + s / 2, y + s / 2);
  if (overlayText) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px ui-monospace, monospace";
    ctx.fillText(overlayText, x + s / 2, y + s / 2);
  }
  ctx.textBaseline = "alphabetic";
  if (sub) {
    ctx.fillStyle = "#8ccdb9";
    ctx.font = "9px ui-monospace, monospace";
    ctx.fillText(sub, x + s / 2, y + s + 12);
  }
}

function drawMinimap(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  champ: Champion, enemyChamp: Champion | null,
  allyMinions: Minion[], enemyMinions: Minion[]
) {
  const size = 130;
  const mx = w - size - 16, my = h - size - 16;
  // background with rough rift shape
  ctx.fillStyle = "#1a2a1a";
  ctx.fillRect(mx, my, size, size);
  // blue corner
  ctx.fillStyle = "#1d3d5a";
  ctx.beginPath();
  ctx.moveTo(mx, my + size);
  ctx.lineTo(mx + size * 0.45, my + size);
  ctx.lineTo(mx, my + size * 0.55);
  ctx.closePath();
  ctx.fill();
  // red corner
  ctx.fillStyle = "#5a201d";
  ctx.beginPath();
  ctx.moveTo(mx + size, my);
  ctx.lineTo(mx + size * 0.55, my);
  ctx.lineTo(mx + size, my + size * 0.45);
  ctx.closePath();
  ctx.fill();
  // river diagonal
  ctx.strokeStyle = "#3a6080";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(mx, my); ctx.lineTo(mx + size, my + size);
  ctx.stroke();
  // lane midline
  ctx.strokeStyle = "rgba(200,180,120,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mx + 10, my + size - 10);
  ctx.lineTo(mx + size - 10, my + 10);
  ctx.stroke();
  // frame
  ctx.strokeStyle = "rgba(120,200,180,0.7)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx, my, size, size);

  // positions — scale world into a lane on map
  const scaleX = (x: number) => mx + 10 + (x / 960) * (size - 20);
  const scaleY = (_y: number) => my + size - 10 - (_y / 600) * (size - 20) + 12;
  for (const m of allyMinions) {
    if (m.dead) continue;
    ctx.fillStyle = "#4488ff";
    ctx.beginPath();
    ctx.arc(scaleX(m.pos.x), scaleY(m.pos.y), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const m of enemyMinions) {
    if (m.dead) continue;
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.arc(scaleX(m.pos.x), scaleY(m.pos.y), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (enemyChamp && enemyChamp.hp > 0) {
    ctx.fillStyle = "#ff6060";
    ctx.beginPath();
    ctx.arc(scaleX(enemyChamp.pos.x), scaleY(enemyChamp.pos.y), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#60b4ff";
  ctx.beginPath();
  ctx.arc(scaleX(champ.pos.x), scaleY(champ.pos.y), 4, 0, Math.PI * 2);
  ctx.fill();
}
