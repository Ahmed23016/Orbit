import { useEffect, useMemo, useState } from "react";
import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from "adhan";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Moon,
  Sunrise,
  Sunset,
  Clock3,
  Compass,
  CalendarDays,
  Sparkles,
  Radar,
} from "lucide-react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hourValue(date: Date) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function minuteDiff(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

function formatDuration(totalMinutes: number) {
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
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
    age: Number(age.toFixed(1)),
    illumination: Math.round(illumination * 100),
    phaseName,
    phase,
  };
}

const calculationMethods = {
  mwl: { label: "Muslim World League", build: () => CalculationMethod.MuslimWorldLeague() },
  egyptian: { label: "Egyptian", build: () => CalculationMethod.Egyptian() },
  karachi: { label: "Karachi", build: () => CalculationMethod.Karachi() },
  umm: { label: "Umm al-Qura", build: () => CalculationMethod.UmmAlQura() },
  dubai: { label: "Dubai", build: () => CalculationMethod.Dubai() },
  qatar: { label: "Qatar", build: () => CalculationMethod.Qatar() },
  singapore: { label: "Singapore", build: () => CalculationMethod.Singapore() },
  turkey: { label: "Turkey", build: () => CalculationMethod.Turkey() },
  tehran: { label: "Tehran", build: () => CalculationMethod.Tehran() },
  moonsighting: { label: "Moonsighting Committee", build: () => CalculationMethod.MoonsightingCommittee() },
} as const;

type MethodKey = keyof typeof calculationMethods;

type MadhabKey = "shafi" | "hanafi";

type PresetKey = "amsterdam" | "london" | "makkah" | "istanbul" | "newyork" | "jakarta";

const locationPresets: Record<PresetKey, { label: string; latitude: number; longitude: number }> = {
  amsterdam: { label: "Amsterdam", latitude: 52.3676, longitude: 4.9041 },
  london: { label: "London", latitude: 51.5072, longitude: -0.1276 },
  makkah: { label: "Makkah", latitude: 21.3891, longitude: 39.8579 },
  istanbul: { label: "Istanbul", latitude: 41.0082, longitude: 28.9784 },
  newyork: { label: "New York", latitude: 40.7128, longitude: -74.006 },
  jakarta: { label: "Jakarta", latitude: -6.2088, longitude: 106.8456 },
};

function buildPrayerTimes(date: Date, latitude: number, longitude: number, method: MethodKey, madhab: MadhabKey) {
  const coordinates = new Coordinates(latitude, longitude);
  const params = calculationMethods[method].build();
  params.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  const prayerTimes = new PrayerTimes(coordinates, date, params);

  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
  };
}

function countdown(target: Date, now: Date) {
  const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function qiblaDirection(latitude: number, longitude: number) {
  const makkahLat = degToRad(21.4225);
  const makkahLon = degToRad(39.8262);
  const lat = degToRad(latitude);
  const lon = degToRad(longitude);
  const dLon = makkahLon - lon;
  const y = Math.sin(dLon);
  const x = Math.cos(lat) * Math.tan(makkahLat) - Math.sin(lat) * Math.cos(dLon);
  const brng = (radToDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(brng);
}

function nextPrayerInfo(prayers: { label: string; value: Date }[], now: Date) {
  const upcoming = prayers.find((p) => p.value.getTime() > now.getTime());
  if (upcoming) return upcoming;
  return { label: "Fajr", value: new Date(prayers[0].value.getTime() + 86400000) };
}

export default function Orbit() {
  const [coords, setCoords] = useState(locationPresets.amsterdam);
  const [method, setMethod] = useState<MethodKey>("mwl");
  const [madhab, setMadhab] = useState<MadhabKey>("shafi");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentDay = useMemo(() => startOfDay(now), [now]);

  const prayers = useMemo(() => buildPrayerTimes(currentDay, coords.latitude, coords.longitude, method, madhab), [currentDay, coords.latitude, coords.longitude, method, madhab]);
  const moon = useMemo(() => computeMoonData(currentDay), [currentDay]);

  const prayerMarkers = useMemo(
    () => [
      { label: "Fajr", value: prayers.fajr },
      { label: "Sunrise", value: prayers.sunrise },
      { label: "Dhuhr", value: prayers.dhuhr },
      { label: "Asr", value: prayers.asr },
      { label: "Maghrib", value: prayers.maghrib },
      { label: "Isha", value: prayers.isha },
    ],
    [prayers]
  );

  const nextPrayer = useMemo(() => nextPrayerInfo(prayerMarkers, now), [prayerMarkers, now]);

  const chartData = useMemo(() => {
    const rows: { time: number; altitude: number; daylight: number }[] = [];
    for (let m = 0; m <= 1440; m += 10) {
      const altitude = solarAltitude(currentDay, coords.latitude, coords.longitude, m);
      rows.push({
        time: m / 60,
        altitude,
        daylight: Math.max(altitude, 0),
      });
    }
    return rows;
  }, [currentDay, coords.latitude, coords.longitude]);

  const stats = useMemo(() => {
    const daylightMinutes = minuteDiff(prayers.maghrib, prayers.sunrise);
    const fastingMinutes = minuteDiff(prayers.maghrib, prayers.fajr);
    const nightMinutes = 1440 - daylightMinutes;
    const qibla = qiblaDirection(coords.latitude, coords.longitude);
    const solarNoon = formatTime(prayers.dhuhr);
    return {
      daylightMinutes,
      fastingMinutes,
      nightMinutes,
      qibla,
      solarNoon,
    };
  }, [prayers, coords]);

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
      () => alert("Could not get your location.")
    );
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,#041a33_0%,#020b18_42%,#00040d_100%)] text-slate-100">
      <div className="w-full px-4 py-4 md:px-6 lg:px-8">
        <div className="mb-4 rounded-[28px] border border-cyan-500/10 bg-cyan-400/5 p-4 shadow-[0_0_0_1px_rgba(6,182,212,0.04),0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl md:p-5">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr] xl:items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.45em] text-cyan-300/80">
                <Radar className="h-4 w-4" />
                Orbital prayer intelligence
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Orbit</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
                  . . .
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full border border-cyan-500/20 bg-slate-950/50 px-3 py-1 text-cyan-100 hover:bg-slate-950/50">
                  <MapPin className="mr-1 h-3.5 w-3.5" /> {coords.label}
                </Badge>
                <Badge className="rounded-full border border-cyan-500/20 bg-slate-950/50 px-3 py-1 text-cyan-100 hover:bg-slate-950/50">
                  {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                </Badge>
                <Badge className="rounded-full border border-cyan-500/20 bg-slate-950/50 px-3 py-1 text-cyan-100 hover:bg-slate-950/50">
                  <CalendarDays className="mr-1 h-3.5 w-3.5" /> {now.toLocaleDateString()}
                </Badge>
                <Badge className="rounded-full border border-cyan-500/20 bg-slate-950/50 px-3 py-1 text-cyan-100 hover:bg-slate-950/50">
                  <Clock3 className="mr-1 h-3.5 w-3.5" /> Now {formatTime(now)}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={method} onValueChange={(v: MethodKey) => setMethod(v)}>
                <SelectTrigger className="h-11 rounded-2xl border-cyan-500/15 bg-slate-950/70 text-slate-100 shadow-none">
                  <SelectValue placeholder="Calculation method" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(calculationMethods).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={madhab} onValueChange={(v: MadhabKey) => setMadhab(v)}>
                <SelectTrigger className="h-11 rounded-2xl border-cyan-500/15 bg-slate-950/70 text-slate-100 shadow-none">
                  <SelectValue placeholder="Madhab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shafi">Shafi / Maliki / Hanbali</SelectItem>
                  <SelectItem value="hanafi">Hanafi</SelectItem>
                </SelectContent>
              </Select>

              <Select value={Object.entries(locationPresets).find(([, value]) => value.label === coords.label)?.[0] ?? "amsterdam"} onValueChange={(v: PresetKey) => setCoords(locationPresets[v])}>
                <SelectTrigger className="h-11 rounded-2xl border-cyan-500/15 bg-slate-950/70 text-slate-100 shadow-none">
                  <SelectValue placeholder="Preset city" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(locationPresets).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={locateMe} className="h-11 rounded-2xl bg-cyan-500 text-slate-950 shadow-none hover:bg-cyan-400">
                <MapPin className="mr-2 h-4 w-4" /> Use my location
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Fajr", value: formatTime(prayers.fajr), icon: Clock3 },
            { title: "Sunrise", value: formatTime(prayers.sunrise), icon: Sunrise },
            { title: "Dhuhr", value: formatTime(prayers.dhuhr), icon: Clock3 },
            { title: "Asr", value: formatTime(prayers.asr), icon: Clock3 },
            { title: "Maghrib", value: formatTime(prayers.maghrib), icon: Sunset },
            { title: "Isha", value: formatTime(prayers.isha), icon: Clock3 },
            { title: "Moon phase", value: moon.phaseName, icon: Moon },
            { title: "Moon light", value: `${moon.illumination}%`, icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-[24px] border border-cyan-500/10 bg-slate-950/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_16px_36px_rgba(0,0,0,0.28)]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/85">
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-semibold tracking-tight text-white">{item.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1.1fr_1.1fr]">
          <Card className="rounded-[30px] border border-cyan-500/10 bg-slate-950/75 xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Solar altitude and prayer timeline</CardTitle>
              <CardDescription className="text-slate-400">
                Live time marker, prayer references, and solar altitude curve for the selected location.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    <Area type="monotone" dataKey="daylight" stroke="none" fill="rgba(34,211,238,0.08)" />
                    <ReferenceLine x={minutesSinceMidnight(now) / 60} stroke="rgba(250,204,21,0.95)" strokeDasharray="6 6" />
                    {prayerMarkers.map((p) => (
                      <ReferenceLine
                        key={p.label}
                        x={hourValue(p.value)}
                        stroke="rgba(34,211,238,0.3)"
                        label={{ value: p.label, position: "top", fill: "rgba(165,243,252,0.9)", fontSize: 11 }}
                      />
                    ))}
                    <Line type="monotone" dataKey="altitude" stroke="#22d3ee" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-cyan-500/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Next prayer</CardTitle>
              <CardDescription className="text-slate-400">Live countdown to the next upcoming prayer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="text-5xl font-semibold tracking-tight text-white">{nextPrayer.label}</div>
                <div className="mt-2 text-2xl text-cyan-300">{formatTime(nextPrayer.value)}</div>
              </div>
              <div className="rounded-3xl border border-cyan-500/10 bg-cyan-500/[0.05] p-4">
                <div className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">Countdown</div>
                <div className="mt-2 text-4xl font-semibold text-white">{countdown(nextPrayer.value, now)}</div>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-4">
                  <span className="text-slate-400">Method</span>
                  <span className="text-right font-medium text-white">{calculationMethods[method].label}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-4">
                  <span className="text-slate-400">Madhab</span>
                  <span className="font-medium text-white">{madhab === "hanafi" ? "Hanafi" : "Shafi / Maliki / Hanbali"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-[28px] border border-cyan-500/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-white">Daylight window</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{formatDuration(stats.daylightMinutes)}</div>
              <p className="mt-2 text-sm text-slate-400">From sunrise to maghrib.</p>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-cyan-500/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-white">Fasting window</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{formatDuration(stats.fastingMinutes)}</div>
              <p className="mt-2 text-sm text-slate-400">From fajr to maghrib.</p>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-cyan-500/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-white">Qibla bearing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Compass className="h-7 w-7 text-cyan-300" />
                <div className="text-3xl font-semibold text-white">{stats.qibla}°</div>
              </div>
              <p className="mt-2 text-sm text-slate-400">Approximate bearing from true north toward Makkah.</p>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-cyan-500/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-white">Moon data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-3">
                <span className="text-slate-400">Phase</span>
                <span className="font-medium text-white">{moon.phaseName}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-3">
                <span className="text-slate-400">Illumination</span>
                <span className="font-medium text-white">{moon.illumination}%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-3">
                <span className="text-slate-400">Age</span>
                <span className="font-medium text-white">{moon.age} days</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <Card className="rounded-[30px] border border-cyan-500/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Prayer spacing</CardTitle>
              <CardDescription className="text-slate-400">How much time sits between the main events of the day.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { name: "Fajr → Sunrise", minutes: minuteDiff(prayers.sunrise, prayers.fajr) },
                      { name: "Sunrise → Dhuhr", minutes: minuteDiff(prayers.dhuhr, prayers.sunrise) },
                      { name: "Dhuhr → Asr", minutes: minuteDiff(prayers.asr, prayers.dhuhr) },
                      { name: "Asr → Maghrib", minutes: minuteDiff(prayers.maghrib, prayers.asr) },
                      { name: "Maghrib → Isha", minutes: minuteDiff(prayers.isha, prayers.maghrib) },
                    ]}
                    margin={{ top: 10, right: 10, left: -18, bottom: 10 }}
                  >
                    <CartesianGrid stroke="rgba(34,211,238,0.12)" strokeDasharray="4 4" />
                    <XAxis dataKey="name" tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "#020817", border: "1px solid rgba(34,211,238,0.18)", borderRadius: 18 }}
                      formatter={(value) => [`${Number(value ?? 0)} min`, "Duration"]}
                    />
                    <Area type="monotone" dataKey="minutes" stroke="#22d3ee" fill="rgba(34,211,238,0.18)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-cyan-500/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Daily summary</CardTitle>
              <CardDescription className="text-slate-400">Useful numbers derived from today’s sky and prayer schedule.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                { label: "Solar noon reference", value: stats.solarNoon },
                { label: "Total night duration", value: formatDuration(stats.nightMinutes) },
                { label: "Current moon illumination", value: `${moon.illumination}%` },
                { label: "Next event countdown", value: countdown(nextPrayer.value, now) },
                { label: "Current method", value: calculationMethods[method].label },
                { label: "Selected city", value: coords.label },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-4">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="max-w-[55%] text-right font-medium text-white">{row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
