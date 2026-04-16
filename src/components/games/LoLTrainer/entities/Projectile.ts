import { Vec2 } from "./Champion";
import { Team } from "./types";

export type ProjectileKind = "basic" | "skillshot";

export interface ProjectileOpts {
  pos: Vec2;
  dir: Vec2;
  kind: ProjectileKind;
  team: Team;
  damage: number;
  speed: number;
  width?: number;
  maxRange?: number;
  color: string;
  targetRef?: { pos: Vec2; dead?: boolean; hp?: number } | null;
  piercing?: boolean;
  tag?: string;
  sourceIsChampion: boolean;
}

export class Projectile {
  pos: Vec2;
  start: Vec2;
  vel: Vec2;
  kind: ProjectileKind;
  team: Team;
  damage: number;
  speed: number;
  width: number;
  radius: number;
  maxRange: number;
  color: string;
  targetRef: { pos: Vec2; dead?: boolean; hp?: number } | null;
  piercing: boolean;
  tag: string;
  sourceIsChampion: boolean;
  hitSet: Set<any> = new Set();
  dead = false;
  trail: Vec2[] = [];

  constructor(o: ProjectileOpts) {
    this.pos = { ...o.pos };
    this.start = { ...o.pos };
    this.kind = o.kind;
    this.team = o.team;
    this.damage = o.damage;
    this.speed = o.speed;
    this.width = o.width ?? 8;
    this.radius = this.width / 2 + 2;
    this.maxRange = o.maxRange ?? 800;
    this.color = o.color;
    this.targetRef = o.targetRef ?? null;
    this.piercing = !!o.piercing;
    this.tag = o.tag ?? "";
    this.sourceIsChampion = o.sourceIsChampion;
    const mag = Math.hypot(o.dir.x, o.dir.y) || 1;
    this.vel = { x: (o.dir.x / mag) * this.speed, y: (o.dir.y / mag) * this.speed };
  }

  update(dt: number) {
    if (this.kind === "basic" && this.targetRef && !this.targetRef.dead) {
      const dx = this.targetRef.pos.x - this.pos.x;
      const dy = this.targetRef.pos.y - this.pos.y;
      const d = Math.hypot(dx, dy) || 1;
      this.vel.x = (dx / d) * this.speed;
      this.vel.y = (dy / d) * this.speed;
    }
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > 6) this.trail.shift();
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    const traveled = Math.hypot(this.pos.x - this.start.x, this.pos.y - this.start.y);
    if (traveled > this.maxRange) this.dead = true;
  }

  get angle() { return Math.atan2(this.vel.y, this.vel.x); }
}

export interface Telegraph {
  origin: Vec2;
  dir: Vec2;
  length: number;
  width: number;
  chargeTime: number;
  chargeTimeMax: number;
  damage: number;
  fired: boolean;
  fadeLeft: number;
  team: Team;
}
