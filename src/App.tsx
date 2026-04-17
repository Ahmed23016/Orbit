import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Moon, Sunrise, Sunset, Clock3, MapPin, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function solarDeclination(n: number) {
  return 23.44 * Math.sin(degToRad((360 / 365) * (n - 81)));
}

function equationOfTime(n: number) {
  const B = degToRad((360 / 365) * (n - 81));
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

function solarNoonMinutes(date: Date, longitude: number, timezoneOffsetMinutes: number) {
  const n = dayOfYear(date);
  const eot = equationOfTime(n);
  return 720 - 4 * longitude - eot - timezoneOffsetMinutes;
}

function solarAltitude(date: Date, latitude: number, longitude: number, minuteOfDay: number) {
  const n = dayOfYear(date);
  const decl = degToRad(solarDeclination(n));
  const lat = degToRad(latitude);
  const tzOffset = -date.getTimezoneOffset();
  const noon = solarNoonMinutes(date, longitude, tzOffset);
  const hourAngle = degToRad((minuteOfDay - noon) / 4);

  const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  return radToDeg(Math.asin(clamp(sinAlt, -1, 1)));
}

function hourAngleForAltitude(latitude: number, declination: number, altitude: number) {
  const lat = degToRad(latitude);
  const dec = degToRad(declination);
  const alt = degToRad(altitude);

  const num = Math.sin(alt) - Math.sin(lat) * Math.sin(dec);
  const den = Math.cos(lat) * Math.cos(dec);
  const cosH = clamp(num / den, -1, 1);
  return radToDeg(Math.acos(cosH));
}

function minutesToDate(base: Date, minutes: number) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(Math.round(minutes));
  return d;
}

function computePrayerTimes(date: Date, latitude: number, longitude: number, madhab: "shafi" | "hanafi") {
  const n = dayOfYear(date);
  const decl = solarDeclination(n);
  const tzOffset = -date.getTimezoneOffset();
  const noon = solarNoonMinutes(date, longitude, tzOffset);

  const sunriseHA = hourAngleForAltitude(latitude, decl, -0.833);
  const fajrHA = hourAngleForAltitude(latitude, decl, -18);
  const ishaHA = hourAngleForAltitude(latitude, decl, -18);

  const lat = degToRad(latitude);
  const dec = degToRad(decl);
  const shadowFactor = madhab === "hanafi" ? 2 : 1;
  const asrAltitude = radToDeg(Math.atan(1 / (shadowFactor + Math.tan(Math.abs(lat - dec)))));
  const asrHA = hourAngleForAltitude(latitude, decl, asrAltitude);

  const sunrise = noon - sunriseHA * 4;
  const maghrib = noon + sunriseHA * 4;
  const fajr = noon - fajrHA * 4;
  const isha = noon + ishaHA * 4;
  const dhuhr = noon + 2;
  const asr = noon + asrHA * 4;

  return {
    fajr: minutesToDate(date, fajr),
    sunrise: minutesToDate(date, sunrise),
    dhuhr: minutesToDate(date, dhuhr),
    asr: minutesToDate(date, asr),
    maghrib: minutesToDate(date, maghrib),
    isha: minutesToDate(date, isha),
  };
}

function computeMoonData(date: Date) {
  const cycle = 29.53058867;
  const knownNewMoon = new Date("2024-01-11T11:57:00Z").getTime();
  const daysSince = (date.getTime() - knownNewMoon) / 86400000;
  const age = ((daysSince % cycle) + cycle) % cycle;
  const phase = age / cycle;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  let phaseName = "New Moon";
  if (phase < 0.03 || phase > 0.97) phaseName = "New Moon";
  else if (phase < 0.22) phaseName = "Waxing Crescent";
  else if (phase < 0.28) phaseName = "First Quarter";
  else if (phase < 0.47) phaseName = "Waxing Gibbous";
  else if (phase < 0.53) phaseName = "Full Moon";
  else if (phase < 0.72) phaseName = "Waning Gibbous";
  else if (phase < 0.78) phaseName = "Last Quarter";
  else phaseName = "Waning Crescent";

  return {
    age: age.toFixed(1),
    illumination: Math.round(illumination * 100),
    phaseName,
  };
}

function minuteNow() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

export default function SalahScopeApp() {
  const [coords, setCoords] = useState({ latitude: 52.3676, longitude: 4.9041, label: "Amsterdam" });
  const [madhab, setMadhab] = useState<"shafi" | "hanafi">("shafi");
  const [nowMinute, setNowMinute] = useState(minuteNow());
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNowMinute(minuteNow());
      setToday(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "Current location",
        });
      },
      () => {
        alert("Locatie ophalen is mislukt.");
      }
    );
  };

  const prayers = useMemo(() => computePrayerTimes(today, coords.latitude, coords.longitude, madhab), [today, coords, madhab]);
  const moon = useMemo(() => computeMoonData(today), [today]);

  const chartData = useMemo(() => {
    const rows = [] as { time: number; altitude: number }[];
    for (let m = 0; m <= 1440; m += 10) {
      rows.push({
        time: m / 60,
        altitude: solarAltitude(today, coords.latitude, coords.longitude, m),
      });
    }
    return rows;
  }, [today, coords]);

  const prayerMarkers = [
    { label: "Fajr", value: prayers.fajr },
    { label: "Sunrise", value: prayers.sunrise },
    { label: "Dhuhr", value: prayers.dhuhr },
    { label: "Asr", value: prayers.asr },
    { label: "Maghrib", value: prayers.maghrib },
    { label: "Isha", value: prayers.isha },
  ];

  const nextPrayer = prayerMarkers.find((p) => p.value.getTime() > today.getTime()) ?? prayerMarkers[0];

  return (
    <div className="min-h-screen bg-[#020817] text-cyan-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6 shadow-2xl shadow-cyan-900/20 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 text-sm uppercase tracking-[0.35em] text-cyan-400/70">Astronomical prayer dashboard</div>
              <h1 className="text-4xl font-semibold tracking-[0.2em] text-cyan-300 md:text-5xl">SalahScope</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={madhab} onValueChange={(v: "shafi" | "hanafi") => setMadhab(v)}>
                <SelectTrigger className="w-[170px] border-cyan-500/30 bg-slate-950/70 text-cyan-100">
                  <SelectValue placeholder="Madhab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shafi">Shafi / Maliki / Hanbali</SelectItem>
                  <SelectItem value="hanafi">Hanafi</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={locateMe} className="rounded-2xl bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                <MapPin className="mr-2 h-4 w-4" />
                Gebruik locatie
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-cyan-100/80">
            <Badge variant="secondary" className="rounded-full border border-cyan-500/20 bg-slate-900/80 px-3 py-1 text-cyan-200">
              {coords.label}
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-cyan-500/20 bg-slate-900/80 px-3 py-1 text-cyan-200">
              {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-cyan-500/20 bg-slate-900/80 px-3 py-1 text-cyan-200">
              {today.toLocaleDateString()}
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-cyan-500/20 bg-slate-900/80 px-3 py-1 text-cyan-200">
              Nu {formatTime(today)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Fajr", value: formatTime(prayers.fajr), icon: Clock3 },
            { title: "Sunrise", value: formatTime(prayers.sunrise), icon: Sunrise },
            { title: "Dhuhr", value: formatTime(prayers.dhuhr), icon: Clock3 },
            { title: "Asr", value: formatTime(prayers.asr), icon: Clock3 },
            { title: "Maghrib", value: formatTime(prayers.maghrib), icon: Sunset },
            { title: "Isha", value: formatTime(prayers.isha), icon: Clock3 },
            { title: "Moon Phase", value: moon.phaseName, icon: Moon },
            { title: "Moon Light", value: `${moon.illumination}%`, icon: RefreshCw },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-3xl border-cyan-500/20 bg-slate-950/70 shadow-xl shadow-cyan-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-cyan-300/70">
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-cyan-100">{item.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card className="rounded-3xl border-cyan-500/20 bg-slate-950/70 shadow-xl shadow-cyan-950/20">
            <CardHeader>
              <CardTitle className="text-cyan-200">Sun altitude graph</CardTitle>
              <div className="text-sm text-cyan-300/60">Gebedstijden op de dagcurve met live tijdmarker</div>
            </CardHeader>
            <CardContent>
              <div className="h-[460px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid stroke="rgba(34,211,238,0.15)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "rgba(207,250,254,0.75)", fontSize: 12 }}
                      tickFormatter={(v) => `${pad(Math.floor(v))}:00`}
                      domain={[0, 24]}
                      type="number"
                    />
                    <YAxis tick={{ fill: "rgba(207,250,254,0.75)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "#020817", border: "1px solid rgba(34,211,238,0.25)", borderRadius: 16 }}
                      labelFormatter={(v) => `Tijd ${pad(Math.floor(Number(v)))}:${pad(Math.round((Number(v) % 1) * 60))}`}
                      formatter={(value: number) => [`${value.toFixed(1)}°`, "Zonhoogte"]}
                    />
                    <ReferenceLine x={nowMinute / 60} stroke="rgba(250,204,21,0.9)" strokeDasharray="6 6" />
                    {prayerMarkers.map((p) => (
                      <ReferenceLine
                        key={p.label}
                        x={p.value.getHours() + p.value.getMinutes() / 60}
                        stroke="rgba(34,211,238,0.35)"
                        label={{ value: p.label, position: "top", fill: "rgba(165,243,252,0.9)", fontSize: 11 }}
                      />
                    ))}
                    <Line type="monotone" dataKey="altitude" stroke="#22d3ee" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="rounded-3xl border-cyan-500/20 bg-slate-950/70 shadow-xl shadow-cyan-950/20">
              <CardHeader>
                <CardTitle className="text-cyan-200">Next prayer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-cyan-100">{nextPrayer.label}</div>
                <div className="mt-2 text-lg text-cyan-300">{formatTime(nextPrayer.value)}</div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-cyan-500/20 bg-slate-950/70 shadow-xl shadow-cyan-950/20">
              <CardHeader>
                <CardTitle className="text-cyan-200">Moon data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-cyan-100/85">
                <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-3">
                  <span>Fase</span>
                  <span className="font-medium">{moon.phaseName}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-3">
                  <span>Illuminatie</span>
                  <span className="font-medium">{moon.illumination}%</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-3">
                  <span>Leeftijd maan</span>
                  <span className="font-medium">{moon.age} dagen</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
