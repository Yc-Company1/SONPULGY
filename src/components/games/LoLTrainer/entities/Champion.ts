import { ChampionStats, SCALE, MS_SCALE } from "@/constants/champions";
import { Team, LAYOUT } from "./types";

export interface Vec2 { x: number; y: number; }

export class Champion {
  stats: ChampionStats;
  team: Team;
  isAI: boolean;
  pos: Vec2;
  target: Vec2;
  radius = 20;
  facing = 0;
  hp: number;
  maxHp: number;
  moveSpeedPx: number;
  attackRangePx: number;
  attackCooldown = 0;
  lastAttackTime = -999;
  lastMoveCommand = -999;
  skillCooldown = 0;
  trail: { x: number; y: number; t: number }[] = [];

  // Caitlyn headshot
  headshotStack = 0;
  headshotThreshold = 6;

  // Jhin ammo
  ammo = 4;
  maxAmmo = 4;
  reloading = false;
  reloadTimeLeft = 0;
  jhinShotsThisCycle = 0;

  constructor(stats: ChampionStats, x: number, y: number, team: Team = "ally", isAI = false) {
    this.stats = stats;
    this.team = team;
    this.isAI = isAI;
    this.pos = { x, y };
    this.target = { x, y };
    this.moveSpeedPx = stats.moveSpeed * SCALE * MS_SCALE;
    this.attackRangePx = stats.attackRange * SCALE;
    this.maxHp = isAI ? 380 : 550;
    this.hp = this.maxHp;
  }

  effectiveMoveSpeed(): number {
    if (this.stats.id === "jhin" && this.reloading) return this.moveSpeedPx * 0.7;
    return this.moveSpeedPx;
  }

  moveTo(x: number, y: number, now: number) {
    this.target = { x, y };
    this.lastMoveCommand = now;
  }

  update(dt: number, now: number) {
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const spd = this.effectiveMoveSpeed();
    if (dist > 2) {
      const step = Math.min(dist, spd * dt);
      this.pos.x += (dx / dist) * step;
      this.pos.y += (dy / dist) * step;
      this.facing = Math.atan2(dy, dx);
      this.trail.push({ x: this.pos.x, y: this.pos.y, t: now });
    }
    this.trail = this.trail.filter((p) => now - p.t < 0.3);
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.skillCooldown > 0) this.skillCooldown -= dt;
    if (this.reloading) {
      this.reloadTimeLeft -= dt;
      if (this.reloadTimeLeft <= 0) {
        this.reloading = false;
        this.ammo = this.maxAmmo;
        this.jhinShotsThisCycle = 0;
      }
    }
    // clamp to canvas
    this.pos.x = Math.max(this.radius, Math.min(LAYOUT.width - this.radius, this.pos.x));
    this.pos.y = Math.max(LAYOUT.hudTop + this.radius, Math.min(LAYOUT.height - this.radius, this.pos.y));
  }

  currentAttackInterval(): number {
    if (this.stats.id === "jhin") {
      if (this.jhinShotsThisCycle === 3) return 1.5;
      return 0.9;
    }
    return 1 / this.stats.attackSpeed;
  }

  canAutoAttack(): boolean {
    if (this.attackCooldown > 0) return false;
    if (this.stats.id === "jhin" && this.reloading) return false;
    return true;
  }

  registerAutoFired(now: number) {
    this.attackCooldown = this.currentAttackInterval();
    this.lastAttackTime = now;
    if (this.stats.id === "caitlyn") {
      const wasHeadshot = this.headshotStack + 1 >= this.headshotThreshold;
      this.headshotStack = wasHeadshot ? 0 : this.headshotStack + 1;
    }
    if (this.stats.id === "jhin") {
      this.ammo -= 1;
      this.jhinShotsThisCycle += 1;
      if (this.ammo <= 0) {
        this.reloading = true;
        this.reloadTimeLeft = 2.5;
        this.ammo = 0;
      }
    }
  }

  isHeadshotNext(): boolean {
    return this.stats.id === "caitlyn" && (this.headshotStack + 1) >= this.headshotThreshold;
  }
  isJhin4thShot(): boolean {
    return this.stats.id === "jhin" && this.jhinShotsThisCycle === 3 && !this.reloading;
  }

  onEzrealQHit() {
    if (this.stats.id === "ezreal") this.attackCooldown = 0;
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
  }
}
