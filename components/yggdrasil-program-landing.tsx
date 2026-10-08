import Image from "next/image";
import Link from "next/link";

import { YggdrasilEnglishVideoGuide } from "@/components/yggdrasil-english-video-guide";
import { YggdrasilTestimonials } from "@/components/yggdrasil-testimonials";

import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import { yggdrasilModuleLandings } from "@/data/academy/yggdrasil-module-map";
import {
  yggdrasilProgramSourcePage,
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

const basicStepDescriptions: Record<number, Record<PublicLocale, string>> = {
  1: {
    en: "Health, intuition, protection and working with a chosen situation: the entry point into the Reiki Yggdrasil flow.",
    ru: "Здоровье, интуиция, защита и работа с выбранной ситуацией — вход в поток Рейки Иггдрасиль.",
    es: "Salud, intuición, protección y trabajo con una situación elegida: entrada al flujo Reiki Yggdrasil.",
  },
  2: {
    en: "Cleansing, charging objects and money-flow activation: releasing what feels excessive and directing attention toward resource.",
    ru: "Очищение, зарядка объектов и денежная активация: освобождение от лишнего и направление внимания на ресурс.",
    es: "Limpieza, carga de objetos y activación del flujo del dinero: liberar lo innecesario y orientar la atención al recurso.",
  },
  3: {
    en: "Predestination, power, emotion, sexuality, intellect, karma and flight: direction and personal strength.",
    ru: "Предопределение, сила, эмоция, сексуальность, интеллект, карма и полёт: направление и личная сила.",
    es: "Predestinación, poder, emoción, sexualidad, intelecto, karma y vuelo: dirección y fuerza personal.",
  },
  4: {
    en: "Extrasensory vision, past-life imagery, situation creation and knowledge: the perception-focused level.",
    ru: "Сверхчувственное видение, прошлые жизни, создание ситуации и знание — ступень восприятия.",
    es: "Visión extrasensorial, vidas pasadas, creación de situaciones y conocimiento: nivel de percepción.",
  },
  5: {
    en: "Connection with the World and the Gods: the Master Level integrating the Basic Course.",
    ru: "Связь с Миром и Богами — мастерская ступень, объединяющая Базовый курс.",
    es: "Conexión con el Mundo y los Dioses: nivel de maestro que integra el Curso Básico.",
  },
};

const copy = {
  en: {
    eyebrow: "Academy · Current program",
    title: "DAO Reiki Yggdrasil",
    lead: "A step-by-step programme of energy practices, symbolic attunements and work with attention and intention. Start with the five-level Basic Course, then explore teaching and specialised traditions.",
    start: "Open Basic Course",
    description: "Read Basic Course description",
    instructor: "Open Instructor Course",
    archive: "Full historical program text",
    explore: "Explore 7 modules",
    benefits: "What you will explore",
    mapEyebrow: "Current course map",
    mapTitle: "7 Reiki Yggdrasil modules",
    mapLead: "Each module has its own landing page with all canonical steps, attunements and verified public video lectures. The older PsiTrends 10-module program wording remains preserved in the historical source archive.",
    module: "Module",
    open: "Open module",
    basicEyebrow: "Basic Course preview",
    basicTitle: "Basic Course · 5 levels",
    basicLead: "The first five levels are shown here as a quick orientation. The dedicated Basic Course landing contains the full descriptions, attunements, videos and practice material.",
    basicLevel: "Level",
    basicSettings: "attunements",
    photosEyebrow: "Source preservation",
    photosTitle: "Historical program imagery",
    photosLead: "All content images from the public PsiTrends Reiki Yggdrasil source page are preserved here: 19 on the English source page. Analytics pixels and interface icons are intentionally excluded.",
    source: "Open original PsiTrends source",
    sourceNote: "Current detailed curriculum: canonical Reiki Yggdrasil project. Historical program text and imagery: PsiTrends.",
  },
  ru: {
    eyebrow: "Академия · Актуальная программа",
    title: "Дао Рейки Иггдрасиль",
    lead: "Пошаговая система энергетических практик, символических настроек и работы с вниманием и намерением. Начните с пяти ступеней Базового курса, затем переходите к инструкторскому обучению и отдельным традициям.",
    start: "Открыть Базовый курс",
    description: "Читать описание Базового курса",
    instructor: "Открыть Инструкторский курс",
    archive: "Полный исторический текст программы",
    explore: "Посмотреть 7 модулей",
    benefits: "Что вы будете осваивать",
    mapEyebrow: "Актуальная карта обучения",
    mapTitle: "7 модулей Рейки Иггдрасиль",
    mapLead: "Каждый модуль получил отдельную страницу со всеми каноническими ступенями, настройками и проверенными публичными видеолекциями. Старая 10-модульная формулировка PsiTrends сохранена в полном историческом архиве.",
    module: "Модуль",
    open: "Открыть модуль",
    basicEyebrow: "Кратко о Базовом курсе",
    basicTitle: "Базовый курс · 5 уровней",
    basicLead: "Здесь пять уровней показаны кратко. На отдельном лендинге Базового курса находятся полные описания, настройки, видео и практические материалы.",
    basicLevel: "Уровень",
    basicSettings: "настроек",
    photosEyebrow: "Сохранение источника",
    photosTitle: "Исторические изображения программы",
    photosLead: "Здесь сохранены все содержательные изображения публичной страницы Reiki Yggdrasil на PsiTrends: 14 фотографий и иллюстраций русской версии. Служебные иконки и аналитические пиксели намеренно не считаются материалами курса.",
    source: "Открыть исходную страницу PsiTrends",
    sourceNote: "Актуальная детальная программа: канонический проект Reiki Yggdrasil. Исторический текст и изображения: PsiTrends.",
  },
  es: {
    eyebrow: "Academia · Programa actual",
    title: "DAO Reiki Yggdrasil",
    lead: "Un recorrido paso a paso por prácticas energéticas, sintonizaciones simbólicas y el trabajo con la atención y la intención. Empieza con el Curso Básico de cinco niveles y continúa con las tradiciones especializadas.",
    start: "Abrir Curso Básico",
    description: "Leer descripción del Curso Básico",
    instructor: "Abrir Curso de Instructor",
    archive: "Texto histórico completo",
    explore: "Ver los 7 módulos",
    benefits: "Qué vas a explorar",
    mapEyebrow: "Mapa formativo actual",
    mapTitle: "7 módulos Reiki Yggdrasil",
    mapLead: "Cada módulo tiene su propia página con etapas, sintonizaciones y videoclases verificadas.",
    module: "Módulo",
    open: "Abrir módulo",
    basicEyebrow: "Vista rápida del Curso Básico",
    basicTitle: "Curso Básico · 5 niveles",
    basicLead: "La página específica del Curso Básico contiene las descripciones completas, sintonizaciones, videos y materiales.",
    basicLevel: "Nivel",
    basicSettings: "sintonizaciones",
    photosEyebrow: "Preservación de la fuente",
    photosTitle: "Imágenes históricas",
    photosLead: "Se conservan todas las imágenes de contenido de la fuente pública; los iconos de interfaz y píxeles analíticos no se cuentan como material del curso.",
    source: "Abrir fuente original de PsiTrends",
    sourceNote: "Currículo actual: proyecto canónico Reiki Yggdrasil. Fuente histórica: PsiTrends.",
  },
} satisfies Record<PublicLocale, Record<string, string>>;

const heroHighlights: Record<PublicLocale, string[]> = {
  en: [
    "Develop a regular practice of attention and grounding",
    "Explore intuition through guided exercises",
    "Progress from foundational skills into specialised studies",
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
          <p className="yggdrasil-program-intro">{text.lead}</p>
          <p className="yggdrasil-program-benefits-title">{text.benefits}</p>
          <ul className="yggdrasil-program-highlights">
            {heroHighlights[locale].map((highlight) => <li key={highlight}>{highlight}</li>)}
          </ul>
          <div className="yggdrasil-program-actions">
            <Link className="yggdrasil-primary-action" href={`/${locale}/academy/reiki/yggdrasil/basic-course`}>{text.start} <span aria-hidden="true">→</span></Link>
            <a className="yggdrasil-secondary-action" href="#system-modules">{text.explore}</a>
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
          <Link className="yggdrasil-source-link" href={"/" + locale + "/academy/reiki/yggdrasil/basic-course/description"}>{text.description}<span aria-hidden="true">→</span></Link>
          <Link className="yggdrasil-source-link" href={`/${locale}/academy/reiki/yggdrasil/basic-course`}>{text.start}<span aria-hidden="true">→</span></Link>
        </div>
        <div className="yggdrasil-basic-levels">
          {basicSteps.map((step) => (
            <article className="yggdrasil-basic-level-card" key={step.id}>
              <div className="yggdrasil-basic-level-number">{String(step.number).padStart(2, "0")}</div>
              <div>
                <small>{text.basicLevel} {step.number} · {step.settings.length} {text.basicSettings}</small>
                <h3>{step.title[locale]}</h3>
                <p>{basicStepDescriptions[step.number][locale]}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <YggdrasilTestimonials locale={locale} />

      <YggdrasilEnglishVideoGuide locale={locale} scope="all" />

      <section className="yggdrasil-source-footer-panel" aria-label={locale === "ru" ? "Источники программы" : locale === "es" ? "Fuentes del programa" : "Program sources"}>
        <p className="yggdrasil-program-source-note">{text.sourceNote}</p>
        <div>
          <Link className="yggdrasil-source-link" href={`/${locale}/academy/reiki/yggdrasil/archive`}>{text.archive}<span aria-hidden="true">→</span></Link>
          <Link className="yggdrasil-source-link" href={yggdrasilProgramSourcePage} target="_blank" rel="noreferrer">{text.source}<span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </div>
  );
}
