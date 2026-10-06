import Link from "next/link";

import { YggdrasilCurriculum } from "@/components/yggdrasil-curriculum";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import {
  yggdrasilProgramModules,
  yggdrasilProgramSourcePage,
  yggdrasilSourceImages,
} from "@/data/academy/yggdrasil-program-map";
import type { PublicLocale } from "@/lib/public-locales";

type BasicStep = {
  id: string;
  number: number;
  title: Record<PublicLocale, string>;
  sourceText: {
    intro: string;
    meaning: string;
    result: string;
  };
  settings: Array<{ id: string; title: string }>;
};

const basicStepDescriptions: Record<number, Record<PublicLocale, string>> = {
  1: {
    en: "An introduction to the Reiki Yggdrasil flow through body awareness, intuition, protection and work with a chosen situation.",
    ru: "Вход в поток Рейки Иггдрасиль через внимание к телу, интуицию, защиту и работу с выбранной ситуацией.",
    es: "Introducción al flujo de Reiki Yggdrasil mediante conciencia corporal, intuición, protección y trabajo con una situación elegida.",
  },
  2: {
    en: "Cleansing and resource work: releasing what feels excessive, then directing attention toward stability, opportunities and money-related goals.",
    ru: "Очищение и ресурсная работа: освобождение от лишнего и затем направление внимания на устойчивость, возможности и денежные цели.",
    es: "Limpieza y trabajo con recursos: soltar lo innecesario y orientar la atención hacia estabilidad, oportunidades y objetivos económicos.",
  },
  3: {
    en: "Predestination and personal power: clarifying direction, intention and the ability to act with more inner coherence.",
    ru: "Предопределение и личная сила: прояснение направления, намерения и способности действовать более собранно.",
    es: "Predestinación y poder personal: clarificar dirección, intención y capacidad de actuar con mayor coherencia interna.",
  },
  4: {
    en: "A perception-focused level devoted to observation, imagery and the traditional extrasensory-vision language of the system.",
    ru: "Ступень восприятия: наблюдение, образы и традиционный для системы язык сверхчувственного видения.",
    es: "Nivel centrado en percepción, observación, imágenes y el lenguaje tradicional de visión extrasensorial del sistema.",
  },
  5: {
    en: "The master level of the Basic Course, integrating the previous four levels into a more independent practice.",
    ru: "Мастерская ступень Базового курса, объединяющая предыдущие четыре уровня в более самостоятельную практику.",
    es: "Nivel de maestría del Curso Básico que integra los cuatro niveles anteriores en una práctica más autónoma.",
  },
};

const copy: Record<PublicLocale, {
  eyebrow: string;
  title: string;
  lead: string;
  start: string;
  basicDescription: string;
  mapEyebrow: string;
  mapTitle: string;
  mapLead: string;
  module: string;
  basicEyebrow: string;
  basicTitle: string;
  basicLead: string;
  basicLevel: string;
  basicSettings: string;
  fullEyebrow: string;
  fullTitle: string;
  fullLead: string;
  photosEyebrow: string;
  photosTitle: string;
  photosLead: string;
  source: string;
  sourceNote: string;
}> = {
  en: {
    eyebrow: "Academy · Current program",
    title: "DAO Reiki Yggdrasil",
    lead: "A clear entrance to the complete system: first see the full program map, then open the five-level Basic Course, and continue into the detailed canonical curriculum.",
    start: "Take the Basic Reiki Yggdrasil Course",
    basicDescription: "Basic Course description",
    mapEyebrow: "System map",
    mapTitle: "All modules of Reiki Yggdrasil",
    mapLead: "This overview preserves the module logic of the original PsiTrends school page while the detailed curriculum below follows the current canonical Reiki Yggdrasil project.",
    module: "Module",
    basicEyebrow: "Start here",
    basicTitle: "Basic Reiki Yggdrasil Course · 5 levels",
    basicLead: "The first module is shown separately so the beginning of the learning path is immediately understandable.",
    basicLevel: "Level",
    basicSettings: "attunements",
    fullEyebrow: "Complete curriculum",
    fullTitle: "Detailed learning path",
    fullLead: "After the overview, explore the complete current course structure with all levels, steps, attunements and verified public video lectures.",
    photosEyebrow: "Source preservation",
    photosTitle: "Historical module imagery",
    photosLead: "The original images used on the PsiTrends Reiki Yggdrasil program page are retained here with their source provenance so the visual history of the program is not lost.",
    source: "Open original source",
    sourceNote: "Source structure and imagery: PsiTrends. Detailed curriculum: canonical Reiki Yggdrasil project.",
  },
  ru: {
    eyebrow: "Академия · Актуальная программа",
    title: "Дао Рейки Иггдрасиль",
    lead: "Понятный вход в полную систему: сначала вся карта программы, затем отдельно пять ступеней Базового курса, после этого — детальная актуальная структура обучения.",
    start: "Пройти Базовый курс Рейки Иггдрасиль",
    basicDescription: "Описание базового курса Рейки Иггдрасиль",
    mapEyebrow: "Карта системы",
    mapTitle: "Все модули Рейки Иггдрасиль",
    mapLead: "Обзор сохраняет логику модулей исходной страницы школы PsiTrends, а подробная программа ниже следует актуальному каноническому проекту Reiki Yggdrasil.",
    module: "Модуль",
    basicEyebrow: "Начать отсюда",
    basicTitle: "Базовый курс Рейки Иггдрасиль · 5 ступеней",
    basicLead: "Первый модуль вынесен отдельно, чтобы начало обучения и структура первых пяти ступеней были видны сразу.",
    basicLevel: "Ступень",
    basicSettings: "настроек",
    fullEyebrow: "Полная программа",
    fullTitle: "Детальная структура обучения",
    fullLead: "После общей карты можно раскрыть актуальную полную структуру курса со всеми уровнями, ступенями, настройками и проверенными публичными видеолекциями.",
    photosEyebrow: "Сохранение источника",
    photosTitle: "Исторические изображения модулей",
    photosLead: "Здесь сохранены изображения, использованные на исходной странице программы Reiki Yggdrasil на PsiTrends, вместе со ссылками на источник — чтобы визуальная история программы не потерялась.",
    source: "Открыть исходную страницу",
    sourceNote: "Структура и изображения источника: PsiTrends. Детальная программа: канонический проект Reiki Yggdrasil.",
  },
  es: {
    eyebrow: "Academia · Programa actual",
    title: "DAO Reiki Yggdrasil",
    lead: "Una entrada clara al sistema completo: primero el mapa del programa, luego los cinco niveles del Curso Básico y después el currículo canónico detallado.",
    start: "Realizar el Curso Básico de Reiki Yggdrasil",
    basicDescription: "Descripción del Curso Básico",
    mapEyebrow: "Mapa del sistema",
    mapTitle: "Todos los módulos de Reiki Yggdrasil",
    mapLead: "El resumen conserva la lógica modular de la página original de PsiTrends, mientras que el currículo detallado sigue el proyecto canónico actual de Reiki Yggdrasil.",
    module: "Módulo",
    basicEyebrow: "Empieza aquí",
    basicTitle: "Curso Básico de Reiki Yggdrasil · 5 niveles",
    basicLead: "El primer módulo se muestra por separado para que el inicio del recorrido y sus cinco niveles sean claros desde el principio.",
    basicLevel: "Nivel",
    basicSettings: "sintonizaciones",
    fullEyebrow: "Currículo completo",
    fullTitle: "Ruta formativa detallada",
    fullLead: "Después del mapa general puedes explorar la estructura actual completa con todos los niveles, etapas, sintonizaciones y videoclases públicas verificadas.",
    photosEyebrow: "Preservación de la fuente",
    photosTitle: "Imágenes históricas de los módulos",
    photosLead: "Se conservan las imágenes originales utilizadas en la página de Reiki Yggdrasil de PsiTrends junto con su procedencia.",
    source: "Abrir fuente original",
    sourceNote: "Estructura e imágenes: PsiTrends. Currículo detallado: proyecto canónico Reiki Yggdrasil.",
  },
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
        <SourceVisual url={hero.localUrl} label={hero.label[locale]} className="yggdrasil-program-hero-image" />
        <div className="yggdrasil-program-hero-copy">
          <p className="homeopathy-kicker">{text.eyebrow}</p>
          <h2>{text.title}</h2>
          <p>{text.lead}</p>
          <div className="yggdrasil-program-actions">
            <a className="yggdrasil-primary-action" href="#yggdrasil-basic-course-learning">{text.start}</a>
            <a className="yggdrasil-secondary-action" href="#basic-course-description">{text.basicDescription}</a>
          </div>
        </div>
      </section>

      <section className="yggdrasil-program-section" id="system-modules">
        <p className="homeopathy-kicker">{text.mapEyebrow}</p>
        <h2>{text.mapTitle}</h2>
        <p className="yggdrasil-program-section-lead">{text.mapLead}</p>
        <div className="yggdrasil-module-grid">
          {yggdrasilProgramModules.map((module) => (
            <article className="yggdrasil-module-card" key={module.id}>
              {module.imageUrl ? <SourceVisual url={module.imageUrl} label={module.title[locale]} /> : <div className="yggdrasil-module-placeholder" aria-hidden="true">{String(module.number).padStart(2, "0")}</div>}
              <div className="yggdrasil-module-card-copy">
                <small>{text.module} {module.number}</small>
                <h3>{module.title[locale]}</h3>
                <p>{module.description[locale]}</p>
                {module.id === "basic" ? <a href="#basic-course-description">{text.basicDescription}<span aria-hidden="true"> →</span></a> : null}
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
        </div>
        <div className="yggdrasil-basic-levels" id="basic-course-description">
          {basicSteps.map((step) => (
            <article className="yggdrasil-basic-level-card" id={step.number === 1 ? "yggdrasil-basic-course-learning" : undefined} key={step.id}>
              <div className="yggdrasil-basic-level-number">{String(step.number).padStart(2, "0")}</div>
              <div>
                <small>{text.basicLevel} {step.number} · {step.settings.length} {text.basicSettings}</small>
                <h3>{step.title[locale]}</h3>
                <p>{basicStepDescriptions[step.number]?.[locale] ?? step.sourceText.intro}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="yggdrasil-program-section yggdrasil-full-curriculum" id="full-curriculum">
        <p className="homeopathy-kicker">{text.fullEyebrow}</p>
        <h2>{text.fullTitle}</h2>
        <p className="yggdrasil-program-section-lead">{text.fullLead}</p>
        <YggdrasilCurriculum locale={locale} />
      </section>

      <section className="yggdrasil-source-gallery" aria-labelledby="yggdrasil-source-gallery-title">
        <p className="homeopathy-kicker">{text.photosEyebrow}</p>
        <h2 id="yggdrasil-source-gallery-title">{text.photosTitle}</h2>
        <p>{text.photosLead}</p>
        <div className="yggdrasil-source-gallery-grid">
          {yggdrasilSourceImages.map((item) => (
            <figure key={item.id}>
              <SourceVisual url={item.localUrl} label={item.label[locale]} />
              <figcaption>{item.label[locale]}</figcaption>
            </figure>
          ))}
        </div>
        <p className="yggdrasil-program-source-note">{text.sourceNote}</p>
        <Link className="yggdrasil-source-link" href={yggdrasilProgramSourcePage} target="_blank" rel="noreferrer">{text.source}<span aria-hidden="true">↗</span></Link>
      </section>
    </div>
  );
}
