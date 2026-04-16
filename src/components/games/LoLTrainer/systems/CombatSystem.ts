import { Champion } from "../entities/Champion";
import { Minion } from "../entities/Minion";
import { Projectile } from "../entities/Projectile";
import { Team, DamageNumber, EventLog } from "../entities/types";

export interface CombatStats {
  damageDealt: number;
  damageTaken: number;
  autosFired: number;
  skillsFired: number;
  skillsHit: number;
  kitingGood: number;
  kitingTotal: number;
  skillshotsIncoming: number;
  skillshotsHit: number;
  enemyMinionsKilled: number;  // by player (CS)
  enemyMinionsDied: number;    // total enemy minion deaths
  missedCS: number;
  gold: number;
}

export interface CombatHooks {
  pushDamageNumber: (d: DamageNumber) => void;
  pushEvent: (e: EventLog) => void;
  emitParticles: (x: number, y: number, color: string, count: number, spread: number) => void;
  requestShake: (amount: number, duration: number) => void;
  requestVignette: (duration: number) => void;
}

export class CombatSystem {
  stats: CombatStats = {
    damageDealt: 0,
    damageTaken: 0,
    autosFired: 0,
    skillsFired: 0,
    skillsHit: 0,
    kitingGood: 0,
    kitingTotal: 0,
    skillshotsIncoming: 0,
    skillshotsHit: 0,
    enemyMinionsKilled: 0,
    enemyMinionsDied: 0,
    missedCS: 0,
    gold: 0,
  };
  flashTimer = 0;
  hitFlashes: { x: number; y: number; t: number }[] = [];
  hooks: CombatHooks;

  constructor(hooks: CombatHooks) {
    this.hooks = hooks;
  }

  registerMoveCommand(champ: Champion, now: number) {
    const since = now - champ.lastAttackTime;
    if (since >= 0.02 && since <= 0.45) this.stats.kitingGood += 1;
  }

  // champion AA: target is nearest enemy-team minion or opposing champion
  tryChampionAutoAttack(
    champ: Champion,
    minions: Minion[],
    enemyChamp: Champion | null,
    projectiles: Projectile[],
    now: number
  ) {
    if (!champ.canAutoAttack()) return;
    let best: { ref: Minion | Champion; pos: { x: number; y: number } } | null = null;
    let bestD = Infinity;
    for (const m of minions) {
      if (m.dead) continue;
      if (m.team === champ.team) continue;
      const d = Math.hypot(m.pos.x - champ.pos.x, m.pos.y - champ.pos.y);
      if (d <= champ.attackRangePx && d < bestD) { best = { ref: m, pos: m.pos }; bestD = d; }
    }
    if (enemyChamp && !(enemyChamp.hp <= 0)) {
      const d = Math.hypot(enemyChamp.pos.x - champ.pos.x, enemyChamp.pos.y - champ.pos.y);
      if (d <= champ.attackRangePx && d < bestD) {
        best = { ref: enemyChamp, pos: enemyChamp.pos };
        bestD = d;
      }
    }
    if (!best) return;

    let dmg = champ.stats.attackDamage;
    let width = 8;
    let color = champ.stats.primary;
    let tag = `basic-${champ.stats.id}`;
    let speed = 1000;
    if (champ.isHeadshotNext()) { dmg *= 2.1; width = 14; color = champ.stats.accent; tag = "basic-cait-headshot"; }
    if (champ.isJhin4thShot()) { dmg *= 2.5; width = 12; color = champ.stats.accent; tag = "basic-jhin-crit"; speed = 1400; }

    projectiles.push(new Projectile({
      pos: champ.pos,
      dir: { x: best.pos.x - champ.pos.x, y: best.pos.y - champ.pos.y },
      kind: "basic",
      team: champ.team,
      damage: dmg,
      speed,
      width,
      color,
      targetRef: best.ref,
      maxRange: champ.attackRangePx * 1.8,
      tag,
      sourceIsChampion: true,
    }));
    champ.registerAutoFired(now);
    this.stats.autosFired += 1;
    if (!champ.isAI) this.stats.kitingTotal += 1;
  }

  fireChampionSkill(champ: Champion, aimX: number, aimY: number, projectiles: Projectile[]) {
    if (champ.skillCooldown > 0) return false;
    const s = champ.stats.skill;
    const dx = aimX - champ.pos.x;
    const dy = aimY - champ.pos.y;
    const mag = Math.hypot(dx, dy) || 1;
    const dir = { x: dx / mag, y: dy / mag };
    const speedPx = s.speed * 0.42;
    const rangePx = s.range * 0.42;

    const common = {
      pos: champ.pos, dir, kind: "skillshot" as const, team: champ.team,
      damage: s.damage, speed: speedPx, width: s.width,
      maxRange: rangePx, color: s.color, sourceIsChampion: true,
    };
    if (champ.stats.id === "ezreal") projectiles.push(new Projectile({ ...common, tag: "ezreal-q" }));
    else if (champ.stats.id === "caitlyn") projectiles.push(new Projectile({ ...common, piercing: true, tag: "cait-q" }));
    else if (champ.stats.id === "jhin") projectiles.push(new Projectile({ ...common, tag: "jhin-w" }));
    champ.skillCooldown = s.cooldown;
    if (!champ.isAI) this.stats.skillsFired += 1;
    return true;
  }

  updateProjectiles(
    projectiles: Projectile[],
    playerChamp: Champion,
    enemyChamp: Champion | null,
    minions: Minion[],
    dt: number
  ) {
    for (const p of projectiles) {
      p.update(dt);
      // check minion collisions
      for (const m of minions) {
        if (m.dead) continue;
        if (m.team === p.team) continue;
        if (p.hitSet.has(m)) continue;
        const d = Math.hypot(m.pos.x - p.pos.x, m.pos.y - p.pos.y);
        if (d < p.radius + m.radius) {
          const before = m.hp;
          m.takeDamage(p.damage, { kind: p.sourceIsChampion ? "champion" : "minion", team: p.team });
          const applied = Math.min(before, p.damage);
          this.onMinionHit(m, applied, p);
          p.hitSet.add(m);
          if (!p.piercing) { p.dead = true; break; }
        }
      }
      if (p.dead) continue;
      // champions (only skillshots or basics targeting them)
      const targets: Champion[] = [];
      if (p.team !== playerChamp.team && playerChamp.hp > 0) targets.push(playerChamp);
      if (enemyChamp && p.team !== enemyChamp.team && enemyChamp.hp > 0) targets.push(enemyChamp);
      for (const c of targets) {
        if (p.hitSet.has(c)) continue;
        const d = Math.hypot(c.pos.x - p.pos.x, c.pos.y - p.pos.y);
        if (d < p.radius + c.radius) {
          const before = c.hp;
          c.takeDamage(p.damage);
          const applied = Math.min(before, p.damage);
          this.onChampionHit(c, applied, p, playerChamp);
          p.hitSet.add(c);
          if (!p.piercing) { p.dead = true; break; }
        }
      }
    }
    for (const h of this.hitFlashes) h.t -= dt;
    this.hitFlashes = this.hitFlashes.filter((h) => h.t > 0);
    if (this.flashTimer > 0) this.flashTimer -= dt;
  }

  private onMinionHit(m: Minion, dmg: number, p: Projectile) {
    const byPlayer = p.sourceIsChampion && p.team === "ally";
    this.hitFlashes.push({ x: m.pos.x, y: m.pos.y, t: 0.25 });
    if (byPlayer) {
      this.stats.damageDealt += dmg;
      if (p.kind === "skillshot") this.stats.skillsHit += 1;
      if (p.tag === "ezreal-q") {
        // handled by engine passing champ reference... use callback? keep it simple:
        // Champion.onEzrealQHit is called externally in engine via checking a flag.
        (p as any)._ezHit = true;
      }
      this.hooks.pushDamageNumber({
        x: m.pos.x, y: m.pos.y - 10,
        text: Math.round(dmg).toString(),
        color: p.kind === "skillshot" ? "#ffdd55" : "#ffffff",
        size: p.kind === "skillshot" ? 16 : 13,
        vy: -28, life: 0.8, maxLife: 0.8,
      });
    }
    // particle burst on hit
    this.hooks.emitParticles(m.pos.x, m.pos.y, p.color, 8, 140);
    if (m.dead && m.team === "enemy") {
      this.stats.enemyMinionsDied += 1;
      const killer = m.lastDamager;
      if (killer && killer.kind === "champion" && killer.team === "ally") {
        this.stats.enemyMinionsKilled += 1;
        this.stats.gold += m.goldValue;
        this.hooks.emitParticles(m.pos.x, m.pos.y, "#ffd24a", 12, 180);
        this.hooks.pushDamageNumber({
          x: m.pos.x, y: m.pos.y - 20,
          text: `+${m.goldValue}g`,
          color: "#ffd24a", size: 16, vy: -35, life: 1.1, maxLife: 1.1,
        });
        this.hooks.pushEvent({ text: "막타!", color: "#ffd24a", life: 1.5, maxLife: 1.5 });
      } else {
        this.stats.missedCS += 1;
        this.hooks.pushDamageNumber({
          x: m.pos.x, y: m.pos.y - 20,
          text: "MISSED",
          color: "#888", size: 12, vy: -30, life: 1.0, maxLife: 1.0,
        });
      }
    }
  }

  private onChampionHit(c: Champion, dmg: number, p: Projectile, playerChamp: Champion) {
    const byPlayer = p.sourceIsChampion && p.team === "ally";
    this.hitFlashes.push({ x: c.pos.x, y: c.pos.y, t: 0.25 });
    if (byPlayer) {
      this.stats.damageDealt += dmg;
      if (p.kind === "skillshot") this.stats.skillsHit += 1;
      if (p.tag === "ezreal-q") playerChamp.onEzrealQHit();
      this.hooks.emitParticles(c.pos.x, c.pos.y, p.color, 14, 200);
      if (p.kind === "skillshot") this.hooks.requestShake(6, 0.15);
      this.hooks.pushDamageNumber({
        x: c.pos.x, y: c.pos.y - 14,
        text: Math.round(dmg).toString(),
        color: p.kind === "skillshot" ? "#ffdd55" : "#ffffff",
        size: 18, vy: -32, life: 0.9, maxLife: 0.9,
      });
    }
    if (c === playerChamp) {
      this.stats.damageTaken += dmg;
      if (p.kind === "skillshot") {
        this.stats.skillshotsHit += 1;
        this.hooks.pushEvent({ text: "피격", color: "#e04040", life: 1.2, maxLife: 1.2 });
      }
      this.flashTimer = 0.25;
      this.hooks.requestVignette(0.3);
      this.hooks.pushDamageNumber({
        x: c.pos.x, y: c.pos.y - 16,
        text: Math.round(dmg).toString(),
        color: "#ff5050", size: 18, vy: -32, life: 0.9, maxLife: 0.9,
      });
    }
  }

  updateMinions(
    allyMinions: Minion[],
    enemyMinions: Minion[],
    playerChamp: Champion,
    enemyChamp: Champion | null,
    dt: number,
    projectiles: Projectile[]
  ) {
    const onAttack = (attacker: Minion, targetMinion: Minion) => {
      // instant damage (minion attacks are not modeled as projectiles for perf)
      const before = targetMinion.hp;
      targetMinion.takeDamage(attacker.attackDamage, { kind: "minion", team: attacker.team });
      void before;
      this.hitFlashes.push({ x: targetMinion.pos.x, y: targetMinion.pos.y, t: 0.2 });
    };
    for (const m of allyMinions) {
      if (m.dead) continue;
      m.update(dt, enemyMinions, onAttack);
    }
    for (const m of enemyMinions) {
      if (m.dead) continue;
      m.update(dt, allyMinions, onAttack);
    }
    // melee minion hitting champions if extremely close (simple):
    const checkChamp = (c: Champion, hostileMinions: Minion[]) => {
      for (const m of hostileMinions) {
        if (m.dead) continue;
        if (m.kind !== "melee") continue;
        const d = Math.hypot(c.pos.x - m.pos.x, c.pos.y - m.pos.y);
        if (d < m.attackRange && m.attackCooldown <= 0) {
          // only aggro champion if no minion target
          if (!m.target) {
            m.attackCooldown = m.attackInterval;
            c.takeDamage(m.attackDamage);
            if (c === playerChamp) {
              this.stats.damageTaken += m.attackDamage;
              this.flashTimer = 0.2;
              this.hooks.pushDamageNumber({
                x: c.pos.x, y: c.pos.y - 14, text: Math.round(m.attackDamage).toString(),
                color: "#ff5050", size: 14, vy: -30, life: 0.8, maxLife: 0.8,
              });
            }
          }
        }
      }
    };
    checkChamp(playerChamp, enemyMinions);
    if (enemyChamp) checkChamp(enemyChamp, allyMinions);
    void projectiles;
  }
}
