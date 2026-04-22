import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardProps = {
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  compact?: boolean;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  className = "",
  contentClassName = "",
  compact = false,
  children,
}: SectionCardProps) {
  return (
    <Card
      className={cn(
        "orbit-card rounded-[24px] border border-white/10 bg-slate-950/88 shadow-[0_18px_48px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)] md:rounded-[30px]",
        compact && "rounded-[22px] bg-slate-950/92",
        className
      )}
    >
      <CardHeader className={cn(compact && "pb-2")}>
        <CardTitle
          className={cn(
            "text-xl text-white md:text-2xl",
            compact && "text-sm font-medium tracking-[0.02em] text-slate-300 md:text-sm"
          )}
        >
          {title}
        </CardTitle>
        {description && !compact ? (
          <CardDescription className="max-w-2xl text-slate-400">{description}</CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
