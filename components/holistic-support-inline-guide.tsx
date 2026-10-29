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
type Phase = "review" | "topic" | "test-invite" | "test-pick" | "test-return" | "practice-invite" | "time" | "media-pick" | "media-return" | "exercise" | "feedback" | "path-confirm" | "recommendations" | "safety";
type Format = "meditation" | "tests" | "courses" | "consultation" | "healing" | "mandala";
type Message = { role: "guide" | "user"; text: string };
type Video = { id: string; title: string; topics: string[]; sourceLanguage?: "en" | "ru" };
export type SupportGuideTest = { key: string; title: string; durationMinutes: number; questionCount: number | null; instrumentLocale: string; href: string };
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
    title: "Your AI guide", close: "Close guide", step: "Step",
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
  },
  ru: {
    title: "Ваш ИИ-проводник", close: "Закрыть проводника", step: "Шаг",
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
  },
  es: {
    title: "Tu guía de IA", close: "Cerrar guía", step: "Paso",
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

// Warm, contextual stages layered over the original, already approved guide.
// Results are not inferred from opening a test/video, and no third-party AI runs.
const journeyCopy = {
  en: {
    hi: "Hi! So good to see you 🌿",
    tryTopic: "That is only a suggestion. We can explore it or choose another topic.",
    inviteTest: "Would a quick self-check help us find a direction? I can show you a couple of genuine free tests. Or we can go straight to a practice — no pressure.",
    inviteTestEmpty: "There isn't a short, guest-accessible test for that topic in our verified catalogue right now. We can move straight to a practice.",
    tests: "Show short tests", practice: "Let's try a practice", talk: "Let's talk first",
    testPick: "Here are two published tests related to this topic. Which one feels more useful? You can also skip them.",
    testUnit: "min", questions: "questions", free: "Free", titleTest: "Short self-checks",
    testLanguage: "Questionnaire language", englishOriginal: "English original",
    launchTest: "Take this test", testOpened: "The existing questionnaire opens in a new tab. Come back here when you want to continue. I can't see its result in this conversation.",
    testReturn: "Ready to continue? You can share a general observation or we can move straight to a practice. Opening a questionnaire is not the same as completing it.",
    backFromTest: "Continue to practice", anotherTest: "Another test", skipTest: "Skip the test",
    testNotDone: "No problem. You can take it later. Shall we explore a practice instead?",
    practiceInvite: "Great. We don't need to rush. Would you rather explore a meditation or try a small practice here?",
    meditation: "Show meditations", shortPractice: "A short practice", other: "Another option",
    timeQuestion: "How much time do you have right now? I'll use this as a preference, not a claim about video length.",
    anytime: "Time doesn't matter", timeNote: "Please check the actual duration in the player; not all recordings have verified runtime metadata.",
    mediaPick: "I found a few published videos for this topic. Choose one you like — or try a simple practice instead.",
    mediaMissing: "I couldn't verify a recording matching this topic. We can try a simple exercise or open the existing catalogue.",
    watch: "Open this video", recordedIn: "Audio", mediaWait: "I've selected the recording in the existing player below. Playback starts only if you press Play. Come back when you're ready; just opening a video doesn't mean you watched it.",
    videoDone: "I've watched it", notYet: "Not yet", changeVideo: "Another video", noAutoplay: "No autoplay",
    exerciseTitle: "A one-minute self-reflection", exerciseText: "Notice your feet on the ground. Look around and name three neutral things you see. Ask yourself: what small action would support me today? You can stop at any time.",
    tried: "I've tried it", chooseMeditation: "See meditations",
    feedbackAsk: "How did it feel? No particular result is expected.", helpful: "It suited me", unsure: "Not sure yet", unhelpful: "Not for me",
    feedbackThanks: "Thanks for sharing. We can choose a different approach next time.",
    finalAsk: "We've explored your topic and possible first steps. Would you like a simple path for today and the next few days?",
    seePath: "Show my path", morePractice: "Another practice", enough: "That's enough today",
    finalIntro: "Here is a small, optional path from what you chose. Nothing here is a diagnosis or an automatic booking.",
    missingTests: "No eligible short tests are available right now. Browse the full verified test explorer instead.",
    browseTests: "Open free tests", askPlaceholder: "Reply or ask a question…", typeLabel: "Your message",
    unknown: "I may have missed that. Would you prefer a short test or a practice? You can choose a button below.",
    questionWhy: "I suggested this because of the goal filter you completed, or the ratings you actively changed. I don't have access to your private My Tests on this public page.",
    questionTests: "A test helps you reflect on your own answers; a practice lets you try a small action. Both are optional.",
    waitingHint: "No test result is read or saved by this public chat. You may continue without sharing it.",
    noPersonalData: "This public guide uses the goal filter and ratings on this page only. Private My Tests and scores are not read or sent to an AI provider.",
  },
  ru: {
    hi: "Привет! Рада тебя видеть 🌿",
    tryTopic: "Это только предложение. Можем исследовать эту тему или выбрать другую.",
    inviteTest: "Как насчёт небольшой самопроверки, чтобы понять, куда двигаться? У меня есть несколько коротких бесплатных тестов. Или сразу перейдём к практике — как тебе удобнее.",
    inviteTestEmpty: "По этой теме сейчас нет подтверждённого короткого теста для гостей. Можем сразу перейти к практике.",
    tests: "Посмотреть тесты", practice: "Давай к практике", talk: "Сначала поговорим",
    testPick: "Вот два настоящих теста из нашей библиотеки по твоей теме. Какой тебе ближе? Можно и пропустить.",
    testUnit: "мин", questions: "вопросов", free: "Бесплатно", titleTest: "Короткие тесты",
    testLanguage: "Язык теста", englishOriginal: "Оригинал на английском",
    launchTest: "Пройти тест", testOpened: "Открываю существующий тест в новой вкладке. Вернись сюда, когда захочешь продолжить. В этой беседе я не вижу его результат.",
    testReturn: "Продолжим? Можешь поделиться общим впечатлением, а можем сразу перейти к практике. Открытие теста ещё не означает, что он пройден.",
    backFromTest: "Перейти к практике", anotherTest: "Другой тест", skipTest: "Без теста",
    testNotDone: "Хорошо, можно пройти его позже. Давай тогда посмотрим практики?",
    practiceInvite: "Отлично. Не будем торопиться. Тебе сейчас приятнее посмотреть медитацию или попробовать маленькую практику прямо здесь?",
    meditation: "Посмотреть медитации", shortPractice: "Короткая практика", other: "Другой вариант",
    timeQuestion: "У тебя сейчас есть 5 или 10 минут? Учту это как пожелание, но не буду обещать точную длительность записи.",
    anytime: "Время неважно", timeNote: "Длительность конкретной записи уточни в плеере — не для всех видео она проверена.",
    mediaPick: "Я подобрала несколько опубликованных записей по этой теме. Посмотри, что больше откликается. Или попробуем короткое упражнение.",
    mediaMissing: "Не нашлось подтверждённой записи точно по этой теме. Давай попробуем небольшое упражнение или откроем общий каталог.",
    watch: "Смотреть видео", recordedIn: "Аудио", mediaWait: "Выбранная запись открыта ниже в существующем плеере. Воспроизведение начнётся только после нажатия Play. Вернись, когда захочешь: открытие не означает просмотр.",
    videoDone: "Я посмотрел", notYet: "Ещё не смотрел", changeVideo: "Другой ролик", noAutoplay: "Без автозапуска",
    exerciseTitle: "Минутная практика наблюдения", exerciseText: "Почувствуй опору под стопами. Посмотри вокруг и назови три нейтральных предмета. Спроси себя: какое небольшое действие поддержит меня сегодня? В любой момент можно остановиться.",
    tried: "Я попробовал", chooseMeditation: "Лучше медитацию",
    feedbackAsk: "Как тебе было? Не нужно добиваться какого-то обязательного результата.", helpful: "Подошло", unsure: "Пока не понял", unhelpful: "Не подошло",
    feedbackThanks: "Спасибо, что поделился. Если захочешь, в следующий раз выберем другой подход.",
    finalAsk: "Мы выбрали тему и попробовали найти небольшой первый шаг. Хочешь, соберу простой путь на сегодня и ближайшие дни?",
    seePath: "Показать мой путь", morePractice: "Ещё практика", enough: "На сегодня хватит",
    finalIntro: "Вот необязательный маршрут по нашему разговору. Это не диагноз и не автоматическая запись к мастеру.",
    missingTests: "Сейчас нет доступных коротких тестов по этой теме. Можно открыть полную проверенную библиотеку.",
    browseTests: "Открыть бесплатные тесты", askPlaceholder: "Ответь или задай вопрос…", typeLabel: "Твоё сообщение",
    unknown: "Кажется, я не совсем поняла. Хочешь короткий тест или практику? Можно выбрать кнопкой ниже.",
    questionWhy: "Я предложила эту тему по заполненному фильтру целей или по изменённым тобой шкалам. На публичной странице я не читаю личные результаты My Tests.",
    questionTests: "Тест помогает присмотреться к своим ответам, а практика — попробовать небольшой шаг. Оба варианта добровольны.",
    waitingHint: "Этот публичный диалог не читает и не сохраняет результат теста. Продолжить можно без него.",
    noPersonalData: "Публичный проводник использует только текущий фильтр целей и изменённые здесь шкалы. Приватные My Tests не читаются и не отправляются ИИ.",
  },
  es: {
    hi: "¡Hola! Me alegra verte 🌿",
    tryTopic: "Es solo una propuesta. Podemos explorar este tema o elegir otro.",
    inviteTest: "¿Qué te parece una prueba breve y gratuita para aclarar el siguiente paso? También podemos ir directamente a una práctica.",
    inviteTestEmpty: "Ahora mismo no hay un test corto verificado para invitados sobre este tema. Podemos pasar a una práctica.",
    tests: "Ver pruebas", practice: "Ir a la práctica", talk: "Primero conversar",
    testPick: "Encontré dos pruebas reales de nuestra biblioteca sobre este tema. ¿Cuál prefieres? Puedes omitirlas.",
    testUnit: "min", questions: "preguntas", free: "Gratis", titleTest: "Pruebas breves",
    testLanguage: "Idioma del test", englishOriginal: "Original en inglés",
    launchTest: "Hacer la prueba", testOpened: "La prueba actual se abre en otra pestaña. Vuelve aquí cuando quieras. No puedo ver su resultado en este diálogo.",
    testReturn: "¿Continuamos? Puedes compartir una impresión general o pasar a la práctica. Abrir la prueba no significa haberla terminado.",
    backFromTest: "Pasar a la práctica", anotherTest: "Otra prueba", skipTest: "Sin prueba",
    testNotDone: "De acuerdo, puedes hacerla más tarde. ¿Exploramos prácticas?",
    practiceInvite: "Perfecto. Sin prisa. ¿Prefieres una meditación o una pequeña práctica aquí mismo?",
    meditation: "Ver meditaciones", shortPractice: "Práctica breve", other: "Otra opción",
    timeQuestion: "¿Tienes 5 o 10 minutos? Lo tendré en cuenta como preferencia, pero no como duración confirmada.",
    anytime: "Sin límite de tiempo", timeNote: "Comprueba la duración real en el reproductor: no está verificada para todas las grabaciones.",
    mediaPick: "Aquí tienes grabaciones publicadas sobre este tema. Elige una o prueba el ejercicio breve.",
    mediaMissing: "No hay una grabación verificada que coincida exactamente. Podemos hacer un ejercicio u abrir el catálogo.",
    watch: "Abrir vídeo", recordedIn: "Audio", mediaWait: "He seleccionado el vídeo en el reproductor existente de abajo. Solo se reproduce al pulsar Play. Abrirlo no significa haberlo visto.",
    videoDone: "Ya lo vi", notYet: "Aún no", changeVideo: "Otro vídeo", noAutoplay: "Sin reproducción automática",
    exerciseTitle: "Un minuto de observación", exerciseText: "Siente el apoyo de los pies en el suelo. Mira alrededor y nombra tres objetos neutrales. Pregúntate: ¿qué pequeño paso me ayudaría hoy? Puedes detenerte cuando quieras.",
    tried: "Lo probé", chooseMeditation: "Prefiero meditación",
    feedbackAsk: "¿Qué tal fue? No se espera ningún resultado concreto.", helpful: "Me sirvió", unsure: "Aún no lo sé", unhelpful: "No me sirvió",
    feedbackThanks: "Gracias por contarlo. Podemos elegir algo diferente otro día.",
    finalAsk: "Hemos explorado el tema y un posible primer paso. ¿Quieres un pequeño plan para hoy y los próximos días?",
    seePath: "Mostrar mi camino", morePractice: "Otra práctica", enough: "Por hoy basta",
    finalIntro: "Aquí tienes un camino opcional según nuestra conversación. No es un diagnóstico ni una reserva.",
    missingTests: "No hay pruebas breves disponibles para este tema. Puedes abrir el catálogo verificado.",
    browseTests: "Abrir pruebas gratis", askPlaceholder: "Responde o pregunta algo…", typeLabel: "Tu mensaje",
    unknown: "Puede que no te haya entendido. ¿Prefieres una prueba breve o una práctica? Elige una opción abajo.",
    questionWhy: "Sugerí este tema según tu filtro de objetivos o los valores que cambiaste. Esta página pública no lee tus resultados privados de My Tests.",
    questionTests: "Una prueba permite reflexionar sobre tus respuestas; una práctica permite probar algo sencillo. Ambas son opcionales.",
    waitingHint: "El chat público no lee ni guarda resultados de tests. Puedes continuar sin compartirlos.",
    noPersonalData: "La guía pública usa solo los objetivos y puntuaciones cambiadas aquí. No accede a My Tests privados ni los envía a una IA externa.",
  },
} as const;

export function HolisticSupportInlineGuide({
  locale, scores, editedCheckins, goalSelection, videos, preferredVideo, guideTests,
  onClose, onRefine, onVideo, onChoice,
}: {
  locale: PublicLocale;
  scores: Record<CheckinArea, number>;
  editedCheckins: CheckinArea[];
  goalSelection: GoalSelection | null;
  videos: Video[];
  preferredVideo?: Video | null;
  guideTests: Record<string, SupportGuideTest[]>;
  onClose: () => void;
  onRefine: () => void;
  onVideo: (id: string | null) => void;
  onChoice: (choice: Choice) => void;
}) {
  const t = copy[locale], talk = conversation[locale], journey = journeyCopy[locale];
  const [initial] = useState(() => opening(locale,scores,editedCheckins,goalSelection));
  const [phase,setPhase] = useState<Phase>(initial.phase);
  const [topic,setTopic] = useState<GoalSector>(initial.topic);
  const [draft,setDraft] = useState("");
  const [minutes,setMinutes] = useState<number | null>(null);
  const [format,setFormat] = useState<Format>("meditation");
  const [selectedTest,setSelectedTest] = useState<SupportGuideTest | null>(null);
  const [selectedVideoId,setSelectedVideoId] = useState<string | null>(null);
  const [messages,setMessages] = useState<Message[]>([
    { role:"guide",text:journey.hi },
    { role:"guide",text:initial.message },
  ]);
  const threadRef=useRef<HTMLDivElement>(null);
  const resultRef=useRef<HTMLElement>(null);
  useEffect(()=>{const node=threadRef.current;if(node)node.scrollTop=node.scrollHeight;},[messages]);
  useEffect(()=>{
    if(phase!=="recommendations")return;
    const id=window.requestAnimationFrame(()=>resultRef.current?.scrollIntoView({
      behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start",
    }));
    return ()=>window.cancelAnimationFrame(id);
  },[phase]);

  const allowed=formats.filter(row=>!goalSelection ||
    (goalSelection.recommendationFormats??formats.map(x=>x.filter)).includes(row.filter as never));
  const testCards=(guideTests[topic]??[]).filter(item=>item &&
    /^[a-z0-9][a-z0-9-]{1,95}$/.test(item.key) &&
    /^\/(?:en|ru)\/client\?startTests=[a-z0-9%-]+$/.test(item.href) &&
    Number.isFinite(item.durationMinutes)&&item.durationMinutes>0&&item.durationMinutes<=3).slice(0,2);
  const mediaCandidates=(() => {
    const matches=videos.filter(v=>/^[A-Za-z0-9_-]{11}$/.test(v.id) &&
      videoThemes[topic].some(tag=>v.topics.includes(tag)));
    const first=topic===goalSelection?.sector&&preferredVideo&&
      /^[A-Za-z0-9_-]{11}$/.test(preferredVideo.id)&&matches.some(v=>v.id===preferredVideo.id)
        ? [preferredVideo,...matches] : matches;
    return first.filter((v,i,all)=>all.findIndex(x=>x.id===v.id)===i).slice(0,3);
  })();
  const focus=testJourney[goalSectorFocus[topic]];
  const category=focus;
  const primaryVideo=videos.find(v=>v.id===selectedVideoId)??mediaCandidates[0]??null;
  const stageStep=["review","topic"].includes(phase)?1:
    ["test-invite","test-pick","test-return"].includes(phase)?2:
    ["practice-invite","time","media-pick","media-return","exercise","feedback"].includes(phase)?3:4;
  function say(answer:string,reply:string,next:Phase) {
    const pair:Message[]=[{role:"user",text:answer},{role:"guide",text:reply}];
    setMessages(prev=>[...prev,...pair].slice(-42));
    setDraft("");setPhase(next);
  }
  function reply(answer:string,question:string) {
    const pair:Message[]=[{role:"user",text:answer},{role:"guide",text:question}];
    setMessages(prev=>[...prev,...pair].slice(-42));
    setDraft("");
  }
  function enterTopic(next:GoalSector,answer:string=t.areas[next]) {
    setTopic(next);setSelectedTest(null);setSelectedVideoId(null);
    const availableForTopic=(guideTests[next]??[]).some(item=>item&&/^[a-z0-9][a-z0-9-]{1,95}$/.test(item.key));
    say(answer,availableForTopic?journey.inviteTest:journey.inviteTestEmpty,"test-invite");
  }
  function acceptTopic() {
    say(t.agree, testCards.length ? journey.inviteTest : journey.inviteTestEmpty,"test-invite");
  }
  function changeTopic() {say(t.different,t.topicQuestion,"topic");}
  function showTests() {
    setFormat("tests");
    say(journey.tests,testCards.length?journey.testPick:journey.missingTests,
      testCards.length?"test-pick":"practice-invite");
  }
  function chooseTest(row:SupportGuideTest) {
    setSelectedTest(row);setFormat("tests");
    say(row.title,journey.testOpened+" "+journey.waitingHint,"test-return");
  }
  function goPractice(answer:string=journey.practice) {
    say(answer,journey.practiceInvite,"practice-invite");
  }
  function askMediaTime() {
    setFormat("meditation");
    say(journey.meditation,journey.timeQuestion,"time");
  }
  function chooseMediaTime(value:number|null) {
    setMinutes(value);
    say(value===null?journey.anytime:value+" "+journey.testUnit,
      mediaCandidates.length?journey.mediaPick+" "+journey.timeNote:journey.mediaMissing,"media-pick");
  }
  function openMedia(id:string,title:string) {
    setSelectedVideoId(id);setFormat("meditation");
    say(title,journey.mediaWait,"media-return");
    onVideo(id);
  }
  function startExercise() {
    setFormat("meditation");
    say(journey.shortPractice,journey.exerciseText,"exercise");
  }
  function askFeedback(answer:string) {
    say(answer,journey.feedbackAsk,"feedback");
  }
  function pathPrompt(answer:string) {say(answer,journey.finalAsk,"path-confirm");}
  function showRecommendations(){say(journey.seePath,journey.finalIntro,"recommendations");}
  function answerQuestion(kind:"why"|"price"|"compare"|"identity"|"process") {
    const messages={why:journey.questionWhy,price:talk.priceAnswer,compare:journey.questionTests,
      identity:talk.identityAnswer,process:journey.inviteTest};
    return messages[kind];
  }
  function submitText(text:string) {
    const intent=interpretSupportUtterance(text,locale);
    if(intent.kind==="empty")return;
    const answer=intent.text??text.trim().slice(0,240);
    if(intent.kind==="safety"){say(answer,talk.safetyAnswer,"safety");return;}
    if(intent.kind==="switch-topic"){say(answer,t.topicQuestion,"topic");return;}
    if(intent.kind==="text"&&intent.question){
      reply(answer,answerQuestion(intent.question as "why"|"price"|"compare"|"identity"|"process"));return;
    }
    if(phase==="review"||phase==="topic") {
      if(phase==="review"&&intent.kind==="agree"){acceptTopic();return;}
      if(intent.kind==="text"&&intent.topic&&sectors.includes(intent.topic as GoalSector)){
        enterTopic(intent.topic as GoalSector,answer);return;
      }
      say(answer,t.topicQuestion,"topic");return;
    }
    if(phase==="test-invite"||phase==="test-pick") {
      if(intent.kind==="text"&&intent.format==="tests"||/^(?:да|yes|si|тесты|tests?)$/i.test(answer)){
        showTests();return;
      }
      if(intent.kind==="disagree"||/практик|медитац|practice|meditat|pr[aá]ctica/i.test(answer)){
        goPractice(answer);return;
      }
      reply(answer,journey.unknown);return;
    }
    if(phase==="test-return") {
      if(/другой|another|otro/i.test(answer)){showTests();return;}
      goPractice(answer);return;
    }
    if(phase==="practice-invite") {
      if(/медитац|видео|meditat|video/i.test(answer)||intent.kind==="text"&&intent.format==="meditation"){
        askMediaTime();return;
      }
      if(/практик|упражнен|exercise|practice|ejercic|pr[aá]ctica/i.test(answer)){startExercise();return;}
      reply(answer,journey.practiceInvite);return;
    }
    if(phase==="time") {
      const minutes=parseSupportMinutes(answer);
      if(minutes!==undefined){chooseMediaTime(minutes);return;}
      reply(answer,talk.unknownTime);return;
    }
    if(phase==="media-pick") {reply(answer,journey.mediaPick);return;}
    if(phase==="media-return") {
      if(/посмотр|готов|finished|watched|v[ií]|he visto/i.test(answer)){askFeedback(answer);return;}
      reply(answer,journey.mediaWait);return;
    }
    if(phase==="exercise"){askFeedback(answer);return;}
    if(phase==="feedback"){pathPrompt(answer);return;}
    if(phase==="path-confirm") {
      if(intent.kind==="agree"||/покажи|путь|show|path|mostrar|camino/i.test(answer)){showRecommendations();return;}
      if(intent.kind==="disagree"){onClose();return;}
      reply(answer,journey.finalAsk);return;
    }
    reply(answer,talk.fallbackAnswer);
  }
  function offer(kind:Format) {
    if(kind==="tests") return (
      <Link className={styles.primaryLink} href={"/"+locale+"/client/tests?journey="+category} prefetch={false}>
        {journey.browseTests}<ArrowRight size={17} aria-hidden="true"/>
      </Link>
    );
    if(kind==="meditation") return primaryVideo ? <button className={styles.serviceAction} type="button"
      onClick={()=>onVideo(primaryVideo.id)}><Play size={17} aria-hidden="true"/>
      <span>{primaryVideo.title}</span><ArrowRight size={16} aria-hidden="true"/></button>
      : <button type="button" className={styles.serviceAction} onClick={()=>onVideo(null)}>{talk.videoBrowse}</button>;
    if(kind==="courses")return <Link className={styles.primaryLink}
      href={"/"+locale+(topic==="money"?"/explore/business":"/academy")} prefetch={false}>
      {journey.other}<ArrowRight size={17} aria-hidden="true"/></Link>;
    if(kind==="mandala")return <Link className={styles.primaryLink}
      href={"/"+locale+"/holistic-support/mandala"} prefetch={false}>
      {talk.mandalaAction}<ArrowRight size={17} aria-hidden="true"/></Link>;
    return <button type="button" className={styles.serviceAction}
      onClick={()=>onChoice(kind==="healing"?"healing":"consultation")}>
      <HandHeart size={17} aria-hidden="true"/>
      <span>{kind==="healing"?talk.supportAction:talk.sessionAction}</span><ArrowRight size={17} aria-hidden="true"/>
    </button>;
  }
  const alternatives=allowed.filter(row=>row.id!==format).slice(0,2);
  const stageSummary=t.areas[topic]+(selectedTest?" · "+selectedTest.title:"")+
    (primaryVideo&&selectedVideoId?" · "+primaryVideo.title:"");
  return (
    <section id="support-goal-results" className={styles.card} data-support-inline-guide aria-labelledby="support-guide-heading">
      <header className={styles.header}>
        <span className={styles.title} id="support-guide-heading"><Sparkles size={18} aria-hidden="true"/>{t.title}</span>
        <span className={styles.progress}>{t.step} {stageStep}/4</span>
        <button className={styles.close} type="button" onClick={onClose} aria-label={t.close}><X size={18} aria-hidden="true"/></button>
      </header>
      <div className={styles.dialogue}>
        <div className={styles.portrait} data-support-guide-fixed-portrait>
          <Image alt="" src="/images/holistic-house/support-reference-avatar.webp" width={128} height={160}
            sizes="(max-width: 390px) 75px, 100px"/>
          <span className={styles.online} aria-hidden="true"/>
        </div>
        <div className={styles.thread} ref={threadRef} data-support-guide-thread
          role="log" aria-label={t.title} aria-live="polite" aria-relevant="additions">
          {messages.map((item,i)=><p key={i} data-support-guide-message={item.role}
            className={item.role==="user"?styles.bubbleUser:styles.bubbleGuide}>{item.text}</p>)}
        </div>
      </div>
      <div className={styles.answers} data-support-guide-phase={phase}>
        {phase==="review" ? <div className={styles.options}>
          <button className={styles.primary} type="button" onClick={acceptTopic}><Check size={16}/>{t.agree}</button>
          <button type="button" onClick={changeTopic}>{t.different}</button>
          <button type="button" onClick={onRefine}>{t.clarify}</button>
        </div> : phase==="topic" ? <div className={styles.options}>
          {sectors.map(sector=><button type="button" key={sector} data-support-guide-topic={sector}
            onClick={()=>enterTopic(sector)}>{t.areas[sector]}</button>)}
        </div> : phase==="test-invite" ? <div className={styles.options}>
          {testCards.length>0 ? <button type="button" data-guide-open-test-choice
            className={styles.primary} onClick={showTests}>{journey.tests}</button> : null}
          <button type="button" data-guide-skip-test onClick={()=>goPractice(journey.practice)}>{journey.practice}</button>
          <button type="button" onClick={()=>reply(journey.talk,journey.inviteTest)}>{journey.talk}</button>
        </div> : phase==="test-pick" ? <div className={styles.inlineChoices} data-guide-test-options>
          <strong>{journey.titleTest}</strong>
          {testCards.map(item=><div className={styles.inlineOffer} key={item.key} data-guide-test-card={item.key}>
            <span><b>{item.title}</b><small>{journey.free} · {item.durationMinutes} {journey.testUnit}
              {item.questionCount?" · "+item.questionCount+" "+journey.questions:""}
              {item.instrumentLocale===locale?"":" · "+journey.englishOriginal}</small></span>
            <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={()=>chooseTest(item)}
              data-guide-start-test={item.key}>{journey.launchTest}<ArrowRight size={15} aria-hidden="true"/></a>
          </div>)}
          <button type="button" className={styles.textLink} data-guide-skip-test onClick={()=>goPractice(journey.skipTest)}>{journey.skipTest}</button>
        </div> : phase==="test-return" ? <div className={styles.options}>
          <button type="button" className={styles.primary} data-guide-continue-after-test onClick={()=>goPractice(journey.backFromTest)}>{journey.backFromTest}</button>
          <button type="button" onClick={showTests}>{journey.anotherTest}</button>
          <button type="button" onClick={()=>goPractice(journey.skipTest)}>{journey.skipTest}</button>
        </div> : phase==="practice-invite" ? <div className={styles.options}>
          <button type="button" className={styles.primary} data-guide-go-meditations onClick={askMediaTime}>{journey.meditation}</button>
          <button type="button" data-guide-short-practice onClick={startExercise}>{journey.shortPractice}</button>
          <button type="button" onClick={()=>pathPrompt(journey.other)}>{journey.other}</button>
        </div> : phase==="time" ? <div className={styles.options}>
          {[5,10,20].map(n=><button type="button" key={n} data-support-guide-minutes={n}
            onClick={()=>chooseMediaTime(n)}><Clock3 size={15} aria-hidden="true"/>{n} {journey.testUnit}</button>)}
          <button type="button" onClick={()=>chooseMediaTime(null)}>{journey.anytime}</button>
        </div> : phase==="media-pick" ? <div className={styles.inlineChoices} data-guide-media-options>
          {mediaCandidates.map(item=><div className={styles.inlineOffer} key={item.id} data-guide-media-card={item.id}>
            <Image src={"https://i.ytimg.com/vi/"+encodeURIComponent(item.id)+"/mqdefault.jpg"}
              width={105} height={69} alt="" unoptimized loading="lazy"/>
            <span><b>{item.title}</b><small>{journey.recordedIn}: {item.sourceLanguage?.toUpperCase()??"EN"} · {journey.noAutoplay}</small></span>
            <button type="button" onClick={()=>openMedia(item.id,item.title)} data-guide-watch-video={item.id}>
              {journey.watch}<Play size={16} aria-hidden="true"/>
            </button>
          </div>)}
          <button type="button" className={styles.textLink} onClick={startExercise}>{journey.shortPractice}</button>
          {!mediaCandidates.length?<button type="button" className={styles.textLink} onClick={()=>onVideo(null)}>{talk.videoBrowse}</button>:null}
        </div> : phase==="media-return" ? <div className={styles.options}>
          <button className={styles.primary} type="button" data-guide-self-report-watched onClick={()=>askFeedback(journey.videoDone)}>{journey.videoDone}</button>
          <button type="button" onClick={()=>reply(journey.notYet,journey.mediaWait)}>{journey.notYet}</button>
          <button type="button" onClick={()=>say(journey.changeVideo,journey.mediaPick,"media-pick")}>{journey.changeVideo}</button>
          <button type="button" onClick={()=>pathPrompt(journey.skipTest)}>{journey.skipTest}</button>
        </div> : phase==="exercise" ? <div className={styles.inlineChoices} data-guide-inline-practice>
          <p>{journey.exerciseText}</p>
          <div className={styles.options}>
            <button className={styles.primary} type="button" onClick={()=>askFeedback(journey.tried)}>{journey.tried}</button>
            <button type="button" onClick={askMediaTime}>{journey.chooseMeditation}</button>
          </div>
        </div> : phase==="feedback" ? <div className={styles.options}>
          {[journey.helpful,journey.unsure,journey.unhelpful].map(v=><button type="button" key={v}
            onClick={()=>pathPrompt(v)}>{v}</button>)}
        </div> : phase==="path-confirm" ? <div className={styles.options}>
          <button type="button" className={styles.primary} data-support-guide-show-recommendations
            onClick={showRecommendations}><Sparkles size={16} aria-hidden="true"/>{journey.seePath}</button>
          <button type="button" onClick={askMediaTime}>{journey.morePractice}</button>
          <button type="button" onClick={onClose}>{journey.enough}</button>
        </div> : phase==="recommendations" ? <p className={styles.next}>{journey.finalIntro}</p> :
          <div className={styles.confirm} role="alert"><p>{talk.safetyAnswer}</p>
            <button type="button" onClick={onClose}>{talk.safeStop}</button></div>}
        {phase!=="safety"&&phase!=="recommendations" ?
          <form className={styles.customForm} data-support-guide-compose onSubmit={e=>{e.preventDefault();submitText(draft);}}>
            <input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={240}
              aria-label={journey.typeLabel} placeholder={journey.askPlaceholder}/>
            <button disabled={!draft.trim()} type="submit">{talk.textSend}<ArrowRight size={15} aria-hidden="true"/></button>
          </form>:null}
      </div>
      {phase==="recommendations"?<section className={styles.recommendations} ref={resultRef}
        data-support-guide-recommendations aria-labelledby="support-guide-recommendations-title">
        <h3 id="support-guide-recommendations-title">{journey.seePath}</h3>
        <p className={styles.reason}>{journey.finalIntro}</p>
        <div className={styles.result} data-support-guide-recommendation>
          <strong>{t.resultTitle} · {stageSummary}</strong>{offer(format)}
          <details className={styles.why}><summary>{talk.whyLabel}<ChevronDown size={15} aria-hidden="true"/></summary>
            <p>{journey.questionWhy} {t.notDiagnosis}</p></details>
        </div>
        {alternatives.length?<div className={styles.alternatives}><strong>{talk.alternative}</strong>
          {alternatives.map(x=><div className={styles.alternative} key={x.id} data-support-guide-alternative={x.id}>
            <b>{t.formatLabels[x.id]}</b>{offer(x.id)}</div>)}</div>:null}
        <div className={styles.plan} data-support-guide-program><strong>{t.planTitle}</strong>
          <ol><li><b>{t.planToday}:</b> {t.areas[topic]} · {t.formatLabels[format]}</li>
            <li><b>{t.planThen}:</b> {t.planCheck}</li>
            <li><b>{t.planContinue}:</b> {t.planContinueText}</li></ol>
        </div>
        <p className={styles.next}>{journey.noPersonalData}</p>
        <button type="button" className={styles.textLink} onClick={()=>say(talk.returnToChat,journey.practiceInvite,"practice-invite")}>{talk.returnToChat}</button>
      </section>:null}
      <p className={styles.privacy}>{t.private} {journey.noPersonalData}</p>
    </section>
  );
}
