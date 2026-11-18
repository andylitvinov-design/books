import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import { Suspense } from "react";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { HomePresentationVideoSection } from "@/components/home-presentation-video-section";
import { HomeDialogueEntry } from "@/components/home-dialogue-entry";
import { HomeDeferredSections } from "@/components/home-deferred-sections";




import { LOCAL_ACQUISITION } from "@/data/local-acquisition";
import type { Locale } from "@/data/remedies";

const copy = {
  ru: {
    wordmark: "восстановление · практика · поддержка",
    homeLabel: "Holistic House — главная",
    heroTitle: "Сложности в отношениях, работе или важном решении?",
    heroIntro: "Обсудите один важный вопрос с Андреем Литвиновым через системные расстановки и работу с образами. Личные сессии в Торонто и онлайн; можно начать и с бесплатного письменного разбора.",
    heroPrimary: "Получить бесплатный разбор",
    heroBook: "Запросить консультацию · от €50",
    heroSecondary: "Пройти бесплатные тесты",
    aboutKicker: "Лично об Андрее",
    aboutIntro: "Я работаю с индивидуальными и групповыми практиками с 2002 года. Образы, системные расстановки и архетипические подходы помогают нам внимательнее исследовать ваш запрос. Принимаю запросы онлайн и в Торонто.",
    aboutAction: "Подробнее об Андрее",
    footer: "Индивидуальная работа, осознанные практики и пространство для внутреннего развития.",
  },
  en: {
    wordmark: "healing · practice · guidance",
    homeLabel: "Holistic House — home",
    heroTitle: "Stuck in relationships, work or an important decision?",
    heroIntro: "Explore one real question with Andrey Litvinov through systemic constellations and guided imagery. Personal sessions in Toronto or online; a free written review is also available.",
    heroPrimary: "Get a free written review",
    heroBook: "Request a consultation · from €50",
    heroSecondary: "Take free self-checks",
    aboutKicker: "Meet your practitioner",
    aboutIntro: "I have been facilitating personal and group development since 2002. My work draws on guided imagery, systemic constellations and archetypal approaches to explore your individual question. I offer sessions in Toronto and online.",
    aboutAction: "More about Andrey",
    footer: "Individual work, thoughtful practice, and a space for inner development.",
  },
} as const;

type HolisticHouseHomeProps = { locale?: Locale };

export function HolisticHouseHome({ locale = "en" }: HolisticHouseHomeProps) {
  const text = copy[locale];
  const entry = LOCAL_ACQUISITION[locale];

  return (
    <main className="house-home house-home--services" lang={locale} data-home-design="dialogue-first-v1">
      <HomeDialogueEntry locale={locale} />
      {/* The approved presentation is SECONDARY. Its video is never part of
          Home's first-screen hydration, and no YouTube iframe autoplays. */}
      <div data-home-video-below-fold style={{contentVisibility:"auto",containIntrinsicSize:"auto 250px",margin:"18px auto 0",maxWidth:720}}>
        <Suspense fallback={null}>
          <HomePresentationVideoSection locale={locale} />
        </Suspense>
      </div>
      <HomeDeferredSections locale={locale} />

      <section className="service-home-about" aria-labelledby="service-home-about-title">
        <div className="service-home-about__copy">
          <p className="service-home-kicker">{text.aboutKicker}</p>
          <h2 id="service-home-about-title">Andrey Litvinov</h2>
          <p>{text.aboutIntro}</p>
          <AcquisitionEventLink href={entry.practitioner.href} event="practitioner_view" prefetch={false}>
            {text.aboutAction}<span aria-hidden="true">→</span>
          </AcquisitionEventLink>
        </div>
        <div className="service-home-about__portrait">
          <StaticPortrait
            src="/images/holistic-house/andy-about.png"
            alt={locale === "ru" ? "Андрей Литвинов" : "Andrey Litvinov"}
            width={900}
            height={720}
            className="service-home-about__image"
            sizes="(max-width: 767px) calc(100vw - 32px), 450px"
            loading="lazy"
          />
          <span className="service-home-about__portrait-caption">
            {locale === "ru" ? "Лично · Торонто и онлайн" : "Personal guidance · Toronto & online"}
          </span>
        </div>
      </section>

      <footer className="service-home-footer">
        <Link className="house-wordmark" href={locale === "ru" ? "/ru" : "/"} prefetch={false}>Holistic House</Link>
        <p>{text.footer}</p>
        <Link href={`/${locale}/services`} prefetch={false}>{entry.hero.servicesLabel}<span aria-hidden="true">→</span></Link>
        <p className="service-home-footer__legal">
          <Link href="/privacy" prefetch={false}>Privacy</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/terms" prefetch={false}>Terms</Link>
        </p>
      </footer>
    </main>
  );
}
