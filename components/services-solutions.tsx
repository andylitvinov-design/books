import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { coreServiceOffers } from "@/data/core-service-offers";
import type { Locale } from "@/data/remedies";
import styles from "./services-solutions.module.css";

const copy = {
  en: {
    eyebrow: "FOUR WAYS TO WORK TOGETHER",
    title: "Choose the support that fits your question",
    homeTitle: "How I can help",
    lead: "Two free ways to begin, or a personal session and a guided-imagery course. Choose by the result you want — not by the technique.",
    homeLead: "Two free starting points and two personal-work options.",
    uncertain: "Not sure which one fits?",
    uncertainText: "Start with the free situation review. You can consider the other options afterward.",
    uncertainAction: "Get a free situation review",
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
    eyebrow: "ЧЕТЫРЕ ОСНОВНЫХ ПРЕДЛОЖЕНИЯ",
    title: "Выберите помощь под свой запрос",
    homeTitle: "Чем я могу помочь",
    lead: "Две бесплатные возможности для начала, личная сессия и курс образной работы. Выбирайте по результату, а не по методу.",
    homeLead: "Два бесплатных варианта и два формата личной работы.",
    uncertain: "Не знаете, что выбрать?",
    uncertainText: "Начните с бесплатного разбора ситуации. Остальные варианты можно обсудить позже.",
    uncertainAction: "Бесплатный разбор ситуации",
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
  return (
    <section className={[styles.solutions, isHome ? styles.home : ""].filter(Boolean).join(" ")} id={isHome ? "core-services" : "solutions"} aria-labelledby={isHome ? "home-core-services-title" : "services-solutions-title"} data-core-service-offers={variant}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id={isHome ? "home-core-services-title" : "services-solutions-title"}>{isHome ? t.homeTitle : t.title}</h2>
        <p className={styles.intro}>{isHome ? t.homeLead : t.lead}</p>
      </header>
      <div className={styles.grid}>
        {coreServiceOffers(locale).map((offer, index) => (
          <article className={styles.card} key={offer.id} id={isHome ? undefined : offer.id === "alchemy" ? "alchemy" : offer.id === "dao" ? "business" : undefined}>
            <Link className={styles.photo} href={offer.href} tabIndex={-1} aria-hidden="true">
              <Image src={offer.image} alt="" fill sizes="(max-width: 760px) 96px, (max-width: 1080px) 140px, 200px" loading={index === 0 ? "eager" : "lazy"} />
            </Link>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>{offer.label}</span>
              <h3><Link href={offer.href}>{offer.title}</Link></h3>
              <p className={styles.cardSummary}>{offer.promise}</p>
              <p className={styles.cardBenefit}>{offer.benefit}</p>
              <Link className={styles.cardCta} href={offer.href}>{offer.action}<ArrowUpRight size={18} aria-hidden="true" /></Link>
            </div>
          </article>
        ))}
      </div>

      {!isHome ? (
        <>
          <div className={styles.bridge}>
            <div><h3>{t.uncertain}</h3><p>{t.uncertainText}</p></div>
            <Link href={"/" + locale + "/services/free-situation-review"}>{t.uncertainAction}<ArrowRight size={19} aria-hidden="true"/></Link>
          </div>
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
