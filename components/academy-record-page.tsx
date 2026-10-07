/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ReactNode } from "react";

import { AcademyBackLink } from "@/components/academy-hub";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { YggdrasilProgramLanding } from "@/components/yggdrasil-program-landing";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { academyCopy, academyDisplayTitle, academyPublicBlocks, academyPublicOmittedCount, mediaForRecord, sourceLanguageNotice, tantraReikiImages, youtubeIdFromUrl, type AcademyBlock, type AcademySourceRecord } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";

function renderBlocks(blocks: AcademyBlock[]) {
  const nodes: ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    const items = list; list = [];
    nodes.push(<ul className="academy-source-list" key={"list-" + nodes.length}>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>);
  };
  blocks.forEach((block, index) => {
    if (block.type === "li") { list.push(block.text); return; }
    flushList();
    if (block.type === "h1") return;
    if (block.type === "h2") nodes.push(<h2 id={"academy-section-" + index} key={index}>{block.text}</h2>);
    if (block.type === "h3") nodes.push(<h3 id={"academy-section-" + index} key={index}>{block.text}</h3>);
    if (block.type === "h4") nodes.push(<h4 id={"academy-section-" + index} key={index}>{block.text}</h4>);
    if (block.type === "p") nodes.push(<p key={index}>{block.text}</p>);
  });
  flushList(); return nodes;
}

function statusLabel(record: AcademySourceRecord, locale: PublicLocale) {
  if (record.routeKey === "reiki/yggdrasil") return academyCopy[locale].current;
  return academyCopy[locale][record.status] ?? academyCopy[locale].historical;
}

export function AcademyRecordPage({ locale, record }: { locale: PublicLocale; record: AcademySourceRecord }) {
  const text = academyCopy[locale];
  const sourceNotice = sourceLanguageNotice(record, locale);
  const videos = mediaForRecord(record)
    .map((item) => ({
      id: youtubeIdFromUrl(item.mediaUrl),
      url: item.mediaUrl,
      lessonTitle: locale === "ru" ? item.lessonTitle : (item.lessonTitleEn ?? item.lessonTitle),
      order: item.order,
    }))
    .filter((item): item is { id: string; url: string; lessonTitle: string | undefined; order: number | undefined } => Boolean(item.id))
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, 48);
  const isCanonicalYggdrasil = record.routeKey === "reiki/yggdrasil";
  const isFullTantraReiki = record.logicalId === "reiki/tantra-reiki" && (locale === "en" || locale === "ru");
  const tantraImages = isFullTantraReiki ? tantraReikiImages(locale) : [];
  const publicBlocks = isCanonicalYggdrasil ? [] : academyPublicBlocks(record, locale);
  const publicOmittedCount = isCanonicalYggdrasil ? 0 : academyPublicOmittedCount(record, locale);
  const hasBody = publicBlocks.some((block) => block.type !== "h1");
  const outline = publicBlocks.map((block, index) => ({ block, index })).filter(({ block }) => block.type === "h2" || block.type === "h3").slice(0, 32);

  return (
    <main className="academy-reading-shell" lang={locale}>
      <PublicSiteHeader locale={locale} /><AcademyBackLink locale={locale} />
      <article className="academy-reading">
        <header className="academy-reading-header">
          <p className="homeopathy-kicker">{text.title}</p><h1>{academyDisplayTitle(record, locale)}</h1>
          <div className="academy-reading-meta"><span>{statusLabel(record, locale)}</span>{sourceNotice ? <span>{sourceNotice}</span> : null}</div>
        </header>
        {outline.length >= 2 ? <nav className="academy-outline" aria-label={locale === "ru" ? "Содержание программы" : locale === "es" ? "Contenido del programa" : "Program contents"}><p>{locale === "ru" ? "Содержание" : locale === "es" ? "Contenido" : "Contents"}</p><ol>{outline.map(({ block, index }) => <li className={block.type === "h3" ? "academy-outline-subitem" : undefined} key={index}><a href={"#academy-section-" + index}>{block.text}</a></li>)}</ol></nav> : null}
        {record.routeKey === "history" ? <section className="academy-history-links" aria-label="Academy history"><Link href={"/" + locale + "/academy/history/faculties"}>{locale === "ru" ? "Исторические факультеты и традиции" : locale === "es" ? "Facultades y tradiciones históricas" : "Historical faculties & traditions"}<span aria-hidden="true">→</span></Link><Link href={"/" + locale + "/academy/history/student-experiences"}>{locale === "ru" ? "Исторические отзывы студентов" : locale === "es" ? "Experiencias históricas de estudiantes" : "Historical student experiences"}<span aria-hidden="true">→</span></Link></section> : null}
        {isFullTantraReiki ? <aside className="academy-archive-notice">{locale === "ru" ? "Ниже перенесён полный текст исходных материалов PsiTrends без пересказа и сокращения. Исторические заявления о здоровье, энергетических эффектах, сертификации и старые предложения сохранены как часть архива и не являются медицинской рекомендацией или актуальной гарантией результата." : "Below is the complete PsiTrends source material, preserved without summarising or shortening. Historical health, energy-effect, certification and promotional claims are retained as archive material, not as medical guidance or current guarantees."}</aside> : null}
        {isCanonicalYggdrasil ? <YggdrasilProgramLanding locale={locale} /> : hasBody ? <div className="academy-source-content">{renderBlocks(publicBlocks)}</div> : <p className="academy-empty-source">{text.noContent}</p>}
        {tantraImages.length ? <section className="academy-media-section academy-photo-archive" aria-label={locale === "ru" ? "Фотоматериалы Тантра Рейки" : "Tantra Reiki photo archive"}><h2>{locale === "ru" ? "Фотоматериалы исходной страницы" : "Photo materials from the source page"}</h2><div className="academy-photo-grid">{tantraImages.map((url, index) => <figure key={url}><img src={url} loading="lazy" alt={(locale === "ru" ? "Тантра Рейки — архивное фото " : "Tantra Reiki archive photo ") + (index + 1)} /><figcaption>{index + 1}</figcaption></figure>)}</div></section> : null}
        {videos.length ? <section className="academy-media-section" aria-label={text.videos}><h2>{text.videos}</h2><div className="academy-video-grid">{videos.map((video, index) => <AcademyVideoPlayer key={video.id} youtubeId={video.id} title={video.lessonTitle ?? academyDisplayTitle(record, locale) + " — video " + (index + 1)} />)}</div></section> : null}
        <section className="academy-resource-links" aria-label={text.reading}><Link href={"/" + locale + "/library"}>{text.reading}<span aria-hidden="true">→</span></Link><Link href={"/" + locale + "/services"}>{text.services}<span aria-hidden="true">→</span></Link></section>
        <footer className="academy-source-footer">
          {isCanonicalYggdrasil ? (
            <>
              <a href="https://reiki-yggdrasil.vercel.app/" rel="noreferrer" target="_blank">
                {locale === "ru" ? "Актуальный сайт Reiki Yggdrasil" : locale === "es" ? "Sitio actual de Reiki Yggdrasil" : "Current Reiki Yggdrasil site"}
                <span aria-hidden="true">↗</span>
              </a>
              <a className="academy-secondary-source" href={record.sourceUrl} rel="noreferrer" target="_blank">
                {locale === "ru" ? "Исторический источник PsiTrends" : locale === "es" ? "Fuente histórica de PsiTrends" : "Historical PsiTrends source"}
                <span aria-hidden="true">↗</span>
              </a>
            </>
          ) : (
            <>
              {record.skippedRiskyBlocks || publicOmittedCount ? <p>{text.filtered}</p> : null}
              <a href={record.sourceUrl} rel="noreferrer" target="_blank">{text.source}<span aria-hidden="true">↗</span></a>
            </>
          )}
          {isCanonicalYggdrasil ? <code>reiki-yggdrasil@3fd7960aa77862c38f8a5754b64c3a79f5e0c96a</code> : record.contentHash ? <code>{record.hashAlgorithm ?? "hash"} {record.contentHash}</code> : null}
        </footer>
      </article>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}

export function makeFacultiesRecord(record: AcademySourceRecord, locale: PublicLocale): AcademySourceRecord {
  const start = record.content.findIndex((block) => /study areas.*facult|факульт|направлен.*обуч/i.test(block.text));
  const source = start >= 0 ? record.content.slice(start + 1) : record.content;
  const end = source.findIndex((block) => /specializations|специализац/i.test(block.text));
  const content = (end >= 0 ? source.slice(0, end) : source).filter((block) => block.type !== "h1");
  return { ...record, logicalId: "history/faculties", routeKey: "history/faculties", title: locale === "ru" ? "Исторические факультеты и традиции" : locale === "es" ? "Facultades y tradiciones históricas" : "Historical faculties & traditions", content };
}
