import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

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
    <Card className={`rounded-[30px] border border-cyan-500/10 bg-slate-950/75 ${className}`}>
      <CardHeader>
        <CardTitle className="text-2xl text-white">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-slate-400">{description}</CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}