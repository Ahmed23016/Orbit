import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionCard } from "@/components/orbit/SectionCard";

type SpacingRow = {
  name: string;
  minutes: number;
};

type PrayerSpacingCardProps = {
  spacingData: SpacingRow[];
};

export function PrayerSpacingCard({ spacingData }: PrayerSpacingCardProps) {
  return (
    <SectionCard
      title="Prayer spacing"
      description="How much time sits between the prayers of the day."
    >
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={spacingData}
            margin={{ top: 10, right: 10, left: -18, bottom: 10 }}
          >
            <CartesianGrid stroke="rgba(34,211,238,0.12)" strokeDasharray="4 4" />
            <XAxis
              dataKey="name"
              tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }}
            />
            <YAxis tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "#020817",
                border: "1px solid rgba(34,211,238,0.18)",
                borderRadius: 18,
              }}
              formatter={(value) => [`${Number(value ?? 0)} min`, "Duration"]}
            />
            <Area
              type="monotone"
              dataKey="minutes"
              stroke="#22d3ee"
              fill="rgba(34,211,238,0.18)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}