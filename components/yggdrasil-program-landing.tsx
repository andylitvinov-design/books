import Link from "next/link";

import { YggdrasilEnglishVideoGuide } from "@/components/yggdrasil-english-video-guide";

import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import { yggdrasilModuleLandings } from "@/data/academy/yggdrasil-module-map";
import {
  yggdrasilAcademyStoryImages,
  yggdrasilAcademyStorySourcePage,
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
    lead: "The system is now organised as seven clear course landings. Start with the five-level Basic Course, continue through the six-step Instructor Course, then open each advanced module separately.",
    start: "Open Basic Course",
    instructor: "Open Instructor Course",
    archive: "Full historical program text",
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
    storyEyebrow: "School & lineage",
    storyTitle: "The Academy behind Reiki Yggdrasil",
    storyLead: "Key background from the earlier Academy landing is now placed beside the images it explains, rather than shown as an unrelated photo gallery.",
    storySource: "Open the earlier Academy landing",
    source: "Open full Reiki Yggdrasil source",
    sourceNote: "Current curriculum: canonical Reiki Yggdrasil project. Historical school and lineage material: PsiTrends.",
  },
  ru: {
    eyebrow: "Академия · Актуальная программа",
    title: "Дао Рейки Иггдрасиль",
    lead: "Теперь система разложена на семь понятных отдельных лендингов. Сначала Базовый курс из пяти уровней, затем Инструкторский курс из шести ступеней, после него — каждый продвинутый модуль отдельно.",
    start: "Открыть Базовый курс",
    instructor: "Открыть Инструкторский курс",
    archive: "Полный исторический текст программы",
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
    storyEyebrow: "Школа и линия обучения",
    storyTitle: "Академия, из которой выросла система Рейки Иггдрасиль",
    storyLead: "Ключевая информация со старого лендинга Академии теперь стоит рядом с теми фотографиями, которые её объясняют, а не отдельной стеной несвязанных изображений.",
    storySource: "Открыть старый лендинг Академии",
    source: "Открыть полный источник Рейки Иггдрасиль",
    sourceNote: "Актуальная программа: канонический проект Reiki Yggdrasil. История школы и линии обучения: PsiTrends.",
  },
  es: {
    eyebrow: "Academia · Programa actual",
    title: "DAO Reiki Yggdrasil",
    lead: "El sistema está organizado en siete páginas de curso: Curso Básico, Curso de Instructor y cada módulo avanzado por separado.",
    start: "Abrir Curso Básico",
    instructor: "Abrir Curso de Instructor",
    archive: "Texto histórico completo",
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
    storyEyebrow: "Escuela y linaje",
    storyTitle: "La Academia detrás de Reiki Yggdrasil",
    storyLead: "La información histórica se muestra junto a las imágenes que explica, en lugar de una galería de fotos sin contexto.",
    storySource: "Abrir la página anterior de la Academia",
    source: "Abrir la fuente completa de Reiki Yggdrasil",
    sourceNote: "Currículo actual: proyecto canónico Reiki Yggdrasil. Historia de la escuela y del linaje: PsiTrends.",
  },
} satisfies Record<PublicLocale, Record<string, string>>;

const academyStory: Record<PublicLocale, Array<{
  key: keyof typeof yggdrasilAcademyStoryImages;
  eyebrow: string;
  title: string;
  body: string;
}>> = {
  en: [
    {
      key: "founder",
      eyebrow: "Origins",
      title: "Nicolai Zhuravlev and the Reiki Yggdrasil school",
      body: "The earlier Academy landing presents Nicolai Zhuravlev as the founder of the school and the author of the Reiki Yggdrasil system. It places the method inside a broader school of shamanic psychotechnologies, holistic studies and temple traditions.",
    },
    {
      key: "history",
      eyebrow: "Academy history",
      title: "A long-running training tradition",
      body: "The historical source describes the Academy as operating for more than 30 years and records a 2010 Paracelsus medal connected with the Reiki Yggdrasil system. Holistic House preserves this as the Academy's own historical account.",
    },
    {
      key: "initiations",
      eyebrow: "How the school teaches",
      title: "Initiations, study, practice and assessment",
      body: "The source describes an initiation or attunement-based training model combined with individual study, partner and client practice, seminars and final assessment. The current Holistic House course map keeps that staged logic while making each module, attunement and video easier to navigate.",
    },
    {
      key: "teacher",
      eyebrow: "Your teacher",
      title: "Andrii Litvinov",
      body: "The current Holistic House program is taught by Andrii Litvinov. The course pages bring the source texts, archived lectures, step-by-step practice and attunements together so students can move through the system without losing the original material.",
    },
  ],
  ru: [
    {
      key: "founder",
      eyebrow: "Истоки",
      title: "Николай Журавлёв и школа Рейки Иггдрасиль",
      body: "Старый лендинг Академии представляет Николая Журавлёва как основателя школы и автора системы Рейки Иггдрасиль. Система показана как часть более широкой школы шаманских психотехнологий, холистических исследований и храмовых традиций.",
    },
    {
      key: "history",
      eyebrow: "История Академии",
      title: "Долгая традиция практического обучения",
      body: "Исторический источник описывает Академию как работающую более 30 лет и упоминает медаль Парацельса 2010 года, связанную с системой Рейки Иггдрасиль. На Holistic House это сохраняется именно как историческое описание самой Академии.",
    },
    {
      key: "initiations",
      eyebrow: "Как устроено обучение",
      title: "Инициации, самостоятельная работа, практика и экзамен",
      body: "В старом описании обучение строится на инициациях или настройках, которые дополняются самостоятельным изучением, практикой с партнёрами и клиентами, семинарами и итоговой проверкой. Текущая структура Holistic House сохраняет эту логику, но делает модули, настройки и видео значительно удобнее для навигации.",
    },
    {
      key: "teacher",
      eyebrow: "Преподаватель",
      title: "Андрей Литвинов",
      body: "Текущую программу Holistic House ведёт Андрей Литвинов. На страницах курса исходные тексты, архивные лекции, поэтапная практика и настройки собраны вместе, чтобы проходить систему последовательно и не терять оригинальные материалы.",
    },
  ],
  es: [
    {
      key: "founder",
      eyebrow: "Orígenes",
      title: "Nicolai Zhuravlev y la escuela Reiki Yggdrasil",
      body: "La página histórica presenta a Nicolai Zhuravlev como fundador de la escuela y autor del sistema Reiki Yggdrasil, dentro de una tradición más amplia de estudios chamánicos y de templo.",
    },
    {
      key: "history",
      eyebrow: "Historia de la Academia",
      title: "Una tradición de formación de larga duración",
      body: "La fuente histórica describe a la Academia como activa durante más de 30 años y menciona una medalla Paracelsus de 2010 vinculada con Reiki Yggdrasil. Holistic House conserva esta información como relato histórico de la propia Academia.",
    },
    {
      key: "initiations",
      eyebrow: "Cómo se enseña",
      title: "Iniciaciones, estudio, práctica y evaluación",
      body: "La fuente describe una formación basada en iniciaciones o sintonizaciones, acompañada de estudio individual, práctica con compañeros y clientes, seminarios y evaluación final. La estructura actual conserva esa progresión y facilita la navegación.",
    },
    {
      key: "teacher",
      eyebrow: "Profesor",
      title: "Andrii Litvinov",
      body: "El programa actual de Holistic House es impartido por Andrii Litvinov y reúne textos fuente, videoclases de archivo, práctica progresiva y sintonizaciones en un solo recorrido.",
    },
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
  const schoolStory = academyStory[locale];

  return (
    <div className="yggdrasil-program-landing">
      <section className="yggdrasil-program-hero">
        <SourceVisual url={hero.localUrl ?? hero.sourceUrl} label={hero.label[locale]} className="yggdrasil-program-hero-image" />
        <div className="yggdrasil-program-hero-copy">
          <p className="homeopathy-kicker">{text.eyebrow}</p>
          <h2>{text.title}</h2>
          <p>{text.lead}</p>
          <div className="yggdrasil-program-actions">
            <Link className="yggdrasil-primary-action" href={`/${locale}/academy/reiki/yggdrasil/basic-course`}>{text.start}</Link>
            <Link className="yggdrasil-secondary-action" href={`/${locale}/academy/reiki/yggdrasil/instructor-course`}>{text.instructor}</Link>
            <Link className="yggdrasil-secondary-action" href={`/${locale}/academy/reiki/yggdrasil/archive`}>{text.archive}</Link>
          </div>
        </div>
      </section>

      <YggdrasilEnglishVideoGuide locale={locale} />

      <section className="yggdrasil-program-section" id="system-modules">
        <p className="homeopathy-kicker">{text.mapEyebrow}</p>
        <h2>{text.mapTitle}</h2>
        <p className="yggdrasil-program-section-lead">{text.mapLead}</p>
        <div className="yggdrasil-module-grid">
          {yggdrasilModuleLandings.map((module) => (
            <article className="yggdrasil-module-card" key={module.slug}>
              <SourceVisual url={module.image} label={module.title[locale]} />
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

      <section className="yggdrasil-school-story" aria-labelledby="yggdrasil-school-story-title">
        <div className="yggdrasil-school-story__heading">
          <p className="homeopathy-kicker">{text.storyEyebrow}</p>
          <h2 id="yggdrasil-school-story-title">{text.storyTitle}</h2>
          <p>{text.storyLead}</p>
        </div>

        <div className="yggdrasil-school-story__grid">
          {schoolStory.map((item) => (
            <article className="yggdrasil-school-story__item" key={item.key}>
              <SourceVisual url={yggdrasilAcademyStoryImages[item.key]} label={item.title} />
              <div className="yggdrasil-school-story__copy">
                <small>{item.eyebrow}</small>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                {item.key === "teacher" ? (
                  <Link href={`/${locale}/about`}>{locale === "ru" ? "Подробнее об Андрее" : locale === "es" ? "Más sobre Andrii" : "More about Andrii"}<span aria-hidden="true"> →</span></Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <p className="yggdrasil-program-source-note">{text.sourceNote}</p>
        <div className="yggdrasil-school-story__sources">
          <Link className="yggdrasil-source-link" href={yggdrasilAcademyStorySourcePage} target="_blank" rel="noreferrer">{text.storySource}<span aria-hidden="true">↗</span></Link>
          <Link className="yggdrasil-source-link" href={`/${locale}/academy/reiki/yggdrasil/archive`}>{text.archive}<span aria-hidden="true">→</span></Link>
          <Link className="yggdrasil-source-link" href={yggdrasilProgramSourcePage} target="_blank" rel="noreferrer">{text.source}<span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </div>
  );
}
