"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Camera, ChevronDown,
  CircleUserRound, Coins, Compass, Heart, Home, Leaf, Play, RotateCcw,
  Settings2, ShieldCheck, Sparkles, Target, TestTubeDiagonal, UserRound, Zap,
} from "lucide-react";

import { TaoistTalismanCatalog } from "@/components/taoist-talisman-catalog";
import { TAOIST_TALISMANS } from "@/lib/practitioners/taoist-talismans";
import { recommendSupportContent } from "@/lib/holistic-support/recommendation-engine";
import { HolisticInlineSupportOrder } from "@/components/holistic-inline-support-order";
import type { SupportRequestKind } from "@/components/remote-energy-support-booking";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-mobile.module.css";

export type SupportMobileTopic = "business" | "love" | "energy" | "goals";
export type SupportMobileProgram = "sun" | "reiki" | "energy" | "egypt" | "greek-demeter" | "greek-dionysus" | "maya";

export type SupportMobileVideo = {
  id: string;
  title: string;
  topics: SupportMobileTopic[];
  program: SupportMobileProgram;
  author: "andrey" | "psimaster";
  sourceLanguage: "en" | "ru";
};

type Focus = "energy" | "money" | "relationships" | "goals";
type Choice = "meditation" | "consultation" | "talisman" | "pump";
type Program = "all" | SupportMobileVideo["program"];
type Author = "all" | SupportMobileVideo["author"];
type Theme = "all" | SupportMobileTopic;

const focusOrder: Focus[] = ["energy", "money", "relationships", "goals"];
const programOrder: SupportMobileProgram[] = ["egypt", "greek-demeter", "greek-dionysus", "maya", "sun", "reiki", "energy"];
const ancientPrograms: SupportMobileProgram[] = ["egypt", "greek-demeter", "greek-dionysus", "maya"];
const courseByProgram: Record<SupportMobileProgram, string> = {
  egypt: "egyptian-priesthood/learn",
  "greek-demeter": "videos/greek-mysteries-demeter",
  "greek-dionysus": "videos/greek-mysteries-dionysus",
  maya: "videos/maya-archetypes",
  sun: "videos/strength-protection",
  reiki: "principles-of-energywork",
  energy: "videos/energy-pump-ups",
};
const scoreIcons = { energy: Zap, money: Coins, relationships: Heart, goals: Target };
const choices: { id: Choice; Icon: typeof Play }[] = [
  { id: "meditation", Icon: Play },
  { id: "consultation", Icon: TestTubeDiagonal },
  { id: "talisman", Icon: Sparkles },
  { id: "pump", Icon: RotateCcw },
];
const focusTopics: Record<Focus, SupportMobileTopic> = {
  energy: "energy", money: "business", relationships: "love", goals: "goals",
};
const focusRequest: Record<Focus, string> = {
  energy: "Inner balance and calm", money: "Work and money",
  relationships: "Connection and relationships", goals: "Personal goals and meaning",
};

const copy = {
  en: {
    assessment: "1. Check in with yourself", scoreGuide: "Rate from 1 to 10",
    focusLabel: "Your focus", upload: "Add your photo", replace: "Change your photo",
    photoPrivacy: "Photo stays on this device until you leave.",
    photoError: "Choose a JPG, PNG or WebP photo under 8 MB.",
    recommend: "Find recommendations", recommendCompact: "Find matches", detailed: "Detailed analysis (tests)", toolsTitle: "2. Choose what helps",
    recommendationTitle: "Your personalized selection", recommendationWhy: "Based on your chosen focus and self-rating, not a diagnosis.",
    recommendationVideo: "Video for your focus", recommendationTalisman: "Optional symbolic talisman",
    seeVideo: "View video", seeTalisman: "See in catalog", symbolicNote: "A symbol for reflection, not a promised result.",
    recommendationFallback: "No exact recording is published for this topic; this is a related option.",
    foci: { energy: "Energy", money: "Money", relationships: "Relationships", goals: "Goals" },
    options: { meditation: "Meditation", consultation: "Test or consultation", talisman: "Talisman", pump: "Energy practice" },
    optionsCompact: { meditation: "Meditation", consultation: "Test / call", talisman: "Talisman", pump: "Energy" },
    master: "Teacher", program: "Program", theme: "Topic", all: "All",
    authorAndrey: "Andrey Litvinov", authorPs: "PsiMaster",
    programs: { sun: "Sun practices", reiki: "Reiki meditations", energy: "Energy archive", egypt: "Egypt · Osiris (7)", "greek-demeter": "Greece · Demeter (5)", "greek-dionysus": "Greece · Dionysus (7)", maya: "Maya & Aztec (6)" },
    programShort: { sun: "Sun", reiki: "Reiki", energy: "Energy", egypt: "Osiris", "greek-demeter": "Demeter", "greek-dionysus": "Dionysus", maya: "Maya" },
    themes: { all: "All topics", business: "Work & money", love: "Relationships", energy: "Energy", goals: "Goals / Meaning" },
    themeShort: { all: "All", business: "Money", love: "Love", energy: "Energy", goals: "Goals" },
    previousVideos: "Previous", nextVideos: "Next", openCourse: "Open full course", allMagicCourses: "Mysteries & symbolic courses",
    heroTitle: { energy: "Restore your energy", money: "Make space for clarity", relationships: "Reconnect with yourself", goals: "Focus on your direction" },
    heroIntro: "Choose an original guided recording and take a quiet moment.",
    play: "Start meditation", originalEn: "Original English audio", originalRu: "Original Russian audio",
    youtube: "Open on YouTube", seeAll: "View all", gallery: "More original meditations", galleryHint: "Four verified recordings, where available. Themes are browsing hints, not treatment claims.",
    notAvailable: "No verified recordings match those filters. Try All.",
    testsTitle: "Explore your situation", testsIntro: "Choose a self-check or send a personal enquiry through the existing secure flows.",
    tests: "Open free tests", consult: "Request a consultation", consultNote: "Sending a request is not a confirmed booking or payment.",
    talismansTitle: "Choose a symbolic talisman", talismansIntro: "Explore the existing illustrated catalogue; the practitioner confirms any custom order and price.",
    energyTitle: "Energy practices", energyIntro: "Watch a verified recording or ask a practitioner about optional complementary support.",
    energyAction: "Request a practitioner", energyHide: "Close request", energyNote: "A personal request is not a confirmed session or payment.",
    progress: "Your progress", started: "Videos opened here", focusStatus: "Selected focus",
    private: "Private on this page", privateInfo: "Sliders, photo and viewing history are not sent to a server or saved to your account.",
    newUi: "Mobile support experience", standard: "Standard Support page", navHome: "Home", navPractices: "My practices", navProgress: "My progress", navSettings: "Settings",
    settings: "Languages & privacy", language: "Language", close: "Close settings",
    healthNote: "These are reflective practices, not medical diagnoses or treatment.",
  },
  ru: {
    assessment: "1. Оцени себя сейчас", scoreGuide: "Поставь баллы от 1 до 10",
    focusLabel: "Выбранный фокус", upload: "Добавить фото", replace: "Изменить фото",
    photoPrivacy: "Фото остаётся только на этом устройстве.",
    photoError: "Выберите JPG, PNG или WebP до 8 МБ.",
    recommend: "Подобрать рекомендации", recommendCompact: "Подобрать", detailed: "Детальный анализ (тесты)", toolsTitle: "2. Выбери, что поможет",
    recommendationTitle: "Ваш персональный подбор", recommendationWhy: "По выбранной теме и вашей оценке, не медицинский вывод.",
    recommendationVideo: "Видео по вашему запросу", recommendationTalisman: "Символический талисман по желанию",
    seeVideo: "Смотреть видео", seeTalisman: "Посмотреть в каталоге", symbolicNote: "Символ для размышления, без обещания результата.",
    recommendationFallback: "Точного видео по теме пока нет: предложена близкая авторская запись.",
    foci: { energy: "Энергия", money: "Деньги", relationships: "Отношения", goals: "Цели" },
    options: { meditation: "Медитация", consultation: "Тест или консультация", talisman: "Талисман", pump: "Энергоподкачка" },
    optionsCompact: { meditation: "Медитация", consultation: "Тест / сессия", talisman: "Талисман", pump: "Энерго-подкачка" },
    master: "Мастер", program: "Программа", theme: "Тема", all: "Все",
    authorAndrey: "Андрей Литвинов", authorPs: "PsiMaster",
    programs: { sun: "Практики Солнца", reiki: "Медитации Рейки", energy: "Энергоархив", egypt: "Египет · Осирис (7)", "greek-demeter": "Греция · Деметра (5)", "greek-dionysus": "Греция · Дионис (7)", maya: "Майя и ацтеки (6)" },
    programShort: { sun: "Солнце", reiki: "Рейки", energy: "Энергия", egypt: "Осирис", "greek-demeter": "Деметра", "greek-dionysus": "Дионис", maya: "Майя" },
    themes: { all: "Все темы", business: "Деньги и дело", love: "Отношения", energy: "Энергия", goals: "Цели / Смысл" },
    themeShort: { all: "Все", business: "Деньги", love: "Отношения", energy: "Энергия", goals: "Цели" },
    previousVideos: "Назад", nextVideos: "Далее", openCourse: "Открыть весь курс", allMagicCourses: "Мистерии и магические курсы",
    heroTitle: { energy: "Восстанови свою энергию", money: "Найди ясность в решениях", relationships: "Вернись к себе", goals: "Сосредоточься на цели" },
    heroIntro: "Выбери оригинальную запись и удели себе немного времени.",
    play: "Начать медитацию", originalEn: "Оригинальный звук: английский", originalRu: "Оригинальный звук: русский",
    youtube: "Открыть на YouTube", seeAll: "Все видео", gallery: "Другие медитации", galleryHint: "До четырёх проверенных записей. Темы помогают искать практики, но не означают лечение.",
    notAvailable: "По этим фильтрам нет подтверждённых записей. Выберите «Все».",
    testsTitle: "Исследуй свой запрос", testsIntro: "Пройди бесплатный тест или запроси консультацию через действующий кабинет.",
    tests: "Пройти тесты", consult: "Запросить консультацию", consultNote: "Заявка — ещё не подтверждённая запись и не оплата.",
    talismansTitle: "Выбери символический талисман", talismansIntro: "Используем существующий каталог. Изготовление и цену мастер подтверждает отдельно.",
    energyTitle: "Практики для энергии", energyIntro: "Посмотри авторские видеозаписи или запроси дополнительную поддержку мастера.",
    energyAction: "Подобрать мастера", energyHide: "Закрыть заявку", energyNote: "Запрос ещё не означает запись или оплату.",
    progress: "Твой прогресс", started: "Видео открыто здесь", focusStatus: "Текущий фокус",
    private: "Лично на этом экране", privateInfo: "Шкалы, фото и история просмотра не отправляются на сервер и не сохраняются в кабинете.",
    newUi: "Мобильная поддержка", standard: "Обычная страница поддержки", navHome: "Главная", navPractices: "Мои практики", navProgress: "Мой прогресс", navSettings: "Настройки",
    settings: "Язык и приватность", language: "Язык", close: "Закрыть настройки",
    healthNote: "Это практики для рефлексии, не медицинская диагностика или лечение.",
  },
  es: {
    assessment: "1. Evalúa cómo estás", scoreGuide: "Puntúa del 1 al 10",
    focusLabel: "Tu enfoque", upload: "Añadir foto", replace: "Cambiar foto",
    photoPrivacy: "Tu foto se queda solo en este dispositivo.",
    photoError: "Selecciona JPG, PNG o WebP de hasta 8 MB.",
    recommend: "Buscar recomendaciones", recommendCompact: "Recomendar", detailed: "Análisis detallado (tests)", toolsTitle: "2. Elige lo que te ayuda",
    recommendationTitle: "Tu selección personal", recommendationWhy: "Según tu enfoque y valoración, no es un diagnóstico.",
    recommendationVideo: "Vídeo para tu objetivo", recommendationTalisman: "Talismán simbólico opcional",
    seeVideo: "Ver vídeo", seeTalisman: "Ver en el catálogo", symbolicNote: "Un símbolo para reflexionar, sin prometer resultados.",
    recommendationFallback: "No hay un vídeo exacto para este tema; se muestra una grabación relacionada.",
    foci: { energy: "Energía", money: "Dinero", relationships: "Relaciones", goals: "Metas" },
    options: { meditation: "Meditación", consultation: "Test o consulta", talisman: "Talismán", pump: "Práctica energética" },
    optionsCompact: { meditation: "Meditación", consultation: "Test / sesión", talisman: "Talismán", pump: "Energía" },
    master: "Guía", program: "Programa", theme: "Tema", all: "Todos",
    authorAndrey: "Andrey Litvinov", authorPs: "PsiMaster",
    programs: { sun: "Prácticas del Sol", reiki: "Meditaciones Reiki", energy: "Archivo energético", egypt: "Egipto · Osiris (7)", "greek-demeter": "Grecia · Deméter (5)", "greek-dionysus": "Grecia · Dioniso (7)", maya: "Maya y aztecas (6)" },
    programShort: { sun: "Sol", reiki: "Reiki", energy: "Energía", egypt: "Osiris", "greek-demeter": "Deméter", "greek-dionysus": "Dioniso", maya: "Maya" },
    themes: { all: "Todos los temas", business: "Trabajo y dinero", love: "Relaciones", energy: "Energía", goals: "Metas / Sentido" },
    themeShort: { all: "Todos", business: "Dinero", love: "Relaciones", energy: "Energía", goals: "Metas" },
    previousVideos: "Anterior", nextVideos: "Siguiente", openCourse: "Abrir curso completo", allMagicCourses: "Misterios y cursos simbólicos",
    heroTitle: { energy: "Recupera tu energía", money: "Encuentra claridad", relationships: "Vuelve a ti", goals: "Enfoca tu camino" },
    heroIntro: "Elige una grabación original y disfruta de un momento de calma.",
    play: "Empezar meditación", originalEn: "Audio original en inglés", originalRu: "Audio original en ruso",
    youtube: "Abrir en YouTube", seeAll: "Ver todas", gallery: "Otras meditaciones", galleryHint: "Hasta cuatro grabaciones verificadas. Los temas son ayudas para explorar, no tratamientos.",
    notAvailable: "No hay vídeos verificados para esos filtros. Elige Todos.",
    testsTitle: "Explora tu situación", testsIntro: "Haz un test gratuito o solicita una consulta mediante las opciones existentes.",
    tests: "Abrir tests", consult: "Solicitar consulta", consultNote: "Una solicitud no es una reserva ni un pago.",
    talismansTitle: "Elige un talismán simbólico", talismansIntro: "Catálogo ilustrado existente; el profesional confirma disponibilidad y precio.",
    energyTitle: "Prácticas energéticas", energyIntro: "Mira una grabación verificada o pregunta por apoyo complementario.",
    energyAction: "Buscar profesional", energyHide: "Cerrar solicitud", energyNote: "Solicitar no significa reservar ni pagar.",
    progress: "Tu progreso", started: "Vídeos abiertos aquí", focusStatus: "Enfoque actual",
    private: "Solo en esta pantalla", privateInfo: "Puntuaciones, foto e historial no se envían ni se guardan en tu cuenta.",
    newUi: "Apoyo móvil", standard: "Página de apoyo clásica", navHome: "Inicio", navPractices: "Mis prácticas", navProgress: "Mi progreso", navSettings: "Ajustes",
    settings: "Idioma y privacidad", language: "Idioma", close: "Cerrar ajustes",
    healthNote: "Prácticas de reflexión, no diagnósticos ni tratamientos médicos.",
  },
} as const;


/** Display-only compact labels: full verified recording names remain accessible. */
function shortVideoTitle(title: string, locale: PublicLocale): string {
  if (locale === "ru") {
    const sun = title.match(/Солнц[а-я]*\s*(\d)/i);
    if (sun) return "Солнце " + sun[1];
    if (/Жизненн.*[Сс]ил/i.test(title)) return "Жизненная сила";
    if (/Круг Огня/i.test(title)) return "Круг огня";
    return title.replace(/бесплатная медитация/gi, "").trim();
  }
  return title.replace(/\s*·\s*(?:original English audio|audio original en inglés).*$/i, "");
}

export function HolisticSupportMobile({ locale, videos }: { locale: PublicLocale; videos: SupportMobileVideo[] }) {
  const t = copy[locale];
  const [scores, setScores] = useState<Record<Focus, number>>({ energy: 5, money: 5, relationships: 5, goals: 5 });
  const [focus, setFocus] = useState<Focus>("energy");
  const [choice, setChoice] = useState<Choice>("meditation");
  // Explicit button click freezes a private, local-only recommendation snapshot.
  const [recommendation, setRecommendation] = useState<{ focus: Focus; scores: Record<Focus, number> } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [master, setMaster] = useState<Author>("all");
  const [program, setProgram] = useState<Program>("all");
  const [theme, setTheme] = useState<Theme>("all");
  const [videoPage, setVideoPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [opened, setOpened] = useState<string[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [orderKind, setOrderKind] = useState<SupportRequestKind>("energy");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setPhotoError(t.photoError);
      event.target.value = "";
      return;
    }
    setPhotoError("");
    setPhotoUrl(URL.createObjectURL(file));
    event.target.value = "";
  };

  const recommended = useMemo(() => recommendation
    ? recommendSupportContent({ focus: recommendation.focus, scores: recommendation.scores,
      videos, talismans: TAOIST_TALISMANS, locale }) : null, [recommendation, videos, locale]);
  const recommendedTalisman = TAOIST_TALISMANS.find(item => item.id === recommended?.talismans[0]?.id) ?? null;

  const matchingVideos = useMemo(() => {
    const filtered = videos.filter(video => (master === "all" || video.author === master) &&
      (program === "all" || video.program === program));
    const wanted = theme !== "all" ? theme : choice === "pump" ? "energy" : focusTopics[focus];
    const themed = filtered.filter(video => video.topics.includes(wanted));
    // On Goals / Meaning, feature one real recording from each ancient tradition
    // before offering the remaining episodes. Every lesson remains reachable.
    if (choice !== "pump" && program === "all" && wanted === "goals") {
      const firstOfEach = ancientPrograms
        .map(key => themed.find(video => video.program === key))
        .filter((video): video is SupportMobileVideo => Boolean(video));
      return [...firstOfEach, ...themed.filter(video => !firstOfEach.some(item => item.id === video.id))];
    }
    if (choice === "pump" || theme !== "all" || focus === "goals") return themed;
    if (recommended) {
      const positions = new Map(recommended.videos.map((video, index) => [video.id, index]));
      return filtered.slice().sort((a, b) =>
        (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    }
    return [...themed, ...filtered.filter(video => !video.topics.includes(wanted))];
  }, [videos, master, program, theme, focus, choice, recommended]);
  const totalPages = Math.max(1, Math.ceil(matchingVideos.length / 4));
  const safePage = Math.min(videoPage, totalPages - 1);
  const relevantVideos = matchingVideos.slice(safePage * 4, safePage * 4 + 4);
  const selected = relevantVideos.find(video => video.id === selectedId) ?? relevantVideos[0];
  const sourceAudio = selected?.sourceLanguage === "ru" ? t.originalRu : t.originalEn;
  const videoSrc = selected ? "https://www.youtube-nocookie.com/embed/" +
    encodeURIComponent(selected.id) + "?autoplay=1&playsinline=1&rel=0" : "";
  const pickVideo = (id: string) => { setSelectedId(id); setPlaying(false); };
  const chooseFocus = (value: Focus) => {
    setFocus(value); setRecommendation(null); setSelectedId(null); setPlaying(false);
    setVideoPage(0); setProgram("all"); setMaster("all"); setTheme(value === "goals" ? "goals" : "all");
  };
  const onRecommendations = () => {
    setRecommendation({ focus, scores: { ...scores } });
    setChoice("meditation"); setTheme(focus === "goals" ? "goals" : "all"); setProgram("all"); setMaster("all");
    setVideoPage(0); setSelectedId(null); setPlaying(false);
    // Scroll to the newly rendered choices, not past them to the video player.
    window.requestAnimationFrame(() => document.getElementById("support-personal-recommendations")
      ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };
  const startVideo = () => {
    if (!selected) return;
    setPlaying(true);
    setOpened(previous => previous.includes(selected.id) ? previous : [...previous, selected.id]);
  };
  const changeChoice = (value: Choice) => {
    setChoice(value); setPlaying(false); setSelectedId(null); setVideoPage(0);
    if (value === "pump") { setTheme("energy"); setProgram("all"); }
  };
  const changeProgram = (next: Program) => {
    setProgram(next); setPlaying(false); setSelectedId(null); setVideoPage(0);
    if (next !== "all" && ancientPrograms.includes(next)) { setTheme("goals"); setChoice("meditation"); }
    else if (next === "energy") setTheme("energy");
    else setTheme("all");
  };
  const changeTheme = (next: Theme) => {
    setTheme(next); setProgram("all"); setVideoPage(0);
    if (choice === "pump" && next !== "energy") setChoice("meditation");
    setPlaying(false); setSelectedId(null);
  };
  const activeProgramValues = programOrder.filter(key => videos.some(video => video.program === key));
  const activeAuthorValues = Array.from(new Set(videos.map(video => video.author)));
  const progressCount = matchingVideos.filter(video => opened.includes(video.id)).length;
  const progressTotal = matchingVideos.length;
  const FocusIcon = scoreIcons[focus];
  const scene = choice === "meditation" || choice === "pump";

  return (
    <main className={styles.page} data-holistic-mobile-alternative lang={locale}>
      <div className={styles.container}>
        <header className={styles.compactAppHeader} data-support-app-header>
          <Link href={"/" + locale + "/holistic-support"} prefetch={false} className={styles.compactBrand}>
            <strong>Holistic House</strong>
            <span>{t.newUi}</span>
          </Link>
          <button type="button" className={styles.compactLocale} aria-label={t.settings}
            aria-expanded={settingsOpen} aria-controls="support-mobile-settings"
            onClick={() => setSettingsOpen(open => !open)}>
            {locale.toUpperCase()} <ChevronDown size={16} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.topGrid}>
          <section className={styles.assessment} aria-labelledby="mobile-assessment-title">
            <h1 id="mobile-assessment-title">{t.assessment}</h1>
            <p className={styles.subText}>{t.scoreGuide}</p>
            <div className={styles.scaleList}>
              {focusOrder.map(id => {
                const Icon = scoreIcons[id];
                return <label className={styles.scaleRow} key={id} data-support-scale={id}>
                  <span className={styles.scaleIcon} data-tone={id}><Icon size={23} aria-hidden="true" /></span>
                  <span className={styles.scaleDetail}>
                    <span className={styles.scaleLabel}>{t.foci[id]}</span>
                    <input type="range" min="1" max="10" step="1" value={scores[id]}
                      aria-label={t.foci[id]} aria-valuetext={scores[id] + " / 10"}
                      onChange={event => { setRecommendation(null); setScores(previous => ({ ...previous, [id]: Number(event.target.value) })); }} />
                  </span>
                  <output className={styles.scaleValue} data-tone={id}>{scores[id]}</output>
                </label>;
              })}
            </div>
            <Link href={"/" + locale + "/personality-profiles"} prefetch={false}
              className={styles.detailedAnalysisLink} data-support-detailed-analysis>
              <BarChart3 size={18} aria-hidden="true" />{t.detailed}<ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>

          <section className={styles.profile} aria-label={t.focusLabel}>
            <label className={styles.photo} title={photoUrl ? t.replace : t.upload} data-support-photo>
              {photoUrl ? <Image alt="" src={photoUrl} width={176} height={176} unoptimized className={styles.photoPreview} /> :
                <span className={styles.photoPlaceholder}><CircleUserRound size={63} strokeWidth={1.15} aria-hidden="true" /><strong>{t.upload}</strong></span>}
              <span className={styles.camera}><Camera size={20} aria-hidden="true" /></span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto}
                aria-label={photoUrl ? t.replace : t.upload} className={styles.fileInput} />
            </label>
            {photoError ? <p className={styles.photoError} role="alert">{photoError}</p> : null}
            <label className={styles.focusSelector}>
              <span className={styles.focusCaption}>{t.focusLabel}</span>
              <span className={styles.focusValue}><FocusIcon size={22} aria-hidden="true" />
                <select value={focus} onChange={event => chooseFocus(event.target.value as Focus)}
                  aria-label={t.focusLabel}>
                  {focusOrder.map(id => <option key={id} value={id}>{t.foci[id]}</option>)}
                </select><ChevronDown size={18} aria-hidden="true" />
              </span>
            </label>
            <button type="button" className={styles.recommendButton} onClick={onRecommendations} data-support-recommendations aria-label={t.recommend}>
              <Sparkles size={21} aria-hidden="true" /><span className={styles.recommendLong}>{t.recommend}</span><span className={styles.recommendShort}>{t.recommendCompact}</span>
            </button>
          </section>

          <section className={styles.tools} aria-labelledby="mobile-tools-title" id="support-tools">
            <h2 id="mobile-tools-title">{t.toolsTitle}</h2>
            <div className={styles.toolGrid}>
              {choices.map(({ id, Icon }) => (
                <button key={id} type="button" data-support-tool={id}
                  className={styles.toolButton} aria-pressed={choice === id}
                  onClick={() => changeChoice(id)} aria-label={t.options[id]}>
                  <Icon size={30} strokeWidth={1.65} aria-hidden="true" />
                  <span className={styles.toolLong}>{t.options[id]}</span><span className={styles.toolCompact}>{t.optionsCompact[id]}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {recommendation ? <section id="support-personal-recommendations" className={styles.recommendationPanel} data-support-personal-recommendations
          aria-label={t.recommendationTitle} aria-live="polite">
          <div className={styles.recommendationLead}>
            <h2><Sparkles size={21} aria-hidden="true" />{t.recommendationTitle}</h2>
            <p>{t.foci[recommendation.focus]}: {recommendation.scores[recommendation.focus]}/10. {t.recommendationWhy}</p>
          </div>
          <div className={styles.recommendationGrid}>
            {recommended?.videos[0] ? <article className={styles.recommendationCard} data-support-recommended-video={recommended.videos[0].id}>
              <div className={styles.recommendationVideoPreview}>
                <Image alt="" src={"https://i.ytimg.com/vi/" + encodeURIComponent(recommended.videos[0].id) + "/mqdefault.jpg"}
                  width={144} height={81} loading="lazy" unoptimized />
              </div>
              <div className={styles.recommendationCopy}>
                <strong>{t.recommendationVideo}</strong>
                <span>{recommended.videos[0].title}</span>
                {!recommended.matchedVideo ? <small>{t.recommendationFallback}</small> : null}
                <button type="button" onClick={() => {
                  const target = videos.find(item => item.id === recommended.videos[0].id);
                  const isGoals = recommendation.focus === "goals";
                  const targetProgram = isGoals && target ? target.program : "all";
                  const position = targetProgram === "all" ? 0 : videos
                    .filter(item => item.program === targetProgram && item.topics.includes("goals"))
                    .findIndex(item => item.id === target?.id);
                  setChoice("meditation"); setTheme(isGoals ? "goals" : "all");
                  setProgram(targetProgram); setMaster("all");
                  setVideoPage(Math.max(0, Math.floor(position / 4)));
                  pickVideo(recommended.videos[0].id);
                  document.getElementById("support-mobile-experience")?.scrollIntoView({ block: "start" });
                }}>{t.seeVideo}<ArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </article> : null}
            {recommendedTalisman ? <article className={styles.recommendationCard} data-support-recommended-talisman={recommendedTalisman.id}>
              <Image className={styles.recommendationTalismanImage} src={recommendedTalisman.image}
                alt={recommendedTalisman[locale].title} width={92} height={112} />
              <div className={styles.recommendationCopy}>
                <strong>{t.recommendationTalisman}</strong>
                <span>{recommendedTalisman[locale].title}</span>
                <small>{t.symbolicNote}</small>
                <button type="button" onClick={() => {
                  changeChoice("talisman");
                  document.getElementById("support-mobile-experience")?.scrollIntoView({ block: "start" });
                }}>{t.seeTalisman}<ArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </article> : null}
          </div>
          <Link href={"/" + locale + "/personality-profiles"} prefetch={false}
            className={styles.detailedAnalysisLink} data-support-recommended-detailed-analysis>
            <BarChart3 size={18} aria-hidden="true" />{t.detailed}<ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section> : null}

        <section className={styles.experience} id="support-mobile-experience" aria-live="off">
          {scene ? (
            <>
              <div className={styles.hero} data-support-player data-playing={playing ? "true" : "false"}>
                {!playing ? <Image className={styles.heroBackdrop} src="/images/holistic-house/reiki-approved-sunrise-v3.webp"
                  alt="" fill priority sizes="(max-width: 640px) 100vw, 1100px" /> : null}
                {!playing ? <div className={styles.heroShade} aria-hidden="true" /> : null}
                <div className={styles.heroFilters} role="group" aria-label={t.gallery}>
                  <span className={styles.heroMode} data-support-mode><Play size={19} aria-hidden="true" />{t.options[choice]}</span>
                  <label className={styles.heroFilter} data-support-filter="master"><UserRound size={18} aria-hidden="true" /><span>{t.master}</span>
                    <strong className={styles.filterValue}>{master === "all" ? t.all : master === "andrey" ? t.authorAndrey : t.authorPs}</strong>
                    <select value={master} aria-label={t.master} onChange={event => { setMaster(event.target.value as Author); setPlaying(false); setSelectedId(null); }}>
                      <option value="all">{t.all}</option>
                      {activeAuthorValues.map(author => <option key={author} value={author}>{author === "andrey" ? t.authorAndrey : t.authorPs}</option>)}
                    </select><ChevronDown size={14} aria-hidden="true" />
                  </label>
                  <label className={styles.heroFilter} data-support-filter="program"><BookOpen size={18} aria-hidden="true" /><span>{t.program}</span>
                    <strong className={styles.filterValue}>{program === "all" ? t.all : t.programShort[program]}</strong>
                    <select value={program} aria-label={t.program} onChange={event => changeProgram(event.target.value as Program)}>
                      <option value="all">{t.all}</option>
                      {activeProgramValues.map(key => <option key={key} value={key}>{t.programs[key]}</option>)}
                    </select><ChevronDown size={14} aria-hidden="true" />
                  </label>
                  <label className={styles.heroFilter} data-support-filter="theme"><Leaf size={18} aria-hidden="true" /><span>{t.theme}</span>
                    <strong className={styles.filterValue}>{t.themeShort[theme]}</strong>
                    <select value={theme} aria-label={t.theme} onChange={event => changeTheme(event.target.value as Theme)}>
                      {(["all", "business", "love", "energy", "goals"] as Theme[]).map(key =>
                        <option key={key} value={key}>{t.themes[key]}</option>)}
                    </select><ChevronDown size={14} aria-hidden="true" />
                  </label>
                </div>
                {playing && selected ? <div className={styles.iframeWrap}>
                  <iframe key={selected.id} src={videoSrc} title={selected.title}
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen loading="eager" />
                </div> : (
                  <div className={styles.heroBody}>
                    <span className={styles.videoOriginal}><ShieldCheck size={17} aria-hidden="true" />{sourceAudio}</span>
                    <h2>{choice === "pump" ? t.energyTitle : t.heroTitle[theme === "goals" ? "goals" : focus]}</h2>
                    <p className={styles.heroDescription}>{selected ? selected.title : t.heroIntro}</p>
                    {selected ? <button type="button" onClick={startVideo} className={styles.playButton}
                      data-support-play><Play size={28} fill="currentColor" aria-hidden="true" />{t.play}</button> :
                      <p role="status" className={styles.noVideo}>{t.notAvailable}</p>}
                  </div>
                )}
              </div>
              <div className={styles.videoSection}>
                <div className={styles.videoHeading}>
                  <h3>{choice === "pump" ? t.energyTitle : t.gallery} <span>· {theme === "all" ? t.foci[focus] : t.themes[theme]}</span></h3>
                  <Link href={"/" + locale + "/holistic-support#meditation-practices"} prefetch={false} className={styles.seeAll}>{t.seeAll}<ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                {relevantVideos.length > 0 ? (
                  <div className={styles.videoGrid} role="group" aria-label={t.gallery}>
                    {relevantVideos.map(video => <button type="button" key={video.id}
                      className={styles.videoCard} aria-pressed={selected?.id === video.id}
                      data-support-video={video.id} onClick={() => pickVideo(video.id)} aria-label={video.title}>
                      <Image src={"https://i.ytimg.com/vi/" + encodeURIComponent(video.id) + "/mqdefault.jpg"}
                        alt="" width={320} height={180} unoptimized loading="lazy" />
                      <span className={styles.videoDark} aria-hidden="true" />
                      <span className={styles.thumbnailPlay}><Play size={20} fill="currentColor" aria-hidden="true" /></span>
                      <span className={styles.videoTitle}>{shortVideoTitle(video.title, locale)}</span>
                    </button>)}
                  </div>
                ) : <p role="status" className={styles.emptyMessage}>{t.notAvailable}</p>}
                {totalPages > 1 ? <div className={styles.videoPager} data-support-video-pager aria-label={t.gallery}>
                  <button type="button" disabled={safePage === 0} onClick={() => {
                    setVideoPage(Math.max(0, safePage - 1)); setSelectedId(null); setPlaying(false);
                  }}>{t.previousVideos}</button>
                  <span>{safePage + 1} / {totalPages}</span>
                  <button type="button" disabled={safePage + 1 >= totalPages} onClick={() => {
                    setVideoPage(Math.min(totalPages - 1, safePage + 1)); setSelectedId(null); setPlaying(false);
                  }}>{t.nextVideos}</button>
                </div> : null}
                {(theme === "goals" || focus === "goals" || (program !== "all" && ancientPrograms.includes(program))) ?
                  <div className={styles.academyLinks} data-support-magical-courses>
                    {program !== "all" ?
                      <Link href={"/" + locale + "/academy/" + courseByProgram[program]} prefetch={false}>
                        {t.openCourse}<ArrowRight size={16} aria-hidden="true" />
                      </Link> :
                      <Link href={"/" + locale + "/academy/mysteries"} prefetch={false}>
                        {t.allMagicCourses}<ArrowRight size={16} aria-hidden="true" />
                      </Link>}
                  </div> : null}
                <p className={styles.videoHint}>{t.galleryHint}</p>
                {selected ? <a className={styles.youtubeLink} href={"https://www.youtube.com/watch?v=" + encodeURIComponent(selected.id)}
                  target="_blank" rel="noopener noreferrer">{t.youtube} <ArrowRight size={18} aria-hidden="true" /></a> : null}
              </div>
              {choice === "pump" ? <div className={styles.supportEnquiry}>
                <p>{t.energyIntro}</p>
                <button type="button" className={styles.secondaryButton}
                  aria-expanded={requestOpen} aria-controls="support-mobile-master-request"
                  onClick={() => setRequestOpen(open => !open)}>{requestOpen ? t.energyHide : t.energyAction}</button>
                {requestOpen ? <div id="support-mobile-master-request">
                  <HolisticInlineSupportOrder locale={locale} kind={orderKind} initialGoal={focusRequest[focus]}
                    onKindChange={setOrderKind} onClose={() => setRequestOpen(false)} />
                </div> : null}
                <small>{t.energyNote}</small>
              </div> : null}
            </>
          ) : choice === "talisman" ? (
            <div className={styles.insetPanel}>
              <div className={styles.insetIntro}><Sparkles size={33} aria-hidden="true" />
                <div><h2>{t.talismansTitle}</h2><p>{t.talismansIntro}</p></div></div>
              <TaoistTalismanCatalog locale={locale} featuredId={recommendedTalisman?.id} rankedIds={recommended?.talismans.map(item => item.id)} />
            </div>
          ) : (
            <div className={styles.insetPanel}>
              <div className={styles.insetIntro}><TestTubeDiagonal size={33} aria-hidden="true" />
                <div><h2>{t.testsTitle}</h2><p>{t.testsIntro}</p></div></div>
              <div className={styles.consultOptions}>
                <Link href={"/" + locale + "/personality-profiles"} prefetch={false}><BarChart3 size={27} aria-hidden="true" /><span>{t.detailed}</span><ArrowRight size={22} aria-hidden="true" /></Link>
                <Link href={"/" + locale + "/coaching"} prefetch={false}><UserRound size={27} aria-hidden="true" /><span>{t.consult}</span><ArrowRight size={22} aria-hidden="true" /></Link>
              </div>
              <p className={styles.consultNote}>{t.consultNote}</p>
            </div>
          )}
        </section>

        <section className={styles.progressPanel} id="support-progress" aria-labelledby="support-mobile-progress-heading">
          <h2 id="support-mobile-progress-heading">{t.progress}</h2>
          <div className={styles.progressGrid}>
            <div className={styles.progressRing} style={{ "--support-completion": (progressTotal ? (progressCount / progressTotal) * 100 : 0) + "%" } as CSSProperties}>
              <strong>{progressCount}/{progressTotal}</strong>
            </div>
            <div><strong>{t.started}</strong><span>{t.private}</span></div>
            <div className={styles.progressFocus}><FocusIcon size={27} aria-hidden="true" /><strong>{t.foci[focus]}</strong><span>{t.focusStatus}</span></div>
          </div>
          <p className={styles.privacyNote}><ShieldCheck size={18} aria-hidden="true" />{t.privateInfo}</p>
        </section>
        <footer className={styles.disclaimer}>
          <p>{t.healthNote}</p>
          <Link href={"/" + locale + "/holistic-support"} prefetch={false}>{t.standard} <ArrowRight size={16} aria-hidden="true" /></Link>
        </footer>
      </div>

      {settingsOpen ? <section className={styles.settingsPanel} id="support-mobile-settings" aria-label={t.settings}>
        <h2><Settings2 size={22} aria-hidden="true" />{t.settings}</h2>
        <p>{t.language}</p>
        <div className={styles.localeLinks}>
          {(["en", "ru", "es"] as PublicLocale[]).map(language => <Link key={language}
            href={"/" + language + "/holistic-support/mobile"} hrefLang={language} aria-current={locale === language ? "page" : undefined}>
            {language.toUpperCase()}</Link>)}
        </div>
        <p>{t.privateInfo}</p>
        <button type="button" onClick={() => setSettingsOpen(false)}>{t.close}</button>
      </section> : null}

      <nav className={styles.bottomNav} aria-label={t.newUi} data-support-mobile-bottom-nav>
        <Link href={"/" + locale + "/"} prefetch={false}><Home size={24} aria-hidden="true" /><span>{t.navHome}</span></Link>
        <Link href={"/" + locale + "/app"} prefetch={false}><Compass size={24} aria-hidden="true" /><span>{t.navPractices}</span></Link>
        <a href="#support-progress"><BarChart3 size={24} aria-hidden="true" /><span>{t.navProgress}</span></a>
        <button type="button" aria-expanded={settingsOpen} aria-controls="support-mobile-settings"
          onClick={() => setSettingsOpen(open => !open)}><Settings2 size={24} aria-hidden="true" /><span>{t.navSettings}</span></button>
      </nav>
    </main>
  );
}
