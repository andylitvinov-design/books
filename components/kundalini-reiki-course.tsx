import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, Download, FileText } from "lucide-react";

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

// Short interface copy only. The original historical teaching, level descriptions,
// 24-page PDF, and source attribution remain below, untouched and collapsible.
const landingCopy = {
  en: {
    heroLine: "Three levels. One clear first step.",
    heroText: "Discover the tradition, try an original meditation, then decide how you want to learn.",
    free: "Request free Level 1",
    levels: "Explore the 3 levels",
    kicker: "YOUR LEARNING PATH",
    pathTitle: "A simple path, from first practice to Level 3",
    pathIntro: "See what each stage covers. Open a level for the original teaching.",
    stageNames: ["01 · Foundations", "02 · Meditation", "03 · Master level"],
    stageDescriptions: [
      "Begin with self-practice and the basic method.",
      "Explore the Kundalini Reiki meditation in the manual.",
      "Study advanced practices and how attunements are described.",
    ],
    sourceDetails: "Original level notes",
    videoTitle: "Try the practice first",
    videoText: "Watch Andrey's original guided Kundalini Reiki meditation. The audio is in English.",
    videoLabel: "ORIGINAL MEDITATION · EN AUDIO",
    youtube: "Open video on YouTube",
    resourceKicker: "YOUR ORIGINAL MATERIALS",
    resourceTitle: "The actual manual, not just a summary",
    resourceText: "Read the 24-page original by Paul Crick, with diagrams for each of the three levels.",
    manualOnline: "Open PDF",
    sources: "Tradition, daily practices & advanced material",
    originalSource: "About the tradition · original excerpts",
    everyday: "Everyday practice & balance",
    additional: "Level 3 additional attunements",
    further: "Boosters, Gold Reiki & Ethereal Crystals",
    guidedLink: "Prefer interactive lessons?",
    guidedLabel: "AI course · 3 Reiki systems",
    finalKicker: "YOUR NEXT STEP",
    finalTitle: "Curious? Start with Level 1.",
    finalText: "Choose the free introduction or ask Andrey about personal initiation and all three levels. Availability and terms are confirmed personally.",
    personal: "Ask for personal initiation",
    training: "Ask about full training",
    smallNote: "A request is not an automatic booking or completed initiation.",
  },
  ru: {
    heroLine: "Три ступени. Один понятный первый шаг.",
    heroText: "Познакомьтесь с традицией, попробуйте медитацию и выберите свой формат обучения.",
    free: "Запросить 1-ю ступень бесплатно",
    levels: "Посмотреть 3 ступени",
    kicker: "ВАШ ПУТЬ ОБУЧЕНИЯ",
    pathTitle: "От первой практики к третьей ступени",
    pathIntro: "Кратко о каждой ступени. Подробности — в оригинальных материалах.",
    stageNames: ["01 · Основы", "02 · Медитация", "03 · Ступень мастера"],
    stageDescriptions: [
      "Знакомство с методом и самостоятельной практикой.",
      "Медитация Кундалини Рейки по оригинальной методичке.",
      "Дополнительные практики и описание инициаций.",
    ],
    sourceDetails: "Описание из первоисточника",
    videoTitle: "Сначала попробуйте практику",
    videoText: "Посмотрите авторскую медитацию Андрея по Кундалини Рейки. Видео на английском языке.",
    videoLabel: "АВТОРСКАЯ МЕДИТАЦИЯ · ЗВУК EN",
    youtube: "Открыть на YouTube",
    resourceKicker: "ОРИГИНАЛЬНЫЕ МАТЕРИАЛЫ",
    resourceTitle: "Настоящая методичка, а не пересказ",
    resourceText: "Оригинальные 24 страницы Пола Крика с рисунками для трёх ступеней.",
    manualOnline: "Открыть PDF",
    sources: "Традиция, ежедневные практики и дополнительные материалы",
    originalSource: "О традиции · оригинальные выдержки",
    everyday: "Ежедневная практика и баланс",
    additional: "Дополнительные инициации третьей ступени",
    further: "Booster, Gold Reiki и Ethereal Crystals",
    guidedLink: "Хотите интерактивные уроки?",
    guidedLabel: "ИИ-курс · 3 системы Рейки",
    finalKicker: "СЛЕДУЮЩИЙ ШАГ",
    finalTitle: "Интересно? Начните с 1-й ступени.",
    finalText: "Выберите бесплатное введение или уточните у Андрея условия личной инициации и полного курса.",
    personal: "Уточнить личную инициацию",
    training: "Узнать о полном курсе",
    smallNote: "Отправка заявки ещё не означает запись или получение инициации.",
  },
  es: {
    heroLine: "Tres niveles. Un primer paso claro.",
    heroText: "Descubre la tradición, prueba la meditación original y elige cómo seguir.",
    free: "Solicitar nivel 1 gratis",
    levels: "Ver los 3 niveles",
    kicker: "TU CAMINO DE APRENDIZAJE",
    pathTitle: "Del primer ejercicio al tercer nivel",
    pathIntro: "Descubre cada etapa. Abre un nivel para leer el material original.",
    stageNames: ["01 · Fundamentos", "02 · Meditación", "03 · Nivel maestro"],
    stageDescriptions: [
      "Empieza con los fundamentos y la práctica personal.",
      "Conoce la meditación Kundalini Reiki del manual.",
      "Estudia las prácticas avanzadas y las iniciaciones descritas.",
    ],
    sourceDetails: "Notas originales del nivel",
    videoTitle: "Prueba la práctica primero",
    videoText: "Mira la meditación original guiada por Andrey. Audio en inglés.",
    videoLabel: "MEDITACIÓN ORIGINAL · AUDIO EN INGLÉS",
    youtube: "Abrir vídeo en YouTube",
    resourceKicker: "MATERIALES ORIGINALES",
    resourceTitle: "El manual real, no solo un resumen",
    resourceText: "Lee el original de Paul Crick: 24 páginas y diagramas de los tres niveles.",
    manualOnline: "Abrir PDF",
    sources: "Tradición, práctica diaria y material avanzado",
    originalSource: "La tradición · textos originales",
    everyday: "Práctica diaria y balance",
    additional: "Iniciaciones adicionales del nivel 3",
    further: "Boosters, Gold Reiki y Ethereal Crystals",
    guidedLink: "¿Prefieres lecciones interactivas?",
    guidedLabel: "Curso de IA · 3 sistemas Reiki",
    finalKicker: "TU SIGUIENTE PASO",
    finalTitle: "¿Te interesa? Empieza por el nivel 1.",
    finalText: "Elige la introducción gratuita o pregunta a Andrey por la iniciación personal y los tres niveles.",
    personal: "Consultar iniciación personal",
    training: "Consultar formación completa",
    smallNote: "Enviar una solicitud no confirma una reserva ni una iniciación.",
  },
} as const;

export function KundaliniReikiCourse({ locale }: { locale: PublicLocale }) {
  const t = kundaliniInterface[locale];
  const c = landingCopy[locale];
  const videoCopy = { eyebrow: c.videoLabel };
  const pdf = kundaliniOriginalManual.path;
  const meditation = englishGuidedMeditations.find((item) => item.key === "kundalini-reiki");

  return (
    <main className={styles.page + " reiki-kundalini-page"} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrapper}>
        <AcademyBackLink locale={locale} />

        <section className={styles.hero + " reiki-screen reiki-screen--hero"} aria-labelledby="kundalini-title" data-kundalini-fire-hero>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="kundalini-title">{t.title}</h1>
            <p className={styles.heroLine}>{c.heroLine}</p>
            <p className={styles.heroText}>{c.heroText}</p>
          </div>
          <div className={styles.heroPhotoFrame}>
            <Image
              src="/images/holistic-house/reiki-approved-sunrise-v3.webp"
              alt={locale === "ru" ? "Тёплый свет рассвета в практике Кундалини Рейки" : locale === "es" ? "Luz cálida del amanecer para Kundalini Reiki" : "Warm sunrise light for Kundalini Reiki practice"}
              fill priority sizes="(max-width: 760px) calc(100vw - 46px), 43vw"
              className={styles.heroPhoto}
            />
          </div>
          <div className={styles.heroFooter}>
            <details className={styles.heroDisclosure}>
              <summary>{c.originalSource}<span aria-hidden="true">＋</span></summary>
              <div><p>{t.heroLead}</p><small>{t.heroSource}</small></div>
            </details>
            <div className={styles.heroMetrics}>
              <span>{t.levelCount}</span><span>{t.manualCount}</span>
            </div>
            <div className={styles.heroActions}>
              <Link href={REIKI_FREE_COURSE_PATH} className={styles.primaryAction} data-reiki-course-cta>
                <BookOpen size={18} aria-hidden="true" />{c.guidedLabel}<ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href={REIKI_FREE_COURSE_PATH} className={styles.heroSecondary} data-reiki-course-cta>
                {c.free}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.pathStage + " reiki-screen"} id="kundalini-levels" aria-labelledby="kundalini-levels-title">
          <Image src="/images/holistic-house/reiki-practitioner-sunrise.webp" alt="" fill sizes="(max-width:760px) 100vw, 1180px" className={styles.pathBackdrop} />
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>{c.kicker}</p>
            <h2 id="kundalini-levels-title">{c.pathTitle}</h2>
            <p>{c.pathIntro}</p>
          </header>
          <div className={styles.levels}>
            {kundaliniLessons.map((level) => (
              <article className={styles.levelCard} key={level.number}>
                <div className={styles.levelArt}>
                  <Image
                    src={level.image}
                    alt={level.title[locale] + " · Paul Crick manual"}
                    fill
                    sizes="(max-width:760px) 76px, (max-width:1100px) 170px, 210px"
                    className={styles.manualDrawing}
                  />
                  <span className={styles.levelNumber}>{String(level.number).padStart(2, "0")}</span>
                </div>
                <div className={styles.levelBody}>
                  <p className={styles.stageName}>{c.stageNames[level.number - 1]}</p>
                  <h3>{level.title[locale]}</h3>
                  <p className={styles.stageDescription}>{c.stageDescriptions[level.number - 1]}</p>
                </div>
                <details className={styles.levelDetail}>
                  <summary>{c.sourceDetails}<ChevronDown size={16} aria-hidden="true" /></summary>
                  <div className={styles.levelSource}>
                    <p>{level.summary[locale]}</p>
                    {level.practice.map((entry, index) => (
                      <div className={styles.sourceEntry} key={index}>
                        <h4>{entry.label[locale]}</h4>
                        <p>{entry.text[locale]}</p>
                        <small>{entry.origin}</small>
                      </div>
                    ))}
                    <small>{level.source}</small>
                  </div>
                </details>
              </article>
            ))}
          </div>
        </section>

        {meditation?.youtubeId ? (
          <section className={styles.meditationStage + " reiki-screen"} aria-labelledby="kundalini-meditation-title">
            <div className={styles.meditationCopy}>
              <Image
                src="/images/holistic-house/hero-olive-incense.webp"
                alt=""
                fill
                sizes="(max-width:760px) 100vw, 540px"
                className={styles.meditationPhoto}
              />
              <div className={styles.meditationWords}>
                <p className={styles.eyebrow}>{videoCopy.eyebrow}</p>
                <h2 id="kundalini-meditation-title">{c.videoTitle}</h2>
                <p>{c.videoText}</p>
              </div>
            </div>
            <div className={styles.meditationMedia}>
              <div className={styles.meditationFrame}>
                <AcademyVideoPlayer youtubeId={meditation.youtubeId} title={meditation.title} />
              </div>
              <a className={styles.youtubeLink} href={"https://www.youtube.com/watch?v=" + meditation.youtubeId} target="_blank" rel="noopener noreferrer">
                {c.youtube}<ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </section>
        ) : null}

        <section className={styles.manualStage + " reiki-screen"} id="kundalini-manual" aria-labelledby="kundalini-manual-title">
          <div className={styles.manualVisual} aria-hidden="true">
            <Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill sizes="(max-width:760px) 100vw, 460px" className={styles.manualBackdrop} />
            <span className={styles.bookLabel}>Kundalini Reiki</span>
            <strong className={styles.bookTitle}>Manual</strong>
            <span className={styles.bookAuthor}>Paul Crick · 24 pages</span>
            <div className={styles.heroDiagramSet}>
              {kundaliniLessons.map((level) => (
                <div className={styles.heroDiagram} key={level.number}>
                  <Image
                    src={level.image}
                    alt=""
                    fill
                    sizes="(max-width:760px) 28vw, 120px"
                    className={styles.heroDiagramImage}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.manualText}>
            <p className={styles.eyebrow}>{c.resourceKicker}</p>
            <h2 id="kundalini-manual-title">{c.resourceTitle}</h2>
            <p>{c.resourceText}</p>
            <div className={styles.manualActions}>
              <a href={pdf} download={kundaliniOriginalManual.fileName} className={styles.primaryAction}>
                <Download size={18} aria-hidden="true" />{t.download}
              </a>
              <a href={pdf} target="_blank" rel="noopener noreferrer" className={styles.manualOpen}>
                <FileText size={17} aria-hidden="true" />{c.manualOnline}
              </a>
            </div>
            <details className={styles.sourceDrawer}>
              <summary>{c.sources}<ChevronDown size={18} aria-hidden="true" /></summary>
              <div className={styles.sourceDrawerBody}>
                <details className={styles.nestedDisclosure}>
                  <summary>{c.originalSource}<ChevronDown size={16} aria-hidden="true" /></summary>
                  <p>{t.heroLead}</p>
                  <p>{t.heroDetail}</p>
                  <small>{t.heroSource}</small>
                </details>
                <details className={styles.nestedDisclosure}>
                  <summary>{c.everyday}<ChevronDown size={16} aria-hidden="true" /></summary>
                  <h3>{t.balanceTitle}</h3>
                  <p>{t.balanceDescription}</p>
                  <small>{t.balanceSource}</small>
                  {kundaliniEveryday.map((entry, index) => (
                    <div className={styles.sourceEntry} key={index}>
                      <h4>{entry.label[locale]}</h4>
                      <p>{entry.text[locale]}</p>
                      <small>{entry.origin}</small>
                    </div>
                  ))}
                </details>
                <details id="kundalini-extra" className={styles.nestedDisclosure}>
                  <summary>{c.additional}<ChevronDown size={16} aria-hidden="true" /></summary>
                  <p>{t.extraAttunementsSummary}</p>
                  <div className={styles.extraTags}>
                    {kundaliniExtraNames.map((name, index) => <span key={index}>{name[locale]}</span>)}
                  </div>
                  {kundaliniExtraAttunements.map((entry, index) => (
                    <div className={styles.sourceEntry} key={index}>
                      <h4>{entry.label[locale]}</h4>
                      <p>{entry.text[locale]}</p>
                      <small>{entry.origin}</small>
                    </div>
                  ))}
                </details>
                <details id="kundalini-extensions" className={styles.nestedDisclosure}>
                  <summary>{c.further}<ChevronDown size={16} aria-hidden="true" /></summary>
                  <small>{t.extensionsSource}</small>
                  {kundaliniExtensions.map((extension) => (
                    <div className={styles.sourceEntry} key={extension.id}>
                      <h4>{extension.title[locale]}</h4>
                      <p>{extension.excerpt[locale]}</p>
                      <p>{extension.details[locale]}</p>
                      {extension.stoneNames ? (
                        <ul>{extension.stoneNames.map((stone) => <li key={stone}>{stone}</li>)}</ul>
                      ) : null}
                      {extension.stoneNamesAdvanced && extension.advancedTitle ? (
                        <>
                          <h4>{extension.advancedTitle[locale]}</h4>
                          <ul>{extension.stoneNamesAdvanced.map((stone) => <li key={stone}>{stone}</li>)}</ul>
                        </>
                      ) : null}
                      <small>Paul Crick · pp. {extension.manualPages}</small>
                    </div>
                  ))}
                </details>
                <details className={styles.nestedDisclosure}>
                  <summary>{kundaliniHistory.label[locale]}<ChevronDown size={16} aria-hidden="true" /></summary>
                  <p>{kundaliniHistory.text[locale]}</p>
                  <small>{kundaliniHistory.origin}</small>
                </details>
                <p className={styles.sourceCaution}>{t.caution}</p>
                <p className={styles.sourceSections}>{t.manualSections}</p>
              </div>
            </details>
            <Link className={styles.guidedLink} href={REIKI_FREE_COURSE_PATH}>
              <BookOpen size={17} aria-hidden="true" />
              <span>{c.guidedLink} <strong>{c.guidedLabel}</strong></span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <div className={styles.captureStage + " reiki-screen"}>
          <div className={styles.capturePortrait} aria-hidden="true">
            <Image
              src="/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp"
              alt=""
              fill sizes="(max-width:760px) 120px, 340px"
              className={styles.portraitImage}
            />
          </div>
          <KundaliniReikiOrderCapture locale={locale} />
        </div>
      </div>
    </main>
  );
}
