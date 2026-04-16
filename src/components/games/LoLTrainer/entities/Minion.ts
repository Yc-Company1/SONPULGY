import { Vec2 } from "./Champion";
import { Team, LAYOUT } from "./types";

export type MinionKind = "melee" | "caster";

export interface MinionDamageSource {
  kind: "champion" | "minion";
  team: Team;
}

export class Minion {
  pos: Vec2;
  team: Team;
  kind: MinionKind;
  radius: number;
  hp: number;
  maxHp: number;
  moveSpeed: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown = 0;
  attackInterval: number;
  dead = false;
  target: Minion | null = null;
  bob = Math.random() * Math.PI * 2;
  goldValue: number;
  lastDamager: MinionDamageSource | null = null;

  constructor(x: number, y: number, kind: MinionKind, team: Team, waveLevel: number, hpMult: number, dmgMult: number) {
    this.pos = { x, y };
    this.kind = kind;
    this.team = team;
    this.radius = kind === "melee" ? 14 : 11;
    const hpBase = kind === "melee" ? 80 : 55;
    this.maxHp = (hpBase + waveLevel * 6) * hpMult;
    this.hp = this.maxHp;
    this.moveSpeed = kind === "melee" ? 55 : 50;
    this.attackRange = kind === "melee" ? 48 : 140;
    this.attackDamage = (kind === "melee" ? 9 : 6) * dmgMult;
    this.attackInterval = kind === "melee" ? 1.3 : 1.5;
    this.goldValue = kind === "melee" ? 21 : 14;
  }

  update(
    dt: number,
    enemyMinions: Minion[],
    onAttack: (m: Minion, target: Minion) => void
  ) {
    this.bob += dt * 4;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // acquire target: nearest enemy minion in vision (160 px)
    if (!this.target || this.target.dead || dist(this.pos, this.target.pos) > 200) {
      this.target = null;
      let bestD = Infinity;
      for (const m of enemyMinions) {
        if (m.dead) continue;
        const d = dist(this.pos, m.pos);
        if (d < 200 && d < bestD) { this.target = m; bestD = d; }
      }
    }

    if (this.target) {
      const d = dist(this.pos, this.target.pos);
      if (d > this.attackRange - 2) {
        // move toward target
        this.moveToward(this.target.pos, dt);
      } else {
        // stop & attack
        if (this.attackCooldown <= 0) {
          this.attackCooldown = this.attackInterval;
          onAttack(this, this.target);
        }
      }
    } else {
      // advance toward enemy tower along diagonal lane
      const goal = this.team === "ally" ? LAYOUT.enemyTower : LAYOUT.allyTower;
      this.moveToward(goal, dt);
    }

    // keep inside canvas
    this.pos.x = clamp(this.pos.x, 10, LAYOUT.width - 10);
    this.pos.y = clamp(this.pos.y, LAYOUT.hudTop + 10, LAYOUT.height - 10);
  }

  private moveToward(t: Vec2, dt: number) {
    const dx = t.x - this.pos.x;
    const dy = t.y - this.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    this.pos.x += (dx / d) * this.moveSpeed * dt;
    this.pos.y += (dy / d) * this.moveSpeed * dt;
  }

  takeDamage(amount: number, source: MinionDamageSource) {
    this.hp -= amount;
    this.lastDamager = source;
    if (this.hp <= 0) { this.dead = true; this.hp = 0; }
  }

  isLowHp() { return this.hp / this.maxHp <= 0.2; }
}

function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
