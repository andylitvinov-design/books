import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ChevronDown, Download, FileText } from "lucide-react";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { KundaliniReikiOrderCapture } from "@/components/kundalini-reiki-order-capture";
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

export function KundaliniReikiCourse({ locale }: { locale: PublicLocale }) {
  const t = kundaliniInterface[locale];
  const pdf = kundaliniOriginalManual.path;
  const meditation = englishGuidedMeditations.find((item) => item.key === "kundalini-reiki");
  const videoCopy = meditationCopy[locale];

  return (
    <main className={styles.page + " reiki-kundalini-page"} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrapper}>
        <AcademyBackLink locale={locale} />

        <section className={styles.hero + " reiki-screen reiki-screen--hero"} aria-labelledby="kundalini-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="kundalini-title">{t.title}</h1>
            <p className={styles.heroLead}>{t.heroLead}</p>
            <details className="reiki-disclosure reiki-disclosure--quote">
              <summary>{locale === "ru" ? "Подробнее о традиции и первоисточнике" : locale === "es" ? "Sobre la tradición y sus fuentes" : "More on the tradition & original source"}<span aria-hidden="true">＋</span></summary>
              <blockquote className={styles.sourceQuote}>
              <p>{t.heroDetail}</p><footer>{t.heroSource}</footer>
            </blockquote>
            </details>
            <div className={styles.heroMetrics}>
              <span>{t.levelCount}</span>
              <span>{t.manualCount}</span>
            </div>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href={REIKI_FREE_COURSE_PATH} data-reiki-course-cta>
                {locale === "ru" ? "ИИ-курс · 3 системы Рейки" : locale === "es" ? "Curso de IA · 3 sistemas Reiki" : "AI course · 3 Reiki systems"}<ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className={styles.secondaryAction} href={"/" + locale + "/academy/reiki/kundalini-reiki/free-initiation"}>
                {locale === "ru" ? "Получить 1-ю ступень бесплатно" : locale === "es" ? "Nivel 1 gratis" : "Free Level 1 initiation"}<ArrowRight size={17} aria-hidden="true" />
              </Link>
              <details className="reiki-disclosure reiki-disclosure--actions">
                <summary>{locale === "ru" ? "Изучить программу и получить PDF" : locale === "es" ? "Ver el programa y descargar PDF" : "Programme & original PDF"}<span aria-hidden="true">＋</span></summary>
                <div className="reiki-disclosure__actions">
                  <a className={styles.primaryAction} href="#kundalini-levels">
                {t.start}<ArrowDown size={17} aria-hidden="true" />
              </a>
                  <a className={styles.secondaryAction} href={pdf} download={kundaliniOriginalManual.fileName}>
                <Download size={18} aria-hidden="true" />{t.download}
              </a>
                </div>
              </details>
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
          <section className={styles.meditationFeature + " reiki-screen reiki-screen--media"} aria-labelledby="kundalini-meditation-title">
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

        <section className={styles.section + " reiki-screen reiki-screen--explore"} id="kundalini-levels" aria-labelledby="kundalini-levels-title">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>{t.introduction}</p>
            <h2 id="kundalini-levels-title">{t.levelsTitle}</h2>
          </header>
          <p className="reiki-swipe-cue">{locale === "ru" ? "Листайте ступени горизонтально →" : locale === "es" ? "Desliza entre niveles →" : "Swipe or scroll through the levels →"}</p>
          <div className={styles.levels + " reiki-card-track reiki-kundalini-levels"} tabIndex={0} aria-label={t.levelsTitle}>
            {kundaliniLessons.map((level) => (
              <article className={styles.levelCard + " reiki-kundalini-card"} key={level.number}>
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

        <section className={styles.balanceSection + " reiki-screen reiki-screen--feature"} aria-labelledby="kundalini-balance-title">
          <div className={styles.balanceHeading}>
            <span className={styles.eyebrow}>PsiMaster · Paul Crick</span>
            <h2 id="kundalini-balance-title">{t.balanceTitle}</h2>
          </div>
          <div className={styles.balanceBody}>
            <p>{t.balanceDescription}</p>
            <small>{t.balanceSource}</small>
          </div>
        </section>

        <section className={styles.practices + " reiki-screen reiki-screen--explore"} aria-labelledby="kundalini-practices-title">
          <header className={styles.sectionHead}>
            <h2 id="kundalini-practices-title">{t.practicesTitle}</h2>
          </header>
          <div className={styles.practiceRows + " reiki-card-track"} tabIndex={0} aria-label={t.practicesTitle}>
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

        <section className={styles.section + " reiki-screen reiki-screen--feature"} id="kundalini-extra" aria-labelledby="kundalini-extra-title">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Kundalini Reiki 3 · Paul Crick</p>
            <h2 id="kundalini-extra-title">{t.extraAttunementsTitle}</h2>
          </header>
          <details className={styles.extraAccordion}>
            <summary>{t.readLevel}<ChevronDown size={17} aria-hidden="true" /></summary>
            <div className={styles.extraTags}>
            {kundaliniExtraNames.map((name, index) => (
              <span key={index}>{name[locale]}</span>
            ))}
          </div>
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

        <section className={styles.section + " reiki-screen reiki-screen--explore"} id="kundalini-extensions" aria-labelledby="kundalini-extensions-title">
          <header className={styles.sectionHead}>
            <h2 id="kundalini-extensions-title">{t.extensionsTitle}</h2>
            <p className={styles.sourceHint}>{t.extensionsSource}</p>
          </header>
          <div className={styles.extensionGrid + " reiki-card-track"} tabIndex={0} aria-label={t.extensionsTitle}>
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

        <section className={styles.manualFeature + " reiki-screen reiki-screen--feature"} id="kundalini-manual" aria-labelledby="kundalini-manual-title">
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

        <KundaliniReikiOrderCapture locale={locale} />
      </div>
    </main>
  );
}
