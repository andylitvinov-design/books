import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookShowcase } from "@/components/book-showcase";
import { PublicSiteHeader } from "@/components/public-site-header";
import { RemedySearchBox } from "@/components/remedy-search-box";
import { books } from "@/data/library";
import { getHomeopathyLocaleParams, getRemedyDirectory, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  ru: {
    title: "Препараты — Holistic House",
    description: "Поиск по авторской библиотеке гомеопатических препаратов, книги проекта и запись на бесплатную консультацию.",
    kicker: "Справочная библиотека",
    heading: "Препараты",
    lead: "Найдите нужный препарат по латинскому или русскому названию, алиасу или сокращению.",
    consultation: "Бесплатная консультация",
    consultationText: "Если хотите разобрать свой запрос и понять, какой формат работы вам подходит, можно начать с бесплатной консультации.",
    telegram: "Написать в Telegram",
    whatsapp: "WhatsApp",
    booksKicker: "Библиотека",
    booksHeading: "Мои книги",
    booksLead: "Книги и методички проекта с исходными изображениями и структурой разделов.",
    allBooks: "Открыть библиотеку книг",
    disclaimer: "Материалы публикуются как образовательный архив авторских текстов и не заменяют медицинскую диагностику или лечение.",
  },
  en: {
    title: "Remedies — Holistic House",
    description: "Search the author remedy library, browse the project books, and request a free consultation.",
    kicker: "Reference library",
    heading: "Remedies",
    lead: "Find a remedy by Latin or Russian/common name, alias, or abbreviation.",
    consultation: "Free consultation",
    consultationText: "If you would like to discuss your request and understand which format may fit, you can start with a free consultation.",
    telegram: "Message on Telegram",
    whatsapp: "WhatsApp",
    booksKicker: "Library",
    booksHeading: "My books",
    booksLead: "Project books and guides with their original images and section structure.",
    allBooks: "Open full book library",
    disclaimer: "These materials are an educational archive of the author’s texts and do not replace medical diagnosis or treatment.",
  },
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const current = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.title,
    description: current.description,
    alternates: {
      canonical: `/${locale}/homeopathy`,
      languages: { ru: "/ru/homeopathy", en: "/en/homeopathy" },
    },
  };
}

export default async function HomeopathyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const current = copy[locale as Locale];

  return (
    <main className="homeopathy-shell remedies-landing">
      <PublicSiteHeader locale={locale} />

      <section className="remedies-hero">
        <p className="homeopathy-kicker">{current.kicker}</p>
        <h1>{current.heading}</h1>
        <p>{current.lead}</p>
        <RemedySearchBox entries={getRemedyDirectory(locale)} locale={locale} />
      </section>

      <section className="remedies-consultation-banner" aria-labelledby="free-consultation-title">
        <div>
          <p className="homeopathy-kicker">{locale === "ru" ? "Начать с разговора" : "Start with a conversation"}</p>
          <h2 id="free-consultation-title">{current.consultation}</h2>
          <p>{current.consultationText}</p>
        </div>
        <div className="remedies-consultation-actions">
          <a href="https://t.me/AndyTherapist" rel="noreferrer" target="_blank">{current.telegram}</a>
          <a href="https://wa.me/14376066502" rel="noreferrer" target="_blank">{current.whatsapp}</a>
        </div>
      </section>

      <section className="remedies-books-section" aria-labelledby="remedies-books-title">
        <div className="remedies-section-heading">
          <div>
            <p className="homeopathy-kicker">{current.booksKicker}</p>
            <h2 id="remedies-books-title">{current.booksHeading}</h2>
            <p>{current.booksLead}</p>
          </div>
          <Link href="/books">{current.allBooks} →</Link>
        </div>
        <BookShowcase books={books} locale={locale} />
      </section>

      <p className="remedy-disclaimer remedies-landing-disclaimer">{current.disclaimer}</p>
    </main>
  );
}
