import Link from "next/link";

import { SiteNavigation } from "@/components/site-navigation";
import { getRelatedRemedies, getRemedySwitchPath } from "@/data/remedies";
import type { Locale, Remedy } from "@/data/remedies";

type RemedyPageProps = { locale: Locale; remedy: Remedy };

const copy = {
  ru: { back: "← Все препараты", source: "Источник автора", sourceName: "Исходное название", related: "Связанные препараты", disclaimer: "Материал публикуется как образовательный архив авторских текстов. Он не заменяет диагностику, лечение или консультацию квалифицированного специалиста.", switch: "EN" },
  en: { back: "← All remedies", source: "Author source", sourceName: "Source name", related: "Related remedies", disclaimer: "This is an educational archive of the author’s texts. It does not replace diagnosis, treatment, or advice from a qualified professional.", switch: "RU" },
} as const;

function AuthorDescription({ description }: { description: string }) {
  return (
    <div className="remedy-author-description">
      {description.split(/\n{2,}/).filter(Boolean).map((block, index) => {
        if (block.startsWith("## ")) return <h2 key={`${index}-${block.slice(0, 24)}`}>{block.slice(3)}</h2>;
        if (block.startsWith("### ")) return <h3 key={`${index}-${block.slice(0, 24)}`}>{block.slice(4)}</h3>;
        return <p className="whitespace-pre-line" key={`${index}-${block.slice(0, 24)}`}>{block}</p>;
      })}
    </div>
  );
}

export function RemedyPage({ locale, remedy }: RemedyPageProps) {
  const labels = copy[locale];
  const otherLocale: Locale = locale === "ru" ? "en" : "ru";
  const related = getRelatedRemedies(locale, remedy);
  return (
    <main className="homeopathy-shell">
      <SiteNavigation locale={locale} />
      <article className="remedy-page">
        <div className="remedy-page-actions"><Link href={`/${locale}/homeopathy/remedies`}>{labels.back}</Link><Link href={getRemedySwitchPath(otherLocale, remedy.slug)} lang={otherLocale}>{labels.switch}</Link></div>
        <p className="homeopathy-kicker">{locale === "ru" ? "Гомеопатия · источник" : "Homeopathy · source"}</p>
        <h1>{remedy.canonical_latin_name}</h1>
        {remedy.russian_common_name ? <p className="remedy-common-name">{labels.sourceName}: {remedy.russian_common_name}</p> : null}
        <AuthorDescription description={remedy.description} />
        <footer className="remedy-source-reference"><p>{labels.source}</p><strong>{remedy.source_author}</strong><span>{remedy.source_file}</span><span>{remedy.source_heading}</span>{remedy.source_messages ? <span>Messages: {remedy.source_messages}</span> : null}{locale === "en" ? <span>Translation provenance: {remedy.translation_provenance}; EN source: {remedy.en_source_exists}.</span> : null}</footer>
        {related.length ? <section className="remedy-related"><h2>{labels.related}</h2><ul>{related.map((item) => <li key={item.slug}><Link href={`/${locale}/homeopathy/remedies/${item.slug}`}>{item.canonical_latin_name}</Link></li>)}</ul></section> : null}
        <p className="remedy-disclaimer">{labels.disclaimer}</p>
      </article>
    </main>
  );
}
