"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Brain, BriefcaseBusiness, Check, ChevronDown, ClipboardList, HeartHandshake, HeartPulse, LockKeyhole, Sparkles, Target } from "lucide-react";
import styles from "./personality-profiles-builder.module.css";
import { appFetch } from "@/lib/app/client-fetch";
import { PENDING_TEST_SELECTION_KEY, makeTestSelectionIntent } from "@/lib/app/test-selection-intent";
import { PROFILE_AREA_AXES, profileAreasWithTests,
  buildProfileScaleGroups, selectedProfileAxes, selectedProfileResearchAxes,
  profileResearchAxisLabel, recommendProfileTopThreeTests, rankProfileAxisTests, profileBatteryTotals } from "@/lib/profile/profile-scale-selection";

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
    stages: ["Focus", "Scales", "Topics", "Tests", "Ready"],
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
    goalScaleNote: "These three choices identify supporting topics. Your personal 0–10 goal ratings are separate, optional and private.",
    topicTitle: "Select the scales that matter to you",
    topicHelp: "Choose only the main scales to explore. You will choose topics next; goal clarity, motivation and confidence remain separate.",
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
      goal: ["Your goal", "Clarity · motivation · confidence"],
    },
    scaleTitle: "Choose the topics within your scales",
    scaleHelp: "Choose topics within your scales. Actual questionnaires appear only on the next screen.",
    selectAll: "Select all", clearAll: "Clear all", selected: "selected",
    scaleSourceLabel: "Questionnaire", scaleItemsLabel: "scale questions", scaleUnknown: "Scale item count not documented",
    fullTestNote: "Only topics are selected here. One topic can have several eligible questionnaires; on the Tests step you choose which complete tests to take.",
    scaleSelected: "topics selected", scalePerTopic: "topics", scaleSourceCount: "topic options", scaleMore: "More topics", scaleFewer: "Fewer topics",
    scaleEmpty: "No eligible source-declared scales for this topic yet.", scaleRequired: "Choose at least one topic to continue.",
    modeCheckins: "Questionnaires / check-ins", modePro: "Professional tests", modeMeaning: "Pro = methods with a documented source, not a diagnosis or guarantee of clinical validation.",
    modeNoTests: "No eligible tests in this mode cover the selected scales. Choose the other mode or adjust scales.",
    modeOverview: "Filter by test type", modeEstimated: "estimated total", modeSource: "Test questions",
    selectedTests: "selected", coveredScales: "scales covered",
    mainThree: "3 key recommended tests", nextFive: "5 more tests ranked by topic match",
    fit: "match", fitInfo: "Catalogue relevance: 80% coverage of selected research facets + 20% exact selected source scales. Not a health score, clinical probability or validated accuracy.",
    noneSelected: "Select at least one test to continue. Unticked tests remain available.",
    testTitle: "Your recommended free test selection",
    testHelp: "Three suggested tests appear first, followed by matching options for your chosen topics. Tick the ones you want.",
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
    stages: ["Запрос", "Шкалы", "Темы", "Тесты", "Начало"],
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
    goalScaleNote: "Эти три шкалы помогают выбрать темы для исследования. Ваши личные оценки цели от 0 до 10 — отдельное, добровольное и приватное действие.",
    topicTitle: "Выберите шкалы для исследования",
    topicHelp: "Отметьте только основные шкалы. Темы внутри них выберете дальше. Ясность цели, мотивация и уверенность остаются отдельными шкалами.",
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
      goal: ["Ваша цель", "Ясность · мотивация · уверенность"],
    },
    scaleTitle: "Выберите темы внутри шкал",
    scaleHelp: "Выберите интересующие темы внутри отмеченных шкал. Опросники появятся только на следующем экране.",
    selectAll: "Выбрать все", clearAll: "Снять все", selected: "выбрано",
    scaleSourceLabel: "Опросник", scaleItemsLabel: "вопросов шкалы", scaleUnknown: "Число вопросов шкалы не указано в методике",
    fullTestNote: "Здесь выбираются только темы. По одной теме может быть несколько подходящих опросников; конкретные тесты выбираются на следующем шаге.",
    scaleSelected: "тем выбрано", scalePerTopic: "тем", scaleSourceCount: "вариантов тем", scaleMore: "Больше тем", scaleFewer: "Меньше тем",
    scaleEmpty: "По этой теме пока нет доступных шкал с указанным источником.", scaleRequired: "Выберите хотя бы одну тему.",
    modeCheckins: "Опросники / мониторинг", modePro: "Профессиональные тесты", modeMeaning: "Pro — методики с документированным источником, не медицинский диагноз и не гарантия клинической валидности.",
    modeNoTests: "В этом режиме нет подходящих разрешённых тестов по выбранным шкалам. Переключите режим или измените шкалы.",
    modeOverview: "Фильтр по типу теста", modeEstimated: "всего ориентировочно", modeSource: "Вопросов теста",
    selectedTests: "выбрано", coveredScales: "шкал охвачено",
    mainThree: "3 основных рекомендованных теста", nextFive: "Ещё 5 тестов по проценту соответствия",
    fit: "соответствие", fitInfo: "Соответствие каталога: 80% охвата выбранных исследовательских направлений + 20% точных выбранных шкал-источников. Не оценка здоровья, клинический прогноз или подтверждённая точность.",
    noneSelected: "Отметьте хотя бы один тест. Снятые с выбора тесты остаются в списке.",
    testTitle: "Предложенный набор бесплатных тестов",
    testHelp: "Сначала три рекомендованных теста, ниже — дополнительные по выбранным темам. Отметьте нужные галочками.",
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
    stages: ["Interés", "Escalas", "Temas", "Pruebas", "Inicio"],
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
    goalScaleNote: "Estas tres opciones permiten explorar temas relacionados. Las puntuaciones personales de tu meta (0–10) son independientes, opcionales y privadas.",
    topicTitle: "Elige las escalas que quieres explorar",
    topicHelp: "Elige solo las escalas principales. Después seleccionarás los temas. Claridad, motivación y confianza son independientes.",
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
      goal: ["Tu meta", "Claridad · motivación · confianza"],
    },
    scaleTitle: "Elige temas dentro de tus escalas",
    scaleHelp: "Marca los temas dentro de las escalas elegidas. Los cuestionarios aparecen solo en la pantalla siguiente.",
    selectAll: "Seleccionar todas", clearAll: "Desmarcar", selected: "seleccionadas",
    scaleSourceLabel: "Cuestionario", scaleItemsLabel: "preguntas de la escala", scaleUnknown: "Sin número de ítems verificado",
    fullTestNote: "Aquí solo se eligen temas. Un tema puede tener varios cuestionarios adecuados; las pruebas completas se eligen en el paso siguiente.",
    scaleSelected: "temas elegidos", scalePerTopic: "temas", scaleSourceCount: "temas disponibles", scaleMore: "Más temas", scaleFewer: "Menos temas",
    scaleEmpty: "Aún no hay escalas disponibles con fuente para este tema.", scaleRequired: "Elige al menos un tema.",
    modeCheckins: "Cuestionarios / seguimiento", modePro: "Pruebas profesionales", modeMeaning: "Pro significa metodología con fuente documentada; no garantiza validación clínica ni diagnóstico.",
    modeNoTests: "No hay pruebas autorizadas para estas escalas en este modo. Cambia el modo o las escalas.",
    modeOverview: "Filtrar por tipo de prueba", modeEstimated: "duración estimada total", modeSource: "Preguntas de la prueba",
    selectedTests: "seleccionadas", coveredScales: "escalas cubiertas",
    mainThree: "3 pruebas principales recomendadas", nextFive: "5 pruebas más, ordenadas por coincidencia",
    fit: "coincidencia", fitInfo: "Afinidad del catálogo: 80% de cobertura de los ejes elegidos + 20% de las escalas de origen exactas elegidas. No es una medida de salud, probabilidad clínica ni precisión validada.",
    noneSelected: "Selecciona al menos una prueba. Las desmarcadas permanecen visibles.",
    testTitle: "Tus pruebas gratuitas recomendadas",
    testHelp: "Primero verás tres pruebas recomendadas y luego más opciones para tus temas. Marca las que quieras.",
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

// User-facing goal scales are three separate choices. They are NOT scored by
// the supplementary questionnaires shown later, and they are never inferred.
const goalScaleLabels: Record<Locale, Record<string, string>> = {
  en: { "goal::clarity": "Goal clarity", "goal::motivation": "Motivation", "goal::confidence": "Confidence" },
  ru: { "goal::clarity": "Ясность цели", "goal::motivation": "Мотивация", "goal::confidence": "Уверенность" },
  es: { "goal::clarity": "Claridad de la meta", "goal::motivation": "Motivación", "goal::confidence": "Confianza" },
};
// Stage 3 describes areas of exploration rather than exposing source-test names.
// Keys below are immutable *source dimension* IDs from the reviewed goal crosswalk;
// they are supplementary topics, not direct measurements of the chosen goal.
const goalTopicLabels: Record<Locale, Record<string, string>> = {
  en: {
    "weekly.clarity": "Clarity right now",
    "function.decision_fog.overall": "Clarity in decisions",
    "resources.values_direction.overall": "Values and direction",
    "resources.meaning_compass.overall": "Meaning and direction",
    "resources.motivation_spark.overall": "Everyday motivation",
    "resources.change_readiness.overall": "Readiness for change",
    "function.start_button.overall": "Starting important tasks",
    "function.goal_obstacles.overall": "Obstacles and next steps",
    "resources.confidence_pulse.overall": "General self-confidence",
    "resource.self_support": "Perceived self-support",
    "resources.inner_ally.overall": "Inner support",
  },
  ru: {
    "weekly.clarity": "Ясность в данный момент",
    "function.decision_fog.overall": "Ясность решений",
    "resources.values_direction.overall": "Ценности и направление",
    "resources.meaning_compass.overall": "Смысл и направление",
    "resources.motivation_spark.overall": "Повседневная мотивация",
    "resources.change_readiness.overall": "Готовность к переменам",
    "function.start_button.overall": "Начало важных дел",
    "function.goal_obstacles.overall": "Препятствия и следующие шаги",
    "resources.confidence_pulse.overall": "Уверенность в себе",
    "resource.self_support": "Ощущаемая поддержка себя",
    "resources.inner_ally.overall": "Внутренняя опора",
  },
  es: {
    "weekly.clarity": "Claridad en este momento",
    "function.decision_fog.overall": "Claridad al decidir",
    "resources.values_direction.overall": "Valores y dirección",
    "resources.meaning_compass.overall": "Sentido y dirección",
    "resources.motivation_spark.overall": "Motivación cotidiana",
    "resources.change_readiness.overall": "Disposición al cambio",
    "function.start_button.overall": "Empezar tareas importantes",
    "function.goal_obstacles.overall": "Obstáculos y próximos pasos",
    "resources.confidence_pulse.overall": "Confianza personal general",
    "resource.self_support": "Autoapoyo percibido",
    "resources.inner_ally.overall": "Apoyo interior",
  },
};
const topicLabel = (area: Area, scale: { key: string; label: string }, locale: Locale) =>
  area === "goal" ? goalTopicLabels[locale][scale.key] || scale.label : scale.label;

const researchLabel = (id: string, locale: Locale) =>
  goalScaleLabels[locale][id] || profileResearchAxisLabel(id, locale);

// The discovery facets reuse the same rights-cleared catalogue and kind registry
// as Test Explorer. No new clinical scales or questionnaires are generated.
const additionalCopy = {
  en: {
    notMeasured: "No eligible free questionnaire yet",
    additionalTitle: "Other tests for your topics", additionalHint: "Only your selected topics and scales. Expand to browse more; unchecking never hides a test.",
    scope: "Your selected topics and scales",
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
    additionalTitle: "Дополнительные тесты по вашим темам", additionalHint: "Только выбранные темы и шкалы. Раскройте список, чтобы увидеть больше; снятие галочки не скрывает тест.",
    scope: "Ваши выбранные темы и шкалы",
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
    additionalTitle: "Otras pruebas para tus temas", additionalHint: "Solo tus temas y escalas elegidos. Amplía la lista para ver más; desmarcar no oculta la prueba.",
    scope: "Temas y escalas elegidos",
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
  // The user explicitly clicked one of the public profile cards or the
  // profile creation CTA; avoid a second intro click. Never import guest
  // ratings or private data from a query string.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("start") !== "1") return;
    const focus = query.get("focus");
    const options: Focus[] = ["wellbeing", "relationships", "work", "identity", "goal"];
    if (focus && options.includes(focus as Focus)) setFocuses([focus as Focus]);
    setStarted(true);
  }, []);
  const [selectedResearchIds, setSelectedResearchIds] = useState<string[]>([]);
  const [selectedScaleIds, setSelectedScaleIds] = useState<string[]>([]);
  const [batteryMode, setBatteryMode] = useState<TestMode>("questionnaires");
  const [selectedByMode, setSelectedByMode] = useState<Record<TestMode, string[]>>({ questionnaires: [], pro: [] });
  const [batterySignature, setBatterySignature] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("relevant");
  const [search, setSearch] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const accountLocale = locale === "es" ? "en" : locale;
  const extra = additionalCopy[locale];

  // Step 2 selects real source-backed research facets separately. Step 3
  // narrows each facet to topic options without revealing questionnaires.
  const visibleAreas = profileAreasWithTests(tests, focuses) as Area[];
  const visibleScaleGroups = buildProfileScaleGroups(tests, visibleAreas, areaAxes) as ProfileScaleGroup[];
  const activeAreas = visibleAreas.filter(area =>
    selectedResearchIds.some(id => id.startsWith(area + "::")));
  const scaleGroups: ProfileScaleGroup[] = (buildProfileScaleGroups(tests, activeAreas, areaAxes) as ProfileScaleGroup[])
    .map(group => ({
      ...group,
      researchAxes: group.researchAxes.filter(axis => selectedResearchIds.includes(axis.id)),
      scales: group.scales.filter(scale => selectedResearchIds.includes(scale.researchAxisId)),
    }));
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
  // The visible catalogue is derived only from selected topics/scales, never
  // from checked test keys. Unchecking changes the plan, not the recommendation.
  const rankedCandidates: ReadonlyArray<NonNullable<ReturnType<typeof rankProfileAxisTests>[number]>> =
    rankProfileAxisTests(tests, scaleGroups, selectedScaleIds, batteryMode)
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
  const recommendedKeys = recommendProfileTopThreeTests(tests, scaleGroups,
    selectedScaleIds, batteryMode);
  const recommendedTests = rankedCandidates
    .filter(candidate => recommendedKeys.includes(candidate.key))
    .flatMap(candidate => tests.filter(test => test.key === candidate.key && test.testKind === modeKind)
      .map(test => ({ test, matchPercent: candidate.matchPercent })));
  const fiveMoreTests = rankedCandidates
    .filter(candidate => !recommendedKeys.includes(candidate.key))
    .slice(0, 5)
    .flatMap(candidate => tests.filter(test => test.key === candidate.key && test.testKind === modeKind)
      .map(test => ({ test, matchPercent: candidate.matchPercent })));
  const featuredTestKeys = new Set([...recommendedKeys, ...fiveMoreTests.map(item => item.test.key)]);
  // Every list shares the same chosen-facet eligibility and discovery relevance.
  // Only explicit expansion/filters change visible rows; checkbox state never does.
  const eligibleTestKeys = new Set(rankedCandidates.map(candidate => candidate.key));
  const fitByKey = new Map(rankedCandidates.map(candidate => [candidate.key, candidate.matchPercent]));
  const extraMatchPercent = (key: string) => fitByKey.get(key) ?? 0;
  const remainingTestKeys = new Set(rankedCandidates
    .filter(candidate => !featuredTestKeys.has(candidate.key)).map(candidate => candidate.key));
  const extraMatches = tests
    .filter(test => remainingTestKeys.has(test.key) && test.testKind === modeKind)
    .filter(test => timeFilter === "all" || (test.minutes !== null && test.minutes <= Number(timeFilter)))
    .filter(test => !search.trim() ||
      [test.title, ...scaleGroups.flatMap(group => group.scales
        .filter(scale => scale.testKey === test.key && selectedAxisRefs.includes(scale.researchAxisId))
        .flatMap(scale => [scale.label, profileResearchAxisLabel(scale.researchAxisId, locale)]))]
        .join(" ").toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)))
    .sort((a, b) => sortFilter === "shortest"
      ? (a.minutes ?? 99) - (b.minutes ?? 99) || a.title.localeCompare(b.title, locale)
      : sortFilter === "alphabetical"
        ? a.title.localeCompare(b.title, locale)
        : extraMatchPercent(b.key) - extraMatchPercent(a.key) || a.key.localeCompare(b.key));
  const displayTests = showMore ? extraMatches : [];

  function toggleFocus(focus: Focus) {
    setFocuses(previous => previous.includes(focus)
      ? previous.filter(item => item !== focus) : [...previous, focus]);
    // Other directions must not contribute stale topics, scales or plans.
    setSelectedResearchIds([]);
    setSelectedScaleIds([]);
    setSelectedByMode({ questionnaires: [], pro: [] });
    setBatterySignature("");
    setShowMore(false);
  }

  // Main scale groups are broad areas. Goal clarity, motivation and
  // confidence remain three independent controls.
  function toggleMainScale(area: Area) {
    const group = visibleScaleGroups.find(item => item.area === area);
    if (!group || area === "goal") return;
    const ids = group.researchAxes.map(axis => axis.id);
    if (!ids.length) return;
    const selected = ids.some(id => selectedResearchIds.includes(id));
    setSelectedResearchIds(previous => selected
      ? previous.filter(id => !ids.includes(id))
      : [...new Set([...previous, ...ids])]);
    setSelectedScaleIds([]);
    setSelectedByMode({ questionnaires: [], pro: [] });
    setBatterySignature("");
    setShowMore(false);
  }

  // Topic selection maps to the EXISTING versioned source scales. There
  // is no independent score, instrument, or invented comparison here.
  function toggleTopicAxis(axisId: string) {
    const ids = scaleGroups.flatMap(group => group.scales
      .filter(scale => scale.researchAxisId === axisId).map(scale => scale.id));
    if (!ids.length) return;
    const selected = ids.some(id => selectedScaleIds.includes(id));
    setSelectedScaleIds(previous => selected
      ? previous.filter(id => !ids.includes(id))
      : [...new Set([...previous, ...ids])]);
    setSelectedByMode({ questionnaires: [], pro: [] });
    setBatterySignature("");
    setShowMore(false);
  }

  function toggleResearchAxis(id: string) {
    if (!visibleScaleGroups.some(group => group.researchAxes.some(axis => axis.id === id))) return;
    setSelectedResearchIds(previous => previous.includes(id)
      ? previous.filter(item => item !== id) : [...previous, id]);
    // A changed construct invalidates only the downstream topic/test draft.
    setSelectedScaleIds([]);
    setSelectedByMode({ questionnaires: [], pro: [] });
    setBatterySignature("");
    setShowMore(false);
  }

  function toggleScale(id: string) {
    if (!scaleGroups.some(group => group.scales.some(scale => scale.id === id))) return;
    setSelectedScaleIds(previous => previous.includes(id)
      ? previous.filter(item => item !== id) : [...previous, id]);
    setBatterySignature("");
    setSelectedByMode({ questionnaires: [], pro: [] });
    setShowMore(false);
  }

  function toggleTest(key: string) {
    // Eligibility includes the current mode, cleared guest rights and chosen source facets.
    if (!eligibleTestKeys.has(key)) return;
    setSelectedByMode(previous => {
      const keys = previous[batteryMode];
      return { ...previous, [batteryMode]: keys.includes(key)
        ? keys.filter(item => item !== key)
        : keys.length < 12 ? [...keys, key] : keys };
    });
  }

  function goForward() {
    if (step === 0 && focuses.length) {
      setSelectedResearchIds([]);
      setSelectedScaleIds([]);
      setSelectedByMode({ questionnaires: [], pro: [] });
      setBatterySignature("");
      setShowMore(false);
      setStep(1);
    } else if (step === 1 && selectedResearchIds.length && scaleGroups.some(group => group.scales.length)) {
      // The next screen asks for topics; never preselect questionnaire variants.
      setStep(2);
    } else if (step === 2 && selectedScaleIds.length && selectedAxes.length) {
      const signature = [...selectedScaleIds].sort().join("|");
      if (batterySignature !== signature) {
        // A selected *source scale* resolves to a particular research construct.
        // Big Five extraversion cannot be substituted with an unrelated trait.
        // The selector returns immutable suggestions; React keeps editable
        // per-mode selections as its own mutable arrays.
        const questionnaires = [...recommendProfileTopThreeTests(tests, scaleGroups,
          selectedScaleIds, "questionnaires")];
        const pro = [...recommendProfileTopThreeTests(tests, scaleGroups,
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

      {step === 1 && <section aria-labelledby="profile-builder-step-title" data-profile-scale-selection-step>
        <h2 id="profile-builder-step-title">{t.topicTitle}</h2>
        <p className={styles.help}>{t.topicHelp}</p>
        <p className={styles.focusContext} data-profile-selected-focus>
          <strong>{t.focusContext}:</strong> {focuses.map(focus => t.focuses[focus][0]).join(" · ")}
        </p>
        <div className={styles.researchGroupList} data-profile-research-scale-options data-profile-main-scales>
          {visibleScaleGroups.flatMap(group => group.area === "goal"
            ? group.researchAxes.map(axis => <button key={axis.id} type="button"
                className={styles.researchChoice} data-profile-research-choice={axis.id}
                data-profile-main-scale={axis.id} aria-pressed={selectedResearchIds.includes(axis.id)}
                onClick={() => toggleResearchAxis(axis.id)}>
                <span className={styles.selectDot} aria-hidden="true">
                  {selectedResearchIds.includes(axis.id) && <Check size={15} />}
                </span>
                <strong>{researchLabel(axis.id, locale)}</strong>
              </button>)
            : [<button key={group.area} type="button" className={styles.researchChoice}
                data-profile-scale-area={group.area} data-profile-main-scale={group.area}
                aria-pressed={group.researchAxes.some(axis => selectedResearchIds.includes(axis.id))}
                onClick={() => toggleMainScale(group.area)}>
                <span className={styles.selectDot} aria-hidden="true">
                  {group.researchAxes.some(axis => selectedResearchIds.includes(axis.id)) && <Check size={15} />}
                </span>
                <span className={styles.mainScaleBody}>
                  <strong>{t.areas[group.area][0]}</strong>
                  <small>{t.areas[group.area][1]}</small>
                </span>
              </button>])}
        </div>
        <p className={styles.researchSelectedCount} role="status">
          {visibleScaleGroups.filter(group => group.area !== "goal" &&
            group.researchAxes.some(axis => selectedResearchIds.includes(axis.id))).length +
            selectedResearchIds.filter(id => id.startsWith("goal::")).length} {t.selected}
        </p>
        {focuses.includes("goal") && <p className={styles.scaleSourceNote}>{t.goalScaleNote}</p>}
      </section>}

      {step === 2 && <section aria-labelledby="profile-builder-step-title" data-profile-scales-step data-profile-topics-step>
        <h2 id="profile-builder-step-title">{t.scaleTitle}</h2>
        <p className={styles.help}>{t.scaleHelp}</p>
        <div className={styles.scaleOverview} role="status">
          <strong>{selectedAxisRefs.length} {t.scaleSelected}</strong>
          <span>{activeAreas.map(area => t.areas[area][0]).join(" · ")}</span>
        </div>
        <div className={styles.topicAccordions} data-profile-scales-by-topic>
          {scaleGroups.map(group => <div key={group.area} className={styles.researchArea}
              data-profile-scale-topic={group.area}>
            <h3>{t.areas[group.area][0]}</h3>
            <div className={styles.researchChoices} role="group" aria-label={t.areas[group.area][0]}>
              {group.area === "goal"
                ? group.scales.map(scale => <label key={scale.id}
                    className={styles.topicScaleRow} data-profile-topic-choice={scale.id}>
                    <input type="checkbox" checked={selectedScaleIds.includes(scale.id)}
                      onChange={() => toggleScale(scale.id)} />
                    <span className={styles.topicScaleText}>
                      <strong>{topicLabel(group.area, scale, locale)}</strong>
                    </span>
                  </label>)
                : group.researchAxes.map(axis => <label key={axis.id}
                    className={styles.topicScaleRow} data-profile-topic-choice={axis.id}
                    data-profile-research-axis={axis.id}>
                    <input type="checkbox" checked={group.scales.some(scale =>
                      scale.researchAxisId === axis.id && selectedScaleIds.includes(scale.id))}
                      onChange={() => toggleTopicAxis(axis.id)} />
                    <span className={styles.topicScaleText}>
                      <strong>{researchLabel(axis.id, locale)}</strong>
                    </span>
                  </label>)}
            </div>
          </div>)}
        </div>
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
              <small>{modeTotals[mode].count} {t.selectedTests} · ~{modeTotals[mode].minutes} {t.minutes}
                {modeTotals[mode].questions ? " · " + modeTotals[mode].questions + " " + t.questions : ""}</small>
            </button>)}
          </div>
          <p>{t.modeMeaning}</p>
        </fieldset>
        <div className={styles.testCount}><ClipboardList size={17} aria-hidden="true" />
          <strong>{chosenTests.length} {t.testCount}</strong>
          {minutes > 0 && <span>· {minutes} {t.minutes}</span>}
          <span>· {coverage.size}/{selectedAxisRefs.length} {t.coveredScales}</span>
        </div>
        {recommendedTests.length > 0 ? <div data-profile-recommended-tests>
          <h3 className={styles.testSectionHeading}>{t.mainThree}</h3>
          <div className={styles.testList}>
            {recommendedTests.map(({ test, matchPercent }) =>
              <label key={test.key} className={styles.testRow} data-profile-recommendation={test.key}>
                <input type="checkbox" checked={selectedKeys.includes(test.key)}
                  disabled={!selectedKeys.includes(test.key) && selectedKeys.length >= 12}
                  onChange={() => toggleTest(test.key)} />
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
                <span className={styles.fitPill} title={t.fitInfo}>
                  <strong>{matchPercent}%</strong><small>{t.fit}</small>
                </span>
              </label>)}
          </div>
        </div> : <p className={styles.caution} role="status">{t.modeNoTests}</p>}
        {fiveMoreTests.length > 0 && <div className={styles.fiveMore} data-profile-five-more-tests>
          <h3 className={styles.testSectionHeading}>{t.nextFive}</h3>
          <div className={styles.testList}>
            {fiveMoreTests.map(({ test, matchPercent }) =>
              <label key={test.key} className={styles.testRow} data-profile-additional-suggestion={test.key}>
                <input type="checkbox" checked={selectedKeys.includes(test.key)}
                  disabled={!selectedKeys.includes(test.key) && selectedKeys.length >= 12}
                  onChange={() => toggleTest(test.key)} />
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
                <span className={styles.fitPill} title={t.fitInfo}>
                  <strong>{matchPercent}%</strong><small>{t.fit}</small>
                </span>
              </label>)}
          </div>
        </div>}
        {(recommendedTests.length > 0 || fiveMoreTests.length > 0) && <p className={styles.fitNote}>{t.fitInfo}</p>}
        {coverage.size < selectedAxisRefs.length && chosenTests.length > 0 &&
          <p className={styles.caution}>{t.unmeasured}</p>}
        {selectedKeys.length === 0 && recommendedTests.length > 0 &&
          <p className={styles.caution} role="status">{t.noneSelected}</p>}
        <div className={styles.startRow}>
          {selectedKeys.length > 0
            ? <Link href={testHref} prefetch={false} className={styles.primary} data-profile-start-tests>
                {t.start}<ArrowRight size={17} aria-hidden="true" />
              </Link>
            : <button type="button" disabled className={styles.primary}>{t.start}</button>}
        </div>

        {remainingTestKeys.size > 0 && <section className={styles.extraPanel}
          aria-label={extra.additionalTitle} data-profile-additional-tests>
          <button type="button" className={styles.moreTests}
            onClick={() => setShowMore(previous => !previous)} aria-expanded={showMore}
            aria-controls="profile-builder-extra-results" data-profile-extra-toggle>
            {showMore ? extra.less : extra.more}<ChevronDown size={16} aria-hidden="true" />
          </button>
          <div id="profile-builder-extra-results" hidden={!showMore} data-profile-extra-results>
            <div className={styles.extraHeading}>
              <div><h3 id="profile-builder-extra-title">{extra.additionalTitle}</h3>
                <p>{extra.additionalHint}</p></div>
            </div>
            <div className={styles.extraScope} data-profile-extra-selected-scope>
              <strong>{extra.scope}</strong>
              <p>{activeAreas.map(area => t.areas[area][0]).join(" · ")}</p>
              <small>{selectedAxisRefs.map(ref => researchLabel(ref, locale)).join(" · ")}</small>
            </div>
          <div className={styles.extraFilters}>
            <label className={styles.extraSearch}><span>{extra.search}</span>
              <input type="search" value={search} placeholder={extra.searchPlaceholder}
                onChange={event => setSearch(event.currentTarget.value)} />
            </label>
            <label><span>{extra.time}</span>
              <select value={timeFilter} onChange={event => setTimeFilter(event.currentTarget.value)}>
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
          <p className={styles.extraResultCount} role="status">{extraMatches.length + " " + extra.results}</p>
          {displayTests.length ? <div className={styles.testList}>
            {displayTests.map(test => <label key={test.key} className={styles.testRow}>
              <input type="checkbox" checked={selectedKeys.includes(test.key)}
                disabled={!selectedKeys.includes(test.key) && selectedKeys.length >= 12}
                onChange={() => toggleTest(test.key)} aria-label={test.title} />
              <span className={styles.testText}><strong>{test.title}</strong>
                <small>{test.questions ? test.questions + " " + t.questions : ""}
                  {test.questions && test.minutes ? " · " : ""}
                  {test.minutes ? test.minutes + " " + t.minutes : ""}</small>
                <span>{[...new Set(scaleGroups.flatMap(group => group.scales
                  .filter(scale => scale.testKey === test.key &&
                    selectedAxisRefs.includes(scale.researchAxisId))
                  .map(scale => profileResearchAxisLabel(scale.researchAxisId, locale))))].join(" · ")}</span>
              </span>
              <span className={styles.fitPill} title={t.fitInfo}>
                <strong>{extraMatchPercent(test.key)}%</strong><small>{t.fit}</small>
              </span>
            </label>)}
          </div> : <p className={styles.extraEmpty}>{extra.nothing}</p>}
          {selectedKeys.length >= 12 && <p className={styles.caution}>{extra.limit}</p>}
          </div>
        </section>}
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
            ? <button type="button" className={styles.primary} disabled={selectedResearchIds.length === 0}
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
