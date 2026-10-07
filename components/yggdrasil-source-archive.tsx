import Link from "next/link";
import type { ReactNode } from "react";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import archive from "@/data/academy/yggdrasil-source-archive.generated.json";
import type { PublicLocale } from "@/lib/public-locales";

type SourceLocale = "en" | "ru";
type SourceRecord = { sourceUrl: string; finalUrl: string; title: string; description?: string | null; markdown: string; images: string[] };

function cleanInline(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\\([\\*_[\]#])/g, "$1")
    .trim();
}

function renderMarkdown(markdown: string) {
  const nodes: ReactNode[] = [];
  let list: string[] = [];
  let paragraph: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    const items = list;
    list = [];
    nodes.push(<ul className="academy-source-list" key={"list-" + nodes.length}>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>);
  };
  const flushParagraph = () => {
    const text = cleanInline(paragraph.join(" ").replace(/\s+/g, " "));
    paragraph = [];
    if (text) nodes.push(<p key={"p-" + nodes.length}>{text}</p>);
  };

  for (const raw of markdown.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph(); flushList();
      const text = cleanInline(heading[2]);
      const level = heading[1].length;
      if (level === 1) nodes.push(<h2 key={"h-" + nodes.length}>{text}</h2>);
      else if (level === 2) nodes.push(<h2 key={"h-" + nodes.length}>{text}</h2>);
      else if (level === 3) nodes.push(<h3 key={"h-" + nodes.length}>{text}</h3>);
      else nodes.push(<h4 key={"h-" + nodes.length}>{text}</h4>);
      continue;
    }
    const item = line.match(/^[-*]\s+(.*)$/);
    if (item) {
      flushParagraph();
      list.push(cleanInline(item[1]));
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph(); flushList();
  return nodes;
}

export function YggdrasilSourceArchivePage({ locale }: { locale: PublicLocale }) {
  const sourceLocale: SourceLocale = locale === "ru" ? "ru" : "en";
  const source = (archive.sources as Record<SourceLocale, SourceRecord>)[sourceLocale];
  const copy = {
    en: {
      title: "Reiki Yggdrasil — complete historical program source",
      lead: "The full public PsiTrends program page is preserved here without summarising it. The current seven-module learning map remains available as separate course landings.",
      notice: "This is historical source material. Claims about healing, clairvoyance, energetic effects, certification or outcomes are preserved for archival accuracy and are not current medical advice or guarantees.",
      program: "Current Reiki Yggdrasil program",
      source: "Original PsiTrends page",
      photos: "Source images",
    },
    ru: {
      title: "Рейки Иггдрасиль — полный исторический текст программы",
      lead: "Здесь без пересказа сохранён полный публичный текст программы с PsiTrends. Актуальная семимодульная карта обучения вынесена в отдельные лендинги.",
      notice: "Это исторический учебный источник. Формулировки о целительстве, ясновидении, энергетических эффектах, сертификации и результатах сохранены для точности архива и не являются текущей медицинской рекомендацией или гарантией.",
      program: "Актуальная программа Рейки Иггдрасиль",
      source: "Оригинальная страница PsiTrends",
      photos: "Изображения исходной страницы",
    },
    es: {
      title: "Reiki Yggdrasil — fuente histórica completa",
      lead: "Se conserva aquí la página pública completa de PsiTrends sin resumirla. El mapa formativo actual está disponible en páginas separadas.",
      notice: "Material histórico: las afirmaciones de sanación, clarividencia, efectos energéticos, certificación o resultados no constituyen consejo médico ni garantías actuales.",
      program: "Programa actual Reiki Yggdrasil",
      source: "Página original de PsiTrends",
      photos: "Imágenes de la fuente",
    },
  }[locale];

  return (
    <main className="academy-reading-shell yggdrasil-source-archive-page" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <AcademyBackLink locale={locale} />
      <article className="academy-reading">
        <header className="academy-reading-header">
          <p className="homeopathy-kicker">Reiki Yggdrasil</p>
          <h1>{copy.title}</h1>
          <p>{copy.lead}</p>
        </header>
        <nav className="yggdrasil-module-breadcrumb">
          <Link href={`/${locale}/academy/reiki/yggdrasil`}>← {copy.program}</Link>
          <a href={source.sourceUrl} target="_blank" rel="noreferrer">{copy.source} ↗</a>
        </nav>
        <aside className="academy-archive-notice">{copy.notice}</aside>
        <div className="academy-source-content yggdrasil-verbatim-source">{renderMarkdown(source.markdown)}</div>
        {source.images.length ? (
          <section className="academy-source-gallery-section">
            <h2>{copy.photos}</h2>
            <div className="academy-source-gallery">
              {source.images.map((src, index) => (
                <a href={src} key={src} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${copy.photos} ${index + 1}`} loading="lazy" decoding="async" />
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </article>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
