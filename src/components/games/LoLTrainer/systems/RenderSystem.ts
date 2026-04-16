import { Champion } from "../entities/Champion";
import { Minion } from "../entities/Minion";
import { Projectile, Telegraph } from "../entities/Projectile";
import { MoveClick } from "./InputSystem";
import { LAYOUT, DamageNumber } from "../entities/types";

interface Tile { x: number; y: number; w: number; h: number; shade: number; }
interface Tree { x: number; y: number; r: number; }
interface Bush { x: number; y: number; r: number; }

export class RenderSystem {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  tiles: Tile[] = [];
  trees: Tree[] = [];
  bushes: Bush[] = [];
  bgImage: HTMLImageElement | null = null;
  champImages: Record<string, HTMLImageElement> = {};

  constructor(ctx: CanvasRenderingContext2D, w: number, h: number, bgImage?: HTMLImageElement | null, champImages?: Record<string, HTMLImageElement>) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    this.bgImage = bgImage ?? null;
    this.champImages = champImages ?? {};
    ctx.imageSmoothingEnabled = true;
    this.generate();
  }

  private rand(seed: number) {
    let s = seed;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  private generate() {
    const r = this.rand(7);
    const laneTop = 200;
    const laneBot = 440;
    // lane tiles 40x40 irregular
    for (let x = 0; x < this.w; x += 40) {
      for (let y = laneTop; y < laneBot; y += 40) {
        this.tiles.push({
          x: x + (r() - 0.5) * 4,
          y: y + (r() - 0.5) * 4,
          w: 40 + (r() - 0.5) * 5,
          h: 40 + (r() - 0.5) * 5,
          shade: r(),
        });
      }
    }
    // trees in jungle top & bottom
    for (let i = 0; i < 22; i++) {
      this.trees.push({ x: r() * this.w, y: LAYOUT.hudTop + 4 + r() * (laneTop - LAYOUT.hudTop - 20), r: 14 + r() * 22 });
      this.trees.push({ x: r() * this.w, y: laneBot + 20 + r() * (this.h - laneBot - 40), r: 14 + r() * 22 });
    }
    // bushes
    for (let i = 0; i < 10; i++) {
      this.bushes.push({ x: r() * this.w, y: LAYOUT.hudTop + 20 + r() * (laneTop - LAYOUT.hudTop - 40), r: 22 + r() * 16 });
      this.bushes.push({ x: r() * this.w, y: laneBot + 40 + r() * (this.h - laneBot - 80), r: 22 + r() * 16 });
    }
  }

  drawBackground() {
    const { ctx, w, h } = this;
    if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      ctx.drawImage(this.bgImage, 0, 0, w, h);
      // subtle vignette darkening for game readability
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.7);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    // fallback procedural map
    const laneTop = 200;
    const laneBot = 440;

    // base
    ctx.fillStyle = "#1a2a1a";
    ctx.fillRect(0, 0, w, h);

    // jungle top + bottom dark
    ctx.fillStyle = "#111a11";
    ctx.fillRect(0, LAYOUT.hudTop, w, laneTop - LAYOUT.hudTop);
    ctx.fillRect(0, laneBot, w, h - laneBot);

    // trees
    for (const t of this.trees) {
      ctx.fillStyle = "#0d150d";
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(28, 50, 30, 0.6)";
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // lane background
    ctx.fillStyle = "#2a3a2a";
    ctx.fillRect(0, laneTop, w, laneBot - laneTop);

    // tiles
    for (const t of this.tiles) {
      const shade = t.shade < 0.3 ? "#2d3d2d" : t.shade < 0.6 ? "#334433" : "#3a4a3a";
      ctx.fillStyle = shade;
      ctx.fillRect(t.x, t.y, t.w - 1, t.h - 1);
      ctx.strokeStyle = "#1f2f1f";
      ctx.lineWidth = 1;
      ctx.strokeRect(t.x, t.y, t.w - 1, t.h - 1);
    }

    // lane edge lines
    ctx.strokeStyle = "rgba(60, 110, 70, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, laneTop); ctx.lineTo(w, laneTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, laneBot); ctx.lineTo(w, laneBot); ctx.stroke();

    // river diagonal strip (fallback only)
    ctx.strokeStyle = "rgba(100, 160, 220, 0.25)";
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.2);
    ctx.lineTo(w, h * 0.8);
    ctx.stroke();

    // bushes (translucent green blobs)
    for (const b of this.bushes) {
      const gg = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r);
      gg.addColorStop(0, "rgba(40, 90, 50, 0.55)");
      gg.addColorStop(1, "rgba(20, 50, 25, 0)");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // lane center lighting
    const lg = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 500);
    lg.addColorStop(0, "rgba(255, 230, 160, 0.1)");
    lg.addColorStop(1, "rgba(255, 230, 160, 0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, laneTop, w, laneBot - laneTop);
  }

  drawBushZones(zones: { x: number; y: number; w: number; h: number }[]) {
    const ctx = this.ctx;
    for (const b of zones) {
      ctx.fillStyle = "rgba(20, 60, 30, 0.18)";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(80, 200, 100, 0.25)";
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);
    }
  }

  drawBushOverlay(x: number, y: number, r: number) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, "rgba(60, 200, 100, 0.0)");
    g.addColorStop(0.6, "rgba(40, 170, 80, 0.35)");
    g.addColorStop(1, "rgba(20, 100, 50, 0.65)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#aef0c0";
    ctx.font = "bold 12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 3;
    ctx.strokeText("부쉬!", x, y - r - 6);
    ctx.fillText("부쉬!", x, y - r - 6);
  }

  drawTower(pos: { x: number; y: number }, ally: boolean, range: number, inDanger: boolean) {
    const ctx = this.ctx;
    // range circle
    ctx.strokeStyle = ally ? "rgba(120, 180, 255, 0.25)" : "rgba(255, 120, 120, 0.25)";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // tower marker
    ctx.fillStyle = ally ? "rgba(80, 140, 220, 0.6)" : "rgba(220, 80, 80, 0.6)";
    ctx.strokeStyle = ally ? "#9bc4ff" : "#ff9090";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("T", pos.x, pos.y);
    ctx.textBaseline = "alphabetic";
    if (inDanger && !ally) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 100);
      ctx.fillStyle = `rgba(255, 80, 80, ${0.6 + pulse * 0.3})`;
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.fillText("⚠ 타워 사거리!", pos.x, pos.y - 28);
    }
  }

  drawMoveClicks(clicks: MoveClick[]) {
    const ctx = this.ctx;
    for (const c of clicks) {
      const p = c.age / 0.55;
      const attack = c.kind === "attack";
      const ringCol = attack ? "255, 80, 80" : "110, 240, 170";
      for (let i = 0; i < 3; i++) {
        const rp = Math.max(0, p - i * 0.12);
        if (rp <= 0) continue;
        const r = 6 + rp * 28;
        ctx.strokeStyle = `rgba(${ringCol}, ${(1 - rp) * 0.85})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (attack) {
        ctx.strokeStyle = `rgba(255, 90, 90, ${1 - p})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(c.x - 7, c.y - 7); ctx.lineTo(c.x + 7, c.y + 7);
        ctx.moveTo(c.x - 7, c.y + 7); ctx.lineTo(c.x + 7, c.y - 7);
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(140, 255, 180, ${1 - p})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x - 4, c.y); ctx.lineTo(c.x + 4, c.y);
        ctx.moveTo(c.x, c.y - 4); ctx.lineTo(c.x, c.y + 4);
        ctx.stroke();
      }
    }
  }

  drawFlashTrail(ft: { from: { x: number; y: number }; to: { x: number; y: number }; life: number; maxLife: number }) {
    const ctx = this.ctx;
    const a = Math.max(0, ft.life / ft.maxLife);
    ctx.save();
    ctx.strokeStyle = `rgba(120, 200, 255, ${a * 0.7})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = "#60b4ff";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(ft.from.x, ft.from.y);
    ctx.lineTo(ft.to.x, ft.to.y);
    ctx.stroke();
    // ghost silhouette at origin
    ctx.fillStyle = `rgba(96, 180, 255, ${a * 0.35})`;
    ctx.beginPath();
    ctx.arc(ft.from.x, ft.from.y, 22, 0, Math.PI * 2);
    ctx.fill();
    // arrival flash
    ctx.strokeStyle = `rgba(160, 220, 255, ${a})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ft.to.x, ft.to.y, 30 * (1 - a) + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawTargetMarker(x: number, y: number, r: number, type: "champion" | "minion") {
    const ctx = this.ctx;
    const markerCol = type === "champion" ? "#ff4040" : "#ffffff";
    const outlineCol = "#ff9940";
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120);
    ctx.save();
    // orange outline
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = outlineCol;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, r + 6 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
    // bracket marker
    ctx.shadowBlur = 0;
    ctx.strokeStyle = markerCol;
    ctx.lineWidth = 2;
    const br = r + 12;
    const seg = 6;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + sx * br, y + sy * br - sy * seg);
      ctx.lineTo(x + sx * br, y + sy * br);
      ctx.lineTo(x + sx * br - sx * seg, y + sy * br);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawAttackCursor(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#ff5a5a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ff5a5a";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "bold 10px ui-monospace, monospace";
    ctx.fillStyle = "#ff9090";
    ctx.textAlign = "left";
    ctx.fillText("A", x + 18, y + 4);
    ctx.restore();
  }

  drawControlGuide(alpha: number, flashKey: "D" | "F" = "F") {
    const ctx = this.ctx;
    const lines = [
      "우클릭: 이동",
      "A + 좌클릭: 어택무브",
      "S: 정지",
      `${flashKey}: 플래시`,
      "Q: 스킬",
    ];
    const pad = 12;
    const lh = 20;
    const boxW = 220;
    const boxH = lines.length * lh + pad * 2;
    const x = 20, y = this.h / 2 - boxH / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(6, 14, 12, 0.85)";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = "rgba(120, 200, 180, 0.75)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.fillStyle = "#cfe8e0";
    ctx.font = "bold 13px ui-monospace, monospace";
    ctx.textAlign = "left";
    lines.forEach((ln, i) => ctx.fillText(ln, x + pad, y + pad + lh * (i + 1) - 6));
    ctx.restore();
  }

  drawAimLine(from: { x: number; y: number }, to: { x: number; y: number }, rangePx: number, color: string, ready: boolean) {
    const ctx = this.ctx;
    const dx = to.x - from.x, dy = to.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    const len = Math.min(rangePx, d);
    const ex = from.x + (dx / d) * len;
    const ey = from.y + (dy / d) * len;
    ctx.strokeStyle = ready ? color : "rgba(120, 120, 120, 0.4)";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  drawChampion(champ: Champion, time: number, enemy = false) {
    const ctx = this.ctx;
    const { primary, accent, bodyGlow } = champ.stats;
    const bodyColor = enemy ? "#b8324b" : primary;
    const accentColor = enemy ? "#ff9750" : accent;
    const glowColor = enemy ? "#ff8090" : bodyGlow;

    // range indicator (only for player)
    if (!enemy) {
      ctx.strokeStyle = `rgba(200, 230, 255, 0.06)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(champ.pos.x, champ.pos.y, champ.attackRangePx, 0, Math.PI * 2);
      ctx.stroke();
    }

    // trail
    const n = Math.min(3, champ.trail.length);
    for (let i = 0; i < n; i++) {
      const idx = champ.trail.length - 1 - Math.floor((i + 1) * (champ.trail.length / (n + 1)));
      const p = champ.trail[idx]; if (!p) continue;
      this.diamondBody(p.x, p.y, champ.facing, champ.radius * 0.85, bodyColor, accentColor, true);
    }

    // selection ring
    ctx.save();
    ctx.translate(champ.pos.x, champ.pos.y + champ.radius * 0.55);
    ctx.rotate(time * 0.8 * (enemy ? -1 : 1));
    ctx.strokeStyle = this.hexA(accentColor, 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const x = Math.cos(a) * champ.radius * 1.4;
      const y = Math.sin(a) * champ.radius * 0.56;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = this.hexA(bodyColor, 0.18);
    ctx.beginPath();
    ctx.ellipse(0, 0, champ.radius * 1.3, champ.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // glow
    const g = ctx.createRadialGradient(champ.pos.x, champ.pos.y, 2, champ.pos.x, champ.pos.y, champ.radius * 2.2);
    g.addColorStop(0, this.hexA(glowColor, 0.4));
    g.addColorStop(1, this.hexA(glowColor, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(champ.pos.x, champ.pos.y, champ.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    const img = this.champImages[champ.stats.id];
    if (img && img.complete && img.naturalWidth > 0) {
      const size = 60;
      const flip = Math.cos(champ.facing) < 0;
      ctx.save();
      ctx.translate(champ.pos.x, champ.pos.y);
      if (flip) ctx.scale(-1, 1);
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 18;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
      ctx.shadowBlur = 0;
    } else {
      this.diamondBody(champ.pos.x, champ.pos.y, champ.facing, champ.radius, bodyColor, accentColor, false);
    }

    // AA cooldown ring
    const cdMax = champ.currentAttackInterval();
    const cdP = 1 - Math.max(0, champ.attackCooldown) / cdMax;
    ctx.strokeStyle = cdP >= 1 ? "rgba(255, 220, 120, 0.95)" : "rgba(220, 220, 220, 0.6)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(champ.pos.x, champ.pos.y, champ.radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdP);
    ctx.stroke();

    // HP bar over head
    this.drawHpBar(
      champ.pos.x, champ.pos.y - champ.radius - 12, 60,
      champ.hp / champ.maxHp,
      enemy ? "#ff5050" : "#4dd27a"
    );

    if (!enemy && champ.stats.id === "caitlyn") {
      const dots = 6;
      const cy = champ.pos.y - champ.radius - 22;
      const cx = champ.pos.x - ((dots - 1) / 2) * 8;
      for (let i = 0; i < dots; i++) {
        ctx.fillStyle = i < champ.headshotStack ? accentColor : "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.arc(cx + i * 8, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private diamondBody(x: number, y: number, facing: number, r: number, primary: string, accent: string, ghost: boolean) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(facing);
    const grad = ctx.createLinearGradient(-r, 0, r, 0);
    grad.addColorStop(0, this.darker(primary, 0.4));
    grad.addColorStop(0.5, primary);
    grad.addColorStop(1, this.lighter(primary, 0.35));
    ctx.fillStyle = ghost ? this.hexA(primary, 0.2) : grad;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 1.1, 0);
    ctx.lineTo(0, -r * 0.7);
    ctx.lineTo(-r * 0.8, 0);
    ctx.lineTo(0, r * 0.7);
    ctx.closePath();
    ctx.fill();
    if (!ghost) ctx.stroke();
    if (!ghost) {
      ctx.fillStyle = this.hexA(accent, 0.6);
      ctx.beginPath();
      ctx.arc(-r * 0.2, r * 0.3, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.hexA(accent, 0.9);
      ctx.beginPath();
      ctx.arc(r * 1.05, 0, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMinion(m: Minion) {
    if (m.dead) return;
    const ctx = this.ctx;
    const ally = m.team === "ally";
    const base = ally ? "#4488ff" : "#ff4444";
    const dark = ally ? "#1a3a7a" : "#5a1010";
    const hpColor = "#4dd27a";
    const bob = Math.sin(m.bob) * 2;
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(m.pos.x, m.pos.y + m.radius * 0.7, m.radius * 0.9, m.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(m.pos.x, m.pos.y + bob);
    const grad = ctx.createRadialGradient(0, -3, 2, 0, 0, m.radius);
    grad.addColorStop(0, this.lighter(base, 0.3));
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.strokeStyle = this.hexA(base, 0.9);
    ctx.lineWidth = 1.5;
    if (m.kind === "melee") {
      // hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const x = Math.cos(a) * m.radius;
        const y = Math.sin(a) * m.radius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else {
      // diamond (caster)
      ctx.beginPath();
      ctx.moveTo(0, -m.radius);
      ctx.lineTo(m.radius, 0);
      ctx.lineTo(0, m.radius);
      ctx.lineTo(-m.radius, 0);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    // eye
    ctx.fillStyle = ally ? "#cfe0ff" : "#ffdcdc";
    ctx.fillRect(-2, -3, 4, 2);
    ctx.restore();

    // low HP: flash yellow border around minion
    if (!ally && m.isLowHp()) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 80);
      ctx.strokeStyle = `rgba(255, 220, 80, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.pos.x, m.pos.y, m.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HP bar with low-HP flash
    const flash = !ally && m.isLowHp() ? (Math.sin(performance.now() / 90) > 0 ? "#ffdd44" : hpColor) : hpColor;
    this.drawHpBar(m.pos.x, m.pos.y - m.radius - 8, 28, m.hp / m.maxHp, flash);
  }

  drawProjectile(p: Projectile) {
    const ctx = this.ctx;

    // trail (fading ghosts)
    if (p.trail.length > 0) {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const a = (i + 1) / p.trail.length;
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.width * 0.6 * a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.angle);

    const glow = (col: string, blur: number) => { ctx.shadowColor = col; ctx.shadowBlur = blur; };

    if (p.tag === "ezreal-q") {
      glow("#4488ff", 25);
      const g = ctx.createLinearGradient(-40, 0, 40, 0);
      g.addColorStop(0, "rgba(68, 136, 255, 0)");
      g.addColorStop(0.5, "#4488ff");
      g.addColorStop(0.8, "#ffd24a");
      g.addColorStop(1, "#ffffff");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, Math.max(16, p.width * 1.8), 0, 0, Math.PI * 2);
      ctx.fill();
      // star head
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(28, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.tag === "cait-q") {
      glow("#00ffff", 20);
      const g = ctx.createLinearGradient(-60, 0, 60, 0);
      g.addColorStop(0, "rgba(0, 255, 255, 0)");
      g.addColorStop(0.5, p.color);
      g.addColorStop(1, "#ffffff");
      ctx.fillStyle = g;
      const ww = Math.max(24, p.width * 2);
      ctx.fillRect(-50, -ww / 2, 100, ww);
      // bright head
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(40, 0, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.tag === "jhin-w") {
      glow("#ff2244", 15);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(4, p.width);
      ctx.beginPath();
      ctx.moveTo(-60, 0); ctx.lineTo(60, 0);
      ctx.stroke();
      // rose petals
      ctx.fillStyle = "#ff88aa";
      for (let i = 0; i < 3; i++) {
        const dx = -20 - i * 14;
        ctx.save();
        ctx.translate(dx, Math.sin(performance.now() / 100 + i) * 3);
        ctx.rotate(performance.now() / 300 + i);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(50, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.tag === "basic-cait-headshot" || p.tag === "basic-jhin-crit") {
      glow(p.color, 25);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, Math.max(10, p.width), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, Math.max(5, p.width * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      glow(p.color, 15);
      const r = Math.max(6, p.width);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  drawParticle(p: { x: number; y: number; life: number; maxLife: number; color: string; size: number }) {
    const ctx = this.ctx;
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawVignette(intensity: number) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.3, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.7);
    g.addColorStop(0, "rgba(255, 0, 0, 0)");
    g.addColorStop(1, `rgba(220, 30, 30, ${0.55 * intensity})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  drawTelegraph(t: Telegraph) {
    const ctx = this.ctx;
    const ang = Math.atan2(t.dir.y, t.dir.x);
    const charge = 1 - t.chargeTime / t.chargeTimeMax;
    ctx.save();
    ctx.translate(t.origin.x, t.origin.y);
    ctx.rotate(ang);
    ctx.fillStyle = `rgba(255, 70, 70, ${0.18 + 0.12 * Math.sin(performance.now() / 80)})`;
    ctx.fillRect(0, -t.width / 2, t.length, t.width);
    ctx.fillStyle = "rgba(255, 60, 60, 0.5)";
    ctx.fillRect(0, -t.width / 2, t.length * charge, t.width);
    ctx.strokeStyle = "rgba(255, 100, 100, 0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -t.width / 2, t.length, t.width);
    ctx.restore();
  }

  drawHitFlash(x: number, y: number, t: number) {
    const ctx = this.ctx;
    const p = t / 0.25;
    ctx.strokeStyle = `rgba(255, 240, 200, ${p})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 20 * (1 - p), 0, Math.PI * 2);
    ctx.stroke();
  }

  drawHpBar(x: number, y: number, w: number, frac: number, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x - w / 2, y, w, 4);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), 4);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2, y, w, 4);
  }

  drawFlash(amount: number) {
    if (amount <= 0) return;
    this.ctx.fillStyle = `rgba(200, 30, 30, ${amount * 0.6})`;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  drawDamageNumbers(nums: DamageNumber[]) {
    const ctx = this.ctx;
    for (const n of nums) {
      const p = 1 - n.life / n.maxLife;
      ctx.fillStyle = n.color;
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.font = `bold ${n.size}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 3;
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.globalAlpha = 1;
  }

  private hexA(hex: string, a: number): string {
    const { r, g, b } = this.parseHex(hex);
    return `rgba(${r},${g},${b},${a})`;
  }
  private darker(hex: string, f: number): string {
    const { r, g, b } = this.parseHex(hex);
    return `rgb(${Math.round(r * (1 - f))},${Math.round(g * (1 - f))},${Math.round(b * (1 - f))})`;
  }
  private lighter(hex: string, f: number): string {
    const { r, g, b } = this.parseHex(hex);
    return `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`;
  }
  private parseHex(hex: string) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }
}
