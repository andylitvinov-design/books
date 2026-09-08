import type { ReactNode } from "react";

import type { Locale, Remedy } from "@/data/remedies";

type RemedyContentProps = {
  locale: Locale;
  remedy: Remedy;
  sourceUrl?: string;
  variant: "standalone" | "book";
  showEssence?: boolean;
};

type Section = {
  heading: string;
  key: string;
  blocks: string[];
  index: number;
};

const copy = {
  ru: {
    essence: "Суть",
    supplementary: "Дополнительные материалы и наблюдения",
    source: "Источник в Telegram",
  },
  en: {
    essence: "Essence",
    supplementary: "Additional materials and observations",
    source: "Source in Telegram",
  },
} as const;

const order = [
  "state", "basis", "effect", "image", "archetype", "idea", "shadow", "resource",
  "conflict", "stage", "subpersonality", "lesson", "transformation", "alchemy", "practice", "cases", "comparisons",
];

const pairs = new Set(["archetype|idea", "shadow|resource", "stage|subpersonality", "basis|effect"]);

function normaliseHeading(value: string) {
  return value.toLowerCase().replace(/[^a-zа-яё]+/giu, " ").trim();
}

function sectionKey(heading: string) {
  const value = normaliseHeading(heading);
  if (/^(показания|основное состояние|состояние|indications|main state|state)$/.test(value)) return "state";
  if (/^(основа|basis|base)$/.test(value)) return "basis";
  if (/^(эффект|effect)$/.test(value)) return "effect";
  if (/^(образ|образы|image|images)$/.test(value)) return "image";
  if (/^(архетип|архетипы|archetype|archetypes)$/.test(value)) return "archetype";
  if (/^(идея|idea)$/.test(value)) return "idea";
  if (/^(тень|тень архетипа|shadow|shadow of the archetype)$/.test(value)) return "shadow";
  if (/^(ресурс|resource)$/.test(value)) return "resource";
  if (/^(внутренний конфликт|inner conflict|internal conflict)$/.test(value)) return "conflict";
  if (/^(этап развития|developmental stage|stage)$/.test(value)) return "stage";
  if (/^(субличность|subpersonality)$/.test(value)) return "subpersonality";
  if (/^(урок|смыслы|meanings|lesson|lessons)$/.test(value)) return "lesson";
  if (/^(трансформация|transformation)$/.test(value)) return "transformation";
  if (/^(алхимическая интерпретация|alchemical interpretation)$/.test(value)) return "alchemy";
  if (/^(практические наблюдения|practical observations)$/.test(value)) return "practice";
  if (/^(случаи|кейсы|cases)$/.test(value)) return "cases";
  if (/^(сравнения|comparisons)$/.test(value)) return "comparisons";
  if (/^(дополнительные материалы и наблюдения|дополнительные авторские материалы из telegram|additional materials and observations|additional author materials from telegram)$/.test(value)) return "supplementary";
  return "other";
}

function splitDescription(description: string) {
  const intro: string[] = [];
  const sections: Section[] = [];
  let current: Section | undefined;
  let supplementary: Section | undefined;

  description.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean).forEach((block, index) => {
    const heading = block.match(/^#{2,}\s*(.+)$/)?.[1]?.trim();
    if (heading) {
      const key = sectionKey(heading);
      const next = { heading, key, blocks: [], index };
      if (key === "supplementary") {
        supplementary = next;
        current = supplementary;
      } else if (supplementary) {
        supplementary.blocks.push(block);
      } else {
        sections.push(next);
        current = next;
      }
      return;
    }

    if (supplementary) supplementary.blocks.push(block);
    else if (current) current.blocks.push(block);
    else intro.push(block);
  });

  const positioned = sections.sort((left, right) => {
    const leftOrder = order.indexOf(left.key);
    const rightOrder = order.indexOf(right.key);
    return (leftOrder === -1 ? 1000 + left.index : leftOrder) - (rightOrder === -1 ? 1000 + right.index : rightOrder);
  });
  return { intro, sections: positioned, supplementary };
}

function textLength(section: Section) {
  return section.blocks.join(" ").length;
}

function essence(remedy: Remedy) {
  const state = remedy.main_state?.trim();
  const outcome = remedy.observed_effect?.trim() || remedy.transformation?.trim();
  return state && outcome ? `${state} → ${outcome}` : null;
}

export function RemedyEssence({ locale, remedy }: Pick<RemedyContentProps, "locale" | "remedy">) {
  const summary = essence(remedy);
  if (!summary) return null;
  return <p className="remedy-essence"><span>{copy[locale].essence}</span>{summary}</p>;
}

function isList(block: string) {
  return /^[-*•]\s+/u.test(block);
}

function ContentBlocks({ blocks, locale, sourceUrl }: { blocks: string[]; locale: Locale; sourceUrl?: string }) {
  const labels = copy[locale];
  const rendered = [] as ReactNode[];
  for (let index = 0; index < blocks.length;) {
    const block = blocks[index];
    if (/^###\s+message\d+\s+\(/iu.test(block)) {
      const text = block.slice(4);
      rendered.push(<p className="remedy-content-message" key={`${index}-${text}`}>{sourceUrl ? <a href={sourceUrl} rel="noreferrer" target="_blank">{labels.source}: {text}</a> : text}</p>);
      index += 1;
      continue;
    }
    if (isList(block)) {
      const items: string[] = [];
      while (index < blocks.length && isList(blocks[index])) {
        items.push(blocks[index].replace(/^[-*•]\s+/u, ""));
        index += 1;
      }
      rendered.push(<ul key={`list-${index}`}><>{items.map((item, itemIndex) => <li className="whitespace-pre-line" key={`${itemIndex}-${item}`}>{item}</li>)}</></ul>);
      continue;
    }
    rendered.push(<p className="whitespace-pre-line" key={`${index}-${block}`}>{block}</p>);
    index += 1;
  }
  return rendered;
}

function ContentSection({ section, locale, variant, sourceUrl }: { section: Section; locale: Locale; variant: RemedyContentProps["variant"]; sourceUrl?: string }) {
  const Heading = variant === "book" ? "h3" : "h2";
  return <section className="remedy-content-section">
    <Heading>{section.heading}</Heading>
    <ContentBlocks blocks={section.blocks} locale={locale} sourceUrl={sourceUrl} />
  </section>;
}

function SectionLayout({ sections, locale, variant, sourceUrl }: { sections: Section[]; locale: Locale; variant: RemedyContentProps["variant"]; sourceUrl?: string }) {
  const rendered: ReactNode[] = [];
  for (let index = 0; index < sections.length;) {
    const first = sections[index];
    const second = sections[index + 1];
    const pairKey = second ? `${first.key}|${second.key}` : "";
    if (second && pairs.has(pairKey) && textLength(first) <= 420 && textLength(second) <= 420) {
      rendered.push(<div className="remedy-content-pair" key={`${first.heading}-${second.heading}`}><ContentSection locale={locale} section={first} sourceUrl={sourceUrl} variant={variant} /><ContentSection locale={locale} section={second} sourceUrl={sourceUrl} variant={variant} /></div>);
      index += 2;
      continue;
    }
    rendered.push(<ContentSection key={`${first.heading}-${first.index}`} locale={locale} section={first} sourceUrl={sourceUrl} variant={variant} />);
    index += 1;
  }
  return rendered;
}

export function RemedyContent({ locale, remedy, sourceUrl, variant, showEssence = true }: RemedyContentProps) {
  const labels = copy[locale];
  const content = splitDescription(remedy.description);
  const supplementaryCount = (remedy.supplementary_materials?.match(/message-?\d+/gi) ?? []).length;

  return <div className={`remedy-content-body remedy-content-body--${variant}`}>
    {showEssence ? <RemedyEssence locale={locale} remedy={remedy} /> : null}
    {content.intro.length ? <div className="remedy-content-intro"><ContentBlocks blocks={content.intro} locale={locale} sourceUrl={sourceUrl} /></div> : null}
    <SectionLayout locale={locale} sections={content.sections} sourceUrl={sourceUrl} variant={variant} />
    {content.supplementary ? <details className="remedy-supplementary" open={false}>
      <summary>{labels.supplementary}{supplementaryCount ? ` (${supplementaryCount})` : ""}</summary>
      <div><ContentBlocks blocks={content.supplementary.blocks} locale={locale} sourceUrl={sourceUrl} /></div>
    </details> : null}
  </div>;
}
