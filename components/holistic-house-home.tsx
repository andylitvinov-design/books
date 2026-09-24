"use client";

import { BriefcaseBusiness, Flower2, Sparkles } from "lucide-react";
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
    intro: "Бизнес-расстановки, Алхимия души и архетипическая работа — три направления для ясности, развития и более глубокого контакта с собой.",
    primary: "Записаться на сессию",
    secondary: "Смотреть услуги",
    servicesTitle: "Наши услуги",
    seeAll: "Все услуги",
    cards: [
      {
        icon: BriefcaseBusiness,
        title: "Бизнес-расстановки",
        text: "Системный анализ перспектив бизнес-проектов, ролей, партнёрств, денег и возможных следующих шагов.",
        href: "/ru/services#business",
      },
      {
        icon: Flower2,
        title: "Алхимия души",
        text: "Психогомеопатия и индивидуальная работа с внутренними состояниями в рамках авторского подхода.",
        href: "/ru/services#alchemy",
      },
      {
        icon: Sparkles,
        title: "Архетипические расстановки",
        text: "Мистерии и инициации: работа с архетипами, образами и трансперсональным полем.",
        href: "/ru/services#archetypal",
      },
    ],
    learnMore: "Подробнее",
    libraryEyebrow: "Авторская книга",
    libraryTitle: "Алхимия души",
    libraryText: "Моя книга о внутреннем развитии, психогомеопатии и авторском подходе к работе с состояниями.",
    libraryAction: "Читать книгу",
    bookUrl: "https://designrr.page/?id=367554&token=1057485987&h=4958",
    aboutEyebrow: "Обо мне",
    aboutTitle: "Andrii Litvinov",
    aboutText: "Консультант, фасилитатор и преподаватель. Более 20 лет работаю с группами и практиками внутреннего развития; соединяю системные расстановки, образную работу, телесные подходы и исследование архетипов.",
    aboutAction: "Подробнее обо мне",
    footer: "Индивидуальная работа, осознанные практики и пространство для внутреннего развития.",
  },
  en: {
    wordmark: "healing · practice · guidance",
    homeLabel: "Holistic House — home",
    eyebrow: "A gentle space for",
    titleTop: "Healing and",
    titleBottom: "Inner Development",
    intro: "Business constellations, Alchemy of the Soul, and archetypal work — three directions for clarity, development, and a deeper relationship with yourself.",
    primary: "Book a session",
    secondary: "Explore services",
    servicesTitle: "Our Services",
    seeAll: "See all services",
    cards: [
      {
        icon: BriefcaseBusiness,
        title: "Business Constellations",
        text: "Systemic exploration of business projects, roles, partnerships, money, and possible next steps.",
        href: "/en/services#business",
      },
      {
        icon: Flower2,
        title: "Alchemy of the Soul",
        text: "Psychohomeopathy and individual work with inner states within the author-developed framework.",
        href: "/en/services#alchemy",
      },
      {
        icon: Sparkles,
        title: "Archetypal Constellations",
        text: "Mysteries & Initiations: work with archetypes, imagery, and the transpersonal field.",
        href: "/en/services#archetypal",
      },
    ],
    learnMore: "Learn more",
    libraryEyebrow: "Author book",
    libraryTitle: "The Power of Life",
    libraryText: "My book on inner development, psychohomeopathy, and an integrative approach to working with human states.",
    libraryAction: "Read the book",
    bookUrl: "https://designrr.page/?id=377444&token=639498968&h=5264",
    aboutEyebrow: "About",
    aboutTitle: "Andrii Litvinov",
    aboutText: "Consultant, facilitator, and teacher. For more than 20 years I have worked with groups and inner-development practices, combining systemic constellations, imagery, embodied approaches, and archetypal exploration.",
    aboutAction: "About my work",
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

      <section className="service-home-about" aria-labelledby="service-home-about-title">
        <div>
          <p className="service-home-kicker">{text.aboutEyebrow}</p>
          <h2 id="service-home-about-title">{text.aboutTitle}</h2>
        </div>
        <div>
          <p>{text.aboutText}</p>
          <Link href={"/" + locale + "/about"}>{text.aboutAction}<span aria-hidden="true">→</span></Link>
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
          <a href={text.bookUrl}>{text.libraryAction}<span aria-hidden="true">→</span></a>
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
