import { memo } from "react";

import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionCard } from "@/components/orbit/SectionCard";
import { useNow } from "@/hooks/orbit/useNow";
import { hourValue, minutesSinceMidnight, pad } from "@/lib/orbit/time";
import type { PrayerMarker } from "@/lib/orbit/types";

type ChartRow = {
  time: number;
  altitude: number;
  daylight: number;
};

type SolarChartCardProps = {
  chartData: ChartRow[];
  prayerMarkers: PrayerMarker[];
  timeZone: string;
};

function SolarChartCardInner({ chartData, prayerMarkers, timeZone }: SolarChartCardProps) {
  const now = useNow(60000);

  return (
    <SectionCard
      title="Solar altitude and prayer timeline"
      description="The Timeline"
      className="xl:col-span-2"
    >
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 18, right: 18, left: -10, bottom: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />

            <XAxis
              type="number"
              dataKey="time"
              domain={[0, 24]}
              tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }}
              tickFormatter={(value: number | string) => `${pad(Math.floor(Number(value)))}:00`}
            />

            <YAxis tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }} />

            <Tooltip
              contentStyle={{
                background: "#09111f",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                color: "white",
              }}
              labelFormatter={(label) => {
                const num = Number(label ?? 0);
                return `Time ${pad(Math.floor(num))}:${pad(Math.round((num % 1) * 60))}`;
              }}
              formatter={(value) => {
                const num = Number(value ?? 0);
                return [`${num.toFixed(1)} deg`, "Solar altitude"];
              }}
            />

            <Area
              type="monotone"
              dataKey="daylight"
              stroke="none"
              fill="rgba(56,189,248,0.12)"
            />

            <ReferenceLine
              x={minutesSinceMidnight(now, timeZone) / 60}
              stroke="rgba(250,204,21,0.95)"
              strokeDasharray="6 6"
            />

            {prayerMarkers.map((prayer) => (
              <ReferenceLine
                key={prayer.label}
                x={hourValue(prayer.value, timeZone)}
                stroke="rgba(251,191,36,0.24)"
                label={{
                  value: prayer.label,
                  position: "top",
                  fill: "rgba(253,224,71,0.88)",
                  fontSize: 11,
                }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="altitude"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export const SolarChartCard = memo(SolarChartCardInner);
