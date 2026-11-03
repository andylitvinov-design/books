"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronDown, Compass, Flower2, Gift, Paperclip, ClipboardCheck, HeartHandshake, Quote, X, Sparkles, Sprout, Sun } from "lucide-react";
import { DaoHexagramGlyph } from "@/components/dao-hexagram-glyph";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { daoAuthorHexagramNumbers, getHexagram, hexagramEssence, hexagramTitle } from "@/data/dao-hexagrams.mjs";
import { drawRandomHexagram } from "@/lib/dao-divination.mjs";
import { detectIdeasQuestionLocale, getIdeasAphorismMatches, getIdeasFreeRecommendations, getIdeasTestSuggestions, matchIdeasTopic } from "@/lib/ideas-guidance.mjs";
import { rotateIdeasPreviewAphorisms } from "@/lib/ideas-preview-rotation.mjs";
import { stageIdeasCoachingQuestion } from "@/lib/ideas-coaching-handoff";
import { stageRemoteSupportLandingIntention } from "@/lib/practitioners/remote-energy-support";
import type { IdeasTopic } from "@/lib/ideas-guidance.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./ideas-discovery.module.css";
import { TestsCoachingSwitchboard } from "@/components/tests-coaching-switchboard";

type Mode = "dao" | "aphorisms" | "personal";
type Offer = "reading" | "gift";
type Result = { mode: Mode; topic: IdeasTopic; matched: boolean; hexagram?: number };
type DaoReading = { number: number; text: string; kind: "original" | "editorial"; locale: "ru" | "en" };

const copy = {
  ru: {
    eyebrow: "ИДЕИ И КОУЧИНГ",
    title: "Идеи и коучинг",
    lead: "Бесплатная коуч-сессия или даосская подсказка — выберите свой путь.",
    question: "О чём хотите спросить?",
    placeholder: "Ваш вопрос или тема…",
    choose: "Выберите способ получить подсказку",
    ask: "Получить бесплатную даосскую подсказку",
    testOverline: "Самостоятельно · €0", test: "Пройти бесплатную коуч-сессию", testAria: "Выбрать модель бесплатной коуч-сессии", testLink: "Или подобрать бесплатный тест",
    exploreMore: "Другие возможности", exploreCoaching: "Выбрать коучинг", exploreCoachingHint: "Модели и сессии", exploreTemple: "Исследовать храмовые подсказки", exploreTempleHint: "Символы и смыслы", taoOverline: "Символическая практика · €0", templeHeading: "Храмовые подсказки",
    testsTitle: "Бесплатные тесты по теме", testsFallback: "С чего можно начать",
    testsClose: "Скрыть подборку", testsMore: "Все тесты по теме",
    testsNote: "Это подбор по теме, не медицинская оценка. Ваш вопрос остаётся в браузере.",
    testTitles: {
      "hh-current-state": "Состояние сейчас",
      "hh-resource-pulse": "Ресурс и внутренняя опора",
      "hh-weekly-pulse": "Самочувствие за неделю",
      "hh-monthly-profile": "Профиль месяца",
      "mini-ipip-20": "Личностный baseline",
      "gad-7": "Тревожность · GAD-7 · 7 вопросов",
    },
    hexagramWord: "Гексаграмма", meaning: "Смысл", message: "Ключевая идея", step: "Практический шаг",
    expand: "Развернуть подсказку", aphorismsForYou: "Три афоризма для вас", sampleAphorisms: "Три афоризма · пример",
    attach: "Добавить текст из файла .txt или .md (только в браузере)",
    attachError: "Можно добавить только текстовый файл до 16 КБ.",
    previewShort: "ПРИМЕР",
    topicMessage: {
      relationships: "Доброта и ясные границы могут сосуществовать.",
      stress: "Маленькие устойчивые действия ценнее спешки.",
      resources: "Рост требует бережного отношения к собственным силам.",
      work: "Постоянство помогает превратить намерение в результат.",
      direction: "Путь открывается через последовательные шаги.",
    },
    topicStep: {
      relationships: "Сегодня сделайте один небольшой шаг навстречу честному диалогу.",
      stress: "Выберите одно спокойное, посильное действие на сегодня.",
      resources: "Уделите время небольшому восстанавливающему действию.",
      work: "Наметьте одну конкретную задачу, которую можно выполнить сегодня.",
      direction: "Запишите ближайший шаг, не пытаясь решить всё сразу.",
    },
    preview: "ПРИМЕР · КНИГА ПЕРЕМЕН",
    previewNote: "Пример для знакомства. Напишите вопрос, чтобы получить собственную подсказку.",
    dao: "Даосская подсказка",
    aphorisms: "Афоризмы",
    personal: "Личная подсказка",
    error: "Сначала напишите вопрос или тему.",
    privacyShort: "Текст остаётся в браузере · О приватности",
    privacy: "Ваш текст обрабатывается только в браузере: не сохраняется, не передаётся в CRM или аналитику. Не указывайте конфиденциальные данные.",
    basedOn: "Тема запроса",
    generic: "Общий вопрос",
    headings: { dao: "Символ Книги Перемен", aphorisms: "Афоризмы по вашему вопросу", personal: "Три способа начать" },
    topic: { relationships: "Отношения и близость", stress: "Тревога и внутреннее спокойствие", resources: "Ресурсы и энергия", work: "Работа и решения", direction: "Выбор и направление" },
    daoNote: "Одна из 64 гексаграмм выпадает случайно, независимо от смысла вопроса. Это образ для размышления, а не предсказание.",
    expandDao: "Развернуть всё", collapseDao: "Свернуть",
    originalReading: "Полное авторское толкование · русский оригинал", editorialReading: "Полное редакционное толкование · на русском",
    loadingReading: "Загружаем полное толкование…", unavailableReading: "Полное толкование не загрузилось. Откройте карточку гексаграммы.",
    aphorismNote: "Подбор по смыслу вопроса: редакционные афоризмы, авторские переложения и исторические народные пословицы. Переводы пословиц смысловые, с указанием оригинала и проверяемого сборника.",
    more: "Ещё 3 афоризма", inspiredBy: "Источник идеи · по мотивам", sourceLabel: "Источник", proverbSource: "Происхождение", originalLabel: "Оригинал", editorial: "Holistic House · авторский афоризм",
    personalNote: "Это тематический подбор, не индивидуальная оценка. Выберите формат и заполните существующую форму на странице услуги.",
    guidanceIntro: "Выберите один вариант, с которого хочется начать.",
    guidanceMatch: "Рекомендуем по теме запроса",
    guidanceOther: "Ещё один вариант",
    free: "Бесплатно",
    go: "Открыть",
    reset: "Новый вопрос",
    daoPromoLabel: "Персональная помощь после подсказки",
    order: "Заказать", requestTitle: "Короткая заявка", requestLead: "Оставьте контакт для ответа по выбранному предложению.", fullService: "Подробнее об услуге",
    daoPromoReading: {
      eyebrow: "ЛИЧНОЕ ТОЛКОВАНИЕ",
      title: "Получите персональное даосское гадание и подсказки от Мастера",
      description: "Обсудите вопрос с Андреем. Формат, сроки и стоимость уточняются лично.",
      action: "Спросить Мастера",
    },
    daoPromoGift: {
      eyebrow: "ПОДАРОК · БЕСПЛАТНО",
      title: "Получите личную диагностику и разбор ситуации",
      description: "Коучинг-анкета и рисунок «Я — цель — проблема» для личного письменного разбора. Не медицинский диагноз.",
      action: "Получить в подарок",
    },
    service: {
      review: { title: "Бесплатный разбор ситуации", description: "Опишите вопрос и получите персональный письменный разбор возможных шагов.", action: "Отправить запрос" },
      tests: { title: "Стресс и психопрофиль", description: "Пройдите бесплатные тесты самооценки и увидьте, на что обратить внимание.", action: "Выбрать тесты" },
      dao: { title: "Профиль ресурсов У-Син", description: "Исследуйте личные ресурсы в символической модели пяти элементов.", action: "Узнать о профиле" },
    },
  },
  en: {
    eyebrow: "IDEAS & COACHING",
    title: "Ideas & Coaching",
    lead: "One question, two ways to explore it: free coaching or Taoist insight.",
    question: "What would you like guidance on?",
    placeholder: "What’s on your mind?",
    choose: "Choose how to explore your question",
    ask: "Get free Taoist insight",
    testOverline: "Self-guided · €0", test: "Get free coaching session", testAria: "Choose a free coaching session model", testLink: "Or explore a free test",
    exploreMore: "More ways to explore", exploreCoaching: "Explore Coaching Options", exploreCoachingHint: "Methods and sessions", exploreTemple: "Explore Temple Insights", exploreTempleHint: "Symbols and reflections", taoOverline: "Symbolic reflection · €0", templeHeading: "Temple Insights",
    testsTitle: "Free tests for your topic", testsFallback: "A few ways to start",
    testsClose: "Close suggested tests", testsMore: "Explore all matching tests",
    testsNote: "Matched by topic only, not a diagnosis. Your question stays in this browser.",
    testTitles: {
      "hh-current-state": "Current State Check",
      "hh-resource-pulse": "Resources & Inner Support",
      "hh-weekly-pulse": "Weekly Wellbeing Check-in",
      "hh-monthly-profile": "Monthly Life Profile",
      "mini-ipip-20": "Personality Baseline",
      "gad-7": "Anxiety Deep Dive",
    },
    hexagramWord: "Hexagram", meaning: "Meaning", message: "Key message", step: "Practical step",
    expand: "Expand the full insight", aphorismsForYou: "Three aphorisms for you", sampleAphorisms: "Three aphorisms · example",
    attach: "Add a .txt or .md file locally in this browser",
    attachError: "Only text files up to 16 KB are supported.",
    previewShort: "EXAMPLE",
    topicMessage: {
      relationships: "Kindness and clear boundaries can exist together.",
      stress: "Small, steady actions can be more useful than rushing.",
      resources: "Growth also requires care for your own resources.",
      work: "Consistency can turn intentions into tangible progress.",
      direction: "A path becomes clearer through successive small steps.",
    },
    topicStep: {
      relationships: "Take one small step toward an honest conversation today.",
      stress: "Choose one calm and manageable action for today.",
      resources: "Make room for one small restoring action.",
      work: "Choose one concrete task you can complete today.",
      direction: "Write down the next step without solving the whole journey.",
    },
    preview: "EXAMPLE · BOOK OF CHANGES",
    previewNote: "A sample, not a response to you. Ask a question above to get your own guidance.",
    dao: "Daoist insight",
    aphorisms: "Aphorisms",
    personal: "Personal guidance",
    error: "Please enter a question or topic first.",
    privacyShort: "Private in this browser · More information",
    privacy: "Your text stays in this browser. It is not saved or sent to CRM or analytics. Avoid sharing sensitive personal details.",
    basedOn: "Topic",
    generic: "Open-ended question",
    headings: { dao: "A symbol from the Book of Changes", aphorisms: "Reflections for your question", personal: "Three ways to begin" },
    topic: { relationships: "Relationships and connection", stress: "Stress and inner calm", resources: "Energy and resources", work: "Work and decisions", direction: "Choices and direction" },
    daoNote: "One of 64 hexagrams is drawn at random, independently of your question. It offers a symbol for reflection, not a prediction.",
    expandDao: "Expand all", collapseDao: "Show less",
    originalReading: "Author interpretation · English editorial adaptation", editorialReading: "Full editorial reading · English adaptation",
    loadingReading: "Loading full interpretation…", unavailableReading: "The full reading could not be loaded. Open the hexagram page instead.",
    aphorismNote: "Topic-matched original reflections and historical folk proverbs, with cited collections. New proverb translations convey the original meaning; inspired reflections are not verbatim historical quotations.",
    more: "Show 3 more aphorisms", inspiredBy: "Source · inspired by", sourceLabel: "Source", proverbSource: "Provenance", originalLabel: "Original", editorial: "Holistic House editorial · original aphorism",
    personalNote: "These are topic-based options, not a personal assessment. Choose a format and complete its existing request form.",
    guidanceIntro: "Choose the starting point that feels right for you.",
    guidanceMatch: "Suggested for your topic",
    guidanceOther: "Another option",
    free: "Free",
    go: "Explore",
    reset: "New question",
    daoPromoLabel: "Personal help after your insight",
    order: "Request", requestTitle: "Quick request", requestLead: "Leave a contact for a reply about this offer.", fullService: "Service details",
    daoPromoReading: {
      eyebrow: "PERSONAL READING",
      title: "Get a personal Daoist reading and insights from the Master",
      description: "Ask Andrey about your question. Format, timing and price are confirmed personally.",
      action: "Ask the Master",
    },
    daoPromoGift: {
      eyebrow: "FREE GIFT",
      title: "Get a personal situation assessment and written review",
      description: "A coaching questionnaire and ME — GOAL — PROBLEM drawing for a personal written reflection. Not a medical diagnosis.",
      action: "Claim your gift",
    },
    service: {
      review: { title: "Free situation review", description: "Share your situation and request a personal written reflection on possible next steps.", action: "Request review" },
      tests: { title: "Stress & personal profile", description: "Explore free self-check scales and identify areas worth reflecting on.", action: "Explore tests" },
      dao: { title: "Wu Xing resource profile", description: "Explore your resources using the symbolic five-elements model.", action: "Explore profile" },
    },
  },
  es: {
    eyebrow: "IDEAS Y COACHING",
    title: "Ideas y coaching",
    lead: "Una pregunta, dos caminos: coaching gratuito o consejo taoísta.",
    question: "¿Sobre qué quieres una orientación?",
    placeholder: "Tu pregunta…",
    choose: "Elige cómo explorar tu pregunta",
    ask: "Recibir consejo taoísta gratuito",
    testOverline: "Autoguiado · €0", test: "Sesión gratuita de coaching", testAria: "Elegir un modelo de coaching gratuito", testLink: "O explorar un test gratuito",
    exploreMore: "Más opciones para explorar", exploreCoaching: "Explorar opciones de coaching", exploreCoachingHint: "Métodos y sesiones", exploreTemple: "Explorar reflexiones del templo", exploreTempleHint: "Símbolos y reflexión", taoOverline: "Reflexión simbólica · €0", templeHeading: "Reflexiones del templo",
    testsTitle: "Tests gratuitos para tu tema", testsFallback: "Opciones para empezar",
    testsClose: "Cerrar tests sugeridos", testsMore: "Ver todos los tests relacionados",
    testsNote: "Selección por tema, no un diagnóstico. La pregunta permanece en tu navegador. Algunos tests están en inglés.",
    testTitles: {
      "hh-current-state": "Chequeo del estado actual",
      "hh-resource-pulse": "Recursos y apoyo personal",
      "hh-weekly-pulse": "Bienestar de la semana",
      "hh-monthly-profile": "Perfil mensual de vida",
      "mini-ipip-20": "Perfil inicial de personalidad",
      "gad-7": "Ansiedad en profundidad · GAD-7",
    },
    hexagramWord: "Hexagrama", meaning: "Significado", message: "Mensaje clave", step: "Paso práctico",
    expand: "Desplegar toda la orientación", aphorismsForYou: "Tres aforismos para ti", sampleAphorisms: "Tres aforismos · ejemplo",
    attach: "Añadir un archivo .txt o .md solo en este navegador",
    attachError: "Solo se admiten archivos de texto de hasta 16 KB.",
    previewShort: "EJEMPLO",
    topicMessage: {
      relationships: "La bondad y los límites claros pueden coexistir.",
      stress: "Los pasos pequeños y constantes ayudan más que la prisa.",
      resources: "Crecer también implica cuidar tus propios recursos.",
      work: "La constancia transforma las intenciones en resultados.",
      direction: "El camino se aclara con pequeños pasos sucesivos.",
    },
    topicStep: {
      relationships: "Da hoy un pequeño paso hacia una conversación honesta.",
      stress: "Elige hoy una acción tranquila y manejable.",
      resources: "Dedica un momento a una pequeña acción reparadora.",
      work: "Elige una tarea concreta que puedas completar hoy.",
      direction: "Anota el próximo paso sin intentar resolverlo todo.",
    },
    preview: "EJEMPLO · LIBRO DE LOS CAMBIOS",
    previewNote: "Es un ejemplo, no una respuesta personal. Escribe tu pregunta para continuar.",
    dao: "Consejo taoísta",
    aphorisms: "Aforismos",
    personal: "Orientación personal",
    error: "Primero escribe tu pregunta o tema.",
    privacyShort: "Solo en tu navegador · Privacidad",
    privacy: "El texto permanece en este navegador. No se guarda ni se envía al CRM o a analítica. Evita datos personales sensibles.",
    basedOn: "Tema",
    generic: "Pregunta abierta",
    headings: { dao: "Un símbolo del Libro de los Cambios", aphorisms: "Reflexiones para tu pregunta", personal: "Tres maneras de empezar" },
    topic: { relationships: "Relaciones y cercanía", stress: "Estrés y calma interior", resources: "Energía y recursos", work: "Trabajo y decisiones", direction: "Opciones y rumbo" },
    daoNote: "Uno de los 64 hexagramas se elige al azar, independientemente de tu pregunta. Es un símbolo para reflexionar, no una predicción.",
    expandDao: "Desplegar todo", collapseDao: "Mostrar menos",
    originalReading: "Interpretación completa del autor · en ruso", editorialReading: "Interpretación editorial completa · en ruso",
    loadingReading: "Cargando interpretación completa…", unavailableReading: "No se pudo cargar la interpretación. Abre la página del hexagrama.",
    aphorismNote: "Aforismos originales y refranes tradicionales con su colección citada. Las traducciones expresan el sentido; las paráfrasis no son citas históricas literales.",
    more: "Ver 3 aforismos más", inspiredBy: "Fuente · inspirado en", sourceLabel: "Fuente", proverbSource: "Procedencia", originalLabel: "Original", editorial: "Holistic House · aforismo original",
    personalNote: "Son opciones por tema, no una evaluación personal. Elige una y completa el formulario existente de la página.",
    guidanceIntro: "Elige por dónde te gustaría empezar.",
    guidanceMatch: "Sugerido para tu tema",
    guidanceOther: "Otra opción",
    free: "Gratis",
    go: "Explorar",
    reset: "Otra pregunta",
    daoPromoLabel: "Ayuda personal después de tu consejo",
    order: "Solicitar", requestTitle: "Solicitud breve", requestLead: "Deja un contacto para recibir una respuesta sobre esta opción.", fullService: "Ver detalles",
    daoPromoReading: {
      eyebrow: "LECTURA PERSONAL",
      title: "Recibe una lectura taoísta personal y consejos del Maestro",
      description: "Consulta tu pregunta con Andrey. El formato, los plazos y el precio se confirman personalmente.",
      action: "Consultar al Maestro",
    },
    daoPromoGift: {
      eyebrow: "REGALO · GRATIS",
      title: "Recibe una valoración personal y un análisis de tu situación",
      description: "Un cuestionario y un dibujo YO — META — PROBLEMA para recibir una reflexión escrita personal. No es un diagnóstico médico.",
      action: "Recibir mi regalo",
    },
    service: {
      review: { title: "Revisión gratuita de tu situación", description: "Comparte tu pregunta y solicita una reflexión personal por escrito.", action: "Solicitar revisión" },
      tests: { title: "Estrés y perfil personal", description: "Explora pruebas gratuitas de autoevaluación y descubre temas para reflexionar.", action: "Ver pruebas" },
      dao: { title: "Perfil de recursos Wu Xing", description: "Explora tus recursos con el modelo simbólico de los cinco elementos.", action: "Ver perfil" },
    },
  },
} as const;

// Reuse the real local-only symbolic engine inside Temple Support without duplicating its privacy model.
const templeIntro = {
  en: { eyebrow: "TEMPLE & PSYCHIC INSIGHTS", title: "Temple Insights", lead: "Ask a question, find inspiration and receive a symbolic I Ching reflection. Free, private and not a prediction.", ask: "Receive a free symbolic insight", diagnostic: "Request Free Personal Diagnostic" },
  ru: { eyebrow: "ХРАМОВЫЕ И ИНТУИТИВНЫЕ ПОДСКАЗКИ", title: "Храмовые подсказки", lead: "Задайте вопрос, найдите вдохновение и получите символическую подсказку И-Цзин. Бесплатно и без предсказаний.", ask: "Получить бесплатную храмовую подсказку", diagnostic: "Запросить бесплатную личную диагностику" },
  es: { eyebrow: "REFLEXIONES DEL TEMPLO", title: "Reflexiones del templo", lead: "Haz una pregunta, encuentra inspiración y explora un símbolo del I Ching. Gratis, privado y sin predicciones.", ask: "Recibir una reflexión simbólica gratis", diagnostic: "Solicitar diagnóstico personal gratuito" },
} as const;

const holisticIntro = {
  en: {
    eyebrow: "HOLISTIC HOUSE · GUIDANCE FOR YOUR GOALS",
    title: "Holistic Support",
    lead: "Describe a goal or situation. Choose a free symbolic insight or request energy support from a practitioner.",
    question: "Your goal or situation",
    placeholder: "Your goal, question or situation…",
    choose: "Choose how to get support",
    ask: "Get a free symbolic insight",
    energy: "Request energy support",
    daoLead: "Ask one specific question and receive a free symbolic I Ching reflection. This is not a prediction.",
    diagnostic: "Get a free diagnostic from the Master",
    meditations: "Audio & video meditations",
    talismans: "Talismans",
    meditationsHint: "Find calm, clarity and inner balance.",
    talismansHint: "Symbols for reflection and personal meaning.",
    privacyShort: "Private in this browser · How it works",
    privacy: "Your words stay in this tab. For energy support they pass only to the next page in temporary memory, not in a URL, cookie or analytics. You review any request before choosing to send it.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ПОДСКАЗКИ ДЛЯ ЦЕЛЕЙ",
    title: "Холистическая поддержка",
    lead: "Опишите цель или ситуацию. Получите бесплатную символическую подсказку или запросите поддержку мастера.",
    question: "Ваша цель или ситуация",
    placeholder: "Какая у вас цель, ситуация или вопрос?",
    choose: "Выберите вид поддержки",
    ask: "Получить бесплатную подсказку",
    energy: "Получить энергетическую поддержку",
    daoLead: "Задайте конкретный вопрос и получите бесплатную символическую подсказку И-Цзин. Это не предсказание.",
    diagnostic: "Получить бесплатную диагностику от мастера",
    meditations: "Аудио- и видеомедитации",
    talismans: "Талисманы",
    meditationsHint: "Практики для спокойствия и ясности.",
    talismansHint: "Символы для личных смыслов.",
    privacyShort: "Приватно в браузере · Как это работает",
    privacy: "Ваши слова остаются в этой вкладке. При выборе энергетической поддержки они передаются только на следующую страницу во временной памяти, без URL, cookies и аналитики. Заявка отправляется только после вашего согласия.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ORIENTACIÓN PARA TUS OBJETIVOS",
    title: "Apoyo holístico",
    lead: "Describe tu objetivo o situación. Recibe una reflexión simbólica gratuita o solicita apoyo energético.",
    question: "Tu objetivo o situación",
    placeholder: "Tu objetivo, situación o pregunta…",
    choose: "Elige tu tipo de apoyo",
    ask: "Recibir una reflexión gratuita",
    energy: "Solicitar apoyo energético",
    daoLead: "Plantea una pregunta concreta y recibe una reflexión simbólica gratuita del I Ching. No es una predicción.",
    diagnostic: "Solicitar evaluación gratuita del maestro",
    meditations: "Meditaciones de audio y vídeo",
    talismans: "Talismanes",
    meditationsHint: "Una pausa para encontrar calma y claridad.",
    talismansHint: "Símbolos para la reflexión personal.",
    privacyShort: "Privado en este navegador · Cómo funciona",
    privacy: "Tus palabras permanecen en esta pestaña. Si eliges apoyo energético se transfieren a la página siguiente solo en memoria temporal, nunca en la URL, cookies ni analítica. Revisarás la solicitud antes de enviarla.",
  },
} as const;

// Start a real, rights-cleared guest questionnaire, not a generic catalog.
// /es/client does not host the guest runner yet; match the existing English fallback.
function ideasQuickTestHref(locale: PublicLocale) {
  return "/" + (locale === "es" ? "en" : locale) + "/client?startTests=hh-current-state";
}

function freeOfferHref(locale: PublicLocale, id: "review" | "tests" | "dao") {
  if (id === "tests") return "/" + (locale === "es" ? "en" : locale) + "/client/tests";
  if (id === "review") return "/" + locale + "/services/free-situation-review#request-free-review";
  return "/" + (locale === "es" ? "en" : locale) + "/services/dao-health-profile#request-free-wu-xing";
}


type Match = ReturnType<typeof getIdeasAphorismMatches>[number];
type HexagramEntry = NonNullable<ReturnType<typeof getHexagram>>;

// Shared presentation for the real Dao draw and the unmistakably labelled initial example.
function DaoInsightPanel({ entry, locale, topic, example = false }: {
  entry: HexagramEntry; locale: PublicLocale; topic: IdeasTopic; example?: boolean;
}) {
  const t = copy[locale];
  return (
    <article className={styles.daoInsight} data-ideas-dao-card>
      <div className={styles.daoLandscape} aria-hidden="true" />
      <p className={styles.daoEyebrow}>
        <span className={styles.yinYang} aria-hidden="true">☯</span>
        <span>{t.dao}{example ? " · " + t.previewShort : ""}</span>
      </p>
      <h2 className={styles.daoTitle}>{t.hexagramWord} {entry.number} — {hexagramTitle(entry, locale)}</h2>
      <p className={styles.daoLead}>{hexagramEssence(entry, locale)}</p>
      <details className={styles.daoExpanded} open={example}>
        <summary>{t.expand}</summary>
        <div className={styles.daoInterpretation}>
          <div className={styles.daoGlyphCard}>
            <DaoHexagramGlyph upper={entry.upper} lower={entry.lower} label={"Hexagram " + entry.number} />
            <strong>{entry.number}</strong>
            <span>{hexagramTitle(entry, locale)}</span>
          </div>
          <div className={styles.daoPoints}>
            <div className={styles.daoPoint}>
              <Sprout size={24} aria-hidden="true" />
              <div><strong>{t.meaning}</strong><p>{hexagramEssence(entry, locale)}</p></div>
            </div>
            <div className={styles.daoPoint}>
              <Flower2 size={24} aria-hidden="true" />
              <div><strong>{t.message}</strong><p>{t.topicMessage[topic]}</p></div>
            </div>
            <div className={styles.daoPoint}>
              <Sun size={24} aria-hidden="true" />
              <div><strong>{t.step}</strong><p>{t.topicStep[topic]}</p></div>
            </div>
          </div>
        </div>
      </details>
    </article>
  );
}

function AphorismTiles({ items, locale, heading }: {
  items: Match[]; locale: PublicLocale; heading: string;
}) {
  const t = copy[locale];
  return (
    <section className={styles.relatedAphorisms} data-ideas-aphorisms aria-label={heading}>
      <h3 className={styles.aphorismHeading}><Quote size={24} aria-hidden="true" />{heading}</h3>
      <ol className={styles.aphorisms}>
        {items.map((item, index) => (
          <li key={item.id} data-ideas-aphorism-id={item.id}>
            <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className={styles.aphorismBody}>
              <p>{item.text}</p>
              {item.kind !== "editorial" && item.source ? (
                <a className={styles.aphorismSource} href={item.source.url} target="_blank" rel="noopener noreferrer">
                  {item.kind === "proverb" ? t.proverbSource : t.inspiredBy}: {item.source.author} · {item.source.work}
                </a>
              ) : <span className={styles.aphorismSource}>{t.editorial}</span>}
              {item.kind === "proverb" && item.original ? (
                <p className={styles.aphorismOriginal}><span>{t.originalLabel}: </span><span lang={item.original.language}>{item.original.text}</span></p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}


/** Offer cards reuse the same consented, transactional CRM intake as public services. */
function DaoOfferCards({ locale, openOffer, onToggle }: {
  locale: PublicLocale;
  openOffer: Offer | null;
  onToggle: (offer: Offer) => void;
}) {
  const t = copy[locale];
  // Preserve the in-flight request/receipt if a visitor closes and reopens an offer.
  const [revealedOffers, setRevealedOffers] = useState<Offer[]>([]);
  function reveal(offer: Offer) {
    setRevealedOffers(current => current.includes(offer) ? current : [...current, offer]);
    onToggle(offer);
  }
  return (
    <aside className={styles.daoPromos} aria-label={t.daoPromoLabel} data-ideas-dao-promos>
      <div className={styles.daoPromoWrapper}>
        <article className={styles.daoPromo}>
          <span className={styles.daoPromoEyebrow}><Compass size={17} aria-hidden="true" />{t.daoPromoReading.eyebrow}</span>
          <strong className={styles.daoPromoTitle}>{t.daoPromoReading.title}</strong>
          <span className={styles.daoPromoDescription}>{t.daoPromoReading.description}</span>
          <button type="button" className={styles.daoPromoAction} data-ideas-order-button="reading"
            aria-expanded={openOffer === "reading"} aria-controls="ideas-offer-reading"
            onClick={() => reveal("reading")}>
            {t.order}<ArrowRight size={17} aria-hidden="true" />
          </button>
        </article>
        <div id="ideas-offer-reading" hidden={openOffer !== "reading"}>
          {revealedOffers.includes("reading") ? (
            <>
              <CompactLeadCapture locale={locale} variant="inline" serviceTitle={t.daoPromoReading.title}
                title={t.requestTitle} lead={t.requestLead} />
              <Link className={styles.daoPromoMore} href={"/" + locale + "/services/free-consultation#free-diagnosis-options"} prefetch={false}>
                {t.fullService}<ArrowRight size={15} aria-hidden="true" />
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <div className={styles.daoPromoWrapper}>
        <article className={[styles.daoPromo, styles.daoPromoGift].join(" ")}>
          <span className={styles.daoPromoEyebrow}><Gift size={17} aria-hidden="true" />{t.daoPromoGift.eyebrow}</span>
          <strong className={styles.daoPromoTitle}>{t.daoPromoGift.title}</strong>
          <span className={styles.daoPromoDescription}>{t.daoPromoGift.description}</span>
          <button type="button" className={styles.daoPromoAction} data-ideas-order-button="gift"
            aria-expanded={openOffer === "gift"} aria-controls="ideas-offer-gift"
            onClick={() => reveal("gift")}>
            {t.daoPromoGift.action}<ArrowRight size={17} aria-hidden="true" />
          </button>
        </article>
        <div id="ideas-offer-gift" hidden={openOffer !== "gift"}>
          {revealedOffers.includes("gift") ? (
            <>
              <CompactLeadCapture locale={locale} variant="inline" serviceTitle={t.daoPromoGift.title}
                title={t.requestTitle} lead={t.requestLead} />
              <Link className={styles.daoPromoMore} href={"/" + locale + "/services/free-situation-review#request-free-review"} prefetch={false}>
                {t.fullService}<ArrowRight size={15} aria-hidden="true" />
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function IdeasDiscovery({ locale, variant = "ideas" }: { locale: PublicLocale; variant?: "ideas" | "temple" | "holistic" | "holistic-dao" }) {
  const t = copy[locale];
  const daoFocused = variant === "holistic-dao";
  const isHolistic = variant === "holistic";
  const isTemple = variant !== "ideas";
  const intro = daoFocused
    ? { ...holisticIntro[locale], title: t.dao, lead: holisticIntro[locale].daoLead, ask: t.ask }
    : isHolistic ? holisticIntro[locale] : isTemple ? templeIntro[locale] : t;
  const HeadingTag = variant === "temple" || daoFocused ? "h2" : "h1";
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [testPickerOpen, setTestPickerOpen] = useState(false);
  const [error, setError] = useState(false);
  const [attachmentError, setAttachmentError] = useState(false);
  const [visibleAphorisms, setVisibleAphorisms] = useState(3);
  // Stable SSR example for hydration; a fresh, nonrepeating set is chosen on the client.
  const [previewAphorisms, setPreviewAphorisms] = useState(() =>
    getIdeasAphorismMatches("growth", locale, "resources").slice(0, 3));
  const [previewReady, setPreviewReady] = useState(false);
  const previewLocaleRef = useRef<PublicLocale | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [openOffer, setOpenOffer] = useState<Offer | null>(null);
  const [expandedDao, setExpandedDao] = useState(false);
  const [fullDaoReading, setFullDaoReading] = useState<DaoReading | null>(null);
  const [daoReadingError, setDaoReadingError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // WebKit may retarget the synthetic click to the fixed bottom navigation
  // after an iPhone touch scrolls a focused textarea. Handle the real touch
  // release while deduplicating the subsequent click, if WebKit emits one.
  const lastTouchFreeTestRef = useRef(-Infinity);

  useEffect(() => {
    // Only public quote IDs are retained; the visitor's question never leaves React memory.
    if (previewLocaleRef.current === locale) return;
    previewLocaleRef.current = locale;
    setPreviewAphorisms(rotateIdeasPreviewAphorisms(locale));
    setPreviewReady(true);
  }, [locale]);

  function choose(mode: Mode) {
    setTestPickerOpen(false);
    if (!question.trim()) {
      setError(false);
      textareaRef.current?.focus();
      return;
    }
    const matched = matchIdeasTopic(question);
    setExpandedDao(false);
    setFullDaoReading(null);
    setDaoReadingError(false);
    setError(false);
    setVisibleAphorisms(3);
    setOpenOffer(null);
    setResult({ mode, ...matched, hexagram: mode === "dao" ? drawRandomHexagram() : undefined });
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) {
      setError(true);
      textareaRef.current?.focus();
      return;
    }
    // Asking the question always opens the short Daoist answer first.
    // The Dao result already includes selected aphorisms and personal follow-up options.
    choose("dao");
  }

  useEffect(() => {
    const number = result?.mode === "dao" ? result.hexagram : undefined;
    const readingLocale = detectIdeasQuestionLocale(question, locale) === "en" ? "en" : "ru";
    if (!expandedDao || !number || (fullDaoReading?.number === number && fullDaoReading.locale === readingLocale)) return;
    const selectedNumber: number = number;
    let cancelled = false;
    async function loadReading() {
      try {
        let text: string | null | undefined;
        if (readingLocale === "en") {
          // Use a localized 64-card catalog even when the original was authored in Russian.
          const { getDaoEnglishHexagramText } = await import("@/data/dao-hexagrams-en.mjs");
          text = getDaoEnglishHexagramText(selectedNumber);
        } else if (daoAuthorHexagramNumbers.includes(selectedNumber)) {
          const { default: records } = await import("@/data/dao-hexagram-author.json");
          text = records.find(record => record.number === selectedNumber)?.text;
        } else {
          // Keep the 52 full Russian editorial readings code-split.
          const { getDaoEditorialHexagramText } = await import("@/data/dao-hexagrams-editorial.mjs");
          text = getDaoEditorialHexagramText(selectedNumber);
        }
        if (!cancelled) {
          if (text) setFullDaoReading({
            number: selectedNumber, text, locale: readingLocale,
            kind: daoAuthorHexagramNumbers.includes(selectedNumber) ? "original" : "editorial",
          });
          else setDaoReadingError(true);
        }
      } catch {
        if (!cancelled) setDaoReadingError(true);
      }
    }
    void loadReading();
    return () => { cancelled = true; };
  }, [expandedDao, result?.mode, result?.hexagram, fullDaoReading, question, locale]);

  const exampleHexagram = getHexagram(42);
  const hexagram = result?.mode === "dao" && result.hexagram ? getHexagram(result.hexagram) : null;
  const answerLocale = result ? detectIdeasQuestionLocale(question, locale) : locale;
  const answerCopy = copy[answerLocale];
  const topicLabel = result ? (result.matched ? answerCopy.topic[result.topic] : answerCopy.generic) : "";
  const suggestedTests = getIdeasTestSuggestions(question);
  const showSuggestedTests = testPickerOpen && Boolean(question.trim());
  const guestLocale = locale === "es" ? "en" : locale;
  const coachingHref = "/" + locale + "/coaching";
  const suggestedTestBrowserHref = "/" + locale + "/client/tests?focus=" + suggestedTests.focus.join(",");

  function openFreeTests() {
    if (!question.trim()) {
      setTestPickerOpen(false);
      router.push(ideasQuickTestHref(locale));
      return;
    }
    setTestPickerOpen(open => !open);
  }
  function openFreeTestsOnTouch() {
    lastTouchFreeTestRef.current = performance.now();
    openFreeTests();
  }
  function openFreeTestsOnClick(detail: number) {
    // Pointer-up already handled this physical touch. Preserve mouse click,
    // keyboard Enter/Space (detail=0), and screen-reader activation.
    if (detail > 0 && performance.now() - lastTouchFreeTestRef.current < 650) return;
    openFreeTests();
  }
  const aphorismMatches = result && (result.mode === "aphorisms" || result.mode === "dao") ? getIdeasAphorismMatches(question, answerLocale, result.topic) : [];
  useEffect(() => {
    if (!result) return;
    // The interpretation appears below the photo/selector. Make the actual
    // answer visible on iPhone rather than appearing to do nothing after a tap.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector('[data-ideas-result]')?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth", block: "start",
    });
  }, [result]);
  useEffect(() => {
    if (!showSuggestedTests) return;
    document.getElementById("ideas-filtered-tests")?.scrollIntoView({ block: "nearest" });
  }, [showSuggestedTests]);
  const templeContent = (<>
      {/* The shared Ideas controls remain unchanged. Only Temple groups its header,
          question, actions and privacy within the approved scenic surface. */}
      <div className={isTemple ? styles.templeScenic : styles.heroLayout}>
      <div className={styles.hero} data-ideas-hero>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{intro.eyebrow}</p>
          <HeadingTag id="ideas-title">{intro.title}</HeadingTag>
          <p className={styles.lead}>{intro.lead}</p>
        </div>
          <span className={styles.decor} aria-hidden="true">✦</span>
        </div>

        <form id="ideas-question-form" className={styles.question} onSubmit={submitQuestion}>
        <label htmlFor="ideas-question">{isHolistic ? holisticIntro[locale].question : t.question}</label>
        <div className={styles.questionFields}>
          <Sparkles className={styles.inputSparkle} size={21} aria-hidden="true" />
          <textarea
            id="ideas-question" ref={textareaRef} maxLength={500} rows={1} autoComplete="off"
            placeholder={isHolistic ? holisticIntro[locale].placeholder : t.placeholder} value={question} aria-invalid={error || attachmentError}
            aria-describedby={error || attachmentError ? "ideas-question-error ideas-question-privacy" : "ideas-question-privacy"}
            onChange={(event) => { setQuestion(event.target.value); setError(false); setAttachmentError(false); setResult(null); setVisibleAphorisms(3); setOpenOffer(null); }}
          />
          <input ref={fileInputRef} className={styles.fileInput} type="file" tabIndex={-1}
            accept=".txt,.md,text/plain,text/markdown"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              if (file.size > 16384 || !/\.(txt|md)$/i.test(file.name)) {
                setAttachmentError(true); return;
              }
              try {
                const excerpt = (await file.text()).trim();
                setQuestion(current => [current, excerpt].filter(Boolean).join(" ").slice(0, 500));
                setAttachmentError(false); setError(false); setResult(null); setVisibleAphorisms(3); setOpenOffer(null); setTestPickerOpen(false);
                textareaRef.current?.focus();
              } catch { setAttachmentError(true); }
            }}
          />
          <button type="button" className={styles.attach} aria-label={t.attach}
            title={t.attach} onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={20} aria-hidden="true" />
          </button>
        </div>
       </form>
      </div>
      <div className={styles.heroActions} data-ideas-hero-actions role="group" aria-label={isHolistic ? holisticIntro[locale].choose : t.choose}>
        {!isTemple ? <Link href={coachingHref} prefetch={false} className={styles.submit}
          onClick={() => stageIdeasCoachingQuestion(question)}
          data-ideas-free-coaching aria-label={t.testAria}>
          <ClipboardCheck size={20} aria-hidden="true" />
          <span className={styles.testButtonText}>
            <span className={styles.testButtonKicker}>{t.testOverline}</span>
            <strong>{t.test}</strong>
          </span>
          <ArrowRight size={17} aria-hidden="true" />
        </Link> : null}
        <button type="submit" form="ideas-question-form" className={styles.testButton} data-ideas-tao>
          <span className={styles.modeYin} aria-hidden="true">☯︎</span>
          <span className={styles.testButtonText}>
            <span className={styles.testButtonKicker}>{t.taoOverline}</span>
            <strong>{intro.ask}</strong>
          </span>
          {isHolistic ? <ArrowRight size={19} aria-hidden="true" /> : null}
        </button>
        {variant === "temple" ? <Link
          href={"/" + locale + "/coaching#free-diagnostic-start"}
          className={styles.diagnosticAction}
          data-ideas-personal-diagnostic
          prefetch={false}
        >
          <ClipboardCheck size={19} aria-hidden="true" />
          <span>{templeIntro[locale].diagnostic}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link> : null}
        {(isHolistic || daoFocused) ? <Link
          href={"/" + locale + "/services/remote-energy-support"}
          className={styles.diagnosticAction}
          data-ideas-energy-support
          prefetch={false}
          onClick={() => stageRemoteSupportLandingIntention(question)}
        >
          <HeartHandshake size={19} aria-hidden="true" />
          <span>{holisticIntro[locale].energy}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link> : null}
        {daoFocused ? <Link
          href={"/" + locale + "/services/free-consultation#free-diagnosis-options"}
          className={styles.diagnosticAction}
          data-ideas-free-diagnostic prefetch={false}
        >
          <ClipboardCheck size={19} aria-hidden="true" />
          <span>{holisticIntro[locale].diagnostic}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link> : null}
      </div>
      {!isTemple ? <nav className={styles.exploreLinks} aria-label={t.exploreMore} data-ideas-explore>
        <Link href={coachingHref} prefetch={false} className={styles.exploreLink}
          onClick={() => stageIdeasCoachingQuestion(question)} data-ideas-explore-coaching>
          <span className={styles.exploreIcon} aria-hidden="true"><Compass size={18} /></span>
          <span className={styles.exploreCopy}>
            <strong>{t.exploreCoaching}</strong>
            <small>{t.exploreCoachingHint}</small>
          </span>
          <ArrowRight className={styles.exploreArrow} size={17} aria-hidden="true" />
        </Link>
        <a href="#temple-insights" className={`${styles.exploreLink} ${styles.exploreTemple}`}
          data-ideas-explore-temple>
          <span className={styles.exploreIcon} aria-hidden="true"><BookOpen size={18} /></span>
          <span className={styles.exploreCopy}>
            <strong>{t.exploreTemple}</strong>
            <small>{t.exploreTempleHint}</small>
          </span>
          <ArrowRight className={styles.exploreArrow} size={17} aria-hidden="true" />
        </a>
      </nav> : null}
      {!isHolistic ? renderHeroUtility() : null}
      </div>
      {isHolistic ? (
        <>
          <nav className={styles.holisticQuickCards} data-holistic-quick-cards aria-label={holisticIntro[locale].choose}>
            <Link href="#meditation-practices" className={styles.holisticQuickLink} data-ideas-meditations>
              <span className={styles.holisticCardIcon} aria-hidden="true"><Sun size={24} strokeWidth={1.6} /></span>
              <strong>{holisticIntro[locale].meditations}</strong>
              <span className={styles.holisticCardDescription}>{holisticIntro[locale].meditationsHint}</span>
              <span className={styles.holisticCardArrow} aria-hidden="true"><ArrowRight size={19} /></span>
            </Link>
            <Link href="#talismans" className={styles.holisticQuickLink} data-ideas-talismans>
              <span className={styles.holisticCardIcon} aria-hidden="true">◇</span>
              <strong>{holisticIntro[locale].talismans}</strong>
              <span className={styles.holisticCardDescription}>{holisticIntro[locale].talismansHint}</span>
              <span className={styles.holisticCardArrow} aria-hidden="true"><ArrowRight size={19} /></span>
            </Link>
          </nav>
          {renderHeroUtility()}
        </>
      ) : null}
      <section className={styles.testPicker} id="ideas-filtered-tests" data-ideas-filtered-tests
        hidden={!showSuggestedTests} aria-label={t.testsTitle}>
        <div className={styles.testPickerHeading}>
          <div><strong>{suggestedTests.matched ? t.testsTitle : t.testsFallback}</strong>
            {suggestedTests.matched ? <span>{t.topic[suggestedTests.topic]}</span> : null}
          </div>
          <button type="button" className={styles.testPickerClose} onClick={() => setTestPickerOpen(false)}
            aria-label={t.testsClose}><X size={19} aria-hidden="true" /></button>
        </div>
        <ul className={styles.testPickerList}>
          {suggestedTests.keys.map(key => (
            <li key={key}>
              <Link href={"/" + guestLocale + "/client?startTests=" + key} prefetch={false}
                className={styles.testPickerItem} data-ideas-test-start={key}>
                <span>{t.testTitles[key]}</span><ArrowRight size={17} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <Link href={suggestedTestBrowserHref} prefetch={false}
          className={styles.allMatchingTests} data-ideas-more-tests>{t.testsMore}<ArrowRight size={15} aria-hidden="true" /></Link>
        <p className={styles.testPickerNote}>{t.testsNote}</p>
      </section>


      {!daoFocused ? <h2 id="temple-insights" className={styles.templeHeading}>
        <Sparkles size={15} aria-hidden="true" />{t.templeHeading}
      </h2> : null}

      {result ? (
        <div className={`${styles.results} ${result.mode === "personal" ? styles.personalResults : ""}`} key={result.mode + "-" + result.topic} aria-live="polite" data-ideas-result={result.mode} data-question-language={answerLocale} lang={answerLocale}>
          {result.mode !== "dao" ? (
            <div className={styles.resultsHeading}>
              <div>
                <p className={styles.tag}>{answerCopy.basedOn}: {topicLabel}</p>
                <h2>{answerCopy.headings[result.mode]}</h2>
              </div>
              <button type="button" className={styles.reset} onClick={() => { setResult(null); setQuestion(""); textareaRef.current?.focus(); }}>{answerCopy.reset} ×</button>
            </div>
          ) : null}
          {result.mode === "dao" && hexagram ? (
            <AphorismTiles items={aphorismMatches.slice(0, 3)} locale={answerLocale} heading={answerCopy.aphorismsForYou} />
          ) : null}
          {result.mode === "dao" && hexagram ? (
            <div className={styles.daoQuick} data-ideas-dao>
              <div className={styles.daoLandscape} aria-hidden="true" />
              <p className={styles.daoEyebrow}><span className={styles.yinYang} aria-hidden="true">☯</span><span>{answerCopy.dao}</span></p>
              <h2 className={styles.daoTitle}>{answerCopy.hexagramWord} {hexagram.number} — {hexagramTitle(hexagram, answerLocale)}</h2>
              <p className={styles.daoSummary} data-ideas-dao-summary>
                <strong>{answerCopy.dao} · {hexagramTitle(hexagram, answerLocale)}.</strong>{" "}{hexagramEssence(hexagram, answerLocale)}
              </p>
              <button type="button" className={styles.expandDao}
                aria-expanded={expandedDao} aria-controls="ideas-dao-details"
                onClick={() => { setExpandedDao(open => !open); setDaoReadingError(false); }}>
                {expandedDao ? answerCopy.collapseDao : answerCopy.expandDao}<ChevronDown aria-hidden="true" size={18} />
              </button>
              <div id="ideas-dao-details" className={styles.daoDetails} hidden={!expandedDao}
                data-ideas-dao-expanded={expandedDao ? "true" : undefined}>
                {expandedDao ? (
                  <>
                    <div className={styles.resultsHeading}>
                      <div>
                        <p className={styles.tag}>{answerCopy.basedOn}: {topicLabel}</p>
                        <h2>{answerCopy.headings.dao}</h2>
                      </div>
                      <button type="button" className={styles.reset}
                        onClick={() => { setResult(null); setQuestion(""); setExpandedDao(false); textareaRef.current?.focus(); }}>
                        {answerCopy.reset} ×
                      </button>
                    </div>
                    <div className={styles.daoInterpretation} data-ideas-dao-meaning>
                      <div className={styles.daoGlyphCard}>
                        <DaoHexagramGlyph upper={hexagram.upper} lower={hexagram.lower} label={"Hexagram " + hexagram.number} />
                        <strong>{hexagram.number}</strong>
                        <span>{hexagramTitle(hexagram, answerLocale)}</span>
                      </div>
                      <div className={styles.daoPoints}>
                        <div className={styles.daoPoint}>
                          <Sprout size={24} aria-hidden="true" />
                          <div><strong>{answerCopy.meaning}</strong><p>{hexagramEssence(hexagram, answerLocale)}</p></div>
                        </div>
                        <div className={styles.daoPoint}>
                          <Flower2 size={24} aria-hidden="true" />
                          <div><strong>{answerCopy.message}</strong><p>{answerCopy.topicMessage[result.topic]}</p></div>
                        </div>
                        <div className={styles.daoPoint}>
                          <Sun size={24} aria-hidden="true" />
                          <div><strong>{answerCopy.step}</strong><p>{answerCopy.topicStep[result.topic]}</p></div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.daoReading} data-ideas-dao-reading>
                      {fullDaoReading?.number === hexagram.number && fullDaoReading.locale === (answerLocale === "en" ? "en" : "ru") ? (
                        <>
                          <p className={styles.tag}>{fullDaoReading.kind === "original" ? answerCopy.originalReading : answerCopy.editorialReading}</p>
                          <div className={styles.daoProse} lang={fullDaoReading.locale}>
                            {fullDaoReading.text.split(/\n\n+/).filter(Boolean).map((part, index) => <p key={index}>{part}</p>)}
                          </div>
                        </>
                      ) : <p className={styles.daoReadingStatus} role="status">{daoReadingError ? answerCopy.unavailableReading : answerCopy.loadingReading}</p>}
                    </div>
                    <p className={styles.note}>{answerCopy.daoNote}</p>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          {result.mode === "dao" && hexagram && !daoFocused ? (
            <DaoOfferCards locale={answerLocale} openOffer={openOffer}
              onToggle={offer => setOpenOffer(current => current === offer ? null : offer)} />
          ) : null}
          {result.mode === "aphorisms" ? (
            <>
              <ol className={styles.aphorisms}>
                {aphorismMatches.slice(0, visibleAphorisms).map((item, index) => (
                  <li key={item.id}>
                    <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                    <div className={styles.aphorismBody}>
                      <p>{item.text}</p>
                      <div className={styles.aphorismAttribution}>
                        <BookOpen size={14} aria-hidden="true" />
                        <span className={styles.aphorismSourceLabel}>
                          {item.kind === "inspired" && item.source ? answerCopy.inspiredBy : answerCopy.sourceLabel}:
                        </span>
                        {item.kind === "inspired" && item.source ? (
                          <a className={styles.aphorismSource} href={item.source.url} target="_blank" rel="noopener noreferrer">
                            {item.source.author} · <cite>{item.source.work}</cite><ArrowUpRight size={13} aria-hidden="true" />
                          </a>
                        ) : <span className={styles.aphorismSource}>{answerCopy.editorial}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              {visibleAphorisms < aphorismMatches.length ? (
                <button type="button" className={styles.moreAphorisms}
                  onClick={() => setVisibleAphorisms(count => Math.min(count + 3, aphorismMatches.length))}>
                  <Sparkles size={17} aria-hidden="true" />{answerCopy.more}<ArrowRight size={17} aria-hidden="true" />
                </button>
              ) : null}
            </>
          ) : null}
          {result.mode === "personal" ? (
            <div className={styles.guidance} data-ideas-guidance>
              <div className={styles.guidanceIntro}>
                <p>{answerCopy.guidanceIntro}</p>
                <span className={styles.guidanceFree}>{answerCopy.free}</span>
              </div>
              <ol className={styles.guidanceList} data-ideas-guidance-list>
                {getIdeasFreeRecommendations(result.topic).map((id, index) => {
                  const item = answerCopy.service[id];
                  return (
                    <li className={index === 0 ? styles.guidancePriority : undefined} key={id}>
                      <Link className={styles.guidanceLink} href={freeOfferHref(answerLocale, id)} prefetch={false}>
                        <span className={styles.guidanceIndex} aria-hidden="true">0{index + 1}</span>
                        <span className={styles.guidanceContent}>
                          <span className={styles.guidanceEyebrow}>{index === 0 ? answerCopy.guidanceMatch : answerCopy.guidanceOther}</span>
                          <strong className={styles.guidanceTitle}>{item.title}</strong>
                          <span className={styles.guidanceDescription}>{item.description}</span>
                          <span className={styles.guidanceAction}>{item.action}<ArrowRight size={14} aria-hidden="true" /></span>
                        </span>
                        <span className={styles.guidanceArrow} aria-hidden="true"><ArrowUpRight size={19} /></span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
          {result.mode !== "dao" ? <p className={styles.note}>{result.mode === "aphorisms" ? answerCopy.aphorismNote : answerCopy.personalNote}</p> : null}
        </div>
      ) : exampleHexagram && !daoFocused ? (
        <div className={styles.results + " " + styles.preview} data-ideas-preview aria-label={t.preview}
          data-ideas-preview-ready={previewReady ? "" : undefined}>
          <AphorismTiles items={previewAphorisms} locale={locale} heading={t.sampleAphorisms} />
          <DaoInsightPanel entry={exampleHexagram} locale={locale} topic="resources" example />
          <p className={styles.note}>{t.previewNote}</p>
          <DaoOfferCards locale={locale} openOffer={openOffer}
            onToggle={offer => setOpenOffer(current => current === offer ? null : offer)} />
        </div>
      ) : null}
      </>);
  function renderHeroUtility() {
    return (
      <div className={styles.heroUtility} data-ideas-hero-utility>
        {error || attachmentError ? <p className={styles.error} role="alert" id="ideas-question-error">{attachmentError ? t.attachError : t.error}</p> : null}
        <div className={styles.utilityLinks}>
          <details className={styles.privacyDisclosure}>
            <summary id="ideas-question-privacy">{isHolistic ? holisticIntro[locale].privacyShort : t.privacyShort}</summary>
            <p className={styles.privacy}>{isHolistic ? holisticIntro[locale].privacy : t.privacy}</p>
          </details>
          {!daoFocused && (isTemple ? (
            <Link href={freeOfferHref(locale, "tests")} prefetch={false}
              className={styles.freeTestLink} data-ideas-free-test data-temple-test-catalog>
              {t.testLink}<ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <button type="button" className={styles.freeTestLink} data-ideas-free-test
              aria-expanded={showSuggestedTests} aria-controls="ideas-filtered-tests"
              onPointerUp={event => { if (event.pointerType === "touch") openFreeTestsOnTouch(); }}
              onClick={event => openFreeTestsOnClick(event.detail)}>{t.testLink}<ArrowRight size={15} aria-hidden="true" /></button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <section className={styles.root} aria-labelledby={isTemple ? "ideas-title" : "tests-coaching-title"} data-ideas-discovery data-temple-mode={isTemple ? "true" : undefined} data-holistic-entry={isHolistic ? "true" : undefined} lang={locale}>
      {isTemple ? templeContent : <TestsCoachingSwitchboard locale={locale} templeContent={templeContent} />}
    </section>
  );
}
