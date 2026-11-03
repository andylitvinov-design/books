import { getRemedySymptoms, isBachEssence } from "@/data/remedy-symptoms";
import type { SymptomLocale } from "@/data/remedy-symptoms";

const copy = {
  ru: {
    title: "Симптомы",
    note: "Традиционный симптомный профиль для ознакомления, не доказанное показание к лечению. При выраженных или новых симптомах нужна медицинская оценка.",
    bach: "Возможные телесные проявления стресса, не специфичные для эссенций Баха и не подтверждающие лечебного действия.",
  },
  en: {
    title: "Symptoms",
    note: "Traditional symptom profile for reference, not a proven indication for treatment. Seek medical assessment for new or significant symptoms.",
    bach: "Possible physical manifestations of stress, not specific to Bach flower essences or evidence of a treatment effect.",
  },
  es: {
    title: "Síntomas",
    note: "Perfil tradicional de síntomas con fines informativos, no una indicación de eficacia clínica. Consulte por síntomas nuevos o importantes.",
    bach: "Posibles manifestaciones físicas de estrés, no específicas de las esencias de Bach ni prueba de eficacia terapéutica.",
  },
} as const;

export function RemedySymptomsSection({ slug, locale, variant = "standalone" }: {
  slug: string;
  locale: SymptomLocale;
  variant?: "standalone" | "book";
}) {
  const symptoms = getRemedySymptoms(slug, locale);
  if (symptoms.length !== 4) return null;
  const Heading = variant === "book" ? "h3" : "h2";
  const labels = copy[locale];
  return <section className="remedy-content-section remedy-content-symptoms rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3" aria-label={labels.title}>
    <Heading>{labels.title}</Heading>
    <ul>{symptoms.map((symptom) => <li key={symptom}>{symptom}</li>)}</ul>
    <p className="mt-2 text-xs leading-relaxed text-stone-600">{isBachEssence(slug) ? labels.bach : labels.note}</p>
  </section>;
}
