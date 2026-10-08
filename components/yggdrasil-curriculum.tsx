import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { ChevronDown, Compass, Eye, Flame, Flower2, HeartPulse, MoonStar, Shield, Sparkles, Sun, WandSparkles } from "lucide-react";
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

function attunementGlyph(id: string) {
  const key = id.split("-").at(-1) ?? "";
  const stepId = id.replace(/-A\d+$/, "");
  if (stepId === "RY-L01-S01") {
    if (key === "A01") return HeartPulse;
    if (key === "A02") return Eye;
    if (key === "A03") return Shield;
    if (key === "A04") return Compass;
  }
  const symbols = [WandSparkles, Eye, Shield, Compass, MoonStar, Flame, Flower2, Sun, Sparkles];
  const index = [...id].reduce((total, char) => total + char.charCodeAt(0), 0) % symbols.length;
  return symbols[index];
}

function StepDetail({ locale, level, step }: { locale: PublicLocale; level: CurriculumLevel; step: CurriculumStep }) {
  const text = copy[locale];
  const sourceSummary = yggdrasilStepSummary(step.id, locale);
  const russianVideos = step.video?.videos?.filter((video) => Boolean(video.youtubeId)) ?? [];
  const englishVideos = yggdrasilEnglishStepVideos[step.id] ?? [];
  const labels = {
    en: {
      about: "About this step",
      englishVideos: "English videos for this step",
      russianVideos: "Russian archive videos",
      russianNote: "These source lectures are in Russian. They are kept here because they match this step in the original Reiki Yggdrasil video archive.",
    },
    ru: {
      about: "О ступени",
      englishVideos: "Видео на английском",
      russianVideos: "Видео на русском",
      russianNote: "Русские видеолекции из исходного архива, привязанные к этой ступени.",
    },
    es: {
      about: "Sobre esta etapa",
      englishVideos: "Videos en inglés",
      russianVideos: "Videos de archivo en ruso",
      russianNote: "Estas videoclases históricas están en ruso y corresponden a esta etapa.",
    },
  }[locale];

  return (
    <article className="yggdrasil-step-card" id={step.id.toLowerCase()}>
      <header className="yggdrasil-step-card__header">
        <span className="yggdrasil-step-number">{step.number}</span>
        <div>
          <small>{level.stepLabel[locale]} {step.number}</small>
          <h3>{step.title[locale]}</h3>
        </div>
      </header>

      <div className="yggdrasil-step-card__body" lang={locale === "ru" ? "ru" : locale === "es" ? "es" : "en"}>
        <p className="homeopathy-kicker">{labels.about}</p>
        <p className="yggdrasil-step-source-summary">{sourceSummary}</p>

        <section className="yggdrasil-settings-section" aria-labelledby={`attunements-${step.id}`}>
          <div className="yggdrasil-section-heading yggdrasil-settings-heading">
            <h4 id={`attunements-${step.id}`}>{text.settings}</h4>
            <span>{step.settings.length}</span>
          </div>
          <div className="yggdrasil-settings-list">
            {step.settings.map((setting) => {
              const localized = localizedSetting(locale, setting);
              const Glyph = attunementGlyph(setting.id);
              return (
                <article className="yggdrasil-setting-row" key={setting.id}>
                  <span className="yggdrasil-setting-glyph" aria-hidden="true"><Glyph size={29} strokeWidth={1.55} /></span>
                  <div className="yggdrasil-setting-row__text">
                    <h5>{localized.title}</h5>
                    <p>{localized.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {englishVideos.length || russianVideos.length ? (
          <section className="yggdrasil-step-video-library" aria-label={text.videos}>
            {locale === "ru" && russianVideos.length ? (
              <div className="yggdrasil-video-language-group">
                <div className="yggdrasil-video-language-heading">
                  <div><span className="yggdrasil-language-badge yggdrasil-language-badge--ru">RU · Русский</span><h4>{labels.russianVideos}</h4></div>
                  <small>{russianVideos.length}</small>
                </div>
                <div className="yggdrasil-video-grid">
                  {russianVideos.map((video) => <AcademyVideoPlayer key={video.youtubeId} youtubeId={video.youtubeId!} title={"RU · " + video.title + (video.label ? " — " + video.label : "")} />)}
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
            {locale !== "ru" && russianVideos.length ? (
              <details className="yggdrasil-russian-archive">
                <summary>
                  <span className="yggdrasil-language-badge yggdrasil-language-badge--ru">RU · Русский</span>
                  <span className="yggdrasil-russian-archive__copy">
                    <strong>{labels.russianVideos}</strong>
                    <small>{labels.russianNote}</small>
                  </span>
                  <span className="yggdrasil-russian-archive__count">{russianVideos.length}</span>
                  <ChevronDown className="yggdrasil-russian-archive__chevron" size={21} aria-hidden="true" />
                </summary>
                <div className="yggdrasil-russian-archive__contents">
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
              </details>
            ) : null}
          </section>
        ) : null}

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
    <section className="yggdrasil-curriculum" aria-labelledby="yggdrasil-curriculum-title">
      <div className="yggdrasil-curriculum-intro">
        <p className="homeopathy-kicker">{selected ? (locale === "ru" ? "Курс без лишних кликов" : locale === "es" ? "Curso sin clics innecesarios" : "Course without extra clicks") : text.eyebrow}</p>
        <h2 id="yggdrasil-curriculum-title">{selected ? (locale === "ru" ? "Что входит в курс" : locale === "es" ? "Qué incluye el curso" : "What the course includes") : text.title}</h2>
        <p>{selected ? selected.theme[locale] : text.lead}</p>
        <div className="yggdrasil-source-stats" aria-label="Source coverage">
          <span>{settingsCount} {locale === "ru" ? "настроек" : locale === "es" ? "sintonizaciones" : "attunements"}</span>
          <span>{videosCount} {locale === "ru" ? "русских видеолекций" : locale === "es" ? "videoclases en ruso" : "Russian video lectures"}</span>
          {englishVideosCount ? <span>{englishVideosCount} {locale === "ru" ? "видео на английском" : locale === "es" ? "videos en inglés" : "English videos"}</span> : null}
        </div>
        {text.sourceLanguage ? <p className="yggdrasil-source-language">{text.sourceLanguage}</p> : null}
        <small>{text.source}</small>
      </div>

      <div className="yggdrasil-levels">
        {levels.map((level) => (
          <section className="yggdrasil-level yggdrasil-level--landing" id={level.id === 1 ? "yggdrasil-basic-course-learning" : undefined} key={level.id}>
            <div className="yggdrasil-level-summary">
              <span className="yggdrasil-level-number">{String(level.id).padStart(2, "0")}</span>
              <span className="yggdrasil-level-copy">
                <strong>{level.title[locale]}</strong>
                <small>{level.steps.length} {text.steps} · {level.theme[locale]}</small>
              </span>
            </div>
            <nav className="yggdrasil-course-roadmap" aria-label={locale === "ru" ? "Структура курса" : locale === "es" ? "Estructura del curso" : "Course roadmap"}>
              {level.steps.map((step) => (
                <a href={"#" + step.id.toLowerCase()} key={step.id}>
                  <span>{String(step.number).padStart(2, "0")}</span>
                  <strong>{step.title[locale]}</strong>
                  <small>{yggdrasilStepSummary(step.id, locale)}</small>
                </a>
              ))}
            </nav>
            <div className="yggdrasil-step-list yggdrasil-step-list--inline">
              {level.steps.map((step) => <StepDetail key={step.id} locale={locale} level={level} step={step} />)}
            </div>
          </section>
        ))}
      </div>

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
