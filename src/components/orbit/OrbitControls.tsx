import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

import { calculationMethods, locationPresets } from "@/lib/orbit/constants";
import type { MadhabKey, MethodKey, PresetKey } from "@/lib/orbit/types";

type OrbitControlsProps = {
  method: MethodKey;
  madhab: MadhabKey;
  selectedPreset: PresetKey;
  onMethodChange: (value: MethodKey) => void;
  onMadhabChange: (value: MadhabKey) => void;
  onPresetChange: (value: PresetKey) => void;
  onLocateMe: () => void;
};

export function OrbitControls({
  method,
  madhab,
  selectedPreset,
  onMethodChange,
  onMadhabChange,
  onPresetChange,
  onLocateMe,
}: OrbitControlsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select value={method} onValueChange={(v) => onMethodChange(v as MethodKey)}>
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

      <Select value={madhab} onValueChange={(v) => onMadhabChange(v as MadhabKey)}>
        <SelectTrigger className="h-11 rounded-2xl border-cyan-500/15 bg-slate-950/70 text-slate-100 shadow-none">
          <SelectValue placeholder="Madhab" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="shafi">Shafi / Maliki / Hanbali</SelectItem>
          <SelectItem value="hanafi">Hanafi</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={selectedPreset}
        onValueChange={(v) => onPresetChange(v as PresetKey)}
      >
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

      <Button
        onClick={onLocateMe}
        className="h-11 rounded-2xl bg-cyan-500 text-slate-950 shadow-none hover:bg-cyan-400"
      >
        <MapPin className="mr-2 h-4 w-4" />
        Use my location
      </Button>
    </div>
  );
}