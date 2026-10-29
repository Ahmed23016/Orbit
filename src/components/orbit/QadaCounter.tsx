import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Panel } from "@/components/orbit/primitives";
import { useStoredState, vibrate } from "@/hooks/orbit/useStoredState";
import { FARD_KEYS, PRAYER_LABELS, type FardKey } from "@/lib/orbit/schedule";
import { cn } from "@/lib/utils";

type QadaStore = { owed: Record<FardKey, number>; madeUp: number };

const EMPTY: QadaStore = {
  owed: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  madeUp: 0,
};

export function QadaCounter() {
  const [store, setStore] = useStoredState<QadaStore>("orbit:qada", EMPTY);
  const [days, setDays] = useState("");
  const totalOwed = FARD_KEYS.reduce((sum, key) => sum + (store.owed[key] ?? 0), 0);

  const change = (key: FardKey, delta: number) => {
    const current = store.owed[key] ?? 0;
    const next = Math.max(0, current + delta);
    if (next === current) return;
    vibrate(delta < 0 ? [15, 30, 15] : 8);
    setStore({
      owed: { ...store.owed, [key]: next },
      madeUp: store.madeUp + (delta < 0 ? 1 : 0),
    });
  };

  const addDays = () => {
    const count = Math.round(Number(days));
    if (!Number.isFinite(count) || count <= 0) return;
    setStore({
      ...store,
      owed: Object.fromEntries(FARD_KEYS.map((key) => [key, (store.owed[key] ?? 0) + count])) as Record<FardKey, number>,
    });
    setDays("");
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <Panel className="p-5 text-center">
        <div className="text-xs font-medium tracking-[0.12em] text-o-faint uppercase">Prayers to make up</div>
        <div className="mt-1 text-[52px] leading-none font-semibold tracking-tight tabular-nums">{totalOwed}</div>
        <div className="mt-2 text-sm text-o-muted">
          {store.madeUp > 0
            ? `${store.madeUp} made up so far. May Allah accept them.`
            : "Track missed prayers and tick them off as you make them up."}
        </div>
      </Panel>

      <Panel className="divide-y divide-o-line">
        {FARD_KEYS.map((key) => {
          const owed = store.owed[key] ?? 0;
          return (
            <div key={key} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium">{PRAYER_LABELS[key]}</div>
                <div className="text-xs text-o-faint tabular-nums">{owed} remaining</div>
              </div>
              <button
                type="button"
                onClick={() => change(key, 1)}
                aria-label={`Add a missed ${PRAYER_LABELS[key]}`}
                className="grid h-9 w-9 place-items-center rounded-full bg-o-surface-2 text-o-muted transition active:scale-90"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => change(key, -1)}
                disabled={owed === 0}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition active:scale-95",
                  owed > 0 ? "bg-o-accent text-o-on-accent" : "bg-o-surface-2 text-o-faint"
                )}
              >
                <Minus className="h-3.5 w-3.5" />
                Made up
              </button>
            </div>
          );
        })}
      </Panel>

      <Panel className="p-4">
        <div className="text-sm font-medium">Add whole days</div>
        <div className="mt-0.5 text-xs text-o-faint">Adds one of each prayer per day missed.</div>
        <div className="mt-3 flex gap-2">
          <input
            value={days}
            onChange={(event) => setDays(event.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="Number of days"
            aria-label="Number of days"
            className="h-11 min-w-0 flex-1 rounded-xl bg-o-surface-2 px-3.5 text-sm outline-none placeholder:text-o-faint focus-visible:ring-2 focus-visible:ring-o-accent"
          />
          <button
            type="button"
            onClick={addDays}
            disabled={!days}
            className="h-11 rounded-xl bg-o-text px-4 text-sm font-medium text-o-bg disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </Panel>
    </div>
  );
}
