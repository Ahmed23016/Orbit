import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type PrayerGridItem = {
  title: string;
  value: string;
  icon: LucideIcon;
};

type PrayerGridProps = {
  items: PrayerGridItem[];
};

export function PrayerGrid({ items }: PrayerGridProps) {
  return (
    <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Card
            key={item.title}
            className="rounded-[20px] border border-cyan-500/10 bg-slate-950/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_16px_36px_rgba(0,0,0,0.28)] md:rounded-[24px]"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/85">
                <Icon className="h-4 w-4" />
                {item.title}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
                {item.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
