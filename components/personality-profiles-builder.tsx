"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Brain, BriefcaseBusiness, Check, ChevronDown, ClipboardList, HeartHandshake, HeartPulse, LockKeyhole, Sparkles } from "lucide-react";
import styles from "./personality-profiles-builder.module.css";
import { recommendProfileBattery } from "@/lib/profile/profile-battery";
import { appFetch } from "@/lib/app/client-fetch";
import { PENDING_TEST_SELECTION_KEY, makeTestSelectionIntent } from "@/lib/app/test-selection-intent";
import { TEST_KINDS } from "@/lib/assessments/test-kinds";

type Locale = "en" | "ru" | "es";
type Focus = "wellbeing" | "relationships" | "work" | "identity";
type Area = "traits" | "support" | "emotions" | "recovery" | "body" | "connection" | "work" | "money" | "meaning";
type PublicTest = { key: string; title: string; axes: string[]; minutes: number | null; questions: number | null; testKind: string };
type Props = { locale: Locale; tests: PublicTest[] };

// Topics map to questionnaire dimensions, not diagnoses or financial outcomes.
const areaAxes: Record<Area, readonly string[]> = {
  traits: ["personality"],
  support: ["resource", "self_support"],
  emotions: ["stress", "mood", "emotional_regulation"],
  recovery: ["sleep", "energy"],
  body: ["embodiment"],
  connection: ["relationships"],
  work: ["clarity", "focus", "functioning"],
  money: ["functioning", "meaning", "self_support"], // money choices, never a score of income/success
  meaning: ["meaning"],
};
// Four life directions select existing measurable topics; meaning remains in personal growth.
const focusAreas: Record<Focus, Area[]> = {
  wellbeing: ["emotions", "recovery", "body"],
  relationships: ["connection"],
  work: ["work", "money"],
  identity: ["traits", "support", "meaning"],
};
const areasFor = (focuses: Focus[]) => [...new Set(focuses.flatMap(focus => focusAreas[focus]))];
const allAxesFor = (areas: Area[]) => [...new Set(areas.flatMap(area => areaAxes[area]))];

const axesCopy: Record<string, Record<Locale, string>> = {
  embodiment: { en: "Body awareness", ru: "Контакт с телом", es: "Conciencia corporal" },
  sleep: { en: "Sleep and rest", ru: "Сон и отдых", es: "Sueño y descanso" },
  stress: { en: "Perceived stress", ru: "Воспринимаемый стресс", es: "Estrés percibido" },
  energy: { en: "Energy", ru: "Энергия", es: "Energía" },
  resource: { en: "Personal resources", ru: "Личные ресурсы", es: "Recursos personales" },
  self_support: { en: "Self-support", ru: "Самоподдержка", es: "Apoyo personal" },
  clarity: { en: "Mental clarity", ru: "Ясность мышления", es: "Claridad mental" },
  focus: { en: "Focus", ru: "Концентрация", es: "Concentración" },
  functioning: { en: "Everyday functioning", ru: "Действия и эффективность", es: "Actividades cotidianas" },
  meaning: { en: "Meaning and direction", ru: "Смысл и направление", es: "Sentido y dirección" },
  mood: { en: "Current mood", ru: "Текущее настроение", es: "Estado emocional" },
  personality: { en: "Personality patterns", ru: "Личностные особенности", es: "Patrones personales" },
  emotional_regulation: { en: "Emotional awareness", ru: "Осознание эмоций", es: "Conciencia emocional" },
  relationships: { en: "Relationships", ru: "Отношения", es: "Relaciones" },
};

const copy = {
  en: {
    kicker: "FREE SELF-DISCOVERY", title: "Build your personal profile",
    lead: "Understand your strengths, resources and areas for growth. Start with free self-tests that match your goals, then explore your results and plan practical next steps.",
    benefits: ["Choose what to explore", "Free tests with clear scales", "SWOT + personal development"],
    entryButton: "Create my profile",
    entryHint: "Take free tests & explore development recommendations",
    browseTests: "Or browse free tests without creating a profile",
    journeyTitle: "How it works",
    journey: [
      ["Choose your focus", "Body and energy, relationships, work and money, or personal growth. You decide which matter."],
      ["Take free tests", "Review the suggested questionnaires and choose which ones to complete."],
      ["Explore results & next steps", "Read your test feedback, reflect on your strengths and save development goals in My Space."],
    ],
    entryNote: "You can explore without an account. Sign in only when you want to save results privately.",
    returnIntro: "How it works", wizardKicker: "Your free profile", selectTemplate: "Select this",
    stages: ["Focus", "Topics", "Tests", "Ready"],
    profileTitle: "What would you like to understand or improve?",
    profileHelp: "Choose one or several interests. Each adds to the same personal profile; you can explore the rest later.",
    focusAdd: "Select this", focusSelected: "Selected",
    unifiedNote: "ONE PERSONAL PROFILE · GROWING OVER TIME",
    layerTitle: "How your profile grows · four distinct layers",
    layerNote: "One private profile, not a diagnosis or overall health/success score. Sections fill only when you choose and have suitable evidence.",
    layers: [["My foundation","Personality patterns, personal strengths and values."],["My state","Recent energy, stress and recovery, with dates."],["My life","Work, relationships and your life context."],["My growth","Goals and practices you choose yourself."]],
    focuses: {
      wellbeing: ["Body, health & energy", "Physical wellbeing, stress, recovery and energy balance."],
      relationships: ["Relationships & connection", "Love, family, communication, trust and personal boundaries."],
      work: ["Work, business & money", "Career, entrepreneurship, professional growth and financial habits."],
      identity: ["Personality & personal growth", "Traits, strengths, values, life goals and self-actualization."],
    },
    topicTitle: "Choose the specific topics that matter",
    topicHelp: "Choose what matters. Each topic shows the dimensions measured by available free questionnaires.",
    focusContext: "Selected interests",
    areas: {
      traits: ["Personality traits", "Patterns · strengths"],
      support: ["Resources & self-support", "Support · self-kindness"],
      emotions: ["Emotions & stress", "Mood · regulation"],
      recovery: ["Energy & rest", "Recovery · sleep"],
      body: ["Body awareness", "Awareness · comfort"],
      connection: ["Relationships", "Connection · communication"],
      work: ["Work & focus", "Clarity · daily actions"],
      money: ["Money decisions", "Choices · habits, not income"],
      meaning: ["Purpose & values", "Meaning · direction"],
    },
    scaleTitle: "Choose the scales for your profile",
    scaleHelp: "Only real source-declared dimensions can be measured. Keep the suggestions or select what you want to explore.",
    selectAll: "Select all", clearAll: "Clear all", selected: "selected",
    testTitle: "Your recommended free test selection",
    testHelp: "Start your suggested tests now, or add more from the filters below.",
    testCount: "tests", minutes: "min", questions: "questions",
    more: "See more matching tests", less: "Show fewer",
    chosen: "Your selection", unmeasured: "Some selected topics may not have a suitable free questionnaire yet. No score will be invented.",
    swotTitle: "What happens after the tests? · SWOT + development",
    swot: [
      ["Strengths", "Which resources and patterns help you already?"],
      ["Growth areas", "What would you like to practise or understand?"],
      ["Opportunities", "What support and next steps are available?"],
      ["Challenges", "Which practical obstacles deserve attention?"],
    ],
    swotNote: "SWOT is a guided reflection using your own interpretation, not an automatically inferred personality verdict.",
    next: "Continue", back: "Back", start: "Take tests",
    review: "Review my test path", readyKicker: "YOUR PERSONAL TEST PATH",
    readyTitle: "Ready to build your profile?",
    readyHelp: "Start with these free tests. Continue with Google to save your selection.",
    accountTitle: "Your personal profile & growth path",
    accountDescription: "Take your free tests, explore your personal profile, and discover recommendations and next steps for development.",
    accountPrivacy: "Free · Private · Saved in My Tests",
    saveToCabinet: "Continue with Google — Free",
    saveToCabinetBusy: "Connecting to Google…",
    saveToCabinetError: "Google sign-in could not start. Please try again.",
    saveToCabinetCheckError: "Could not verify your account. Please try again.",
    saveToCabinetStorageError: "Browser storage is unavailable. Allow site storage to keep your selection through Google sign-in.",
    noTests: "No suitable free test covers these topics. Choose another topic or use the additional test filters.",
    private: "Results can be saved in your protected account. Build your profile and set voluntary development goals there, after the tests.",
    myProfile: "My saved profile", myPath: "My development path",
    esNote: "", disclaimer: "Educational self-reflection only; not a medical diagnosis, financial assessment, or guaranteed outcome.",
  },
  ru: {
    kicker: "БЕСПЛАТНОЕ САМОПОЗНАНИЕ", title: "Создайте свой профиль",
    lead: "Узнайте свои сильные стороны, ресурсы и направления роста. Подберите бесплатные тесты по важным для вас темам, изучите результаты и наметьте следующие шаги.",
    benefits: ["Выберите темы", "Бесплатные тесты и шкалы", "SWOT + программа развития"],
    entryButton: "Создать свой профиль",
    entryHint: "Пройти тесты и получить рекомендации по развитию",
    browseTests: "Или пройти бесплатные тесты без создания профиля",
    journeyTitle: "Как это работает",
    journey: [
      ["Выберите направление", "Здоровье и энергия, отношения, дело и деньги или личное развитие — можно несколько сразу."],
      ["Пройдите бесплатные тесты", "Мы предложим подходящие опросники, а вы сможете изменить их набор."],
      ["Получите результаты и рекомендации", "Изучите отчёты, определите сильные стороны и сохраните цели развития в личном кабинете."],
    ],
    entryNote: "Выбирать темы можно без регистрации. Для приватного сохранения результатов понадобится вход в кабинет.",
    returnIntro: "Как это работает", wizardKicker: "Ваш бесплатный профиль", selectTemplate: "Выбрать",
    stages: ["Запрос", "Темы", "Тесты", "Начало"],
    profileTitle: "Что вы хотите понять или улучшить?",
    profileHelp: "Выберите одно или несколько направлений. Всё войдёт в один личный профиль — остальное можно изучить позже.",
    focusAdd: "Выбрать", focusSelected: "Выбрано",
    unifiedNote: "ОДИН ЛИЧНЫЙ ПРОФИЛЬ · ПОПОЛНЯЕТСЯ СО ВРЕМЕНЕМ",
    layerTitle: "Как формируется профиль · четыре разных слоя",
    layerNote: "Один приватный профиль, а не диагноз или единый процент здоровья и успешности. Разделы заполняются при наличии подходящих данных и по вашему выбору.",
    layers: [["Моя основа","Особенности личности, сильные стороны и ценности."],["Моё состояние","Самочувствие, энергия и стресс с указанием даты."],["Моя жизнь","Работа, отношения и личные обстоятельства."],["Моё развитие","Цели и практики, которые вы выбираете сами."]],
    focuses: {
      wellbeing: ["Тело, здоровье и энергия", "Самочувствие, стресс, восстановление и жизненные силы."],
      relationships: ["Отношения и близость", "Любовь, семья, общение, доверие и личные границы."],
      work: ["Дело, бизнес и деньги", "Карьера, предпринимательство, профессиональная реализация и финансы."],
      identity: ["Личность и развитие", "Характер, способности, ценности, смысл жизни и самореализация."],
    },
    topicTitle: "Уточните важные для вас темы",
    topicHelp: "Выберите важные темы. Под каждой указаны измеряемые параметры из доступных бесплатных тестов.",
    focusContext: "Выбранные направления",
    areas: {
      traits: ["Особенности личности", "Качества · сильные стороны"],
      support: ["Ресурсы и поддержка", "Опора · бережность к себе"],
      emotions: ["Эмоции и стресс", "Настроение · регуляция"],
      recovery: ["Энергия и отдых", "Восстановление · сон"],
      body: ["Контакт с телом", "Осознанность · комфорт"],
      connection: ["Отношения", "Связь · общение"],
      work: ["Работа и фокус", "Ясность · действия"],
      money: ["Решения о деньгах", "Привычки, не уровень дохода"],
      meaning: ["Ценности и смысл", "Цели · направление"],
    },
    scaleTitle: "Выберите шкалы своего профиля",
    scaleHelp: "Можно выбрать лишь реальные шкалы, указанные в источниках тестов. Оставьте предложенные или выберите свои.",
    selectAll: "Выбрать все", clearAll: "Снять все", selected: "выбрано",
    testTitle: "Предложенный набор бесплатных тестов",
    testHelp: "Начните рекомендованные тесты или добавьте другие с помощью фильтров ниже.",
    testCount: "тестов", minutes: "мин", questions: "вопросов",
    more: "Показать больше подходящих тестов", less: "Показать меньше",
    chosen: "Ваш выбор", unmeasured: "Для части тем может не оказаться подходящего бесплатного теста. Баллы не придумываются.",
    swotTitle: "После тестов: SWOT и программа развития",
    swot: [
      ["Сильные стороны", "Какие ресурсы и качества уже помогают?"],
      ["Зоны роста", "Что хочется лучше понять или развить?"],
      ["Возможности", "На какую поддержку и шаги можно опереться?"],
      ["Препятствия", "Какие обстоятельства важно учитывать?"],
    ],
    swotNote: "SWOT — упражнение для собственной рефлексии, а не автоматически поставленный психологический вердикт.",
    next: "Далее", back: "Назад", start: "Пройти тесты",
    review: "Проверить план тестов", readyKicker: "ВАШ ПУТЬ К ЛИЧНОМУ ПРОФИЛЮ",
    readyTitle: "Всё готово для создания профиля",
    readyHelp: "Начните с этих бесплатных тестов. Войдите через Google, чтобы сохранить подборку.",
    accountTitle: "Ваш личный профиль и программа развития",
    accountDescription: "Пройдите тесты, изучите свой профиль, получите рекомендации и наметьте личный путь развития.",
    accountPrivacy: "Бесплатно · Приватно · В разделе «Мои тесты»",
    saveToCabinet: "Продолжить через Google — бесплатно",
    saveToCabinetBusy: "Подключаем Google…",
    saveToCabinetError: "Не удалось начать вход через Google. Повторите попытку.",
    saveToCabinetCheckError: "Не удалось проверить ваш аккаунт. Повторите попытку.",
    saveToCabinetStorageError: "Хранение данных сайта недоступно. Разрешите его, чтобы сохранить подборку через Google.",
    noTests: "Для этих тем пока нет подходящего бесплатного теста. Измените темы или выберите тест ниже.",
    private: "Результаты можно сохранить в защищённом кабинете. Там доступен личный профиль и цели программы развития.",
    myProfile: "Мой профиль", myPath: "Моя программа развития",
    esNote: "", disclaimer: "Для самопознания; не является медицинской диагностикой, финансовой оценкой или гарантией результата.",
  },
  es: {
    kicker: "AUTOCONOCIMIENTO GRATUITO", title: "Crea tu perfil personal",
    lead: "Descubre tus fortalezas, recursos y áreas de crecimiento. Elige pruebas gratuitas según tus objetivos, revisa los resultados y decide tus próximos pasos.",
    benefits: ["Elige tus temas", "Pruebas y escalas gratis", "DAFO + desarrollo"],
    entryButton: "Crear mi perfil",
    entryHint: "Haz pruebas gratis y descubre recomendaciones",
    browseTests: "O hacer pruebas gratuitas sin crear un perfil",
    journeyTitle: "Cómo funciona",
    journey: [
      ["Elige tu enfoque", "Salud y energía, relaciones, trabajo y dinero o crecimiento personal. Puedes elegir varios."],
      ["Realiza pruebas gratuitas", "Revisa los cuestionarios sugeridos y elige cuáles quieres completar."],
      ["Explora resultados y próximos pasos", "Lee los informes, identifica fortalezas y guarda tus metas de desarrollo en Mi espacio."],
    ],
    entryNote: "Puedes explorar sin cuenta. Inicia sesión solo si quieres guardar los resultados de forma privada.",
    returnIntro: "Cómo funciona", wizardKicker: "Tu perfil gratuito", selectTemplate: "Elegir",
    stages: ["Interés", "Temas", "Pruebas", "Inicio"],
    profileTitle: "¿Qué quieres comprender o mejorar?",
    profileHelp: "Elige uno o varios temas. Todos forman parte de un único perfil personal que puedes ampliar después.",
    focusAdd: "Elegir", focusSelected: "Elegido",
    unifiedNote: "UN PERFIL PERSONAL · CRECE CONTIGO",
    layerTitle: "Cómo crece tu perfil · cuatro capas distintas",
    layerNote: "Un perfil privado, no un diagnóstico ni una puntuación global de salud o éxito. Cada sección requiere datos adecuados y tu elección.",
    layers: [["Mi base","Rasgos de personalidad, fortalezas y valores."],["Mi estado","Energía, estrés y descanso reciente con fecha."],["Mi vida","Trabajo, relaciones y contexto personal."],["Mi desarrollo","Objetivos y prácticas que tú eliges."]],
    focuses: {
      wellbeing: ["Cuerpo, salud y energía", "Bienestar físico, estrés, descanso y energía."],
      relationships: ["Relaciones y cercanía", "Amor, familia, comunicación, confianza y límites personales."],
      work: ["Trabajo, negocios y dinero", "Carrera, emprendimiento, desarrollo profesional y hábitos financieros."],
      identity: ["Personalidad y crecimiento", "Rasgos, fortalezas, valores, propósito y autorrealización."],
    },
    topicTitle: "Elige los temas específicos para explorar",
    topicHelp: "Elige tus temas. Cada uno muestra las dimensiones que miden las pruebas gratuitas disponibles.",
    focusContext: "Áreas elegidas",
    areas: {
      traits: ["Rasgos personales", "Patrones · fortalezas"],
      support: ["Recursos y apoyo", "Apoyo · autocompasión"],
      emotions: ["Emociones y estrés", "Ánimo · regulación"],
      recovery: ["Energía y descanso", "Recuperación · sueño"],
      body: ["Conciencia corporal", "Sensaciones · comodidad"],
      connection: ["Relaciones", "Conexión · comunicación"],
      work: ["Trabajo y enfoque", "Claridad · acciones"],
      money: ["Decisiones de dinero", "Hábitos, no nivel de ingresos"],
      meaning: ["Sentido y valores", "Metas · dirección"],
    },
    scaleTitle: "Selecciona las escalas de tu perfil",
    scaleHelp: "Solo medimos las dimensiones declaradas en los cuestionarios. Puedes cambiar las sugerencias.",
    selectAll: "Seleccionar todas", clearAll: "Desmarcar", selected: "seleccionadas",
    testTitle: "Tus pruebas gratuitas recomendadas",
    testHelp: "Empieza las pruebas recomendadas o añade otras con los filtros de abajo.",
    testCount: "pruebas", minutes: "min", questions: "preguntas",
    more: "Ver más pruebas compatibles", less: "Ver menos",
    chosen: "Tu selección", unmeasured: "Es posible que algunas áreas no tengan una prueba gratuita adecuada. No se inventan puntuaciones.",
    swotTitle: "Después de las pruebas · DAFO y desarrollo",
    swot: [
      ["Fortalezas", "¿Qué recursos ya te ayudan?"],
      ["Áreas de crecimiento", "¿Qué te gustaría aprender o practicar?"],
      ["Oportunidades", "¿Qué apoyo o pasos tienes disponibles?"],
      ["Desafíos", "¿Qué obstáculos prácticos debes considerar?"],
    ],
    swotNote: "El DAFO es una reflexión guiada, no un veredicto automático sobre tu personalidad.",
    next: "Continuar", back: "Atrás", start: "Realizar pruebas",
    review: "Revisar mi plan de pruebas", readyKicker: "TU RUTA DE PRUEBAS PERSONALES",
    readyTitle: "Tu perfil empieza aquí",
    readyHelp: "Empieza con estas pruebas gratuitas. Accede con Google para guardar tu selección.",
    accountTitle: "Tu perfil personal y plan de desarrollo",
    accountDescription: "Completa las pruebas, explora tu perfil y descubre recomendaciones y próximos pasos para crecer.",
    accountPrivacy: "Gratis · Privado · Guardado en Mis pruebas",
    saveToCabinet: "Continuar con Google — Gratis",
    saveToCabinetBusy: "Conectando con Google…",
    saveToCabinetError: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
    saveToCabinetCheckError: "No pudimos verificar tu cuenta. Inténtalo de nuevo.",
    saveToCabinetStorageError: "El almacenamiento del navegador no está disponible. Actívalo para conservar tu selección al entrar con Google.",
    noTests: "No hay pruebas gratuitas para estos temas. Cámbialos o busca otra prueba abajo.",
    private: "Guarda tus resultados en tu cuenta protegida y define tus propias metas de desarrollo.",
    myProfile: "Mi perfil guardado", myPath: "Mi plan de desarrollo",
    esNote: "Los cuestionarios se presentan en inglés mientras se revisan las traducciones españolas.",
    disclaimer: "Solo para autorreflexión; no es diagnóstico médico, evaluación financiera ni garantía de resultados.",
  },
} as const;

// The discovery facets reuse the same rights-cleared catalogue and kind registry
// as Test Explorer. No new clinical scales or questionnaires are generated.
const additionalCopy = {
  en: {
    notMeasured: "No eligible free questionnaire yet",
    additionalTitle: "Other tests", additionalHint: "Optional. Add tests without replacing your recommended set.",
    search: "Search tests", searchPlaceholder: "Test name or scale",
    kind: "Type", allKinds: "All types", topic: "Topic", matching: "My topics", allTopics: "All topics",
    time: "Duration", anyTime: "Any length", two: "Up to 2 min", five: "Up to 5 min", ten: "Up to 10 min",
    sort: "Sort", relevant: "Best match", shortest: "Shortest", alphabetical: "A–Z",
    add: "Add", remove: "Remove", nothing: "No additional tests match these filters.",
    results: "found", more: "Show more tests", less: "Show fewer",
    limit: "Up to 12 tests in a set. Remove one to add another.",
    full: "Open full test catalogue", review: "Review & save this selection",
  },
  ru: {
    notMeasured: "Пока нет доступного бесплатного теста",
    additionalTitle: "Другие тесты", additionalHint: "По желанию: добавьте тесты к рекомендованному набору.",
    search: "Поиск теста", searchPlaceholder: "Название теста или шкалы",
    kind: "Тип", allKinds: "Все типы", topic: "Тема", matching: "Мои темы", allTopics: "Все темы",
    time: "Длительность", anyTime: "Любая", two: "До 2 мин", five: "До 5 мин", ten: "До 10 мин",
    sort: "Порядок", relevant: "По соответствию", shortest: "Сначала короткие", alphabetical: "А–Я",
    add: "Добавить", remove: "Убрать", nothing: "По этим фильтрам других тестов нет.",
    results: "найдено", more: "Показать ещё", less: "Свернуть список",
    limit: "До 12 тестов в наборе. Чтобы добавить ещё, уберите один.",
    full: "Открыть полный каталог тестов", review: "Просмотреть и сохранить набор",
  },
  es: {
    notMeasured: "Aún no hay prueba gratuita disponible",
    additionalTitle: "Otras pruebas", additionalHint: "Opcional: añade pruebas sin sustituir las recomendadas.",
    search: "Buscar pruebas", searchPlaceholder: "Nombre o escala",
    kind: "Tipo", allKinds: "Todos los tipos", topic: "Tema", matching: "Mis temas", allTopics: "Todos los temas",
    time: "Duración", anyTime: "Cualquiera", two: "Hasta 2 min", five: "Hasta 5 min", ten: "Hasta 10 min",
    sort: "Orden", relevant: "Mejor coincidencia", shortest: "Más cortas", alphabetical: "A–Z",
    add: "Añadir", remove: "Quitar", nothing: "No hay más pruebas para estos filtros.",
    results: "encontradas", more: "Ver más", less: "Ver menos",
    limit: "Máximo 12 pruebas. Quita una para añadir otra.",
    full: "Abrir catálogo completo", review: "Revisar y guardar selección",
  },
} as const;

export function PersonalityProfilesBuilder({ locale, tests }: Props) {
  const t = copy[locale];
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const wizardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (started) wizardRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [started, step]);
  const [focuses, setFocuses] = useState<Focus[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [kindFilter, setKindFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("matching");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("relevant");
  const [search, setSearch] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const accountLocale = locale === "es" ? "en" : locale;
  const extra = additionalCopy[locale];

  // Only dimensions declared by eligible public questionnaires may be shown
  // under a topic. The topic label itself is not a psychometric measurement.
  const measurableAxes = useMemo(() => new Set(tests.flatMap(test => test.axes)), [tests]);
  const visibleAreas = areasFor(focuses);
  const activeAreas = areas.filter(area => visibleAreas.includes(area));
  const selectedAxes = allAxesFor(activeAreas).filter(axis => measurableAxes.has(axis));
  const matches = tests
    .map(test => ({ ...test, matches: test.axes.filter(axis => selectedAxes.includes(axis)) }))
    .filter(test => test.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length ||
      (a.minutes ?? 99) - (b.minutes ?? 99) || a.key.localeCompare(b.key));
  const chosenTests = selectedKeys.flatMap(key => tests.filter(test => test.key === key));
  const coverage = new Set(chosenTests.flatMap(test => test.axes.filter(axis => selectedAxes.includes(axis))));
  const minutes = chosenTests.reduce((sum, test) => sum + (test.minutes || 0), 0);
  const axesForFilters = [...measurableAxes].sort((a, b) =>
    (axesCopy[a]?.[locale] || a).localeCompare(axesCopy[b]?.[locale] || b, locale));
  const extraMatches = tests
    .filter(test => !selectedKeys.includes(test.key))
    .filter(test => kindFilter === "all" || test.testKind === kindFilter)
    .filter(test => topicFilter === "all" || (topicFilter === "matching"
      ? test.axes.some(axis => selectedAxes.includes(axis))
      : test.axes.includes(topicFilter)))
    .filter(test => timeFilter === "all" || (test.minutes !== null && test.minutes <= Number(timeFilter)))
    .filter(test => !search.trim() ||
      [test.title, ...test.axes.map(axis => axesCopy[axis]?.[locale] || axis)]
        .join(" ").toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)))
    .sort((a, b) => sortFilter === "shortest"
      ? (a.minutes ?? 99) - (b.minutes ?? 99) || a.title.localeCompare(b.title, locale)
      : sortFilter === "alphabetical"
        ? a.title.localeCompare(b.title, locale)
        : b.axes.filter(axis => selectedAxes.includes(axis)).length -
          a.axes.filter(axis => selectedAxes.includes(axis)).length ||
          (a.minutes ?? 99) - (b.minutes ?? 99) || a.key.localeCompare(b.key));
  const displayTests = showMore ? extraMatches : extraMatches.slice(0, 6);

  function toggleFocus(focus: Focus) {
    setFocuses(previous => previous.includes(focus)
      ? previous.filter(item => item !== focus) : [...previous, focus]);
    // A different direction must not carry stale topics or test selections.
    setAreas([]);
    setSelectedKeys([]);
    setShowMore(false);
  }

  function toggleArea(area: Area) {
    if (!visibleAreas.includes(area) || !areaAxes[area].some(axis => measurableAxes.has(axis))) return;
    const next = areas.includes(area) ? areas.filter(item => item !== area) : [...areas, area];
    setAreas(next);
    setSelectedKeys([]);
    setShowMore(false);
  }

  function toggleTest(key: string) {
    // Keys arrive solely from the server-side rights-cleared guest catalogue.
    if (!tests.some(test => test.key === key)) return;
    setSelectedKeys(previous => previous.includes(key)
      ? previous.filter(item => item !== key)
      : previous.length < 12 ? [...previous, key] : previous);
  }

  function goForward() {
    if (step === 0 && focuses.length) {
      const suggested = areasFor(focuses)
        .filter(area => areaAxes[area].some(axis => measurableAxes.has(axis)));
      setAreas(suggested);
      setSelectedKeys([]);
      setShowMore(false);
      setStep(1);
    } else if (step === 1 && activeAreas.length && selectedAxes.length) {
      setSelectedKeys([...recommendProfileBattery(matches, selectedAxes)]);
      setShowMore(false);
      setStep(2);
    } else if (step === 2 && selectedKeys.length) {
      setStep(3);
    }
  }

  const base = "/" + accountLocale;
  const testHref = base + "/client?startTests=" + encodeURIComponent(selectedKeys.join(","));

  async function saveSelectionWithGoogle() {
    if (accountBusy || selectedKeys.length === 0) return;
    setAccountError("");
    // The only cross-navigation state is a TTL-limited whitelist of eligible
    // questionnaire keys, not the user interests, answers or health results.
    try {
      window.sessionStorage.setItem(
        PENDING_TEST_SELECTION_KEY,
        makeTestSelectionIntent(selectedKeys),
      );
    } catch {
      setAccountError(t.saveToCabinetStorageError);
      return;
    }
    setAccountBusy(true);
    try {
      try {
        await appFetch("auth/contact-profile");
        // No duplicate Google flow for a currently authenticated visitor.
        window.location.assign(base + "/app/tests?selection=pending");
        return;
      } catch (cause) {
        if ((cause as { status?: number })?.status !== 401) {
          setAccountError(t.saveToCabinetCheckError);
          return;
        }
      }
      // This is the existing whitelisted OAuth continuation; My Tests
      // rechecks eligibility and saves the account-owned plan only on success.
      const response = await appFetch("auth/start", {
        locale: accountLocale, continueTo: "tests",
      });
      if (typeof response?.redirectUrl !== "string" ||
          !/^https:\/\//.test(response.redirectUrl)) {
        throw new Error("AUTH_START_UNAVAILABLE");
      }
      window.location.assign(response.redirectUrl);
    } catch {
      setAccountError(t.saveToCabinetError);
    } finally {
      setAccountBusy(false);
    }
  }

  return <div className={styles.shell} data-personality-profile-builder>
    {!started ? <>
      <header className={styles.hero}>
        <div className={styles.heroPhoto} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><Sparkles size={16} aria-hidden="true" />{t.kicker}</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
          <button type="button" className={styles.begin} data-profile-begin
            onClick={() => setStarted(true)}>
            <span><strong>{t.entryButton}</strong><small>{t.entryHint}</small></span>
            <ArrowRight size={24} aria-hidden="true" />
          </button>
          <Link className={styles.browseTests} href={'/' + locale + '/client/tests'} prefetch={false} data-profile-direct-tests>
            {t.browseTests}<ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>
      <section className={styles.roadmap} aria-labelledby="profile-builder-journey-title">
        <h2 id="profile-builder-journey-title">{t.journeyTitle}</h2>
        <ol className={styles.roadmapSteps}>
          {t.journey.map((item, index) => <li key={item[0]}>
            <span className={styles.roadmapNumber} aria-hidden="true">{index + 1}</span>
            <div><strong>{item[0]}</strong><p>{item[1]}</p></div>
          </li>)}
        </ol>
        <p className={styles.entryNote}><LockKeyhole size={15} aria-hidden="true" />{t.entryNote}</p>
      </section>
    </> : <>
    <div className={styles.wizardTop} ref={wizardRef}>
      <button type="button" className={styles.returnIntro} onClick={() => { setStarted(false); setStep(0); }}>
        <ArrowLeft size={16} aria-hidden="true" />{t.returnIntro}
      </button>
      <span className={styles.wizardKicker}><Sparkles size={15} aria-hidden="true" />{t.wizardKicker}</span>
    </div>
    <nav className={styles.progress} aria-label={locale === "ru" ? "Шаги конструктора" : locale === "es" ? "Pasos" : "Builder steps"}>
      {t.stages.map((label, index) =>
        <button key={label} type="button" aria-current={step === index ? "step" : undefined}
          disabled={index > step} onClick={() => setStep(index)} className={step === index ? styles.activeStage : ""}>
          <span>{index + 1}</span>{label}
        </button>)}
    </nav>

    <div className={styles.panel}>
      {step === 0 && <section aria-labelledby="profile-builder-step-title">
        <h2 id="profile-builder-step-title">{t.profileTitle}</h2>
        <p className={styles.help}>{t.profileHelp}</p>
        <div className={styles.templateGrid} data-profile-focus-selection>
          {(Object.keys(t.focuses) as Focus[]).map(key =>
            <button type="button" key={key} className={styles.templateCard}
              aria-pressed={focuses.includes(key)} onClick={() => toggleFocus(key)} data-profile-focus={key}>
              <span className={styles.templateIcon} aria-hidden="true">
                {key === "wellbeing" ? <HeartPulse size={21} /> : key === "relationships" ? <HeartHandshake size={21} />
                  : key === "work" ? <BriefcaseBusiness size={21} /> : <Brain size={21} />}
              </span>
              <span className={styles.templateBody}>
                <strong>{t.focuses[key][0]}</strong>
                <span>{t.focuses[key][1]}</span>
                <small className={styles.templateSelect}>{focuses.includes(key) ? t.focusSelected : t.focusAdd}</small>
              </span>
              <span className={styles.focusCheck} aria-hidden="true">{focuses.includes(key) && <Check size={16} />}</span>
            </button>)}
        </div>
        <details className={styles.layerDetails} data-profile-four-layers>
          <summary>{t.layerTitle}<ChevronDown size={16} aria-hidden="true" /></summary>
          <p>{t.layerNote}</p>
          <ol>{t.layers.map(layer => <li key={layer[0]}><strong>{layer[0]}</strong><span>{layer[1]}</span></li>)}</ol>
        </details>
      </section>}

      {step === 1 && <section aria-labelledby="profile-builder-step-title">
        <p className={styles.templateLabel}>{t.unifiedNote}</p>
        <h2 id="profile-builder-step-title">{t.topicTitle}</h2>
        <p className={styles.help}>{t.topicHelp}</p>
        <p className={styles.focusContext} data-profile-selected-focus>
          <strong>{t.focusContext}:</strong> {focuses.map(focus => t.focuses[focus][0]).join(" · ")}
        </p>
        <div className={styles.areaGrid} data-profile-topic-options>
          {visibleAreas.map(area => {
            const axes = areaAxes[area].filter(axis => measurableAxes.has(axis));
            return <button type="button" key={area} aria-pressed={areas.includes(area)}
              disabled={!axes.length} className={styles.areaCard} onClick={() => toggleArea(area)}>
              <span className={styles.selectDot}>{areas.includes(area) && <Check size={14} aria-hidden="true" />}</span>
              <span><strong>{t.areas[area][0]}</strong>
                <small>{axes.length
                  ? axes.map(axis => axesCopy[axis]?.[locale] || axis).join(" · ")
                  : extra.notMeasured}</small>
              </span>
            </button>;
          })}
        </div>
      </section>}

      {step === 2 && <section aria-labelledby="profile-builder-step-title" data-profile-tests-step>
        <h2 id="profile-builder-step-title">{t.testTitle}</h2>
        <p className={styles.help}>{t.testHelp}</p>
        <div className={styles.testCount}><ClipboardList size={17} aria-hidden="true" />
          <strong>{chosenTests.length} {t.testCount}</strong>
          {minutes > 0 && <span>· {minutes} {t.minutes}</span>}
          <span>· {coverage.size}/{selectedAxes.length} {t.selected}</span>
        </div>
        {chosenTests.length > 0 ? <div className={styles.testList} data-profile-recommended-tests>
          {chosenTests.map(test =>
            <label key={test.key} className={styles.testRow}>
              <input type="checkbox" checked onChange={() => toggleTest(test.key)} />
              <span className={styles.testText}>
                <strong>{test.title}</strong>
                <small>{test.questions ? test.questions + " " + t.questions : ""}
                  {test.questions && test.minutes ? " · " : ""}
                  {test.minutes ? test.minutes + " " + t.minutes : ""}</small>
                <span>{test.axes.filter(axis => selectedAxes.includes(axis))
                  .map(axis => axesCopy[axis]?.[locale] || axis).join(" · ")}</span>
              </span>
            </label>)}
        </div> : <p className={styles.caution} role="status">{t.noTests}</p>}
        {coverage.size < selectedAxes.length && chosenTests.length > 0 &&
          <p className={styles.caution}>{t.unmeasured}</p>}
        <div className={styles.startRow}>
          {selectedKeys.length > 0
            ? <Link href={testHref} prefetch={false} className={styles.primary} data-profile-start-tests>
                {t.start}<ArrowRight size={17} aria-hidden="true" />
              </Link>
            : <button type="button" disabled className={styles.primary}>{t.start}</button>}
        </div>

        <section className={styles.extraPanel} aria-labelledby="profile-builder-extra-title" data-profile-additional-tests>
          <div className={styles.extraHeading}>
            <div><h3 id="profile-builder-extra-title">{extra.additionalTitle}</h3>
              <p>{extra.additionalHint}</p></div>
            <Link href={'/' + locale + '/client/tests'} prefetch={false} className={styles.fullCatalogue}>
              {extra.full}<ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.extraFilters}>
            <label className={styles.extraSearch}><span>{extra.search}</span>
              <input type="search" value={search} placeholder={extra.searchPlaceholder}
                onChange={event => { setSearch(event.currentTarget.value); setShowMore(false); }} />
            </label>
            <label><span>{extra.kind}</span>
              <select value={kindFilter} onChange={event => { setKindFilter(event.currentTarget.value); setShowMore(false); }}>
                <option value="all">{extra.allKinds}</option>
                {TEST_KINDS.map(kind => <option key={kind.key} value={kind.key}>{kind.label[locale]}</option>)}
              </select>
            </label>
            <label><span>{extra.topic}</span>
              <select value={topicFilter} onChange={event => { setTopicFilter(event.currentTarget.value); setShowMore(false); }}>
                <option value="matching">{extra.matching}</option>
                <option value="all">{extra.allTopics}</option>
                {axesForFilters.map(axis => <option key={axis} value={axis}>{axesCopy[axis]?.[locale] || axis}</option>)}
              </select>
            </label>
            <label><span>{extra.time}</span>
              <select value={timeFilter} onChange={event => { setTimeFilter(event.currentTarget.value); setShowMore(false); }}>
                <option value="all">{extra.anyTime}</option>
                <option value="2">{extra.two}</option>
                <option value="5">{extra.five}</option>
                <option value="10">{extra.ten}</option>
              </select>
            </label>
            <label><span>{extra.sort}</span>
              <select value={sortFilter} onChange={event => setSortFilter(event.currentTarget.value)}>
                <option value="relevant">{extra.relevant}</option>
                <option value="shortest">{extra.shortest}</option>
                <option value="alphabetical">{extra.alphabetical}</option>
              </select>
            </label>
          </div>
          <p className={styles.extraResultCount} role="status">{extraMatches.length} {extra.results}</p>
          {displayTests.length ? <div className={styles.testList}>
            {displayTests.map(test => <label key={test.key} className={styles.testRow}>
              <input type="checkbox" checked={false} disabled={selectedKeys.length >= 12}
                onChange={() => toggleTest(test.key)} aria-label={extra.add + ": " + test.title} />
              <span className={styles.testText}><strong>{test.title}</strong>
                <small>{test.questions ? test.questions + " " + t.questions : ""}
                  {test.questions && test.minutes ? " · " : ""}
                  {test.minutes ? test.minutes + " " + t.minutes : ""}</small>
                <span>{test.axes.map(axis => axesCopy[axis]?.[locale] || axis).join(" · ")}</span>
              </span>
            </label>)}
          </div> : <p className={styles.extraEmpty}>{extra.nothing}</p>}
          {extraMatches.length > 6 && <button type="button" className={styles.moreTests}
            onClick={() => setShowMore(previous => !previous)} aria-expanded={showMore}>
            {showMore ? extra.less : extra.more}<ChevronDown size={16} aria-hidden="true" />
          </button>}
          {selectedKeys.length >= 12 && <p className={styles.caution}>{extra.limit}</p>}
        </section>
      </section>}

      {step === 3 && <section aria-labelledby="profile-builder-step-title" data-profile-test-review-slide>
        <div className={styles.reviewIntro}>
          <div className={styles.reviewIcon} aria-hidden="true"><ClipboardList size={24} /></div>
          <p className={styles.templateLabel}>{t.readyKicker}</p>
          <h2 id="profile-builder-step-title">{t.readyTitle}</h2>
          <p className={styles.help}>{t.readyHelp}</p>
          <p className={styles.reviewTotal}>
            <ClipboardList size={17} aria-hidden="true" />
            <strong>{chosenTests.length} {t.testCount}</strong>
            {minutes > 0 && <span>· ~{minutes} {t.minutes}</span>}
          </p>
        </div>
        <ol className={styles.reviewTests}>
          {chosenTests.map((test, index) =>
            <li key={test.key} className={styles.reviewTest} data-profile-review-test={test.key}>
              <span className={styles.reviewNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.reviewTestText}>
                <strong>{test.title}</strong>
                <small>{test.questions ? test.questions + " " + t.questions : ""}
                  {test.questions && test.minutes ? " · " : ""}
                  {test.minutes ? "~" + test.minutes + " " + t.minutes : ""}</small>
              </span>
              <Check size={18} className={styles.reviewCheck} aria-hidden="true" />
            </li>)}
        </ol>
        <div className={styles.accountOffer} data-profile-google-cabinet-offer>
          <div className={styles.accountOfferHeading}>
            <Sparkles size={18} aria-hidden="true" />
            <strong>{t.accountTitle}</strong>
          </div>
          <p className={styles.accountOfferDescription}>{t.accountDescription}</p>
          <button type="button" className={styles.googleButton}
            onClick={saveSelectionWithGoogle} disabled={accountBusy || selectedKeys.length === 0}
            data-profile-google-signin>
            <span className={styles.googleMark} aria-hidden="true">G</span>
            <span>{accountBusy ? t.saveToCabinetBusy : t.saveToCabinet}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <small className={styles.accountPrivacy}><LockKeyhole size={13} aria-hidden="true" />{t.accountPrivacy}</small>
          {accountError && <p role="alert" className={styles.accountError}>{accountError}</p>}
        </div>
        <details className={styles.swot}>
          <summary>{t.swotTitle}<ChevronDown size={17} aria-hidden="true" /></summary>
          <div className={styles.swotGrid}>{t.swot.map(item =>
            <div key={item[0]}><strong>{item[0]}</strong><p>{item[1]}</p></div>)}</div>
          <p className={styles.swotNote}>{t.swotNote}</p>
        </details>
      </section>}

      {step < 3 && <div className={styles.actions}>
        {step > 0 && <button type="button" className={styles.back} onClick={() => setStep(step - 1)}>
          <ArrowLeft size={17} aria-hidden="true" />{t.back}
        </button>}
        {step === 0
          ? <button type="button" className={styles.primary} disabled={focuses.length === 0}
              onClick={goForward} data-profile-confirm-focus>{t.next}<ArrowRight size={17} /></button>
          : step === 1
            ? <button type="button" className={styles.primary}
                disabled={activeAreas.length === 0 || selectedAxes.length === 0}
                onClick={goForward}>{t.next}<ArrowRight size={17} /></button>
            : <button type="button" className={styles.secondaryReview}
                disabled={selectedKeys.length === 0}
                onClick={goForward} data-profile-review-tests>{extra.review}<ArrowRight size={17} /></button>}
      </div>}
    </div>

    {step < 3 &&     <aside className={styles.privateInfo}>
      <LockKeyhole size={19} aria-hidden="true" />
      <div><p>{t.private}</p>
        <div className={styles.privateLinks}>
          <Link href={base + "/app/portrait"} prefetch={false}>{t.myProfile}<ArrowRight size={14} /></Link>
          <Link href={base + "/app/portfolio#hh-development-program"} prefetch={false}>{t.myPath}<ArrowRight size={14} /></Link>
        </div>
      </div>
    </aside>}
    </>}
    {t.esNote && <p className={styles.languageNotice}>{t.esNote}</p>}
    <p className={styles.disclaimer}>{t.disclaimer}</p>
  </div>;
}