import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Check, ChevronDown, ExternalLink, GraduationCap, HeartHandshake, Send } from "lucide-react";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { kundaliniEveryday, kundaliniInterface, kundaliniLessons, kundaliniSources } from "@/data/academy/kundalini-reiki-course";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./kundalini-reiki-course.module.css";

const whatsapp = "https://wa.me/14376066502?text=";

function enquire(locale: PublicLocale, option: "programme" | "level-one") {
  const original = "https://holistichouse.vercel.app/" + locale + "/academy/reiki/kundalini-reiki";
  const service = locale === "ru" ? "Кундалини Рейки" : "Kundalini Reiki";
  const request = option === "programme"
    ? locale === "ru" ? "Здравствуйте, Андрей! Хочу получить программу обучения Кундалини Рейки (1–3 ступени), узнать актуальные цены, сроки и формат."
      : locale === "es" ? "Hola Andrey. Quisiera recibir el programa Kundalini Reiki de tres niveles, precios y formato actuales."
      : "Hello Andrey! Please send the current Kundalini Reiki Levels 1–3 course outline, fees, schedule and study format."
    : locale === "ru" ? "Здравствуйте, Андрей! Хочу запросить личную инициацию 1-й ступени Кундалини Рейки. Уточните формат, доступность и цену."
      : locale === "es" ? "Hola Andrey. Quisiera solicitar la iniciación personal de Kundalini Reiki Nivel 1. ¿Cuál es el formato, disponibilidad y precio?"
      : "Hello Andrey! I'd like to request a personal Kundalini Reiki Level 1 initiation. Please confirm the format, availability and price.";
  return whatsapp + encodeURIComponent([request, "", "Course / Система: " + service, "Request / Запрос: " + (option === "programme" ? "Course outline and current pricing" : "Personal Level 1 initiation"), "Page / Страница: " + original].join("\n"));
}

export function KundaliniReikiCourse({ locale }: { locale: PublicLocale }) {
  const t = kundaliniInterface[locale];

  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrapper}>
        <AcademyBackLink locale={locale} />
        <section className={styles.hero} aria-labelledby="kundalini-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{t.eyebrow}</span>
            <h1 id="kundalini-title">{t.title}</h1>
            <p className={styles.heroLead}>{t.introduction}</p>
            <div className={styles.heroActions}>
              <a className={styles.buttonPrimary} href="#kundalini-levels">{t.primary}<ArrowDown size={19} aria-hidden="true" /></a>
              <a className={styles.buttonSecondary} href="#kundalini-enquire">{t.secondary}<ArrowRight size={18} aria-hidden="true" /></a>
            </div>
            <p className={styles.heroNote}><Check size={16} aria-hidden="true" />{t.heroNote}</p>
          </div>
          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.haloOne} />
            <div className={styles.haloTwo} />
            <div className={styles.energyLine}>
              {Array.from({ length: 7 }, (_, index) => <span className={styles.energyPoint} key={index} />)}
            </div>
            <span className={styles.visualCaption}>KUNDALINI · REIKI</span>
          </div>
        </section>

        <div className={styles.stats} aria-label={t.stepsTitle}>
          <span><GraduationCap size={20} aria-hidden="true" /><strong>{t.levels}</strong><small>{t.levelsSub}</small></span>
          <span><BookOpen size={20} aria-hidden="true" /><strong>{t.sourcesCount}</strong><small>PsiMaster · SuperSkills · PsiTrends</small></span>
          <span><HeartHandshake size={20} aria-hidden="true" /><strong>{t.focus}</strong><small>{t.heroNote}</small></span>
        </div>

        <section className={styles.section} id="kundalini-levels" aria-labelledby="kundalini-levels-title">
          <header className={styles.sectionHead}>
            <span className={styles.sectionKicker}>01 / 03</span>
            <h2 id="kundalini-levels-title">{t.stepsTitle}</h2>
            <p>{t.stepsSub}</p>
          </header>
          <div className={styles.levelGrid}>
            {kundaliniLessons.map((level) => (
              <article className={styles.levelCard} key={level.number}>
                <div className={styles.levelTop}>
                  <span className={styles.levelNumber}>{String(level.number).padStart(2, "0")}</span>
                  <div>
                    <small>{locale === "ru" ? "СТУПЕНЬ " : locale === "es" ? "NIVEL " : "LEVEL "}{level.number}</small>
                    <h3>{level.title[locale]}</h3>
                  </div>
                </div>
                <p className={styles.levelSummary}>{level.summary[locale]}</p>
                <details className={styles.levelDetail}>
                  <summary><span>{t.detailLabel}</span><ChevronDown size={18} aria-hidden="true" /></summary>
                  <div className={styles.detailBody}>
                    <ul className={styles.topicList}>
                      {level.focus.map((item, index) => <li key={index}><Check size={15} aria-hidden="true" /><span>{item[locale]}</span></li>)}
                    </ul>
                    <h4>{t.exercise}</h4>
                    <p>{level.exercise[locale]}</p>
                    <h4>{t.assignment}</h4>
                    <p>{level.assignment[locale]}</p>
                  </div>
                </details>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="kundalini-practice" aria-labelledby="kundalini-practice-title">
          <header className={styles.sectionHead}>
            <span className={styles.sectionKicker}>02 / 03</span>
            <h2 id="kundalini-practice-title">{t.methodTitle}</h2>
            <p>{t.methodLead}</p>
          </header>
          <div className={styles.practiceGrid}>
            {kundaliniEveryday.map((item, index) => (
              <article className={styles.practiceItem} key={index}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title[locale]}</h3>
                <p>{item.description[locale]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.pathway} aria-labelledby="kundalini-pathway-title">
          <div className={styles.pathwayIntro}>
            <span className={styles.sectionKicker}>STUDY PATH</span>
            <h2 id="kundalini-pathway-title">{t.howTitle}</h2>
          </div>
          <ol>
            {t.howText.map((item, index) => <li key={index}>{item}</li>)}
          </ol>
        </section>

        <section className={styles.section} id="kundalini-sources" aria-labelledby="kundalini-sources-title">
          <header className={styles.sectionHead}>
            <span className={styles.sectionKicker}>03 / 03</span>
            <h2 id="kundalini-sources-title">{t.sourceTitle}</h2>
            <p>{t.sourceLead}</p>
          </header>
          <div className={styles.sources}>
            {kundaliniSources.map((source) => (
              <a href={source.url} key={source.url} target="_blank" rel="noopener noreferrer">
                <span className={styles.sourceSite}>{source.site}</span>
                <span className={styles.sourceName}>{source.label}</span>
                <span className={styles.sourceAction}>{t.archiveLabel}<ExternalLink size={15} aria-hidden="true" /></span>
              </a>
            ))}
          </div>
          <p className={styles.provenance}>{t.provenanceNote}</p>
        </section>

        <section className={styles.section} aria-labelledby="kundalini-faq-title">
          <header className={styles.sectionHead}><h2 id="kundalini-faq-title">{t.faqTitle}</h2></header>
          <div className={styles.faq}>
            {t.faqs.map((item, index) => (
              <details key={index}>
                <summary>{item.q}<ChevronDown size={17} aria-hidden="true" /></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.capture} id="kundalini-enquire" aria-labelledby="kundalini-enquire-title">
          <div>
            <span className={styles.sectionKicker}>PERSONAL TRAINING</span>
            <h2 id="kundalini-enquire-title">{t.contactTitle}</h2>
            <p>{t.contactText}</p>
            <small>{t.footerNote}</small>
          </div>
          <div className={styles.captureActions}>
            <a href={enquire(locale, "programme")} target="_blank" rel="noopener noreferrer" className={styles.capturePrimary}>
              <Send size={18} aria-hidden="true" />{t.contactProgramme}<ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href={enquire(locale, "level-one")} target="_blank" rel="noopener noreferrer" className={styles.captureSecondary}>
              <Send size={18} aria-hidden="true" />{t.contactLevel}<ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className={styles.telegram} href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.telegram}<ExternalLink size={15} aria-hidden="true" /></a>
          </div>
        </section>
        <nav className={styles.related} aria-label={t.back}>
          <Link href={"/" + locale + "/academy/reiki/yggdrasil"}>Reiki Yggdrasil <ArrowRight size={15} /></Link>
          <Link href={"/" + locale + "/academy/reiki/tantra-reiki"}>Tantra Reiki <ArrowRight size={15} /></Link>
          <Link href={"/" + locale + "/academy/reiki"}>{t.back} <ArrowRight size={15} /></Link>
        </nav>
      </div>
    </main>
  );
}
