import Link from "next/link";

import { RemedyContent, RemedyEssence } from "@/components/remedy-content";
import { SiteNavigation } from "@/components/site-navigation";
import { getRelatedRemedies, getRemedySwitchPath } from "@/data/remedies";
import type { Locale, Remedy } from "@/data/remedies";

type RemedyPageProps = { locale: Locale; remedy: Remedy };

const copy = {
  ru: { back: "← Все препараты", source: "Источник автора", sourceName: "Исходное название", supplementalSource: "Источник в Telegram", related: "Связанные препараты", disclaimer: "Материал публикуется как образовательный архив авторских текстов. Он не заменяет диагностику, лечение или консультацию квалифицированного специалиста.", switch: "EN" },
  en: { back: "← All remedies", source: "Author source", sourceName: "Source name", supplementalSource: "Source in Telegram", related: "Related remedies", disclaimer: "This is an educational archive of the author’s texts. It does not replace diagnosis, treatment, or advice from a qualified professional.", switch: "RU" },
} as const;

function sourceAlt(locale: Locale, remedy: Remedy) {
  return remedy.primary_image_alt || (locale === "ru"
    ? `Исходное изображение, прикреплённое к ${remedy.canonical_latin_name}.`
    : `Source image attached to ${remedy.canonical_latin_name}.`);
}

function RemedyPrimaryImage({ locale, remedy }: RemedyPageProps) {
  if (!remedy.primary_image) return null;
  const alt = sourceAlt(locale, remedy);

  return (
    <figure className="remedy-primary-image">
      {/* Source image files are intentionally rendered as-is; the contextual alt does not infer their unseen visual content. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={remedy.primary_image} alt={alt} decoding="async" />
    </figure>
  );
}

function RemedySupportingGallery({ locale, remedy }: RemedyPageProps) {
  const supportingImages = (remedy.supporting_images || "").split(";").map((image) => image.trim()).filter(Boolean);
  if (!supportingImages.length) return null;
  const alt = sourceAlt(locale, remedy);

  return (
    <section className="remedy-supporting-gallery" aria-label={locale === "ru" ? "Дополнительные изображения из источника" : "Additional source images"}>
      <p>{locale === "ru" ? "Дополнительные изображения из связанных сообщений" : "Additional images from linked source messages"}</p>
      <div>
        {supportingImages.map((image, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={image} src={image} alt={`${alt} ${index + (remedy.primary_image ? 2 : 1)}.`} loading="lazy" decoding="async" />
        ))}
      </div>
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
        <RemedyEssence locale={locale} remedy={remedy} />
        <RemedyPrimaryImage locale={locale} remedy={remedy} />
        <RemedyContent locale={locale} remedy={remedy} showEssence={false} sourceUrl={remedy.primary_source_url} variant="standalone" />
        <details className="remedy-source-reference"><summary>{labels.source}: {remedy.primary_source_message}{remedy.source_date ? ` · ${remedy.source_date}` : ""}</summary><div><strong>{remedy.source_author}</strong>{remedy.primary_source_url ? <a href={remedy.primary_source_url} rel="noreferrer" target="_blank">Telegram</a> : null}<span>{remedy.source_file}</span><span>{remedy.source_heading}</span>{remedy.source_messages ? <span>Messages: {remedy.source_messages}</span> : null}{locale === "en" ? <span>Translation provenance: {remedy.translation_provenance}; EN source: {remedy.en_source_exists}.</span> : null}</div></details>
        <RemedySupportingGallery locale={locale} remedy={remedy} />
        {related.length ? <section className="remedy-related"><h2>{labels.related}</h2><ul>{related.map((item) => <li key={item.slug}><Link href={`/${locale}/homeopathy/remedies/${item.slug}`}>{item.canonical_latin_name}</Link></li>)}</ul></section> : null}
        <p className="remedy-disclaimer">{labels.disclaimer}</p>
      </article>
    </main>
  );
}
