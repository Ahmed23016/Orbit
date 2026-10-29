import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { Panel, Segmented } from "@/components/orbit/primitives";
import { todayStamp, useStoredState, vibrate } from "@/hooks/orbit/useStoredState";
import { cn } from "@/lib/utils";

type Phrase = { id: string; arabic: string; latin: string; meaning: string };

const PHRASES: Phrase[] = [
  { id: "subhan", arabic: "سُبْحَانَ اللَّهِ", latin: "SubḥānAllāh", meaning: "Glory be to Allah" },
  { id: "hamd", arabic: "الْحَمْدُ لِلَّهِ", latin: "Alḥamdulillāh", meaning: "All praise is for Allah" },
  { id: "akbar", arabic: "اللَّهُ أَكْبَرُ", latin: "Allāhu akbar", meaning: "Allah is the Greatest" },
  { id: "tahlil", arabic: "لَا إِلَهَ إِلَّا اللَّهُ", latin: "Lā ilāha illā Allāh", meaning: "There is no god but Allah" },
  { id: "istighfar", arabic: "أَسْتَغْفِرُ اللَّهَ", latin: "Astaghfirullāh", meaning: "I seek Allah's forgiveness" },
  {
    id: "salawat",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ",
    latin: "Allāhumma ṣalli ʿalā Muḥammad",
    meaning: "O Allah, send blessings upon Muhammad",
  },
];

const AFTER_PRAYER = [
  { phrase: PHRASES[0], target: 33 },
  { phrase: PHRASES[1], target: 33 },
  { phrase: PHRASES[2], target: 34 },
];

const FREE_TARGETS = [33, 99, 100, 0] as const;

type TasbihStore = { day: string; today: number; total: number };

const RING = 2 * Math.PI * 96;

export function TasbihCounter() {
  const [mode, setMode] = useState<"after" | "free">("after");
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const [freePhrase, setFreePhrase] = useState(PHRASES[3].id);
  const [freeTarget, setFreeTarget] = useState<(typeof FREE_TARGETS)[number]>(100);
  const [stats, setStats] = useStoredState<TasbihStore>("orbit:tasbih", {
    day: todayStamp(),
    today: 0,
    total: 0,
  });

  const afterDone = mode === "after" && step >= AFTER_PRAYER.length;
  const current =
    mode === "after"
      ? AFTER_PRAYER[Math.min(step, AFTER_PRAYER.length - 1)]
      : { phrase: PHRASES.find((p) => p.id === freePhrase) ?? PHRASES[0], target: freeTarget };
  const target = current.target;
  const progress = afterDone ? 1 : target > 0 ? Math.min(1, count / target) : (count % 33) / 33;
  const todayCount = stats.day === todayStamp() ? stats.today : 0;

  const reset = () => {
    setStep(0);
    setCount(0);
  };

  const tap = () => {
    if (afterDone) {
      reset();
      return;
    }

    const next = count + 1;
    setStats((s) => ({
      day: todayStamp(),
      today: (s.day === todayStamp() ? s.today : 0) + 1,
      total: s.total + 1,
    }));

    if (target > 0 && next >= target) {
      vibrate([30, 60, 30]);
      if (mode === "after") {
        setStep(step + 1);
        setCount(0);
      } else {
        setCount(next);
      }
      return;
    }

    vibrate(8);
    setCount(next);
  };

  const shownCount = afterDone ? 100 : count;

  return (
    <div className="grid grid-cols-1 gap-4">
      <Segmented
        value={mode}
        onChange={(value) => {
          setMode(value);
          reset();
        }}
        options={[
          { value: "after", label: "After prayer" },
          { value: "free", label: "Free dhikr" },
        ]}
      />

      {mode === "free" ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {PHRASES.map((phrase) => (
            <button
              key={phrase.id}
              type="button"
              onClick={() => {
                setFreePhrase(phrase.id);
                setCount(0);
              }}
              className={cn(
                "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition",
                freePhrase === phrase.id ? "bg-o-text text-o-bg" : "bg-o-surface-2 text-o-muted"
              )}
            >
              {phrase.latin}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {AFTER_PRAYER.map((item, index) => (
            <div
              key={item.phrase.id}
              className={cn(
                "rounded-xl py-2 text-center text-xs font-medium transition",
                index < step
                  ? "bg-o-accent text-o-on-accent"
                  : index === step
                    ? "bg-o-accent-soft text-o-accent"
                    : "bg-o-surface-2 text-o-faint"
              )}
            >
              {item.phrase.latin} · {item.target}
            </div>
          ))}
        </div>
      )}

      <Panel className="flex flex-col items-center px-4 pt-6 pb-5">
        <button
          type="button"
          onClick={tap}
          aria-label={afterDone ? "Start again" : `Count ${current.phrase.latin}`}
          className="relative grid h-[248px] w-[248px] place-items-center rounded-full transition active:scale-[0.97] active:duration-75"
        >
          <svg viewBox="0 0 220 220" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="110" cy="110" r="96" fill="none" strokeWidth="10" className="stroke-o-surface-2" />
            {progress > 0 ? (
              <circle
                cx="110"
                cy="110"
                r="96"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${RING * progress} ${RING}`}
                className="stroke-o-accent transition-[stroke-dasharray] duration-200"
              />
            ) : null}
          </svg>
          <span className="absolute inset-6 rounded-full bg-o-accent-soft" />
          <span className="relative flex flex-col items-center px-6 text-center">
            {afterDone ? (
              <>
                <span className="font-arabic text-[26px] leading-snug" dir="rtl" lang="ar">
                  لَا إِلَهَ إِلَّا اللَّهُ
                </span>
                <span className="mt-2 text-sm font-semibold text-o-accent">Complete · 100</span>
                <span className="mt-1 text-xs text-o-muted">Tap to start again</span>
              </>
            ) : (
              <>
                <span className="font-arabic text-[28px] leading-snug" dir="rtl" lang="ar">
                  {current.phrase.arabic}
                </span>
                <span className="mt-1 text-[44px] leading-none font-semibold tracking-tight tabular-nums">
                  {shownCount}
                </span>
                <span className="mt-1 text-xs text-o-muted tabular-nums">
                  {target > 0 ? `of ${target}` : "no limit"}
                </span>
              </>
            )}
          </span>
        </button>

        <div className="mt-4 text-center">
          <div className="text-[15px] font-semibold">{afterDone ? "Lā ilāha illā Allāh" : current.phrase.latin}</div>
          <div className="mt-0.5 text-sm text-o-muted">
            {afterDone ? "End with the tahlīl to complete one hundred." : current.phrase.meaning}
          </div>
        </div>

        <div className="mt-5 flex w-full items-center justify-between gap-3">
          <div className="text-xs text-o-faint tabular-nums">
            {todayCount.toLocaleString()} today · {stats.total.toLocaleString()} all time
          </div>
          <div className="flex items-center gap-2">
            {mode === "free" ? (
              <div className="flex rounded-lg bg-o-surface-2 p-0.5">
                {FREE_TARGETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setFreeTarget(value);
                      setCount(0);
                    }}
                    className={cn(
                      "h-7 rounded-md px-2 text-xs font-medium",
                      freeTarget === value ? "bg-o-surface text-o-text shadow-sm" : "text-o-muted"
                    )}
                  >
                    {value === 0 ? "∞" : value}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={reset}
              aria-label="Reset counter"
              className="grid h-8 w-8 place-items-center rounded-full bg-o-surface-2 text-o-muted transition active:scale-90"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
