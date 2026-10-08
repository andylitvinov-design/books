import { AcademyVideoPlayer } from "@/components/academy-video-player";
import visualStyles from "./yggdrasil-curriculum-visual.module.css";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import en1 from "@/data/academy/yggdrasil-en-settings-l1.json";
import en2 from "@/data/academy/yggdrasil-en-settings-l2.json";
import en3 from "@/data/academy/yggdrasil-en-settings-l3.json";
import en4 from "@/data/academy/yggdrasil-en-settings-l4.json";
import en5 from "@/data/academy/yggdrasil-en-settings-l5.json";
import en6 from "@/data/academy/yggdrasil-en-settings-l6.json";
import en7 from "@/data/academy/yggdrasil-en-settings-l7.json";
import { yggdrasilEnglishStepVideos } from "@/data/academy/yggdrasil-legacy-english-videos";
import { yggdrasilStepSummary } from "@/data/academy/yggdrasil-step-summaries";
import type { PublicLocale } from "@/lib/public-locales";

type Localized = Record<PublicLocale, string>;
type SourceText = { intro: string; meaning: string; opens: string[]; skills: string[]; result: string };
type Setting = { id: string; title: string; description: string; effect: string; contentStatus?: string };
type VideoItem = { title: string; label: string; url: string; youtubeId?: string | null; posterUrl?: string | null };
type StepVideo = { title: string; sourcePage: string; sourceStatus: string; sourceNote: string; videos: VideoItem[] };
type CurriculumStep = { id: string; number: number; title: Localized; sourceText: SourceText; settings: Setting[]; video?: StepVideo | null };
type CurriculumLevel = { id: number; title: Localized; theme: Localized; stepLabel: Localized; steps: CurriculumStep[] };
type PracticeExercise = { title: string; text: string; time: string };
type StudentItem = { title: string; author: string; likes: number };
type EnglishSetting = { title: string; description: string; effect: string };

const englishSettings = {
  ...(en1 as Record<string, EnglishSetting>),
  ...(en2 as Record<string, EnglishSetting>),
  ...(en3 as Record<string, EnglishSetting>),
  ...(en4 as Record<string, EnglishSetting>),
  ...(en5 as Record<string, EnglishSetting>),
  ...(en6 as Record<string, EnglishSetting>),
  ...(en7 as Record<string, EnglishSetting>),
};

const copy: Record<PublicLocale, {
  eyebrow: string; title: string; lead: string; source: string; steps: string;
  sourceLanguage: string; overview: string; meaning: string; opens: string; skills: string; result: string;
  settings: string; videos: string; noVideo: string; practice: string; practiceLead: string;
  collections: string; mandalas: string; artifacts: string; sourceNote: string;
}> = {
  en: {
    eyebrow: "Canonical learning path",
    title: "7 modules · 37 steps",
    lead: "Complete Reiki Yggdrasil course content synchronized from the canonical project: learner descriptions, 177 attunements and 79 verified public video lectures.",
    source: "Canonical source: Reiki Yggdrasil project.",
    steps: "steps",
    sourceLanguage: "English pages use English course copy throughout. Historical/esoteric descriptions are presented as source material, not as medical claims.",
    overview: "Step overview", meaning: "Meaning", opens: "What it opens", skills: "Skills", result: "Result",
    settings: "Attunements", videos: "Video lectures", noVideo: "No verified public video is attached to this step in the source project.",
    practice: "Practice", practiceLead: "Shared practice exercises from the Reiki Yggdrasil learning interface.",
    collections: "Student collections", mandalas: "Mandalas", artifacts: "Artifacts", sourceNote: "Source"
  },
  ru: {
    eyebrow: "Актуальная структура обучения",
    title: "7 модулей · 37 ступеней",
    lead: "Полная карта курса синхронизирована с текущим проектом Reiki Yggdrasil: описания ступеней, 177 настроек и 79 проверенных публичных видеолекций.",
    source: "Канонический источник: проект Reiki Yggdrasil.",
    steps: "ступеней",
    sourceLanguage: "",
    overview: "Обзор ступени", meaning: "Смысл ступени", opens: "Что открывает", skills: "Навыки", result: "Результат",
    settings: "Настройки", videos: "Видеолекции", noVideo: "В исходном проекте для этой ступени нет проверенного публичного видео.",
    practice: "Практика", practiceLead: "Общие упражнения из учебного интерфейса Reiki Yggdrasil.",
    collections: "Коллекции учеников", mandalas: "Мандалы", artifacts: "Артефакты", sourceNote: "Источник"
  },
  es: {
    eyebrow: "Ruta formativa canónica",
    title: "7 módulos · 37 etapas",
    lead: "El mapa completo del curso está sincronizado con el proyecto actual Reiki Yggdrasil: descripciones, 177 sintonizaciones y 79 videoclases públicas verificadas.",
    source: "Fuente canónica: proyecto Reiki Yggdrasil.",
    steps: "etapas",
    sourceLanguage: "El detalle que aún no tiene traducción española usa la versión inglesa, nunca texto ruso.",
    overview: "Resumen de la etapa", meaning: "Sentido", opens: "Qué abre", skills: "Habilidades", result: "Resultado",
    settings: "Sintonizaciones", videos: "Videoclases", noVideo: "No hay un video público verificado para esta etapa en el proyecto fuente.",
    practice: "Práctica", practiceLead: "Ejercicios compartidos de la interfaz formativa Reiki Yggdrasil.",
    collections: "Colecciones de estudiantes", mandalas: "Mandalas", artifacts: "Artefactos", sourceNote: "Fuente"
  }
};

function localizedSetting(locale: PublicLocale, setting: Setting): EnglishSetting | Setting {
  if (locale === "ru") return setting;
  return englishSettings[setting.id] ?? {
    title: `Attunement ${setting.id.split("-").at(-1)?.replace(/^A/, "") ?? ""}`,
    description: "Historical Reiki Yggdrasil attunement preserved from the canonical course structure.",
    effect: "See the original Russian source for author wording."
  };
}

const practiceEn: PracticeExercise[] = [
  { title: "Flow Breathing", text: "Attune to the natural movement of energy.", time: "10 min" },
  { title: "Inner Listening", text: "A practice for developing subtle perception.", time: "15 min" },
  { title: "Connecting with the Tree", text: "Visualise a channel of connection with Yggdrasil.", time: "20 min" },
];
const practiceEs: PracticeExercise[] = [
  { title: "Respiración del flujo", text: "Sintonízate con el movimiento natural de la energía.", time: "10 min" },
  { title: "Escucha interior", text: "Práctica para desarrollar la percepción sutil.", time: "15 min" },
  { title: "Conexión con el Árbol", text: "Visualiza un canal de conexión con Yggdrasil.", time: "20 min" },
];

const collectionsEn = {
  mandalas: [
    { title: "Attunement Mandala", author: "Maria", likes: 24 },
    { title: "Healing Mandala", author: "Anna", likes: 19 },
    { title: "Flow Mandala", author: "Irina", likes: 31 },
  ],
  artifacts: [
    { title: "Flow Pendant", author: "Alexey", likes: 18 },
    { title: "Tree Amulet", author: "Maria", likes: 27 },
    { title: "Attunement Seal", author: "Irina", likes: 22 },
  ],
};
const collectionsEs = {
  mandalas: [
    { title: "Mandala de sintonización", author: "Maria", likes: 24 },
    { title: "Mandala de sanación", author: "Anna", likes: 19 },
    { title: "Mandala del flujo", author: "Irina", likes: 31 },
  ],
  artifacts: [
    { title: "Colgante del flujo", author: "Alexey", likes: 18 },
    { title: "Amuleto del Árbol", author: "Maria", likes: 27 },
    { title: "Sello de sintonización", author: "Irina", likes: 22 },
  ],
};


/**
 * Original per-level photos from the five-level Basic Course:
 * https://psitrends.com/studies/master-taory
 * Keep the curricular text in the canonical source; these visuals are only presentation.
 */
const basicLevelPhotos: Record<number, string> = {
  1: "https://psitrends.com/images/Screenshot_25.png",
  2: "https://psitrends.com/images/photo_2023-07-10_08-26-39.jpg",
  3: "https://psitrends.com/images/Screenshot_31.png",
  4: "https://psitrends.com/images/tulumhypnotherapy.jpg",
  5: "https://psitrends.com/images/world_magic_traditions_overview.jpg",
};

const advancedLevelPhotos: Record<number, string> = {
  2: "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
  3: "/academy/reiki-yggdrasil/source/temple-studies.png",
  4: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  5: "/academy/reiki-yggdrasil/source/western-tradition.png",
  6: "/academy/reiki-yggdrasil/source/advanced-runes.png",
  7: "/academy/reiki-yggdrasil/source/slavic-tradition.png",
};

const basicLevelIntroductions: Record<PublicLocale, Record<number, string>> = {
  en: {
    1: "Begin with four foundation attunements: healing practices, intuition, protection and working with a personal situation.",
    2: "Explore cleansing practices, charging objects, releasing unwanted connections and symbolic work with the money stream.",
    3: "Work with personal direction and inner strength through eight attunements, including emotions, power, intellect and karma.",
    4: "Explore perception and imagery through clairvoyance, previous-life symbolism, knowledge and creating a situation.",
    5: "Bring the foundation together through two master-level attunements: Connection with the World and Connection with the Gods.",
  },
  ru: {
    1: "Начало практики: четыре настройки — целительство, интуиция, защита и работа с личной ситуацией.",
    2: "Практики очищения, зарядки предметов, освобождения от нежелательных связей и работы с денежным потоком.",
    3: "Восемь настроек о направлении жизни и личной силе: эмоции, активация, сила, интеллект, карма и другие темы.",
    4: "Практики образного восприятия: ясновидение, символика прошлых жизней, знание и создание ситуации.",
    5: "Завершение базового курса: две мастерские настройки — Связь с Миром и Связь с Богами.",
  },
  es: {
    1: "Empieza con cuatro sintonizaciones: sanación simbólica, intuición, protección y trabajo con una situación personal.",
    2: "Explora limpieza, carga de objetos, liberación de vínculos y trabajo simbólico con el flujo del dinero.",
    3: "Ocho sintonizaciones sobre dirección personal y fuerza interior: emociones, poder, intelecto, karma y más.",
    4: "Explora la percepción y las imágenes: clarividencia, vidas pasadas, conocimiento y creación de situaciones.",
    5: "Integra el curso básico con dos sintonizaciones de maestría: Conexión con el Mundo y con los Dioses.",
  },
};

function StepDetail({ locale, level, step }: { locale: PublicLocale; level: CurriculumLevel; step: CurriculumStep }) {
  const text = copy[locale];
  const sourceSummary = yggdrasilStepSummary(step.id, locale);
  const visualPhoto = level.id === 1 ? basicLevelPhotos[step.number] : advancedLevelPhotos[level.id];
  const shortIntroduction = level.id === 1 ? basicLevelIntroductions[locale][step.number] : sourceSummary;
  const russianVideos = step.video?.videos?.filter((video) => Boolean(video.youtubeId)) ?? [];
  const englishVideos = yggdrasilEnglishStepVideos[step.id] ?? [];
  const labels = {
    en: {
      about: "About this step",
      attunements: "Attunements in this step",
      full: "Full attunement descriptions",
      fullLead: "Open only if you want the detailed source wording for every attunement.",
      englishVideos: "English videos for this step",
      russianVideos: "Russian archive videos",
      russianNote: "These source lectures are in Russian. They are kept here because they match this step in the original Reiki Yggdrasil video archive.",
    },
    ru: {
      about: "О ступени",
      attunements: "Настройки этой ступени",
      full: "Полные описания настроек",
      fullLead: "Открывайте, если нужны подробные исходные описания каждой настройки.",
      englishVideos: "Видео на английском",
      russianVideos: "Видео на русском",
      russianNote: "Русские видеолекции из исходного архива, привязанные к этой ступени.",
    },
    es: {
      about: "Sobre esta etapa",
      attunements: "Sintonizaciones de esta etapa",
      full: "Descripciones completas de las sintonizaciones",
      fullLead: "Ábrelo solo si necesitas el texto detallado de cada sintonización.",
      englishVideos: "Videos en inglés",
      russianVideos: "Videos de archivo en ruso",
      russianNote: "Estas videoclases históricas están en ruso y corresponden a esta etapa.",
    },
  }[locale];

  return (
    <article className={visualStyles.stepCard} id={step.id.toLowerCase()}>
      <div
        className={visualStyles.stepPhoto}
        role="img"
        aria-label={step.title[locale]}
        style={{ backgroundImage: `linear-gradient(180deg, rgba(34, 28, 23, .05) 55%, rgba(34, 28, 23, .45)), url("${visualPhoto}")` }}
      >
        <span className={visualStyles.photoRibbon}>{level.stepLabel[locale]} {String(step.number).padStart(2, "0")}</span>
      </div>
      <div className={visualStyles.stepText}>
        <header className={visualStyles.stepHeader}>
          <span className={visualStyles.stageKicker}>{level.stepLabel[locale]} {step.number} / {level.steps.length}</span>
          <h3>{step.title[locale]}</h3>
        </header>

      <div className={visualStyles.stepBody} lang={locale === "ru" ? "ru" : locale === "es" ? "es" : "en"}>
        <p className={visualStyles.stepIntroduction}>{shortIntroduction}</p>

        <section className="yggdrasil-attunement-summary">
          <div className="yggdrasil-section-heading">
            <h4>{labels.attunements}</h4>
            <span>{step.settings.length}</span>
          </div>
          <div className={visualStyles.attunementChips}>
            {step.settings.slice(0, 4).map((setting) => {
              const localized = localizedSetting(locale, setting);
              return <span key={setting.id}>{localized.title}</span>;
            })}
            {step.settings.length > 4 ? <span className={visualStyles.moreChips}>+{step.settings.length - 4}</span> : null}
          </div>
        </section>

        {englishVideos.length || russianVideos.length ? (
          <section className="yggdrasil-step-video-library" aria-label={text.videos}>
            {locale === "ru" ? (
              <>
                {russianVideos.length ? (
                  <div className="yggdrasil-video-language-group">
                    <div className="yggdrasil-video-language-heading">
                      <div><span className="yggdrasil-language-badge yggdrasil-language-badge--ru">RU · Русский</span><h4>{labels.russianVideos}</h4></div>
                      <small>{russianVideos.length}</small>
                    </div>
                    <div className="yggdrasil-video-grid">
                      {russianVideos.map((video) => (
                        <AcademyVideoPlayer
                          key={video.youtubeId}
                          youtubeId={video.youtubeId!}
                          title={"RU · " + video.title + (video.label ? " — " + video.label : "")}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {englishVideos.length ? (
                  <div className="yggdrasil-video-language-group">
                    <div className="yggdrasil-video-language-heading">
                      <div><span className="yggdrasil-language-badge yggdrasil-language-badge--en">EN · English</span><h4>{labels.englishVideos}</h4></div>
                      <small>{englishVideos.length}</small>
                    </div>
                    <div className="yggdrasil-video-grid">
                      {englishVideos.map((video) => <AcademyVideoPlayer key={video.youtubeId} youtubeId={video.youtubeId} title={"EN · " + video.title} />)}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {englishVideos.length ? (
                  <div className="yggdrasil-video-language-group">
                    <div className="yggdrasil-video-language-heading">
                      <div><span className="yggdrasil-language-badge yggdrasil-language-badge--en">EN · English</span><h4>{labels.englishVideos}</h4></div>
                      <small>{englishVideos.length}</small>
                    </div>
                    <div className="yggdrasil-video-grid">
                      {englishVideos.map((video) => <AcademyVideoPlayer key={video.youtubeId} youtubeId={video.youtubeId} title={"EN · " + video.title} />)}
                    </div>
                  </div>
                ) : null}
                {russianVideos.length ? (
                  <div className="yggdrasil-video-language-group yggdrasil-video-language-group--secondary">
                    <div className="yggdrasil-video-language-heading">
                      <div><span className="yggdrasil-language-badge yggdrasil-language-badge--ru">RU · Русский</span><h4>{labels.russianVideos}</h4></div>
                      <small>{russianVideos.length}</small>
                    </div>
                    <p className="yggdrasil-video-language-note">{labels.russianNote}</p>
                    <div className="yggdrasil-video-grid">
                      {russianVideos.map((video) => (
                        <AcademyVideoPlayer
                          key={video.youtubeId}
                          youtubeId={video.youtubeId!}
                          title={"RU · Русский — " + step.title.en + (video.label ? " — " + video.label : "")}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        <details className="yggdrasil-step-more">
          <summary>
            <span>{labels.full}</span>
            <small>{labels.fullLead}</small>
          </summary>
          <div className="yggdrasil-step-more__body">
            <section className="yggdrasil-settings-section">
              <div className="yggdrasil-section-heading"><h4>{text.settings}</h4><span>{step.settings.length}</span></div>
              <div className="yggdrasil-settings-grid">
                {step.settings.map((setting) => {
                  const localized = localizedSetting(locale, setting);
                  return (
                    <article className="yggdrasil-setting-card" key={setting.id}>
                      <h5>{localized.title}</h5>
                      <p>{localized.description}</p>
                      <small>{localized.effect}</small>
                    </article>
                  );
                })}
              </div>
            </section>

          </div>
        </details>
      </div>
      </div>
    </article>
  );
}

export function YggdrasilCurriculum({ locale, levelId, showSupport = true }: { locale: PublicLocale; levelId?: number; showSupport?: boolean }) {
  const text = copy[locale];
  const allLevels = curriculum.levels as CurriculumLevel[];
  const levels = levelId ? allLevels.filter((level) => level.id === levelId) : allLevels;
  const sourceExercises = curriculum.practiceExercises as PracticeExercise[];
  const sourceMandalas = curriculum.studentCollections.mandalas as StudentItem[];
  const sourceArtifacts = curriculum.studentCollections.artifacts as StudentItem[];
  const exercises = locale === "ru" ? sourceExercises : locale === "es" ? practiceEs : practiceEn;
  const mandalas = locale === "ru" ? sourceMandalas : locale === "es" ? collectionsEs.mandalas : collectionsEn.mandalas;
  const artifacts = locale === "ru" ? sourceArtifacts : locale === "es" ? collectionsEs.artifacts : collectionsEn.artifacts;
  const selected = levelId ? levels[0] : null;
  const settingsCount = levels.reduce((sum, level) => sum + level.steps.reduce((inner, step) => inner + step.settings.length, 0), 0);
  const videosCount = levels.reduce((sum, level) => sum + level.steps.reduce((inner, step) => inner + (step.video?.videos?.filter((video) => Boolean(video.youtubeId)).length ?? 0), 0), 0);
  const englishVideosCount = levels.reduce((sum, level) => sum + level.steps.reduce((inner, step) => inner + (yggdrasilEnglishStepVideos[step.id]?.length ?? 0), 0), 0);

  return (
    <section className={visualStyles.curriculum} aria-labelledby="yggdrasil-curriculum-title">
      <div className={visualStyles.curriculumIntro}>
        <p className="homeopathy-kicker">{selected ? (locale === "ru" ? "Курс без лишних кликов" : locale === "es" ? "Curso sin clics innecesarios" : "Course without extra clicks") : text.eyebrow}</p>
        <h2 id="yggdrasil-curriculum-title">{selected ? (locale === "ru" ? "Что входит в курс" : locale === "es" ? "Qué incluye el curso" : "What the course includes") : text.title}</h2>
        <p>{selected?.id === 1 ? (locale === "ru" ? "Пять ступеней от первых практик до мастерского уровня. Фото, короткое описание и настройки — всё видно сразу." : locale === "es" ? "Cinco etapas, desde las prácticas básicas hasta el nivel de maestro. Fotos y puntos clave a primera vista." : "Five stages, from foundational practices to the Master Level. Photos and key attunements at a glance.") : selected ? selected.theme[locale] : text.lead}</p>
      </div>

      <div className={visualStyles.levels}>
        {levels.map((level) => (
          <section className={visualStyles.level} id={level.id === 1 ? "yggdrasil-basic-course-learning" : undefined} key={level.id}>
            <div className={visualStyles.levelHeading}>
              <span className={visualStyles.levelNumber}>{String(level.id).padStart(2, "0")}</span>
              <span className={visualStyles.levelTitle}>
                <strong>{level.title[locale]}</strong>
                <small>{level.steps.length} {text.steps}</small>
              </span>
            </div>
            <nav className={visualStyles.stageNavigation} aria-label={locale === "ru" ? "Перейти к ступени" : locale === "es" ? "Ir a la etapa" : "Jump to a level"}>
              {level.steps.map((step) => (
                <a href={"#" + step.id.toLowerCase()} key={step.id}>
                  <span>{String(step.number).padStart(2, "0")}</span>
                  <strong>{step.title[locale]}</strong>
                </a>
              ))}
            </nav>
            <div className={visualStyles.visualSteps}>
              {level.steps.map((step) => <StepDetail key={step.id} locale={locale} level={level} step={step} />)}
            </div>
          </section>
        ))}
      </div>

      <details className={visualStyles.sourceDetails}>
        <summary>{locale === "ru" ? "Источники, языки и количество материалов" : locale === "es" ? "Fuentes, idiomas y materiales" : "Course sources, languages and materials"}</summary>
        <div className="yggdrasil-source-stats" aria-label="Source coverage">
          <span>{settingsCount} {locale === "ru" ? "настроек" : locale === "es" ? "sintonizaciones" : "attunements"}</span>
          <span>{videosCount} {locale === "ru" ? "русских видеолекций" : locale === "es" ? "videoclases en ruso" : "Russian video lectures"}</span>
          {englishVideosCount ? <span>{englishVideosCount} {locale === "ru" ? "видео на английском" : locale === "es" ? "videos en inglés" : "English videos"}</span> : null}
        </div>
        {text.sourceLanguage ? <p>{text.sourceLanguage}</p> : null}
        <small>{text.source}</small>
      </details>

      {showSupport ? (
        <>
          <section className="yggdrasil-support-section">
            <p className="homeopathy-kicker">{text.practice}</p>
            <h3>{text.practice}</h3>
            <p>{text.practiceLead}</p>
            <div className="yggdrasil-practice-grid">
              {exercises.map((exercise) => <article key={exercise.title}><span>{exercise.time}</span><h4>{exercise.title}</h4><p>{exercise.text}</p></article>)}
            </div>
          </section>

          <section className="yggdrasil-support-section">
            <p className="homeopathy-kicker">{text.collections}</p>
            <h3>{text.collections}</h3>
            <div className="yggdrasil-collection-grid">
              <article><h4>{text.mandalas}</h4>{mandalas.map((item) => <div key={item.title}><strong>{item.title}</strong><small>{item.author} · ♥ {item.likes}</small></div>)}</article>
              <article><h4>{text.artifacts}</h4>{artifacts.map((item) => <div key={item.title}><strong>{item.title}</strong><small>{item.author} · ♥ {item.likes}</small></div>)}</article>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
