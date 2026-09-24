import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeartHandshake, Leaf, Sparkles, Users } from "lucide-react";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  ru: {
    title: "Услуги и Алхимия души — Holistic House",
    description: "Индивидуальные сессии, сопровождение, расстановки и поддерживающие практики Holistic House.",
    kicker: "Пространство индивидуальной работы",
    heading: "Услуги",
    lead: "Выберите формат, который подходит вашему запросу сейчас. Работа может быть мягкой и поддерживающей или более глубокой — с образами, расстановками и телесным исследованием.",
    cards: [
      { title: "Индивидуальная сессия", text: "Разобрать запрос, внутреннее состояние и следующий шаг в спокойном личном формате.", icon: HeartHandshake },
      { title: "Сопровождение", text: "Несколько встреч с поддержкой между ними, чтобы отслеживать изменения и корректировать направление.", icon: Sparkles },
      { title: "Расстановки и образы", text: "Системная работа, образы и субличности для исследования повторяющихся жизненных сценариев.", icon: Users },
      { title: "Подбор поддерживающих средств", text: "Навигация по авторской библиотеке препаратов и мягким дополнительным линиям поддержки.", icon: Leaf },
    ],
    approachKicker: "Авторский подход",
    approachTitle: "Alchemy of the Soul",
    approachText: "Интегративная рамка, объединяющая системную работу, образы, телесные практики и авторские инструменты. Конкретный формат подбирается под ваш запрос и границы.",
    book: "Подробнее о подходе",
    consultationKicker: "Первый шаг",
    consultation: "Начните с короткого разговора",
    consultationText: "Опишите ваш запрос — вместе определим, какой формат сейчас будет наиболее уместным.",
    telegram: "Написать в Telegram",
    whatsapp: "WhatsApp",
    note: "Формат, стоимость и границы работы согласуются до начала. Информационные материалы сайта не заменяют медицинскую диагностику или лечение.",
  },
  en: {
    title: "Services and Alchemy of the Soul — Holistic House",
    description: "Private sessions, ongoing support, constellations, and supportive practices at Holistic House.",
    kicker: "A space for individual work",
    heading: "Services",
    lead: "Choose the format that fits your present needs. The work can be gentle and supportive or go deeper through imagery, constellations, and embodied exploration.",
    cards: [
      { title: "Private Session", text: "Explore your request, inner state, and next step in a calm one-to-one setting.", icon: HeartHandshake },
      { title: "Ongoing Support", text: "A short series of sessions with support between meetings to review changes and refine direction.", icon: Sparkles },
      { title: "Constellations & Imagery", text: "Systemic work, imagery, and subpersonalities for exploring recurring life patterns.", icon: Users },
      { title: "Remedy Guidance", text: "Guidance through the author remedy library and gentler complementary lines of support.", icon: Leaf },
    ],
    approachKicker: "Author approach",
    approachTitle: "Alchemy of the Soul",
    approachText: "An integrative framework combining systemic work, imagery, embodied practices, and author-developed tools. The exact format is shaped around your goals and boundaries.",
    book: "Read about the approach",
    consultationKicker: "First step",
    consultation: "Start with a short conversation",
    consultationText: "Tell me what you would like to work on, and we can choose the format that fits best right now.",
    telegram: "Message on Telegram",
    whatsapp: "WhatsApp",
    note: "Format, price, and scope are agreed before work begins. Site materials do not replace medical diagnosis or treatment.",
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
      canonical: "/" + locale + "/services",
      languages: { ru: "/ru/services", en: "/en/services" },
    },
  };
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const current = copy[locale as Locale];

  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} />

      <section className="services-studio-hero">
        <div className="services-studio-hero-copy">
          <p className="homeopathy-kicker">{current.kicker}</p>
          <h1>{current.heading}</h1>
          <p>{current.lead}</p>
          <Link className="services-studio-primary" href="#consultation">
            {current.consultation}<span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="services-studio-photo" aria-hidden="true">
          <Image
            src="/images/holistic-house/hero-olive-incense.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, 44vw"
          />
        </div>
      </section>

      <section className="services-studio-grid" aria-label={current.heading}>
        {current.cards.map(({ icon: Icon, title, text }) => (
          <article className="services-studio-card" key={title}>
            <span className="services-studio-icon" aria-hidden="true"><Icon /></span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="services-studio-approach">
        <div>
          <p className="homeopathy-kicker">{current.approachKicker}</p>
          <h2>{current.approachTitle}</h2>
        </div>
        <div>
          <p>{current.approachText}</p>
          <Link href="/books/alchemy-services-workflow">{current.book}<span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="services-consultation services-consultation--studio" id="consultation">
        <div>
          <p className="homeopathy-kicker">{current.consultationKicker}</p>
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
