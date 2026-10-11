import Image from "next/image";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { coreServiceOffers } from "@/data/core-service-offers";
import type { Locale } from "@/data/remedies";
import styles from "./services-solutions.module.css";

// Homepage-only editorial illustrations. Preserve original source media on Services.
const homepageMedia = {
  situation: "/images/holistic-house/hero-olive-incense.webp",
  dao: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  alchemy: "/images/holistic-house/homepage-constellations.svg",
  hypnotherapy: "/images/holistic-house/homepage-guided-imagery.svg",
} as const;

const copy = {
  en: {
    eyebrow: "PERSONAL GUIDANCE · WHEN YOU ARE READY",
    title: "Personal support for your next step",
    homeTitle: "Personal work, at your pace",
    lead: "After exploring your question, you can choose a personal Alchemy of the Soul session or a guided-imagery course.",
    homeLead: "If you want to explore further together, these are two personal-work formats.",
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
    title: "Личная работа для следующего шага",
    homeTitle: "Личная работа в вашем темпе",
    lead: "После бесплатного знакомства со своим запросом можно выбрать сессию «Алхимия души» или курс образной работы.",
    homeLead: "Если хочется пойти глубже, доступны два формата индивидуальной работы.",
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
  // The three complimentary entrances are presented once above these cards.
  const personalOffers = coreServiceOffers(locale).filter((offer) => offer.id === "alchemy" || offer.id === "hypnotherapy");
  return (
    <section className={[styles.solutions, isHome ? styles.home : ""].filter(Boolean).join(" ")} id={isHome ? "core-services" : "solutions"} aria-labelledby={isHome ? "home-core-services-title" : "services-solutions-title"} data-core-service-offers={variant}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id={isHome ? "home-core-services-title" : "services-solutions-title"}>{isHome ? t.homeTitle : t.title}</h2>
        <p className={styles.intro}>{isHome ? t.homeLead : t.lead}</p>
      </header>
      <div className={styles.grid}>
        {personalOffers.map((offer, index) => (
          <article className={styles.card} key={offer.id} id={isHome ? undefined : offer.id === "alchemy" ? "alchemy" : undefined} data-core-service-id={offer.id}>
            {!isHome && offer.id === "alchemy" ? <><span id="business" className={styles.anchor} /><span id="archetypal" className={styles.anchor}/></> : null}
            <Link className={styles.photo} href={offer.href} tabIndex={-1} aria-hidden="true">
              <Image src={isHome ? homepageMedia[offer.id] : offer.image} alt="" fill sizes={isHome ? "(max-width: 760px) 45vw, (max-width: 1080px) 30vw, 280px" : "(max-width: 760px) 96px, (max-width: 1080px) 140px, 200px"} loading={index === 0 ? "eager" : "lazy"} />
            </Link>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>{offer.label}</span>
              <h3><Link href={offer.href}>{offer.title}</Link></h3>
              <p className={styles.cardSummary}>{offer.promise}</p>
              <p className={styles.cardBenefit}>{offer.benefit}</p>
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
