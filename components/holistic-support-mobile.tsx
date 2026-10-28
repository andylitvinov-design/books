"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Camera, ChevronDown, ChevronRight, Filter,
  Coins, Compass, Flower2, HandHeart, Heart, Home, Leaf, Play, RotateCcw,
  Settings2, ShieldCheck, Sparkles, Target, TestTubeDiagonal, UserRound, X, Zap,
} from "lucide-react";

import { TaoistTalismanCatalog } from "@/components/taoist-talisman-catalog";
import { HolisticSupportTalismanViewer } from "@/components/holistic-support-talisman-viewer";
import { HolisticSupportMasterGallery } from "@/components/holistic-support-master-gallery";
import { HolisticSupportGoalFilter, goalSectorFocus, summarizeGoalSelection, type GoalSelection } from "@/components/holistic-support-goal-filter";
import { rankSupportGoalVideos } from "@/lib/holistic-support/goal-filter";
import { TAOIST_TALISMANS } from "@/lib/practitioners/taoist-talismans";
import { pendingBrowserTalismanGoogleReturn } from "@/lib/practitioners/taoist-talisman-cart";
import { recommendSupportByLowestScores, recommendSupportContent } from "@/lib/holistic-support/recommendation-engine";
import type { MeditationTopic } from "@/data/academy/holistic-support-meditations";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-mobile.module.css";

export type SupportMobileVideo = {
  id: string;
  title: string;
  topics: MeditationTopic[];
  program: "sun" | "reiki" | "energy" | "maya" | "egypt" | "greek";
  author: "andrey" | "psimaster";
  sourceLanguage: "en" | "ru";
  // Verified public practitioner profile for this particular recording.
  // Recordings with no confirmed practitioner intentionally show no badge.
  masterProfile?: { slug: string; name: string; image: string };
};

export type SupportMobileCourse = {
  id: "maya" | "egypt" | "greek";
  title: string;
  shortTitle: string;
  poster: string;
  href: string;
  videoCount: number;
  videoGroups: { title: string; href: string; count: number }[];
  videos: SupportMobileVideo[];
};

type Focus = "energy" | "money" | "relationships" | "goals";
type Choice = "meditation" | "consultation" | "talisman" | "pump" | "healing" | "masters";
type Program = "all" | SupportMobileVideo["program"];
type Author = "all" | SupportMobileVideo["author"];
type Theme = "all" | MeditationTopic;

const focusOrder: Focus[] = ["energy", "money", "relationships", "goals"];
const scoreIcons = { energy: Zap, money: Coins, relationships: Heart, goals: Target };
const choices: { id: Choice; Icon: typeof Play }[] = [
  { id: "meditation", Icon: Play },
  { id: "consultation", Icon: TestTubeDiagonal },
  { id: "talisman", Icon: Sparkles },
  { id: "pump", Icon: RotateCcw },
  { id: "healing", Icon: HandHeart },
];

const copy = {
  en: {
    assessment: "1. Check in with yourself", assessmentShort: "1. Check-in", toolsShort: "2. Support", scoreGuide: "Rate from 1 to 10",
    focusLabel: "Your focus", focusLabelShort: "Focus", upload: "Add your photo", replace: "Change your photo", videoMandala: "Video mandala",
    photoPrivacy: "Photo stays on this device until you leave.",
    photoError: "Choose a JPG, PNG or WebP photo under 8 MB.",
    recommend: "Find recommendations", recommendCompact: "Find matches", detailed: "Detailed analysis (tests)", detailedCompact: "Tests", toolsTitle: "2. Choose what helps",
    goalFilter: "Goal filter", goalAdjust: "Change", goalClear: "Clear",
    goalResultsTitle: "Selected for your goal", goalResultsNote: "Explore relevant published options. This is not a diagnosis, guaranteed outcome or confirmed booking.",
    goalResultLabels: { meditation: "Meditations", tests: "Tests", courses: "Courses", talismans: "Talismans", masters: "Masters" },
    goalResultHints: { meditation: "Original recordings", tests: "Free self-exploration", courses: "Existing learning paths", talismans: "Symbolic options", masters: "Published profiles" },
    goalSector: { energy: "Energy", money: "Money", love: "Love", goals: "Goals", meaning: "Meaning" },
    goalHero: { energy: "Restore your energy", money: "Make room for abundance", love: "Reconnect with love", goals: "Take the next step", meaning: "Find your inner direction" },
    goalMatch: "Published recordings sorted for your chosen theme. This is not a diagnosis.",
    goalRelated: "No recording is labelled specifically for that goal yet; here are related original practices.",
    recommendationTitle: "Your personalized selection", recommendationWhy: "Based on your chosen focus and self-rating, not a diagnosis.",
    recommendationVideo: "Video for your focus", recommendationTalisman: "Optional symbolic talisman",
    seeVideo: "View video", seeTalisman: "See in catalog", symbolicNote: "A symbol for reflection, not a promised result.",
    recommendationFallback: "No exact recording is published for this topic; this is a related option.",
    foci: { energy: "Energy", money: "Money", relationships: "Relationships", goals: "Goals" },
    options: { meditation: "Meditation", consultation: "Test or consultation", talisman: "Talisman", pump: "Courses", healing: "Reiki support", masters: "Masters" },
    optionsCompact: { meditation: "Meditation", consultation: "Test / call", talisman: "Talisman", pump: "Courses", healing: "Reiki support", masters: "Masters" },
    optionsMicro: { meditation: "Video", consultation: "Test", talisman: "Talisman", healing: "Reiki" },
    master: "Teacher", program: "Program", theme: "Topic", all: "All",
    masterProfile: "Open master profile", videoMaster: "Meditation guide",
    authorAndrey: "Andrey Litvinov", authorPs: "PsiMaster",
    programs: { sun: "Sun practices", reiki: "Reiki meditations", energy: "Energy archive", maya: "Maya mysteries", egypt: "Egyptian mysteries", greek: "Greek mysteries" },
    themes: { all: "All topics", business: "Work & money", love: "Relationships", energy: "Energy", health: "Wellbeing" },
    heroTitle: { energy: "Restore your energy", money: "Make space for clarity", relationships: "Reconnect with yourself", goals: "Focus on your direction" },
    heroIntro: "Choose an original guided recording and take a quiet moment.",
    play: "Start meditation", originalEn: "Original English audio", originalRu: "Original Russian audio",
    youtube: "Open on YouTube", seeAll: "View all", gallery: "More original meditations", galleryHint: "Illustrative covers; original verified recordings.", average: "Self-rating", lowestHint: "Lowest ratings:", lowestNote: "Optional topics, not a diagnosis.",
    notAvailable: "No verified recordings match those filters. Try All.",
    testsTitle: "Explore your situation", testsIntro: "Choose a self-check or send a personal enquiry through the existing secure flows.",
    tests: "Open free tests", consult: "Request a consultation", consultNote: "Sending a request is not a confirmed booking or payment.",
    talismansTitle: "Choose a symbolic talisman", talismansIntro: "Explore the existing illustrated catalogue; the practitioner confirms any custom order and price.",
    energyTitle: "Courses & programmes", energyIntro: "Explore original lessons here or continue to the Academy catalogue.",
    coursesAll: "Browse all courses", mastersShort: "Masters", coursesReiki: "Explore Tantra Reiki",
    mysteryCourses: "Original mystery courses", mysterySource: "Russian originals · PsiMaster archive",
    watchLesson: "Watch lesson", openCourse: "Explore course", lessonCount: "videos",
    originalCourseVideos: "Original course recordings",
    healingTitle: "Reiki support", healingIntro: "Find published practitioners or remote energy support services.",
    healingMasters: "Browse masters", healingServices: "Reiki support services",
    energyAction: "Request a practitioner", energyHide: "Close request", energyNote: "A personal request is not a confirmed session or payment.",
    progress: "Your progress", started: "Videos opened here", focusStatus: "Lowest self-rating",
    private: "Private on this page", privateInfo: "Sliders, photo and viewing history are not sent to a server or saved to your account.",
    newUi: "Mobile support experience", standard: "Standard Support page", navHome: "Home", navPractices: "My practices", navProgress: "My progress", navSettings: "Settings",
    settings: "Languages & privacy", language: "Language", close: "Close settings",
    healthNote: "These are reflective practices, not medical diagnoses or treatment.",
  },
  ru: {
    assessment: "1. Оцени себя сейчас", assessmentShort: "1. Оцени себя", toolsShort: "2. Поддержка", scoreGuide: "Поставь баллы от 1 до 10",
    focusLabel: "Выбранный фокус", focusLabelShort: "Фокус", upload: "Добавить фото", replace: "Изменить фото", videoMandala: "Видео-мандала",
    photoPrivacy: "Фото остаётся только на этом устройстве.",
    photoError: "Выберите JPG, PNG или WebP до 8 МБ.",
    recommend: "Подобрать рекомендации", recommendCompact: "Подобрать", detailed: "Детальный анализ (тесты)", detailedCompact: "Тесты", toolsTitle: "2. Выбери, что поможет",
    goalFilter: "Фильтр целей", goalAdjust: "Изменить", goalClear: "Сбросить",
    goalResultsTitle: "Рекомендации по вашему запросу", goalResultsNote: "Выберите доступный материал или услугу. Это не диагноз и не обещание результата или записи.",
    goalResultLabels: { meditation: "Медитации", tests: "Тесты", courses: "Курсы", talismans: "Талисманы", masters: "Мастера" },
    goalResultHints: { meditation: "Авторские записи", tests: "Самоисследование", courses: "Программы обучения", talismans: "Символические практики", masters: "Каталог специалистов" },
    goalSector: { energy: "Энергия", money: "Деньги", love: "Любовь", goals: "Цели", meaning: "Смыслы" },
    goalHero: { energy: "Восстанови свою энергию", money: "Открой новые возможности", love: "Верни близость и тепло", goals: "Двигайся к своей цели", meaning: "Найди внутренний смысл" },
    goalMatch: "Подбор по теме среди опубликованных записей, не медицинский вывод.",
    goalRelated: "Точной записи по этой теме пока нет: показаны близкие оригинальные практики.",
    recommendationTitle: "Ваш персональный подбор", recommendationWhy: "По выбранной теме и вашей оценке, не медицинский вывод.",
    recommendationVideo: "Видео по вашему запросу", recommendationTalisman: "Символический талисман по желанию",
    seeVideo: "Смотреть видео", seeTalisman: "Посмотреть в каталоге", symbolicNote: "Символ для размышления, без обещания результата.",
    recommendationFallback: "Точного видео по теме пока нет: предложена близкая авторская запись.",
    foci: { energy: "Энергия", money: "Деньги", relationships: "Отношения", goals: "Цели" },
    options: { meditation: "Медитация", consultation: "Тест или консультация", talisman: "Талисман", pump: "Курсы", healing: "Рейки поддержка", masters: "Мастера" },
    optionsCompact: { meditation: "Медитация", consultation: "Тест / сессия", talisman: "Талисман", pump: "Курсы", healing: "Рейки поддержка", masters: "Мастера" },
    optionsMicro: { meditation: "Видео", consultation: "Тест", talisman: "Талисман", healing: "Рейки" },
    master: "Мастер", program: "Программа", theme: "Тема", all: "Все",
    masterProfile: "Открыть страницу мастера", videoMaster: "Мастер медитаций",
    authorAndrey: "Андрей Литвинов", authorPs: "PsiMaster",
    programs: { sun: "Практики Солнца", reiki: "Медитации Рейки", energy: "Энергоархив", maya: "Мистерии Майя", egypt: "Мистерии Египта", greek: "Мистерии Греции" },
    themes: { all: "Все темы", business: "Деньги и дело", love: "Отношения", energy: "Энергия", health: "Самочувствие" },
    heroTitle: { energy: "Восстанови свою энергию", money: "Найди ясность в решениях", relationships: "Вернись к себе", goals: "Сосредоточься на цели" },
    heroIntro: "Выбери оригинальную запись и удели себе немного времени.",
    play: "Начать медитацию", originalEn: "Оригинальный звук: английский", originalRu: "Оригинальный звук: русский",
    youtube: "Открыть на YouTube", seeAll: "Все видео", gallery: "Другие медитации", galleryHint: "Обложки — иллюстрации. Записи — оригинальные.", average: "Самооценка", lowestHint: "По минимальным оценкам:", lowestNote: "Подбор тем, не диагноз.",
    notAvailable: "По этим фильтрам нет подтверждённых записей. Выберите «Все».",
    testsTitle: "Исследуй свой запрос", testsIntro: "Пройди бесплатный тест или запроси консультацию через действующий кабинет.",
    tests: "Пройти тесты", consult: "Запросить консультацию", consultNote: "Заявка — ещё не подтверждённая запись и не оплата.",
    talismansTitle: "Выбери символический талисман", talismansIntro: "Используем существующий каталог. Изготовление и цену мастер подтверждает отдельно.",
    energyTitle: "Курсы и программы", energyIntro: "Авторские уроки и действующий каталог Академии.",
    coursesAll: "Все курсы Академии", mastersShort: "Мастера", coursesReiki: "Курс Тантра Рейки",
    mysteryCourses: "Курсы мистерий", mysterySource: "Оригинал на русском · архив PsiMaster",
    watchLesson: "Смотреть урок", openCourse: "Открыть программу", lessonCount: "видео",
    originalCourseVideos: "Оригинальные видеоуроки",
    healingTitle: "Рейки поддержка", healingIntro: "Выберите мастера или действующую услугу дистанционной поддержки.",
    healingMasters: "Каталог мастеров", healingServices: "Услуги Рейки поддержки",
    energyAction: "Подобрать мастера", energyHide: "Закрыть заявку", energyNote: "Запрос ещё не означает запись или оплату.",
    progress: "Твой прогресс", started: "Видео открыто здесь", focusStatus: "Минимальная оценка",
    private: "Лично на этом экране", privateInfo: "Шкалы, фото и история просмотра не отправляются на сервер и не сохраняются в кабинете.",
    newUi: "Мобильная поддержка", standard: "Обычная страница поддержки", navHome: "Главная", navPractices: "Мои практики", navProgress: "Мой прогресс", navSettings: "Настройки",
    settings: "Язык и приватность", language: "Язык", close: "Закрыть настройки",
    healthNote: "Это практики для рефлексии, не медицинская диагностика или лечение.",
  },
  es: {
    assessment: "1. Evalúa cómo estás", assessmentShort: "1. Evalúate", toolsShort: "2. Apoyo", scoreGuide: "Puntúa del 1 al 10",
    focusLabel: "Tu enfoque", focusLabelShort: "Enfoque", upload: "Añadir foto", replace: "Cambiar foto", videoMandala: "Vídeo mandala",
    photoPrivacy: "Tu foto se queda solo en este dispositivo.",
    photoError: "Selecciona JPG, PNG o WebP de hasta 8 MB.",
    recommend: "Buscar recomendaciones", recommendCompact: "Recomendar", detailed: "Análisis detallado (tests)", detailedCompact: "Tests", toolsTitle: "2. Elige lo que te ayuda",
    goalFilter: "Filtro de metas", goalAdjust: "Cambiar", goalClear: "Borrar",
    goalResultsTitle: "Recomendaciones para tu objetivo", goalResultsNote: "Explora recursos publicados. No es diagnóstico, garantía de resultado ni reserva confirmada.",
    goalResultLabels: { meditation: "Meditaciones", tests: "Pruebas", courses: "Cursos", talismans: "Talismanes", masters: "Guías" },
    goalResultHints: { meditation: "Grabaciones originales", tests: "Exploración personal", courses: "Aprendizaje disponible", talismans: "Opciones simbólicas", masters: "Perfiles publicados" },
    goalSector: { energy: "Energía", money: "Dinero", love: "Amor", goals: "Metas", meaning: "Sentido" },
    goalHero: { energy: "Recupera tu energía", money: "Explora nuevas oportunidades", love: "Reconecta con el amor", goals: "Da el siguiente paso", meaning: "Encuentra tu dirección interior" },
    goalMatch: "Grabaciones publicadas ordenadas por tema; no es un diagnóstico.",
    goalRelated: "Aún no hay una grabación específica: se muestran prácticas originales afines.",
    recommendationTitle: "Tu selección personal", recommendationWhy: "Según tu enfoque y valoración, no es un diagnóstico.",
    recommendationVideo: "Vídeo para tu objetivo", recommendationTalisman: "Talismán simbólico opcional",
    seeVideo: "Ver vídeo", seeTalisman: "Ver en el catálogo", symbolicNote: "Un símbolo para reflexionar, sin prometer resultados.",
    recommendationFallback: "No hay un vídeo exacto para este tema; se muestra una grabación relacionada.",
    foci: { energy: "Energía", money: "Dinero", relationships: "Relaciones", goals: "Metas" },
    options: { meditation: "Meditación", consultation: "Test o consulta", talisman: "Talismán", pump: "Cursos", healing: "Apoyo Reiki", masters: "Guías" },
    optionsCompact: { meditation: "Meditación", consultation: "Test / sesión", talisman: "Talismán", pump: "Cursos", healing: "Apoyo Reiki", masters: "Guías" },
    optionsMicro: { meditation: "Vídeo", consultation: "Test", talisman: "Talismán", healing: "Reiki" },
    master: "Guía", program: "Programa", theme: "Tema", all: "Todos",
    masterProfile: "Abrir perfil del guía", videoMaster: "Guía de meditación",
    authorAndrey: "Andrey Litvinov", authorPs: "PsiMaster",
    programs: { sun: "Prácticas del Sol", reiki: "Meditaciones Reiki", energy: "Archivo energético", maya: "Misterios mayas", egypt: "Misterios egipcios", greek: "Misterios griegos" },
    themes: { all: "Todos los temas", business: "Trabajo y dinero", love: "Relaciones", energy: "Energía", health: "Bienestar" },
    heroTitle: { energy: "Recupera tu energía", money: "Encuentra claridad", relationships: "Vuelve a ti", goals: "Enfoca tu camino" },
    heroIntro: "Elige una grabación original y disfruta de un momento de calma.",
    play: "Empezar meditación", originalEn: "Audio original en inglés", originalRu: "Audio original en ruso",
    youtube: "Abrir en YouTube", seeAll: "Ver todas", gallery: "Otras meditaciones", galleryHint: "Portadas ilustrativas; grabaciones originales verificadas.", average: "Autoevaluación", lowestHint: "Según las puntuaciones más bajas:", lowestNote: "Temas orientativos, no diagnóstico.",
    notAvailable: "No hay vídeos verificados para esos filtros. Elige Todos.",
    testsTitle: "Explora tu situación", testsIntro: "Haz un test gratuito o solicita una consulta mediante las opciones existentes.",
    tests: "Abrir tests", consult: "Solicitar consulta", consultNote: "Una solicitud no es una reserva ni un pago.",
    talismansTitle: "Elige un talismán simbólico", talismansIntro: "Catálogo ilustrado existente; el profesional confirma disponibilidad y precio.",
    energyTitle: "Cursos y programas", energyIntro: "Clases originales y catálogo completo de la Academia.",
    coursesAll: "Todos los cursos", mastersShort: "Guías", coursesReiki: "Curso de Tantra Reiki",
    mysteryCourses: "Cursos originales de misterios", mysterySource: "Audio original en ruso · archivo PsiMaster",
    watchLesson: "Ver lección", openCourse: "Ver programa", lessonCount: "vídeos",
    originalCourseVideos: "Lecciones originales en vídeo",
    healingTitle: "Apoyo Reiki", healingIntro: "Encuentra profesionales y servicios publicados de apoyo a distancia.",
    healingMasters: "Ver profesionales", healingServices: "Servicios de apoyo Reiki",
    energyAction: "Buscar profesional", energyHide: "Cerrar solicitud", energyNote: "Solicitar no significa reservar ni pagar.",
    progress: "Tu progreso", started: "Vídeos abiertos aquí", focusStatus: "Puntuación más baja",
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

export function HolisticSupportMobile({ locale, videos, courses = [] }: {
  locale: PublicLocale;
  videos: SupportMobileVideo[];
  courses?: SupportMobileCourse[];
}) {
  const t = copy[locale];
  const [scores, setScores] = useState<Record<Focus, number>>({ energy: 5, money: 5, relationships: 5, goals: 5 });
  const [choice, setChoice] = useState<Choice>("meditation");
  // The visitor explicitly requests a local ranking snapshot; editing a rating
  // clears it. Ties are matched jointly and never become a hidden focus choice.
  const [recommendation, setRecommendation] = useState<Record<Focus, number> | null>(null);
  const [goalFilterOpen, setGoalFilterOpen] = useState(false);
  const [goalSelection, setGoalSelection] = useState<GoalSelection | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [master, setMaster] = useState<Author>("all");
  const [program, setProgram] = useState<Program>("all");
  const [theme, setTheme] = useState<Theme>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [opened, setOpened] = useState<string[]>([]);
  const [talismanCatalogOpen, setTalismanCatalogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Google returns to the same public page with a one-use non-personal
  // OAuth continuation flag. The client-side scoring/photo dashboard never
  // touches browser storage, CRM, private notes or account identity.
  useEffect(() => {
    if (window.location.search.includes("hh_enquiry=google"))
      setChoice(pendingBrowserTalismanGoogleReturn() ? "talisman" : "healing");
  }, []);

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

  // Quick matching follows the lowest self-ratings. An explicitly applied goal
  // overrides the browsing focus without changing the existing scoring engine.
  const lowestFocus: Focus = focusOrder.reduce((lowest, domain) =>
    scores[domain] < scores[lowest] ? domain : lowest, focusOrder[0]);
  const focus: Focus = goalSelection ? goalSectorFocus[goalSelection.sector] : lowestFocus;
  const suggested = useMemo(() => recommendation
    ? recommendSupportByLowestScores({ scores: recommendation, videos, locale })
    : null, [recommendation, videos, locale]);
  const goalMatch = useMemo(() => goalSelection
    ? rankSupportGoalVideos({ selection: goalSelection, videos, locale })
    : null, [goalSelection, videos, locale]);
  const recommended = useMemo(() => recommendation
    ? recommendSupportContent({ focus, scores: recommendation, videos,
      talismans: TAOIST_TALISMANS, locale })
    : null, [focus, recommendation, videos, locale]);
  const recommendedTalisman = TAOIST_TALISMANS.find(item => item.id === recommended?.talismans[0]?.id) ?? null;

  // Keep historical course lessons out of score-matched meditation suggestions.
  // They are accessible exclusively when the visitor chooses Courses.
  const browseVideos = useMemo(() => choice === "pump"
    ? [...videos, ...courses.flatMap(course => course.videos)]
    : videos, [choice, videos, courses]);
  const relevantVideos = useMemo(() => {
    const filtered = browseVideos.filter(video => (master === "all" || video.author === master) &&
      (program === "all" || video.program === program));
    const eligible = theme !== "all" ? filtered.filter(video => video.topics.includes(theme)) : filtered;
    if (goalMatch && choice === "meditation") {
      const order = new Map(goalMatch.videos.map((video, index) => [video.id, index]));
      return eligible.slice().sort((a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)).slice(0, 4);
    }
    if (suggested && choice === "meditation") {
      const order = new Map(suggested.videos.map((video, index) => [video.id, index]));
      return eligible.slice().sort((a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)).slice(0, 4);
    }
    return eligible.slice(0, 4);
  }, [browseVideos, master, program, theme, choice, suggested, goalMatch]);
  const selected = relevantVideos.find(video => video.id === selectedId) ?? relevantVideos[0];
  const sourceAudio = selected?.sourceLanguage === "ru" ? t.originalRu : t.originalEn;
  const activeMystery = choice === "pump" ? courses.find(course => course.id === program) : undefined;
  const videoSrc = selected ? "https://www.youtube-nocookie.com/embed/" +
    encodeURIComponent(selected.id) + "?autoplay=1&playsinline=1&rel=0" : "";
  const pickVideo = (id: string) => { setSelectedId(id); setPlaying(false); };
  const onRecommendations = () => {
    // Show the matches ONLY in the existing original-meditations gallery.
    setRecommendation({ ...scores });
    setGoalSelection(null); setGoalFilterOpen(false);
    setChoice("meditation"); setTheme("all"); setProgram("all"); setMaster("all");
    setSelectedId(null); setPlaying(false);
    window.requestAnimationFrame(() => document.getElementById("support-meditation-gallery")
      ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };
  const openGoalFilter = () => {
    setPlaying(false); setGoalFilterOpen(true);
    window.requestAnimationFrame(() => document.getElementById("support-mobile-experience")
      ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };
  const applyGoalFilter = (value: GoalSelection) => {
    // Never infer a 1–10 self-rating from income or reserve amounts. Meaning
    // remains separate from Goals; Money uses its own stability rating.
    const nextScores = { ...scores };
    const primary = { energy: "vitality", money: "incomeStability",
      love: "connection", goals: "goalClarity" } as const;
    if (value.sector !== "meaning") {
      const now = value.ratings[primary[value.sector]]?.current;
      if (Number.isInteger(now) && now >= 1 && now <= 10) {
        nextScores[goalSectorFocus[value.sector]] = now;
      }
    }
    setScores(nextScores); setRecommendation(nextScores); setGoalSelection(value);
    setGoalFilterOpen(false); setChoice("meditation");
    setTheme("all"); setProgram("all"); setMaster("all");
    setSelectedId(null); setPlaying(false);
    window.requestAnimationFrame(() => document.getElementById("support-mobile-experience")
      ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };
  const resetGoalFilter = () => { setGoalSelection(null); setRecommendation(null); setTheme("all"); };
  const startVideo = () => {
    if (!selected) return;
    setPlaying(true);
    setOpened(previous => previous.includes(selected.id) ? previous : [...previous, selected.id]);
  };
  const changeChoice = (value: Choice) => {
    setGoalFilterOpen(false); setChoice(value); setPlaying(false); setSelectedId(null);
    if (value === "pump") { setTheme("all"); setProgram("all"); setMaster("all"); }
  };
  const activeProgramValues = Array.from(new Set(browseVideos.map(video => video.program)));
  const activeAuthorValues = Array.from(new Set(browseVideos.map(video => video.author)));
  const progressCount = relevantVideos.filter(video => opened.includes(video.id)).length;
  const progressTotal = relevantVideos.length;
  const averageScore = (focusOrder.reduce((sum, id) => sum + scores[id], 0) / focusOrder.length).toFixed(1);
  const FocusIcon = scoreIcons[focus];
  const ActiveFocusIcon = goalSelection?.sector === "meaning" ? Flower2 : FocusIcon;
  const activeFocusLabel = goalSelection ? t.goalSector[goalSelection.sector] : t.foci[focus];
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
            <h1 id="mobile-assessment-title" aria-label={t.assessment}><span className={styles.headingLong}>{t.assessment}</span><span className={styles.headingCompact}>{t.assessmentShort}</span></h1>
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
                      onChange={event => { setRecommendation(null); setGoalSelection(null); setScores(previous => ({ ...previous, [id]: Number(event.target.value) })); }} />
                  </span>
                  <output className={styles.scaleValue} data-tone={id}>{scores[id]}</output>
                </label>;
              })}
            </div>


            <button type="button" className={styles.goalFilterTrigger}
              data-support-goal-filter-trigger aria-expanded={goalFilterOpen} aria-controls="support-goal-filter"
              onClick={openGoalFilter}>
              <Filter size={19} aria-hidden="true" />{t.goalFilter}
            </button>
          </section>

          <section className={styles.profile} aria-label={t.upload}>
            <label className={styles.photo} title={photoUrl ? t.replace : t.upload} data-support-photo>
              {photoUrl ? <Image alt="" src={photoUrl} width={176} height={176} unoptimized className={styles.photoPreview} /> :
                <span className={styles.photoPlaceholder}>
                  <Image alt="" src="/images/holistic-house/support-reference-avatar.webp" width={176} height={176} unoptimized className={styles.photoReference} />
                  <strong>{t.upload}</strong>
                </span>}
              <span className={styles.camera}><Camera size={20} aria-hidden="true" /></span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto}
                aria-label={photoUrl ? t.replace : t.upload} className={styles.fileInput} />
            </label>
            <Link href={"/" + locale + "/holistic-support/mandala"} prefetch={false}
              className={styles.videoMandalaShortcut} data-support-video-mandala
              aria-label={t.videoMandala}>
              <Sparkles size={15} aria-hidden="true" /><span>{t.videoMandala}</span>
            </Link>
            {photoError ? <p className={styles.photoError} role="alert">{photoError}</p> : null}
            <div className={styles.focusSelector} data-support-active-focus aria-label={t.focusLabel}>
              <span className={styles.focusCaption}>{t.focusLabelShort}</span>
              <span className={styles.focusValue}><ActiveFocusIcon size={19} aria-hidden="true" /><strong>{activeFocusLabel}</strong></span>
            </div>
            <button type="button" className={styles.recommendButton}
              data-support-recommendations aria-label={t.recommend} aria-controls="support-meditation-gallery"
              onClick={onRecommendations}>
              <Sparkles size={19} aria-hidden="true" />
              <span className={styles.recommendLong}>{t.recommend}</span>
              <span className={styles.recommendShort}>{t.recommendCompact}</span>
            </button>
          </section>

          <section className={styles.tools} aria-labelledby="mobile-tools-title" id="support-tools">
            <h2 id="mobile-tools-title" aria-label={t.toolsTitle}><span className={styles.headingLong}>{t.toolsTitle}</span><span className={styles.headingCompact}>{t.toolsShort}</span></h2>
            <div className={styles.toolGrid}>
              {choices.filter(item => item.id !== "pump").map(({ id, Icon }) => (
                <button key={id} type="button" data-support-tool={id}
                  className={styles.toolButton} aria-pressed={choice === id}
                  onClick={() => changeChoice(id)} aria-label={t.options[id]}>
                  <Icon size={30} strokeWidth={1.65} aria-hidden="true" />
                  <span className={styles.toolLong}>{t.options[id]}</span><span className={styles.toolCompact}>{t.optionsCompact[id]}</span><span className={styles.toolMicro}>{t.optionsMicro[id as keyof typeof t.optionsMicro]}</span>
                </button>
              ))}

            </div>
            <div className={styles.toolShortcuts} aria-label={t.coursesAll}>
              <button type="button" data-support-tool="pump" aria-pressed={choice === "pump"}
                onClick={() => changeChoice("pump")}>
                <BookOpen size={15} aria-hidden="true" />{t.optionsCompact.pump}
              </button>
              <button type="button" data-support-tool="masters" aria-pressed={choice === "masters"}
                onClick={() => changeChoice("masters")} aria-label={t.healingMasters}>
                <HandHeart size={15} aria-hidden="true" />{t.mastersShort}
              </button>
            </div>
          </section>
        </div>

        <section className={styles.experience} id="support-mobile-experience" aria-live="off">
          {goalSelection && !goalFilterOpen ? <section className={styles.goalResults}
            id="support-goal-results" data-support-goal-results aria-labelledby="support-goal-results-title">
            <div className={styles.goalResultsHeading}>
              <h2 id="support-goal-results-title"><Sparkles size={21} aria-hidden="true" />{t.goalResultsTitle}</h2>
              <p>{t.goalResultsNote}</p>
            </div>
            <div className={styles.goalResultGrid}>
              <button type="button" data-support-goal-action="meditation"
                aria-pressed={choice === "meditation"}
                onClick={() => { changeChoice("meditation"); window.requestAnimationFrame(() =>
                  document.getElementById("support-meditation-gallery")?.scrollIntoView({
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                    block: "start",
                  })); }}>
                <Play size={21} aria-hidden="true" />
                <span><strong>{t.goalResultLabels.meditation}</strong><small>{t.goalResultHints.meditation}</small></span>
              </button>
              <Link href={"/" + locale + "/tests"} prefetch={false} data-support-goal-action="tests">
                <TestTubeDiagonal size={21} aria-hidden="true" />
                <span><strong>{t.goalResultLabels.tests}</strong><small>{t.goalResultHints.tests}</small></span>
              </Link>
              <Link href={goalSelection.sector === "money" ? "/" + locale + "/explore/business"
                : "/" + locale + "/academy"} prefetch={false} data-support-goal-action="courses">
                <BookOpen size={21} aria-hidden="true" />
                <span><strong>{t.goalResultLabels.courses}</strong><small>{t.goalResultHints.courses}</small></span>
              </Link>
              <button type="button" data-support-goal-action="talismans"
                aria-pressed={choice === "talisman"} onClick={() => changeChoice("talisman")}>
                <Sparkles size={21} aria-hidden="true" />
                <span><strong>{t.goalResultLabels.talismans}</strong><small>{t.goalResultHints.talismans}</small></span>
              </button>
              <button type="button" data-support-goal-action="masters"
                aria-pressed={choice === "masters"} onClick={() => changeChoice("masters")}>
                <UserRound size={21} aria-hidden="true" />
                <span><strong>{t.goalResultLabels.masters}</strong><small>{t.goalResultHints.masters}</small></span>
              </button>
            </div>
          </section> : null}
          {goalFilterOpen ? <HolisticSupportGoalFilter locale={locale} scores={scores}
            initial={goalSelection} onApply={applyGoalFilter} onReset={resetGoalFilter}
            onClose={() => setGoalFilterOpen(false)} /> : scene ? (
            <>
              {goalSelection ? <div className={styles.activeGoalStrip} data-support-applied-goal>
                <Filter size={16} aria-hidden="true" />
                <span><strong>{t.goalFilter}: {t.goalSector[goalSelection.sector]}</strong>
                  {summarizeGoalSelection(locale, goalSelection) ? " · " + summarizeGoalSelection(locale, goalSelection) : ""}</span>
                <button type="button" onClick={openGoalFilter}>{t.goalAdjust}</button>
                <button type="button" onClick={resetGoalFilter} aria-label={t.goalClear}><X size={16} aria-hidden="true" /></button>
              </div> : null}
              {choice === "pump" && courses.length > 0 ? (
                <div className={styles.mysteryPicker} data-support-mystery-courses>
                  <div className={styles.mysteryPickerHeading}>
                    <strong>{t.mysteryCourses}</strong><span>{t.mysterySource}</span>
                  </div>
                  <div className={styles.mysteryPickerGrid} role="group" aria-label={t.mysteryCourses}>
                    {courses.map(course => (
                      <button key={course.id} type="button" className={styles.mysteryPickerCard}
                        data-support-mystery-course={course.id} aria-pressed={activeMystery?.id === course.id}
                        onClick={() => { setProgram(course.id); setMaster("all"); setTheme("all"); setPlaying(false); setSelectedId(null); }}>
                        <Image src={course.poster} alt="" width={300} height={180} unoptimized loading="lazy" />
                        <span><strong>{course.shortTitle}</strong><small>{course.videoCount} {t.lessonCount}</small></span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className={styles.hero} data-support-player data-playing={playing ? "true" : "false"}>
                {!playing ? <Image className={styles.heroBackdrop} src="/images/holistic-house/support-mock-hero.webp"
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
                    <strong className={styles.filterValue}>{program === "all" ? t.all : t.programs[program]}</strong>
                    <select value={program} aria-label={t.program} onChange={event => { setProgram(event.target.value as Program); setPlaying(false); setSelectedId(null); if (choice === "pump") { setMaster("all"); setTheme("all"); } }}>
                      <option value="all">{t.all}</option>
                      {activeProgramValues.map(key => <option key={key} value={key}>{t.programs[key]}</option>)}
                    </select><ChevronDown size={14} aria-hidden="true" />
                  </label>
                  <label className={styles.heroFilter} data-support-filter="theme"><Leaf size={18} aria-hidden="true" /><span>{t.theme}</span>
                    <strong className={styles.filterValue}>{t.themes[theme]}</strong>
                    <select value={theme} aria-label={t.theme} onChange={event => { setTheme(event.target.value as Theme); setGoalSelection(null); setPlaying(false); setSelectedId(null); }}>
                      {(["all", "business", "love", "energy", "health"] as Theme[]).map(key =>
                        <option key={key} value={key}>{t.themes[key]}</option>)}
                    </select><ChevronDown size={14} aria-hidden="true" />
                  </label>
                </div>
                {selected?.masterProfile ? <Link
                  href={"/" + locale + "/masters/" + selected.masterProfile.slug}
                  prefetch={false} className={styles.heroMasterLink}
                  data-support-video-master={selected.masterProfile.slug}
                  aria-label={t.masterProfile + ": " + selected.masterProfile.name}>
                  <Image src={selected.masterProfile.image} alt="" width={46} height={46}
                    className={styles.heroMasterAvatar} />
                  <span className={styles.heroMasterCopy}>
                    <strong>{selected.masterProfile.name}</strong>
                    <small>{t.videoMaster}</small>
                  </span>
                  <ChevronRight size={19} aria-hidden="true" className={styles.heroMasterArrow} />
                </Link> : null}
                {playing && selected ? <div className={styles.iframeWrap}>
                  <iframe key={selected.id} src={videoSrc} title={selected.title}
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen loading="eager" />
                </div> : (
                  <div className={styles.heroBody}>
                    <span className={styles.videoOriginal}><ShieldCheck size={17} aria-hidden="true" />{sourceAudio}</span>
                    <h2>{choice === "pump" ? activeMystery ? t.programs[activeMystery.id] : t.energyTitle : goalSelection ? t.goalHero[goalSelection.sector] : t.heroTitle[focus]}</h2>
                    <p className={styles.heroDescription}>{selected ? selected.title : t.heroIntro}</p>
                    {selected ? <button type="button" onClick={startVideo} className={styles.playButton}
                      data-support-play><Play size={28} fill="currentColor" aria-hidden="true" />{choice === "pump" ? t.watchLesson : t.play}</button> :
                      <p role="status" className={styles.noVideo}>{t.notAvailable}</p>}
                    {activeMystery ? <Link className={styles.heroCourseLink} href={activeMystery.href} prefetch={false}
                      data-support-active-course-link>{t.openCourse}<ArrowRight size={17} aria-hidden="true" /></Link> : null}
                  </div>
                )}
              </div>
              <div className={styles.videoSection} id="support-meditation-gallery" data-support-meditation-gallery>
                <div className={styles.videoHeading}>
                  <h3>{activeMystery ? t.originalCourseVideos : choice === "pump" ? t.energyTitle : t.gallery}</h3>
                  <Link href={activeMystery?.videoGroups[0]?.href ?? (choice === "pump" ? "/" + locale + "/academy?view=videos" : "/" + locale + "/holistic-support#meditation-practices")}
                    prefetch={false} className={styles.seeAll}>{t.seeAll}<ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                {goalSelection && goalMatch && choice === "meditation" ?
                  <p className={styles.gallerySelection} data-support-goal-basis role="status">
                    {t.goalSector[goalSelection.sector]}. {goalMatch.matchedVideo ? t.goalMatch : t.goalRelated}
                  </p> : null}
                {!goalSelection && suggested && choice === "meditation" ? <p className={styles.gallerySelection}
                  data-support-meditation-basis role="status">
                  {t.lowestHint} {suggested.priorities.map(domain => t.foci[domain] + " " + suggested.scores[domain] + "/10").join(" · ")}. {t.lowestNote}
                </p> : null}
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
                <p className={styles.videoHint}>{t.galleryHint}</p>

              </div>
              <div className={styles.videoSourceRow} data-support-video-source>
                {selected ? <a className={styles.youtubeLink} href={"https://www.youtube.com/watch?v=" + encodeURIComponent(selected.id)}
                  target="_blank" rel="noopener noreferrer">{t.youtube} <ArrowRight size={18} aria-hidden="true" /></a> : null}
              </div>
              {choice === "pump" ? <div className={styles.supportEnquiry} data-support-courses-panel>
                <p>{t.energyIntro}</p>
                <div className={styles.courseLinks}>
                  <Link href={"/" + locale + "/academy"} prefetch={false}>{t.coursesAll}<ArrowRight size={18} aria-hidden="true" /></Link>
                  <Link href={"/" + locale + "/academy/reiki/tantra-reiki/discover"} prefetch={false}>{t.coursesReiki}<ArrowRight size={18} aria-hidden="true" /></Link>
                  {activeMystery ? <Link href={activeMystery.href} prefetch={false}>{t.openCourse}: {activeMystery.title}<ArrowRight size={18} aria-hidden="true" /></Link> : null}
                  {activeMystery?.videoGroups.map(group => (
                    <Link href={group.href} key={group.href} prefetch={false}>{group.title} · {group.count} {t.lessonCount}<ArrowRight size={18} aria-hidden="true" /></Link>
                  ))}
                </div>
              </div> : null}
            </>
          ) : choice === "talisman" ? (
            <div data-support-talisman-experience>
              <HolisticSupportTalismanViewer key={focus} locale={locale} focus={focus}
                rankedIds={recommended?.talismans.map(item => item.id)}
                catalogOpen={talismanCatalogOpen} onToggleCatalog={() => setTalismanCatalogOpen(open => !open)} />
              <div id="support-talisman-full-catalog" className={styles.insetPanel} hidden={!talismanCatalogOpen}>
                {talismanCatalogOpen ? <TaoistTalismanCatalog locale={locale}
                  featuredId={recommendedTalisman?.id} rankedIds={recommended?.talismans.map(item => item.id)} /> : null}
              </div>
            </div>

          ) : choice === "healing" || choice === "masters" ? (
            <div data-support-healing-panel>
              <HolisticSupportMasterGallery locale={locale} kind={choice} />
            </div>
          ) : (
            <div data-support-consultation-panel>
              <HolisticSupportMasterGallery locale={locale} kind="consultation" />
            </div>
          )}
        </section>

        <section className={styles.progressPanel} id="support-progress" aria-labelledby="support-mobile-progress-heading">
          <h2 id="support-mobile-progress-heading">{t.progress}</h2>
          <div className={styles.progressGrid}>
            <div className={styles.progressStarted}>
              <div className={styles.progressRing} style={{ "--support-completion": (progressTotal ? (progressCount / progressTotal) * 100 : 0) + "%" } as CSSProperties}>
                <strong>{progressCount}/{progressTotal}</strong>
              </div>
              <div className={styles.progressOpened}><strong>{t.started}</strong><span>{t.private}</span></div>
            </div>
            <div className={styles.progressFocus}><ActiveFocusIcon size={25} aria-hidden="true" /><strong>{activeFocusLabel}</strong><span>{t.focusStatus}</span></div>
            <div className={styles.progressAverage}><BarChart3 size={25} aria-hidden="true" /><strong>{averageScore}/10</strong><span>{t.average}</span></div>
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
