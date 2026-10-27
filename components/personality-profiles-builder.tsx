"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Brain, BriefcaseBusiness, Check, ChevronDown, ClipboardList, HeartHandshake, HeartPulse, LockKeyhole, Sparkles, Target } from "lucide-react";
import styles from "./personality-profiles-builder.module.css";
import { appFetch } from "@/lib/app/client-fetch";
import { PENDING_TEST_SELECTION_KEY, makeTestSelectionIntent } from "@/lib/app/test-selection-intent";
import { PROFILE_FOCUS_AREAS, PROFILE_AREA_AXES, profileAreasWithTests,
  buildProfileScaleGroups, defaultProfileScaleIds, selectedProfileAxes, selectedProfileResearchAxes,
  profileResearchAxisLabel, previewProfileScales, recommendProfileAxisBattery, profileBatteryTotals } from "@/lib/profile/profile-scale-selection";

type Locale = "en" | "ru" | "es";
type Focus = "wellbeing" | "relationships" | "work" | "identity" | "goal";
type Area = "traits" | "support" | "emotions" | "recovery" | "body" | "connection" | "work" | "money" | "meaning" | "goal";
type TestMode = "questionnaires" | "pro";
type PublicScale = { key: string; label: string; axis: string; scaleQuestions: number | null };
type PublicTest = { key: string; version: string; title: string; axes: string[]; minutes: number | null;
  questions: number | null; testKind: string; topics: string[]; scales: PublicScale[] };
type Props = { locale: Locale; tests: PublicTest[] };
type ProfileScaleGroup = {
  area: Area;
  scales: Array<{
    id: string; key: string; label: string; axis: string; researchAxisId: string;
    testKey: string; testTitle: string; testKind: string;
    scaleQuestions: number | null; questions: number | null; minutes: number | null;
  }>;
  researchAxes: Array<{ id: string; sourceAxis: string; label: Record<Locale, string>; scaleCount: number }>;
};

// Shared, source-backed topic taxonomy. All catalogue axes are mapped,
// but only topics supported by eligible tests appear in the wizard.
const areaAxes = PROFILE_AREA_AXES as Record<Area, readonly string[]>;
const focusAreas = PROFILE_FOCUS_AREAS as unknown as Record<Focus, Area[]>;
const areasFor = (focuses: Focus[]) => [...new Set(focuses.flatMap(focus => focusAreas[focus]))];

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
    stages: ["Focus", "Topics", "Scales", "Tests", "Ready"],
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
      goal: ["Goal Profile", "Clarity, motivation and confidence in one chosen goal. Self-ratings are saved privately; tests provide context."],
    },
    topicTitle: "Choose the specific topics that matter",
    topicHelp: "Choose your topics here; open the next step to expand each topic into its real measured scales.",
    focusContext: "Selected interests",
    areas: {
      traits: ["Personality traits", "Patterns · strengths"],
      support: ["Resources & self-support", "Support · self-kindness"],
      emotions: ["Emotions & stress", "Mood · regulation"],
      recovery: ["Energy & rest", "Recovery · sleep"],
      body: ["Body signals & energy", "Sensations · vitality"],
      connection: ["Relationships", "Connection · communication"],
      work: ["Work & focus", "Clarity · daily actions"],
      money: ["Money decisions", "Choices · habits, not income"],
      meaning: ["Purpose & values", "Meaning · direction"],
      goal: ["Goal clarity · motivation · confidence", "Supporting questionnaires (not the 3 goal ratings)"],
    },
    scaleTitle: "Choose the axes and scales for your profile",
    scaleHelp: "Research axes group related questions. Select the actual questionnaire scales beneath them; scores from different tests are not interchangeable.",
    selectAll: "Select all", clearAll: "Clear all", selected: "selected",
    scaleSourceLabel: "Questionnaire", scaleItemsLabel: "scale questions", scaleUnknown: "Scale item count not documented",
    fullTestNote: "The time and total questions shown belong to the full source questionnaire. Shared tests are counted only once in the next step.",
    scaleSelected: "scales selected", scalePerTopic: "of this topic", scaleSourceCount: "source scales", scaleMore: "Show more scales", scaleFewer: "Show fewer scales",
    scaleEmpty: "No eligible source-declared scales for this topic yet.", scaleRequired: "Choose at least one scale to continue.",
    modeCheckins: "Questionnaires", modePro: "Pro tests", modeMeaning: "Pro = methods with a documented source, not a diagnosis or guarantee of clinical validation.",
    modeNoTests: "No eligible tests in this mode cover the selected scales. Choose the other mode or adjust scales.",
    modeOverview: "Recommended for your selected scales", modeEstimated: "estimated total", modeSource: "Test questions",
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
    stages: ["Запрос", "Темы", "Шкалы", "Тесты", "Начало"],
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
      goal: ["Профиль цели", "Ясность, мотивация и уверенность в достижении выбранной цели. Личная самооценка сохраняется приватно."],
    },
    topicTitle: "Уточните важные для вас темы",
    topicHelp: "Выберите темы. На следующем шаге раскроются соответствующие им измеряемые шкалы.",
    focusContext: "Выбранные направления",
    areas: {
      traits: ["Особенности личности", "Качества · сильные стороны"],
      support: ["Ресурсы и поддержка", "Опора · бережность к себе"],
      emotions: ["Эмоции и стресс", "Настроение · регуляция"],
      recovery: ["Энергия и отдых", "Восстановление · сон"],
      body: ["Ощущения и энергия тела", "Самочувствие · энергия"],
      connection: ["Отношения", "Связь · общение"],
      work: ["Работа и фокус", "Ясность · действия"],
      money: ["Решения о деньгах", "Привычки, не уровень дохода"],
      meaning: ["Ценности и смысл", "Цели · направление"],
      goal: ["Ясность · мотивация · уверенность", "Вспомогательные тесты, не оценки конкретной цели"],
    },
    scaleTitle: "Выберите оси и шкалы своего профиля",
    scaleHelp: "Оси группируют близкие темы, а галочки выбирают реальные шкалы тестов. Баллы разных методик не приравниваются друг к другу.",
    selectAll: "Выбрать все", clearAll: "Снять все", selected: "выбрано",
    scaleSourceLabel: "Опросник", scaleItemsLabel: "вопросов шкалы", scaleUnknown: "Число вопросов шкалы не указано в методике",
    fullTestNote: "Время и общее число вопросов относятся к тесту-источнику. Если шкалы входят в один тест, время на следующем шаге считается один раз.",
    scaleSelected: "шкал выбрано", scalePerTopic: "по этой теме", scaleSourceCount: "исходных шкал", scaleMore: "Больше шкал", scaleFewer: "Свернуть шкалы",
    scaleEmpty: "По этой теме пока нет доступных шкал с указанным источником.", scaleRequired: "Выберите хотя бы одну шкалу.",
    modeCheckins: "Опросники", modePro: "Pro-тесты", modeMeaning: "Pro — методики с документированным источником, не медицинский диагноз и не гарантия клинической валидности.",
    modeNoTests: "В этом режиме нет подходящих разрешённых тестов по выбранным шкалам. Переключите режим или измените шкалы.",
    modeOverview: "Рекомендуем по выбранным шкалам", modeEstimated: "всего ориентировочно", modeSource: "Вопросов теста",
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
    stages: ["Interés", "Temas", "Escalas", "Pruebas", "Inicio"],
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
      goal: ["Perfil de la meta", "Claridad, motivación y confianza en una meta elegida. Autoevaluación privada y pruebas complementarias."],
    },
    topicTitle: "Elige los temas específicos para explorar",
    topicHelp: "Elige tus temas; en el siguiente paso podrás abrir sus escalas medibles.",
    focusContext: "Áreas elegidas",
    areas: {
      traits: ["Rasgos personales", "Patrones · fortalezas"],
      support: ["Recursos y apoyo", "Apoyo · autocompasión"],
      emotions: ["Emociones y estrés", "Ánimo · regulación"],
      recovery: ["Energía y descanso", "Recuperación · sueño"],
      body: ["Señales del cuerpo y energía", "Sensaciones · vitalidad"],
      connection: ["Relaciones", "Conexión · comunicación"],
      work: ["Trabajo y enfoque", "Claridad · acciones"],
      money: ["Decisiones de dinero", "Hábitos, no nivel de ingresos"],
      meaning: ["Sentido y valores", "Metas · dirección"],
      goal: ["Claridad · motivación · confianza", "Pruebas complementarias, no puntajes de la meta"],
    },
    scaleTitle: "Elige los ejes y las escalas de tu perfil",
    scaleHelp: "Los ejes agrupan temas afines; marca las escalas de cuestionarios reales. Sus resultados no son intercambiables.",
    selectAll: "Seleccionar todas", clearAll: "Desmarcar", selected: "seleccionadas",
    scaleSourceLabel: "Cuestionario", scaleItemsLabel: "preguntas de la escala", scaleUnknown: "Sin número de ítems verificado",
    fullTestNote: "El tiempo y el total de preguntas pertenecen al cuestionario completo. Si varias escalas usan el mismo test, su duración se cuenta una sola vez.",
    scaleSelected: "escalas elegidas", scalePerTopic: "de este tema", scaleSourceCount: "escalas de origen", scaleMore: "Más escalas", scaleFewer: "Ver menos escalas",
    scaleEmpty: "Aún no hay escalas disponibles con fuente para este tema.", scaleRequired: "Elige al menos una escala.",
    modeCheckins: "Cuestionarios", modePro: "Pruebas Pro", modeMeaning: "Pro significa metodología con fuente documentada; no garantiza validación clínica ni diagnóstico.",
    modeNoTests: "No hay pruebas autorizadas para estas escalas en este modo. Cambia el modo o las escalas.",
    modeOverview: "Recomendado para tus escalas", modeEstimated: "duración estimada total", modeSource: "Preguntas de la prueba",
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
    profile: "1. Choose one profile", scales: "2. Choose its scales", scaleHelp: "Select any number. With none checked, all scales in this profile apply.", chooseAll: "Select all", clearScales: "Clear all", chooseFirst: "Choose a profile to see matching additional tests.",
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
    profile: "1. Выберите один профиль", scales: "2. Отметьте шкалы профиля", scaleHelp: "Можно отметить любое количество шкал. Без галочек учитываются все шкалы выбранного профиля.", chooseAll: "Выбрать все", clearScales: "Снять все", chooseFirst: "Выберите профиль, чтобы открыть дополнительные тесты.",
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
    profile: "1. Elige un perfil", scales: "2. Elige sus escalas", scaleHelp: "Selecciona cuantas escalas quieras. Sin selección se incluyen todas las del perfil.", chooseAll: "Seleccionar todas", clearScales: "Quitar todas", chooseFirst: "Elige un perfil para ver las pruebas adicionales.",
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
  const [selectedScaleIds, setSelectedScaleIds] = useState<string[]>([]);
  const [scalesInitialized, setScalesInitialized] = useState(false);
  const [expandedScaleAreas, setExpandedScaleAreas] = useState<Area[]>([]);
  const [batteryMode, setBatteryMode] = useState<TestMode>("questionnaires");
  const [selectedByMode, setSelectedByMode] = useState<Record<TestMode, string[]>>({ questionnaires: [], pro: [] });
  const [batterySignature, setBatterySignature] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [extraProfile, setExtraProfile] = useState<Focus | null>(null);
  const [extraScales, setExtraScales] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("relevant");
  const [search, setSearch] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const accountLocale = locale === "es" ? "en" : locale;
  const extra = additionalCopy[locale];

  // Topics define the scope. The accordion selects exact source-declared
  // subscales; their question/time metadata always belongs to a real test.
  const visibleAreas = profileAreasWithTests(tests, focuses) as Area[];
  const activeAreas = areas.filter(area => visibleAreas.includes(area));
  const visibleScaleGroups = buildProfileScaleGroups(tests, visibleAreas, areaAxes) as ProfileScaleGroup[];
  const scaleGroups = buildProfileScaleGroups(tests, activeAreas, areaAxes) as ProfileScaleGroup[];
  const selectedAxes = selectedProfileAxes(scaleGroups, selectedScaleIds) as string[];
  const selectedAxisRefs = selectedProfileResearchAxes(scaleGroups, selectedScaleIds) as string[];
  const selectedKeys = selectedByMode[batteryMode];
  const chosenTests = selectedKeys.flatMap(key => tests.filter(test => test.key === key &&
    test.testKind === (batteryMode === "pro" ? "professional" : "monitoring")));
  // Coverage is by researched construct, not by a broad scorer axis such as "personality".
  // Choosing a questionnaire never creates a new or interchangeable clinical score.
  const coverage = new Set(scaleGroups.flatMap(group => group.scales
    .filter(scale => selectedKeys.includes(scale.testKey) &&
      selectedAxisRefs.includes(scale.researchAxisId)).map(scale => scale.researchAxisId)));
  const minutes = chosenTests.reduce((sum, test) => sum + (test.minutes || 0), 0);
  const modeTotals = {
    questionnaires: profileBatteryTotals(tests, selectedByMode.questionnaires),
    pro: profileBatteryTotals(tests, selectedByMode.pro),
  };
  const modeKind = batteryMode === "pro" ? "professional" : "monitoring";
  const extraGroups: ProfileScaleGroup[] = extraProfile
    ? buildProfileScaleGroups(tests, areasFor([extraProfile]), areaAxes) as ProfileScaleGroup[] : [];
  const axesForExtraProfile = [...new Set(extraGroups.flatMap(group =>
    group.researchAxes.map(axis => axis.id)))]
    .sort((a, b) => profileResearchAxisLabel(a, locale).localeCompare(profileResearchAxisLabel(b, locale), locale));
  const effectiveExtraScales = extraScales.length ? extraScales : axesForExtraProfile;
  const extraTestKeys = new Set(extraGroups.flatMap(group => group.scales
    .filter(scale => effectiveExtraScales.includes(scale.researchAxisId)).map(scale => scale.testKey)));
  const extraRelevance = (key: string) => extraGroups.reduce((total, group) => total +
    group.scales.filter(scale => scale.testKey === key &&
      effectiveExtraScales.includes(scale.researchAxisId)).length, 0);
  const extraMatches = tests
    .filter(test => !selectedKeys.includes(test.key))
    .filter(test => test.testKind === modeKind)
    .filter(test => extraProfile !== null && extraTestKeys.has(test.key))
    .filter(test => timeFilter === "all" || (test.minutes !== null && test.minutes <= Number(timeFilter)))
    .filter(test => !search.trim() ||
      [test.title, ...test.scales.map(scale => scale.label),
        ...extraGroups.flatMap(group => group.scales
          .filter(scale => scale.testKey === test.key)
          .map(scale => profileResearchAxisLabel(scale.researchAxisId, locale)))]
        .join(" ").toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)))
    .sort((a, b) => sortFilter === "shortest"
      ? (a.minutes ?? 99) - (b.minutes ?? 99) || a.title.localeCompare(b.title, locale)
      : sortFilter === "alphabetical"
        ? a.title.localeCompare(b.title, locale)
        : extraRelevance(b.key) - extraRelevance(a.key) ||
          (a.minutes ?? 99) - (b.minutes ?? 99) || a.key.localeCompare(b.key));
  const displayTests = showMore ? extraMatches : extraMatches.slice(0, 6);

  function toggleFocus(focus: Focus) {
    setFocuses(previous => previous.includes(focus)
      ? previous.filter(item => item !== focus) : [...previous, focus]);
    // Other directions must not contribute stale topics, scales or plans.
    setAreas([]);
    setSelectedScaleIds([]);
    setScalesInitialized(false);
    setSelectedByMode({ questionnaires: [], pro: [] });
    setBatterySignature("");
    setShowMore(false);
  }

  function toggleArea(area: Area) {
    if (!visibleAreas.includes(area)) return;
    setAreas(previous => previous.includes(area) ? previous.filter(item => item !== area) : [...previous, area]);
    setSelectedScaleIds([]);
    setScalesInitialized(false);
    setSelectedByMode({ questionnaires: [], pro: [] });
    setBatterySignature("");
    setShowMore(false);
  }

  function toggleScale(id: string) {
    if (!scaleGroups.some(group => group.scales.some(scale => scale.id === id))) return;
    setSelectedScaleIds(previous => previous.includes(id)
      ? previous.filter(item => item !== id) : [...previous, id]);
    setBatterySignature("");
  }

  function toggleTest(key: string) {
    // Only tests from this mode of the rights-cleared guest catalogue may enter.
    if (!tests.some(test => test.key === key && test.testKind === modeKind)) return;
    setSelectedByMode(previous => {
      const keys = previous[batteryMode];
      return { ...previous, [batteryMode]: keys.includes(key)
        ? keys.filter(item => item !== key)
        : keys.length < 12 ? [...keys, key] : keys };
    });
  }

  function goForward() {
    if (step === 0 && focuses.length) {
      setAreas(visibleAreas);
      setSelectedScaleIds([]);
      setScalesInitialized(false);
      setSelectedByMode({ questionnaires: [], pro: [] });
      setBatterySignature("");
      setShowMore(false);
      setStep(1);
    } else if (step === 1 && activeAreas.length) {
      if (!scalesInitialized) {
        setSelectedScaleIds(defaultProfileScaleIds(scaleGroups, 3));
        setScalesInitialized(true);
      }
      setStep(2);
    } else if (step === 2 && selectedScaleIds.length && selectedAxes.length) {
      const signature = [...selectedScaleIds].sort().join("|");
      if (batterySignature !== signature) {
        // A selected *source scale* resolves to a particular research construct.
        // Big Five extraversion cannot be substituted with an unrelated trait.
        // The selector returns immutable suggestions; React keeps editable
        // per-mode selections as its own mutable arrays.
        const questionnaires = [...recommendProfileAxisBattery(tests, scaleGroups,
          selectedScaleIds, "questionnaires")];
        const pro = [...recommendProfileAxisBattery(tests, scaleGroups,
          selectedScaleIds, "pro")];
        setSelectedByMode({ questionnaires, pro });
        setBatterySignature(signature);
        setBatteryMode(questionnaires.length ? "questionnaires" : pro.length ? "pro" : "questionnaires");
      }
      setShowMore(false);
      setStep(3);
    } else if (step === 3 && selectedKeys.length > 0) {
      setStep(4);
    }
  }

  const base = "/" + accountLocale;
  // Only server-filtered, selectable test keys go into this guest URL; never answers.
  const testHref = base + "/client?startTests=" + encodeURIComponent(selectedKeys.join(","));

  async function saveSelectionWithGoogle() {
    if (accountBusy || selectedKeys.length === 0) return;
    setAccountError("");
    // The only cross-navigation state is a TTL-limited whitelist of eligible
    // questionnaire keys, not the user interests, answers or health results.
    // No guest answers or guest results are imported into the Google account.
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
                  : key === "work" ? <BriefcaseBusiness size={21} /> : key === "goal" ? <Target size={21} /> : <Brain size={21} />}
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
            const axes = visibleScaleGroups.find(group => group.area === area)?.researchAxes || [];
            return <button type="button" key={area} aria-pressed={areas.includes(area)}
              disabled={!axes.length} className={styles.areaCard} onClick={() => toggleArea(area)}>
              <span className={styles.selectDot}>{areas.includes(area) && <Check size={14} aria-hidden="true" />}</span>
              <span><strong>{t.areas[area][0]}</strong>
                <small>{axes.length
                  ? axes.map(axis => profileResearchAxisLabel(axis.id, locale)).join(" · ")
                  : extra.notMeasured}</small>
              </span>
            </button>;
          })}
        </div>
      </section>}

      {step === 2 && <section aria-labelledby="profile-builder-step-title" data-profile-scales-step>
        <h2 id="profile-builder-step-title">{t.scaleTitle}</h2>
        <p className={styles.help}>{t.scaleHelp}</p>
        <div className={styles.scaleOverview} role="status">
          <strong>{selectedScaleIds.length} {t.scaleSelected}</strong>
          <span>{activeAreas.map(area => t.areas[area][0]).join(" · ")}</span>
        </div>
        <div className={styles.topicAccordions} data-profile-scales-by-topic>
          {scaleGroups.map((group, index) => {
            const selectedInTopic = group.scales.filter(scale => selectedScaleIds.includes(scale.id)).length;
            const expanded = expandedScaleAreas.includes(group.area);
            // Always show one registered source scale per conceptual axis;
            // additional alternatives belong behind "Show more".
            const shortlist = previewProfileScales(group.scales, 8) as ProfileScaleGroup["scales"];
            const visible = expanded ? group.scales : [
              ...shortlist,
              ...group.scales.filter(scale => selectedScaleIds.includes(scale.id) &&
                !shortlist.some(item => item.id === scale.id)),
            ];
            return <details key={group.area} className={styles.topicAccordion}
                open={index === 0} data-profile-scale-topic={group.area}>
              <summary><span className={styles.topicAccordionTitle}>
                <strong>{t.areas[group.area][0]}</strong>
                <small>{selectedInTopic} / {group.scales.length} {t.scalePerTopic}</small>
              </span><ChevronDown size={18} aria-hidden="true" /></summary>
              <div className={styles.topicAccordionBody}>
                {group.researchAxes.filter(axis =>
                  visible.some(scale => scale.researchAxisId === axis.id)).map(axis =>
                  <div key={axis.id} className={styles.topicAxisGroup} data-profile-research-axis={axis.id}>
                    <div className={styles.topicAxisHeading}>
                      <strong>{profileResearchAxisLabel(axis.id, locale)}</strong>
                      <small>{axis.scaleCount} {t.scaleSourceCount}</small>
                    </div>
                    {visible.filter(scale => scale.researchAxisId === axis.id)
                      .map(scale => <label key={scale.id} className={styles.topicScaleRow}
                    data-profile-source-scale={scale.id}>
                  <input type="checkbox" checked={selectedScaleIds.includes(scale.id)}
                    onChange={() => toggleScale(scale.id)} />
                  <span className={styles.topicScaleText}>
                    <strong>{scale.label}</strong>
                    <small>{t.scaleSourceLabel}: {scale.testTitle}</small>
                    <small>{scale.scaleQuestions
                      ? scale.scaleQuestions + " " + t.scaleItemsLabel + " · "
                      : t.scaleUnknown + " · "}{scale.questions ? scale.questions + " " + t.questions + " · " : ""}
                      {scale.minutes ? "~" + scale.minutes + " " + t.minutes : ""}</small>
                  </span>
                </label>)}
                  </div>)}
                {group.scales.length === 0 && <p className={styles.scaleRequired}>{t.scaleEmpty}</p>}
                {group.scales.length > 8 && <button type="button" className={styles.scaleExpand}
                    onClick={() => setExpandedScaleAreas(previous => expanded
                      ? previous.filter(area => area !== group.area) : [...previous, group.area])}
                    aria-expanded={expanded}>
                  {expanded ? t.scaleFewer : t.scaleMore}<ChevronDown size={15} aria-hidden="true" />
                </button>}
              </div>
            </details>;
          })}
        </div>
        <p className={styles.scaleSourceNote}>{t.fullTestNote}</p>
        {selectedScaleIds.length === 0 && <p className={styles.caution} role="status">{t.scaleRequired}</p>}
      </section>}

      {step === 3 && <section aria-labelledby="profile-builder-step-title" data-profile-tests-step>
        <h2 id="profile-builder-step-title">{t.testTitle}</h2>
        <p className={styles.help}>{t.testHelp}</p>
        <fieldset className={styles.batteryModes} data-profile-test-mode>
          <legend>{t.modeOverview}</legend>
          <div className={styles.batteryModeChoices}>
            {(["questionnaires", "pro"] as const).map(mode => <button type="button" key={mode}
                aria-pressed={batteryMode === mode} data-profile-mode={mode}
                onClick={() => { setBatteryMode(mode); setShowMore(false); }}>
              <strong>{mode === "pro" ? t.modePro : t.modeCheckins}</strong>
              <small>{modeTotals[mode].count} {t.testCount} · ~{modeTotals[mode].minutes} {t.minutes}
                {modeTotals[mode].questions ? " · " + modeTotals[mode].questions + " " + t.questions : ""}</small>
            </button>)}
          </div>
          <p>{t.modeMeaning}</p>
        </fieldset>
        <div className={styles.testCount}><ClipboardList size={17} aria-hidden="true" />
          <strong>{chosenTests.length} {t.testCount}</strong>
          {minutes > 0 && <span>· {minutes} {t.minutes}</span>}
          <span>· {coverage.size}/{selectedAxisRefs.length} {t.selected}</span>
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
                <span>{[...new Set(scaleGroups.flatMap(group => group.scales
                  .filter(scale => scale.testKey === test.key &&
                    selectedAxisRefs.includes(scale.researchAxisId))
                  .map(scale => profileResearchAxisLabel(scale.researchAxisId, locale))))].join(" · ")}</span>
              </span>
            </label>)}
        </div> : <p className={styles.caution} role="status">{t.modeNoTests}</p>}
        {coverage.size < selectedAxisRefs.length && chosenTests.length > 0 &&
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
          <div className={styles.extraProfileSelector} data-profile-extra-profile-filter>
            <strong>{extra.profile}</strong>
            <div className={styles.extraProfileChoices} role="group" aria-label={extra.profile}>
              {(["wellbeing", "relationships", "work", "identity", "goal"] as const).map(key =>
                <button type="button" key={key} data-profile-extra-profile={key}
                  aria-pressed={extraProfile === key}
                  onClick={() => { setExtraProfile(key); setExtraScales([]); setSearch(""); setShowMore(false); }}>
                  {extraProfile === key ? "✓ " : ""}{t.focuses[key][0]}
                </button>)}
            </div>
          </div>
          {extraProfile && <div className={styles.extraScaleSelector} data-profile-extra-scales>
            <strong>{extra.scales}</strong>
            <p>{extra.scaleHelp}</p>
            <div className={styles.extraScaleChoices} role="group" aria-label={extra.scales}>
              {axesForExtraProfile.map(axis => <button key={axis} type="button" data-profile-extra-scale={axis}
                aria-pressed={extraScales.includes(axis)} onClick={() => {
                  setExtraScales(previous => previous.includes(axis)
                    ? previous.filter(item => item !== axis) : [...previous, axis]);
                  setShowMore(false);
                }}>
                {extraScales.includes(axis) ? "✓ " : "+ "}{profileResearchAxisLabel(axis, locale)}
              </button>)}
            </div>
            <div className={styles.extraScaleActions}>
              <span role="status">{extraScales.length} / {axesForExtraProfile.length}</span>
              <button type="button" onClick={() => { setExtraScales([...axesForExtraProfile]); setShowMore(false); }}>{extra.chooseAll}</button>
              <button type="button" onClick={() => { setExtraScales([]); setShowMore(false); }}>{extra.clearScales}</button>
            </div>
          </div>}
          <div className={styles.extraFilters}>
            <label className={styles.extraSearch}><span>{extra.search}</span>
              <input type="search" value={search} placeholder={extra.searchPlaceholder}
                onChange={event => { setSearch(event.currentTarget.value); setShowMore(false); }} />
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
          <p className={styles.extraResultCount} role="status">{extraProfile ? extraMatches.length + " " + extra.results : extra.chooseFirst}</p>
          {displayTests.length ? <div className={styles.testList}>
            {displayTests.map(test => <label key={test.key} className={styles.testRow}>
              <input type="checkbox" checked={false} disabled={selectedKeys.length >= 12}
                onChange={() => toggleTest(test.key)} aria-label={extra.add + ": " + test.title} />
              <span className={styles.testText}><strong>{test.title}</strong>
                <small>{test.questions ? test.questions + " " + t.questions : ""}
                  {test.questions && test.minutes ? " · " : ""}
                  {test.minutes ? test.minutes + " " + t.minutes : ""}</small>
                <span>{[...new Set(extraGroups.flatMap(group => group.scales
                  .filter(scale => scale.testKey === test.key &&
                    effectiveExtraScales.includes(scale.researchAxisId))
                  .map(scale => profileResearchAxisLabel(scale.researchAxisId, locale))))].join(" · ")}</span>
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

      {step === 4 && <section aria-labelledby="profile-builder-step-title" data-profile-test-review-slide>
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

      {step < 4 && <div className={styles.actions}>
        {step > 0 && <button type="button" className={styles.back} onClick={() => setStep(step - 1)}>
          <ArrowLeft size={17} aria-hidden="true" />{t.back}
        </button>}
        {step === 0
          ? <button type="button" className={styles.primary} disabled={focuses.length === 0}
              onClick={goForward} data-profile-confirm-focus>{t.next}<ArrowRight size={17} /></button>
          : step === 1
            ? <button type="button" className={styles.primary} disabled={activeAreas.length === 0}
                onClick={goForward}>{t.next}<ArrowRight size={17} /></button>
            : step === 2
              ? <button type="button" className={styles.primary} disabled={selectedScaleIds.length === 0}
                  onClick={goForward} data-profile-confirm-scales>{t.next}<ArrowRight size={17} /></button>
              : <button type="button" className={styles.secondaryReview} disabled={selectedKeys.length === 0}
                  onClick={goForward} data-profile-review-tests>{extra.review}<ArrowRight size={17} /></button>}
      </div>}
    </div>

    {step < 4 && <aside className={styles.privateInfo}>
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