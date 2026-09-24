"use client";

import { Flower2, Sprout, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { SiteNavigation } from "@/components/site-navigation";
import type { Locale } from "@/data/remedies";

const copy = {
  ru: {
    wordmark: "восстановление · практика · поддержка",
    homeLabel: "Holistic House — главная",
    eyebrow: "Бережное пространство для",
    titleTop: "Восстановления",
    titleBottom: "и внутреннего развития",
    intro: "Личные сессии, подбор средств, поддержка тела и психики и осознанная практика — для более гармоничной жизни в согласии с собой.",
    primary: "Записаться на сессию",
    secondary: "Смотреть услуги",
    servicesTitle: "Наши услуги",
    seeAll: "Все услуги",
    cards: [
      {
        icon: Sprout,
        title: "Личные сессии",
        text: "Консультации для ясности, восстановления и роста.",
        href: "/ru/services#consultation",
      },
      {
        icon: Flower2,
        title: "Подбор средств",
        text: "Личная поддержка в выборе подходящих натуральных средств.",
        href: "/ru/homeopathy",
      },
      {
        icon: Sun,
        title: "Программы и семинары",
        text: "Групповые встречи для глубокой практики и внутренних перемен.",
        href: "/ru/services",
      },
    ],
    learnMore: "Подробнее",
    libraryEyebrow: "Для тех, кто хочет исследовать глубже",
    libraryTitle: "Книги и библиотека",
    libraryText: "Книги, справочные материалы и цифровые ресурсы для вдохновения.",
    libraryAction: "Открыть библиотеку",
    footer: "Индивидуальная работа, осознанные практики и пространство для внутреннего развития.",
  },
  en: {
    wordmark: "healing · practice · guidance",
    homeLabel: "Holistic House — home",
    eyebrow: "A gentle space for",
    titleTop: "Healing and",
    titleBottom: "Inner Development",
    intro: "Private sessions, remedy guidance, body–mind support, and thoughtful practice — for a more balanced, authentic life.",
    primary: "Book a session",
    secondary: "Explore services",
    servicesTitle: "Our Services",
    seeAll: "See all services",
    cards: [
      {
        icon: Sprout,
        title: "Private Sessions",
        text: "Personal consultations for clarity, healing and growth.",
        href: "/en/services#consultation",
      },
      {
        icon: Flower2,
        title: "Remedy Guidance",
        text: "Individual support in finding the right natural remedies.",
        href: "/en/homeopathy",
      },
      {
        icon: Sun,
        title: "Programs & Workshops",
        text: "Group experiences for deeper practice and transformation.",
        href: "/en/services",
      },
    ],
    learnMore: "Learn more",
    libraryEyebrow: "For those who wish to explore further",
    libraryTitle: "Books & Library",
    libraryText: "Inspiring books, reference materials, and digital resources.",
    libraryAction: "Explore the library",
    footer: "Individual work, thoughtful practice, and a space for inner development.",
  },
} as const;

type HolisticHouseHomeProps = { locale?: Locale };

export function HolisticHouseHome({ locale: initialLocale = "ru" }: HolisticHouseHomeProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const text = copy[locale];

  return (
    <main className="house-home house-home--services" lang={locale}>
      <header className="house-header house-header--services">
        <Link className="house-wordmark" href="/" aria-label={text.homeLabel}>
          Holistic House
          <span>{text.wordmark}</span>
        </Link>
        <SiteNavigation locale={locale} onLocaleChange={setLocale} />
      </header>

      <section className="service-home-hero" aria-labelledby="house-title">
        <div className="service-home-hero-photo" aria-hidden="true">
          <Image
            src="/images/holistic-house/hero-olive-incense.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1127px) 55vw, 620px"
          />
        </div>
        <div className="service-home-hero-copy">
          <p className="service-home-kicker">{text.eyebrow}</p>
          <h1 id="house-title">
            <span>{text.titleTop}</span>{" "}
            <span>{text.titleBottom}</span>
          </h1>
          <p className="service-home-intro">{text.intro}</p>
          <div className="service-home-actions">
            <Link className="service-home-button service-home-button--primary" href={"/" + locale + "/services#consultation"}>
              {text.primary}<span aria-hidden="true">→</span>
            </Link>
            <Link className="service-home-button service-home-button--secondary" href={"/" + locale + "/services"}>
              {text.secondary}
            </Link>
          </div>
        </div>
      </section>

      <section className="service-home-services" aria-labelledby="service-home-services-title">
        <div className="service-home-section-heading">
          <h2 id="service-home-services-title">{text.servicesTitle}</h2>
          <Link href={"/" + locale + "/services"}>{text.seeAll}<span aria-hidden="true">→</span></Link>
        </div>
        <div className="service-home-card-grid">
          {text.cards.map(({ icon: Icon, ...card }) => (
            <Link className="service-home-card" href={card.href} key={card.title}>
              <span className="service-home-card-symbol" aria-hidden="true"><Icon /></span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <span className="service-home-card-action">{text.learnMore}<span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="service-home-library" aria-labelledby="service-home-library-title">
        <Image
          src="/images/holistic-house/books-library.webp"
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 1200px"
          className="service-home-library-photo"
        />
        <div className="service-home-library-copy">
          <p className="service-home-kicker">{text.libraryEyebrow}</p>
          <h2 id="service-home-library-title">{text.libraryTitle}</h2>
          <p className="service-home-library-intro">{text.libraryText}</p>
          <Link href={"/" + locale + "/books"}>{text.libraryAction}<span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <footer className="service-home-footer">
        <Link className="house-wordmark" href="/">Holistic House</Link>
        <p>{text.footer}</p>
        <Link href={"/" + locale + "/services"}>{text.secondary}<span aria-hidden="true">→</span></Link>
      </footer>
    </main>
  );
}
