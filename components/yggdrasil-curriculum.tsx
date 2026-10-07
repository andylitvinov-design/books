import { AcademyVideoPlayer } from "@/components/academy-video-player";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import en1 from "@/data/academy/yggdrasil-en-settings-l1.json";
import en2 from "@/data/academy/yggdrasil-en-settings-l2.json";
import en3 from "@/data/academy/yggdrasil-en-settings-l3.json";
import en4 from "@/data/academy/yggdrasil-en-settings-l4.json";
import en5 from "@/data/academy/yggdrasil-en-settings-l5.json";
import en6 from "@/data/academy/yggdrasil-en-settings-l6.json";
import en7 from "@/data/academy/yggdrasil-en-settings-l7.json";
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

const levelOneEnglish: Record<string, SourceText> = {
  "RY-L01-S01": {
    intro: "The first step introduces the basic Reiki Yggdrasil flow through health, intuition and protection. It is designed as an entry point for body awareness, subtle perception and a sense of personal safety.",
    meaning: "The purpose is to provide a stable beginning: strengthen contact with the body, notice subtle signals and build a simple protective framework without tension or struggle.",
    opens: ["first experience of the Reiki Yggdrasil flow","attention to bodily signals and intuition","a gentle protection practice for everyday situations","awareness of personal safety and boundaries"],
    skills: ["attune through breathing and attention","observe the body before and after practice","create a simple protective visualisation","record observations in a practice journal"],
    result: "The student completes the first step with an initial sense of the system, a basic feeling of support and a repeatable gentle practice."
  },
  "RY-L01-S02": {
    intro: "The second step combines cleansing with money-flow activation: first releasing what feels excessive, then directing attention toward stability, opportunities and resource.",
    meaning: "The step links material themes with inner order, clear intention and the capacity to receive without unnecessary inner resistance.",
    opens: ["release of accumulated tension","the relationship between inner order and material resource","a clearer intention around prosperity","greater comfort with receiving support and payment"],
    skills: ["use a short cleansing practice","formulate a material intention without pressure","notice blocks around receiving","finish practice with grounding"],
    result: "The student gains a simple framework for cleansing and for observing how attention, resource and material goals interact."
  },
  "RY-L01-S03": {
    intro: "The third step explores predestination and personal power: what already feels inherent, where the path seems to lead and how to act without forcing oneself.",
    meaning: "The purpose is to connect personal strength with a sense of direction so that intention becomes grounded action rather than strain.",
    opens: ["awareness of one's current direction","contact with personal power","recognition of repeating patterns","energy for choice and movement"],
    skills: ["ask a focused question about direction in meditation","distinguish inner strength from tense control","work with the image of a path or tree of destiny","turn an insight into a small action"],
    result: "The student develops a clearer sense of direction and a calmer way to mobilise personal power."
  },
  "RY-L01-S04": {
    intro: "The fourth step is devoted to extrasensory vision: subtle perception, imagery and attentive observation of symbols and inner pictures.",
    meaning: "The purpose is to develop sensitivity in a structured way so that impressions can be observed, questioned and compared rather than accepted automatically.",
    opens: ["subtle perception of images and states","distinguishing intuition from imagination","attention to symbols and inner imagery","deeper engagement with practice"],
    skills: ["observe and record imagery","ask clarifying questions of an inner image","compare impressions with bodily state","stay grounded when sensitivity increases"],
    result: "The student becomes more confident with imagery and symbolic perception while retaining grounding and critical reflection."
  },
  "RY-L01-S05": {
    intro: "The fifth step integrates the basic cycle into a master-level foundation: health, cleansing, protection, power and vision are brought together into one practice framework.",
    meaning: "The purpose is to move from separate exercises toward a stable practitioner position with flow, boundaries and responsibility.",
    opens: ["integration of the basic cycle","a master-level practitioner position","responsibility for one's own practice field","readiness for further training"],
    skills: ["combine practices into a sequence","assess state before and after practice","maintain clear boundaries when helping others","formulate a personal practice code"],
    result: "The student completes the Basic Course with a structured foundation and readiness to continue into the Instructor Course."
  }
};

function genericEnglishSource(level: CurriculumLevel, step: CurriculumStep): SourceText {
  const levelTitle = level.title.en;
  const stepTitle = step.title.en;
  return {
    intro: `${stepTitle} is Step ${step.number} of ${levelTitle}. The current canonical knowledge base presents this as a learner-facing framework for the topic and marks the explanatory copy for continued review against the author's method materials.`,
    meaning: `The purpose of this step is to introduce ${stepTitle}, place it in the wider Reiki Yggdrasil path and turn the theme from an abstract idea into regular practice, observation and personal experience.`,
    opens: [
      `a basic understanding of ${stepTitle}`,
      "a connection between the topic and personal practice",
      "a new layer of attention to energy, state and intention",
      "a transition from theory into careful practical exploration"
    ],
    skills: [
      "prepare before practice and finish with grounding",
      "keep a journal of sensations, imagery and observations",
      "distinguish stable experience from random impressions",
      "work gradually, without overload or promises of instant results"
    ],
    result: `The student receives a practical map of ${stepTitle}, understands what to train next and can continue with a clearer focus.`
  };
}

function localizedSource(locale: PublicLocale, level: CurriculumLevel, step: CurriculumStep): SourceText {
  if (locale === "ru") return step.sourceText;
  if (level.id === 1 && levelOneEnglish[step.id]) return levelOneEnglish[step.id];
  return genericEnglishSource(level, step);
}

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

function SourceList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="yggdrasil-key-list">
      <h5>{title}</h5>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

function StepDetail({ locale, level, step }: { locale: PublicLocale; level: CurriculumLevel; step: CurriculumStep }) {
  const text = copy[locale];
  const source = localizedSource(locale, level, step);
  const videos = step.video?.videos?.filter((video) => Boolean(video.youtubeId)) ?? [];
  const labels = {
    en: {
      key: "Key information",
      outcome: "What you get",
      attunements: "Attunements in this step",
      full: "Full attunement descriptions & video lectures",
      fullLead: "Open only if you want the detailed source material, individual attunement descriptions and videos.",
    },
    ru: {
      key: "Главное о ступени",
      outcome: "Результат",
      attunements: "Настройки этой ступени",
      full: "Полные описания настроек и видеолекции",
      fullLead: "Открывайте только если нужны подробные описания каждой настройки и видео.",
    },
    es: {
      key: "Información clave",
      outcome: "Resultado",
      attunements: "Sintonizaciones de esta etapa",
      full: "Descripciones completas y videoclases",
      fullLead: "Ábrelo solo si necesitas el material detallado, las sintonizaciones y los videos.",
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
        <p className="homeopathy-kicker">{labels.key}</p>
        <p className="yggdrasil-step-intro">{source.intro}</p>

        <div className="yggdrasil-step-key-grid">
          <section className="yggdrasil-step-key-block">
            <h4>{text.meaning}</h4>
            <p>{source.meaning}</p>
          </section>
          <section className="yggdrasil-step-key-block yggdrasil-step-key-block--result">
            <h4>{labels.outcome}</h4>
            <p>{source.result}</p>
          </section>
          <SourceList title={text.opens} items={source.opens} />
          <SourceList title={text.skills} items={source.skills} />
        </div>

        <section className="yggdrasil-attunement-summary">
          <div className="yggdrasil-section-heading">
            <h4>{labels.attunements}</h4>
            <span>{step.settings.length}</span>
          </div>
          <div className="yggdrasil-attunement-chips">
            {step.settings.map((setting) => {
              const localized = localizedSetting(locale, setting);
              return <span key={setting.id}>{localized.title}</span>;
            })}
          </div>
        </section>

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

            <section className="yggdrasil-videos-section">
              <div className="yggdrasil-section-heading"><h4>{text.videos}</h4><span>{videos.length}</span></div>
              {videos.length ? (
                <div className="yggdrasil-video-grid">
                  {videos.map((video, index) => (
                    <AcademyVideoPlayer
                      key={video.youtubeId}
                      youtubeId={video.youtubeId!}
                      title={locale === "ru" ? video.title + (video.label ? " — " + video.label : "") : `${step.title[locale]} — ${text.videos} ${index + 1}`}
                    />
                  ))}
                </div>
              ) : <p className="yggdrasil-no-video">{text.noVideo}</p>}
            </section>
          </div>
        </details>
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

  return (
    <section className="yggdrasil-curriculum" aria-labelledby="yggdrasil-curriculum-title">
      <div className="yggdrasil-curriculum-intro">
        <p className="homeopathy-kicker">{text.eyebrow}</p>
        <h2 id="yggdrasil-curriculum-title">{selected ? selected.title[locale] : text.title}</h2>
        <p>{selected ? selected.theme[locale] : text.lead}</p>
        <div className="yggdrasil-source-stats" aria-label="Source coverage">
          <span>{settingsCount} {locale === "ru" ? "настроек" : locale === "es" ? "sintonizaciones" : "attunements"}</span>
          <span>{videosCount} {locale === "ru" ? "видеолекций" : locale === "es" ? "videoclases" : "video lectures"}</span>
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
              {level.steps.map((step) => {
                const source = localizedSource(locale, level, step);
                return (
                  <a href={"#" + step.id.toLowerCase()} key={step.id}>
                    <span>{String(step.number).padStart(2, "0")}</span>
                    <strong>{step.title[locale]}</strong>
                    <small>{source.intro}</small>
                  </a>
                );
              })}
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
