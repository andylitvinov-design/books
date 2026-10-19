import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import { YggdrasilCurriculum, basicLevelIntroductions } from "@/components/yggdrasil-curriculum";
import { YggdrasilEnglishVideoGuide } from "@/components/yggdrasil-english-video-guide";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import { yggdrasilModuleLandings, type YggdrasilModuleLanding } from "@/data/academy/yggdrasil-module-map";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./yggdrasil-basic-landing.module.css";

const basicCopy: Record<PublicLocale, {
  kicker: string; free: string; explore: string; five: string;
  pathKicker: string; pathTitle: string; pathLead: string; levelLabel: string;
  studyKicker: string; videoLabel: string;
  readyKicker: string; readyTitle: string; readyLead: string;
  personal: string; note: string;
}> = {
  en: {
    kicker: "HOLISTIC HOUSE ACADEMY · REIKI YGGDRASIL",
    free: "Get Level 1 for free", explore: "Explore 5 levels", five: "Five progressive levels",
    pathKicker: "YOUR LEARNING PATH · 01—05", pathTitle: "A clear path from the first practice to Master Level",
    pathLead: "See all five stages first. Select any level to read the original attunement descriptions, reflection exercises and video materials below.",
    levelLabel: "Level", studyKicker: "THE COMPLETE CURRICULUM", videoLabel: "Original videos in Russian",
    readyKicker: "YOUR NEXT STEP", readyTitle: "Begin your Reiki Yggdrasil journey",
    readyLead: "Study the first level and its seven preparation questions, then request the free introductory teacher-led initiation. Personal training is also available.",
    personal: "Ask about personal Level 1", note: "Availability and format are confirmed by Andrey. Source descriptions are spiritual education, not treatment or medical advice.",
  },
  ru: {
    kicker: "HOLISTIC HOUSE ACADEMY · РЕЙКИ ИГГДРАСИЛЬ",
    free: "Получить 1-ю ступень бесплатно", explore: "Посмотреть 5 ступеней", five: "Пять последовательных ступеней",
    pathKicker: "ВАШ ПУТЬ · 01—05", pathTitle: "От первых практик до мастерской ступени",
    pathLead: "Сначала познакомьтесь со всеми пятью ступенями. Откройте любую — ниже вы найдёте настройки, упражнения и сохранившиеся учебные видео.",
    levelLabel: "Ступень", studyKicker: "ПОЛНАЯ ПРОГРАММА", videoLabel: "Оригинальные видео на русском",
    readyKicker: "СЛЕДУЮЩИЙ ШАГ", readyTitle: "Начните обучение Рейки Иггдрасиль",
    readyLead: "Изучите первую ступень и семь подготовительных вопросов, затем запросите бесплатную вводную инициацию у преподавателя. Доступен и личный формат.",
    personal: "Узнать о личной 1-й ступени", note: "Наличие мест и формат подтверждает Андрей. Исторические описания — духовные материалы, не лечение и не медицинская рекомендация.",
  },
  es: {
    kicker: "ACADEMIA HOLISTIC HOUSE · REIKI YGGDRASIL",
    free: "Recibir Nivel 1 gratis", explore: "Explorar 5 niveles", five: "Cinco niveles progresivos",
    pathKicker: "TU RECORRIDO · 01—05", pathTitle: "De las primeras prácticas al Nivel de Maestro",
    pathLead: "Explora los cinco niveles. Selecciona cualquiera para encontrar sus sintonizaciones, ejercicios de reflexión y vídeos de las clases originales.",
    levelLabel: "Nivel", studyKicker: "EL PROGRAMA COMPLETO", videoLabel: "Vídeos originales en ruso",
    readyKicker: "SIGUIENTE PASO", readyTitle: "Empieza Reiki Yggdrasil",
    readyLead: "Estudia el primer nivel y las siete preguntas de preparación. Después, solicita la iniciación introductoria gratuita con el profesor. También hay formación personal.",
    personal: "Consultar Nivel 1 personal", note: "Andrey confirma la disponibilidad y el formato. Son materiales espirituales, no tratamiento ni consejo médico.",
  },
};

export function YggdrasilModuleLandingPage({ locale, module }: { locale: PublicLocale; module: YggdrasilModuleLanding }) {
  const level = curriculum.levels.find((item) => item.id === module.levelId);
  if (!level) return null;
  const index = yggdrasilModuleLandings.findIndex((item) => item.slug === module.slug);
  const previous = index > 0 ? yggdrasilModuleLandings[index - 1] : null;
  const next = index >= 0 && index < yggdrasilModuleLandings.length - 1 ? yggdrasilModuleLandings[index + 1] : null;
  const isBasic = module.slug === "basic-course";
  const b = basicCopy[locale];
  const baseUrl = "/" + locale + "/academy/reiki/yggdrasil";
  const settings = level.steps.reduce((sum, step) => sum + step.settings.length, 0);
  const videos = level.steps.reduce((sum, step) => sum + (step.video?.videos?.filter((video) => Boolean(video.youtubeId)).length ?? 0), 0);

  const copy = {
    en: {
      back: "Reiki Yggdrasil program",
      description: "Read the Basic Course book",
      freeGuide: "Free Level 1 · Read the questions",
      notice: "Historical descriptions of healing, energy, clairvoyance and other esoteric effects are presented as course/source material, not as medical advice or guaranteed outcomes.",
      steps: "steps", attunements: "attunements", videos: "video lectures",
      previous: "Previous module", next: "Next module",
    },
    ru: {
      back: "Программа Рейки Иггдрасиль",
      description: "Читать книгу Базового курса",
      freeGuide: "Бесплатная 1-я ступень · Семь вопросов",
      notice: "Исторические описания целительства, энергетических, ясновидческих и других эзотерических эффектов сохранены как учебный материал системы, а не как медицинская рекомендация или гарантия результата.",
      steps: "ступеней", attunements: "настроек", videos: "видеолекций",
      previous: "Предыдущий модуль", next: "Следующий модуль",
    },
    es: {
      back: "Programa Reiki Yggdrasil",
      description: "Leer el libro del Curso Básico",
      freeGuide: "Nivel 1 gratis · Siete preguntas",
      notice: "Las descripciones históricas de sanación, energía, clarividencia y otros efectos esotéricos se presentan como material del curso, no como consejo médico ni garantía.",
      steps: "etapas", attunements: "sintonizaciones", videos: "videoclases",
      previous: "Módulo anterior", next: "Módulo siguiente",
    },
  }[locale];

  return (
    <main className={"academy-reading-shell academy-reading-shell--wide yggdrasil-module-page" + (isBasic ? " " + styles.basicPage : "")} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <AcademyBackLink locale={locale} />
      <div className="academy-course-layout">
        <YggdrasilSideNavigation locale={locale} activeSlug={module.slug} />
        <article className="academy-reading">
        <nav className="yggdrasil-module-breadcrumb" aria-label="Reiki Yggdrasil">
          <Link href={`/${locale}/academy/reiki/yggdrasil`}>← {copy.back}</Link>
          {module.slug === "basic-course" ? <Link href={"/" + locale + "/academy/reiki/yggdrasil/basic-course/description"}>{copy.description} →</Link> : null}
          {module.slug === "basic-course" ? <Link href={"/" + locale + "/academy/reiki/yggdrasil/free-initiation"}>{copy.freeGuide} →</Link> : null}
        </nav>

        {isBasic ? (
          <>
            <header className={styles.hero} aria-labelledby="basic-yggdrasil-title">
              <div className={styles.heroCopy}>
                <p className={styles.kicker}>{b.kicker}</p>
                <h1 id="basic-yggdrasil-title">{module.title[locale]}</h1>
                <p className={styles.heroLead}>{module.lead[locale]}</p>
                <div className={styles.stats} aria-label={b.five}>
                  <span><strong>{level.steps.length}</strong>{copy.steps}</span>
                  <span><strong>{settings}</strong>{copy.attunements}</span>
                  <span><strong>{videos}</strong>{copy.videos}</span>
                </div>
                <div className={styles.heroActions}>
                  <Link href={REIKI_FREE_COURSE_PATH} className={styles.heroPrimary} data-reiki-course-cta>{locale === "ru" ? "Начать бесплатный курс Рейки" : locale === "es" ? "Empezar curso de Reiki gratis" : "Start free Reiki course"}<ArrowRight size={19} aria-hidden="true" /></Link>
                  <Link href={baseUrl + "/free-initiation"} className={styles.heroSecondary}>{b.free}<ArrowRight size={19} aria-hidden="true" /></Link>
                  <a href="#basic-yggdrasil-roadmap" className={styles.heroSecondary}>{b.explore}<ArrowDown size={18} aria-hidden="true" /></a>
                </div>
              </div>
              <div className={styles.heroArt}>
                <Image unoptimized src={module.image} alt="" fill sizes="(max-width: 760px) 100vw, 35vw" priority />
                <div className={styles.imageCaption}><CheckCircle2 size={17} aria-hidden="true" />{b.five}</div>
              </div>
            </header>

            <section className={styles.roadmap} id="basic-yggdrasil-roadmap" aria-labelledby="basic-roadmap-title">
              <div className={styles.roadmapHead}>
                <div>
                  <p className={styles.sectionKicker}>{b.pathKicker}</p>
                  <h2 id="basic-roadmap-title">{b.pathTitle}</h2>
                  <p>{b.pathLead}</p>
                </div>
                <Link className={styles.bookLink} href={baseUrl + "/basic-course/description"}><BookOpen size={17} aria-hidden="true" />{copy.description}<ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
              <nav className={styles.roadmapGrid} aria-label={b.pathTitle}>
                {level.steps.map((step) => (
                  <a key={step.id} href={"#" + step.id.toLowerCase()} className={styles.roadmapCard}>
                    <span className={styles.roadmapNumber}>{String(step.number).padStart(2,"0")}</span>
                    <strong>{step.title[locale]}</strong>
                    <p className={styles.roadmapSynopsis}>{basicLevelIntroductions[locale][step.number]}</p>
                    <small>{step.settings.length} {copy.attunements}</small>
                    <ArrowRight size={17} aria-hidden="true" />
                  </a>
                ))}
              </nav>
            </section>
            <aside className={styles.educationNotice}>{copy.notice}</aside>
          </>
        ) : (
          <>
            <header className="yggdrasil-module-hero">
              <div className="yggdrasil-module-hero-copy">
                <p className="homeopathy-kicker">{module.eyebrow[locale]}</p>
                <h1>{module.title[locale]}</h1>
                <p>{module.lead[locale]}</p>
                <div className="yggdrasil-module-stats" aria-label="Module coverage">
                  <span>{level.steps.length} {copy.steps}</span>
                  <span>{settings} {copy.attunements}</span>
                  <span>{videos} {copy.videos}</span>
                </div>
              </div>
              <div className="yggdrasil-module-hero-image">
                <Image unoptimized src={module.image} alt="" fill sizes="(max-width: 800px) 100vw, 42vw" priority />
              </div>
            </header>
            <aside className="academy-archive-notice">{copy.notice}</aside>
          </>
        )}

        <YggdrasilCurriculum locale={locale} levelId={module.levelId} showSupport={module.levelId === 1} visualTheme={isBasic ? "navy" : undefined} />

        {module.levelId === 1 ? <YggdrasilEnglishVideoGuide locale={locale} scope="basic" /> : null}
        {module.levelId === 2 ? <YggdrasilEnglishVideoGuide locale={locale} scope="instructor" /> : null}

        {isBasic ? (
          <section className={styles.endCta} aria-labelledby="basic-yggdrasil-join-title">
            <div>
              <p className={styles.sectionKicker}>{b.readyKicker}</p>
              <h2 id="basic-yggdrasil-join-title">{b.readyTitle}</h2>
              <p>{b.readyLead}</p>
              <small>{b.note}</small>
            </div>
            <div className={styles.endActions}>
              <Link className={styles.endPrimary} href={baseUrl + "/free-initiation"}>{b.free}<ArrowRight size={18} aria-hidden="true" /></Link>
              <Link className={styles.endSecondary} href={baseUrl + "/free-initiation#apply-personal"}>{b.personal}<ArrowRight size={17} aria-hidden="true" /></Link>
              <Link className={styles.endBook} href={baseUrl + "/basic-course/description"}><BookOpen size={17} aria-hidden="true" />{copy.description}</Link>
            </div>
          </section>
        ) : null}
        <nav className="yggdrasil-module-pagination" aria-label="Reiki Yggdrasil modules">
          {previous ? <Link href={`/${locale}/academy/reiki/yggdrasil/${previous.slug}`}><small>{copy.previous}</small><strong>{previous.title[locale]}</strong></Link> : <span />}
          {next ? <Link href={`/${locale}/academy/reiki/yggdrasil/${next.slug}`}><small>{copy.next}</small><strong>{next.title[locale]}</strong></Link> : <span />}
        </nav>
        </article>
      </div>
      {isBasic ? null : <PublicConsultationCta locale={locale} />}
    </main>
  );
}
