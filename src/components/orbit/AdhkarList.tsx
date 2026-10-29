import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";

import { Panel, Segmented } from "@/components/orbit/primitives";
import { todayStamp, useStoredState, vibrate } from "@/hooks/orbit/useStoredState";
import { adhkarFor, type AdhkarSession } from "@/lib/orbit/adhkar";
import { cn } from "@/lib/utils";

type AdhkarStore = { day: string; counts: Record<string, number> };

export function AdhkarList({ initialSession }: { initialSession: AdhkarSession }) {
  const [session, setSession] = useState<AdhkarSession>(initialSession);
  const [store, setStore] = useStoredState<AdhkarStore>("orbit:adhkar", { day: "", counts: {} });
  const items = adhkarFor(session);
  const counts = store.day === todayStamp() ? store.counts : {};
  const countOf = (id: string) => counts[`${session}:${id}`] ?? 0;
  const completed = items.filter((item) => countOf(item.id) >= item.repeat).length;

  const tap = (id: string, repeat: number) => {
    const current = countOf(id);
    if (current >= repeat) return;
    const next = current + 1;
    vibrate(next >= repeat ? [20, 40, 20] : 8);
    setStore({
      day: todayStamp(),
      counts: { ...counts, [`${session}:${id}`]: next },
    });
  };

  const resetSession = () => {
    setStore({
      day: todayStamp(),
      counts: Object.fromEntries(Object.entries(counts).filter(([key]) => !key.startsWith(`${session}:`))),
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <Segmented
        value={session}
        onChange={setSession}
        options={[
          { value: "morning", label: "Morning" },
          { value: "evening", label: "Evening" },
        ]}
      />

      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-o-muted">
          <span className="font-semibold text-o-text tabular-nums">
            {completed}/{items.length}
          </span>{" "}
          completed · tap a card to count
        </div>
        <button
          type="button"
          onClick={resetSession}
          className="flex h-8 items-center gap-1.5 rounded-full bg-o-surface-2 px-3 text-xs font-medium text-o-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-o-surface-2">
        <div
          className="h-full rounded-full bg-o-accent transition-[width] duration-500"
          style={{ width: `${(completed / items.length) * 100}%` }}
        />
      </div>

      {items.map((item) => {
        const count = countOf(item.id);
        const done = count >= item.repeat;

        return (
          <Panel key={item.id} className={cn("overflow-hidden transition-opacity", done && "opacity-60")}>
            <button
              type="button"
              onClick={() => tap(item.id, item.repeat)}
              className="block w-full p-4 text-left active:bg-o-surface-2"
              aria-label={`${item.title}, ${count} of ${item.repeat}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{item.title}</div>
                <span
                  className={cn(
                    "flex h-7 min-w-14 items-center justify-center gap-1 rounded-full px-2.5 text-xs font-semibold tabular-nums",
                    done ? "bg-o-accent text-o-on-accent" : "bg-o-accent-soft text-o-accent"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                  {count}/{item.repeat}
                </span>
              </div>

              {!done ? (
                <>
                  <p className="mt-3 font-arabic text-[22px] leading-[1.9] text-o-text" dir="rtl" lang="ar">
                    {item.arabic}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-o-muted">{item.meaning}</p>
                  <p className="mt-2 text-[11px] text-o-faint">{item.source}</p>
                  {item.repeat > 1 ? (
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-o-surface-2">
                      <div
                        className="h-full rounded-full bg-o-accent transition-[width] duration-200"
                        style={{ width: `${(count / item.repeat) * 100}%` }}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </button>
          </Panel>
        );
      })}
    </div>
  );
}
