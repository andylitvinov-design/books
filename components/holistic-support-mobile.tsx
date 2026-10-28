"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Camera, ChevronDown, ChevronRight, Filter,
  Coins, Compass, Flower2, HandHeart, Heart, Home, Leaf, Play, RotateCcw,
  Settings2, ShieldCheck, Sparkles, TestTubeDiagonal, MessageCircle, UserRound, X, Zap,
} from "lucide-react";

import { TaoistTalismanCatalog } from "@/components/taoist-talisman-catalog";
import { HolisticSupportInlineGuide } from "@/components/holistic-support-inline-guide";
import { SupportGuestQuestPanel, useSupportGuestQuest } from "@/components/holistic-support-guest-quest";
import type { QuestStepId } from "@/lib/holistic-support/guest-quest.mjs";
import { HolisticSupportTalismanViewer } from "@/components/holistic-support-talisman-viewer";
import { HolisticSupportCourseProfiles, type CourseProfileSector } from "@/components/holistic-support-course-profiles";
import { HolisticSupportMasterGallery } from "@/components/holistic-support-master-gallery";
import { GOAL_RECOMMENDATION_FORMATS, HolisticSupportGoalFilter,
  goalSectorFocus, goalSectorCheckinKey, summarizeGoalSelection,
  type GoalSelection, type GoalSector, type GoalSectorSnapshot,
  type GoalRecommendationFormat } from "@/components/holistic-support-goal-filter";
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
  description?: string;
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
// Meaning is a separate fifth check-in; the published video topic engine
// continues to use the original four-focus ranking.
type CheckinArea = Exclude<Focus, "goals"> | "meaning";
export type SupportMobileChoice = "meditation" | "consultation" | "talisman" | "pump" | "healing" | "masters" | "tests";
type Choice = SupportMobileChoice;
type Program = "all" | SupportMobileVideo["program"];
type Author = "all" | SupportMobileVideo["author"];
type Theme = "all" | MeditationTopic;
type MeditationCategory = "energy" | "money" | "relationships" | "meaning" | "health" | "all";

const meditationCategoryOptions = [
  { id: "energy", Icon: Zap },
  { id: "money", Icon: Coins },
  { id: "relationships", Icon: Heart },
  { id: "meaning", Icon: Flower2 },
  { id: "health", Icon: HandHeart },
  { id: "all", Icon: Compass },
] as const;
// Reuse the verified recording facets; Meaning has no dedicated recorded tag,
// so only the general Sun originals appear, explicitly labelled as related.
const meditationCategoryTopics: Partial<Record<MeditationCategory, MeditationTopic>> = {
  energy: "energy", money: "business", relationships: "love", health: "health",
};

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
    programs: { sun: "Sun practices", reiki: "Reiki meditations", energy: "Energy archive", maya: "Maya mysteries", egypt: "Egyptian mysteries", greek: "Greek mysteries" },
    themes: { all: "All topics", business: "Work & money", love: "Relationships", energy: "Energy", health: "Wellbeing" },
    meditationCategoriesTitle: "Meditations", meditationCategoryLead: "Choose a direction",
    meditationCategoryAll: "All categories", meditationCategoryMore: "More categories",
    meditationCategoryNames: { energy: "Energy meditations", money: "Money & business meditations",
      relationships: "Relationships & love", meaning: "Meaning & purpose", health: "Wellbeing", all: "All recordings" },
    meditationCategoryShortNames: { energy: "Energy", money: "Money", relationships: "Love",
      meaning: "Meaning", health: "Wellbeing", all: "All" },
    meditationCategoryHero: { energy: "Restore your energy", money: "Explore money & work",
      relationships: "Reconnect with love", meaning: "Explore your meaning",
      health: "Take care of yourself", all: "Choose a meditation" },
    meditationCategoryRelated: "Related original Sun practices; no recording is specifically tagged with Meaning.",
    heroTitle: { energy: "Restore your energy", money: "Make space for clarity", relationships: "Reconnect with yourself", goals: "Explore meaning and direction" },
    heroIntro: "Choose an original guided recording and take a quiet moment.",
    play: "Start meditation", playLimitReached: "Guest starts used", playToContinue: "Free sign-in to continue", originalEn: "Original English audio", originalRu: "Original Russian audio",
    youtube: "Open on YouTube", seeAll: "View all", gallery: "More original meditations", galleryHint: "Illustrative covers; original verified recordings.",
    feedTitle: "Explore all meditations", feedHint: "Scroll through the descriptions and select a recording. It opens in the player above; playback never starts automatically.",
    feedChoose: "Select", feedAudioRu: "Russian audio", feedAudioEn: "English audio",
    feedFallback: "An original recording from the published collection.", feedCount: "videos", average: "Self-rating", lowestHint: "Lowest ratings:", lowestNote: "Optional topics, not a diagnosis.",
    notAvailable: "No verified recordings match those filters. Try All.",
    testsTitle: "Explore your situation", testsIntro: "Choose an existing free self-check or a personality profile. These tests support reflection, not medical diagnosis.",
    testsShort: "Tests", tests: "Open free tests", testsProfiles: "Personality profiles", testsProfilesHint: "Explore existing profile questionnaires", testsGuide: "How tests work", testsGuideHint: "Understand privacy and results", testsPrivacy: "Your ratings and photo on this screen are not sent to the tests catalogue.", consult: "Request a consultation", consultNote: "Sending a request is not a confirmed booking or payment.",
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
    private: "Private on this page", privateInfo: "Sliders, photos, video IDs and test results are not stored here. Only anonymous player-start counts and step flags stay in this browser; they are not automatically saved to your account.",
    newUi: "Mobile support experience", standard: "Standard Support page", navHome: "Home", navPractices: "My practices", navMessages: "Messages", navProgress: "My progress", navSettings: "Settings",
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
    programs: { sun: "Практики Солнца", reiki: "Медитации Рейки", energy: "Энергоархив", maya: "Мистерии Майя", egypt: "Мистерии Египта", greek: "Мистерии Греции" },
    themes: { all: "Все темы", business: "Деньги и дело", love: "Отношения", energy: "Энергия", health: "Самочувствие" },
    meditationCategoriesTitle: "Медитации", meditationCategoryLead: "Выбери направление",
    meditationCategoryAll: "Все категории", meditationCategoryMore: "Другие категории",
    meditationCategoryNames: { energy: "Медитации для энергии", money: "Деньги и дело",
      relationships: "Отношения и любовь", meaning: "Смыслы и предназначение", health: "Самочувствие", all: "Все записи" },
    meditationCategoryShortNames: { energy: "Энергия", money: "Деньги", relationships: "Любовь",
      meaning: "Смыслы", health: "Здоровье", all: "Все" },
    meditationCategoryHero: { energy: "Восстанови свою энергию", money: "Исследуй деньги и дело",
      relationships: "Верни близость и тепло", meaning: "Исследуй свои смыслы",
      health: "Позаботься о себе", all: "Выбери медитацию" },
    meditationCategoryRelated: "Близкие оригинальные практики Солнца: отдельной записи с темой «Смыслы» пока нет.",
    heroTitle: { energy: "Восстанови свою энергию", money: "Найди ясность в решениях", relationships: "Вернись к себе", goals: "Найди смыслы и направление" },
    heroIntro: "Выбери оригинальную запись и удели себе немного времени.",
    play: "Начать медитацию", playLimitReached: "Заряд закончился", playToContinue: "Войти бесплатно и продолжить", originalEn: "Оригинальный звук: английский", originalRu: "Оригинальный звук: русский",
    youtube: "Открыть на YouTube", seeAll: "Все видео", gallery: "Другие медитации", galleryHint: "Обложки — иллюстрации. Записи — оригинальные.",
    feedTitle: "Лента медитаций", feedHint: "Листай вниз и выбирай запись по описанию. Она откроется в большом плеере сверху, без автозапуска.",
    feedChoose: "Выбрать", feedAudioRu: "звук RU", feedAudioEn: "звук EN",
    feedFallback: "Оригинальная запись из опубликованной коллекции.", feedCount: "видео", average: "Самооценка", lowestHint: "По минимальным оценкам:", lowestNote: "Подбор тем, не диагноз.",
    notAvailable: "По этим фильтрам нет подтверждённых записей. Выберите «Все».",
    testsTitle: "Исследуй свой запрос", testsIntro: "Выбери бесплатный тест или профиль личности. Результаты помогают в самоисследовании, но не заменяют диагностику.",
    testsShort: "Тесты", tests: "Открыть тесты", testsProfiles: "Профили личности", testsProfilesHint: "Существующие опросники и типологии", testsGuide: "О тестах", testsGuideHint: "Как проходят тесты и сохраняются результаты", testsPrivacy: "Оценки и фото с этого экрана не передаются в каталог тестов.", consult: "Запросить консультацию", consultNote: "Заявка — ещё не подтверждённая запись и не оплата.",
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
    private: "Лично на этом экране", privateInfo: "Оценки, фото, названия видео и ответы тестов здесь не сохраняются. В браузере остаются только общий счётчик запусков и отметки шагов; в кабинет они автоматически не переносятся.",
    newUi: "Мобильная поддержка", standard: "Обычная страница поддержки", navHome: "Главная", navPractices: "Мои практики", navMessages: "Сообщения", navProgress: "Мой прогресс", navSettings: "Настройки",
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
    programs: { sun: "Prácticas del Sol", reiki: "Meditaciones Reiki", energy: "Archivo energético", maya: "Misterios mayas", egypt: "Misterios egipcios", greek: "Misterios griegos" },
    themes: { all: "Todos los temas", business: "Trabajo y dinero", love: "Relaciones", energy: "Energía", health: "Bienestar" },
    meditationCategoriesTitle: "Meditaciones", meditationCategoryLead: "Elige una dirección",
    meditationCategoryAll: "Todas las categorías", meditationCategoryMore: "Más categorías",
    meditationCategoryNames: { energy: "Meditaciones de energía", money: "Dinero y trabajo",
      relationships: "Amor y relaciones", meaning: "Sentido y propósito", health: "Bienestar", all: "Todas las grabaciones" },
    meditationCategoryShortNames: { energy: "Energía", money: "Dinero", relationships: "Amor",
      meaning: "Sentido", health: "Bienestar", all: "Todas" },
    meditationCategoryHero: { energy: "Recupera tu energía", money: "Explora el trabajo y el dinero",
      relationships: "Conecta con el amor", meaning: "Explora tu propósito",
      health: "Cuida de ti", all: "Elige una meditación" },
    meditationCategoryRelated: "Prácticas originales del Sol relacionadas; aún no hay una grabación etiquetada específicamente como Sentido.",
    heroTitle: { energy: "Recupera tu energía", money: "Encuentra claridad", relationships: "Vuelve a ti", goals: "Explora sentido y dirección" },
    heroIntro: "Elige una grabación original y disfruta de un momento de calma.",
    play: "Empezar meditación", playLimitReached: "Sin inicios de invitado", playToContinue: "Entrar gratis para seguir", originalEn: "Audio original en inglés", originalRu: "Audio original en ruso",
    youtube: "Abrir en YouTube", seeAll: "Ver todas", gallery: "Otras meditaciones", galleryHint: "Portadas ilustrativas; grabaciones originales verificadas.",
    feedTitle: "Explora todas las meditaciones", feedHint: "Desplázate por las descripciones y elige una grabación. Se abrirá arriba, sin reproducción automática.",
    feedChoose: "Elegir", feedAudioRu: "audio en ruso", feedAudioEn: "audio en inglés",
    feedFallback: "Grabación original de la colección publicada.", feedCount: "vídeos", average: "Autoevaluación", lowestHint: "Según las puntuaciones más bajas:", lowestNote: "Temas orientativos, no diagnóstico.",
    notAvailable: "No hay vídeos verificados para esos filtros. Elige Todos.",
    testsTitle: "Explora tu situación", testsIntro: "Elige un test gratuito o un perfil de personalidad. Son herramientas de reflexión, no de diagnóstico.",
    testsShort: "Tests", tests: "Abrir tests gratuitos", testsProfiles: "Perfiles de personalidad", testsProfilesHint: "Cuestionarios y perfiles disponibles", testsGuide: "Sobre los tests", testsGuideHint: "Privacidad y resultados", testsPrivacy: "Tus puntuaciones y foto de esta pantalla no se envían al catálogo de tests.", consult: "Solicitar consulta", consultNote: "Una solicitud no es una reserva ni un pago.",
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
    private: "Solo en esta pantalla", privateInfo: "No se guardan puntuaciones, fotos, vídeos concretos ni respuestas. Solo un contador anónimo de inicios y los pasos marcados quedan en este navegador, no en tu cuenta.",
    newUi: "Apoyo móvil", standard: "Página de apoyo clásica", navHome: "Inicio", navPractices: "Mis prácticas", navMessages: "Mensajes", navProgress: "Mi progreso", navSettings: "Ajustes",
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

export function HolisticSupportMobile({ locale, videos, courses = [], initialChoice = "meditation" }: {
  locale: PublicLocale;
  videos: SupportMobileVideo[];
  courses?: SupportMobileCourse[];
  initialChoice?: SupportMobileChoice;
}) {
  const t = copy[locale];
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
  const [theme, setTheme] = useState<Theme>("all");
  // Until a category is chosen, follow the visitor’s existing lowest check-in.
  const [meditationCategoryOverride, setMeditationCategoryOverride] = useState<MeditationCategory | null>(null);
  const [allMeditationCategoriesOpen, setAllMeditationCategoriesOpen] = useState(false);
  const meditationCategoryRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [talismanCatalogOpen, setTalismanCatalogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const quest = useSupportGuestQuest();

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
  const meditationCategory: MeditationCategory = meditationCategoryOverride ?? (
    focus === "money" ? "money" : focus === "relationships" ? "relationships"
      : focus === "goals" ? "meaning" : "energy");
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
  // One source-backed filtered catalogue powers both the four featured tiles
  // and the full vertical feed. Selecting a recording outside the first four
  // must still change the same hero player, never silently reset to item one.
  const catalogVideos = useMemo(() => {
    const filtered = browseVideos.filter(video => (master === "all" || video.author === master) &&
      (program === "all" || video.program === program));
    const categoryFiltered = choice !== "meditation" || meditationCategory === "all" ? filtered
      : meditationCategory === "meaning" ? filtered.filter(video => video.program === "sun")
      : filtered.filter(video => video.topics.includes(meditationCategoryTopics[meditationCategory]!));
    const eligible = theme !== "all" ? categoryFiltered.filter(video => video.topics.includes(theme)) : categoryFiltered;
    if (goalMatch && choice === "meditation") {
      const order = new Map(goalMatch.videos.map((video, index) => [video.id, index]));
      return eligible.slice().sort((a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    }
    if (suggested && choice === "meditation") {
      const order = new Map(suggested.videos.map((video, index) => [video.id, index]));
      return eligible.slice().sort((a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    }
    return eligible;
  }, [browseVideos, master, program, theme, meditationCategory, choice, suggested, goalMatch]);
  const relevantVideos = catalogVideos.slice(0, 4);
  const selected = catalogVideos.find(video => video.id === selectedId) ??
    videos.find(video => video.id === selectedId) ?? relevantVideos[0];
  const sourceAudio = selected?.sourceLanguage === "ru" ? t.originalRu : t.originalEn;
  const activeMystery = choice === "pump" ? courses.find(course => course.id === program) : undefined;
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
    quest.mark("checkin");
    setScores(previous => ({ ...previous, [id]: value }));
    setEditedCheckins(previous => previous.includes(id) ? previous : [...previous, id]);
    // Invalidate previously applied ranking; keep accepted category answers.
    setGuideOpen(false);
    setRecommendation(null); setGoalSelection(null);
  };
  const onRecommendations = () => {
    quest.mark("recommendation");
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
    quest.mark("recommendation");
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
    setTheme("all"); setProgram("all"); setMaster("all"); setMeditationCategoryOverride("all");
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
    // A click/YouTube player start, never proof that the meditation was watched.
    if (!selected || !quest.launch()) return;
    setPlaying(true);
  };
  const chooseMeditationCategory = (value: MeditationCategory) => {
    quest.mark("category");
    setMeditationCategoryOverride(value);
    // A new primary direction must not inherit stale Programme/Master filters.
    setTheme("all"); setProgram("all"); setMaster("all"); setGoalSelection(null); setSelectedId(null); setPlaying(false);
  };
  const scrollMeditationCategories = () => {
    const rail = meditationCategoryRef.current;
    if (!rail) return;
    const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
    rail.scrollTo({
      left: atEnd ? 0 : Math.min(rail.scrollWidth, rail.scrollLeft + rail.clientWidth * 0.8),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };
  const changeChoice = (value: Choice) => {
    if (value === "pump") quest.mark("course");
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
    setTheme("all"); setProgram("all"); setMaster("all"); setMeditationCategoryOverride("all");
    setSelectedId(id); setPlaying(false);
    scrollToSupport("support-meditation-player");
  };
  const openGuideChoice = (selectedChoice: "meditation" | "tests" | "pump" | "consultation" | "healing") => {
    changeChoice(selectedChoice);
    scrollToSupport(selectedChoice === "consultation" ? "support-consultation-panel"
      : selectedChoice === "healing" ? "support-healing-panel" : "support-mobile-experience");
  };
  const scene = choice === "meditation";
  const onQuestStep = (id: QuestStepId) => {
    if (id === "checkin") { scrollToSupport("mobile-assessment-title"); return; }
    if (id === "category") { changeChoice("meditation"); scrollToSupport("meditation-category-options"); return; }
    if (id === "recommendation") { onRecommendations(); return; }
    if (id === "firstVideo" || id === "secondVideo") {
      changeChoice("meditation"); scrollToSupport("support-meditation-gallery"); return;
    }
    if (id === "test") { changeChoice("tests"); return; }
    if (id === "course") { changeChoice("pump"); scrollToSupport("support-mobile-experience"); }
  };

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
            onClose={() => setGuideOpen(false)} onRefine={openGoalFilter}
            onVideo={openGuideVideo} onChoice={openGuideChoice} /> : null}
          {goalFilterOpen ? <HolisticSupportGoalFilter locale={locale} scores={scores}
            initial={goalSelection} onApply={applyGoalFilter} onReset={resetGoalFilter}
            savedSectors={goalSavedSectors} onSave={saveGoalSector} preferredSector={profileSector}
            onCheckinChange={(sector, value) => onCheckinChange(goalSectorCheckinKey[sector], value)}
            selectedFormats={goalRecommendationFormats} onSelectedFormatsChange={setGoalRecommendationFormats}
            onClose={() => setGoalFilterOpen(false)} /> : goalSelection && !goalHasInlineFormat ? (
            <div className={styles.goalNoInline} role="status" data-support-goal-no-inline>
              <p>{activeGoalFormats.length ? t.goalExternalOnly : t.goalNoFormats}</p>
              <button type="button" onClick={openGoalFilter}>{t.goalAdjust}</button>
            </div>
          ) : choice === "pump" ? (
            <HolisticSupportCourseProfiles locale={locale} courses={courses}
              savedSectors={goalSavedSectors} active={activeCourseProfile} onSelect={setActiveCourseProfile}
              onTests={() => changeChoice("tests")}
              onFillProfile={openCourseProfileFilter}
              onRecommendations={showCourseProfileRecommendations} />
          ) : scene ? (
            <>
              {goalSelection ? <div className={styles.activeGoalStrip} data-support-applied-goal>
                <Filter size={16} aria-hidden="true" />
                <span><strong>{t.goalFilter}: {t.goalSector[goalSelection.sector]}</strong>
                  {summarizeGoalSelection(locale, goalSelection) ? " · " + summarizeGoalSelection(locale, goalSelection) : ""}</span>
                <button type="button" onClick={openGoalFilter}>{t.goalAdjust}</button>
                <button type="button" onClick={resetGoalFilter} aria-label={t.goalClear}><X size={16} aria-hidden="true" /></button>
              </div> : null}
              <section className={styles.meditationCategorySection} data-support-meditation-category-switcher aria-label={t.meditationCategoriesTitle}>
                <div className={styles.meditationCategoryHeader}>
                  <div><h2>{t.meditationCategoriesTitle}</h2><p>{t.meditationCategoryLead}</p></div>
                  <button type="button" onClick={() => setAllMeditationCategoriesOpen(open => !open)}
                    aria-expanded={allMeditationCategoriesOpen} aria-controls="meditation-category-options">
                    {t.meditationCategoryAll}<ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
                <div className={styles.meditationCategoryFrame} data-expanded={allMeditationCategoriesOpen ? "true" : "false"}>
                  <div ref={meditationCategoryRef} id="meditation-category-options"
                    className={styles.meditationCategoryRail} role="group" aria-label={t.meditationCategoriesTitle}
                    data-support-meditation-categories>
                    {meditationCategoryOptions.map(({ id, Icon }) => (
                      <button type="button" key={id} className={styles.meditationCategoryCard}
                        data-support-meditation-category={id} data-category={id}
                        aria-pressed={meditationCategory === id} aria-label={t.meditationCategoryNames[id]}
                        title={t.meditationCategoryNames[id]} onClick={() => chooseMeditationCategory(id)}>
                        <Icon size={27} aria-hidden="true" />
                        <span aria-hidden="true">{t.meditationCategoryShortNames[id]}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className={styles.meditationCategoryNext} aria-label={t.meditationCategoryMore}
                    data-support-meditation-categories-next onClick={scrollMeditationCategories}>
                    <ChevronRight size={22} aria-hidden="true" />
                  </button>
                </div>
              </section>
              <div className={styles.hero} id="support-meditation-player" data-support-player data-playing={playing ? "true" : "false"} data-selected-video={selected?.id ?? ""}>
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
                    <select value={program} aria-label={t.program} onChange={event => { setProgram(event.target.value as Program); setPlaying(false); setSelectedId(null); }}>
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
                    <h2>{goalSelection ? t.goalHero[goalSelection.sector] : meditationCategory === "all" ? t.heroTitle[focus] : t.meditationCategoryHero[meditationCategory]}</h2>
                    <p className={styles.heroDescription}>{selected ? selected.title : t.heroIntro}</p>
                    {selected ? <button type="button" onClick={startVideo} className={styles.playButton}
                      data-support-play disabled={!quest.canPlay}><Play size={28} fill="currentColor" aria-hidden="true" />{quest.ready && !quest.canPlay ? t.playLimitReached : t.play}</button> :
                      <p role="status" className={styles.noVideo}>{t.notAvailable}</p>}
                    {quest.ready && !quest.canPlay ? <Link href="#support-progress" className={styles.heroCourseLink} data-support-guest-limit-cta>
                      {t.playToContinue}<ArrowRight size={17} aria-hidden="true" /></Link> : null}
                    {activeMystery ? <Link className={styles.heroCourseLink} href={activeMystery.href} prefetch={false}
                      data-support-active-course-link>{t.openCourse}<ArrowRight size={17} aria-hidden="true" /></Link> : null}
                  </div>
                )}
              </div>
              <div className={styles.videoSection} id="support-meditation-gallery" data-support-meditation-gallery>
                <div className={styles.videoHeading}>
                  <h3>{activeMystery ? t.originalCourseVideos : t.gallery}</h3>
                  <Link href={activeMystery?.videoGroups[0]?.href ?? ("/" + locale + "/holistic-support#meditation-practices")}
                    prefetch={false} className={styles.seeAll}>{t.seeAll}<ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                {goalSelection && goalMatch && choice === "meditation" ?
                  <p className={styles.gallerySelection} data-support-goal-basis role="status">
                    {t.goalSector[goalSelection.sector]}. {goalMatch.matchedVideo ? t.goalMatch : t.goalRelated}
                  </p> : null}
                {meditationCategory === "meaning" && !goalSelection ? <p className={styles.gallerySelection}
                  data-support-meditation-category-related role="status">{t.meditationCategoryRelated}</p> : null}
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
                {catalogVideos.length > 0 ? <section className={styles.videoFeed}
                  data-support-meditation-feed aria-labelledby="support-meditation-feed-title">
                  <div className={styles.videoFeedHeading}>
                    <h3 id="support-meditation-feed-title">{t.feedTitle}</h3>
                    <span>{catalogVideos.length} {t.feedCount}</span>
                  </div>
                  <p className={styles.videoFeedHint}>{t.feedHint}</p>
                  <ul className={styles.videoFeedList}>
                    {catalogVideos.map(video => <li key={video.id}>
                      <button type="button" className={styles.videoFeedItem}
                        data-support-meditation-feed-item={video.id}
                        aria-pressed={selected?.id === video.id}
                        onClick={() => { pickVideo(video.id); scrollToSupport("support-meditation-player"); }}>
                        <span className={styles.videoFeedPoster}>
                          <Image src={"https://i.ytimg.com/vi/" + encodeURIComponent(video.id) + "/mqdefault.jpg"}
                            alt="" width={320} height={180} unoptimized loading="lazy" />
                          <span className={styles.videoFeedPlay} aria-hidden="true">
                            <Play size={19} fill="currentColor" />
                          </span>
                        </span>
                        <span className={styles.videoFeedCopy}>
                          <strong>{video.title}</strong>
                          <span className={styles.videoFeedDescription}>{video.description || t.feedFallback}</span>
                          <span className={styles.videoFeedFooter}>
                            <small>{t.programs[video.program]} · {video.sourceLanguage === "ru" ? t.feedAudioRu : t.feedAudioEn}</small>
                            <span className={styles.videoFeedChoose}>{t.feedChoose}<ArrowRight size={15} aria-hidden="true" /></span>
                          </span>
                        </span>
                      </button>
                    </li>)}
                  </ul>
                </section> : null}

              </div>
              <div className={styles.videoSourceRow} data-support-video-source>
                {selected ? <a className={styles.youtubeLink} href={"https://www.youtube.com/watch?v=" + encodeURIComponent(selected.id)}
                  target="_blank" rel="noopener noreferrer">{t.youtube} <ArrowRight size={18} aria-hidden="true" /></a> : null}
              </div>
            </>
          ) : choice === "tests" ? (
            <section className={styles.testsPanel} id="support-tests-panel"
              data-support-tests-panel aria-labelledby="support-tests-title">
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
          <SupportGuestQuestPanel locale={locale} quest={quest} averageScore={averageScore}
            focusLabel={activeFocusLabel} onStep={onQuestStep} />
          <p className={styles.privacyNote}><ShieldCheck size={18} aria-hidden="true" />{t.privateInfo}</p>
        </section>
        <footer className={styles.disclaimer}>
          <p>{t.healthNote}</p>
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
        <Link href={"/" + locale + "/holistic-support/mobile"} prefetch={false}><Home size={24} aria-hidden="true" /><span>{t.navHome}</span></Link>
        <Link href={"/" + locale + "/practice"} prefetch={false}><Compass size={24} aria-hidden="true" /><span>{t.navPractices}</span></Link>
        <Link href={"/" + locale + "/app/messages?tab=chats"} prefetch={false} data-support-mobile-messages>
          <MessageCircle size={24} aria-hidden="true" /><span>{t.navMessages}</span>
        </Link>
        <a href="#support-progress"><BarChart3 size={24} aria-hidden="true" /><span>{t.navProgress}</span></a>
        <button type="button" aria-expanded={settingsOpen} aria-controls="support-mobile-settings"
          onClick={() => setSettingsOpen(open => !open)}><Settings2 size={24} aria-hidden="true" /><span>{t.navSettings}</span></button>
      </nav>
    </main>
  );
}
