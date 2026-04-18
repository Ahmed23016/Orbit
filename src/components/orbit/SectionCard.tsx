import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardProps = {
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  className = "",
  contentClassName = "",
  children,
}: SectionCardProps) {
  return (
    <Card
      className={`rounded-[24px] border border-white/10 bg-slate-950/68 shadow-[0_24px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl md:rounded-[30px] ${className}`}
    >
      <CardHeader>
        <CardTitle className="text-xl text-white md:text-2xl">{title}</CardTitle>
        {description ? (
          <CardDescription className="max-w-2xl text-slate-400">{description}</CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
