import Image from "next/image";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, PlayCircle } from "lucide-react";
import { getServiceVideoWatchUrl } from "@/data/service-video-library";
import { coreServiceOffers } from "@/data/core-service-offers";
import type { Locale } from "@/data/remedies";
import styles from "./services-solutions.module.css";

// Use existing approved local imagery, including real stills from the two service videos.
// Keep the homepage photo-left layout; do not alter the video links or Services page.
const homepageMedia = {
  situation: "/images/holistic-house/hero-olive-incense.webp",
  dao: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  alchemy: "/images/holistic-house/video-posters/constellations-en-v1.webp",
  hypnotherapy: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
} as const;

const copy = {
  en: {
    eyebrow: "PERSONAL GUIDANCE · WHEN YOU ARE READY",
    homeEyebrow: "FOUR WAYS TO WORK TOGETHER",
    title: "Personal support for your next step",
    homeTitle: "How I can help",
    lead: "After exploring your question, you can choose a personal Alchemy of the Soul session or a guided-imagery course.",
    homeLead: "Two free written reviews and two personal-work options. You can also explore free stress and personality tests above.",
    more: "Curious about the methods?",
    moreText: "Systemic constellations, guided imagery and homeopathy are approaches used in specific sessions, not extra services you must choose on this page.",
    methods: [
      {label:"Systemic constellations", href:"systemic-constellations"},
      {label:"Guided imagery", href:"imagery-therapy"},
      {label:"Psychohomeopathy", href:"psychohomeopathy"},
    ],
    disclaimer: "The DAO profile is a non-medical symbolic assessment. Homeopathy has no reliable evidence for treating medical or mental-health conditions, and none of these services replaces standard or urgent care.",
  },
  ru: {
    eyebrow: "ЛИЧНАЯ РАБОТА · КОГДА ВЫ ГОТОВЫ",
    homeEyebrow: "ЧЕТЫРЕ ОСНОВНЫХ ПРЕДЛОЖЕНИЯ",
    title: "Личная работа для следующего шага",
    homeTitle: "Чем я могу помочь",
    lead: "После бесплатного знакомства со своим запросом можно выбрать сессию «Алхимия души» или курс образной работы.",
    homeLead: "Два бесплатных письменных разбора и два формата личной работы. Выше также доступны бесплатные тесты стресса и личности.",
    more: "Хотите подробнее о методах?",
    moreText: "Системные расстановки, образная работа и гомеопатия — инструменты отдельных сессий, а не обязательные дополнительные услуги.",
    methods: [
      {label:"Системные расстановки", href:"systemic-constellations"},
      {label:"Образная работа", href:"imagery-therapy"},
      {label:"Психогомеопатия", href:"psychohomeopathy"},
    ],
    disclaimer: "Дао-профиль — символическая оценка ресурса, не медицинская диагностика. Эффективность гомеопатии для лечения заболеваний не подтверждена надёжными доказательствами. Эти форматы не заменяют обычную и неотложную медицинскую помощь.",
  },
} as const;

export function ServicesSolutions({ locale, variant = "services" }: { locale: Locale; variant?: "services" | "home" }) {
  const t = copy[locale];
  const isHome = variant === "home";
  // Keep the approved four image-left cards on Home. The Services page already displays
  // the three free options above, so only personal-work cards repeat there.
  const allOffers = coreServiceOffers(locale);
  const personalOffers = allOffers.filter((offer) => offer.id === "alchemy" || offer.id === "hypnotherapy");
  const visibleOffers = isHome ? allOffers : personalOffers;
  return (
    <section className={[styles.solutions, isHome ? styles.home : ""].filter(Boolean).join(" ")} id={isHome ? "core-services" : "solutions"} aria-labelledby={isHome ? "home-core-services-title" : "services-solutions-title"} data-core-service-offers={variant}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{isHome ? t.homeEyebrow : t.eyebrow}</p>
        <h2 id={isHome ? "home-core-services-title" : "services-solutions-title"}>{isHome ? t.homeTitle : t.title}</h2>
        <p className={styles.intro}>{isHome ? t.homeLead : t.lead}</p>
      </header>
      <div className={styles.grid}>
        {visibleOffers.map((offer, index) => (
          <article className={styles.card} key={offer.id} id={isHome ? undefined : offer.id === "alchemy" ? "alchemy" : undefined} data-core-service-id={offer.id}>
            {!isHome && offer.id === "alchemy" ? <><span id="business" className={styles.anchor} /><span id="archetypal" className={styles.anchor}/></> : null}
            <Link className={styles.photo} href={offer.href} tabIndex={-1} aria-hidden="true">
              <Image src={isHome ? homepageMedia[offer.id] : offer.image} alt="" fill unoptimized={isHome && homepageMedia[offer.id].endsWith(".webp")} sizes={isHome ? "(max-width: 760px) 45vw, (max-width: 1080px) 30vw, 280px" : "(max-width: 760px) 96px, (max-width: 1080px) 140px, 200px"} loading={index === 0 ? "eager" : "lazy"} />
            </Link>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>{offer.label}</span>
              <h3><Link href={offer.href}>{offer.title}</Link></h3>
              <p className={styles.cardSummary}>{offer.promise}</p>
              <p className={styles.cardBenefit}>{offer.benefit}</p>
              {(offer.id === "alchemy" || offer.id === "hypnotherapy") && (
                <a className={styles.cardVideo} href={getServiceVideoWatchUrl(offer.id, locale)}
                  target="_blank" rel="noopener noreferrer" data-service-card-video={offer.id}
                  aria-label={locale === "ru" ? "Открыть видео о подходе в новой вкладке" : "Watch the method video in a new tab"}>
                  <PlayCircle size={18} aria-hidden="true" />
                  {locale === "ru" ? "Смотреть видео о подходе" : "Watch a short video"}
                </a>
              )}
              <AcquisitionEventLink className={styles.cardCta} href={offer.href} event={offer.id === "situation" || offer.id === "dao" ? "service_request_start" : "service_view"}>{offer.action}<ArrowUpRight size={18} aria-hidden="true" /></AcquisitionEventLink>
            </div>
          </article>
        ))}
      </div>

      {!isHome ? (
        <>
          <details className={styles.methodDisclosure} id="methods">
            <summary>{t.more}<ChevronDown size={18} aria-hidden="true" /></summary>
            <div><p>{t.moreText}</p>
              <nav aria-label={t.more}>{t.methods.map(item => <Link key={item.href} href={"/" + locale + "/services/" + item.href}>{item.label}<ArrowUpRight size={15} aria-hidden="true"/></Link>)}</nav>
            </div>
          </details>
          <p className={styles.disclaimer}>{t.disclaimer}</p>
        </>
      ) : null}
    </section>
  );
}
