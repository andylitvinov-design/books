import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, ChevronDown, Download, FileText, MessageCircle } from "lucide-react";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import {
  kundaliniEveryday,
  kundaliniExtensions,
  kundaliniExtraAttunements,
  kundaliniExtraNames,
  kundaliniHistory,
  kundaliniInterface,
  kundaliniLessons,
  kundaliniOriginalManual,
} from "@/data/academy/kundalini-reiki-course";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./kundalini-reiki-course.module.css";

const whatsapp = "https://wa.me/14376066502?text=";

const meditationCopy = {
  en: {
    eyebrow: "ORIGINAL VIDEO · ENGLISH AUDIO",
    title: "Kundalini Reiki meditation",
    lead: "Watch Andrey's original English-language guided meditation before exploring the three course levels.",
    watch: "Watch on YouTube",
  },
  ru: {
    eyebrow: "АВТОРСКОЕ ВИДЕО · ЗВУК НА АНГЛИЙСКОМ",
    title: "Медитация Кундалини Рейки",
    lead: "Посмотрите оригинальную медитацию Андрея на английском языке перед знакомством с тремя ступенями курса.",
    watch: "Смотреть на YouTube",
  },
  es: {
    eyebrow: "VÍDEO ORIGINAL · AUDIO EN INGLÉS",
    title: "Meditación Kundalini Reiki",
    lead: "Mira la meditación original de Andrey en inglés antes de explorar los tres niveles del curso.",
    watch: "Ver en YouTube",
  },
} as const;
// Original diagrams are stored in /public, extracted without replacing the user PDF.

function enquiryUrl(locale: PublicLocale, kind: "training" | "initiation") {
  const page = "https://holistichouse.vercel.app/" + locale + "/academy/reiki/kundalini-reiki";
  const course = locale === "ru" ? "Кундалини Рейки" : "Kundalini Reiki";
  const request = kind === "training"
    ? locale === "ru" ? "Здравствуйте, Андрей! Хочу узнать о курсе Кундалини Рейки, формате обучения, доступных датах и актуальной стоимости."
      : locale === "es" ? "Hola Andrey. Me interesa el curso de Kundalini Reiki. ¿Cuál es el formato, la disponibilidad y el precio actual?"
      : "Hello Andrey! I'm interested in Kundalini Reiki training. Please tell me the current format, availability and price."
    : locale === "ru" ? "Здравствуйте, Андрей! Хочу запросить личную инициацию 1-й ступени Кундалини Рейки. Подскажите условия."
      : locale === "es" ? "Hola Andrey. Quisiera solicitar una iniciación personal de Kundalini Reiki nivel 1. ¿Cuáles son las condiciones?"
      : "Hello Andrey! I'd like to request a personal Kundalini Reiki Level 1 initiation. Please let me know the conditions.";
  return whatsapp + encodeURIComponent([
    request,
    "",
    "Course / Система: " + course,
    "Request / Запрос: " + (kind === "training" ? "Kundalini Reiki training" : "Kundalini Reiki Level 1 personal initiation"),
    "Holistic House: " + page,
  ].join("\n"));
}

export function KundaliniReikiCourse({ locale }: { locale: PublicLocale }) {
  const t = kundaliniInterface[locale];
  const pdf = kundaliniOriginalManual.path;
  const meditation = englishGuidedMeditations.find((item) => item.key === "kundalini-reiki");
  const videoCopy = meditationCopy[locale];

  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrapper}>
        <AcademyBackLink locale={locale} />

        <section className={styles.hero} aria-labelledby="kundalini-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="kundalini-title">{t.title}</h1>
            <p className={styles.heroLead}>{t.heroLead}</p>
            <blockquote className={styles.sourceQuote}>
              <p>{t.heroDetail}</p><footer>{t.heroSource}</footer>
            </blockquote>
            <div className={styles.heroMetrics}>
              <span>{t.levelCount}</span>
              <span>{t.manualCount}</span>
            </div>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href={REIKI_FREE_COURSE_PATH} data-reiki-course-cta>
                {locale === "ru" ? "Начать бесплатный курс Рейки" : locale === "es" ? "Empezar curso de Reiki gratis" : "Start free Reiki course"}<ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className={styles.secondaryAction} href={"/" + locale + "/academy/reiki/kundalini-reiki/free-initiation"}>
                {locale === "ru" ? "Получить 1-ю ступень бесплатно" : locale === "es" ? "Nivel 1 gratis" : "Free Level 1 initiation"}<ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a className={styles.primaryAction} href="#kundalini-levels">
                {t.start}<ArrowDown size={17} aria-hidden="true" />
              </a>
              <a className={styles.secondaryAction} href={pdf} download={kundaliniOriginalManual.fileName}>
                <Download size={18} aria-hidden="true" />{t.download}
              </a>
            </div>
          </div>
          <div className={styles.heroPhoto} aria-label="Kundalini Reiki attunement diagrams from Paul Crick's original manual">
            <div className={styles.heroDiagramSet}>
              {kundaliniLessons.map((level) => (
                <div className={styles.heroDiagram} key={level.number}>
                  <Image
                    src={level.image}
                    alt={level.title[locale] + " · original Paul Crick manual"}
                    fill
                    priority={level.number === 2}
                    sizes="(max-width: 760px) 31vw, 14vw"
                    className={styles.heroDiagramImage}
                  />
                  <span>{String(level.number).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
            <span className={styles.photoCaption}>Paul Crick · Kundalini Reiki Manual</span>
          </div>
        </section>

        {meditation?.youtubeId ? (
          <section className={styles.meditationFeature} aria-labelledby="kundalini-meditation-title">
            <div className={styles.meditationText}>
              <p className={styles.eyebrow}>{videoCopy.eyebrow}</p>
              <h2 id="kundalini-meditation-title">{videoCopy.title}</h2>
              <p>{videoCopy.lead}</p>
              <a className={styles.meditationLink} href={"https://www.youtube.com/watch?v=" + meditation.youtubeId} target="_blank" rel="noopener noreferrer">{videoCopy.watch}<ArrowRight size={16} aria-hidden="true" /></a>
            </div>
            <div className={styles.meditationFrame}>
              <AcademyVideoPlayer youtubeId={meditation.youtubeId} title={meditation.title} />
            </div>
          </section>
        ) : null}

        <section className={styles.section} id="kundalini-levels" aria-labelledby="kundalini-levels-title">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>{t.introduction}</p>
            <h2 id="kundalini-levels-title">{t.levelsTitle}</h2>
          </header>
          <div className={styles.levels}>
            {kundaliniLessons.map((level) => (
              <article className={styles.levelCard} key={level.number}>
                <div className={styles.levelArt}>
                  <Image
                    src={level.image}
                    alt={level.title[locale] + " · Paul Crick manual"}
                    fill
                    sizes="(max-width: 760px) 100vw, (max-width: 1040px) 50vw, 33vw"
                    className={styles.manualDrawing}
                  />
                  <span className={styles.levelNumber}>{t.level} {String(level.number).padStart(2, "0")}</span>
                </div>
                <div className={styles.levelBody}>
                  <h3>{level.title[locale]}</h3>
                  <p className={styles.levelExcerpt}>{level.summary[locale]}</p>
                  <small className={styles.provenance}>{level.source}</small>
                </div>
                <details className={styles.accordion}>
                  <summary>{t.readLevel}<ChevronDown size={17} aria-hidden="true" /></summary>
                  <div className={styles.accordionBody}>
                    {level.practice.map((entry, index) => (
                      <div className={styles.sourceEntry} key={index}>
                        <h4>{entry.label[locale]}</h4>
                        <p>{entry.text[locale]}</p>
                        <small>{entry.origin}</small>
                      </div>
                    ))}
                  </div>
                </details>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.balanceSection} aria-labelledby="kundalini-balance-title">
          <div className={styles.balanceHeading}>
            <span className={styles.eyebrow}>PsiMaster · Paul Crick</span>
            <h2 id="kundalini-balance-title">{t.balanceTitle}</h2>
          </div>
          <div className={styles.balanceBody}>
            <p>{t.balanceDescription}</p>
            <small>{t.balanceSource}</small>
          </div>
        </section>

        <section className={styles.practices} aria-labelledby="kundalini-practices-title">
          <header className={styles.sectionHead}>
            <h2 id="kundalini-practices-title">{t.practicesTitle}</h2>
          </header>
          <div className={styles.practiceRows}>
            {kundaliniEveryday.map((entry, index) => (
              <div className={styles.practiceRow} key={index}>
                <span className={styles.practiceNumber}>0{index + 1}</span>
                <div>
                  <h3>{entry.label[locale]}</h3>
                  <p>{entry.text[locale]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} id="kundalini-extra" aria-labelledby="kundalini-extra-title">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Kundalini Reiki 3 · Paul Crick</p>
            <h2 id="kundalini-extra-title">{t.extraAttunementsTitle}</h2>
          </header>
          <div className={styles.extraTags}>
            {kundaliniExtraNames.map((name, index) => (
              <span key={index}>{name[locale]}</span>
            ))}
          </div>
          <details className={styles.extraAccordion}>
            <summary>{t.readLevel}<ChevronDown size={17} aria-hidden="true" /></summary>
            <div className={styles.extraList}>
              {kundaliniExtraAttunements.map((entry, index) => (
                <article key={index}>
                  <h3>{entry.label[locale]}</h3>
                  <p>{entry.text[locale]}</p>
                  <small>{entry.origin}</small>
                </article>
              ))}
            </div>
          </details>
        </section>

        <section className={styles.section} id="kundalini-extensions" aria-labelledby="kundalini-extensions-title">
          <header className={styles.sectionHead}>
            <h2 id="kundalini-extensions-title">{t.extensionsTitle}</h2>
            <p className={styles.sourceHint}>{t.extensionsSource}</p>
          </header>
          <div className={styles.extensionGrid}>
            {kundaliniExtensions.map((extension) => (
              <article className={styles.extensionCard} key={extension.id}>
                <h3>{extension.title[locale]}</h3>
                <p>{extension.excerpt[locale]}</p>
                <details className={styles.extensionDetails}>
                  <summary>{t.expand}<ChevronDown size={16} aria-hidden="true" /></summary>
                  <div>
                    <p>{extension.details[locale]}</p>
                    {extension.stoneNames ? (
                      <ul className={styles.stoneList}>
                        {extension.stoneNames.map((stone) => <li key={stone}>{stone}</li>)}
                      </ul>
                    ) : null}
                    {extension.stoneNamesAdvanced && extension.advancedTitle ? (
                      <>
                        <h4 className={styles.stoneGroupTitle}>{extension.advancedTitle[locale]}</h4>
                        <ul className={styles.stoneList}>
                          {extension.stoneNamesAdvanced.map((stone) => <li key={stone}>{stone}</li>)}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </details>
                <small>Paul Crick · pp. {extension.manualPages}</small>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.manualFeature} id="kundalini-manual" aria-labelledby="kundalini-manual-title">
          <div className={styles.bookPicture} aria-hidden="true">
            <div className={styles.bookCover}>
              <span>Kundalini</span><span>Reiki</span>
              <span className={styles.bookLabel}>Manual</span>
              <span className={styles.bookAuthor}>Paul Crick</span>
            </div>
          </div>
          <div className={styles.manualText}>
            <p className={styles.eyebrow}>{t.manualAttribution}</p>
            <h2 id="kundalini-manual-title">{t.manualTitle}</h2>
            <p className={styles.manualContents}>{t.manualSections}</p>
            <div className={styles.manualActions}>
              <a className={styles.primaryAction} href={pdf} download={kundaliniOriginalManual.fileName}>
                <Download size={19} aria-hidden="true" />{t.download}
              </a>
              <a className={styles.manualOpen} href={pdf} target="_blank" rel="noopener noreferrer">
                <FileText size={17} aria-hidden="true" />PDF · {kundaliniOriginalManual.pages}
              </a>
            </div>
            <small>{t.manualNote}</small>
          </div>
        </section>

        <details className={styles.history}>
          <summary>{kundaliniHistory.label[locale]}<ChevronDown size={17} aria-hidden="true" /></summary>
          <p>{kundaliniHistory.text[locale]}</p>
          <small>{kundaliniHistory.origin}</small>
        </details>

        <aside className={styles.safetyNote}>{t.caution}</aside>

        <section className={styles.capture} id="kundalini-enquire" aria-labelledby="kundalini-contact-title">
          <div className={styles.captureContent}>
            <p className={styles.eyebrow}>HOLISTIC HOUSE · KUNDALINI REIKI</p>
            <h2 id="kundalini-contact-title">{t.contactTitle}</h2>
            <p>{t.contactText}</p>
            <p className={styles.studySource}><BookOpen size={16} aria-hidden="true" />{t.howToLearnTitle}: {t.howToLearnQuote} · PsiTrends</p>
          </div>
          <div className={styles.captureActions}>
            <Link href={"/" + locale + "/academy/reiki/kundalini-reiki/free-initiation"} className={styles.captureSecondary}>
              {locale === "ru" ? "Бесплатная вводная 1-я ступень" : locale === "es" ? "Iniciación introductoria gratis" : "Free introductory Level 1"}<ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a href={enquiryUrl(locale, "initiation")} target="_blank" rel="noopener noreferrer" className={styles.capturePrimary}>
              <MessageCircle size={19} aria-hidden="true" />{t.personal}<ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href={enquiryUrl(locale, "training")} target="_blank" rel="noopener noreferrer" className={styles.captureSecondary}>
              <MessageCircle size={19} aria-hidden="true" />{t.enquire}<ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer" className={styles.telegram}>{t.telegram} <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
        </section>
      </div>
    </main>
  );
}
