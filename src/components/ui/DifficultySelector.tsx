"use client";
import { Difficulty } from "@/types";

interface Props {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  disabled?: boolean;
}

const labels = ["매우 쉬움", "쉬움", "보통", "어려움", "매우 어려움"];

export default function DifficultySelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">난이도</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((d) => (
          <button
            key={d}
            disabled={disabled}
            onClick={() => onChange(d as Difficulty)}
            className={`w-9 h-9 rounded-md border text-sm font-medium transition ${
              value === d
                ? "bg-accent border-accent text-white"
                : "bg-panel2 border-border text-gray-300 hover:bg-border"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {d}
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-500 ml-2">{labels[value - 1]}</span>
    </div>
  );
}
