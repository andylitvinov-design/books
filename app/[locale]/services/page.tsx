import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  ru: {
    title: "Услуги и Алхимия души — Holistic House",
    description: "Описание авторского подхода «Алхимия души», индивидуальных консультаций и сопровождения.",
    kicker: "Индивидуальная работа",
    heading: "Услуги",
    lead: "Форматы работы, описанные в материалах проекта «Алхимия души»: диагностика состояния, индивидуальные рекомендации, расстановочная и психотерапевтическая работа, сопровождение и повторная проверка.",
    approachKicker: "Подход",
    approachTitle: "Алхимия души",
    approachText: "В авторских материалах «Алхимия души» описана как интегративная рамка, объединяющая системные расстановки, гомеопатию, алхимические инструменты и психотерапевтическую работу. Эссенции Баха используются как более мягкая линия поддержки, а гомеопатические и другие инструменты — как часть индивидуально подобранной работы.",
    cards: [
      { title: "Диагностика и индивидуальная рекомендация", text: "Разбор запроса и состояния, поиск ключевых факторов и составление индивидуальной рекомендации с последующей проверкой динамики." },
      { title: "Сопровождение", text: "В опубликованных материалах основной цикл описан как две сессии и поддержка между ними: первая диагностика и назначение, затем повторная проверка и коррекция." },
      { title: "Системные расстановки и работа с образами", text: "Расстановочная модель используется для диагностики и отслеживания изменений; в расширенной работе упоминаются образы, субличности и психотерапевтическая интеграция." },
      { title: "Препараты и эссенции Баха", text: "Авторские материалы включают гомеопатические препараты и эссенции Баха как отдельные линии рекомендаций внутри общей системы сопровождения." },
    ],
    book: "Читать книгу «Услуги, формат работы и сопровождение»",
    consultation: "Бесплатная консультация",
    consultationText: "Можно начать с короткого разговора о вашем запросе и подходящем формате работы.",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    note: "Описание основано на опубликованных материалах проекта. Конкретный формат, стоимость и границы работы уточняются перед началом. Материалы не заменяют медицинскую диагностику или лечение.",
  },
  en: {
    title: "Services and Alchemy of the Soul — Holistic House",
    description: "An overview of the author’s Alchemy of the Soul approach, individual consultations, and ongoing support.",
    kicker: "Individual work",
    heading: "Services",
    lead: "Formats described in the Alchemy of the Soul project materials: assessment, individualized recommendations, constellation and psychotherapeutic work, ongoing support, and follow-up review.",
    approachKicker: "Approach",
    approachTitle: "Alchemy of the Soul",
    approachText: "In the author’s materials, Alchemy of the Soul is described as an integrative framework combining systemic constellations, homeopathy, alchemical tools, and psychotherapeutic work. Bach flower essences are presented as a gentler support line, while homeopathic and other tools are used as part of individualized work.",
    cards: [
      { title: "Assessment and individual recommendation", text: "Clarifying the request and current state, identifying key factors, and creating an individual recommendation followed by review of changes." },
      { title: "Ongoing support", text: "Published materials describe a core cycle of two sessions with support in between: initial assessment and recommendation, followed by reassessment and adjustment." },
      { title: "Systemic constellations and imagery work", text: "Constellation work is described as a diagnostic and tracking framework; expanded formats also mention imagery, subpersonalities, and psychotherapeutic integration." },
      { title: "Remedies and Bach flower essences", text: "The author materials include homeopathic remedies and Bach flower essences as distinct recommendation lines within a broader support framework." },
    ],
    book: "Read “Services, workflow, and ongoing support”",
    consultation: "Free consultation",
    consultationText: "You can start with a short conversation about your request and which format may fit.",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    note: "This description is based on published project materials. The exact format, price, and scope are confirmed before work begins. These materials do not replace medical diagnosis or treatment.",
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
      canonical: `/${locale}/services`,
      languages: { ru: "/ru/services", en: "/en/services" },
    },
  };
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const current = copy[locale as Locale];

  return (
    <main className="services-shell">
      <PublicSiteHeader locale={locale} />

      <section className="services-hero">
        <p className="homeopathy-kicker">{current.kicker}</p>
        <h1>{current.heading}</h1>
        <p>{current.lead}</p>
      </section>

      <section className="services-approach">
        <p className="homeopathy-kicker">{current.approachKicker}</p>
        <h2>{current.approachTitle}</h2>
        <p>{current.approachText}</p>
        <Link href="/books/alchemy-services-workflow">{current.book} →</Link>
      </section>

      <section className="services-grid" aria-label={current.heading}>
        {current.cards.map((card) => (
          <article key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
      </section>

      <section className="services-consultation">
        <div>
          <p className="homeopathy-kicker">{locale === "ru" ? "Первый шаг" : "First step"}</p>
          <h2>{current.consultation}</h2>
          <p>{current.consultationText}</p>
        </div>
        <div>
          <a href="https://t.me/AndyTherapist" rel="noreferrer" target="_blank">{current.telegram}</a>
          <a href="https://wa.me/14376066502" rel="noreferrer" target="_blank">{current.whatsapp}</a>
        </div>
      </section>

      <p className="remedy-disclaimer services-disclaimer">{current.note}</p>
    </main>
  );
}
