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
  now: Date;
};

export function SolarChartCard({
  chartData,
  prayerMarkers,
  now,
}: SolarChartCardProps) {
  return (
    <SectionCard
      title="Solar altitude and prayer timeline"
      description="Live time marker, prayer references, and solar altitude curve for the selected location."
      className="xl:col-span-2"
    >
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 18, right: 18, left: -10, bottom: 8 }}>
            <CartesianGrid stroke="rgba(34,211,238,0.12)" strokeDasharray="4 4" />

            <XAxis
              type="number"
              dataKey="time"
              domain={[0, 24]}
              tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }}
              tickFormatter={(v: number | string) => `${pad(Math.floor(Number(v)))}:00`}
            />

            <YAxis tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }} />

            <Tooltip
              contentStyle={{
                background: "#020817",
                border: "1px solid rgba(34,211,238,0.18)",
                borderRadius: 18,
                color: "white",
              }}
              labelFormatter={(label) => {
                const num = Number(label ?? 0);
                return `Time ${pad(Math.floor(num))}:${pad(Math.round((num % 1) * 60))}`;
              }}
              formatter={(value) => {
                const num = Number(value ?? 0);
                return [`${num.toFixed(1)}°`, "Solar altitude"];
              }}
            />

            <Area
              type="monotone"
              dataKey="daylight"
              stroke="none"
              fill="rgba(34,211,238,0.08)"
            />

            <ReferenceLine
              x={minutesSinceMidnight(now) / 60}
              stroke="rgba(250,204,21,0.95)"
              strokeDasharray="6 6"
            />

            {prayerMarkers.map((p) => (
              <ReferenceLine
                key={p.label}
                x={hourValue(p.value)}
                stroke="rgba(34,211,238,0.3)"
                label={{
                  value: p.label,
                  position: "top",
                  fill: "rgba(165,243,252,0.9)",
                  fontSize: 11,
                }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="altitude"
              stroke="#22d3ee"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}