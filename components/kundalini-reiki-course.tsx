import Image from "next/image";
import { ArrowDown, ArrowRight, BookOpen, Check, ChevronDown, Download, MessageCircle } from "lucide-react";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { kundaliniEveryday, kundaliniInterface, kundaliniLessons } from "@/data/academy/kundalini-reiki-course";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./kundalini-reiki-course.module.css";

const whatsapp = "https://wa.me/14376066502?text=";

const levelPhotos = [
  "/academy/reiki-yggdrasil/source/program-overview.jpg",
  "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
];

function guideUrl(locale: PublicLocale) {
  return "/api/academy/reiki-guide?course=kundalini&locale=" + locale;
}

function enquire(locale: PublicLocale, option: "programme" | "level-one") {
  const original = "https://holistichouse.vercel.app/" + locale + "/academy/reiki/kundalini-reiki";
  const service = locale === "ru" ? "Кундалини Рейки" : "Kundalini Reiki";
  const request = option === "programme"
    ? locale === "ru" ? "Здравствуйте, Андрей! Хочу узнать формат, даты и актуальные цены обучения Кундалини Рейки (1–3 ступени). Программа и PDF уже доступны на сайте Holistic House."
      : locale === "es" ? "Hola Andrey. Quisiera conocer el formato, fechas y precio actual de Kundalini Reiki (niveles 1–3). Ya puedo consultar el programa y PDF en Holistic House."
      : "Hello Andrey! I'd like to ask about the current training format, dates and fees for Kundalini Reiki Levels 1–3. I can already read the full outline and PDF at Holistic House."
    : locale === "ru" ? "Здравствуйте, Андрей! Хочу запросить личную инициацию 1-й ступени Кундалини Рейки. Уточните формат, доступность и цену."
      : locale === "es" ? "Hola Andrey. Quisiera solicitar la iniciación personal de Kundalini Reiki Nivel 1. ¿Cuál es el formato, disponibilidad y precio?"
      : "Hello Andrey! I'd like to request a personal Kundalini Reiki Level 1 initiation. Please confirm the format, availability and price.";
  return whatsapp + encodeURIComponent([request, "", "Course / Система: " + service, "Request / Запрос: " + (option === "programme" ? "Training dates, format and fees" : "Personal Level 1 initiation"), "Page / Страница: " + original].join("\n"));
}

export function KundaliniReikiCourse({ locale }: { locale: PublicLocale }) {
  const t = kundaliniInterface[locale];

  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrapper}>
        <AcademyBackLink locale={locale} />

        <section className={styles.hero} aria-labelledby="kundalini-title">
          <div className={styles.heroText}>
            <span className={styles.eyebrow}>{t.eyebrow}</span>
            <h1 id="kundalini-title">{t.title}</h1>
            <p className={styles.heroLead}>{t.introduction}</p>
            <p className={styles.heroMeta}>{t.levels} <span aria-hidden="true">·</span> {t.levelsSub}</p>
            <div className={styles.heroActions}>
              <a className={styles.buttonPrimary} href="#kundalini-levels">{t.primary}<ArrowDown size={18} aria-hidden="true" /></a>
              <a className={styles.buttonSecondary} href={guideUrl(locale)} download>
                <Download size={18} aria-hidden="true" />{t.pdfButton}
              </a>
            </div>
          </div>
          <div className={styles.heroPhoto}>
            <Image
              src="/academy/reiki-yggdrasil/source/temple-studies.png"
              alt={locale === "ru" ? "Спокойная медитативная атмосфера — статуя Будды в саду" : locale === "es" ? "Ambiente contemplativo — una estatua de Buda en un jardín" : "Calm contemplative setting — a Buddha statue in a garden"}
              fill
              priority
              sizes="(max-width: 760px) 100vw, 48vw"
              className={styles.coverImage}
            />
            <div className={styles.photoShade} />
            <div className={styles.heroStamp}>{t.heroStamp}</div>
          </div>
        </section>

        <div className={styles.quietBenefits} aria-label={t.benefitsLabel}>
          {t.benefits.map((item) => <span key={item}><Check size={16} aria-hidden="true" />{item}</span>)}
        </div>

        <section className={styles.section} id="kundalini-levels" aria-labelledby="kundalini-levels-title">
          <header className={styles.sectionHeading}>
            <span className={styles.eyebrow}>{t.programmeKicker}</span>
            <h2 id="kundalini-levels-title">{t.stepsTitle}</h2>
            <p>{t.stepsSub}</p>
          </header>
          <div className={styles.levels}>
            {kundaliniLessons.map((level, index) => (
              <article className={styles.levelCard} key={level.number}>
                <div className={styles.levelPhoto}>
                  <Image
                    src={levelPhotos[index]}
                    alt={level.title[locale]}
                    fill
                    sizes="(max-width: 680px) 100vw, (max-width: 1020px) 50vw, 33vw"
                    className={styles.coverImage}
                  />
                  <span className={styles.levelBadge}>{t.levelLabel} {String(level.number).padStart(2, "0")}</span>
                </div>
                <div className={styles.levelContent}>
                  <h3>{level.title[locale]}</h3>
                  <p>{level.summary[locale]}</p>
                </div>
                <details className={styles.levelDetail}>
                  <summary>{t.detailLabel}<ChevronDown size={18} aria-hidden="true" /></summary>
                  <div className={styles.detailBody}>
                    <ul>
                      {level.focus.map((item, i) => <li key={i}><Check size={15} aria-hidden="true" />{item[locale]}</li>)}
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

        <section className={styles.learningFeature} aria-labelledby="kundalini-learning-title">
          <div className={styles.learningPhoto}>
            <Image
              src="/academy/reiki-yggdrasil/source/school-introduction.jpg"
              alt={locale === "ru" ? "Реальная фотография учебной группы из материалов школы" : locale === "es" ? "Fotografía auténtica de un grupo de formación" : "Authentic photograph of a Reiki teaching group"}
              fill
              sizes="(max-width: 780px) 100vw, 44vw"
              className={styles.coverImage}
            />
          </div>
          <div className={styles.learningContent}>
            <span className={styles.eyebrow}>{t.learningKicker}</span>
            <h2 id="kundalini-learning-title">{t.howTitle}</h2>
            <ol>
              {t.howText.map((item, index) => (
                <li key={index}><span>{String(index + 1).padStart(2, "0")}</span>{item.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
            <details className={styles.practiceNotes}>
              <summary>{t.methodTitle}<ChevronDown size={18} aria-hidden="true" /></summary>
              <ul>
                {kundaliniEveryday.map((item, index) => (
                  <li key={index}><strong>{item.title[locale]}</strong> — {item.description[locale]}</li>
                ))}
              </ul>
            </details>
          </div>
        </section>

        <section className={styles.downloadFeature} id="kundalini-guide" aria-labelledby="kundalini-guide-title">
          <div className={styles.guideIcon}><BookOpen size={33} aria-hidden="true" /></div>
          <div className={styles.guideCopy}>
            <span className={styles.eyebrow}>{t.guideKicker}</span>
            <h2 id="kundalini-guide-title">{t.guideTitle}</h2>
            <p>{t.guideDescription}</p>
          </div>
          <a className={styles.downloadButton} href={guideUrl(locale)} download><Download size={19} aria-hidden="true" />{t.pdfButton}</a>
        </section>

        <section className={styles.faqSection} aria-labelledby="kundalini-faq-title">
          <h2 id="kundalini-faq-title">{t.faqTitle}</h2>
          <div className={styles.faq}>
            {t.faqs.map((item, index) => (
              <details key={index}>
                <summary>{item.q}<ChevronDown size={18} aria-hidden="true" /></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.capture} id="kundalini-enquire" aria-labelledby="kundalini-enquire-title">
          <div className={styles.captureCopy}>
            <span className={styles.eyebrow}>{t.contactKicker}</span>
            <h2 id="kundalini-enquire-title">{t.contactTitle}</h2>
            <p>{t.contactText}</p>
            <small>{t.footerNote}</small>
          </div>
          <div className={styles.captureActions}>
            <a href={enquire(locale, "level-one")} target="_blank" rel="noopener noreferrer" className={styles.capturePrimary}>
              <MessageCircle size={19} aria-hidden="true" />{t.contactLevel}<ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href={enquire(locale, "programme")} target="_blank" rel="noopener noreferrer" className={styles.captureSecondary}>
              <MessageCircle size={19} aria-hidden="true" />{t.contactProgramme}<ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className={styles.telegram} href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.telegram} <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
        </section>
      </div>
    </main>
  );
}
