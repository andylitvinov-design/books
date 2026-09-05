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

function RemedyImages({ locale, remedy }: RemedyPageProps) {
  const supportingImages = (remedy.supporting_images || "").split(";").map((image) => image.trim()).filter(Boolean);
  if (!remedy.primary_image && !supportingImages.length) return null;
  const sourceAlt = remedy.primary_image_alt || (locale === "ru"
    ? `Исходное изображение, прикреплённое к ${remedy.canonical_latin_name}.`
    : `Source image attached to ${remedy.canonical_latin_name}.`);

  return (
    <section className="remedy-images" aria-label={locale === "ru" ? "Изображения из источника" : "Source images"}>
      {remedy.primary_image ? <figure className="remedy-primary-image">
        {/* Source image files are intentionally rendered as-is; the contextual alt does not infer their unseen visual content. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={remedy.primary_image} alt={sourceAlt} decoding="async" />
      </figure> : null}
      {supportingImages.length ? (
        <div className="remedy-supporting-gallery">
          <p>{locale === "ru" ? "Дополнительные изображения из связанных сообщений" : "Additional images from linked source messages"}</p>
          <div>
            {supportingImages.map((image, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={image} src={image} alt={`${sourceAlt} ${index + (remedy.primary_image ? 2 : 1)}.`} loading="lazy" decoding="async" />
            ))}
          </div>
        </div>
      ) : null}
    </section>
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
        <RemedyImages locale={locale} remedy={remedy} />
        <AuthorDescription description={remedy.description} />
        <footer className="remedy-source-reference"><p>{labels.source}</p><strong>{remedy.source_author}</strong><span>{remedy.source_file}</span><span>{remedy.source_heading}</span>{remedy.source_messages ? <span>Messages: {remedy.source_messages}</span> : null}{locale === "en" ? <span>Translation provenance: {remedy.translation_provenance}; EN source: {remedy.en_source_exists}.</span> : null}</footer>
        {related.length ? <section className="remedy-related"><h2>{labels.related}</h2><ul>{related.map((item) => <li key={item.slug}><Link href={`/${locale}/homeopathy/remedies/${item.slug}`}>{item.canonical_latin_name}</Link></li>)}</ul></section> : null}
        <p className="remedy-disclaimer">{labels.disclaimer}</p>
      </article>
    </main>
  );
}
