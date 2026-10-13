import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-o-line bg-o-surface shadow-[0_1px_2px_rgba(20,20,40,0.04),0_8px_24px_-12px_rgba(20,20,40,0.08)] dark:shadow-none",
        className
      )}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "px-1 pb-2 text-xs font-medium uppercase tracking-[0.12em] text-o-faint",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-medium text-o-text">
        {title}
        <ChevronDown className="orbit-chevron h-4 w-4 text-o-faint transition-transform" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        checked ? "bg-o-accent" : "bg-o-surface-2 ring-1 ring-o-line ring-inset"
      )}
    >
      <span
        className={cn(
          "absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn("flex rounded-xl bg-o-surface-2 p-1", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 flex-1 rounded-lg px-2 text-sm font-medium whitespace-nowrap transition",
            value === option.value
              ? "bg-o-surface text-o-text shadow-sm"
              : "text-o-muted hover:text-o-text"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A labelled row inside a settings-style list. */
export function Row({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-14 items-center justify-between gap-4 px-4 py-2.5", className)}>
      <div className="min-w-0">
        <div className="text-sm text-o-text">{label}</div>
        {hint ? <div className="mt-0.5 text-xs text-o-faint">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function NativeSelect<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}) {
  return (
    <div className="relative max-w-[60%]">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-9 w-full appearance-none truncate rounded-lg bg-o-surface-2 pr-8 pl-3 text-right text-sm text-o-text outline-none focus-visible:ring-2 focus-visible:ring-o-accent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-o-faint" />
    </div>
  );
}
