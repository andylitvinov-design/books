import type { ReactNode } from "react";
import type { AcademyBlock } from "@/data/academy/catalog";
import originalRussianEnglishTranslation from "@/data/academy/tantra-reiki-ru-en.generated.json";
import type { PublicLocale } from "@/lib/public-locales";

function sourceContent(blocks: AcademyBlock[], prefix: string) {
  const nodes: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    const items = bullets;
    bullets = [];
    nodes.push(<ul key={prefix + "-list-" + nodes.length}>{items.map((label, index) => <li key={index}>{label}</li>)}</ul>);
  };
  blocks.forEach((block, index) => {
    if (block.type === "li") { bullets.push(block.text); return; }
    flush();
    if (block.type === "h1") return;
    if (block.type === "h2") nodes.push(<h3 key={prefix + index}>{block.text}</h3>);
    if (block.type === "h3" || block.type === "h4") nodes.push(<h4 key={prefix + index}>{block.text}</h4>);
    if (block.type === "p") nodes.push(<p key={prefix + index}>{block.text}</p>);
  });
  flush();
  return nodes;
}

const copy = {
  en: {
    eyebrow: "Go deeper into the practice",
    heading: "The teachings behind the nine levels",
    lead: "Choose a chapter to read about the energies, symbolism and course structure. The full writings remain accessible, organized into clear themes.",
    chapters: [
      ["The foundations", "Sensuality, presence and the living flow"],
      ["The nine attunements", "The traditional sequence and its symbolic themes"],
      ["The first experiences", "Early experiences and reflections from participants"],
      ["Spring, fire and ocean", "A deeper look at Levels 1–3"],
      ["Love, inner light and unity", "The experiences described for Levels 4–6"],
      ["Awareness, creation and mastery", "The experiences described for Levels 7–9"],
      ["Practice and guidance", "Learning, mentoring and questions about training"],
      ["Tradition and gatherings", "The roots of the practice and experiences together"],
    ],
    extra: [
      ["Programme overview", "The original English introduction and context"],
      ["Learning and settings", "The course structure and traditional initiations"],
      ["Education and shared experiences", "Teacher notes, participant stories and events"],
    ],
    note: "These traditional writings describe personal and symbolic experiences. Historical statements about healing or certification are not medical advice or guarantees. Current courses and conditions are confirmed personally.",
  },
  ru: {
    eyebrow: "Углубиться в практику",
    heading: "Тантра Рейки: темы и материалы",
    lead: "Открывайте интересующие главы — о состояниях, настройках и структуре обучения. Исходные авторские тексты сохранены, но теперь разделены на понятные темы.",
    chapters: [
      ["Основа системы", "Чувствительность, присутствие и поток Жизни"],
      ["Девять настроек", "Последовательность ступеней и их символические смыслы"],
      ["Первый опыт", "Впечатления участников и личные наблюдения"],
      ["Родник, огонь и океан", "Подробный взгляд на ступени 1–3"],
      ["Любовь, свет и единство", "Переживания и образы ступеней 4–6"],
      ["Осознанность и созидание", "Практики и образы ступеней 7–9"],
      ["Практика и обучение", "Формат занятий, сопровождение и вопросы"],
      ["Традиция и встречи", "Истоки подхода и совместный опыт"],
    ],
    extra: [
      ["Обзор программы", "История и контекст"],
      ["Обучение и настройки", "Путь обучения"],
      ["Практические материалы", "Примеры и опыт участников"],
    ],
    note: "Тексты описывают традиционные символические практики и личный опыт. Исторические заявления об исцелении и сертификации не являются медицинскими рекомендациями или гарантиями. Актуальные условия обучения уточняются лично.",
  },
  es: {
    eyebrow: "Profundiza en la práctica",
    heading: "Las enseñanzas de Tantra Reiki",
    lead: "Abre cada capítulo para explorar los niveles, las sintonizaciones y el aprendizaje, en lugar de leer un único texto interminable.",
    chapters: [
      ["Fundamentos", "Sensibilidad, presencia y flujo"],
      ["Las nueve sintonizaciones", "La secuencia de aprendizaje"],
      ["Las primeras experiencias", "Reflexiones de participantes"],
      ["Manantial, fuego y océano", "Etapas 1–3"],
      ["Amor, luz y unidad", "Etapas 4–6"],
      ["Conciencia y creación", "Etapas 7–9"],
      ["Práctica y formación", "Cómo participar"],
      ["Tradición y encuentros", "Raíces y experiencias compartidas"],
    ],
    extra: [
      ["Presentación del programa", "Contexto e historia"],
      ["Formación y sintonizaciones", "Estructura del curso"],
      ["Experiencias y comunidad", "Notas y testimonios"],
    ],
    note: "Las descripciones históricas son experiencias personales y simbólicas, no consejos médicos ni garantías de resultados. Consulta las condiciones actuales de formación.",
  },
} as const;

const detailedRanges: readonly [number, number][] = [[0,11],[11,48],[48,69],[69,98],[98,124],[124,151],[151,178],[178,Number.MAX_SAFE_INTEGER]];
const compactRanges: readonly [number, number][] = [[0,20],[20,67],[67,Number.MAX_SAFE_INTEGER]];

function Modules({locale, blocks, captions, prefix, offset = 0}:{
  locale: PublicLocale;
  blocks: AcademyBlock[];
  captions: readonly (readonly [string,string])[];
  prefix: string;
  offset?: number;
}) {
  const ranges = blocks.length > 150 ? detailedRanges : compactRanges;
  return <div className="tantra-reading__list" lang={locale}>
    {ranges.map(([from, to], index) => {
      const portion = blocks.slice(from, to);
      if (!portion.length) return null;
      const [heading, description] = captions[index];
      return <details className="tantra-reading__module" key={prefix + index}>
        <summary>
          <span className="tantra-reading__number">{String(offset + index + 1).padStart(2,"0")}</span>
          <span className="tantra-reading__module-heading"><strong>{heading}</strong><small>{description}</small></span>
          <span className="tantra-reading__indicator" aria-hidden="true">+</span>
        </summary>
        <div className="tantra-reading__content">{sourceContent(portion, prefix + index)}</div>
      </details>;
    })}
  </div>;
}

export function TantraReikiProgrammeModules({locale, publicBlocks}: {locale:PublicLocale; publicBlocks:AcademyBlock[]}) {
  const c = copy[locale];
  // Preserve every source paragraph; only the presentation and grouping change.
  // EN also retains the separate original English programme below the translated full text.
  const translated: AcademyBlock[] = originalRussianEnglishTranslation.blocks.map((block) => ({
    type: block.type as AcademyBlock["type"],
    text: block.text,
  }));
  const primary = locale === "en" ? translated : publicBlocks;
  return (
    <section className="tantra-reading" id="tantra-full-source" aria-labelledby="tantra-reading-title">
      <div className="tantra-reading__heading">
        <p className="homeopathy-kicker">{c.eyebrow}</p>
        <h2 id="tantra-reading-title">{c.heading}</h2>
        <p>{c.lead}</p>
      </div>
      <Modules locale={locale} blocks={primary} captions={primary.length > 150 ? c.chapters : c.extra} prefix="main" />
      {locale === "en" ? (
        <div className="tantra-reading__supplement">
          <h3>More about the training programme</h3>
          <Modules locale="en" blocks={publicBlocks} captions={c.extra} prefix="original-en" offset={8} />
        </div>
      ) : null}
      <p className="tantra-reading__note">{c.note}</p>
    </section>
  );
}
