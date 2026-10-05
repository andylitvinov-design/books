import { AcademyVideoPlayer } from "@/components/academy-video-player";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
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

const copy: Record<PublicLocale, {
  eyebrow: string; title: string; lead: string; source: string; steps: string;
  sourceLanguage: string; overview: string; meaning: string; opens: string; skills: string; result: string;
  settings: string; videos: string; noVideo: string; practice: string; practiceLead: string;
  collections: string; mandalas: string; artifacts: string; sourceNote: string;
}> = {
  en: {
    eyebrow: "Canonical learning path",
    title: "7 levels · 37 steps",
    lead: "The complete course map is synchronized from the current Reiki Yggdrasil project: step descriptions, learning outcomes, all attunement cards and the verified public video archive.",
    source: "Canonical source: Reiki Yggdrasil project.",
    steps: "steps",
    sourceLanguage: "Detailed author/source material is preserved in Russian to match the dedicated Reiki Yggdrasil site.",
    overview: "Step overview", meaning: "Meaning", opens: "What it opens", skills: "Skills", result: "Result",
    settings: "Attunements", videos: "Video lectures", noVideo: "No verified public video is attached to this step in the source project.",
    practice: "Practice", practiceLead: "Shared practice exercises from the Reiki Yggdrasil learning interface.",
    collections: "Student collections", mandalas: "Mandalas", artifacts: "Artifacts", sourceNote: "Source note"
  },
  ru: {
    eyebrow: "Актуальная структура обучения",
    title: "7 уровней · 37 ступеней",
    lead: "Полная карта курса синхронизирована с текущим проектом Reiki Yggdrasil: описания ступеней, результаты обучения, все карточки настроек и проверенный архив публичных видеолекций.",
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
    title: "7 niveles · 37 etapas",
    lead: "El mapa completo del curso está sincronizado con el proyecto actual Reiki Yggdrasil: descripciones, resultados, todas las sintonizaciones y el archivo verificado de videoclases públicas.",
    source: "Fuente canónica: proyecto Reiki Yggdrasil.",
    steps: "etapas",
    sourceLanguage: "El material detallado del autor se conserva en ruso para corresponder al sitio dedicado Reiki Yggdrasil.",
    overview: "Resumen de la etapa", meaning: "Sentido", opens: "Qué abre", skills: "Habilidades", result: "Resultado",
    settings: "Sintonizaciones", videos: "Videoclases", noVideo: "No hay un video público verificado para esta etapa en el proyecto fuente.",
    practice: "Práctica", practiceLead: "Ejercicios compartidos de la interfaz formativa Reiki Yggdrasil.",
    collections: "Colecciones de estudiantes", mandalas: "Mandalas", artifacts: "Artefactos", sourceNote: "Fuente"
  }
};

function SourceList({ title, items }: { title: string; items: string[] }) {
  return <section className="yggdrasil-info-card"><h5>{title}</h5><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

function StepDetail({ locale, level, step }: { locale: PublicLocale; level: CurriculumLevel; step: CurriculumStep }) {
  const text = copy[locale];
  const source = step.sourceText;
  const videos = step.video?.videos?.filter((video) => Boolean(video.youtubeId)) ?? [];
  return (
    <details className="yggdrasil-step">
      <summary>
        <span className="yggdrasil-step-number">{step.number}</span>
        <span>
          <small>{level.stepLabel[locale]} {step.number}</small>
          <strong>{step.title[locale]}</strong>
        </span>
        <span className="yggdrasil-step-toggle" aria-hidden="true">+</span>
      </summary>
      <div className="yggdrasil-step-body" lang="ru">
        <section className="yggdrasil-step-overview">
          <p className="homeopathy-kicker">{text.overview}</p>
          <p className="yggdrasil-step-intro">{source.intro}</p>
          <div className="yggdrasil-info-grid">
            <section className="yggdrasil-info-card"><h5>{text.meaning}</h5><p>{source.meaning}</p></section>
            <SourceList title={text.opens} items={source.opens} />
            <SourceList title={text.skills} items={source.skills} />
            <section className="yggdrasil-info-card"><h5>{text.result}</h5><p>{source.result}</p></section>
          </div>
        </section>

        <section className="yggdrasil-settings-section">
          <div className="yggdrasil-section-heading"><h4>{text.settings}</h4><span>{step.settings.length}</span></div>
          <div className="yggdrasil-settings-grid">
            {step.settings.map((setting) => (
              <article className="yggdrasil-setting-card" key={setting.id}>
                <h5>{setting.title}</h5>
                <p>{setting.description}</p>
                <small>{setting.effect}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="yggdrasil-videos-section">
          <div className="yggdrasil-section-heading"><h4>{text.videos}</h4><span>{videos.length}</span></div>
          {videos.length ? (
            <>
              <div className="yggdrasil-video-grid">
                {videos.map((video) => <AcademyVideoPlayer key={video.youtubeId} youtubeId={video.youtubeId!} title={video.title + (video.label ? " — " + video.label : "")} />)}
              </div>
              {step.video?.sourceNote ? <p className="yggdrasil-video-source"><b>{text.sourceNote}:</b> {step.video.sourceNote}</p> : null}
            </>
          ) : <p className="yggdrasil-no-video">{text.noVideo}</p>}
        </section>
      </div>
    </details>
  );
}

export function YggdrasilCurriculum({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const levels = curriculum.levels as CurriculumLevel[];
  const exercises = curriculum.practiceExercises as PracticeExercise[];
  const mandalas = curriculum.studentCollections.mandalas as StudentItem[];
  const artifacts = curriculum.studentCollections.artifacts as StudentItem[];

  return (
    <section className="yggdrasil-curriculum" aria-labelledby="yggdrasil-curriculum-title">
      <div className="yggdrasil-curriculum-intro">
        <p className="homeopathy-kicker">{text.eyebrow}</p>
        <h2 id="yggdrasil-curriculum-title">{text.title}</h2>
        <p>{text.lead}</p>
        <div className="yggdrasil-source-stats" aria-label="Source coverage">
          <span>{curriculum.source.totalSettings} {locale === "ru" ? "настроек" : locale === "es" ? "sintonizaciones" : "attunements"}</span>
          <span>{curriculum.source.totalVideos} {locale === "ru" ? "видеолекций" : locale === "es" ? "videoclases" : "video lectures"}</span>
        </div>
        {text.sourceLanguage ? <p className="yggdrasil-source-language">{text.sourceLanguage}</p> : null}
        <small>{text.source}</small>
      </div>

      <div className="yggdrasil-levels">
        {levels.map((level) => (
          <details className="yggdrasil-level" key={level.id} open={level.id === 1}>
            <summary className="yggdrasil-level-summary">
              <span className="yggdrasil-level-number">{String(level.id).padStart(2, "0")}</span>
              <span className="yggdrasil-level-copy">
                <strong>{level.title[locale]}</strong>
                <small>{level.steps.length} {text.steps} · {level.theme[locale]}</small>
              </span>
              <span className="yggdrasil-level-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="yggdrasil-step-list">
              {level.steps.map((step) => <StepDetail key={step.id} locale={locale} level={level} step={step} />)}
            </div>
          </details>
        ))}
      </div>

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
    </section>
  );
}
