"use client";

import Image from "next/image";
import { HolisticSupportSettingsPanel } from "@/components/holistic-support-settings-panel";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Camera, ChevronDown, ChevronRight, Filter,
  Coins, Compass, Flower2, HandHeart, Heart, Home, Leaf, Play, RotateCcw,
  Settings2, ShieldCheck, Sparkles, TestTubeDiagonal, MessageCircle, UserRound, X, Zap,
} from "lucide-react";

import { TaoistTalismanCatalog } from "@/components/taoist-talisman-catalog";
import { HolisticSupportInlineGuide, type SupportGuideTest } from "@/components/holistic-support-inline-guide";
import { HolisticSupportTalismanViewer } from "@/components/holistic-support-talisman-viewer";
import { HolisticSupportCourseProfiles, type CourseProfileSector } from "@/components/holistic-support-course-profiles";
import { HolisticSupportMasterGallery } from "@/components/holistic-support-master-gallery";
import { GOAL_RECOMMENDATION_FORMATS, HolisticSupportGoalFilter,
  goalSectorFocus, goalSectorCheckinKey, summarizeGoalSelection,
  type GoalSelection, type GoalSector, type GoalSectorSnapshot,
  type GoalRecommendationFormat } from "@/components/holistic-support-goal-filter";
import { rankSupportGoalVideos } from "@/lib/holistic-support/goal-filter";
import { TAOIST_TALISMANS } from "@/lib/practitioners/taoist-talismans";
import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import { pendingBrowserTalismanGoogleReturn } from "@/lib/practitioners/taoist-talisman-cart";
import { recommendSupportByLowestScores, recommendSupportContent } from "@/lib/holistic-support/recommendation-engine";
import type { MeditationTopic } from "@/data/academy/holistic-support-meditations";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-mobile.module.css";

export type SupportMobileVideo = {
  id: string;
  title: string;
  lessonOrder?: number;
  topics: MeditationTopic[];
  program: "sun" | "reiki" | "energy" | "maya" | "egypt" | "greek-dionysus" | "greek-demeter";
  author: "andrey" | "psimaster";
  sourceLanguage: "en" | "ru";
  courseKey?: "flight-to-sun" | "tantra-reiki" | "kundalini-reiki" | "reiki-yggdrasil";
  // Verified public practitioner profile for this particular recording.
  // Recordings with no confirmed practitioner intentionally show no badge.
  masterProfile?: { slug: string; name: string; image: string };
};

export type SupportMobileCourse = {
  id: "maya" | "egypt" | "greek-dionysus" | "greek-demeter";
  title: string;
  shortTitle: string;
  poster: string;
  href: string;
  seriesHref?: string;
  videoCount: number;
  videoGroups: { title: string; href: string; count: number }[];
  videos: SupportMobileVideo[];
};

type Focus = "energy" | "money" | "relationships" | "goals";
// Meaning is a separate fifth check-in; the published video topic engine
// continues to use the original four-focus ranking.
type CheckinArea = Exclude<Focus, "goals"> | "meaning";
export type SupportMobileChoice = "meditation" | "consultation" | "talisman" | "pump" | "healing" | "masters" | "tests";
type Choice = SupportMobileChoice;
type Program = "all" | SupportMobileVideo["program"];
type Author = "all" | SupportMobileVideo["author"];
type Theme = "all" | MeditationTopic;

const focusOrder: Focus[] = ["energy", "money", "relationships", "goals"];
const checkinOrder: CheckinArea[] = ["energy", "money", "relationships", "meaning"];
// Existing public Test Explorer recognizes these non-sensitive editorial journey IDs.
const scoreIcons = { energy: Zap, money: Coins, relationships: Heart, goals: Flower2, meaning: Flower2 };
// The historical recommendation engine calls the fourth focus "goals".
// It receives the single Meaning score, never a second or synthetic Goals slider.
const asFocusScores = (values: Record<CheckinArea, number>): Record<Focus, number> => ({
  energy: values.energy, money: values.money, relationships: values.relationships, goals: values.meaning,
});
const choices: { id: Choice; Icon: typeof Play }[] = [
  { id: "meditation", Icon: Play },
  { id: "consultation", Icon: MessageCircle },
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
    journey: {
      "intro": "Five clickable steps. Pick any step; no test, booking or purchase starts automatically.",
      "stepLabels": [
        "Clarify",
        "Explore tests",
        "Try a practice",
        "Find support",
        "Review"
      ],
      "questionTitle": "Choose your priority",
      "questionHint": "A short private goal check-in",
      "testTitles": {
        "energy": "Energy & wellbeing tests",
        "money": "Work & money reflection tests",
        "relationships": "Relationship tests",
        "goals": "Meaning, focus & motivation tests"
      },
      "testHint": "Browse actual free questionnaires",
      "videoHint": "Published original recording",
      "videoMissing": "Browse available meditations",
      "videoExcluded": "Video is off in your goal filter",
      "supportMissing": "Choose a support format",
      "supportHint": "Explore, with no booking or payment",
      "progressTitle": "My check-in and opened videos",
      "progressHint": "Local on this page; not saved",
      "actions": [
        "Answer",
        "Explore tests",
        "Open video",
        "Explore",
        "View"
      ],
      "other": "Other selected formats",
      "start": "Start with step 1",
      "focus": "Focus",
      "related": "Related recording; no exact topic match"
    },
    goalResultLabels: {
      meditation: "Videos & meditations", consultation: "Consultations",
      tests: "Tests", courses: "Courses", talismans: "Talismans",
      healing: "Energy support", masters: "Masters",
      initiations: "Initiations", mandala: "Video mandalas",
    },
    goalResultHints: {
      meditation: "Original recordings", consultation: "Session requests",
      tests: "Free self-exploration", courses: "Existing learning paths",
      talismans: "Symbolic options", healing: "Reiki practitioners",
      masters: "Published profiles", initiations: "Existing Reiki program",
      mandala: "Existing mandala studio",
    },
    goalNoFormats: "No recommendation formats selected. Change the filter to choose some.",
    goalExternalOnly: "Use the selected links above to explore these published formats.",
    goalSector: { energy: "Energy", money: "Money", love: "Love", meaning: "Meaning" },
    goalHero: { energy: "Restore your energy", money: "Make room for abundance", love: "Reconnect with love", meaning: "Explore meaning and direction" },
    goalMatch: "Published recordings sorted for your chosen theme. This is not a diagnosis.",
    goalRelated: "No recording is labelled specifically for that goal yet; here are related original practices.",
    recommendationTitle: "Your personalized selection", recommendationWhy: "Based on your chosen focus and self-rating, not a diagnosis.",
    recommendationVideo: "Video for your focus", recommendationTalisman: "Optional symbolic talisman",
    seeVideo: "View video", seeTalisman: "See in catalog", symbolicNote: "A symbol for reflection, not a promised result.",
    recommendationFallback: "No exact recording is published for this topic; this is a related option.",
    foci: { energy: "Energy", money: "Money", relationships: "Relationships", goals: "Meaning" },
    options: { meditation: "Meditation", consultation: "Consultation", talisman: "Talisman", pump: "Courses", healing: "Reiki support", masters: "Masters", tests: "Tests" },
    optionsCompact: { meditation: "Meditation", consultation: "Session", talisman: "Talisman", pump: "Courses", healing: "Reiki support", masters: "Masters", tests: "Tests" },
    optionsMicro: { meditation: "Video", consultation: "Session", talisman: "Talisman", healing: "Reiki" },
    master: "Teacher", program: "Program", theme: "Topic", all: "All",
    masterProfile: "Open master profile", videoMaster: "Meditation guide",
    authorAndrey: "Andrey Litvinov", authorPs: "PsiMaster",
    programs: { sun: "Sun practices", reiki: "Reiki meditations", energy: "Energy archive", maya: "Maya mysteries", egypt: "Egyptian mysteries", "greek-dionysus": "Dionysus channel", "greek-demeter": "Demeter channel" },
    themes: { all: "All topics", business: "Work & money", love: "Relationships", energy: "Energy", health: "Wellbeing" },
    heroTitle: { energy: "Restore your energy", money: "Make space for clarity", relationships: "Reconnect with yourself", goals: "Explore meaning and direction" },
    heroIntro: "Choose an original guided recording and take a quiet moment.",
    play: "Start meditation", originalEn: "Original English audio", originalRu: "Original Russian audio",
    youtube: "Open on YouTube", seeAll: "View all", gallery: "More original meditations", galleryHint: "Illustrative covers; original verified recordings.", average: "Self-rating", lowestHint: "Lowest ratings:", lowestNote: "Optional topics, not a diagnosis.",
    notAvailable: "No verified recordings match those filters. Try All.",
    testsTitle: "Explore your situation", testsIntro: "Choose an existing free self-check or a personality profile. These tests support reflection, not medical diagnosis.",
    testsShort: "Tests", tests: "Open free tests", testsProfiles: "Personality profiles", testsProfilesHint: "Explore existing profile questionnaires", testsGuide: "How tests work", testsGuideHint: "Understand privacy and results", testsPrivacy: "Your ratings and photo on this screen are not sent to the tests catalogue.", consult: "Request a consultation", consultNote: "Sending a request is not a confirmed booking or payment.",
    talismansTitle: "Choose a symbolic talisman", talismansIntro: "Explore the existing illustrated catalogue; the practitioner confirms any custom order and price.",
    energyTitle: "Courses & programmes", energyIntro: "Explore original lessons here or continue to the Academy catalogue.",
    coursesAll: "Browse all courses", mastersShort: "Masters", coursesReiki: "Explore Tantra Reiki",
    mysteryCourses: "Original mystery courses", mysterySource: "Russian originals · PsiMaster archive",
    watchLesson: "Watch lesson", openCourse: "Explore course", lessonCount: "videos",
    lessonOrdinal: "Lesson", lessonOf: "of", lessonPrevious: "Previous lesson", lessonNext: "Next lesson",
    originalCourseVideos: "Original course recordings",
    healingTitle: "Reiki support", healingIntro: "Find published practitioners or remote energy support services.",
    healingMasters: "Browse masters", healingServices: "Reiki support services",
    energyAction: "Request a practitioner", energyHide: "Close request", energyNote: "A personal request is not a confirmed session or payment.",
    progress: "Your progress", started: "Videos opened here", focusStatus: "Lowest self-rating",
    private: "Private on this page", privateInfo: "Sliders, photo and viewing history are not sent to a server or saved to your account.",
    newUi: "Mobile support experience", standard: "Standard Support page", navHome: "Home", navPractices: "My practices", navMessages: "Messages", navProgress: "My progress", navSettings: "Settings",
    settings: "Profile & settings", language: "Language", close: "Close settings",
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
    journey: {
      "intro": "Пять рекомендаций с прямыми переходами. Можно начать с любого шага.",
      "stepLabels": [
        "Уточнить запрос",
        "Пройти тест",
        "Начать практику",
        "Выбрать поддержку",
        "Оценить изменения"
      ],
      "questionTitle": "Короткий опрос о вашей цели",
      "questionHint": "Уточните, что сейчас важнее всего",
      "testTitles": {
        "energy": "Тесты: энергия и самочувствие",
        "money": "Тесты: работа и деньги",
        "relationships": "Тесты: отношения",
        "goals": "Тесты: смыслы, фокус и мотивация"
      },
      "testHint": "Реальные бесплатные опросники",
      "videoHint": "Опубликованная авторская запись",
      "videoMissing": "Посмотреть доступные медитации",
      "videoExcluded": "Видео отключено в фильтре",
      "supportMissing": "Выберите формат поддержки",
      "supportHint": "Без автоматической записи и оплаты",
      "progressTitle": "Мои оценки и открытые видео",
      "progressHint": "Только на этой странице, без сохранения",
      "actions": [
        "Ответить",
        "Подобрать тест",
        "Открыть видео",
        "Выбрать",
        "Посмотреть"
      ],
      "other": "Другие выбранные форматы",
      "start": "Начать с шага 1",
      "focus": "Фокус",
      "related": "Близкая запись, не точное совпадение"
    },
    goalResultLabels: {
      meditation: "Видео и медитации", consultation: "Консультации",
      tests: "Тесты", courses: "Курсы", talismans: "Талисманы",
      healing: "Энергоподдержка", masters: "Мастера",
      initiations: "Инициации", mandala: "Видеомандалы",
    },
    goalResultHints: {
      meditation: "Авторские записи", consultation: "Заявка на сессию",
      tests: "Самоисследование", courses: "Программы обучения",
      talismans: "Символические практики", healing: "Рейки и мастера",
      masters: "Каталог специалистов", initiations: "Программа Рейки",
      mandala: "Студия видеомандал",
    },
    goalNoFormats: "Форматы рекомендаций не выбраны. Откройте фильтр и отметьте подходящие.",
    goalExternalOnly: "Откройте выбранные материалы по ссылкам выше.",
    goalSector: { energy: "Энергия", money: "Деньги", love: "Любовь", meaning: "Смыслы" },
    goalHero: { energy: "Восстанови свою энергию", money: "Открой новые возможности", love: "Верни близость и тепло", meaning: "Найди смыслы и направление" },
    goalMatch: "Подбор по теме среди опубликованных записей, не медицинский вывод.",
    goalRelated: "Точной записи по этой теме пока нет: показаны близкие оригинальные практики.",
    recommendationTitle: "Ваш персональный подбор", recommendationWhy: "По выбранной теме и вашей оценке, не медицинский вывод.",
    recommendationVideo: "Видео по вашему запросу", recommendationTalisman: "Символический талисман по желанию",
    seeVideo: "Смотреть видео", seeTalisman: "Посмотреть в каталоге", symbolicNote: "Символ для размышления, без обещания результата.",
    recommendationFallback: "Точного видео по теме пока нет: предложена близкая авторская запись.",
    foci: { energy: "Энергия", money: "Деньги", relationships: "Отношения", goals: "Смыслы" },
    options: { meditation: "Медитация", consultation: "Консультация", talisman: "Талисман", pump: "Курсы", healing: "Рейки поддержка", masters: "Мастера", tests: "Тесты" },
    optionsCompact: { meditation: "Медитация", consultation: "Сессия", talisman: "Талисман", pump: "Курсы", healing: "Рейки поддержка", masters: "Мастера", tests: "Тесты" },
    optionsMicro: { meditation: "Видео", consultation: "Сессия", talisman: "Талисман", healing: "Рейки" },
    master: "Мастер", program: "Программа", theme: "Тема", all: "Все",
    masterProfile: "Открыть страницу мастера", videoMaster: "Мастер медитаций",
    authorAndrey: "Андрей Литвинов", authorPs: "PsiMaster",
    programs: { sun: "Практики Солнца", reiki: "Медитации Рейки", energy: "Энергоархив", maya: "Мистерии Майя", egypt: "Мистерии Египта", "greek-dionysus": "Канал Диониса", "greek-demeter": "Канал Деметры" },
    themes: { all: "Все темы", business: "Деньги и дело", love: "Отношения", energy: "Энергия", health: "Самочувствие" },
    heroTitle: { energy: "Восстанови свою энергию", money: "Найди ясность в решениях", relationships: "Вернись к себе", goals: "Найди смыслы и направление" },
    heroIntro: "Выбери оригинальную запись и удели себе немного времени.",
    play: "Начать медитацию", originalEn: "Оригинальный звук: английский", originalRu: "Оригинальный звук: русский",
    youtube: "Открыть на YouTube", seeAll: "Все видео", gallery: "Другие медитации", galleryHint: "Обложки — иллюстрации. Записи — оригинальные.", average: "Самооценка", lowestHint: "По минимальным оценкам:", lowestNote: "Подбор тем, не диагноз.",
    notAvailable: "По этим фильтрам нет подтверждённых записей. Выберите «Все».",
    testsTitle: "Исследуй свой запрос", testsIntro: "Выбери бесплатный тест или профиль личности. Результаты помогают в самоисследовании, но не заменяют диагностику.",
    testsShort: "Тесты", tests: "Открыть тесты", testsProfiles: "Профили личности", testsProfilesHint: "Существующие опросники и типологии", testsGuide: "О тестах", testsGuideHint: "Как проходят тесты и сохраняются результаты", testsPrivacy: "Оценки и фото с этого экрана не передаются в каталог тестов.", consult: "Запросить консультацию", consultNote: "Заявка — ещё не подтверждённая запись и не оплата.",
    talismansTitle: "Выбери символический талисман", talismansIntro: "Используем существующий каталог. Изготовление и цену мастер подтверждает отдельно.",
    energyTitle: "Курсы и программы", energyIntro: "Авторские уроки и действующий каталог Академии.",
    coursesAll: "Все курсы Академии", mastersShort: "Мастера", coursesReiki: "Курс Тантра Рейки",
    mysteryCourses: "Курсы мистерий", mysterySource: "Оригинал на русском · архив PsiMaster",
    watchLesson: "Смотреть урок", openCourse: "Открыть программу", lessonCount: "видео",
    lessonOrdinal: "Урок", lessonOf: "из", lessonPrevious: "Предыдущий урок", lessonNext: "Следующий урок",
    originalCourseVideos: "Оригинальные видеоуроки",
    healingTitle: "Рейки поддержка", healingIntro: "Выберите мастера или действующую услугу дистанционной поддержки.",
    healingMasters: "Каталог мастеров", healingServices: "Услуги Рейки поддержки",
    energyAction: "Подобрать мастера", energyHide: "Закрыть заявку", energyNote: "Запрос ещё не означает запись или оплату.",
    progress: "Твой прогресс", started: "Видео открыто здесь", focusStatus: "Минимальная оценка",
    private: "Лично на этом экране", privateInfo: "Шкалы, фото и история просмотра не отправляются на сервер и не сохраняются в кабинете.",
    newUi: "Мобильная поддержка", standard: "Обычная страница поддержки", navHome: "Главная", navPractices: "Мои практики", navMessages: "Сообщения", navProgress: "Мой прогресс", navSettings: "Настройки",
    settings: "Профиль и настройки", language: "Язык", close: "Закрыть настройки",
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
    journey: {
      "intro": "Cinco recomendaciones con acceso directo. Puedes empezar por cualquier paso.",
      "stepLabels": [
        "Definir el objetivo",
        "Explorar pruebas",
        "Iniciar práctica",
        "Elegir apoyo",
        "Revisar cambios"
      ],
      "questionTitle": "Una breve pregunta sobre tu meta",
      "questionHint": "Elige qué es importante hoy",
      "testTitles": {
        "energy": "Pruebas de energía y bienestar",
        "money": "Pruebas de trabajo y dinero",
        "relationships": "Pruebas de relaciones",
        "goals": "Pruebas de sentido, atención y motivación"
      },
      "testHint": "Cuestionarios gratuitos disponibles",
      "videoHint": "Grabación original publicada",
      "videoMissing": "Explorar meditaciones disponibles",
      "videoExcluded": "Vídeos desactivados en el filtro",
      "supportMissing": "Elige un tipo de apoyo",
      "supportHint": "Sin reserva ni pago automático",
      "progressTitle": "Mis valoraciones y vídeos abiertos",
      "progressHint": "Solo en esta página; sin guardar",
      "actions": [
        "Responder",
        "Elegir pruebas",
        "Abrir vídeo",
        "Explorar",
        "Ver"
      ],
      "other": "Otros formatos elegidos",
      "start": "Comenzar con el paso 1",
      "focus": "Enfoque",
      "related": "Grabación relacionada, no exacta"
    },
    goalResultLabels: {
      meditation: "Vídeos y meditaciones", consultation: "Consultas",
      tests: "Pruebas", courses: "Cursos", talismans: "Talismanes",
      healing: "Apoyo energético", masters: "Guías",
      initiations: "Iniciaciones", mandala: "Mandala en vídeo",
    },
    goalResultHints: {
      meditation: "Grabaciones originales", consultation: "Solicitar una sesión",
      tests: "Exploración personal", courses: "Aprendizaje disponible",
      talismans: "Opciones simbólicas", healing: "Maestros de Reiki",
      masters: "Perfiles publicados", initiations: "Programa Reiki",
      mandala: "Estudio de mandalas",
    },
    goalNoFormats: "No hay formatos seleccionados. Abre el filtro y elige algunos.",
    goalExternalOnly: "Abre los enlaces seleccionados para explorar estos recursos.",
    goalSector: { energy: "Energía", money: "Dinero", love: "Amor", meaning: "Sentido" },
    goalHero: { energy: "Recupera tu energía", money: "Explora nuevas oportunidades", love: "Reconecta con el amor", meaning: "Encuentra sentido y dirección" },
    goalMatch: "Grabaciones publicadas ordenadas por tema; no es un diagnóstico.",
    goalRelated: "Aún no hay una grabación específica: se muestran prácticas originales afines.",
    recommendationTitle: "Tu selección personal", recommendationWhy: "Según tu enfoque y valoración, no es un diagnóstico.",
    recommendationVideo: "Vídeo para tu objetivo", recommendationTalisman: "Talismán simbólico opcional",
    seeVideo: "Ver vídeo", seeTalisman: "Ver en el catálogo", symbolicNote: "Un símbolo para reflexionar, sin prometer resultados.",
    recommendationFallback: "No hay un vídeo exacto para este tema; se muestra una grabación relacionada.",
    foci: { energy: "Energía", money: "Dinero", relationships: "Relaciones", goals: "Sentido" },
    options: { meditation: "Meditación", consultation: "Consulta", talisman: "Talismán", pump: "Cursos", healing: "Apoyo Reiki", masters: "Guías", tests: "Tests" },
    optionsCompact: { meditation: "Meditación", consultation: "Sesión", talisman: "Talismán", pump: "Cursos", healing: "Apoyo Reiki", masters: "Guías", tests: "Tests" },
    optionsMicro: { meditation: "Vídeo", consultation: "Sesión", talisman: "Talismán", healing: "Reiki" },
    master: "Guía", program: "Programa", theme: "Tema", all: "Todos",
    masterProfile: "Abrir perfil del guía", videoMaster: "Guía de meditación",
    authorAndrey: "Andrey Litvinov", authorPs: "PsiMaster",
    programs: { sun: "Prácticas del Sol", reiki: "Meditaciones Reiki", energy: "Archivo energético", maya: "Misterios mayas", egypt: "Misterios egipcios", "greek-dionysus": "Canal de Dioniso", "greek-demeter": "Canal de Deméter" },
    themes: { all: "Todos los temas", business: "Trabajo y dinero", love: "Relaciones", energy: "Energía", health: "Bienestar" },
    heroTitle: { energy: "Recupera tu energía", money: "Encuentra claridad", relationships: "Vuelve a ti", goals: "Explora sentido y dirección" },
    heroIntro: "Elige una grabación original y disfruta de un momento de calma.",
    play: "Empezar meditación", originalEn: "Audio original en inglés", originalRu: "Audio original en ruso",
    youtube: "Abrir en YouTube", seeAll: "Ver todas", gallery: "Otras meditaciones", galleryHint: "Portadas ilustrativas; grabaciones originales verificadas.", average: "Autoevaluación", lowestHint: "Según las puntuaciones más bajas:", lowestNote: "Temas orientativos, no diagnóstico.",
    notAvailable: "No hay vídeos verificados para esos filtros. Elige Todos.",
    testsTitle: "Explora tu situación", testsIntro: "Elige un test gratuito o un perfil de personalidad. Son herramientas de reflexión, no de diagnóstico.",
    testsShort: "Tests", tests: "Abrir tests gratuitos", testsProfiles: "Perfiles de personalidad", testsProfilesHint: "Cuestionarios y perfiles disponibles", testsGuide: "Sobre los tests", testsGuideHint: "Privacidad y resultados", testsPrivacy: "Tus puntuaciones y foto de esta pantalla no se envían al catálogo de tests.", consult: "Solicitar consulta", consultNote: "Una solicitud no es una reserva ni un pago.",
    talismansTitle: "Elige un talismán simbólico", talismansIntro: "Catálogo ilustrado existente; el profesional confirma disponibilidad y precio.",
    energyTitle: "Cursos y programas", energyIntro: "Clases originales y catálogo completo de la Academia.",
    coursesAll: "Todos los cursos", mastersShort: "Guías", coursesReiki: "Curso de Tantra Reiki",
    mysteryCourses: "Cursos originales de misterios", mysterySource: "Audio original en ruso · archivo PsiMaster",
    watchLesson: "Ver lección", openCourse: "Ver programa", lessonCount: "vídeos",
    lessonOrdinal: "Lección", lessonOf: "de", lessonPrevious: "Lección anterior", lessonNext: "Lección siguiente",
    originalCourseVideos: "Lecciones originales en vídeo",
    healingTitle: "Apoyo Reiki", healingIntro: "Encuentra profesionales y servicios publicados de apoyo a distancia.",
    healingMasters: "Ver profesionales", healingServices: "Servicios de apoyo Reiki",
    energyAction: "Buscar profesional", energyHide: "Cerrar solicitud", energyNote: "Solicitar no significa reservar ni pagar.",
    progress: "Tu progreso", started: "Vídeos abiertos aquí", focusStatus: "Puntuación más baja",
    private: "Solo en esta pantalla", privateInfo: "Puntuaciones, foto e historial no se envían ni se guardan en tu cuenta.",
    newUi: "Apoyo móvil", standard: "Página de apoyo clásica", navHome: "Inicio", navPractices: "Mis prácticas", navMessages: "Mensajes", navProgress: "Mi progreso", navSettings: "Ajustes",
    settings: "Perfil y ajustes", language: "Idioma", close: "Cerrar ajustes",
    healthNote: "Prácticas de reflexión, no diagnósticos ni tratamientos médicos.",
  },
} as const;

/** Labels describe the existing free programme; original media IDs remain in Academy. */
const reikiCourseCopy = {
  en: {
    price: "Price · €0", audio: "English-language video",
    start: "Take the course free", watch: "Watch preview video",
    lessons: {
      "flight-to-sun": { title: "Free Reiki course · Flight to the Sun", description: "Start the existing free five-lesson Reiki Practitioner course with Sun Flight, then explore Tantra, Kundalini and Yggdrasil Reiki." },
      "tantra-reiki": { title: "Tantra Reiki · Level 1", description: "Explore presence and connection through this free Reiki lesson. Original video in English; personal initiation is arranged separately." },
      "kundalini-reiki": { title: "Kundalini Reiki · Level 1", description: "Try Andrey’s guided meditation and continue with the free five-lesson Reiki programme. Audio is in English." },
      "reiki-yggdrasil": { title: "Reiki Yggdrasil · Introduction", description: "Explore the World Tree and symbolic practices in the free Reiki Practitioner course. English-language video." },
    },
  },
  ru: {
    price: "Цена · €0", audio: "Видео на английском",
    start: "Пройти курс бесплатно", watch: "Смотреть видеоурок",
    lessons: {
      "flight-to-sun": { title: "Бесплатный курс Рейки · Полёт к Солнцу", description: "Начните бесплатный курс «Практик Рейки» из пяти уроков с медитации «Полёт к Солнцу». Далее — Тантра, Кундалини и Рейки Иггдрасиль." },
      "tantra-reiki": { title: "Тантра Рейки · 1-я ступень", description: "Практика присутствия, внимания и контакта из бесплатного курса «Практик Рейки». Видео на английском, личная инициация согласуется отдельно." },
      "kundalini-reiki": { title: "Кундалини Рейки · 1-я ступень", description: "Авторская медитация Андрея и бесплатные уроки об опоре, внимании и разных системах Рейки. Видео идёт на английском." },
      "reiki-yggdrasil": { title: "Рейки Иггдрасиль · введение", description: "Знакомство с Древом Миров и символическими практиками в бесплатном курсе из пяти уроков. Оригинальное видео на английском." },
    },
  },
  es: {
    price: "Precio · €0", audio: "Vídeo en inglés",
    start: "Hacer el curso gratis", watch: "Ver la lección",
    lessons: {
      "flight-to-sun": { title: "Curso Reiki gratis · Vuelo al Sol", description: "Comienza el curso gratuito de cinco lecciones con Vuelo al Sol. Continúa con Tantra, Kundalini y Yggdrasil Reiki." },
      "tantra-reiki": { title: "Tantra Reiki · Nivel 1", description: "Explora la atención y la conexión en el curso gratuito. Vídeo original en inglés; la iniciación personal es aparte." },
      "kundalini-reiki": { title: "Kundalini Reiki · Nivel 1", description: "Prueba la meditación original de Andrey y continúa con el curso gratuito. Vídeo en inglés." },
      "reiki-yggdrasil": { title: "Reiki Yggdrasil · Introducción", description: "Descubre el Árbol del Mundo en el curso de cinco lecciones. Vídeo original en inglés." },
    },
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

export function HolisticSupportMobile({ locale, videos, courses = [], initialChoice = "meditation", initialTheme = "all", guideTests = {} }: {
  locale: PublicLocale;
  videos: SupportMobileVideo[];
  courses?: SupportMobileCourse[];
  initialChoice?: SupportMobileChoice;
  initialTheme?: Theme;
  guideTests?: Record<string, SupportGuideTest[]>;
}) {
  const t = copy[locale];
  const reikiText = reikiCourseCopy[locale];
  const freeCourseHref = REIKI_FREE_COURSE_PATH.replace(/^\/en\//, "/" + locale + "/");
  // Single owner for the five synchronized check-ins in both UI locations.
  const [scores, setScores] = useState<Record<CheckinArea, number>>({
    energy: 5, money: 5, relationships: 5, meaning: 5,
  });
  const [choice, setChoice] = useState<Choice>(initialChoice);
  // The visitor explicitly requests a local ranking snapshot; editing a rating
  // clears it. Ties are matched jointly and never become a hidden focus choice.
  const [recommendation, setRecommendation] = useState<Record<Focus, number> | null>(null);
  const [editedCheckins, setEditedCheckins] = useState<CheckinArea[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideVersion, setGuideVersion] = useState(0);
  const [goalFilterOpen, setGoalFilterOpen] = useState(false);
  const [profileSector, setProfileSector] = useState<GoalSector>("energy");
  const [activeCourseProfile, setActiveCourseProfile] = useState<CourseProfileSector>("energy");
  const [goalSelection, setGoalSelection] = useState<GoalSelection | null>(null);
  // Local-only accepted diagnostic sectors, maintained when the filter closes.
  const [goalSavedSectors, setGoalSavedSectors] =
    useState<Partial<Record<GoalSector, GoalSectorSnapshot>>>({});
  const [goalRecommendationFormats, setGoalRecommendationFormats] =
    useState<GoalRecommendationFormat[]>(() => [...GOAL_RECOMMENDATION_FORMATS]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [master, setMaster] = useState<Author>("all");
  const [program, setProgram] = useState<Program>("all");
  const [theme, setTheme] = useState<Theme>(initialTheme);
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
  const focusScores = asFocusScores(scores);
  const lowestFocus: Focus = focusOrder.reduce((lowest, domain) =>
    focusScores[domain] < focusScores[lowest] ? domain : lowest, focusOrder[0]);
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
    ? [...videos.filter(video => video.courseKey), ...videos.filter(video => !video.courseKey),
      ...courses.flatMap(course => course.videos)]
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
    // Show all source-ordered episodes when a specific course is selected;
    // keep the four-thumbnail reference layout for regular meditations.
    if (choice === "pump" && program !== "all") return eligible;
    return eligible.slice(0, 4);
  }, [browseVideos, master, program, theme, choice, suggested, goalMatch]);
  const selected = relevantVideos.find(video => video.id === selectedId) ??
    videos.find(video => video.id === selectedId) ?? relevantVideos[0];
  const sourceAudio = selected?.sourceLanguage === "ru" ? t.originalRu : t.originalEn;
  const activeReiki = choice === "pump" && selected?.courseKey ? reikiText.lessons[selected.courseKey] : null;
  const activeMystery = choice === "pump" ? courses.find(course => course.id === program) : undefined;
  const selectedLessonIndex = relevantVideos.findIndex(video => video.id === selected?.id);
  const videoSrc = selected ? "https://www.youtube-nocookie.com/embed/" +
    encodeURIComponent(selected.id) + "?autoplay=1&playsinline=1&rel=0" : "";
  const pickVideo = (id: string) => { setSelectedId(id); setPlaying(false); };
  const scrollToSupport = (id: string) => window.requestAnimationFrame(() =>
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    }));
  const onCheckinChange = (id: CheckinArea, value: number) => {
    if (!Number.isInteger(value) || value < 1 || value > 10) return;
    setScores(previous => ({ ...previous, [id]: value }));
    setEditedCheckins(previous => previous.includes(id) ? previous : [...previous, id]);
    // Invalidate previously applied ranking; keep accepted category answers.
    setGuideOpen(false);
    setRecommendation(null); setGoalSelection(null);
  };
  const onRecommendations = () => {
    // No unsolicited analysis: launch dialogue from the user's actual inputs.
    setRecommendation(asFocusScores(scores));
    setGoalFilterOpen(false);
    setGuideVersion(previous => previous + 1); setGuideOpen(true);
    scrollToSupport("support-goal-results");
  };
  const openGoalFilter = () => {
    setProfileSector(goalSelection?.sector ?? ({ energy: "energy", money: "money",
      relationships: "love", goals: "meaning" } as Record<Focus, GoalSector>)[focus]);
    setPlaying(false); setGuideOpen(false); setGoalFilterOpen(true);
    window.requestAnimationFrame(() => document.getElementById("support-mobile-experience")
      ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };
  const openCourseProfileFilter = (sector: GoalSector) => {
    setActiveCourseProfile(sector);
    setProfileSector(sector);
    setPlaying(false);
    setGoalFilterOpen(true);
    window.requestAnimationFrame(() => document.getElementById("support-mobile-experience")
      ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };
  const saveGoalSector = (sector: GoalSector, value: GoalSectorSnapshot) => {
    setGoalSavedSectors(previous => ({ ...previous, [sector]: value }));
  };
  const applyGoalFilter = (value: GoalSelection) => {
    if (value.savedSectors) setGoalSavedSectors(value.savedSectors);
    const formats = value.recommendationFormats ?? [...GOAL_RECOMMENDATION_FORMATS];
    setGoalRecommendationFormats(formats);
    // The featured panel must follow chosen formats, not display an unwanted video.
    const inlineChoice: Partial<Record<GoalRecommendationFormat, Choice>> = {
      meditation: "meditation", consultation: "consultation", tests: "tests",
      courses: "pump", talismans: "talisman", healing: "healing", masters: "masters",
    };
    const firstInline = GOAL_RECOMMENDATION_FORMATS.find(id =>
      formats.includes(id) && inlineChoice[id]);
    // Three "Now → Want" measures remain independent. Applying them must
    // never overwrite the dedicated check-in, which syncs on every drag.
    setRecommendation(asFocusScores(scores));
    setGoalSelection(value);
    setGuideVersion(previous => previous + 1); setGuideOpen(true);
    setGoalFilterOpen(false); setChoice(firstInline ? inlineChoice[firstInline]! : "meditation");
    setTheme("all"); setProgram("all"); setMaster("all");
    setSelectedId(null); setPlaying(false);
    window.requestAnimationFrame(() => document.getElementById("support-mobile-experience")
      ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };
  const showCourseProfileRecommendations = (sector: GoalSector) => {
    const saved = goalSavedSectors[sector];
    // Do not claim a tailored report before the visitor accepts the
    // relevant self-rating. Reuse the existing consent-free local editor.
    if (!saved || saved.checkin !== scores[goalSectorCheckinKey[sector]]) {
      openCourseProfileFilter(sector); return;
    }
    setActiveCourseProfile(sector);
    setProfileSector(sector);
    applyGoalFilter({ ...saved, sector, savedSectors: goalSavedSectors,
      recommendationFormats: goalRecommendationFormats });
  };
  const resetGoalFilter = () => {
    setGoalSavedSectors({}); setGoalRecommendationFormats([...GOAL_RECOMMENDATION_FORMATS]);
    setGoalSelection(null); setRecommendation(null); setTheme("all"); setGuideOpen(false);
  };
  const startVideo = () => {
    if (!selected) return;
    setPlaying(true);
    setOpened(previous => previous.includes(selected.id) ? previous : [...previous, selected.id]);
  };
  const changeChoice = (value: Choice) => {
    setGoalFilterOpen(false); setChoice(value); setPlaying(false); setSelectedId(null);
    if (value === "pump") { setTheme("all"); setProgram("all"); setMaster("all"); }
  };
  // Scroll only after React actually commits the new Tests panel. This also
  // supports direct deep links from the video mandala editor (?view=tests).
  useEffect(() => {
    if (choice !== "tests" || goalFilterOpen) return;
    const frame = window.requestAnimationFrame(() =>
      document.getElementById("support-tests-panel")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      }));
    return () => window.cancelAnimationFrame(frame);
  }, [choice, goalFilterOpen]);
  const activeProgramValues = Array.from(new Set(browseVideos.map(video => video.program)));
  const activeAuthorValues = Array.from(new Set(browseVideos.map(video => video.author)));
  const progressCount = relevantVideos.filter(video => opened.includes(video.id)).length;
  const progressTotal = relevantVideos.length;
  const averageScore = (checkinOrder.reduce((sum, id) => sum + scores[id], 0) / checkinOrder.length).toFixed(1);
  const FocusIcon = scoreIcons[focus];
  const ActiveFocusIcon = goalSelection?.sector === "meaning" ? Flower2 : FocusIcon;
  const activeFocusLabel = goalSelection ? t.goalSector[goalSelection.sector] : t.foci[focus];
  const activeGoalFormats = goalSelection?.recommendationFormats ?? GOAL_RECOMMENDATION_FORMATS;
  const goalHasInlineFormat = activeGoalFormats.some(id =>
    ["meditation", "consultation", "tests", "courses", "talismans", "healing", "masters"].includes(id));
  // Real catalogue and published player reused by the conversation; no paid AI call.
  const guidePreferredVideo = goalMatch?.videos[0] ?? null;
  const openGuideVideo = (id: string | null) => {
    if (goalSelection && !activeGoalFormats.includes("meditation")) { openGoalFilter(); return; }
    setRecommendation(asFocusScores(scores)); setChoice("meditation"); setGoalFilterOpen(false);
    setTheme("all"); setProgram("all"); setMaster("all");
    setSelectedId(id); setPlaying(false);
    scrollToSupport("support-meditation-player");
  };
  const openGuideChoice = (selectedChoice: "meditation" | "tests" | "pump" | "consultation" | "healing") => {
    changeChoice(selectedChoice);
    scrollToSupport(selectedChoice === "consultation" ? "support-consultation-panel"
      : selectedChoice === "healing" ? "support-healing-panel" : "support-mobile-experience");
  };
  // Courses reuse the published video player; the four check-in profiles belong to Tests.
  const scene = choice === "meditation" || choice === "pump";

  return (
    <main className={styles.page} data-holistic-mobile-alternative lang={locale}>
      <div className={styles.container}>
        <header className={styles.compactAppHeader} data-support-app-header>
          <Link href={"/" + locale + "/holistic-support/mobile"} prefetch={false} className={styles.compactBrand}>
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
              {checkinOrder.map(id => {
                const Icon = scoreIcons[id];
                const label = id === "meaning" ? t.goalSector.meaning : t.foci[id];
                return <label className={styles.scaleRow} key={id} data-support-scale={id}>
                  <span className={styles.scaleIcon} data-tone={id}><Icon size={23} aria-hidden="true" /></span>
                  <span className={styles.scaleDetail}>
                    <span className={styles.scaleLabel}>{label}</span>
                    <input type="range" min="1" max="10" step="1" value={scores[id]}
                      aria-label={label} aria-valuetext={scores[id] + " / 10"}
                      onChange={event => onCheckinChange(id, Number(event.target.value))} />
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
            <button type="button" className={styles.testsShortcut} data-support-tool="tests"
              aria-pressed={choice === "tests"} aria-controls="support-tests-panel"
              onClick={() => changeChoice("tests")}>
              <TestTubeDiagonal size={15} aria-hidden="true" /><span>{t.testsShort}</span>
            </button>
            {photoError ? <p className={styles.photoError} role="alert">{photoError}</p> : null}
            <div className={styles.focusSelector} data-support-active-focus aria-label={t.focusLabel}>
              <span className={styles.focusCaption}>{t.focusLabelShort}</span>
              <span className={styles.focusValue}><ActiveFocusIcon size={19} aria-hidden="true" /><strong>{activeFocusLabel}</strong></span>
            </div>
            <button type="button" className={styles.recommendButton}
              data-support-recommendations aria-label={t.recommend} aria-controls="support-goal-results"
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
              <Link href={"/" + locale + "/holistic-support/mandala"} prefetch={false}
                className={styles.mandalaShortcut} data-support-video-mandala
                aria-label={t.videoMandala}>
                <Sparkles size={18} aria-hidden="true" /><span>{t.videoMandala}</span>
              </Link>
            </div>
          </section>
        </div>

        <section className={styles.experience} id="support-mobile-experience" aria-live="off">
          {guideOpen && !goalFilterOpen ? <HolisticSupportInlineGuide
            key={guideVersion} locale={locale} scores={scores} editedCheckins={editedCheckins}
            goalSelection={goalSelection} videos={videos} preferredVideo={guidePreferredVideo}
            guideTests={guideTests}
            onClose={() => setGuideOpen(false)} onRefine={openGoalFilter}
            onVideo={openGuideVideo} onChoice={openGuideChoice} /> : null}
          {goalFilterOpen ? <HolisticSupportGoalFilter locale={locale} scores={scores}
            initial={goalSelection} onApply={applyGoalFilter} onReset={resetGoalFilter}
            savedSectors={goalSavedSectors} onSave={saveGoalSector} preferredSector={profileSector}
            onCheckinChange={(sector, value) => onCheckinChange(goalSectorCheckinKey[sector], value)}
            selectedFormats={goalRecommendationFormats} onSelectedFormatsChange={setGoalRecommendationFormats}
            onClose={() => setGoalFilterOpen(false)} /> : goalSelection && !goalHasInlineFormat && choice !== "pump" && choice !== "tests" ? (
            <div className={styles.goalNoInline} role="status" data-support-goal-no-inline>
              <p data-support-goal-empty={activeGoalFormats.length === 0 ? "true" : undefined}>
                {activeGoalFormats.length ? t.goalExternalOnly : t.goalNoFormats}
              </p>
              <button type="button" onClick={openGoalFilter}>{t.goalAdjust}</button>
            </div>
          ) : scene ? (
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
              <div className={styles.hero} id="support-meditation-player" data-support-player data-playing={playing ? "true" : "false"}>
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
                    {activeReiki ? <div className={styles.reikiPills} data-support-reiki-price>
                      <span className={styles.reikiPricePill}>{reikiText.price}</span>
                      <span className={styles.reikiAudioPill}>{reikiText.audio}</span>
                    </div> : null}
                    <h2>{activeReiki?.title ?? (choice === "pump" ? activeMystery ? t.programs[activeMystery.id] : t.energyTitle : goalSelection ? t.goalHero[goalSelection.sector] : t.heroTitle[focus])}</h2>
                    <p className={styles.heroDescription}>{activeReiki?.description ?? (selected ? selected.title : t.heroIntro)}</p>
                    {selected ? <div className={styles.reikiHeroActions}>
                      {activeReiki ? <Link href={freeCourseHref} prefetch={false} className={styles.reikiStartCourse}
                        data-support-free-reiki-cta><BookOpen size={20} aria-hidden="true" />{reikiText.start}<ArrowRight size={18} aria-hidden="true" /></Link> : null}
                      <button type="button" onClick={startVideo}
                        className={styles.playButton + (activeReiki ? " " + styles.reikiPreviewButton : "")}
                        data-support-play><Play size={24} fill="currentColor" aria-hidden="true" />{activeReiki ? reikiText.watch : choice === "pump" ? t.watchLesson : t.play}</button>
                    </div> : <p role="status" className={styles.noVideo}>{t.notAvailable}</p>}
                    {activeMystery ? <Link className={styles.heroCourseLink} href={activeMystery.seriesHref ?? activeMystery.href} prefetch={false}
                      data-support-active-course-link>{t.openCourse}<ArrowRight size={17} aria-hidden="true" /></Link> : null}
                  </div>
                )}
                {playing && activeReiki ? <div className={styles.reikiAfterVideo}>
                  <span className={styles.reikiPricePill}>{reikiText.price}</span>
                  <span className={styles.reikiAudioPill}>{reikiText.audio}</span>
                  <Link href={freeCourseHref} prefetch={false} data-support-free-reiki-cta>
                    {reikiText.start}<ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div> : null}
              </div>
              <div className={styles.videoSection} id="support-meditation-gallery" data-support-meditation-gallery
                data-support-video-mode={choice}>
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
                      data-support-video={video.id} data-source-order={video.lessonOrder}
                      onClick={() => pickVideo(video.id)} aria-label={video.title}>
                      <Image src={"https://i.ytimg.com/vi/" + encodeURIComponent(video.id) + "/mqdefault.jpg"}
                        alt="" width={320} height={180} unoptimized loading="lazy" />
                      <span className={styles.videoDark} aria-hidden="true" />
                      <span className={styles.thumbnailPlay}><Play size={20} fill="currentColor" aria-hidden="true" /></span>
                      <span className={styles.videoCaption}>
                        <span className={styles.videoTitle}>{choice === "pump" && video.courseKey
                          ? reikiText.lessons[video.courseKey].title : <>
                          {choice === "pump" && activeMystery && video.lessonOrder ? `${t.lessonOrdinal} ${video.lessonOrder} · ` : ""}
                          {shortVideoTitle(video.title, locale)}
                        </>}</span>
                        {choice === "pump" && video.courseKey ? <span className={styles.videoMetaPills}>
                          <small className={styles.videoPricePill}>{reikiText.price}</small>
                          <small className={styles.videoAudioPill}>{reikiText.audio}</small>
                        </span> : null}
                      </span>
                    </button>)}
                  </div>
                ) : <p role="status" className={styles.emptyMessage}>{t.notAvailable}</p>}
                {choice === "pump" && activeMystery && selectedLessonIndex >= 0 ? (
                  <nav className={styles.lessonNavigation} aria-label={t.originalCourseVideos}
                    data-support-lesson-navigation>
                    <button type="button" disabled={selectedLessonIndex === 0}
                      onClick={() => pickVideo(relevantVideos[selectedLessonIndex - 1].id)}>
                      {t.lessonPrevious}
                    </button>
                    <span aria-live="polite">{t.lessonOrdinal} {selectedLessonIndex + 1} {t.lessonOf} {relevantVideos.length}</span>
                    <button type="button" disabled={selectedLessonIndex === relevantVideos.length - 1}
                      onClick={() => pickVideo(relevantVideos[selectedLessonIndex + 1].id)}>
                      {t.lessonNext}
                    </button>
                  </nav>
                ) : null}
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
          ) : choice === "tests" ? (
            <section className={styles.testsPanel} id="support-tests-panel"
              data-support-tests-panel aria-labelledby="support-tests-title">
              <HolisticSupportCourseProfiles locale={locale} courses={courses}
                savedSectors={goalSavedSectors} active={activeCourseProfile} onSelect={setActiveCourseProfile}
                onTests={() => window.location.assign("/" + locale + "/client/tests")}
                onFillProfile={openCourseProfileFilter}
                onRecommendations={showCourseProfileRecommendations} />
              <div className={styles.testsHero}>
                <span className={styles.testsEyebrow}><TestTubeDiagonal size={18} aria-hidden="true" />{t.testsShort}</span>
                <h2 id="support-tests-title">{t.testsTitle}</h2>
                <p>{t.testsIntro}</p>
                <Link href={"/" + locale + "/client/tests"} prefetch={false} className={styles.testsPrimary}
                  data-support-open-tests>{t.tests}<ArrowRight size={18} aria-hidden="true" /></Link>
              </div>
              <div className={styles.testsLinks}>
                <Link href={"/" + locale + "/personality-profiles"} prefetch={false}
                  data-support-tests-personality>
                  <UserRound size={22} aria-hidden="true" />
                  <span><strong>{t.testsProfiles}</strong><small>{t.testsProfilesHint}</small></span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link href={"/" + locale + "/tests"} prefetch={false} data-support-tests-guide>
                  <BookOpen size={22} aria-hidden="true" />
                  <span><strong>{t.testsGuide}</strong><small>{t.testsGuideHint}</small></span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
              <p className={styles.testsNotice}><ShieldCheck size={17} aria-hidden="true" />{t.testsPrivacy}</p>
            </section>
          ) : choice === "talisman" ? (
            <div id="support-talisman-panel" data-support-talisman-experience>
              <HolisticSupportTalismanViewer key={focus} locale={locale} focus={focus}
                rankedIds={recommended?.talismans.map(item => item.id)}
                catalogOpen={talismanCatalogOpen} onToggleCatalog={() => setTalismanCatalogOpen(open => !open)} />
              <div id="support-talisman-full-catalog" className={styles.insetPanel} hidden={!talismanCatalogOpen}>
                {talismanCatalogOpen ? <TaoistTalismanCatalog locale={locale}
                  featuredId={recommendedTalisman?.id} rankedIds={recommended?.talismans.map(item => item.id)} /> : null}
              </div>
            </div>

          ) : choice === "healing" || choice === "masters" ? (
            <div id="support-healing-panel" data-support-healing-panel>
              <HolisticSupportMasterGallery locale={locale} kind={choice} />
            </div>
          ) : (
            <div id="support-consultation-panel" data-support-consultation-panel>
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
        </footer>
      </div>

      {settingsOpen ? <HolisticSupportSettingsPanel locale={locale} id="support-mobile-settings"
        section="mobile" privacyNote={t.privateInfo} onClose={() => setSettingsOpen(false)} /> : null}

      <nav className={styles.bottomNav} aria-label={t.newUi} data-support-mobile-bottom-nav>
        <Link href={"/" + locale + "/holistic-support/mobile"} prefetch={false}><Home size={24} aria-hidden="true" /><span>{t.navHome}</span></Link>
        <Link href={"/" + locale + "/practice"} prefetch={false}><Compass size={24} aria-hidden="true" /><span>{t.navPractices}</span></Link>
        <Link href={"/" + locale + "/app/messages?tab=chats"} prefetch={false} data-support-mobile-messages>
          <MessageCircle size={24} aria-hidden="true" /><span>{t.navMessages}</span>
        </Link>
        <a href="#support-progress"><BarChart3 size={24} aria-hidden="true" /><span>{t.navProgress}</span></a>
        <button type="button" aria-expanded={settingsOpen} aria-controls="support-mobile-settings"
          onClick={() => setSettingsOpen(open => !open)} data-support-mobile-account-settings>
          <Settings2 size={24} aria-hidden="true" /><span>{t.navSettings}</span>
        </button>
      </nav>
    </main>
  );
}
