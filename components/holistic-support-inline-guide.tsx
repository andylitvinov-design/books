"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Clock3, HandHeart, Play, Sparkles, X } from "lucide-react";
import { goalSectorFocus, summarizeGoalSelection, type GoalSelection, type GoalSector } from "@/components/holistic-support-goal-filter";
import { interpretSupportUtterance, parseSupportMinutes, chooseSupportFormat } from "@/lib/holistic-support/guide-dialogue.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-inline-guide.module.css";

type Focus = "energy" | "money" | "relationships" | "goals";
type CheckinArea = Exclude<Focus, "goals"> | "meaning";
type Phase = "review" | "topic" | "need" | "detail" | "time" | "format" | "confirm" | "recommendations" | "safety";
type Format = "meditation" | "tests" | "courses" | "consultation" | "healing" | "mandala";
type Message = { role: "guide" | "user"; text: string };
type Video = { id: string; title: string; topics: string[] };
type Choice = "meditation" | "tests" | "pump" | "consultation" | "healing";

const sectors: GoalSector[] = ["energy", "money", "love", "meaning"];
const testJourney: Record<Focus, string> = {
  energy: "energy", money: "business", relationships: "relationships", goals: "effectiveness",
};
const videoThemes: Record<GoalSector, string[]> = {
  energy: ["energy", "health"], money: ["business"], love: ["love"], meaning: [],
};
const formats: { id: Format; filter: string; choice?: Choice }[] = [
  { id: "meditation", filter: "meditation", choice: "meditation" },
  { id: "tests", filter: "tests", choice: "tests" },
  { id: "courses", filter: "courses", choice: "pump" },
  { id: "consultation", filter: "consultation", choice: "consultation" },
  { id: "healing", filter: "healing", choice: "healing" },
  { id: "mandala", filter: "mandala" },
];

const copy = {
  en: {
    title: "Your personal guide", close: "Close guide", step: "Step",
    areas: { energy: "Energy & body", money: "Money & work", love: "Relationships", goals: "Goals", meaning: "Meaning" },
    ratings: { energy: "Energy", money: "Money", relationships: "Relationships", goals: "Goals", meaning: "Meaning" },
    editedIntro: "You changed your self-rating for",
    noData: "You have not changed your ratings or filled in the goal filter yet. Which area matters most today?",
    filterIntro: "From your goal filter, your chosen focus is",
    ratingsIntro: "Your lowest self-rating is",
    tiedIntro: "Several areas share your lowest score:",
    suggestion: "This could be a helpful place to start. Does it feel right?",
    notDiagnosis: "This is a reflection of your own answers, not a diagnosis.",
    agree: "Yes, let's start", clarify: "Refine goal", different: "Different topic",
    topicQuestion: "Which topic would you rather explore?",
    needQuestion: "What would help most in this area today?",
    needs: {
      energy: ["More energy", "Less tension", "Better rest"],
      money: ["Clear decisions", "Confidence", "Next step"],
      love: ["More connection", "Better communication", "Boundaries"],
      goals: ["Focus", "Motivation", "A simple plan"],
      meaning: ["Find direction", "Explore values", "Make a choice"],
    },
    otherNeed: "Describe it in your words", otherPlaceholder: "One short sentence",
    timeQuestion: "How much time do you have right now?", later: "Plan for later",
    formatQuestion: "How would you like to begin?",
    formatLabels: {
      meditation: "Video", tests: "Test", courses: "Course",
      consultation: "Session", healing: "Reiki support", mandala: "Video mandala",
    },
    select: "Choose", send: "Send", resultQuestion: "Here's a first step based on your choices.",
    planTitle: "Your three-step plan", planToday: "Now", planThen: "Afterwards", planContinue: "Next",
    planCheck: "Notice what helped, and rate your focus again if you wish.",
    planContinueText: "Choose the next existing lesson, test or practitioner on your terms.",
    resultTitle: "Your first step", resultWhy: "Why this suggestion?", changeFormat: "Change format",
    changeTopic: "Change topic", next: "Afterwards: check how it went and choose your next step.",
    videoUnavailable: "No published video matches this topic exactly. Open the existing gallery or choose another format.",
    videoBrowse: "See available videos", videoAction: "Open selected video",
    testsTitle: "Available self-checks", testsAction: "Open tests",
    courseTitle: "Existing courses and lessons", courseAction: "Explore courses",
    sessionTitle: "Session with a practitioner", sessionAction: "See sessions",
    healingTitle: "Reiki support by a practitioner", healingAction: "See support options",
    mandalaTitle: "Personal video mandala", mandalaAction: "Open video studio",
    noFormats: "No formats are enabled in your goal filter. Change the filter to continue.",
    sourceReason: "Priority: your stated goal or ratings. Focus: your confirmed choice. Format: your preference.",
    timeReason: "Your available time is a preference, not a verified media duration.",
    private: "Answers stay in this browser; no external AI request, lead, booking or payment is created.",
    ux: {
      ready: "Your route is ready", focus: "Your focus", primary: "RECOMMENDED FIRST STEP",
      duration: "Time you have", durationWarning: "This is your preference, not the duration of a recording or practitioner session.",
      local: "Based on your answers",
      supportFit: "You chose practitioner support, not a course about work or money. The business course and free self-check below are more topic-specific.",
      benefit: {
        meditation: "Try an available recording. Check its actual duration before starting.",
        tests: "A free self-check to explore your current priorities.",
        courses: "Explore the existing learning path and decide if it fits.",
        consultation: "Review personal session options. An enquiry is not a booking.",
        healing: "Explore practitioner Reiki support. Timing and terms must be confirmed separately.",
        mandala: "Explore the personal visual-practice studio.",
      },
      firstAction: {
        meditation: "Open a published recording or browse available videos.",
        tests: "Open the available free self-checks.",
        courses: "Review the existing course and lessons.",
        consultation: "Review sessions and send an enquiry only if you choose.",
        healing: "Review practitioner options and terms before requesting support.",
        mandala: "Explore the video-mandala studio.",
      },
    },

  },
  ru: {
    title: "Ваш проводник", close: "Закрыть проводника", step: "Шаг",
    areas: { energy: "Энергия и тело", money: "Деньги и работа", love: "Отношения", goals: "Цели", meaning: "Смыслы" },
    ratings: { energy: "Энергия", money: "Деньги", relationships: "Отношения", goals: "Цели", meaning: "Смыслы" },
    editedIntro: "Вы изменили показатель",
    noData: "Вы пока не изменяли оценки и не заполняли фильтр целей. Какая тема вам сейчас важнее?",
    filterIntro: "По заполненному фильтру целей вы выделили тему",
    ratingsIntro: "Среди ваших самооценок самый низкий показатель —",
    tiedIntro: "Несколько направлений получили одинаково низкую оценку:",
    suggestion: "Возможно, с этого полезно начать. Вы согласны?",
    notDiagnosis: "Это отражение ваших ответов, а не диагноз.",
    agree: "Да, согласен", clarify: "Уточнить цель", different: "Другая тема",
    topicQuestion: "С какой темой вам хотелось бы поработать?",
    needQuestion: "Что в этой теме важнее всего сегодня?",
    needs: {
      energy: ["Больше энергии", "Меньше напряжения", "Лучше отдыхать"],
      money: ["Ясность решений", "Уверенность", "Следующий шаг"],
      love: ["Больше близости", "Общение", "Личные границы"],
      goals: ["Концентрация", "Мотивация", "Понятный план"],
      meaning: ["Найти направление", "Прояснить ценности", "Принять решение"],
    },
    otherNeed: "Уточнить своими словами", otherPlaceholder: "Коротко опишите свой запрос",
    timeQuestion: "Сколько у вас времени сейчас?", later: "Позже",
    formatQuestion: "Как вам удобнее начать?",
    formatLabels: {
      meditation: "Видео", tests: "Тест", courses: "Курс",
      consultation: "Сессия", healing: "Рейки-поддержка", mandala: "Видео-мандала",
    },
    select: "Выбрать", send: "Отправить", resultQuestion: "Вот первый шаг с учётом ваших ответов.",
    planTitle: "Ваша программа на 3 шага", planToday: "Сейчас", planThen: "После", planContinue: "Дальше",
    planCheck: "Отметьте, что подошло, и при желании ещё раз оцените свой фокус.",
    planContinueText: "Выберите следующий урок, тест или поддержку мастера по своему решению.",
    resultTitle: "Ваш первый шаг", resultWhy: "Почему рекомендовано?", changeFormat: "Другой формат",
    changeTopic: "Другая тема", next: "После выполнения можно оценить результат и выбрать следующий шаг.",
    videoUnavailable: "По теме нет точно подходящего опубликованного видео. Посмотрите каталог или выберите другой формат.",
    videoBrowse: "Доступные видео", videoAction: "Открыть видео",
    testsTitle: "Доступные тесты", testsAction: "Открыть тесты",
    courseTitle: "Существующие курсы и уроки", courseAction: "Посмотреть курсы",
    sessionTitle: "Сессия с мастером", sessionAction: "Посмотреть сессии",
    healingTitle: "Рейки-поддержка с мастером", healingAction: "Подобрать поддержку",
    mandalaTitle: "Персональная видео-мандала", mandalaAction: "Открыть видеостудию",
    noFormats: "В фильтре целей отключены все форматы. Измените фильтр, чтобы продолжить.",
    sourceReason: "Основа: ваши оценки или заполненный фильтр. Тема: ваш подтверждённый выбор. Формат: ваше предпочтение.",
    timeReason: "Указанное время — пожелание, а не проверенная длительность видеозаписи.",
    private: "Ответы остаются в браузере. Внешний ИИ, CRM, запись и оплата не запускаются.",
    ux: {
      ready: "Маршрут подобран", focus: "Ваш запрос", primary: "РЕКОМЕНДУЕМЫЙ ПЕРВЫЙ ШАГ",
      duration: "У вас есть", durationWarning: "Это ваше пожелание, а не длительность записи или сессии мастера.",
      local: "На основе ваших ответов",
      supportFit: "Вы выбрали поддержку мастера, а не курс про работу и деньги. Ниже есть более тематические варианты: бизнес-программа и бесплатный тест.",
      benefit: {
        meditation: "Попробуйте опубликованную практику. Длительность записи уточняется при открытии.",
        tests: "Бесплатная самопроверка поможет прояснить текущие приоритеты.",
        courses: "Посмотрите существующую программу и решите, подходит ли она вам.",
        consultation: "Посмотрите варианты личной встречи. Заявка не означает запись.",
        healing: "Узнайте о Рейки-поддержке мастера. Время и условия согласуются отдельно.",
        mandala: "Исследуйте студию персональных визуальных практик.",
      },
      firstAction: {
        meditation: "Откройте опубликованное видео или каталог.",
        tests: "Откройте доступный бесплатный тест.",
        courses: "Познакомьтесь с существующим курсом и уроками.",
        consultation: "Посмотрите сессии и при желании отправьте заявку.",
        healing: "Посмотрите варианты и условия поддержки до заявки.",
        mandala: "Откройте студию видео-мандал.",
      },
    },

  },
  es: {
    title: "Tu guía personal", close: "Cerrar guía", step: "Paso",
    areas: { energy: "Energía y cuerpo", money: "Dinero y trabajo", love: "Relaciones", goals: "Objetivos", meaning: "Sentido" },
    ratings: { energy: "Energía", money: "Dinero", relationships: "Relaciones", goals: "Objetivos", meaning: "Sentido" },
    editedIntro: "Has cambiado tu puntuación de",
    noData: "Aún no has cambiado las puntuaciones ni completado el filtro de objetivos. ¿Qué tema es más importante hoy?",
    filterIntro: "Según tu filtro de objetivos, el tema elegido es",
    ratingsIntro: "Tu puntuación personal más baja es",
    tiedIntro: "Varias áreas comparten la puntuación más baja:",
    suggestion: "Puede ser un buen punto de partida. ¿Estás de acuerdo?",
    notDiagnosis: "Esto refleja tus respuestas, no es un diagnóstico.",
    agree: "Sí, de acuerdo", clarify: "Precisar objetivo", different: "Otro tema",
    topicQuestion: "¿Qué tema prefieres explorar?",
    needQuestion: "¿Qué te ayudaría más en esta área hoy?",
    needs: {
      energy: ["Más energía", "Menos tensión", "Descansar mejor"],
      money: ["Decisiones claras", "Confianza", "Siguiente paso"],
      love: ["Más cercanía", "Comunicación", "Límites"],
      goals: ["Concentración", "Motivación", "Un plan simple"],
      meaning: ["Encontrar rumbo", "Aclarar valores", "Tomar una decisión"],
    },
    otherNeed: "Explicar con mis palabras", otherPlaceholder: "Una frase breve",
    timeQuestion: "¿Cuánto tiempo tienes ahora?", later: "Más tarde",
    formatQuestion: "¿Cómo prefieres empezar?",
    formatLabels: {
      meditation: "Vídeo", tests: "Test", courses: "Curso",
      consultation: "Sesión", healing: "Apoyo Reiki", mandala: "Vídeo mandala",
    },
    select: "Elegir", send: "Enviar", resultQuestion: "Este es un primer paso según tus respuestas.",
    planTitle: "Tu plan en tres pasos", planToday: "Ahora", planThen: "Después", planContinue: "Siguiente",
    planCheck: "Observa qué te ayudó y, si quieres, vuelve a valorar tu enfoque.",
    planContinueText: "Elige la siguiente lección, test o apoyo profesional de forma voluntaria.",
    resultTitle: "Tu primer paso", resultWhy: "¿Por qué esta sugerencia?", changeFormat: "Otro formato",
    changeTopic: "Otro tema", next: "Después puedes valorar cómo fue y elegir el siguiente paso.",
    videoUnavailable: "No hay un vídeo publicado que coincida exactamente. Explora el catálogo o cambia de formato.",
    videoBrowse: "Vídeos disponibles", videoAction: "Abrir vídeo",
    testsTitle: "Tests disponibles", testsAction: "Abrir tests",
    courseTitle: "Cursos y lecciones actuales", courseAction: "Ver cursos",
    sessionTitle: "Sesión con un profesional", sessionAction: "Ver sesiones",
    healingTitle: "Apoyo Reiki con un profesional", healingAction: "Ver apoyos",
    mandalaTitle: "Vídeo mandala personal", mandalaAction: "Abrir estudio",
    noFormats: "No hay formatos activos en el filtro. Cambia el filtro para continuar.",
    sourceReason: "Base: tus valoraciones o filtro de objetivos. Tema: tu elección. Formato: tu preferencia.",
    timeReason: "El tiempo es tu preferencia, no la duración verificada del vídeo.",
    private: "Las respuestas se quedan en el navegador. No se envían a IA externa, CRM ni pagos.",
    ux: {
      ready: "Tu ruta está lista", focus: "Tu objetivo", primary: "PRIMER PASO RECOMENDADO",
      duration: "Tiempo disponible", durationWarning: "Es tu preferencia, no la duración de una grabación o sesión.",
      local: "Según tus respuestas",
      supportFit: "Elegiste apoyo profesional, no un curso de trabajo o dinero. El programa de negocios y el test gratuito de abajo se centran más en tu tema.",
      benefit: {
        meditation: "Prueba una grabación publicada. Comprueba su duración al abrirla.",
        tests: "Una autoevaluación gratuita para explorar tus prioridades.",
        courses: "Descubre el programa existente y decide si encaja contigo.",
        consultation: "Consulta las sesiones personales. Una solicitud no es una reserva.",
        healing: "Conoce el apoyo Reiki profesional. Los tiempos y condiciones se confirman aparte.",
        mandala: "Explora el estudio de prácticas visuales personales.",
      },
      firstAction: {
        meditation: "Abre una grabación publicada o explora el catálogo.",
        tests: "Abre una autoevaluación gratuita disponible.",
        courses: "Revisa el curso y las lecciones existentes.",
        consultation: "Revisa las sesiones y solicita información solo si quieres.",
        healing: "Revisa las opciones y condiciones antes de solicitar apoyo.",
        mandala: "Explora el estudio de vídeo mandala.",
      },
    },

  },
} as const;

function opening(locale: PublicLocale, scores: Record<CheckinArea, number>, editedCheckins: CheckinArea[], goal: GoalSelection | null) {
  const t = copy[locale];
  if (goal) {
    const details = summarizeGoalSelection(locale, goal).trim().slice(0, 110);
    return {
      topic: goal.sector as GoalSector, phase: "review" as Phase,
      message: t.filterIntro + " «" + t.areas[goal.sector] + "»." +
        (details ? " " + details + (details.length === 110 ? "…" : "") : "") +
        " " + t.suggestion + " " + t.notDiagnosis,
    };
  }
  if (editedCheckins.length) {
    const minimum = Math.min(...editedCheckins.map(id => scores[id]));
    const low = editedCheckins.filter(id => scores[id] === minimum);
    const subject = low.map(id => t.ratings[id] + " " + scores[id] + "/10").join(" · ");
    if (low.length !== 1) return {
      topic: "energy" as GoalSector, phase: "topic" as Phase,
      message: t.tiedIntro + " " + subject + ". " + t.topicQuestion + " " + t.notDiagnosis,
    };
    const sector: GoalSector = low[0] === "relationships" ? "love" : low[0];
    return { topic: sector, phase: "review" as Phase,
      message: (editedCheckins.length === 1 ? t.editedIntro : t.ratingsIntro) + " " + subject + ". " + t.suggestion + " " + t.notDiagnosis };
  }
  return { topic: "energy" as GoalSector, phase: "topic" as Phase, message: t.noData };
}

const conversation = {
  en: {
    topicAck: "All right, let's focus on",
    needAck: "You want to work on",
    detailAsk: "To make the next step more relevant, what is the main obstacle?",
    detailOptions: {
      energy: ["Low energy in the morning", "Tired during the day", "Hard to unwind"],
      money: ["Unclear next step", "Fear of making a mistake", "Not enough time"],
      love: ["Hard to talk about it", "Not enough connection", "Unclear expectations"],
      goals: ["Too many priorities", "I keep postponing", "I need a simple start"],
      meaning: ["Unsure of direction", "My priorities changed", "I'd like to explore"],
    },
    skip: "Not sure yet", detailAck: "Thanks, I'll keep that in mind:",
    timeAck: "We can make the first step manageable.",
    formatAck: "You chose", auto: "Suggest a format for me",
    autoAck: "Based on your time and the topic, I'd start with",
    confirm: "So our focus is", confirmNeed: "You'd like to work on",
    confirmTime: "Time available:", confirmFormat: "Your preferred format:",
    confirmAsk: "Does this sound right? I can now show existing options that match.",
    show: "Show my recommendations", rethink: "Adjust the format",
    showAck: "Here are the existing options we discussed. You choose what to open.",
    userShow: "Show recommendations", results: "Recommended for your first step",
    resultNote: "These are real available pages and published recordings, not a diagnosis or guaranteed result.",
    alternative: "Other available ways to begin", returnToChat: "Continue the conversation",
    askAnything: "Ask a question or reply in your own words…",
    inputLabel: "Your message to the guide", textSend: "Send",
    hint: "You can ask a question at any step. The conversation stays here.",
    unknownTopic: "I want to understand you correctly. Which area feels closest to your question?",
    unknownTime: "How many minutes would work? Choose below or type a number.",
    unknownFormat: "I can recommend only formats available in your filter. Please choose one below.",
    notSure: "That's okay; we can begin without naming every detail.",
    whyAnswer: "I started from your saved goal filter if you filled it in, otherwise from the ratings you actively changed. This is a suggestion you can change, not an assessment of your health.",
    priceAnswer: "You can start with free tests or published videos. Andrey's personal sessions are €50 / 30 min or €100 / 60 min. Other practitioners confirm their own terms; a request is not a booking.",
    compareAnswer: "A test helps you reflect on your self-ratings. A video is a short guided practice. You can choose either, and change it later.",
    identityAnswer: "I'm a virtual guide. For now, this conversation uses local matching of your answers and the site's published catalogue — not an external generative AI or a human practitioner.",
    processAnswer: "First we agree on your topic, then narrow down what matters and how much time you have. Only after your confirmation will I show the recommendations.",
    fallbackAnswer: "I can't reliably answer that question here. I can clarify your goal, compare formats, or help you open a real resource. Which would you prefer?",
    safetyAnswer: "I'm not able to help with an immediate crisis here. If you may be in danger, contact your local emergency services or a trusted person nearby. You can stop this conversation.",
    safeStop: "End conversation", concernChanged: "We can change the topic whenever you like.",
    timeLater: "Later", preview: "Private conversation", whyLabel: "Why this recommendation?",
    open: "Open", availableVideo: "Available videos", missingVideo: "There isn't a verified recording specifically for this topic yet.",
    courseAction: "Browse existing courses", sessionAction: "See practitioner sessions",
    supportAction: "See Reiki support", testAction: "Take a free test", mandalaAction: "Open the video studio",
    nextStep: "Then you can reflect on the experience and choose the next step.",
    emptyFormat: "No formats are enabled. You can update the goal filter to continue.",
  },
  ru: {
    topicAck: "Хорошо, сосредоточимся на теме",
    needAck: "Вы хотите уделить внимание",
    detailAsk: "Уточню один момент, чтобы выбрать более подходящий первый шаг. Что сейчас мешает больше всего?",
    detailOptions: {
      energy: ["Сил мало уже утром", "Устаю днём", "Трудно расслабиться"],
      money: ["Неясен следующий шаг", "Боюсь ошибиться", "Не хватает времени"],
      love: ["Сложно поговорить", "Мало близости", "Неясные ожидания"],
      goals: ["Слишком много задач", "Часто откладываю", "Трудно начать"],
      meaning: ["Неясно направление", "Изменились приоритеты", "Хочу исследовать"],
    },
    skip: "Пока не знаю", detailAck: "Спасибо, учту:",
    timeAck: "Начнём с посильного шага.",
    formatAck: "Вы выбрали",
    auto: "Предложи формат сам",
    autoAck: "С учётом вашего времени и запроса я предложила бы начать с",
    confirm: "Итак, наш фокус —", confirmNeed: "Вы хотите поработать над",
    confirmTime: "Времени сейчас:", confirmFormat: "Подходящий формат:",
    confirmAsk: "Всё верно? Тогда покажу реальные варианты, из которых можно выбрать.",
    show: "Показать рекомендации", rethink: "Изменить формат",
    showAck: "Вот доступные варианты по нашему разговору. Вы сами выбираете, что открыть.",
    userShow: "Показать рекомендации", results: "Подходящие рекомендации",
    resultNote: "Это реальные материалы и страницы, а не диагноз или гарантия результата.",
    alternative: "Другие способы начать", returnToChat: "Вернуться к диалогу",
    askAnything: "Напишите ответ или задайте вопрос…",
    inputLabel: "Ваше сообщение проводнику", textSend: "Отправить",
    hint: "На любом шаге можно спросить или ответить своими словами. Переписка остаётся здесь.",
    unknownTopic: "Хочу правильно понять ваш запрос. Какое направление к нему ближе?",
    unknownTime: "Сколько минут вам подходит? Выберите ниже или напишите число.",
    unknownFormat: "Могу предложить только форматы, включённые в фильтре. Выберите один из них.",
    notSure: "Это нормально — можно начать без всех подробностей.",
    whyAnswer: "Я опираюсь сначала на заполненный фильтр целей, а если его нет — на те шкалы, которые вы сами изменили. Это гипотеза, её всегда можно исправить, а не оценка здоровья.",
    priceAnswer: "Начать можно с бесплатного теста или опубликованного видео. Личные сессии Андрея: €50 / 30 мин или €100 / 60 мин. У других мастеров свои условия; заявка ещё не запись.",
    compareAnswer: "Тест помогает разобраться в своих оценках, видео — попробовать практику. Можно выбрать любой формат и позднее поменять.",
    identityAnswer: "Я виртуальный проводник. Сейчас ответы подбираются локально по вашим словам и опубликованному каталогу, без подключения внешнего генеративного ИИ или живого специалиста.",
    processAnswer: "Сначала согласуем тему, затем уточним задачу, время и формат. Только после вашего подтверждения покажу рекомендации.",
    fallbackAnswer: "На этот вопрос я пока не могу надёжно ответить. Зато могу уточнить цель, сравнить форматы или открыть подходящий материал. Что выберем?",
    safetyAnswer: "Я не могу помочь с неотложной кризисной ситуацией через этот подбор. Если вам угрожает опасность, обратитесь в местную экстренную службу или к человеку рядом, которому доверяете.",
    safeStop: "Завершить диалог", concernChanged: "Тему можно поменять в любой момент.",
    timeLater: "Позже", preview: "Личный разговор", whyLabel: "Почему именно это?",
    open: "Открыть", availableVideo: "Доступные видео", missingVideo: "Пока нет проверенной записи точно по этой теме.",
    courseAction: "Открыть существующие курсы", sessionAction: "Посмотреть сессии",
    supportAction: "Посмотреть Рейки-поддержку", testAction: "Пройти бесплатный тест", mandalaAction: "Открыть видеостудию",
    nextStep: "После можно оценить опыт и выбрать следующий шаг.",
    emptyFormat: "В фильтре нет разрешённых форматов. Измените его, чтобы продолжить.",
  },
  es: {
    topicAck: "De acuerdo, nos centraremos en",
    needAck: "Quieres trabajar en",
    detailAsk: "Para escoger un buen primer paso, ¿cuál es el principal obstáculo ahora?",
    detailOptions: {
      energy: ["Poca energía por la mañana", "Cansancio por la tarde", "Cuesta descansar"],
      money: ["No sé por dónde empezar", "Temo equivocarme", "Falta de tiempo"],
      love: ["Cuesta hablarlo", "Falta de cercanía", "Expectativas confusas"],
      goals: ["Demasiadas prioridades", "Lo aplazo", "Me cuesta empezar"],
      meaning: ["Rumbo poco claro", "Cambian mis prioridades", "Quiero explorar"],
    },
    skip: "Aún no lo sé", detailAck: "Gracias, lo tendré en cuenta:",
    timeAck: "Empecemos con algo manejable.",
    formatAck: "Has elegido",
    auto: "Sugiere tú un formato",
    autoAck: "Según tu tiempo y objetivo, sugeriría empezar con",
    confirm: "En resumen, el tema es", confirmNeed: "Quieres trabajar en",
    confirmTime: "Tiempo disponible:", confirmFormat: "Formato preferido:",
    confirmAsk: "¿Es correcto? Ahora puedo mostrarte opciones reales para elegir.",
    show: "Ver recomendaciones", rethink: "Cambiar formato",
    showAck: "Estas son las opciones disponibles según nuestra conversación. Tú decides cuál abrir.",
    userShow: "Ver recomendaciones", results: "Recomendaciones para empezar",
    resultNote: "Son materiales publicados y páginas reales, no un diagnóstico ni promesa de resultados.",
    alternative: "Otras opciones para empezar", returnToChat: "Volver al diálogo",
    askAnything: "Escribe tu respuesta o haz una pregunta…",
    inputLabel: "Tu mensaje a la guía", textSend: "Enviar",
    hint: "Puedes hacer preguntas en cualquier paso. El diálogo queda aquí.",
    unknownTopic: "Quiero entenderte bien. ¿Qué área describe mejor tu situación?",
    unknownTime: "¿Cuántos minutos tienes? Elige abajo o escribe un número.",
    unknownFormat: "Solo puedo recomendar los formatos permitidos en tu filtro. Elige uno.",
    notSure: "Está bien, podemos empezar sin aclararlo todo.",
    whyAnswer: "Primero considero tu filtro de objetivos si lo completaste; si no, las puntuaciones que cambiaste tú. Es una propuesta que puedes corregir, no una evaluación de salud.",
    priceAnswer: "Puedes empezar con tests gratuitos o vídeos publicados. Las sesiones personales de Andrey cuestan €50 / 30 min o €100 / 60 min. Otros profesionales confirman sus condiciones; una solicitud no es reserva.",
    compareAnswer: "Un test ayuda a reflexionar sobre tus puntuaciones; un vídeo permite probar una práctica. Puedes elegir cualquiera y cambiar después.",
    identityAnswer: "Soy una guía virtual. Por ahora la conversación usa reglas locales y el catálogo publicado: no interviene una IA generativa externa ni un terapeuta humano.",
    processAnswer: "Primero acordamos el tema, luego aclaramos la necesidad, el tiempo y el formato. Solo tras confirmar te mostraré recomendaciones.",
    fallbackAnswer: "No puedo responder esa pregunta con fiabilidad aquí. Puedo aclarar el objetivo, comparar formatos o abrir un recurso real. ¿Qué prefieres?",
    safetyAnswer: "No puedo atender una emergencia mediante esta guía. Si estás en peligro, contacta con los servicios de emergencia locales o con alguien de confianza cercano.",
    safeStop: "Terminar conversación", concernChanged: "Puedes cambiar de tema en cualquier momento.",
    timeLater: "Más tarde", preview: "Conversación privada", whyLabel: "¿Por qué esta opción?",
    open: "Abrir", availableVideo: "Vídeos disponibles", missingVideo: "Aún no existe una grabación verificada específicamente sobre este tema.",
    courseAction: "Ver cursos existentes", sessionAction: "Ver sesiones profesionales",
    supportAction: "Ver apoyo Reiki", testAction: "Hacer test gratuito", mandalaAction: "Abrir estudio",
    nextStep: "Después podrás valorar la experiencia y elegir el siguiente paso.",
    emptyFormat: "No hay formatos permitidos. Cambia el filtro para continuar.",
  },
} as const;

export function HolisticSupportInlineGuide({
  locale, scores, editedCheckins, goalSelection, videos, preferredVideo,
  onClose, onRefine, onVideo, onChoice,
}: {
  locale: PublicLocale;
  scores: Record<CheckinArea, number>;
  editedCheckins: CheckinArea[];
  goalSelection: GoalSelection | null;
  videos: Video[];
  preferredVideo?: Video | null;
  onClose: () => void;
  onRefine: () => void;
  onVideo: (id: string | null) => void;
  onChoice: (choice: Choice) => void;
}) {
  const t = copy[locale];
  const talk = conversation[locale];
  const [initial] = useState(() => {
    const result = opening(locale, scores, editedCheckins, goalSelection);
    // Empty format selections need an upfront visible explanation, not a hidden option.
    return goalSelection?.recommendationFormats?.length === 0
      ? { ...result, message: result.message + " " + conversation[locale].emptyFormat }
      : result;
  });
  const [phase, setPhase] = useState<Phase>(initial.phase);
  const [topic, setTopic] = useState<GoalSector>(initial.topic);
  const [need, setNeed] = useState("");
  const [detail, setDetail] = useState("");
  const [minutes, setMinutes] = useState<number | null>(null);
  const [format, setFormat] = useState<Format>("meditation");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "guide", text: initial.message }]);
  const threadRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (phase !== "recommendations") return;
    const frame = window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phase]);

  const available = formats.filter(item =>
    !goalSelection || (goalSelection.recommendationFormats ?? formats.map(f => f.filter)).includes(item.filter as never));
  const allowed = available.map(item => item.id);
  const matchingVideo = videos.find(item => /^[A-Za-z0-9_-]{11}$/.test(item.id) &&
    videoThemes[topic].some(category => item.topics.includes(category)));
  const selectedVideo = topic === goalSelection?.sector && preferredVideo &&
    /^[A-Za-z0-9_-]{11}$/.test(preferredVideo.id) &&
    videoThemes[topic].some(category => preferredVideo.topics.includes(category))
    ? preferredVideo : matchingVideo ?? null;
  const category = testJourney[goalSectorFocus[topic]];
  const progress = phase === "review" || phase === "topic" ? 1
    : phase === "need" || phase === "detail" ? 2
      : phase === "time" ? 3 : phase === "format" ? 4 : 5;

  function speak(answer: string, reply: string, next: Phase) {
    const pair: Message[] = [{ role: "user", text: answer }, { role: "guide", text: reply }];
    setMessages(previous => [...previous, ...pair].slice(-40));
    setPhase(next);
    setDraft("");
  }
  function guideReply(answer: string, reply: string) {
    const pair: Message[] = [{ role: "user", text: answer }, { role: "guide", text: reply }];
    setMessages(previous => [...previous, ...pair].slice(-40));
    setDraft("");
  }
  function chooseTopic(next: GoalSector, answer: string = t.areas[next]) {
    setTopic(next);
    setNeed("");
    setDetail("");
    speak(answer, talk.topicAck + " «" + t.areas[next] + "». " + t.needQuestion, "need");
  }
  function chooseNeed(value: string) {
    const answer = value.trim().slice(0, 240);
    if (!answer) return;
    setNeed(answer);
    speak(answer, talk.needAck + " «" + answer + "». " + talk.detailAsk, "detail");
  }
  function chooseDetail(value: string) {
    const answer = value.trim().slice(0, 240);
    if (!answer) return;
    setDetail(answer === talk.skip ? "" : answer);
    speak(answer, (answer === talk.skip ? talk.notSure : talk.detailAck + " «" + answer + "».") +
      " " + t.timeQuestion, "time");
  }
  function chooseTime(value: number | null) {
    setMinutes(value);
    speak(value === null ? talk.timeLater : value + " min",
      talk.timeAck + " " + t.formatQuestion, "format");
  }
  function chooseFormat(next: Format, answer: string = t.formatLabels[next]) {
    if (!allowed.includes(next)) {
      guideReply(answer, talk.unknownFormat);
      return;
    }
    setFormat(next);
    speak(answer, talk.formatAck + " «" + t.formatLabels[next] + "». " +
      talk.confirmAsk, "confirm");
  }
  function suggestFormat() {
    const chosen = chooseSupportFormat({ available: allowed, minutes, need });
    if (!chosen) { guideReply(talk.auto, talk.emptyFormat); return; }
    chooseFormat(chosen as Format, talk.auto);
  }
  function changeTopic() {
    speak(t.different, talk.concernChanged + " " + t.topicQuestion, "topic");
  }
  function changeFormat() {
    speak(talk.rethink, t.formatQuestion, "format");
  }
  function showRecommendations() {
    speak(talk.userShow, talk.showAck, "recommendations");
  }

  function answerQuestion(question: "why" | "price" | "compare" | "identity" | "process") {
    const options = {
      why: talk.whyAnswer, price: talk.priceAnswer, compare: talk.compareAnswer,
      identity: talk.identityAnswer, process: talk.processAnswer,
    };
    return options[question];
  }

  function submitText(value: string) {
    const intent = interpretSupportUtterance(value, locale);
    if (intent.kind === "empty") return;
    const answer = intent.text ?? value.trim().slice(0, 240);
    if (intent.kind === "safety") {
      speak(answer, talk.safetyAnswer, "safety");
      return;
    }
    if (intent.kind === "switch-topic") { speak(answer, t.topicQuestion, "topic"); return; }
    if (intent.kind === "switch-format") { speak(answer, t.formatQuestion, "format"); return; }
    if (intent.kind === "text" && intent.question) {
      guideReply(answer, answerQuestion(intent.question as "why" | "price" | "compare" | "identity" | "process"));
      return;
    }
    if (phase === "review") {
      if (intent.kind === "agree") {
        speak(answer, talk.topicAck + " «" + t.areas[topic] + "». " + t.needQuestion, "need");
      } else if (intent.kind === "text" && intent.topic && sectors.includes(intent.topic as GoalSector)) {
        chooseTopic(intent.topic as GoalSector, answer);
      } else {
        speak(answer, talk.unknownTopic, "topic");
      }
      return;
    }
    if (phase === "topic") {
      if (intent.kind === "text" && intent.topic && sectors.includes(intent.topic as GoalSector)) {
        chooseTopic(intent.topic as GoalSector, answer);
      } else {
        guideReply(answer, talk.unknownTopic);
      }
      return;
    }
    if (phase === "need") { chooseNeed(answer); return; }
    if (phase === "detail") { chooseDetail(answer); return; }
    if (phase === "time") {
      const parsed = parseSupportMinutes(answer);
      if (parsed !== undefined) chooseTime(parsed);
      else guideReply(answer, talk.unknownTime);
      return;
    }
    if (phase === "format") {
      if (intent.kind === "text" && intent.format && allowed.includes(intent.format as Format)) {
        chooseFormat(intent.format as Format, answer);
      } else if (intent.kind === "agree" || /(?:подбери|посоветуй|suggest|recomiend)/i.test(answer)) {
        suggestFormat();
      } else {
        guideReply(answer, allowed.length ? talk.unknownFormat : talk.emptyFormat);
      }
      return;
    }
    if (phase === "confirm") {
      if (intent.kind === "agree" || /(?:покажи|рекомендац|show|recommend|mostrar|recomenda)/i.test(answer)) {
        showRecommendations();
      } else if (intent.kind === "disagree") {
        speak(answer, t.formatQuestion, "format");
      } else guideReply(answer, talk.confirmAsk);
      return;
    }
    if (phase === "recommendations") {
      guideReply(answer, talk.processAnswer);
      return;
    }
  }

  function offer(kind: Format) {
    if (kind === "meditation") return selectedVideo ? (
      <div className={styles.offer}>
        <Image alt="" unoptimized width={112} height={75} loading="lazy"
          src={"https://i.ytimg.com/vi/" + encodeURIComponent(selectedVideo.id) + "/mqdefault.jpg"} />
        <span><b>{selectedVideo.title}</b>
          <button type="button" onClick={() => onVideo(selectedVideo.id)}><Play size={16} aria-hidden="true" />{talk.open}</button>
        </span>
      </div>
    ) : (
      <div className={styles.offer}><span><b>{talk.missingVideo}</b>
        <button type="button" onClick={() => onVideo(null)}>{talk.availableVideo}</button>
      </span></div>
    );
    if (kind === "tests") return (
      <Link className={styles.primaryLink} href={"/" + locale + "/client/tests?journey=" + category} prefetch={false}>
        {talk.testAction}<ArrowRight size={17} aria-hidden="true" />
      </Link>
    );
    if (kind === "courses") return (
      <Link className={styles.primaryLink}
        href={"/" + locale + (topic === "money" ? "/explore/business" : "/academy")} prefetch={false}>
        {talk.courseAction}<ArrowRight size={17} aria-hidden="true" />
      </Link>
    );
    if (kind === "mandala") return (
      <Link className={styles.primaryLink} href={"/" + locale + "/holistic-support/mandala"} prefetch={false}>
        {talk.mandalaAction}<ArrowRight size={17} aria-hidden="true" />
      </Link>
    );
    return (
      <button type="button" className={styles.serviceAction}
        onClick={() => onChoice(kind === "healing" ? "healing" : "consultation")}>
        <HandHeart size={18} aria-hidden="true" />
        <span>{kind === "healing" ? talk.supportAction : talk.sessionAction}</span>
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    );
  }

  const primaryTitle: Record<Format, string> = {
    meditation: selectedVideo?.title ?? t.videoBrowse,
    tests: t.testsTitle,
    courses: t.courseTitle,
    consultation: t.sessionTitle,
    healing: t.healingTitle,
    mandala: t.mandalaTitle,
  };
  // Respect the user's chosen format, but rank optional alternatives by the topic.
  // Do not recommend a topic-specific recording if none is actually published.
  const alternativeOrder: Format[] = topic === "money"
    ? ["courses", "tests", "meditation", "mandala", "consultation", "healing"]
    : topic === "energy"
      ? ["meditation", "tests", "courses", "mandala", "healing", "consultation"]
      : ["tests", "meditation", "courses", "mandala", "consultation", "healing"];
  const alternatives = available
    .filter(item => item.id !== format && (item.id !== "meditation" || !!selectedVideo))
    .sort((a, b) => alternativeOrder.indexOf(a.id) - alternativeOrder.indexOf(b.id))
    .slice(0, 2);

  return (
    <section id="support-goal-results" className={styles.card} data-support-inline-guide
      aria-labelledby="support-guide-heading">
      <header className={styles.header}>
        <span className={styles.title} id="support-guide-heading">
          <Sparkles size={18} aria-hidden="true" />{t.title}
        </span>
        <span className={styles.progress} data-support-guide-progress>{phase === "recommendations" ? t.ux.ready : t.step + " " + progress + "/5"}</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label={t.close}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div className={styles.progressTrack} aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={index < progress ? styles.progressActive : undefined} />
        ))}
      </div>
      <div className={[styles.dialogue, phase === "recommendations" ? styles.dialogueComplete : ""].join(" ")}>
        <div className={styles.portrait} data-support-guide-fixed-portrait>
          <Image alt="" src="/images/holistic-house/support-reference-avatar.webp"
            width={128} height={160} sizes="(max-width: 340px) 63px, (max-width: 390px) 72px, 90px" />
          <span className={styles.online} aria-hidden="true" />
        </div>
        <div className={styles.thread} ref={threadRef} data-support-guide-thread
          role="log" aria-label={t.title} aria-live="polite" aria-relevant="additions">
          {messages.map((message, index) => (
            <p className={message.role === "user" ? styles.bubbleUser : styles.bubbleGuide}
              data-support-guide-message={message.role} key={index}>{message.text}</p>
          ))}
        </div>
      </div>
      <div className={styles.answers} data-support-guide-phase={phase}>
        {phase === "review" ? (
          <div className={styles.options}>
            <button type="button" className={styles.primary}
              onClick={() => speak(t.agree, talk.topicAck + " «" + t.areas[topic] + "». " + t.needQuestion, "need")}>
              <Check size={17} aria-hidden="true" />{t.agree}</button>
            <button type="button" onClick={onRefine}>{t.clarify}</button>
            <button type="button" onClick={changeTopic}>{t.different}</button>
          </div>
        ) : phase === "topic" ? (
          <div className={styles.options}>
            {sectors.map(sector => (
              <button type="button" key={sector} data-support-guide-topic={sector}
                className={topic === sector ? styles.selected : undefined}
                onClick={() => chooseTopic(sector)}>{t.areas[sector]}</button>
            ))}
            <button type="button" onClick={onRefine}>{t.clarify}</button>
          </div>
        ) : phase === "need" ? (
          <div className={styles.options}>
            {t.needs[topic].map(option => (
              <button type="button" key={option} onClick={() => chooseNeed(option)}>{option}</button>
            ))}
            <button type="button" onClick={changeTopic}>{t.different}</button>
          </div>
        ) : phase === "detail" ? (
          <div className={styles.options}>
            {talk.detailOptions[topic].map(option => (
              <button type="button" key={option} data-support-guide-detail={option}
                onClick={() => chooseDetail(option)}>{option}</button>
            ))}
            <button type="button" onClick={() => chooseDetail(talk.skip)}>{talk.skip}</button>
          </div>
        ) : phase === "time" ? (
          <div className={styles.options}>
            {[5, 10, 20, 30].map(value => (
              <button type="button" key={value} data-support-guide-minutes={value}
                onClick={() => chooseTime(value)}><Clock3 size={16} aria-hidden="true" />{value} min</button>
            ))}
            <button type="button" onClick={() => chooseTime(null)}>{t.later}</button>
          </div>
        ) : phase === "format" ? (
          <div className={styles.options}>
            {available.length ? available.map(item => (
              <button type="button" key={item.id} data-support-guide-format={item.id}
                onClick={() => chooseFormat(item.id)}>{t.formatLabels[item.id]}</button>
            )) : <button type="button" onClick={onRefine}>{talk.emptyFormat}</button>}
            {available.length ? <button type="button" className={styles.primary}
              data-support-guide-suggest-format onClick={suggestFormat}><Sparkles size={17} aria-hidden="true" />{talk.auto}</button> : null}
          </div>
        ) : phase === "confirm" ? (
          <div className={styles.confirm} data-support-guide-confirm>
            <p><strong>{talk.confirm}</strong> {t.areas[topic]}.</p>
            <p>{talk.confirmNeed} «{need}»{detail ? " · " + detail : ""}.</p>
            <p>{talk.confirmTime} {minutes === null ? t.later : minutes + " min"}. {talk.confirmFormat} {t.formatLabels[format]}.</p>
            <div className={styles.options}>
              <button type="button" className={styles.primary} data-support-guide-show-recommendations
                onClick={showRecommendations}><Sparkles size={17} aria-hidden="true" />{talk.show}<ArrowRight size={17} aria-hidden="true" /></button>
              <button type="button" onClick={changeFormat}>{talk.rethink}</button>
              <button type="button" onClick={changeTopic}>{t.different}</button>
            </div>
          </div>
        ) : phase === "recommendations" ? (
          <div className={styles.context} data-support-guide-context>
            <span>{t.ux.focus}</span>
            <strong>{t.areas[topic]}</strong>
            {need ? <span>· {need}</span> : null}
          </div>
        ) : (
          <div className={styles.confirm} role="alert">
            <p>{talk.safetyAnswer}</p>
            <button type="button" onClick={onClose}>{talk.safeStop}</button>
          </div>
        )}
        {phase !== "safety" && phase !== "recommendations" ? (
          <form className={styles.customForm} data-support-guide-compose
            onSubmit={event => { event.preventDefault(); submitText(draft); }}>
            <input aria-label={talk.inputLabel} placeholder={talk.askAnything}
              maxLength={240} value={draft} onChange={event => setDraft(event.target.value)} />
            <button type="submit" disabled={!draft.trim()}>{talk.textSend}<ArrowRight size={15} aria-hidden="true" /></button>
          </form>
        ) : null}
      </div>
      {phase === "recommendations" ? (
        <section className={styles.recommendations} data-support-guide-recommendations ref={resultsRef}
          id="support-guide-recommendations" aria-labelledby="support-guide-recommendations-title">
          <div className={styles.recommendationHeading}>
            <div>
              <span className={styles.eyebrow}>{t.ux.local}</span>
              <h3 id="support-guide-recommendations-title">{talk.results}</h3>
            </div>
          </div>
          <div className={styles.result} data-support-guide-recommendation>
            <div className={styles.resultTop}>
              <span className={styles.eyebrow}>{t.ux.primary}</span>
              <span className={styles.formatTag}>{t.formatLabels[format]}</span>
            </div>
            <h4 data-support-guide-primary-title>{primaryTitle[format]}</h4>
            <p className={styles.benefit}>{t.ux.benefit[format]}</p>
            {topic === "money" && (format === "healing" || format === "consultation") ? (
              <p className={styles.fitNote} data-support-guide-fit-note>{t.ux.supportFit}</p>
            ) : null}
            {minutes !== null ? (
              <p className={styles.timeNote} data-support-guide-time-preference>
                <Clock3 size={15} aria-hidden="true" />
                <span>{t.ux.duration}: {minutes} min. {t.ux.durationWarning}</span>
              </p>
            ) : null}
            {offer(format)}
            <details className={styles.why}>
              <summary>{talk.whyLabel}<ChevronDown size={15} aria-hidden="true" /></summary>
              <p>{t.sourceReason} «{need}»{detail ? " · " + detail : ""}. {t.notDiagnosis}</p>
            </details>
          </div>
          {alternatives.length ? (
            <div className={styles.alternatives}>
              <strong>{talk.alternative}</strong>
              {alternatives.map(item => (
                <div className={styles.alternative} key={item.id} data-support-guide-alternative={item.id}>
                  <b>{t.formatLabels[item.id]}</b>{offer(item.id)}
                </div>
              ))}
            </div>
          ) : null}
          <div className={styles.plan} data-support-guide-program>
            <strong>{t.planTitle}</strong>
            <ol>
              <li><span className={styles.planNumber} aria-hidden="true">1</span>
                <span><b>{t.planToday}</b>{t.ux.firstAction[format]}</span></li>
              <li><span className={styles.planNumber} aria-hidden="true">2</span>
                <span><b>{t.planThen}</b>{t.planCheck}</span></li>
              <li><span className={styles.planNumber} aria-hidden="true">3</span>
                <span><b>{t.planContinue}</b>{t.planContinueText}</span></li>
            </ol>
          </div>
          <p className={styles.reason}>{talk.resultNote}</p>
          <button type="button" className={styles.textLink} onClick={() =>
            speak(talk.returnToChat, t.formatQuestion, "format")}>{talk.returnToChat}</button>
        </section>
      ) : null}
      <p className={styles.privacy}>{t.private} {talk.hint}</p>
    </section>
  );
}
