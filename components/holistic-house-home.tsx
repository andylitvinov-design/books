import { ClipboardCheck, GraduationCap } from "lucide-react";
import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import type { ReactNode } from "react";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { HomepageContactCta } from "@/components/homepage-contact-cta";
import { ServicesSolutions } from "@/components/services-solutions";
import { HomepageTopicJourneys } from "@/components/homepage-topic-journeys";
import { TestSelectionCourseBanner } from "@/components/sitewide-antistress-banner";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { SiteNavigation } from "@/components/site-navigation";
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
    startKicker: "Другие возможности",
    startTitle: "Исследуйте самостоятельно",
    startIntro: "Мониторинг состояния, книги и программы — в дополнение к личной работе.",
    personalEyebrow: "1 · Личная работа",
    personalTitle: "Личная консультация",
    personalText: "Разобраться в вашем вопросе и вариантах действий.",
    personalAction: "Посмотреть форматы",
    checkEyebrow: "2 · Бесплатный мониторинг",
    checkTitle: "Психологическое состояние и ресурсы",
    checkText: "Оцените стресс, настроение, сон и внутреннюю опору. Получите рекомендации и отслеживайте изменения.",
    checkAction: "Начать бесплатный мониторинг",
    learnEyebrow: "3 · Учиться и исследовать",
    learnTitle: "Курсы и библиотека",
    learnText: "Курсы, книги и практические материалы.",
    academyAction: "Academy",
    libraryAction: "Library",
    tantraAction: "Тантра Рейки · бесплатная инициация 1-й ступени",
    returning: "Уже есть профиль или результаты?",
    cabinetAction: "Открыть кабинет",
    testGuideAction: "Как работают бесплатные тесты",
    videoKicker: "Короткое знакомство",
    videoTitle: "О Holistic House за полминуты",
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
    startKicker: "Other ways to explore",
    startTitle: "Explore at your own pace",
    startIntro: "Free wellbeing monitoring, courses and books to complement personal work.",
    personalEyebrow: "1 · Personal work",
    personalTitle: "Personal sessions",
    personalText: "Explore your question and possible next steps.",
    personalAction: "Explore personal work",
    checkEyebrow: "2 · Free monitoring",
    checkTitle: "Wellbeing & inner resources",
    checkText: "Check stress, mood, sleep and resilience. Get practical guidance and track changes over time.",
    checkAction: "Start free monitoring",
    learnEyebrow: "3 · Learn & explore",
    learnTitle: "Courses & Library",
    learnText: "Courses, books and practical guides.",
    academyAction: "Academy",
    libraryAction: "Library",
    tantraAction: "Tantra Reiki · free Level 1 initiation",
    returning: "Already have a profile or previous results?",
    cabinetAction: "Open Cabinet",
    testGuideAction: "How free self-checks work",
    videoKicker: "A short introduction",
    videoTitle: "Holistic House in half a minute",
    aboutKicker: "Meet your practitioner",
    aboutIntro: "I have been facilitating personal and group development since 2002. My work draws on guided imagery, systemic constellations and archetypal approaches to explore your individual question. I offer sessions in Toronto and online.",
    aboutAction: "More about Andrey",
    footer: "Individual work, thoughtful practice, and a space for inner development.",
  },
} as const;

type HolisticHouseHomeProps = {
  locale?: Locale;
  introVideoContent?: ReactNode;
};

export function HolisticHouseHome({ locale = "en", introVideoContent }: HolisticHouseHomeProps) {
  const text = copy[locale];
  const entry = LOCAL_ACQUISITION[locale];

  return (
    <main className="house-home house-home--services" lang={locale} data-home-design="approved-v2">
      <header className="house-header house-header--services">
        <Link className="house-wordmark" href={locale === "ru" ? "/ru" : "/"} aria-label={text.homeLabel} prefetch={false}>
          Holistic House
          <span>{text.wordmark}</span>
        </Link>
        <SiteNavigation locale={locale} />
      </header>

      <section className="service-home-hero" aria-labelledby="house-title">
        <div className="service-home-hero-photo" aria-hidden="true">
          <StaticPortrait
            src="/images/holistic-house/andy-about.png"
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1127px) 55vw, 620px"
          />
        </div>
        <div className="service-home-hero-copy">
          <p className="service-home-kicker">{entry.hero.eyebrow}</p>
          <h1 id="house-title"><span>{text.heroTitle}</span></h1>
          <p className="service-home-intro">{text.heroIntro}</p>
          <div className="service-home-actions">
            <AcquisitionEventLink
              className="service-home-button service-home-button--primary"
              href={`/${locale}/services#consultation`}
              event="service_view"
              attributes={{ "data-hero-cta": "paid-sessions" }}
              prefetch={false}>
              {text.heroBook}<span aria-hidden="true">→</span>
            </AcquisitionEventLink>
            <AcquisitionEventLink
              className="service-home-button service-home-button--secondary"
              href={`/${locale}/services/free-situation-review`}
              event="service_request_start"
              attributes={{ "data-hero-cta": "free-written-review" }}
              prefetch={false}>
              {text.heroPrimary}<span aria-hidden="true">→</span>
            </AcquisitionEventLink>
          </div>
          <AcquisitionEventLink
            className="service-home-selfcheck-link"
            href={`/${locale}/client/tests`}
            event="self_check_start"
            attributes={{ "data-hero-cta": "free-tests" }}
            prefetch={false}>
            {text.heroSecondary}<span aria-hidden="true">→</span>
          </AcquisitionEventLink>
          <p className="service-home-offer-note">
            {locale === "ru"
              ? "Бесплатный формат — анкета, рисунок и личный письменный отчёт; звонок не входит. Личные сессии оплачиваются отдельно."
              : "The free option includes a form, drawing and personal written report—not a live call. One-to-one sessions are separate."}
          </p>
        </div>
      </section>

      <ServicesSolutions locale={locale} variant="home" />
      <HomepageTopicJourneys locale={locale} />
      <TestSelectionCourseBanner locale={locale} />

      <section className="service-home-start" id="start-here" aria-labelledby="service-home-start-title" data-home-start>
        <header className="service-home-start__heading">
          <p className="service-home-kicker">{text.startKicker}</p>
          <h2 id="service-home-start-title">{text.startTitle}</h2>
          <p>{text.startIntro}</p>
        </header>

        <div className="service-home-start__grid">
          <AcquisitionEventLink
            className="service-home-start-card"
            href={entry.selfCheck.href}
            event="self_check_start"
           prefetch={false}>
            <span className="service-home-start-card__icon" aria-hidden="true"><ClipboardCheck /></span>
            <span className="service-home-start-card__eyebrow">{text.checkEyebrow}</span>
            <h3>{text.checkTitle}</h3>
            <p>{text.checkText}</p>
            <strong>{text.checkAction}<span aria-hidden="true">→</span></strong>
          </AcquisitionEventLink>

          <article className="service-home-start-card service-home-start-card--learning">
            <span className="service-home-start-card__icon" aria-hidden="true"><GraduationCap /></span>
            <span className="service-home-start-card__eyebrow">{text.learnEyebrow}</span>
            <h3>{text.learnTitle}</h3>
            <p>{text.learnText}</p>
            <div className="service-home-start-card__actions">
              <Link href={`/${locale}/academy`} prefetch={false}>{text.academyAction}<span aria-hidden="true">→</span></Link>
              <Link href={`/${locale}/library`} prefetch={false}>{text.libraryAction}<span aria-hidden="true">→</span></Link>
              <Link href={`/${locale}/academy/reiki/tantra-reiki/free-initiation`} prefetch={false}>{text.tantraAction}<span aria-hidden="true">→</span></Link>
            </div>
          </article>
        </div>

        <p className="service-home-start__returning">
          <Link href={`/${locale}/tests`} prefetch={false}>{text.testGuideAction}<span aria-hidden="true">→</span></Link>
          <span aria-hidden="true"> · </span>
          {text.returning} <Link href={`/${locale}/client`} prefetch={false}>{text.cabinetAction}<span aria-hidden="true">→</span></Link>
        </p>
      </section>

      {introVideoContent}

      <PersonalTestimonials locale={locale} variant="home" />

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

      <HomepageContactCta locale={locale} />

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
