"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Compass, Heart, Mic, RotateCcw, Send, ShieldCheck, Sparkles, Waves, X } from "lucide-react";

import {
  homeGuideFollowup,
  chooseHomeGuideOffer,
  matchHomeGuideReply,
  resolveHomeGuideQuestion,
  type HomeGuideContext,
  type HomeGuideGoal,
  type HomeGuideOffer,
} from "@/lib/home-conversation.mjs";
import type { IdeasTopic } from "@/lib/ideas-guidance.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-conversation-guide.module.css";

type Turn = { id: number; role: "visitor" | "guide"; text: string };
type Context = HomeGuideContext;
type SpeechEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechEngine = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
type SpeechConstructor = new () => SpeechEngine;
type VoiceState = "idle" | "starting" | "listening" | "finishing";

type GuideCopy = {
  eyebrow: string;
  title: string;
  lead: string;
  welcome: string;
  chatStatus: string;
  openChat: string;
  closeChat: string;
  starterHint: string;
  moreWays: string;
  topicPrompt: Record<IdeasTopic, string>;
  question: string;
  placeholder: string;
  send: string;
  reset: string;
  askAgain: string;
  exampleLabel: string;
  examples: string[];
  topic: Record<IdeasTopic, string>;
  topics: string;
  unknown: string;
  followup: string;
  goalLabels: Record<HomeGuideGoal, string>;
  goalResponses: Record<HomeGuideGoal, string>;
  goalActions: Record<HomeGuideGoal, string>;
  secondary: string;
  privacyShort: string;
  privacyDetail: string;
  voiceStart: string;
  voiceStop: string;
  voiceError: string;
  voiceEmpty: string;
  voiceDenied: string;
  voiceKeyboard: string;
  voiceStarting: string;
  voiceListening: string;
  voiceFinishing: string;
  voiceCancel: string;
  voiceDone: string;
  voicePrivacy: string;
  urgent: string;
  limitation: string;
};

const copy: Record<PublicLocale, GuideCopy> = {
  en: {
    eyebrow: "HOLISTIC HOUSE · PERSONAL GUIDANCE",
    title: "What's on your mind?",
    lead: "Ask by text or voice. Find a useful next step.",
    welcome: "Hi! I'm the Holistic House website guide. Tell me what's on your mind, or choose a topic below.",
    chatStatus: "Automated guide · local suggestions",
    openChat: "Open a conversation",
    closeChat: "Close conversation",
    starterHint: "No account needed · Typed messages stay on this page",
    moreWays: "Other options",
    topicPrompt: {
      relationships: "Would it help more to understand what is happening, or to try a small practice?",
      stress: "Would you prefer a free self-check or a calming practice?",
      resources: "Would you like to try a short practice or check your current resources?",
      work: "Would a structured course, a free test or personal guidance help more?",
      direction: "Would a short reflection, a free review or a self-check help you choose a next step?",
    },
    question: "Your question or situation",
    placeholder: "Ask anything…",
    send: "Get guidance",
    reset: "Start over",
    askAgain: "You can continue the conversation or ask something else.",
    exampleLabel: "Or start with",
    examples: ["Feeling stressed", "Relationships", "Need a decision"],
    topic: {
      relationships: "relationships and connection",
      stress: "stress and inner calm",
      resources: "energy and personal resources",
      work: "work and decisions",
      direction: "finding your direction",
    },
    topics: "It sounds like your question may relate to",
    unknown: "Thanks for sharing. We can find a starting point without labelling your situation.",
    followup: "What would help most right now?",
    goalLabels: {
      understand: "Understand my situation",
      tests: "Explore free tests",
      practice: "Try a practice or course",
      consult: "Speak with a practitioner",
      ideas: "Find ideas and inspiration",
    },
    goalResponses: {
      understand: "A free written situation review is a good place to start. You'll complete a short form and, if you wish, a drawing. This is not a live call.",
      tests: "You can begin with free self-check questionnaires, then explore the results at your own pace. They aren't medical diagnoses.",
      practice: "The Academy has lessons and practices you can explore at your own pace. Choose what feels manageable today.",
      consult: "For a personal conversation with Andrey, you can request a session: €50 for 30 minutes or €100 for 60 minutes. A request is not a confirmed booking.",
      ideas: "The Ideas page offers an I Ching symbol, sourced reflections and books to help you look at your question from another angle.",
    },
    goalActions: {
      understand: "Request a free written review",
      tests: "Find my free tests",
      practice: "Explore practices",
      consult: "Request a session · from €50",
      ideas: "Explore Ideas",
    },
    secondary: "Another way to explore",
    privacyShort: "Private in this browser · How it works",
    privacyDetail: "Your typed question stays in this browser while the page is open. It is not sent to our server, CRM, analytics or an AI provider. This is a local topic-based guide, not an AI therapist or a real-time human conversation. If you choose voice input, your browser or operating system may process audio through its speech recognition provider. You decide whether to enable the microphone. Do not include confidential personal details.",
    voiceStart: "Dictate a question with microphone",
    voiceStop: "Stop voice input",
    voiceError: "Speech recognition stopped unexpectedly. You can try again or type your question.",
    voiceEmpty: "No words heard. Tap the microphone to retry or type your question.",
    voiceDenied: "Microphone access was not allowed. Enable it in browser settings or type instead.",
    voiceKeyboard: "Voice dictation isn't supported here. Use your keyboard's microphone or type.",
    voiceStarting: "Connecting microphone…",
    voiceListening: "Listening…",
    voiceFinishing: "Finishing…",
    voiceCancel: "Cancel recording",
    voiceDone: "Finish and send",
    voicePrivacy: "Tap ✓ to send · Audio recognition may use your browser provider.",

    urgent: "I'm sorry you're facing this. A website guide can't provide emergency help. If you may be in immediate danger or might hurt yourself, contact local emergency services now or reach a trusted person who can stay with you. In Canada and the US you can call or text 988 for suicide crisis support.",
    limitation: "Suggestions are for reflection and navigation, not a diagnosis, treatment or promised result.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ЛИЧНАЯ ПОДДЕРЖКА",
    title: "Что сейчас вас волнует?",
    lead: "Спросите текстом или голосом. Найдём следующий шаг.",
    welcome: "Здравствуйте! Я помощник сайта Holistic House. Расскажите, что вас волнует, или выберите тему ниже.",
    chatStatus: "Помощник сайта · локальные подсказки",
    openChat: "Открыть диалог",
    closeChat: "Закрыть диалог",
    starterHint: "Без регистрации · Текст остаётся на этой странице",
    moreWays: "Другие варианты",
    topicPrompt: {
      relationships: "Хотите сначала разобраться в ситуации или попробовать небольшую практику?",
      stress: "Начнём с бесплатной самопроверки или практики для спокойствия?",
      resources: "Вам сейчас полезнее короткая практика или проверка своих ресурсов?",
      work: "Вам поможет пошаговый курс, бесплатный тест или личная беседа?",
      direction: "Попробуем короткое упражнение, бесплатный разбор или самопроверку?",
    },
    question: "Ваш вопрос или ситуация",
    placeholder: "Спросите…",
    send: "Получить подсказку",
    reset: "Новый разговор",
    askAgain: "Можно продолжить разговор или задать другой вопрос.",
    exampleLabel: "Или выберите тему",
    examples: ["Стресс и тревога", "Отношения", "Трудно принять решение"],
    topic: {
      relationships: "отношений и близости",
      stress: "тревоги и спокойствия",
      resources: "энергии и внутренних ресурсов",
      work: "работы и решений",
      direction: "выбора и направления",
    },
    topics: "Похоже, вопрос касается темы",
    unknown: "Спасибо, что поделились. Необязательно давать ситуации название, чтобы найти первый шаг.",
    followup: "Что вам сейчас было бы полезнее?",
    goalLabels: {
      understand: "Разобраться в ситуации",
      tests: "Бесплатные тесты",
      practice: "Практика или курс",
      consult: "Поговорить с мастером",
      ideas: "Идеи и вдохновение",
    },
    goalResponses: {
      understand: "Можно начать с бесплатного письменного разбора: короткая анкета и, по желанию, рисунок. Это не созвон и не медицинская диагностика.",
      tests: "Начните с бесплатных опросников самонаблюдения. Результаты помогут увидеть темы для размышления, но не являются диагнозом.",
      practice: "В Академии есть уроки, упражнения и практики. Выберите небольшой посильный шаг на сегодня.",
      consult: "Можно запросить личную сессию с Андреем: €50 за 30 минут или €100 за 60 минут. Отправка запроса ещё не означает подтверждённую запись.",
      ideas: "В разделе «Идеи» можно получить символ И-цзин, афоризмы с источниками и найти книги для нового взгляда на ситуацию.",
    },
    goalActions: {
      understand: "Получить бесплатный разбор",
      tests: "Выбрать тесты",
      practice: "Открыть практики",
      consult: "Запросить сессию · от €50",
      ideas: "Открыть Идеи",
    },
    secondary: "Другой способ разобраться",
    privacyShort: "Только в этом браузере · Как работает",
    privacyDetail: "Текст вопроса остаётся в этом браузере, пока открыта страница. Он не передаётся на наш сервер, в CRM, аналитику или AI-провайдеру. Это тематический помощник для навигации, а не AI-терапевт и не живой консультант. При голосовом вводе браузер или операционная система могут обрабатывать звук через сервис распознавания речи. Микрофон включается только по вашему действию. Не вводите конфиденциальные данные.",
    voiceStart: "Продиктовать вопрос",
    voiceStop: "Остановить голосовой ввод",
    voiceError: "Голосовой ввод прервался. Попробуйте ещё раз или напишите вопрос.",
    voiceEmpty: "Речь не распознана. Нажмите микрофон ещё раз или напишите вопрос.",
    voiceDenied: "Доступ к микрофону запрещён. Разрешите его в настройках браузера или напишите вопрос.",
    voiceKeyboard: "Здесь диктовка недоступна. Используйте микрофон на клавиатуре или напишите вопрос.",
    voiceStarting: "Подключаю микрофон…",
    voiceListening: "Слушаю…",
    voiceFinishing: "Завершаю…",
    voiceCancel: "Отменить запись",
    voiceDone: "Завершить и отправить",
    voicePrivacy: "Нажмите ✓ для отправки · Распознавание может выполняться сервисом браузера.",

    urgent: "Мне жаль, что вам сейчас настолько тяжело. Помощник сайта не заменяет экстренную помощь. Если есть непосредственная опасность или риск причинить себе вред, обратитесь в местные экстренные службы или к близкому человеку, который может быть рядом. В Канаде и США можно позвонить или написать на 988.",
    limitation: "Подсказки помогают ориентироваться, но не являются диагнозом, лечением или обещанием результата.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ORIENTACIÓN PERSONAL",
    title: "¿Qué te preocupa hoy?",
    lead: "Pregunta por texto o voz. Encuentra tu próximo paso.",
    welcome: "¡Hola! Soy la guía del sitio Holistic House. Cuéntame qué te preocupa o elige un tema.",
    chatStatus: "Guía automática · sugerencias locales",
    openChat: "Abrir conversación",
    closeChat: "Cerrar conversación",
    starterHint: "Sin registro · Tus mensajes escritos permanecen aquí",
    moreWays: "Otras opciones",
    topicPrompt: {
      relationships: "¿Prefieres comprender la situación o probar una práctica sencilla?",
      stress: "¿Empezamos con una prueba gratuita o con una práctica para relajarte?",
      resources: "¿Te serviría más una práctica breve o revisar tus recursos personales?",
      work: "¿Te ayudaría más un curso, una prueba gratuita o una conversación personal?",
      direction: "¿Prefieres una reflexión, una revisión gratuita o una autoevaluación?",
    },
    question: "Tu pregunta o situación",
    placeholder: "Pregunta…",
    send: "Recibir orientación",
    reset: "Nueva conversación",
    askAgain: "Puedes continuar la conversación o preguntar otra cosa.",
    exampleLabel: "O elige un tema",
    examples: ["Estrés y ansiedad", "Relaciones", "Tomar una decisión"],
    topic: {
      relationships: "relaciones y conexión",
      stress: "estrés y calma interior",
      resources: "energía y recursos personales",
      work: "trabajo y decisiones",
      direction: "dirección y decisiones",
    },
    topics: "Parece que tu pregunta podría tratar sobre",
    unknown: "Gracias por compartirlo. No hace falta etiquetar tu situación para encontrar un primer paso.",
    followup: "¿Qué te ayudaría más ahora?",
    goalLabels: {
      understand: "Entender mi situación",
      tests: "Pruebas gratuitas",
      practice: "Práctica o curso",
      consult: "Hablar con un profesional",
      ideas: "Ideas e inspiración",
    },
    goalResponses: {
      understand: "Puedes empezar con una revisión escrita gratuita: un formulario breve y, si quieres, un dibujo. No es una llamada ni un diagnóstico.",
      tests: "Explora cuestionarios gratuitos de autoobservación. Los resultados no constituyen un diagnóstico médico.",
      practice: "La Academia ofrece clases y prácticas a tu ritmo. Empieza con un paso pequeño.",
      consult: "Puedes solicitar una sesión personal con Andrey: €50 por 30 minutos o €100 por 60 minutos. Una solicitud no confirma la reserva.",
      ideas: "En Ideas encontrarás símbolos del I Ching, aforismos con fuentes y libros para explorar otra perspectiva.",
    },
    goalActions: {
      understand: "Pedir revisión escrita gratis",
      tests: "Explorar pruebas gratuitas",
      practice: "Explorar prácticas",
      consult: "Solicitar sesión · desde €50",
      ideas: "Explorar Ideas",
    },
    secondary: "Otra opción para explorar",
    privacyShort: "Privado en este navegador · Cómo funciona",
    privacyDetail: "Tu texto permanece en este navegador mientras la página esté abierta. No se envía a nuestro servidor, CRM, analítica ni a un proveedor de IA. Esta guía local recomienda rutas por temas: no es una terapeuta de IA ni una conversación humana en directo. Si usas la voz, el navegador o sistema operativo puede enviar audio a su proveedor de reconocimiento. Solo activamos el micrófono cuando lo decides. Evita datos confidenciales.",
    voiceStart: "Dictar una pregunta",
    voiceStop: "Detener dictado",
    voiceError: "El dictado se interrumpió. Vuelve a intentarlo o escribe tu pregunta.",
    voiceEmpty: "No se reconocieron palabras. Toca el micrófono otra vez o escribe.",
    voiceDenied: "No se permitió usar el micrófono. Actívalo en el navegador o escribe.",
    voiceKeyboard: "El dictado no está disponible aquí. Usa el micrófono del teclado o escribe.",
    voiceStarting: "Conectando micrófono…",
    voiceListening: "Escuchando…",
    voiceFinishing: "Terminando…",
    voiceCancel: "Cancelar grabación",
    voiceDone: "Terminar y enviar",
    voicePrivacy: "Pulsa ✓ para enviar · El navegador puede procesar el audio.",

    urgent: "Lamento que estés pasando por esto. Esta guía no ofrece ayuda de emergencia. Si estás en peligro inmediato o piensas hacerte daño, contacta los servicios de emergencia locales o a alguien de confianza que pueda acompañarte. En Canadá y EE. UU. puedes llamar o enviar un mensaje al 988.",
    limitation: "Estas sugerencias sirven para orientarte; no son diagnósticos, tratamientos ni garantías.",
  },
};

const quickStartIcons = [Waves, Heart, Compass] as const;

export function HomeConversationGuide({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [context, setContext] = useState<Context | null>(null);
  const [recommendations, setRecommendations] = useState<HomeGuideOffer[]>([]);
  const [supportsVoice, setSupportsVoice] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceElapsed, setVoiceElapsed] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechEngine | null>(null);
  const voiceGenerationRef = useRef(0);
  const voiceBaseRef = useRef("");
  const voiceTextRef = useRef("");
  const voiceDiscardRef = useRef(false);
  const submitOnEndRef = useRef(false);
  const voiceStartedAtRef = useRef(0);
  const nextId = useRef(1);

  const closeDialog = useCallback(() => {
    // Closing must never silently submit an in-progress speech transcript.
    voiceDiscardRef.current = true;
    voiceGenerationRef.current += 1;
    const engine = speechRef.current;
    speechRef.current = null;
    try { if (engine?.abort) engine.abort(); else engine?.stop(); } catch { /* Already closed */ }
    setVoiceState("idle");
    setVoiceElapsed(0);
    setVoiceTranscript("");
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }));
    function onDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], textarea, summary'
      )).filter(item => item.getClientRects().length > 0);
      if (focusable.length === 0) { event.preventDefault(); dialogRef.current.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [isOpen, closeDialog]);

  useEffect(() => {
    if (isOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [isOpen, turns, context, recommendations]);

  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechConstructor;
      webkitSpeechRecognition?: SpeechConstructor;
    };
    setSupportsVoice(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
    return () => {
      voiceGenerationRef.current += 1;
      voiceDiscardRef.current = true;
      speechRef.current?.stop();
      speechRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (voiceState !== "listening") return;
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - voiceStartedAtRef.current) / 1000);
      setVoiceElapsed(elapsed);
      if (elapsed >= 60 && speechRef.current) {
        const engine = speechRef.current;
        const generation = voiceGenerationRef.current;
        submitOnEndRef.current = true;
        setVoiceState("finishing");
        try { engine.stop(); } catch { engine.onend?.(); }
        window.setTimeout(() => {
          if (generation === voiceGenerationRef.current && speechRef.current === engine) engine.onend?.();
        }, 2500);
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, [voiceState]);

  function appendExchange(question: string, answer: string) {
    const firstId = nextId.current;
    nextId.current += 2;
    const exchange: Turn[] = [
      { id: firstId, role: "visitor", text: question },
      { id: firstId + 1, role: "guide", text: answer },
    ];
    setTurns(current => [...current, ...exchange].slice(-8));
  }

  function ask(text: string) {
    const question = text.trim().slice(0, 500);
    if (!question) { questionRef.current?.focus(); return; }
    setIsOpen(true);
    // Both dictated and typed replies can answer the current contextual question.
    const replyId = matchHomeGuideReply(question, context);
    if (replyId && context && !context.urgent) {
      const selection = chooseHomeGuideOffer(context, replyId, context.lang);
      if (selection) {
        const next = homeGuideFollowup(selection.context);
        const response = selection.response?.[context.lang] ?? next?.prompt[context.lang] ?? copy[context.lang].followup;
        appendExchange(question, response);
        setContext(selection.context);
        setRecommendations(selection.offers);
        setDraft("");
        setVoiceError(null);
        return;
      }
    }
    const result = resolveHomeGuideQuestion(question, locale, context);
    const responseCopy = copy[result.lang];
    const followup = homeGuideFollowup(result);
    const answer = result.urgent
      ? responseCopy.urgent
      : followup?.prompt[result.lang] ?? responseCopy.unknown + " " + responseCopy.followup;
    appendExchange(question, answer);
    setContext(result);
    setRecommendations([]);
    setDraft("");
    setVoiceError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(draft);
  }

  function chooseGoal(choiceId: string) {
    if (!context || context.urgent) return;
    const active = homeGuideFollowup(context);
    const selected = active?.choices.find(choice => choice.id === choiceId);
    const result = chooseHomeGuideOffer(context, choiceId, context.lang);
    if (!selected || !result) return;
    const next = homeGuideFollowup(result.context);
    const answer = result.response?.[context.lang] ?? next?.prompt[context.lang] ?? copy[context.lang].followup;
    appendExchange(selected.label[context.lang], answer);
    setContext(result.context);
    setRecommendations(result.offers);
  }

  function finishVoice() {
    const engine = speechRef.current;
    if (!engine || voiceState === "finishing") return;
    submitOnEndRef.current = true;
    setVoiceState("finishing");
    try { engine.stop(); } catch { engine.onend?.(); }
    // Some iOS Safari versions never dispatch onend after an audio session.
    // Release the UI rather than showing a stuck microphone indefinitely.
    const generation = voiceGenerationRef.current;
    window.setTimeout(() => {
      if (generation === voiceGenerationRef.current && speechRef.current === engine) engine.onend?.();
    }, 2500);
  }

  function cancelVoice() {
    voiceDiscardRef.current = true;
    voiceGenerationRef.current += 1;
    const engine = speechRef.current;
    speechRef.current = null;
    try { if (engine?.abort) engine.abort(); else engine?.stop(); } catch { /* Already ended */ }
    setVoiceState("idle");
    setVoiceElapsed(0);
    setVoiceTranscript("");
    setVoiceError(null);
  }

  function toggleVoice() {
    if (voiceState !== "idle") { finishVoice(); return; }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechConstructor;
      webkitSpeechRecognition?: SpeechConstructor;
    };
    const Speech = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Speech) {
      setVoiceError(t.voiceKeyboard);
      window.requestAnimationFrame(() => questionRef.current?.focus());

      return;
    }
    // This runs synchronously inside the microphone click: required by mobile browsers.
    const engine = new Speech();
    const generation = ++voiceGenerationRef.current;
    voiceBaseRef.current = draft.trim();
    voiceTextRef.current = "";
    voiceDiscardRef.current = false;
    submitOnEndRef.current = false;
    setVoiceTranscript("");
    setVoiceElapsed(0);
    setVoiceError(null);
    voiceStartedAtRef.current = 0;
    engine.lang = locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-US";
    engine.interimResults = true;
    engine.continuous = true;
    engine.onstart = () => {
      if (voiceGenerationRef.current !== generation) return;
      voiceStartedAtRef.current = Date.now();
      setVoiceState("listening");
    };
    engine.onresult = (event) => {
      if (voiceGenerationRef.current !== generation) return;
      const words = Array.from(event.results, item => item[0]?.transcript || "").join(" ").replace(/\s+/g, " ").trim();
      voiceTextRef.current = words.slice(0, 500);
      setVoiceTranscript(voiceTextRef.current);
    };
    engine.onerror = (event) => {
      if (voiceGenerationRef.current !== generation || voiceDiscardRef.current) return;
      setVoiceError(event.error === "not-allowed" || event.error === "service-not-allowed" ? t.voiceDenied : t.voiceError);
    };
    engine.onend = () => {
      if (voiceGenerationRef.current !== generation) return;
      speechRef.current = null;
      setVoiceState("idle");
      setVoiceTranscript("");
      setVoiceElapsed(0);
      if (voiceDiscardRef.current) return;
      const spoken = voiceTextRef.current.trim();
      const complete = [voiceBaseRef.current, spoken].filter(Boolean).join(" ").slice(0, 500);
      if (spoken) {
        if (submitOnEndRef.current) ask(complete);
        else setDraft(complete); // Safari sometimes ends on a pause: let the visitor review.
      } else {
        setDraft(voiceBaseRef.current);
        setVoiceError(current => current || t.voiceEmpty);
      }
    };
    speechRef.current = engine;
    setVoiceState("starting");
    try { engine.start(); }
    catch {
      if (voiceGenerationRef.current !== generation) return;
      speechRef.current = null;
      setVoiceState("idle");
      setVoiceError(t.voiceError);
    }
    // A permission/service stall must not trap visitors in recording mode.
    window.setTimeout(() => {
      if (voiceGenerationRef.current === generation && speechRef.current === engine && voiceStartedAtRef.current === 0) {
        try { engine.abort?.(); } catch { /* Browser may already have stopped */ }
        engine.onend?.();
      }
    }, 12000);
  }

  function reset() {
    voiceDiscardRef.current = true;
    voiceGenerationRef.current += 1;
    speechRef.current?.stop();
    speechRef.current = null;
    setVoiceState("idle");
    setVoiceElapsed(0);
    setVoiceTranscript("");
    setContext(null);
    setRecommendations([]);
    setDraft("");
    setTurns([]);
    setVoiceError(null);
    questionRef.current?.focus();
  }

  const answerCopy = copy[context?.lang ?? locale];
  const followup = homeGuideFollowup(context);
  const recording = voiceState !== "idle";
  const recordingLabel = voiceState === "starting" ? t.voiceStarting : voiceState === "finishing" ? t.voiceFinishing : t.voiceListening;
  const voiceTime = `${String(Math.floor(voiceElapsed / 60)).padStart(2, "0")}:${String(voiceElapsed % 60).padStart(2, "0")}`;

  return (
    <section id="ask-holistic-house" className={styles.root} data-home-conversation-guide
      data-guide-phase={turns.length === 0 ? "ready" : "conversation"} aria-labelledby="home-guide-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="home-guide-title">{t.title}</h2>
        <p className={styles.lead}>{t.lead}</p>
        <div className={styles.scenery} aria-hidden="true" />
      </div>

      <div className={styles.entry} aria-hidden={isOpen}>
        <div className={styles.launcherRow}>
          <button type="button" ref={launcherRef} className={styles.launcher}
            data-home-guide-launcher aria-haspopup="dialog" aria-controls="home-guide-chat"
            aria-expanded={isOpen} aria-label={t.openChat} onClick={() => setIsOpen(true)}>
            <Sparkles size={19} aria-hidden="true" />
            <span>{t.placeholder}</span>
            <span className={styles.launcherGo}><ArrowRight size={19} aria-hidden="true" /></span>
          </button>
          <button type="button" className={styles.launchMic} data-home-guide-launcher-mic
            aria-label={supportsVoice ? t.voiceStart : t.voiceKeyboard}
            title={supportsVoice ? t.voiceStart : t.voiceKeyboard}
            onClick={() => { setIsOpen(true); toggleVoice(); }}>
            <Mic size={21} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.examples} aria-label={t.exampleLabel}>
          <span>{t.exampleLabel}</span>
          <div className={styles.quickChoices}>
            {t.examples.map((example, index) => {
              const Icon = quickStartIcons[index] ?? Compass;
              return (
                <button type="button" key={example} onClick={() => ask(example)}>
                  <Icon size={16} aria-hidden="true" /><span>{example}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className={styles.starterHint}><ShieldCheck size={13} aria-hidden="true" />{t.starterHint}</p>
      </div>

      {isOpen ? (
        <div className={styles.overlay} data-home-guide-overlay>
          <button type="button" className={styles.backdrop} tabIndex={-1}
            aria-label={t.closeChat} onClick={closeDialog} />
          <div id="home-guide-chat" className={styles.dialog} data-home-guide-dialog
            role="dialog" aria-modal="true" aria-labelledby="home-guide-chat-title"
            ref={dialogRef} tabIndex={-1}>
            <header className={styles.dialogHeader}>
              <span className={styles.avatar}><Sparkles size={21} aria-hidden="true" /></span>
              <div className={styles.chatIdentity}>
                <h3 id="home-guide-chat-title">Holistic House</h3>
                <p>{t.chatStatus}</p>
              </div>
              {turns.length > 0 ? (
                <button type="button" className={styles.headerAction} onClick={reset} aria-label={t.reset} title={t.reset}>
                  <RotateCcw size={18} aria-hidden="true" />
                </button>
              ) : null}
              <button type="button" className={styles.headerAction} onClick={closeDialog} aria-label={t.closeChat}>
                <X size={21} aria-hidden="true" />
              </button>
            </header>
            <div className={styles.chatScroll} ref={chatScrollRef}>
              <div className={styles.conversation}>
                <div className={styles.log} data-has-turns={turns.length > 0 ? "true" : "false"}
                  role="log" aria-live="polite" aria-label={t.title} aria-relevant="additions text">
                  {turns.length === 0 ? <p className={styles.guideBubble}>{t.welcome}</p> : null}
                  {turns.map(turn => (
                    <p key={turn.id} className={turn.role === "guide" ? styles.guideBubble : styles.visitorBubble}>{turn.text}</p>
                  ))}
                </div>

                {context && !context.urgent && recommendations.length === 0 && followup ? (
                  <div className={styles.choiceGroup}>
                    <p className={styles.choiceCaption}>{followup.prompt[context.lang]}</p>
                    <div className={styles.choices} role="group" aria-label={followup.prompt[context.lang]} data-home-guide-choices>
                      {followup.choices.slice(0, 3).map(choice => (
                        <button key={choice.id} type="button" className={styles.choice} onClick={() => chooseGoal(choice.id)}>
                          {choice.label[context.lang]}<ArrowRight size={16} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                    {followup.choices.length > 3 ? (
                      <details className={styles.extraChoices}>
                        <summary>{t.moreWays}</summary>
                        <div className={styles.choices}>
                          {followup.choices.slice(3).map(choice => (
                            <button key={choice.id} type="button" className={styles.choice} onClick={() => chooseGoal(choice.id)}>
                              {choice.label[context.lang]}<ArrowRight size={16} aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                ) : null}

                {context && !context.urgent && recommendations.length > 0 ? (
                  <div className={styles.result} data-home-guide-result>
                    {recommendations.map((offer, index) => (
                      <article key={offer.id} className={styles.offer} data-home-guide-offer={offer.id}>
                        <span className={styles.offerTag}>{index === 0
                          ? {en:"Suggested first step",ru:"Рекомендуем начать",es:"Primer paso sugerido"}[context.lang]
                          : {en:"Another option",ru:"Другой вариант",es:"Otra opción"}[context.lang]}</span>
                        <h3>{offer.title}</h3>
                        <p>{offer.benefit}</p>
                        <p className={styles.offerDetail}>{offer.detail}</p>
                        <Link href={offer.href} className={index === 0 ? styles.primaryAction : styles.secondaryAction} prefetch={false}>
                          {offer.action}<ArrowRight size={17} aria-hidden="true" />
                        </Link>
                      </article>
                    ))}
                    <button type="button" className={styles.changeChoice} data-home-guide-change
                      onClick={() => setRecommendations([])}>
                      {{en:"Change my answer",ru:"Изменить выбор",es:"Cambiar respuesta"}[context.lang]}
                    </button>
                    <p className={styles.limitation}>{answerCopy.limitation}</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.chatFooter}>
              <form className={styles.form} onSubmit={submit} aria-label={t.question}>
                {recording ? (
                  <div className={styles.recording} data-home-voice-recording role="group" aria-label={recordingLabel}>
                    <span className={styles.recordingDot} aria-hidden="true" />
                    <span className={styles.recordingMessage} aria-live="off">{voiceTranscript || recordingLabel}</span>
                    <span className={styles.recordingTime} aria-label={voiceTime}>{voiceTime}</span>
                    <button type="button" className={styles.cancelVoice} aria-label={t.voiceCancel} onClick={cancelVoice}>
                      <X size={19} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.finishVoice} aria-label={t.voiceDone}
                      onClick={finishVoice} disabled={voiceState === "finishing"}>
                      <Check size={21} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <>
                    <label className={styles.srOnly} htmlFor="home-guide-question">{t.question}</label>
                    <div className={styles.inputRow}>
                      <textarea id="home-guide-question" ref={questionRef} value={draft}
                        onChange={event => setDraft(event.currentTarget.value)}
                        onKeyDown={event => {
                          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        maxLength={500} rows={1} placeholder={t.placeholder}
                        autoComplete="off" aria-label={t.question} />
                      <button type="button" className={styles.voiceButton}
                        aria-label={supportsVoice ? t.voiceStart : t.voiceKeyboard}
                        title={supportsVoice ? t.voiceStart : t.voiceKeyboard}
                        onClick={toggleVoice}><Mic size={20} aria-hidden="true" /></button>
                      <button type="submit" className={styles.sendButton} aria-label={t.send} disabled={!draft.trim()}>
                        <Send size={19} aria-hidden="true" />
                      </button>
                    </div>
                  </>
                )}
              </form>
              {recording ? <p className={styles.voiceNotice}>{t.voicePrivacy}</p> : null}
              {voiceError ? <p className={styles.error} role="alert">{voiceError}</p> : null}
              <details className={styles.privacy}>
                <summary><ShieldCheck size={14} aria-hidden="true" />{t.privacyShort}</summary>
                <p>{t.privacyDetail}</p>
              </details>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
