import { CalendarDays, Compass, Settings2, Sun, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type TabKey = "today" | "calendar" | "qibla" | "settings";

const TABS: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "today", label: "Today", icon: Sun },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "qibla", label: "Qibla", icon: Compass },
  { key: "settings", label: "Settings", icon: Settings2 },
];

export function TabBar({ value, onChange }: { value: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav aria-label="Main" className="orbit-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-o-line">
      <div className="mx-auto grid max-w-xl grid-cols-4 px-2 pt-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === value;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-o-text" : "text-o-faint hover:text-o-muted"
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-14 place-items-center rounded-full transition-all duration-300",
                  active ? "bg-o-accent-soft text-o-accent" : "group-active:scale-90"
                )}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
