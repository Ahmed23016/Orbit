import { AdhkarList } from "@/components/orbit/AdhkarList";
import { Segmented } from "@/components/orbit/primitives";
import { QadaCounter } from "@/components/orbit/QadaCounter";
import { TasbihCounter } from "@/components/orbit/TasbihCounter";
import type { AdhkarSession } from "@/lib/orbit/adhkar";

export type PracticeSection = "tasbih" | "adhkar" | "qada";

const INTROS: Record<PracticeSection, string> = {
  tasbih: "Tap the circle to count. Your phone vibrates at each milestone.",
  adhkar: "The morning and evening remembrances, with their sources.",
  qada: "Keep track of missed prayers you are making up.",
};

export function PracticeView({
  section,
  onSectionChange,
  adhkarSession,
}: {
  section: PracticeSection;
  onSectionChange: (section: PracticeSection) => void;
  adhkarSession: AdhkarSession;
}) {
  return (
    <div className="orbit-fade grid grid-cols-1 gap-4">
      <header className="pt-1">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">Practice</h1>
        <p className="mt-0.5 text-sm text-o-muted">{INTROS[section]}</p>
      </header>

      <Segmented
        value={section}
        onChange={onSectionChange}
        options={[
          { value: "tasbih", label: "Tasbīḥ" },
          { value: "adhkar", label: "Adhkār" },
          { value: "qada", label: "Qaḍāʾ" },
        ]}
      />

      {section === "tasbih" ? <TasbihCounter /> : null}
      {section === "adhkar" ? <AdhkarList key={adhkarSession} initialSession={adhkarSession} /> : null}
      {section === "qada" ? <QadaCounter /> : null}
    </div>
  );
}
