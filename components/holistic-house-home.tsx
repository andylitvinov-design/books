"use client";

import { ClipboardCheck, GraduationCap, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { HomepageContactCta } from "@/components/homepage-contact-cta";
import { ServicesSolutions } from "@/components/services-solutions";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { LOCAL_ACQUISITION } from "@/data/local-acquisition";
import type { Locale } from "@/data/remedies";
import type { PublishedSiteVideo } from "@/lib/site-videos/model";

const copy = {
  ru: {
    wordmark: "восстановление · практика · поддержка",
    homeLabel: "Holistic House — главная",
    heroTitle: "Найдите больше ясности и внутренней опоры",
    heroIntro: "Две бесплатные возможности и два формата личной работы. Выберите подходящий для вашего вопроса.",
    heroPrimary: "Бесплатный разбор ситуации",
    heroSecondary: "Четыре предложения",
    startKicker: "Другие возможности",
    startTitle: "Исследуйте самостоятельно",
    startIntro: "Тесты, книги и программы — в дополнение к личной работе.",
    personalEyebrow: "1 · Личная работа",
    personalTitle: "Личная консультация",
    personalText: "Разобраться в вашем вопросе и вариантах действий.",
    personalAction: "Посмотреть форматы",
    checkEyebrow: "2 · Бесплатно",
    checkTitle: "Каталог тестов и отчёты",
    checkText: "Выбрать дополнительные тесты и посмотреть историю результатов.",
    checkAction: "Начать self-check",
    learnEyebrow: "3 · Учиться и исследовать",
    learnTitle: "Курсы и библиотека",
    learnText: "Курсы, книги и практические материалы.",
    academyAction: "Academy",
    libraryAction: "Library",
    returning: "Уже есть профиль или результаты?",
    cabinetAction: "Открыть кабинет",
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
    heroTitle: "Explore your question. Find a clearer way forward.",
    heroIntro: "Two free ways to begin and two personal-work options. Choose the one that fits your question.",
    heroPrimary: "Free situation review",
    heroSecondary: "Explore four services",
    startKicker: "Other ways to explore",
    startTitle: "Explore at your own pace",
    startIntro: "Tests, courses and books to complement personal work.",
    personalEyebrow: "1 · Personal work",
    personalTitle: "Personal sessions",
    personalText: "Explore your question and possible next steps.",
    personalAction: "Explore personal work",
    checkEyebrow: "2 · Free",
    checkTitle: "Test library & reports",
    checkText: "Explore more assessments and your saved results.",
    checkAction: "Start the self-check",
    learnEyebrow: "3 · Learn & explore",
    learnTitle: "Courses & Library",
    learnText: "Courses, books and practical guides.",
    academyAction: "Academy",
    libraryAction: "Library",
    returning: "Already have a profile or previous results?",
    cabinetAction: "Open Cabinet",
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
  introVideos?: Partial<Record<Locale, PublishedSiteVideo>>;
};

export function HolisticHouseHome({ locale = "en", introVideos = {} }: HolisticHouseHomeProps) {
  const router = useRouter();
  const text = copy[locale];
  const entry = LOCAL_ACQUISITION[locale];
  const introVideo = introVideos[locale];

  function selectLocale(nextLocale: Locale) {
    const target = new URL(window.location.href);
    target.searchParams.set("lang", nextLocale);
    router.replace(target.pathname + target.search + target.hash, { scroll: false });
  }

  return (
    <main className="house-home house-home--services" lang={locale} data-home-design="approved-v2">
      <header className="house-header house-header--services">
        <Link className="house-wordmark" href="/" aria-label={text.homeLabel}>
          Holistic House
          <span>{text.wordmark}</span>
        </Link>
        <SiteNavigation locale={locale} onLocaleChange={selectLocale} />
      </header>

      <section className="service-home-hero" aria-labelledby="house-title">
        <div className="service-home-hero-photo" aria-hidden="true">
          <Image
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
            <AcquisitionEventLink className="service-home-button service-home-button--primary" href={`/${locale}/services/free-situation-review`} event="service_request_start">
              {text.heroPrimary}<span aria-hidden="true">→</span>
            </AcquisitionEventLink>
            <AcquisitionEventLink
              className="service-home-button service-home-button--secondary"
              href="#core-services"
              event="service_view"
            >
              {text.heroSecondary}<span aria-hidden="true">→</span>
            </AcquisitionEventLink>
          </div>
        </div>
      </section>

      <ServicesSolutions locale={locale} variant="home" />

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
          >
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
              <Link href={`/${locale}/academy`}>{text.academyAction}<span aria-hidden="true">→</span></Link>
              <Link href={`/${locale}/library`}>{text.libraryAction}<span aria-hidden="true">→</span></Link>
            </div>
          </article>
        </div>

        <p className="service-home-start__returning">
          {text.returning} <Link href={`/${locale}/client`}>{text.cabinetAction}<span aria-hidden="true">→</span></Link>
        </p>
      </section>

      {introVideo ? (
        <section className="service-home-video" aria-labelledby="service-home-video-title">
          <header>
            <p className="service-home-kicker">{text.videoKicker}</p>
            <h2 id="service-home-video-title">{text.videoTitle}</h2>
          </header>
          <div className="site-video-block" data-video-slot="home-intro" data-video-locale={locale} aria-label={introVideo.title}>
            <SiteVideoPlayer key={locale} video={introVideo} locale={locale} className="site-video--home" />
          </div>
        </section>
      ) : null}

      <PersonalTestimonials locale={locale} variant="home" />

      <section className="service-home-about" aria-labelledby="service-home-about-title">
        <div className="service-home-about__copy">
          <p className="service-home-kicker">{text.aboutKicker}</p>
          <h2 id="service-home-about-title">Andrey Litvinov</h2>
          <p>{text.aboutIntro}</p>
          <AcquisitionEventLink href={entry.practitioner.href} event="practitioner_view">
            {text.aboutAction}<span aria-hidden="true">→</span>
          </AcquisitionEventLink>
        </div>
        <div className="service-home-about__portrait">
          <Image
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
        <Link className="house-wordmark" href="/">Holistic House</Link>
        <p>{text.footer}</p>
        <Link href={`/${locale}/services`}>{entry.hero.servicesLabel}<span aria-hidden="true">→</span></Link>
        <p className="service-home-footer__legal">
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/terms">Terms</Link>
        </p>
      </footer>
    </main>
  );
}
