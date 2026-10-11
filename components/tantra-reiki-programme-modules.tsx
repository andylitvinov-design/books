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
    lead: "Each level above contains its attunements. These three chapters add original reflections on the flow, the teaching philosophy and historical context.",
    chapters: [
      ["The living flow", "Sensitivity, connection and the central idea of the practice"],
      ["The teaching philosophy", "Creativity, love and the symbolism of transformation"],
      ["Tradition and course context", "Origins, traditional applications and the nine-level path"],
    ],
    historicalTitle: "Earlier English source: alternative names",
    historicalDescription: "A historical English outline uses different names for several Level 2–3 attunements. The nine-level chapters above follow Andrey's Russian sequence.",
    historicalLevel2: "Level 2, additional historical name:",
    historicalLevel3: "Level 3, alternative historical names:",
    fullResearchTitle: "Andrey’s complete nine-level research",
    fullResearchDetail: "The full author-written progression: Spring, Fire, Ocean, Love, Inner Light, Unity, Illumination, Creation and Mastery. Read the original teaching text in one place.",
    fullProgrammeTitle: "Complete original Master Teacher programme",
    fullProgrammeDetail: "The complete original English training outline: the attunements, level-by-level exercises, mandalas, artifacts, supervision and historical completion requirements.",
    sourceLanguageNote: "Original English programme from the archived Academy material. The historical course length, certification and claimed effects are source wording, not current promises.",
    note: "These texts describe traditional and symbolic experiences, not medical or financial outcomes. Historical statements about healing or certification are not advice or guarantees; confirm current course arrangements directly.",
  },
  ru: {
    eyebrow: "Углубиться в практику",
    heading: "Дополнительные авторские материалы",
    lead: "Настройки приведены в каждой ступени выше. Здесь — дополнительные авторские размышления о потоке, философии и истории практики.",
    chapters: [
      ["Живой поток", "Чувствительность, контакт и основная идея практики"],
      ["Философия практики", "Творчество, любовь и символика трансформации"],
      ["Традиция и контекст", "Происхождение, применение и историческая структура обучения"],
    ],
    historicalTitle: "",
    historicalDescription: "",
    historicalLevel2: "",
    historicalLevel3: "",
    fullResearchTitle: "Полное авторское исследование девяти ступеней",
    fullResearchDetail: "Исходный текст Андрея о «Роднике Жизни», «Жаре Жизни», «Океане», «Вертикали», «Внутреннем Свете» и всех девяти ступенях — без сокращений и пересказа.",
    fullProgrammeTitle: "Полная авторская программа обучения Master Teacher",
    fullProgrammeDetail: "Исходная английская программа: настройки каждой ступени, работа с партнёром, мандалы, артефакты, супервизия, ритуалы и мастерская аттестация.",
    sourceLanguageNote: "Ниже английский текст первоначальной учебной программы. Сроки, сертификаты и описания эффектов — исторические формулировки, а не текущие обещания.",
    note: "Материалы описывают традиционные символические практики и личный опыт. Исторические заявления об исцелении и сертификации не являются медицинскими рекомендациями или гарантиями; условия обучения уточняются лично.",
  },
  es: {
    eyebrow: "Profundiza en la práctica",
    heading: "Notas originales de la enseñanza",
    lead: "Las sintonizaciones están en cada etapa más arriba. Aquí se reúnen reflexiones adicionales sobre el flujo, la filosofía y el contexto histórico.",
    chapters: [
      ["El flujo vivo", "Sensibilidad y conexión"],
      ["Filosofía", "Creatividad, amor y transformación"],
      ["Tradición y formación", "Orígenes y estructura histórica"],
    ],
    historicalTitle: "",
    historicalDescription: "",
    historicalLevel2: "",
    historicalLevel3: "",
    fullResearchTitle: "La investigación completa de las nueve etapas",
    fullResearchDetail: "El texto completo de Andrey sobre las nueve etapas, conservado en su traducción inglesa del original ruso.",
    fullProgrammeTitle: "Programa original completo de Maestro de Tantra Reiki",
    fullProgrammeDetail: "El curso original en inglés: sintonizaciones, mandalas, artefactos, supervisión y formación etapa por etapa.",
    sourceLanguageNote: "El documento de formación se reproduce en su inglés original. Fechas, certificados y resultados pertenecen al texto histórico y no son promesas actuales.",
    note: "Los textos describen tradiciones simbólicas, no garantías de resultados médicos o económicos. Confirma las condiciones actuales personalmente.",
  },
} as const;

// Block indices match the preserved 190-block Russian source and its 1:1 English
// translation. The nine full stage accounts (75–146) already appear once in
// TantraReikiJourney, and the separate Testimonials component renders reviews.
// Do not mutate the original archival JSON: it remains the provenance record.
const detailedRanges: readonly (readonly [number, number])[] = [
  [4, 10],    // Introductory ideas, excluding split duplicates
  [70, 74],   // Author's overall philosophy, not the repeated stage paragraphs
  [179, 183], // Tradition and historical learning context
];
const excludedSourceIndices = new Set([5, 6, 7, 8]);

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

// These indices cover every distinct paragraph of Andrey's original nine-level
// research. Scraper duplicates (the second copies of identical text) are omitted,
// but no unique author paragraph is summarized or reworded. 190 RU originals and
// their 1:1 English translations stay immutable in the archived data.
const originalResearchIndices = [
  69, 70, 71, 72, 73,
  74, 75, 76, 77,
  85, 86, 87,
  88, 89, 90, 91,
  98, 99, 100, 101, 102,
  103, 104, 105, 106, 107,
  108, 109,
  124, 125, 126,
  127, 128,
  129, 130, 131, 132,
  134, 135,
] as const;

function FullOriginalMaterials({ locale }: { locale: PublicLocale }) {
  const c = copy[locale];
  const originalResearch = originalResearchIndices.map((index) => locale === "ru"
    ? originalEnglishArchive.blocks.ru[index]
    : originalRussianEnglishTranslation.blocks[index]);
  // The archived English master-course text includes all original teaching
  // settings and lesson practices. Never present legacy promises as current.
  const masterProgramme = originalEnglishArchive.blocks.en.slice(6, 69);
  return (
    <div className="tantra-reading__list tantra-reading__restored">
      <details className="tantra-reading__module" id="tantra-original-author-research">
        <summary>
          <span className="tantra-reading__number">04</span>
          <span className="tantra-reading__module-heading"><strong>{c.fullResearchTitle}</strong><small>{c.fullResearchDetail}</small></span>
          <span className="tantra-reading__indicator" aria-hidden="true">+</span>
        </summary>
        <div className="tantra-reading__content" lang={locale === "ru" ? "ru" : "en"}>
          {sourceContent(originalResearch as AcademyBlock[], "complete-author-research")}
        </div>
      </details>
      <details className="tantra-reading__module" id="tantra-original-master-programme">
        <summary>
          <span className="tantra-reading__number">05</span>
          <span className="tantra-reading__module-heading"><strong>{c.fullProgrammeTitle}</strong><small>{c.fullProgrammeDetail}</small></span>
          <span className="tantra-reading__indicator" aria-hidden="true">+</span>
        </summary>
        <div className="tantra-reading__content" lang="en">
          <p>{c.sourceLanguageNote}</p>
          {sourceContent(masterProgramme as AcademyBlock[], "complete-master-programme")}
        </div>
      </details>
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
      <FullOriginalMaterials locale={locale} />
      <p className="tantra-reading__note">{c.note}</p>
    </section>
  );
}
