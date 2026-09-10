"use client";

import { Terminal, Clock, BarChart3, Settings } from "lucide-react";

export type NavTab = "arena" | "routine" | "stats" | "settings";

interface MobileNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export default function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const tabs = [
    { id: "arena", label: "Arena", icon: Terminal },
    { id: "routine", label: "Routine", icon: Clock },
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-6 py-2 pb-5">
      <div className="flex items-center justify-between">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex flex-col items-center gap-1 transition ${
                isActive ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-mono">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}