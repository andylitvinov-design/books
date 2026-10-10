import Image from "next/image";
import Link from "next/link";

import { YggdrasilEnglishVideoGuide } from "@/components/yggdrasil-english-video-guide";
import { YggdrasilTestimonials } from "@/components/yggdrasil-testimonials";
import { YggdrasilMeditationFeature } from "@/components/yggdrasil-meditation-feature";
import { YggdrasilLeadForms } from "@/components/reiki-landing-forms";

import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import englishAttunements from "@/data/academy/yggdrasil-en-settings-l1.json";
import { yggdrasilModuleLandings } from "@/data/academy/yggdrasil-module-map";
import {
  yggdrasilSourceImages,
} from "@/data/academy/yggdrasil-program-map";
import type { PublicLocale } from "@/lib/public-locales";

type BasicStep = {
  id: string;
  number: number;
  title: Record<PublicLocale, string>;
  sourceText: { intro: string; meaning: string; result: string };
  settings: Array<{ id: string; title: string }>;
};

// The five authentic PsiTrends level photos already used by the detailed Basic Course.
// Keep the overview consistent with the full curriculum, rather than generic illustrations.
const basicLevelPhotos: Record<number, string> = {
  1: "https://psitrends.com/images/Screenshot_25.png",
  2: "https://psitrends.com/images/photo_2023-07-10_08-26-39.jpg",
  3: "https://psitrends.com/images/Screenshot_31.png",
  4: "https://psitrends.com/images/tulumhypnotherapy.jpg",
  5: "https://psitrends.com/images/world_magic_traditions_overview.jpg",
};

const basicStepDescriptions: Record<number, Record<PublicLocale, string>> = {
  1: {
    en: "Start with body awareness, intuition and symbolic protection. Learn four foundational attunements and how to approach a personal situation.",
    ru: "Начните с внимания к телу, интуиции и символической защиты. Освойте четыре базовые настройки и работу с личной ситуацией.",
    es: "Empieza con la atención al cuerpo, la intuición y la protección simbólica. Aprende cuatro sintonizaciones básicas y a explorar una situación personal.",
  },
  2: {
    en: "Practise symbolic cleansing, charging objects and releasing unwanted connections. Explore your relationship with resources and money.",
    ru: "Освойте символическое очищение, зарядку предметов и освобождение от нежелательных связей. Исследуйте своё отношение к ресурсам и деньгам.",
    es: "Practica limpieza simbólica, carga de objetos y liberación de vínculos no deseados. Explora tu relación con los recursos y el dinero.",
  },
  3: {
    en: "Explore personal direction and inner strength through practices centred on emotions, will, intellect, energy and life patterns.",
    ru: "Исследуйте жизненное направление и внутреннюю силу через практики с эмоциями, волей, интеллектом, энергией и жизненными сценариями.",
    es: "Explora tu rumbo personal y tu fuerza interior mediante prácticas de emociones, voluntad, intelecto, energía y patrones de vida.",
  },
  4: {
    en: "Develop imagination and intuitive perception through guided imagery, symbolic memories, knowledge and visualising possible situations.",
    ru: "Развивайте воображение и интуитивное восприятие через образы, символическую память, познание и представление возможных ситуаций.",
    es: "Desarrolla la imaginación y la percepción intuitiva con imágenes guiadas, recuerdos simbólicos, conocimiento y visualización de situaciones.",
  },
  5: {
    en: "Bring the Basic Course together in two Master Level attunements: Connection with the World and Connection with the Gods.",
    ru: "Объедините навыки Базового курса в двух мастерских настройках: «Связь с Миром» и «Связь с Богами».",
    es: "Integra el Curso Básico con dos sintonizaciones de maestría: Conexión con el Mundo y Conexión con los Dioses.",
  },
};

const copy = {
  en: {
    eyebrow: "Ancient symbols · Personal practice",
    tagline: "Rediscover your centre. Discover a wider world within.",
    free: "Get Level 1 for free",
    title: "DAO Reiki Yggdrasil",
    lead: "The World Tree is an invitation to explore yourself in a new way. Through guided imagery, mindful attention and the language of runes, find space for intuition, clarity and a more conscious connection with everyday life. Begin with the five-level Basic Course and follow the path that speaks to you.",
    start: "Open Basic Course",
    description: "Read the Basic Course book",
    explore: "Explore 7 modules",
    benefits: "What you will explore",
    mapEyebrow: "Current course map",
    mapTitle: "7 Reiki Yggdrasil modules",
    mapLead: "One learning path, seven modules. Begin with the foundations and continue through the World Tree traditions. Each step combines attunements, practical exercises and available video lessons, all here in Holistic House.",
    module: "Module",
    open: "Open module",
    basicEyebrow: "Your first five levels",
    basicTitle: "Basic Course · 5 levels",
    basicLead: "See what you will explore at each level. Each stage has its own practices and attunements; open the complete course for lessons and videos.",
    basicLevel: "Level",
    basicSettings: "attunements",
    basicStepOpen: "Explore level",
  },
  ru: {
    eyebrow: "Древние символы · Живая практика",
    tagline: "Найдите внутреннюю опору. Откройте глубину своего мира.",
    free: "Получить 1-ю ступень бесплатно",
    title: "Дао Рейки Иггдрасиль",
    lead: "Мировое Древо становится картой внутреннего путешествия. Через образы, руны, медитации и работу с вниманием вы можете глубже почувствовать себя, исследовать интуицию и яснее видеть свой путь. Начните с пяти ступеней Базового курса и двигайтесь в своём ритме.",
    start: "Открыть Базовый курс",
    description: "Читать книгу Базового курса",
    explore: "Посмотреть 7 модулей",
    benefits: "Что вы будете осваивать",
    mapEyebrow: "Актуальная карта обучения",
    mapTitle: "7 модулей Рейки Иггдрасиль",
    mapLead: "Одна программа из семи модулей: каждая ступень включает описание настроек, практические упражнения и доступные видеолекции. Все учебные материалы открываются внутри Holistic House.",
    module: "Модуль",
    open: "Открыть модуль",
    basicEyebrow: "Первые пять ступеней",
    basicTitle: "Базовый курс · 5 уровней",
    basicLead: "Коротко и понятно о каждой ступени. Полные описания, настройки, уроки и видео находятся на странице Базового курса.",
    basicLevel: "Уровень",
    basicSettings: "настроек",
    basicStepOpen: "Подробнее о ступени",
  },
  es: {
    eyebrow: "Símbolos antiguos · Práctica personal",
    tagline: "Encuentra tu centro. Explora tu mundo interior.",
    free: "Recibe el primer nivel gratis",
    title: "DAO Reiki Yggdrasil",
    lead: "El Árbol del Mundo es una invitación a explorar tu mundo interior. Mediante imágenes guiadas, runas y prácticas de atención, descubre nuevas formas de escuchar tu intuición y reflexionar sobre tu vida. Comienza por los cinco niveles básicos y avanza a tu propio ritmo.",
    start: "Abrir Curso Básico",
    description: "Leer el libro del Curso Básico",
    explore: "Ver los 7 módulos",
    benefits: "Qué vas a explorar",
    mapEyebrow: "Mapa formativo actual",
    mapTitle: "7 módulos Reiki Yggdrasil",
    mapLead: "Un programa de siete módulos. Cada etapa reúne sintonizaciones, ejercicios y videoclases disponibles, todo dentro de Holistic House.",
    module: "Módulo",
    open: "Abrir módulo",
    basicEyebrow: "Tus cinco primeros niveles",
    basicTitle: "Curso Básico · 5 niveles",
    basicLead: "Descubre qué se aprende en cada nivel. Abre el Curso Básico para ver prácticas, sintonizaciones, lecciones y videos.",
    basicLevel: "Nivel",
    basicSettings: "sintonizaciones",
    basicStepOpen: "Explorar nivel",
  },
} satisfies Record<PublicLocale, Record<string, string>>;

const basicSpanishAttunements: Record<number, string[]> = {
  1: ["Sanación", "Intuición", "Protección", "Trabajo con una situación"],
  2: ["Cargar un objeto", "Activar el flujo del dinero", "Limpieza personal", "Limpieza de espacios y objetos", "Romper vínculos"],
  3: ["Destino", "Emoción", "Activación", "Poder", "Sexualidad", "Vuelo", "Intelecto", "Karma"],
  4: ["Clarividencia", "Vidas pasadas", "Crear una situación", "Conocimiento"],
  5: ["Conexión con el Mundo", "Conexión con los Dioses"],
};

function basicAttunementName(locale: PublicLocale, step: BasicStep, setting: { id: string; title: string }, index: number) {
  if (locale === "ru") return setting.title;
  if (locale === "es") return basicSpanishAttunements[step.number]?.[index] ?? setting.title;
  const translated = englishAttunements as Record<string, { title: string }>;
  return translated[setting.id]?.title ?? setting.title;
}

const heroHighlights: Record<PublicLocale, string[]> = {
  en: [
    "Find a calmer, more focused way to meet everyday challenges",
    "Discover symbolic tools for intuition and self-reflection",
    "Begin gently, then explore seven connected areas of practice",
  ],
  ru: [
    "Осваивать концентрацию и заземление",
    "Исследовать интуицию через практические упражнения",
    "Постепенно переходить от основы к продвинутым направлениям",
  ],
  es: [
    "Practicar la atención y el arraigo",
    "Explorar la intuición mediante ejercicios guiados",
    "Avanzar desde la base hacia estudios especializados",
  ],
};

function SourceVisual({ url, label, className = "" }: { url: string; label: string; className?: string }) {
  return (
    <div
      aria-label={label}
      className={"yggdrasil-source-visual " + className}
      role="img"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(35,25,20,.03), rgba(35,25,20,.16)), url("${url}")` }}
    />
  );
}

export function YggdrasilProgramLanding({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const basic = curriculum.levels[0];
  const basicSteps = basic.steps as BasicStep[];
  const hero = yggdrasilSourceImages[0];

  return (
    <div className="yggdrasil-program-landing">
      <section className="yggdrasil-program-hero">
        <SourceVisual url={hero.localUrl ?? hero.sourceUrl} label={hero.label[locale]} className="yggdrasil-program-hero-image" />
        <div className="yggdrasil-program-hero-copy">
          <p className="homeopathy-kicker">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p className="yggdrasil-hero-tagline">{text.tagline}</p>
          <p className="yggdrasil-program-intro">{text.lead}</p>
          <p className="yggdrasil-program-benefits-title">{text.benefits}</p>
          <ul className="yggdrasil-program-highlights">
            {heroHighlights[locale].map((highlight) => <li key={highlight}>{highlight}</li>)}
          </ul>
          <div className="yggdrasil-program-actions">
            <Link className="yggdrasil-primary-action" href={`/${locale}/academy/reiki/yggdrasil/free-initiation`}>{text.free} <span aria-hidden="true">→</span></Link>
            <Link className="yggdrasil-secondary-action" href={`/${locale}/academy/reiki/yggdrasil/basic-course`}>{text.start}</Link>
            <a className="yggdrasil-hero-explore" href="#system-modules">{text.explore} ↓</a>
          </div>
          <Link className="yggdrasil-program-detail-link" href={"/" + locale + "/academy/reiki/yggdrasil/basic-course/description"}>{text.description} <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="yggdrasil-program-section" id="system-modules">
        <p className="homeopathy-kicker">{text.mapEyebrow}</p>
        <h2>{text.mapTitle}</h2>
        <p className="yggdrasil-program-section-lead">{text.mapLead}</p>
        <div className="yggdrasil-module-grid">
          {yggdrasilModuleLandings.map((module) => (
            <article className="yggdrasil-module-card" key={module.slug}>
              <Link className={"yggdrasil-module-art yggdrasil-module-art--" + module.slug} href={`/${locale}/academy/reiki/yggdrasil/${module.slug}`} aria-label={`${text.open}: ${module.title[locale]}`}>
                <Image src={module.image} alt={module.title[locale]} fill sizes="(max-width: 680px) 130px, (max-width: 1100px) 240px, 240px" className="yggdrasil-module-art-image" />
              </Link>
              <div className="yggdrasil-module-card-copy">
                <small>{text.module} {module.levelId}</small>
                <h3>{module.title[locale]}</h3>
                <p>{module.lead[locale]}</p>
                <Link href={`/${locale}/academy/reiki/yggdrasil/${module.slug}`}>{text.open}<span aria-hidden="true"> →</span></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="yggdrasil-basic-course" id="basic-course">
        <div className="yggdrasil-basic-course-heading">
          <p className="homeopathy-kicker">{text.basicEyebrow}</p>
          <h2>{text.basicTitle}</h2>
          <p>{text.basicLead}</p>
          <div className="yggdrasil-basic-course-actions">
            <Link className="yggdrasil-source-link yggdrasil-basic-course-start" href={`/${locale}/academy/reiki/yggdrasil/basic-course`}>{text.start}<span aria-hidden="true">→</span></Link>
            <Link className="yggdrasil-source-link" href={"/" + locale + "/academy/reiki/yggdrasil/basic-course/description"}>{text.description}<span aria-hidden="true">↗</span></Link>
            <Link className="yggdrasil-source-link" href={`/${locale}/academy/reiki/yggdrasil/free-initiation`}>{text.free}<span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="yggdrasil-basic-levels">
          {basicSteps.map((step) => (
            <article className="yggdrasil-basic-level-card" key={step.id}>
              <Link
                className="yggdrasil-basic-level-photo-link"
                href={`/${locale}/academy/reiki/yggdrasil/basic-course#${step.id.toLowerCase()}`}
                aria-label={`${text.basicLevel} ${step.number}: ${step.title[locale]}`}
              >
                <SourceVisual
                  url={basicLevelPhotos[step.number]}
                  label={step.title[locale]}
                  className="yggdrasil-basic-level-photo"
                />
                <span className="yggdrasil-basic-level-photo-number" aria-hidden="true">{String(step.number).padStart(2, "0")}</span>
              </Link>
              <div className="yggdrasil-basic-level-copy">
                <small>{text.basicLevel} {step.number} · {step.settings.length} {text.basicSettings}</small>
                <h3>{step.title[locale]}</h3>
                <p>{basicStepDescriptions[step.number][locale]}</p>
                <div className="yggdrasil-basic-level-attunements" aria-label={text.basicSettings}>
                  <strong>{locale === "ru" ? "Настройки ступени" : locale === "es" ? "Sintonizaciones del nivel" : "Attunements included"}</strong>
                  <ul>{step.settings.map((setting, index) => <li key={setting.id}>{basicAttunementName(locale, step, setting, index)}</li>)}</ul>
                </div>
                <Link className="yggdrasil-basic-level-open" href={`/${locale}/academy/reiki/yggdrasil/basic-course#${step.id.toLowerCase()}`}>
                  {text.basicStepOpen} {step.number} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <YggdrasilMeditationFeature locale={locale} />

      <YggdrasilLeadForms locale={locale} />

      <YggdrasilTestimonials locale={locale} />

      <YggdrasilEnglishVideoGuide locale={locale} scope="all" />


    </div>
  );
}
