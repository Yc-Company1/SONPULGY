import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d12",
        panel: "#12151c",
        panel2: "#1a1f2b",
        border: "#262c3a",
        accent: "#6366f1",
        accent2: "#22d3ee",
        good: "#22c55e",
        warn: "#eab308",
        bad: "#ef4444",
      },
    },
  },
  plugins: [],
};
export default config;
