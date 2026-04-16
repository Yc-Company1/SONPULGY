export type Team = "ally" | "enemy";

export interface DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface EventLog {
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Rect { x: number; y: number; w: number; h: number; }

export const LAYOUT = {
  width: 929,
  height: 465,
  hudTop: 46,
  // Absolute pixel coords (929x465 map)
  allySpawn: { x: 130, y: 340 },
  enemySpawn: { x: 720, y: 80 },
  playerStart: { x: 130, y: 340 },
  enemyStart: { x: 720, y: 80 },
  // Towers just behind respective spawns
  allyTower: { x: 90, y: 380 },
  enemyTower: { x: 760, y: 45 },
  // Minion lane collision midpoint
  laneCenter: { x: 425, y: 210 },
  laneMid: { x: 425, y: 210 },
  // Direction vectors
  allyToEnemy: { x: 0.915, y: -0.403 },
  enemyToAlly: { x: -0.915, y: 0.403 },
  // Bush zones near spawns
  bushes: [
    { x: 60, y: 300, w: 140, h: 80 },
    { x: 660, y: 50, w: 140, h: 80 },
  ] as Rect[],
  towerRange: 160,
} as const;
