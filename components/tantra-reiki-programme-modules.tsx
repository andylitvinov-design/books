import type { ReactNode } from "react";
import type { AcademyBlock } from "@/data/academy/catalog";
import originalRussianEnglishTranslation from "@/data/academy/tantra-reiki-ru-en.generated.json";
import originalEnglishArchive from "@/data/academy/tantra-reiki-full.generated.json";
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
    heading: "Original teaching notes",
    lead: "The complete author descriptions of all nine levels are already presented above. Here are the distinct teaching ideas and historical attunement names, without repeated reviews or registration text.",
    chapters: [
      ["The living flow", "Sensitivity, connection and the central idea of the practice"],
      ["Attunements across nine levels", "The original sequence, with each setting listed once"],
      ["The teaching philosophy", "Creativity, love and the symbolism of transformation"],
      ["The later levels", "The symbolic relationship between consciousness and unity"],
      ["Tradition and course context", "Origins, traditional applications and the nine-level path"],
    ],
    historicalTitle: "Earlier English source: alternative names",
    historicalDescription: "A historical English outline uses different names for several Level 2–3 attunements. The nine-level chapters above follow Andrey's Russian sequence.",
    historicalLevel2: "Level 2, additional historical name:",
    historicalLevel3: "Level 3, alternative historical names:",
    note: "These texts describe traditional and symbolic experiences, not medical or financial outcomes. Historical statements about healing or certification are not advice or guarantees; confirm current course arrangements directly.",
  },
  ru: {
    eyebrow: "Углубиться в практику",
    heading: "Дополнительные авторские материалы",
    lead: "Полные авторские описания всех девяти ступеней уже приведены выше. Здесь собраны остальные самостоятельные идеи и исходные названия настроек — без повторных отзывов и форм записи.",
    chapters: [
      ["Живой поток", "Чувствительность, контакт и основная идея практики"],
      ["Настройки девяти ступеней", "Исходная последовательность без повторяющихся пунктов"],
      ["Философия практики", "Творчество, любовь и символика трансформации"],
      ["Старшие ступени", "Образы сознания, архетипов и единства"],
      ["Традиция и контекст", "Происхождение, применение и историческая структура обучения"],
    ],
    historicalTitle: "",
    historicalDescription: "",
    historicalLevel2: "",
    historicalLevel3: "",
    note: "Материалы описывают традиционные символические практики и личный опыт. Исторические заявления об исцелении и сертификации не являются медицинскими рекомендациями или гарантиями; условия обучения уточняются лично.",
  },
  es: {
    eyebrow: "Profundiza en la práctica",
    heading: "Notas originales de la enseñanza",
    lead: "Los textos completos de las nueve etapas ya aparecen arriba. Estos extractos históricos adicionales están disponibles en inglés, sin testimonios ni solicitudes de inscripción repetidas.",
    chapters: [
      ["El flujo vivo", "Sensibilidad y conexión"],
      ["Sintonizaciones de las nueve etapas", "La secuencia original, sin elementos duplicados"],
      ["Filosofía", "Creatividad, amor y transformación"],
      ["Las últimas etapas", "Conciencia y unión"],
      ["Tradición y formación", "Orígenes y estructura histórica"],
    ],
    historicalTitle: "",
    historicalDescription: "",
    historicalLevel2: "",
    historicalLevel3: "",
    note: "Los textos describen tradiciones simbólicas, no garantías de resultados médicos o económicos. Confirma las condiciones actuales personalmente.",
  },
} as const;

// Block indices match the preserved 190-block Russian source and its 1:1 English
// translation. The nine full stage accounts (75–146) already appear once in
// TantraReikiJourney, and the separate Testimonials component renders reviews.
// Do not mutate the original archival JSON: it remains the provenance record.
const detailedRanges: readonly (readonly [number, number])[] = [
  [4, 10],    // Introductory ideas, excluding split duplicates
  [11, 48],   // Attunements for Levels 1–9
  [70, 74],   // Author's overall philosophy, not the repeated stage paragraphs
  [131, 136], // Final reflections not repeated in the nine full stage accounts
  [179, 183], // Tradition and historical learning context
];
const excludedSourceIndices = new Set([5, 6, 7, 8, 15, 16, 25, 26, 31, 32, 133]);

function Modules({ locale, blocks }: { locale: PublicLocale; blocks: AcademyBlock[] }) {
  const captions = copy[locale].chapters;
  return (
    <div className="tantra-reading__list" lang={locale === "es" ? "en" : locale}>
      {detailedRanges.map(([from, to], index) => {
        const portion = blocks.slice(from, to).filter((_, localIndex) => !excludedSourceIndices.has(from + localIndex));
        if (!portion.length) return null;
        const [heading, description] = captions[index];
        return (
          <details className="tantra-reading__module" key={from}>
            <summary>
              <span className="tantra-reading__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="tantra-reading__module-heading"><strong>{heading}</strong><small>{description}</small></span>
              <span className="tantra-reading__indicator" aria-hidden="true">+</span>
            </summary>
            <div className="tantra-reading__content">{sourceContent(portion, "source-" + from)}</div>
          </details>
        );
      })}
    </div>
  );
}

export function TantraReikiProgrammeModules({locale, publicBlocks}: {locale:PublicLocale; publicBlocks:AcademyBlock[]}) {
  const c = copy[locale];
  // The source archive remains intact. Its duplicated quotations, old "book a
  // session" banners, testimonials, teacher biography and photo placeholders
  // are deliberately not rendered again inside the teaching material.
  const translated: AcademyBlock[] = originalRussianEnglishTranslation.blocks.map((block) => ({
    type: block.type as AcademyBlock["type"],
    text: block.text,
  }));
  const primary = locale === "ru" ? publicBlocks : translated;
  return (
    <section className="tantra-reading" id="tantra-full-source" aria-labelledby="tantra-reading-title">
      <div className="tantra-reading__heading">
        <p className="homeopathy-kicker">{c.eyebrow}</p>
        <h2 id="tantra-reading-title">{c.heading}</h2>
        <p>{c.lead}</p>
      </div>
      <Modules locale={locale} blocks={primary} />
      {locale === "en" ? (
        <div className="tantra-reading__supplement">
          <details className="tantra-reading__module">
            <summary>
              <span className="tantra-reading__number">06</span>
              <span className="tantra-reading__module-heading"><strong>{c.historicalTitle}</strong><small>{c.historicalDescription}</small></span>
              <span className="tantra-reading__indicator" aria-hidden="true">+</span>
            </summary>
            <div className="tantra-reading__content">
              <p>{c.historicalDescription}</p>
              <ul>
                <li>{c.historicalLevel2} {originalEnglishArchive.blocks.en[29].text}</li>
                <li>{c.historicalLevel3} {originalEnglishArchive.blocks.en[31].text}; {originalEnglishArchive.blocks.en[32].text}</li>
              </ul>
            </div>
          </details>
        </div>
      ) : null}
      <p className="tantra-reading__note">{c.note}</p>
    </section>
  );
}
