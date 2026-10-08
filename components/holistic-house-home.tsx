"use client";

import { ClipboardCheck, GraduationCap, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PersonalWorkJourney } from "@/components/personal-work-journey";
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
    heroTitle: "Нет сил, ясности или движения к цели?",
    heroIntro: "Начните с бесплатного личного разбора ситуации. Мы обсудим, где вы чувствуете затруднение, что уже пробовали и какие следующие шаги можно рассмотреть. Без обязательства продолжать работу.",
    heroPrimary: "Записаться на бесплатный разбор",
    heroSecondary: "Посмотреть три направления",
    startKicker: "Другие возможности",
    startTitle: "Исследуйте Holistic House",
    startIntro: "Индивидуальная работа — главный путь к личной консультации. Тесты, обучение и библиотека доступны отдельно, если вы хотите исследовать тему самостоятельно.",
    personalEyebrow: "1 · Личная работа",
    personalTitle: "Разобрать важный вопрос",
    personalText: "Индивидуальные консультации, гипнотерапия, расстановки и другие форматы работы с вашим запросом.",
    personalAction: "Посмотреть форматы",
    checkEyebrow: "2 · Бесплатно",
    checkTitle: "Проверить своё состояние",
    checkText: "Короткая self-check оценка поможет понять, на что сейчас стоит обратить внимание, а затем предложит следующий шаг.",
    checkAction: "Начать self-check",
    learnEyebrow: "3 · Учиться и исследовать",
    learnTitle: "Открыть Academy и Library",
    learnText: "Курсы, программы, книги, методички и справочные материалы собраны отдельно от личной работы.",
    academyAction: "Academy",
    libraryAction: "Library",
    returning: "Уже есть профиль или результаты?",
    cabinetAction: "Открыть кабинет",
    videoKicker: "Короткое знакомство",
    videoTitle: "О Holistic House за полминуты",
    aboutKicker: "О специалисте",
    aboutAction: "Подробнее об Андрее",
    footer: "Индивидуальная работа, осознанные практики и пространство для внутреннего развития.",
  },
  en: {
    wordmark: "healing · practice · guidance",
    homeLabel: "Holistic House — home",
    heroTitle: "Feeling stuck, exhausted, or unsure what comes next?",
    heroIntro: "Start with a free personal conversation. We can explore what feels difficult right now, where progress seems blocked and what next step might suit your situation. No obligation to continue.",
    heroPrimary: "Request a free situation review",
    heroSecondary: "Explore three approaches",
    startKicker: "Other ways to explore",
    startTitle: "Explore Holistic House",
    startIntro: "Personal sessions are one path. Self-checks, courses and books are separate options if you prefer to explore on your own.",
    personalEyebrow: "1 · Personal work",
    personalTitle: "Work on an important question",
    personalText: "One-to-one consultations, hypnotherapy, constellations and other ways to explore your current situation.",
    personalAction: "Explore personal work",
    checkEyebrow: "2 · Free",
    checkTitle: "Check how you’re doing",
    checkText: "A short self-check can help you see what deserves attention now and suggest a useful next step.",
    checkAction: "Start the self-check",
    learnEyebrow: "3 · Learn & explore",
    learnTitle: "Open the Academy and Library",
    learnText: "Courses, programs, books, method guides and reference materials live separately from personal sessions.",
    academyAction: "Academy",
    libraryAction: "Library",
    returning: "Already have a profile or previous results?",
    cabinetAction: "Open Cabinet",
    videoKicker: "A short introduction",
    videoTitle: "Holistic House in half a minute",
    aboutKicker: "About the practitioner",
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
    <main className="house-home house-home--services" lang={locale}>
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
              href={`/${locale}/services`}
              event="service_view"
            >
              {text.heroSecondary}<span aria-hidden="true">→</span>
            </AcquisitionEventLink>
          </div>
        </div>
      </section>

      <PersonalWorkJourney locale={locale} variant="compact" />

      <section className="service-home-start" id="start-here" aria-labelledby="service-home-start-title" data-home-start>
        <header className="service-home-start__heading">
          <p className="service-home-kicker">{text.startKicker}</p>
          <h2 id="service-home-start-title">{text.startTitle}</h2>
          <p>{text.startIntro}</p>
        </header>

        <div className="service-home-start__grid">
          <AcquisitionEventLink
            className="service-home-start-card"
            href={`/${locale}/services`}
            event="service_view"
          >
            <span className="service-home-start-card__icon" aria-hidden="true"><Sparkles /></span>
            <span className="service-home-start-card__eyebrow">{text.personalEyebrow}</span>
            <h3>{text.personalTitle}</h3>
            <p>{text.personalText}</p>
            <strong>{text.personalAction}<span aria-hidden="true">→</span></strong>
          </AcquisitionEventLink>

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
        <div>
          <p className="service-home-kicker">{text.aboutKicker}</p>
          <h2 id="service-home-about-title">Andrey Litvinov</h2>
        </div>
        <div>
          <p>{entry.practitioner.text}</p>
          <AcquisitionEventLink href={entry.practitioner.href} event="practitioner_view">
            {text.aboutAction}<span aria-hidden="true">→</span>
          </AcquisitionEventLink>
        </div>
      </section>

      <PublicConsultationCta locale={locale} />

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
