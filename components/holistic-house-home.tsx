"use client";

import Link from "next/link";
import { useState } from "react";

import { SiteNavigation } from "@/components/site-navigation";
import type { Locale } from "@/data/remedies";

const copy = {
  ru: {
    wordmark: "развитие · практика · поддержка",
    homeLabel: "Holistic House — главная",
    eyebrow: "Мягкое пространство для",
    titleTop: "Внутреннего",
    titleBottom: "развития",
    intro: "Индивидуальные сессии, подбор поддерживающих средств, практики для тела и психики и групповые программы — вокруг вашего запроса и темпа.",
    primary: "Записаться на консультацию",
    secondary: "Смотреть услуги",
    servicesEyebrow: "Форматы работы",
    servicesTitle: "Наши услуги",
    seeAll: "Все услуги",
    cards: [
      {
        symbol: "✦",
        title: "Индивидуальные сессии",
        text: "Личная работа с запросом, внутренними состояниями, образами и жизненными изменениями.",
        action: "Подробнее",
        href: "/ru/services",
      },
      {
        symbol: "◌",
        title: "Remedy Guidance",
        text: "Индивидуальная навигация по авторской библиотеке препаратов и поддерживающим подходам.",
        action: "Исследовать",
        href: "/ru/homeopathy",
      },
      {
        symbol: "◎",
        title: "Программы и воркшопы",
        text: "Групповые практики, телесная работа, расстановки и пространства для более глубокого исследования.",
        action: "Смотреть форматы",
        href: "/ru/services",
      },
    ],
    libraryEyebrow: "Для самостоятельного исследования",
    libraryTitle: "Книги и библиотека",
    libraryText: "Авторские книги, справочные материалы и цифровые ресурсы остаются рядом — как поддержка между встречами.",
    libraryAction: "Открыть библиотеку",
    footer: "Holistic House объединяет индивидуальную работу, практики, справочные материалы и авторские исследовательские инструменты.",
  },
  en: {
    wordmark: "growth · practice · guidance",
    homeLabel: "Holistic House — home",
    eyebrow: "A gentle space for",
    titleTop: "Inner",
    titleBottom: "Development",
    intro: "Private sessions, remedy guidance, body–mind practices, and group programs — shaped around your goals and your own pace.",
    primary: "Book a consultation",
    secondary: "Explore services",
    servicesEyebrow: "Ways to work",
    servicesTitle: "Our Services",
    seeAll: "See all services",
    cards: [
      {
        symbol: "✦",
        title: "Private Sessions",
        text: "Personal work with your goals, inner states, imagery, and meaningful life transitions.",
        action: "Learn more",
        href: "/en/services",
      },
      {
        symbol: "◌",
        title: "Remedy Guidance",
        text: "Individual guidance through the author remedy library and supportive holistic approaches.",
        action: "Explore",
        href: "/en/homeopathy",
      },
      {
        symbol: "◎",
        title: "Programs & Workshops",
        text: "Group practices, body-based work, constellations, and spaces for deeper exploration.",
        action: "View formats",
        href: "/en/services",
      },
    ],
    libraryEyebrow: "For those who wish to explore further",
    libraryTitle: "Books & Library",
    libraryText: "Author books, reference materials, and digital resources remain close at hand — as support between sessions.",
    libraryAction: "Explore the library",
    footer: "Holistic House brings together individual work, practices, reference materials, and author-led research tools.",
  },
} as const;

type HolisticHouseHomeProps = { locale?: Locale };

export function HolisticHouseHome({ locale: initialLocale = "ru" }: HolisticHouseHomeProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const text = copy[locale];

  return (
    <main className="house-home house-home--services">
      <header className="house-header house-header--services">
        <Link className="house-wordmark" href="/" aria-label={text.homeLabel}>
          Holistic House
          <span>{text.wordmark}</span>
        </Link>
        <SiteNavigation locale={locale} onLocaleChange={setLocale} />
      </header>

      <section className="service-home-hero" aria-labelledby="house-title">
        <div className="service-home-hero-copy">
          <p className="service-home-kicker">{text.eyebrow}</p>
          <h1 id="house-title">
            <span>{text.titleTop}</span>
            <em>{text.titleBottom}</em>
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

        <div className="service-home-art" aria-hidden="true">
          <svg viewBox="0 0 520 560" role="presentation">
            <defs>
              <linearGradient id="vaseFill" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#d7c6aa" />
                <stop offset="1" stopColor="#b79d7c" />
              </linearGradient>
              <linearGradient id="tableFill" x1="0" x2="1">
                <stop offset="0" stopColor="#d7c7ae" />
                <stop offset="1" stopColor="#c0a98a" />
              </linearGradient>
            </defs>
            <rect x="44" y="438" width="452" height="24" rx="8" fill="url(#tableFill)" opacity=".9" />
            <rect x="338" y="377" width="132" height="26" rx="3" fill="#efe4cf" />
            <rect x="324" y="404" width="146" height="25" rx="3" fill="#e3d4bd" />
            <rect x="352" y="350" width="118" height="24" rx="3" fill="#f6edde" />
            <path d="M369 218 C349 250 349 334 376 363 C398 386 450 383 470 354 C487 329 477 255 453 219 Z" fill="url(#vaseFill)" />
            <ellipse cx="411" cy="218" rx="42" ry="12" fill="#a98e6f" opacity=".75" />
            <path d="M409 220 C393 162 357 128 323 87" fill="none" stroke="#706c49" strokeWidth="5" strokeLinecap="round" />
            <path d="M389 171 C424 142 451 106 461 72" fill="none" stroke="#706c49" strokeWidth="4" strokeLinecap="round" />
            <path d="M367 139 C337 124 308 108 286 79" fill="none" stroke="#706c49" strokeWidth="4" strokeLinecap="round" />
            <g fill="#7e8052">
              <ellipse cx="322" cy="87" rx="11" ry="29" transform="rotate(-36 322 87)" />
              <ellipse cx="350" cy="121" rx="10" ry="27" transform="rotate(-64 350 121)" />
              <ellipse cx="383" cy="155" rx="10" ry="29" transform="rotate(-28 383 155)" />
              <ellipse cx="431" cy="126" rx="10" ry="27" transform="rotate(48 431 126)" />
              <ellipse cx="457" cy="78" rx="9" ry="26" transform="rotate(28 457 78)" />
              <ellipse cx="298" cy="79" rx="9" ry="24" transform="rotate(-58 298 79)" />
              <ellipse cx="344" cy="149" rx="9" ry="24" transform="rotate(54 344 149)" />
            </g>
            <path d="M105 409 C134 380 207 382 241 410 L229 435 L119 435 Z" fill="#8b694d" opacity=".78" />
            <ellipse cx="173" cy="409" rx="69" ry="15" fill="#9c7a5b" />
            <path d="M187 394 L199 331" stroke="#68472f" strokeWidth="3" strokeLinecap="round" />
            <path d="M198 332 C190 321 192 309 198 300" fill="none" stroke="#c9b79a" strokeWidth="2" opacity=".75" />
          </svg>
          <p>More presence.<br /><em>A kinder pace.</em></p>
        </div>
      </section>

      <section className="service-home-services" aria-labelledby="service-home-services-title">
        <div className="service-home-section-heading">
          <div>
            <p className="service-home-kicker">{text.servicesEyebrow}</p>
            <h2 id="service-home-services-title">{text.servicesTitle}</h2>
          </div>
          <Link href={"/" + locale + "/services"}>{text.seeAll}<span aria-hidden="true">→</span></Link>
        </div>

        <div className="service-home-card-grid">
          {text.cards.map((card) => (
            <Link className="service-home-card" href={card.href} key={card.title}>
              <span className="service-home-card-symbol" aria-hidden="true">{card.symbol}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <span className="service-home-card-action">{card.action}<span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="service-home-library">
        <div>
          <p className="service-home-kicker">{text.libraryEyebrow}</p>
          <h2>{text.libraryTitle}</h2>
          <p>{text.libraryText}</p>
          <Link href="/books">{text.libraryAction}<span aria-hidden="true">→</span></Link>
        </div>
        <div className="service-home-library-art" aria-hidden="true">
          <span className="book book--one">WISDOM</span>
          <span className="book book--two">PRACTICE</span>
          <span className="book book--three">INNER WORK</span>
          <i className="library-leaf library-leaf--one" />
          <i className="library-leaf library-leaf--two" />
          <i className="library-leaf library-leaf--three" />
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
