"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "대시보드", icon: "⌂" },
  { href: "/train/lol", label: "LoL 손풀기", icon: "⚔" },
  { href: "/train/aim", label: "Aim Trainer", icon: "◎" },
  { href: "/train/dodge", label: "Dodge Trainer", icon: "✦" },
  { href: "/train/reaction", label: "Reaction Test", icon: "⚡" },
  { href: "/train/timing", label: "Rhythm & Timing", icon: "♪" },
  { href: "/stats", label: "통계", icon: "▦" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-panel h-full p-4 hidden md:block">
      <nav className="flex flex-col gap-1">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? "bg-accent text-white"
                  : "text-gray-300 hover:bg-panel2"
              }`}
            >
              <span className="w-5 text-center opacity-80">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 text-xs text-gray-500 px-3">v0.1 MVP</div>
    </aside>
  );
}
