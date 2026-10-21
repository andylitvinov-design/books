"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUp, Check, Compass, Heart, Mic, RotateCcw, ShieldCheck, Sparkles, Waves, X } from "lucide-react";

import {
  homeGuideDestinations,
  homeGuideGoals,
  resolveHomeGuideQuestion,
  type HomeGuideGoal,
} from "@/lib/home-conversation.mjs";
import type { IdeasTopic } from "@/lib/ideas-guidance.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-conversation-guide.module.css";

type Turn = { id: number; role: "visitor" | "guide"; text: string };
type Context = {
  lang: PublicLocale;
  topic: IdeasTopic | null;
  matched: boolean;
  urgent: boolean;
};
type SpeechEvent = { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> };
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
  voiceUnresponsive: string;
  voiceKeyboardAction: string;
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
    voiceKeyboard: "Voice dictation is not supported here. Open your keyboard and tap its microphone, or type.",
    voiceStarting: "Connecting microphone…",
    voiceListening: "Listening…",
    voiceFinishing: "Finishing…",
    voiceCancel: "Cancel recording",
    voiceDone: "Finish and send",
    voicePrivacy: "Microphone starts on tap. Your voice isn't stored by this site; your browser may use its speech provider.",
    voiceUnresponsive: "Speech recognition isn't responding. Use the keyboard microphone or type your question.",
    voiceKeyboardAction: "Open keyboard",

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
    voiceKeyboard: "Здесь диктовка недоступна. Откройте клавиатуру и нажмите её микрофон или напишите вопрос.",
    voiceStarting: "Подключаю микрофон…",
    voiceListening: "Слушаю…",
    voiceFinishing: "Завершаю…",
    voiceCancel: "Отменить запись",
    voiceDone: "Завершить и отправить",
    voicePrivacy: "Микрофон включается по нажатию. Сайт не хранит аудио; браузер может использовать свой сервис распознавания.",
    voiceUnresponsive: "Распознавание не отвечает. Используйте диктовку с клавиатуры iPhone или напишите вопрос.",
    voiceKeyboardAction: "Открыть клавиатуру",

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
    voiceKeyboard: "El dictado no está disponible aquí. Abre el teclado y toca su micrófono, o escribe.",
    voiceStarting: "Conectando micrófono…",
    voiceListening: "Escuchando…",
    voiceFinishing: "Terminando…",
    voiceCancel: "Cancelar grabación",
    voiceDone: "Terminar y enviar",
    voicePrivacy: "El micrófono se inicia al tocarlo. El sitio no guarda el audio; tu navegador puede procesar la voz.",
    voiceUnresponsive: "El dictado no responde. Usa el micrófono del teclado o escribe tu pregunta.",
    voiceKeyboardAction: "Abrir teclado",

    urgent: "Lamento que estés pasando por esto. Esta guía no ofrece ayuda de emergencia. Si estás en peligro inmediato o piensas hacerte daño, contacta los servicios de emergencia locales o a alguien de confianza que pueda acompañarte. En Canadá y EE. UU. puedes llamar o enviar un mensaje al 988.",
    limitation: "Estas sugerencias sirven para orientarte; no son diagnósticos, tratamientos ni garantías.",
  },
};

const quickStartIcons = [Waves, Heart, Compass] as const;

// Offer choices stay limited to three relevant options in the chat; the other
// existing routes remain explicitly available via "Other options".
const goalSuggestions: Record<IdeasTopic, HomeGuideGoal[]> = {
  relationships: ["understand", "practice", "consult"],
  stress: ["tests", "practice", "understand"],
  resources: ["practice", "tests", "understand"],
  work: ["practice", "tests", "consult"],
  direction: ["understand", "ideas", "tests"],
};

export function HomeConversationGuide({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [context, setContext] = useState<Context | null>(null);
  const [goal, setGoal] = useState<HomeGuideGoal | null>(null);
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
  const voiceFinalRef = useRef(false);
  const voiceFailureRef = useRef(false);
  const voiceStartTimerRef = useRef<number | null>(null);
  const voiceProgressTimerRef = useRef<number | null>(null);
  const voiceStopTimerRef = useRef<number | null>(null);
  const nextId = useRef(1);

  const closeDialog = useCallback(() => {
    // Closing must never silently submit an in-progress speech transcript.
    voiceDiscardRef.current = true;
    voiceGenerationRef.current += 1;
    for (const ref of [voiceStartTimerRef, voiceProgressTimerRef, voiceStopTimerRef]) {
      if (ref.current !== null) window.clearTimeout(ref.current);
      ref.current = null;
    }
    const engine = speechRef.current;
    speechRef.current = null;
    try { if (engine?.abort) engine.abort(); else engine?.stop(); } catch { /* Already closed */ }
    setVoiceError(null);
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
  }, [isOpen, turns, context, goal]);

  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechConstructor;
      webkitSpeechRecognition?: SpeechConstructor;
    };
    setSupportsVoice(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
    const shutdown = (restoreUi: boolean) => {
      voiceGenerationRef.current += 1;
      voiceDiscardRef.current = true;
      for (const ref of [voiceStartTimerRef, voiceProgressTimerRef, voiceStopTimerRef]) {
        if (ref.current !== null) window.clearTimeout(ref.current);
        ref.current = null;
      }
      const engine = speechRef.current;
      speechRef.current = null;
      try { if (engine?.abort) engine.abort(); else engine?.stop(); } catch { /* Browser already closed */ }
      if (restoreUi) {
        setVoiceState("idle");
        setVoiceElapsed(0);
        setVoiceTranscript("");
      }
    };
    const onPageHide = () => shutdown(true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      shutdown(false);
    };
  }, []);

  useEffect(() => {
    if (voiceState !== "listening") return;
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - voiceStartedAtRef.current) / 1000);
      setVoiceElapsed(Math.max(0, elapsed));
      if (elapsed >= 60 && speechRef.current) {
        const engine = speechRef.current;
        const generation = voiceGenerationRef.current;
        submitOnEndRef.current = true;
        setVoiceState("finishing");
        if (voiceProgressTimerRef.current !== null) window.clearTimeout(voiceProgressTimerRef.current);
        voiceProgressTimerRef.current = null;
        try { engine.stop(); } catch { engine.onend?.(); }
        if (speechRef.current === engine) {
          voiceStopTimerRef.current = window.setTimeout(() => {
            if (generation !== voiceGenerationRef.current || speechRef.current !== engine) return;
            try { engine.abort?.(); } catch { /* Already stopped */ }
            engine.onend?.();
          }, 2500);
        }
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
    const result = resolveHomeGuideQuestion(question, locale);
    const responseCopy = copy[result.lang];
    const answer = result.urgent
      ? responseCopy.urgent
      : result.matched && result.topic
        ? responseCopy.topicPrompt[result.topic]
        : responseCopy.unknown + " " + responseCopy.followup;
    appendExchange(question, answer);
    setContext(result);
    setGoal(null);
    setDraft("");
    setVoiceError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(draft);
  }

  function chooseGoal(value: HomeGuideGoal) {
    if (!context || context.urgent) return;
    const responseCopy = copy[context.lang];
    appendExchange(responseCopy.goalLabels[value], responseCopy.goalResponses[value]);
    setGoal(value);
  }

  // Browser speech recognition does not guarantee onend/onerror on iOS Safari.
  // Every recording needs finite deadlines and an explicit, privacy-safe fallback.
  function clearVoiceTimers() {
    for (const ref of [voiceStartTimerRef, voiceProgressTimerRef, voiceStopTimerRef]) {
      if (ref.current !== null) {
        window.clearTimeout(ref.current);
        ref.current = null;
      }
    }
  }

  function finishVoice() {
    const engine = speechRef.current;
    if (!engine || voiceState === "finishing") return;
    submitOnEndRef.current = true;
    setVoiceState("finishing");
    if (voiceStartTimerRef.current !== null) window.clearTimeout(voiceStartTimerRef.current);
    if (voiceProgressTimerRef.current !== null) window.clearTimeout(voiceProgressTimerRef.current);
    voiceStartTimerRef.current = null;
    voiceProgressTimerRef.current = null;
    try { engine.stop(); } catch { engine.onend?.(); }
    // iOS Safari can leave stop() pending forever, particularly after video playback.
    const generation = voiceGenerationRef.current;
    if (speechRef.current === engine) {
      voiceStopTimerRef.current = window.setTimeout(() => {
        if (generation !== voiceGenerationRef.current || speechRef.current !== engine) return;
        try { engine.abort?.(); } catch { /* Already stopped */ }
        engine.onend?.();
      }, 2500);
    }
  }

  function cancelVoice() {
    voiceDiscardRef.current = true;
    voiceGenerationRef.current += 1; // Ignore late Safari callbacks from a cancelled session.
    clearVoiceTimers();
    const engine = speechRef.current;
    speechRef.current = null;
    try { if (engine?.abort) engine.abort(); else engine?.stop(); } catch { /* Already stopped */ }
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
      questionRef.current?.focus();
      return;
    }
    let engine: SpeechEngine;
    try { engine = new Speech(); }
    catch {
      setVoiceError(t.voiceKeyboard);
      questionRef.current?.focus();
      return;
    }

    // start() MUST be called synchronously by the microphone tap on iPhone.
    const generation = ++voiceGenerationRef.current;
    voiceBaseRef.current = draft.trim();
    voiceTextRef.current = "";
    voiceFinalRef.current = false;
    voiceFailureRef.current = false;
    voiceDiscardRef.current = false;
    submitOnEndRef.current = false;
    clearVoiceTimers();
    setVoiceTranscript("");
    setVoiceElapsed(0);
    setVoiceError(null);
    voiceStartedAtRef.current = 0;
    engine.lang = locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-US";
    engine.interimResults = true;
    // iOS WebKit has known long-running/restart bugs; prefer a short utterance.
    const isIosWebKit = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    engine.continuous = !isIosWebKit;

    const sessionIsCurrent = () =>
      voiceGenerationRef.current === generation && speechRef.current === engine;

    const failUnresponsive = () => {
      if (!sessionIsCurrent()) return;
      voiceFailureRef.current = true;
      setVoiceError(t.voiceUnresponsive);
      try { engine.abort?.(); } catch { /* Browser service may be hung */ }
      engine.onend?.();
    };

    const armProgressWatchdog = () => {
      if (voiceProgressTimerRef.current !== null) window.clearTimeout(voiceProgressTimerRef.current);
      voiceProgressTimerRef.current = window.setTimeout(failUnresponsive, 18000);
    };

    engine.onstart = () => {
      if (!sessionIsCurrent()) return;
      if (voiceStartTimerRef.current !== null) window.clearTimeout(voiceStartTimerRef.current);
      voiceStartTimerRef.current = null;
      voiceStartedAtRef.current = Date.now();
      if (!submitOnEndRef.current) setVoiceState("listening");
      armProgressWatchdog();
    };
    engine.onresult = (event) => {
      if (!sessionIsCurrent()) return;
      // WebKit sometimes emits a result without first emitting onstart.
      if (!voiceStartedAtRef.current) {
        voiceStartedAtRef.current = Date.now();
        if (!submitOnEndRef.current) setVoiceState("listening");
      }
      if (voiceStartTimerRef.current !== null) window.clearTimeout(voiceStartTimerRef.current);
      voiceStartTimerRef.current = null;
      const results = Array.from(event.results);
      const words = results.map(item => item[0]?.transcript || "")
        .join(" ").replace(/\s+/g, " ").trim().slice(0, 500);
      if (words) {
        voiceTextRef.current = words;
        voiceFinalRef.current = results.length > 0 && results.every(item => item.isFinal === true);
        setVoiceTranscript(words);
        armProgressWatchdog();
      }
    };
    engine.onerror = (event) => {
      if (!sessionIsCurrent() || voiceDiscardRef.current) return;
      if (event.error === "aborted" && (submitOnEndRef.current || voiceFailureRef.current)) return;
      voiceFailureRef.current = true;
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setVoiceError(denied ? t.voiceDenied : event.error === "no-speech" ? t.voiceEmpty : t.voiceError);
      try { engine.abort?.(); } catch { /* Browser may already be disconnected */ }
      if (sessionIsCurrent()) {
        if (voiceStopTimerRef.current !== null) window.clearTimeout(voiceStopTimerRef.current);
        voiceStopTimerRef.current = window.setTimeout(() => engine.onend?.(), 400);
      }
    };
    engine.onend = () => {
      if (!sessionIsCurrent()) return;
      clearVoiceTimers();
      speechRef.current = null;
      setVoiceState("idle");
      setVoiceTranscript("");
      setVoiceElapsed(0);
      if (voiceDiscardRef.current) return;
      const spoken = voiceTextRef.current.trim();
      const complete = [voiceBaseRef.current, spoken].filter(Boolean).join(" ").slice(0, 500);
      if (spoken) {
        // Explicit finish or natural end of a final utterance: no second Send tap.
        // Interrupted/incomplete speech remains editable, never silently submitted.
        if (!voiceFailureRef.current && (submitOnEndRef.current || voiceFinalRef.current)) ask(complete);
        else setDraft(complete);
      } else {
        setDraft(voiceBaseRef.current);
        if (!voiceFailureRef.current) setVoiceError(current => current || t.voiceEmpty);
      }
    };

    speechRef.current = engine;
    setVoiceState("starting");
    // Allow time for an iOS permission sheet; still recover if WebKit never starts.
    voiceStartTimerRef.current = window.setTimeout(failUnresponsive, 25000);
    try { engine.start(); }
    catch {
      if (!sessionIsCurrent()) return;
      clearVoiceTimers();
      speechRef.current = null;
      setVoiceState("idle");
      setVoiceError(t.voiceKeyboard);
      questionRef.current?.focus();
    }
  }

  function reset() {
    cancelVoice();
    setContext(null);
    setGoal(null);
    setDraft("");
    setTurns([]);
    questionRef.current?.focus();
  }

  const answerCopy = copy[context?.lang ?? locale];
  const links = context && goal && !context.urgent
    ? homeGuideDestinations({ goal, topic: context.topic, locale })
    : null;
  const recording = voiceState !== "idle";
  const recordingLabel = voiceState === "starting" ? t.voiceStarting : voiceState === "finishing" ? t.voiceFinishing : t.voiceListening;
  const voiceTime = `${String(Math.floor(voiceElapsed / 60)).padStart(2, "0")}:${String(voiceElapsed % 60).padStart(2, "0")}`;
  const recommendedGoals: HomeGuideGoal[] = context?.topic
    ? goalSuggestions[context.topic]
    : ["understand", "tests", "practice"];

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

                {context && !context.urgent && goal === null ? (
                  <div className={styles.choiceGroup}>
                    <p className={styles.choiceCaption}>{answerCopy.followup}</p>
                    <div className={styles.choices} role="group" aria-label={answerCopy.followup} data-home-guide-choices>
                      {recommendedGoals.map(value => (
                        <button key={value} type="button" className={styles.choice} onClick={() => chooseGoal(value)}>
                          {answerCopy.goalLabels[value]}<ArrowRight size={16} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                    <details className={styles.extraChoices}>
                      <summary>{t.moreWays}</summary>
                      <div className={styles.choices}>
                        {homeGuideGoals.filter(value => !recommendedGoals.includes(value)).map(value => (
                          <button key={value} type="button" className={styles.choice} onClick={() => chooseGoal(value)}>
                            {answerCopy.goalLabels[value]}<ArrowRight size={16} aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : null}

                {links && goal ? (
                  <div className={styles.result} data-home-guide-result>
                    <Link href={links.primary} className={styles.primaryAction} prefetch={false}>
                      {answerCopy.goalActions[goal]}<ArrowRight size={17} aria-hidden="true" />
                    </Link>
                    <Link href={links.secondary} className={styles.secondaryAction} prefetch={false}>
                      <Compass size={15} aria-hidden="true" />{answerCopy.secondary}<ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <p className={styles.limitation}>{answerCopy.limitation}</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.chatFooter}>
              <form className={styles.form} onSubmit={submit} aria-label={t.question}>
                {recording ? (
                  <div className={styles.recording} data-home-voice-recording data-voice-state={voiceState} role="group" aria-label={recordingLabel}>
                    <span className={styles.recordingDot} data-state={voiceState} aria-hidden="true" />
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
                        <ArrowUp size={20} aria-hidden="true" />
                      </button>
                    </div>
                  </>
                )}
              </form>
              {recording ? <p className={styles.voiceNotice}>{t.voicePrivacy}</p> : null}
              {voiceError ? (
                <div className={styles.voiceRecovery} role="alert">
                  <p className={styles.error}>{voiceError}</p>
                  <button type="button" onClick={() => questionRef.current?.focus()}>{t.voiceKeyboardAction}</button>
                </div>
              ) : null}
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
