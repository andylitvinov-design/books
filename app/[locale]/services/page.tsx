import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, Flower2, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  ru: {
    title: "Услуги — Holistic House",
    description: "Бизнес-расстановки, Алхимия души / психогомеопатия и архетипические расстановки.",
    kicker: "Три направления работы",
    heading: "Услуги",
    lead: "Три формата для разных задач: бизнес и решения, внутренние состояния и развитие, архетипическая и трансперсональная работа.",
    cards: [
      {
        id: "business",
        title: "Бизнес-расстановки",
        subtitle: "Анализ перспектив бизнес-проектов",
        text: "Системное исследование проекта: его перспектив, скрытых динамик, партнёрств, ролей, денег, ограничений и возможных следующих шагов. Это способ увидеть ситуацию шире и проверить решения через расстановочное поле.",
        icon: BriefcaseBusiness,
      },
      {
        id: "alchemy",
        title: "Алхимия души / психогомеопатия",
        subtitle: "Индивидуальная работа с внутренними состояниями",
        text: "Авторский формат, объединяющий образную и системную работу с навигацией по поддерживающим средствам. Фокус — внутренние состояния, повторяющиеся паттерны, ресурсы и движение к более целостному состоянию.",
        icon: Flower2,
      },
      {
        id: "archetypal",
        title: "Архетипические расстановки",
        subtitle: "Мистерии и инициации",
        text: "Экспериментальная работа с архетипами, мифологическими образами, ритуальной структурой и трансперсональным полем — индивидуально или в группе.",
        icon: Sparkles,
      },
    ],
    approachKicker: "О подходе",
    approachTitle: "Одна практика — три направления",
    approachText: "Во всех форматах я работаю через системное поле, образы и внимательное исследование динамики. Разница — в фокусе: бизнес, внутреннее состояние или архетипический уровень.",
    about: "Обо мне",
    consultationKicker: "Первый шаг",
    consultation: "Начните с короткого разговора",
    consultationText: "Опишите ваш запрос — вместе определим, какой из трёх форматов сейчас наиболее уместен.",
    telegram: "Написать в Telegram",
    whatsapp: "WhatsApp",
    note: "Бизнес-расстановки являются методом системного исследования и не заменяют финансовую экспертизу или прогноз. Материалы по психогомеопатии носят образовательный характер и не заменяют медицинскую диагностику или лечение.",
  },
  en: {
    title: "Services — Holistic House",
    description: "Business Constellations, Alchemy of the Soul / Psychohomeopathy, and Archetypal Constellations.",
    kicker: "Three directions of work",
    heading: "Services",
    lead: "Three formats for different needs: business and decision-making, inner states and development, and archetypal / transpersonal exploration.",
    cards: [
      {
        id: "business",
        title: "Business Constellations",
        subtitle: "Exploring the prospects of business projects",
        text: "A systemic exploration of a project: its prospects, hidden dynamics, partnerships, roles, money, constraints, and possible next steps. The aim is to widen the view and test decisions through constellation work.",
        icon: BriefcaseBusiness,
      },
      {
        id: "alchemy",
        title: "Alchemy of the Soul / Psychohomeopathy",
        subtitle: "Individual work with inner states",
        text: "An author-developed format combining imagery and systemic exploration with guidance around supportive remedies. The focus is on inner states, recurring patterns, resources, and movement toward greater wholeness.",
        icon: Flower2,
      },
      {
        id: "archetypal",
        title: "Archetypal Constellations",
        subtitle: "Mysteries & Initiations",
        text: "Experiential work with archetypes, mythic imagery, ritual structure, and the transpersonal field — individually or in groups.",
        icon: Sparkles,
      },
    ],
    approachKicker: "About the approach",
    approachTitle: "One practice, three directions",
    approachText: "Across all three formats I work with systemic fields, imagery, and close attention to dynamics. What changes is the focus: business, inner states, or the archetypal level.",
    about: "About me",
    consultationKicker: "First step",
    consultation: "Start with a short conversation",
    consultationText: "Tell me what you would like to explore, and we can choose which of the three formats fits best right now.",
    telegram: "Message on Telegram",
    whatsapp: "WhatsApp",
    note: "Business constellations are a systemic exploration method and do not replace financial due diligence or forecasting. Psychohomeopathy materials are educational and do not replace medical diagnosis or treatment.",
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

      <section className="services-studio-grid services-studio-grid--three" aria-label={current.heading}>
        {current.cards.map(({ id, icon: Icon, title, subtitle, text }) => (
          <article className="services-studio-card services-studio-card--detailed" id={id} key={title}>
            <span className="services-studio-icon" aria-hidden="true"><Icon /></span>
            <h2>{title}</h2>
            <p className="services-studio-card-subtitle">{subtitle}</p>
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
          <Link href={"/" + locale + "/about"}>{current.about}<span aria-hidden="true">→</span></Link>
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
