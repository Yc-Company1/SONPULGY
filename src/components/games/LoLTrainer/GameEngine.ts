import { Champion } from "./entities/Champion";
import { Minion, MinionKind } from "./entities/Minion";
import { Projectile, Telegraph } from "./entities/Projectile";
import { InputSystem } from "./systems/InputSystem";
import { CombatSystem } from "./systems/CombatSystem";
import { RenderSystem } from "./systems/RenderSystem";
import { drawHUD } from "./ui/HUD";
import { drawResult, computeGrade, ResultData } from "./ui/ResultScreen";
import { ChampionStats, CHAMPIONS, DIFFICULTY_MULT, Difficulty } from "@/constants/champions";
import { Team, LAYOUT, DamageNumber, EventLog } from "./entities/types";

export interface EngineCallbacks {
  onEnd: (r: ResultData) => void;
  onExit: () => void;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  stats: ChampionStats;
  difficulty: Difficulty;
  diffMult: typeof DIFFICULTY_MULT[Difficulty];
  champ: Champion;
  enemyChamp: Champion;
  allyMinions: Minion[] = [];
  enemyMinions: Minion[] = [];
  projectiles: Projectile[] = [];
  telegraphs: Telegraph[] = [];
  damageNumbers: DamageNumber[] = [];
  events: EventLog[] = [];
  particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }[] = [];
  shakeTimer = 0;
  shakeAmount = 0;
  vignetteTimer = 0;
  attackMovePoint: { x: number; y: number } | null = null;
  attackMoveTarget: { ref: Champion | Minion; type: "champion" | "minion" } | null = null;
  stopped = false;
  attackReadyFlash = 0; // 공격 가능 신호 링 반짝임 타이머
  wasAttackOnCooldown = false; // 쿨타임 완료 감지용
  flashCooldownMax = 30;
  flashCooldown = 0;
  flashTrail: { from: { x: number; y: number }; to: { x: number; y: number }; life: number; maxLife: number } | null = null;
  flashRangePx = 65; // Canvas 929px 기준 ~7% (LoL 400 unit 환산)
  flashKey: "D" | "F" = "F";
  input: InputSystem;
  combat: CombatSystem;
  render: RenderSystem;
  sessionDuration = 120;
  elapsed = 0;
  lastTs = 0;
  rafId = 0;
  wave = 0;
  nextWaveAt = 0;
  ended = false;
  result: ResultData | null = null;
  cb: EngineCallbacks;
  keyHandler: (e: KeyboardEvent) => void;
  enemySkillCharging: { dir: { x: number; y: number }; timeLeft: number } | null = null;

  constructor(canvas: HTMLCanvasElement, stats: ChampionStats, difficulty: Difficulty, cb: EngineCallbacks, bgImage?: HTMLImageElement | null, champImages?: Record<string, HTMLImageElement>) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = true;
    this.w = LAYOUT.width;
    this.h = LAYOUT.height;
    this.stats = stats;
    this.difficulty = difficulty;
    this.diffMult = DIFFICULTY_MULT[difficulty];
    this.cb = cb;
    this.champ = new Champion(stats, LAYOUT.playerStart.x, LAYOUT.playerStart.y, "ally", false);
    // pick an enemy champion (different if possible)
    const enemyId = stats.id === "caitlyn" ? CHAMPIONS.ezreal : stats.id === "ezreal" ? CHAMPIONS.jhin : CHAMPIONS.caitlyn;
    this.enemyChamp = new Champion(enemyId, LAYOUT.enemyStart.x, LAYOUT.enemyStart.y, "enemy", true);
    this.render = new RenderSystem(this.ctx, this.w, this.h, bgImage ?? null, champImages ?? {});
    this.combat = new CombatSystem({
      pushDamageNumber: (d) => this.damageNumbers.push(d),
      pushEvent: (e) => this.events.unshift(e),
      emitParticles: (x, y, color, count, spread) => this.emitParticles(x, y, color, count, spread),
      requestShake: (amt, dur) => { this.shakeAmount = amt; this.shakeTimer = dur; },
      requestVignette: (dur) => { this.vignetteTimer = dur; },
    });
    this.input = new InputSystem(canvas, {
      onMove: (x, y) => {
        if (this.ended) return;
        const now = performance.now() / 1000;
        this.combat.registerMoveCommand(this.champ, now);
        this.champ.moveTo(x, y, now);
        this.attackMovePoint = null;
        this.attackMoveTarget = null;
        this.stopped = false;
      },
      onAttackMove: (x, y) => {
        if (this.ended) return;
        this.stopped = false;
        const now = performance.now() / 1000;
        // A+좌클릭: 커서 기준 타겟팅 후 평타
        const target = this.findAttackMoveTarget(x, y);
        if (target) {
          const distToTarget = Math.hypot(
            target.ref.pos.x - this.champ.pos.x,
            target.ref.pos.y - this.champ.pos.y
          );
          if (distToTarget <= this.champ.attackRangePx) {
            // 사거리 안: 즉시 평타 발사 (쿨타임 체크 포함)
            if (this.champ.canAutoAttack()) {
              this.combat.fireAutoAttackAt(this.champ, target.ref, this.projectiles, now);
              this.champ.moveTo(this.champ.pos.x, this.champ.pos.y, now); // 정지
              this.attackMovePoint = null;
              this.attackMoveTarget = target;
            }
            // 쿨타임 중이면 아무 반응 없음
          } else {
            // 사거리 밖: 타겟 향해 이동만 (도착해도 자동공격 X)
            this.attackMovePoint = { x: target.ref.pos.x, y: target.ref.pos.y };
            this.attackMoveTarget = target;
            this.champ.moveTo(target.ref.pos.x, target.ref.pos.y, now);
          }
        } else {
          // 적 없으면 아무것도 안 함
          this.attackMovePoint = null;
          this.attackMoveTarget = null;
        }
      },
      onStop: () => {
        if (this.ended) return;
        const now = performance.now() / 1000;
        this.champ.moveTo(this.champ.pos.x, this.champ.pos.y, now);
        this.attackMovePoint = null;
        this.attackMoveTarget = null;
        this.stopped = true;
      },
      onFlash: (ax, ay) => {
        if (this.ended) return;
        this.tryFlash(ax, ay);
      },
      onSkill: (key, ax, ay) => {
        if (this.ended) return;
        if (key !== this.champ.stats.skill.key) return;
        const fired = this.combat.fireChampionSkill(this.champ, ax, ay, this.projectiles);
        if (fired) this.events.unshift({ text: `${key} 시전`, color: "#7ed6ff", life: 0.8, maxLife: 0.8 });
      },
      getFlashKey: () => this.flashKey,
    });
    this.spawnWave();
    this.keyHandler = (e) => {
      const k = e.key.toLowerCase();
      if (this.ended) {
        if (k === "r") this.restart();
        else if (e.key === "Escape") this.cb.onExit();
      }
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  restart() {
    this.champ = new Champion(this.stats, LAYOUT.playerStart.x, LAYOUT.playerStart.y, "ally", false);
    const enemyId = this.enemyChamp.stats;
    this.enemyChamp = new Champion(enemyId, LAYOUT.enemyStart.x, LAYOUT.enemyStart.y, "enemy", true);
    this.allyMinions = [];
    this.enemyMinions = [];
    this.projectiles = [];
    this.telegraphs = [];
    this.damageNumbers = [];
    this.events = [];
    this.combat = new CombatSystem({
      pushDamageNumber: (d) => this.damageNumbers.push(d),
      pushEvent: (e) => this.events.unshift(e),
      emitParticles: (x, y, color, count, spread) => this.emitParticles(x, y, color, count, spread),
      requestShake: (amt, dur) => { this.shakeAmount = amt; this.shakeTimer = dur; },
      requestVignette: (dur) => { this.vignetteTimer = dur; },
    });
    this.elapsed = 0;
    this.wave = 0;
    this.nextWaveAt = 0;
    this.ended = false;
    this.result = null;
    this.attackMovePoint = null;
    this.attackMoveTarget = null;
    this.stopped = false;
    this.attackReadyFlash = 0;
    this.wasAttackOnCooldown = false;
    this.flashCooldown = 0;
    this.flashTrail = null;
    this.particles = [];
    this.spawnWave();
  }

  spawnWave() {
    this.wave += 1;
    const hp = this.diffMult.minionHp;
    const dmg = this.diffMult.damage;
    const kinds: MinionKind[] = ["melee", "melee", "melee", "caster", "caster", "caster"];
    for (let i = 0; i < kinds.length; i++) {
      const jitter = () => (Math.random() - 0.5) * 40; // ±20px
      this.allyMinions.push(new Minion(
        LAYOUT.allySpawn.x + jitter(),
        LAYOUT.allySpawn.y + jitter(),
        kinds[i], "ally", this.wave, hp, dmg
      ));
      this.enemyMinions.push(new Minion(
        LAYOUT.enemySpawn.x + jitter(),
        LAYOUT.enemySpawn.y + jitter(),
        kinds[i], "enemy", this.wave, hp, dmg
      ));
    }
    this.nextWaveAt = this.elapsed + 30;
  }

  start() {
    this.lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      if (!this.ended) this.update(dt);
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  update(dt: number) {
    this.elapsed += dt;
    const now = performance.now() / 1000;

    this.input.update(dt);
    this.processAttackMove(now);
    if (this.flashCooldown > 0) this.flashCooldown -= dt;
    if (this.flashTrail) {
      this.flashTrail.life -= dt;
      if (this.flashTrail.life <= 0) this.flashTrail = null;
    }
    this.champ.update(dt, now);
    if (this.enemyChamp.hp > 0) this.enemyChamp.update(dt, now);

    this.updateEnemyAI(dt, now);

    // minion AI + attacks
    this.combat.updateMinions(this.allyMinions, this.enemyMinions, this.champ, this.enemyChamp, dt, this.projectiles);

    // 플레이어 평타: 자동공격 완전 제거 — 오직 A+좌클릭으로만 발사
    // 공격 가능 신호: 쿨타임 완료 시 링 반짝임
    if (this.wasAttackOnCooldown && this.champ.canAutoAttack()) {
      this.attackReadyFlash = 0.3;
    }
    this.wasAttackOnCooldown = !this.champ.canAutoAttack();
    if (this.attackReadyFlash > 0) this.attackReadyFlash -= dt;

    // 적 챔피언 AI만 자동공격 유지
    if (this.enemyChamp.hp > 0) {
      this.combat.tryChampionAutoAttack(this.enemyChamp, [...this.allyMinions, ...this.enemyMinions], this.champ, this.projectiles, now);
    }

    // telegraphs advance
    for (const t of this.telegraphs) {
      if (!t.fired) {
        t.chargeTime -= dt;
        if (t.chargeTime <= 0) {
          t.fired = true;
          t.fadeLeft = 0.2;
          this.combat.stats.skillshotsIncoming += 1;
          this.projectiles.push(new Projectile({
            pos: t.origin, dir: t.dir, kind: "skillshot", team: t.team,
            damage: t.damage, speed: 720, width: 16,
            maxRange: t.length + 120, color: "#ff8040", sourceIsChampion: true,
          }));
        }
      } else t.fadeLeft -= dt;
    }
    this.telegraphs = this.telegraphs.filter((t) => !t.fired || t.fadeLeft > 0);

    this.combat.updateProjectiles(this.projectiles, this.champ, this.enemyChamp.hp > 0 ? this.enemyChamp : null, [...this.allyMinions, ...this.enemyMinions], dt);
    this.projectiles = this.projectiles.filter((p) => !p.dead && this.inBounds(p));

    // particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.vignetteTimer > 0) this.vignetteTimer -= dt;

    // damage numbers
    for (const n of this.damageNumbers) {
      n.y += n.vy * dt;
      n.vy += 50 * dt;
      n.life -= dt;
    }
    this.damageNumbers = this.damageNumbers.filter((n) => n.life > 0);

    // event feed decay
    for (const e of this.events) e.life -= dt;
    this.events = this.events.filter((e) => e.life > 0).slice(0, 8);

    // cull dead minions
    this.allyMinions = this.allyMinions.filter((m) => !m.dead);
    this.enemyMinions = this.enemyMinions.filter((m) => !m.dead);

    if (this.elapsed >= this.nextWaveAt) this.spawnWave();

    // respawn enemy champ after death
    if (this.enemyChamp.hp <= 0 && this.enemyChamp.pos.x > -999) {
      // set a flag to respawn after delay
      (this.enemyChamp as any)._respawnAt = this.elapsed + 8;
      this.enemyChamp.pos = { x: -9999, y: -9999 };
      this.events.unshift({ text: "적 처치!", color: "#ffd24a", life: 2, maxLife: 2 });
      this.combat.stats.gold += 300;
      this.damageNumbers.push({
        x: 400, y: 280, text: "+300g", color: "#ffd24a", size: 22, vy: -30, life: 1.6, maxLife: 1.6,
      });
    }
    if ((this.enemyChamp as any)._respawnAt !== undefined && this.elapsed >= (this.enemyChamp as any)._respawnAt) {
      const enemyStats = this.enemyChamp.stats;
      this.enemyChamp = new Champion(enemyStats, LAYOUT.enemySpawn.x, LAYOUT.enemySpawn.y, "enemy", true);
    }

    if (this.champ.hp <= 0) this.endSession(false);
    else if (this.elapsed >= this.sessionDuration) this.endSession(true);
  }

  private updateEnemyAI(dt: number, now: number) {
    const e = this.enemyChamp;
    if (e.hp <= 0) return;
    const dx = this.champ.pos.x - e.pos.x;
    const dy = this.champ.pos.y - e.pos.y;
    const distToPlayer = Math.hypot(dx, dy);

    // retreat toward own tower (top-left) if low HP
    if (e.hp / e.maxHp < 0.3) {
      const rdx = LAYOUT.enemyTower.x - e.pos.x;
      const rdy = LAYOUT.enemyTower.y - e.pos.y;
      const rd = Math.hypot(rdx, rdy) || 1;
      e.moveTo(e.pos.x + (rdx / rd) * 120, e.pos.y + (rdy / rd) * 120, now);
      return;
    }

    // try skill: if cooldown ready and player is within extended range, telegraph then cast
    if (e.skillCooldown <= 0 && distToPlayer < e.stats.skill.range * 0.42 * 0.8 && Math.random() < 0.02) {
      const lead = 0.25;
      const tx = this.champ.pos.x + (this.champ.target.x - this.champ.pos.x) * lead;
      const ty = this.champ.pos.y + (this.champ.target.y - this.champ.pos.y) * lead;
      const sdx = tx - e.pos.x, sdy = ty - e.pos.y;
      const sd = Math.hypot(sdx, sdy) || 1;
      const rangePx = e.stats.skill.range * 0.42;
      this.telegraphs.push({
        origin: { ...e.pos },
        dir: { x: sdx / sd, y: sdy / sd },
        length: Math.min(rangePx, sd + 120),
        width: Math.max(26, e.stats.skill.width + 6),
        chargeTime: 0.6,
        chargeTimeMax: 0.6,
        damage: e.stats.skill.damage * this.diffMult.damage,
        fired: false,
        fadeLeft: 0,
        team: "enemy",
      });
      e.skillCooldown = e.stats.skill.cooldown;
      return;
    }

    // trade: if player within AA range, stay and shoot
    if (distToPlayer < e.attackRangePx - 20) {
      // strafe away slightly to kite
      const away = 40;
      e.moveTo(e.pos.x + (dx > 0 ? -away : away) * 0.2, e.pos.y + (Math.random() - 0.5) * 20, now);
      return;
    }

    // farm: move toward nearest low-HP ally minion, but don't over-extend past river
    let best: Minion | null = null;
    let bestScore = Infinity;
    for (const m of this.allyMinions) {
      if (m.dead) continue;
      const d = Math.hypot(m.pos.x - e.pos.x, m.pos.y - e.pos.y);
      const lowBonus = m.isLowHp() ? -60 : 0;
      const s = d + lowBonus;
      if (s < bestScore) { best = m; bestScore = s; }
    }
    if (best) {
      // move toward ally minion (down-right direction from enemy tower)
      e.moveTo(best.pos.x, best.pos.y, now);
    } else {
      e.moveTo(LAYOUT.enemyStart.x, LAYOUT.enemyStart.y + (Math.random() - 0.5) * 60, now);
    }
    void dt;
  }

  // A+클릭 커서 기준 타겟 탐색 (챔피언/미니언 구분 없이 커서에서 가장 가까운 적)
  private findAttackMoveTarget(mouseX: number, mouseY: number): { ref: Champion | Minion; type: "champion" | "minion" } | null {
    const distToMouse = (e: { pos: { x: number; y: number } }) =>
      Math.hypot(e.pos.x - mouseX, e.pos.y - mouseY);

    let best: { ref: Champion | Minion; type: "champion" | "minion" } | null = null;
    let bestD = Infinity;

    // 적 챔피언
    if (this.enemyChamp.hp > 0) {
      const d = distToMouse(this.enemyChamp);
      if (d < bestD) { bestD = d; best = { ref: this.enemyChamp, type: "champion" }; }
    }

    // 적 미니언
    for (const m of this.enemyMinions) {
      if (m.dead) continue;
      const d = distToMouse(m);
      if (d < bestD) { bestD = d; best = { ref: m, type: "minion" }; }
    }

    return best;
  }

  // 이동 중 처리: 사거리 안에 들어오면 정지만 (자동공격 X)
  private processAttackMove(now: number) {
    if (!this.attackMovePoint || this.stopped) return;

    // 타겟이 살아있는지 체크
    if (this.attackMoveTarget) {
      const t = this.attackMoveTarget.ref;
      const alive = (t instanceof Champion) ? t.hp > 0 : !(t as Minion).dead;
      if (!alive) {
        this.attackMovePoint = null;
        this.attackMoveTarget = null;
        this.champ.moveTo(this.champ.pos.x, this.champ.pos.y, now);
        return;
      }
      // 타겟 향해 이동 중 — 사거리 안에 들어오면 정지 (공격 X, 다시 A+클릭 필요)
      const d = Math.hypot(t.pos.x - this.champ.pos.x, t.pos.y - this.champ.pos.y);
      if (d <= this.champ.attackRangePx - 6) {
        this.champ.moveTo(this.champ.pos.x, this.champ.pos.y, now);
        this.attackMovePoint = null;
        // attackMoveTarget은 유지 (타겟 마커 표시용)
      } else {
        // 타겟의 현재 위치로 계속 이동
        this.champ.moveTo(t.pos.x, t.pos.y, now);
      }
    } else {
      // 타겟 없이 위치 이동 중
      const d = Math.hypot(this.champ.pos.x - this.attackMovePoint.x, this.champ.pos.y - this.attackMovePoint.y);
      if (d < 6) this.attackMovePoint = null;
    }
  }

  private tryFlash(ax: number, ay: number) {
    if (this.flashCooldown > 0) return;
    const dx = ax - this.champ.pos.x;
    const dy = ay - this.champ.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    const dist = Math.min(this.flashRangePx, d);
    const from = { x: this.champ.pos.x, y: this.champ.pos.y };
    const nx = this.champ.pos.x + (dx / d) * dist;
    const ny = this.champ.pos.y + (dy / d) * dist;
    this.champ.pos.x = Math.max(this.champ.radius, Math.min(this.w - this.champ.radius, nx));
    this.champ.pos.y = Math.max(LAYOUT.hudTop + this.champ.radius, Math.min(this.h - this.champ.radius, ny));
    this.champ.target = { x: this.champ.pos.x, y: this.champ.pos.y };
    this.flashCooldown = this.flashCooldownMax;
    this.flashTrail = { from, to: { x: this.champ.pos.x, y: this.champ.pos.y }, life: 0.35, maxLife: 0.35 };
    this.emitParticles(from.x, from.y, "#60b4ff", 16, 260);
    this.emitParticles(this.champ.pos.x, this.champ.pos.y, "#a0d0ff", 12, 180);
    this.events.unshift({ text: "FLASH!", color: "#60b4ff", life: 1.0, maxLife: 1.0 });
  }

  emitParticles(x: number, y: number, color: string, count: number, spread: number) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const sp = spread * (0.6 + Math.random() * 0.6);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5, maxLife: 0.5,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private inBounds(p: Projectile) {
    return p.pos.x > -60 && p.pos.x < this.w + 60 && p.pos.y > -60 && p.pos.y < this.h + 60;
  }

  endSession(won: boolean) {
    if (this.ended) return;
    this.ended = true;
    const s = this.combat.stats;
    const kite = s.kitingTotal > 0 ? (s.kitingGood / s.kitingTotal) * 100 : 0;
    const skillAcc = s.skillsFired > 0 ? (s.skillsHit / s.skillsFired) * 100 : 0;
    const dodge = s.skillshotsIncoming > 0
      ? ((s.skillshotsIncoming - s.skillshotsHit) / s.skillshotsIncoming) * 100
      : 100;
    const grade = computeGrade(s.enemyMinionsKilled, s.missedCS, kite, skillAcc, dodge, this.elapsed);
    this.result = {
      championKr: this.stats.kr,
      kitingScore: kite,
      cs: s.enemyMinionsKilled,
      missedCS: s.missedCS,
      gold: s.gold,
      skillAccuracy: skillAcc,
      dodgeRate: dodge,
      damageDealt: s.damageDealt,
      damageTaken: s.damageTaken,
      survivalTime: this.elapsed,
      grade,
      won,
    };
    this.cb.onEnd(this.result);
  }

  private isInAnyBush(x: number, y: number): boolean {
    for (const b of LAYOUT.bushes) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    return false;
  }

  draw() {
    const ctx = this.ctx;
    const tSec = this.elapsed;
    ctx.save();
    if (this.shakeTimer > 0) {
      const s = this.shakeAmount * (this.shakeTimer > 0 ? 1 : 0);
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    this.render.drawBackground();
    this.render.drawBushZones(LAYOUT.bushes as unknown as { x: number; y: number; w: number; h: number }[]);
    const dxTow = this.champ.pos.x - LAYOUT.enemyTower.x;
    const dyTow = this.champ.pos.y - LAYOUT.enemyTower.y;
    const inTowerRange = Math.hypot(dxTow, dyTow) < LAYOUT.towerRange;
    this.render.drawTower(LAYOUT.allyTower, true, LAYOUT.towerRange, false);
    this.render.drawTower(LAYOUT.enemyTower, false, LAYOUT.towerRange, inTowerRange);
    this.render.drawMoveClicks(this.input.clicks);
    for (const t of this.telegraphs) this.render.drawTelegraph(t);
    for (const m of this.allyMinions) this.render.drawMinion(m);
    for (const m of this.enemyMinions) this.render.drawMinion(m);
    if (this.enemyChamp.hp > 0) this.render.drawChampion(this.enemyChamp, tSec, true);
    // aim line preview for player skill if ready and mouse in-bounds
    if (this.champ.skillCooldown <= 0 && !this.ended) {
      this.render.drawAimLine(
        this.champ.pos,
        this.input.mouse,
        this.champ.stats.skill.range * 0.42,
        this.champ.stats.skill.color,
        true
      );
    }
    if (this.flashTrail) this.render.drawFlashTrail(this.flashTrail);
    if (this.attackMoveTarget) {
      const tr = this.attackMoveTarget.ref;
      const alive = (tr instanceof Champion) ? tr.hp > 0 : !(tr as Minion).dead;
      if (alive) this.render.drawTargetMarker(tr.pos.x, tr.pos.y, tr.radius, this.attackMoveTarget.type);
      else this.attackMoveTarget = null;
    }
    this.render.drawChampion(this.champ, tSec, false, this.attackReadyFlash);
    if (this.isInAnyBush(this.champ.pos.x, this.champ.pos.y)) {
      this.render.drawBushOverlay(this.champ.pos.x, this.champ.pos.y, 56);
    }
    for (const p of this.projectiles) this.render.drawProjectile(p);
    for (const pt of this.particles) this.render.drawParticle(pt);
    for (const hf of this.combat.hitFlashes) this.render.drawHitFlash(hf.x, hf.y, hf.t);
    this.render.drawFlash(this.combat.flashTimer);
    this.render.drawDamageNumbers(this.damageNumbers);
    ctx.restore();
    if (this.vignetteTimer > 0) this.render.drawVignette(Math.min(1, this.vignetteTimer / 0.3));

    // A-mode cursor indicator
    if (this.input.aMode) this.render.drawAttackCursor(this.input.mouse.x, this.input.mouse.y);

    const s = this.combat.stats;
    drawHUD(ctx, this.w, this.h, this.champ, this.enemyChamp.hp > 0 ? this.enemyChamp : null,
      this.allyMinions, this.enemyMinions,
      Math.max(0, this.sessionDuration - this.elapsed),
      this.wave, s.gold, s.enemyMinionsKilled, s.missedCS, this.events,
      this.flashCooldown, this.flashCooldownMax, this.stopped, this.flashKey,
      this.champ.attackCooldown, this.champ.currentAttackInterval());

    // control guide for first 3 seconds
    if (this.elapsed < 3) this.render.drawControlGuide(Math.min(1, (3 - this.elapsed)), this.flashKey);

    if (this.ended && this.result) drawResult(ctx, this.w, this.h, this.result);
  }

  setFlashKey(k: "D" | "F") { this.flashKey = k; }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.input.destroy();
    window.removeEventListener("keydown", this.keyHandler);
  }
}
