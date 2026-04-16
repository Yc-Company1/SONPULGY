import { create } from "zustand";
import { Difficulty } from "@/types";

interface GameState {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
}

export const useGameStore = create<GameState>((set) => ({
  difficulty: 3,
  setDifficulty: (d) => set({ difficulty: d }),
}));
