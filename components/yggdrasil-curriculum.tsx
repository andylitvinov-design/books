import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import type { PublicLocale } from "@/lib/public-locales";

type Localized = Record<PublicLocale, string>;

type CurriculumStep = {
  number: number;
  title: Localized;
};

type CurriculumLevel = {
  id: number;
  title: Localized;
  theme: Localized;
  stepLabel: Localized;
  steps: CurriculumStep[];
};

const copy: Record<PublicLocale, {
  eyebrow: string;
  title: string;
  lead: string;
  source: string;
  levels: string;
  steps: string;
}> = {
  en: {
    eyebrow: "Canonical learning path",
    title: "7 levels · 37 steps",
    lead: "This curriculum follows the current Reiki Yggdrasil learning structure. The older 10-module PsiTrends outline is kept only as migration history and is not used as the current course map.",
    source: "Structure synchronized from the dedicated Reiki Yggdrasil project.",
    levels: "levels",
    steps: "steps"
  },
  ru: {
    eyebrow: "Актуальная структура обучения",
    title: "7 уровней · 37 ступеней",
    lead: "Эта схема соответствует текущей структуре обучения Reiki Yggdrasil. Старая 10-модульная схема PsiTrends сохранена только в архиве миграции и больше не используется как актуальная карта курса.",
    source: "Структура синхронизирована с отдельным проектом Reiki Yggdrasil.",
    levels: "уровней",
    steps: "ступеней"
  },
  es: {
    eyebrow: "Ruta formativa canónica",
    title: "7 niveles · 37 etapas",
    lead: "Este plan sigue la estructura actual de aprendizaje de Reiki Yggdrasil. El antiguo esquema de 10 módulos de PsiTrends se conserva solo como historial de migración y ya no se usa como mapa actual del curso.",
    source: "Estructura sincronizada con el proyecto dedicado Reiki Yggdrasil.",
    levels: "niveles",
    steps: "etapas"
  }
};

export function YggdrasilCurriculum({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const levels = curriculum.levels as CurriculumLevel[];

  return (
    <section className="yggdrasil-curriculum" aria-labelledby="yggdrasil-curriculum-title">
      <div className="yggdrasil-curriculum-intro">
        <p className="homeopathy-kicker">{text.eyebrow}</p>
        <h2 id="yggdrasil-curriculum-title">{text.title}</h2>
        <p>{text.lead}</p>
        <small>{text.source}</small>
      </div>

      <div className="yggdrasil-levels">
        {levels.map((level) => (
          <details className="yggdrasil-level" key={level.id} open={level.id === 1}>
            <summary>
              <span className="yggdrasil-level-number">{String(level.id).padStart(2, "0")}</span>
              <span className="yggdrasil-level-copy">
                <strong>{level.title[locale]}</strong>
                <small>{level.steps.length} {text.steps} · {level.theme[locale]}</small>
              </span>
              <span className="yggdrasil-level-toggle" aria-hidden="true">+</span>
            </summary>
            <ol className="yggdrasil-step-list">
              {level.steps.map((step) => (
                <li key={step.number}>
                  <span>{step.number}</span>
                  <div>
                    <small>{level.stepLabel[locale]} {step.number}</small>
                    <strong>{step.title[locale]}</strong>
                  </div>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </section>
  );
}
