export type ModuleId = "aim" | "dodge" | "reaction" | "timing";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface AimResult {
  date: string;
  difficulty: Difficulty;
  accuracy: number;
  avgReactionMs: number;
  cps: number;
  hits: number;
  misses: number;
  score: number;
}

export interface SessionRecord {
  module: ModuleId;
  date: string;
  score: number;
  payload: Record<string, number | string>;
}
