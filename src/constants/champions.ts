export type ChampionId = "ezreal" | "caitlyn" | "jhin";

// Canvas scale factor: 1 LoL unit ~= SCALE px
export const SCALE = 0.42;
// MS gets extra boost so movement feels responsive on a 960px canvas
export const MS_SCALE = 0.8;

export interface ChampionStats {
  id: ChampionId;
  name: string;
  kr: string;
  difficulty: "입문" | "중급" | "고급";
  description: string;
  // Core stats (LoL units)
  moveSpeed: number;    // units/s
  attackRange: number;  // units
  attackSpeed: number;  // attacks/s
  attackDamage: number;
  // Visuals
  primary: string;      // body main color
  accent: string;       // accent color
  bodyGlow: string;
  // Skill
  skill: {
    key: "Q" | "W";
    name: string;
    range: number;      // LoL units
    width: number;      // px width of projectile
    speed: number;      // LoL units/s
    damage: number;
    cooldown: number;   // seconds
    color: string;
  };
}

export const CHAMPIONS: Record<ChampionId, ChampionStats> = {
  ezreal: {
    id: "ezreal",
    name: "Ezreal",
    kr: "이즈리얼",
    difficulty: "중급",
    description: "Q 타이밍이 핵심. 맞히면 평타 쿨다운 리셋.",
    moveSpeed: 325,
    attackRange: 550,
    attackSpeed: 0.625,
    attackDamage: 18,
    primary: "#5ab4ff",
    accent: "#ffd84a",
    bodyGlow: "#8ad8ff",
    skill: {
      key: "Q",
      name: "Mystic Shot",
      range: 1150,
      width: 10,
      speed: 2000,
      damage: 30,
      cooldown: 4.5,
      color: "#7ed6ff",
    },
  },
  caitlyn: {
    id: "caitlyn",
    name: "Caitlyn",
    kr: "케이틀린",
    difficulty: "입문",
    description: "가장 긴 사거리. 6번째 평타 헤드샷.",
    moveSpeed: 325,
    attackRange: 650,
    attackSpeed: 0.681,
    attackDamage: 17,
    primary: "#4cd2c4",
    accent: "#b36cff",
    bodyGlow: "#8fe9df",
    skill: {
      key: "Q",
      name: "Piltover Peacemaker",
      range: 1300,
      width: 36,
      speed: 2200,
      damage: 28,
      cooldown: 6,
      color: "#6ce0d0",
    },
  },
  jhin: {
    id: "jhin",
    name: "Jhin",
    kr: "진",
    difficulty: "고급",
    description: "4발 탄창 + 재장전. 리듬이 전부.",
    moveSpeed: 330,
    attackRange: 600,
    attackSpeed: 1 / 0.9,
    attackDamage: 20,
    primary: "#e04050",
    accent: "#f7c455",
    bodyGlow: "#ff9090",
    skill: {
      key: "W",
      name: "Deadly Flourish",
      range: 2550,
      width: 8,
      speed: 2600,
      damage: 34,
      cooldown: 10,
      color: "#ff6a6a",
    },
  },
};

export const DIFFICULTY_MULT = {
  1: { minionHp: 0.7, skillshotFreq: 0.6, minionSpeed: 0.85, damage: 0.7 },
  2: { minionHp: 0.85, skillshotFreq: 0.8, minionSpeed: 0.95, damage: 0.85 },
  3: { minionHp: 1, skillshotFreq: 1, minionSpeed: 1, damage: 1 },
  4: { minionHp: 1.2, skillshotFreq: 1.25, minionSpeed: 1.1, damage: 1.15 },
  5: { minionHp: 1.45, skillshotFreq: 1.55, minionSpeed: 1.2, damage: 1.3 },
} as const;

export type Difficulty = 1 | 2 | 3 | 4 | 5;
