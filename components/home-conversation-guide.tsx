"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Compass, Mic, MicOff, RotateCcw, Send, ShieldCheck, Sparkles } from "lucide-react";

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
type SpeechEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechEngine = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechConstructor = new () => SpeechEngine;

type GuideCopy = {
  eyebrow: string;
  title: string;
  lead: string;
  welcome: string;
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
  urgent: string;
  limitation: string;
};

const copy: Record<PublicLocale, GuideCopy> = {
  en: {
    eyebrow: "HOLISTIC HOUSE · YOUR STARTING POINT",
    title: "What's on your mind?",
    lead: "Tell us what's happening. We'll ask one more question and help you find a useful next step.",
    welcome: "Hello, I'm your Holistic House site guide. What would you like to explore today?",
    question: "Your question or situation",
    placeholder: "I want to understand what to do about…",
    send: "Let's talk",
    reset: "Start over",
    askAgain: "You can continue the conversation or ask something else.",
    exampleLabel: "Or start with",
    examples: ["I'm feeling stressed", "A relationship is difficult", "I need to make a decision", "I want to grow or learn"],
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
    privacyShort: "Private text · How this guide works",
    privacyDetail: "Your typed question stays in this browser while the page is open. It is not sent to our server, CRM, analytics or an AI provider. This is a local topic-based guide, not an AI therapist or a real-time human conversation. If you choose voice input, your browser or operating system may process audio through its speech recognition provider. You decide whether to enable the microphone. Do not include confidential personal details.",
    voiceStart: "Dictate a question with microphone",
    voiceStop: "Stop voice input",
    voiceError: "Speech recognition isn't available right now. Please type your question instead.",
    urgent: "I'm sorry you're facing this. A website guide can't provide emergency help. If you may be in immediate danger or might hurt yourself, contact local emergency services now or reach a trusted person who can stay with you. In Canada and the US you can call or text 988 for suicide crisis support.",
    limitation: "Suggestions are for reflection and navigation, not a diagnosis, treatment or promised result.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · НАЧНЁМ С РАЗГОВОРА",
    title: "Что сейчас вас волнует?",
    lead: "Расскажите о ситуации. Я задам уточняющий вопрос и помогу выбрать первый шаг.",
    welcome: "Здравствуйте! Я помощник сайта Holistic House. С чем хотите разобраться сегодня?",
    question: "Ваш вопрос или ситуация",
    placeholder: "Хочу разобраться, что делать с…",
    send: "Обсудить",
    reset: "Новый разговор",
    askAgain: "Можно продолжить разговор или задать другой вопрос.",
    exampleLabel: "Или выберите тему",
    examples: ["Я тревожусь и устаю", "Сложности в отношениях", "Не могу принять решение", "Хочу развиваться и учиться"],
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
    privacyShort: "Ваш вопрос приватен · Как это работает",
    privacyDetail: "Текст вопроса остаётся в этом браузере, пока открыта страница. Он не передаётся на наш сервер, в CRM, аналитику или AI-провайдеру. Это тематический помощник для навигации, а не AI-терапевт и не живой консультант. При голосовом вводе браузер или операционная система могут обрабатывать звук через сервис распознавания речи. Микрофон включается только по вашему действию. Не вводите конфиденциальные данные.",
    voiceStart: "Продиктовать вопрос",
    voiceStop: "Остановить голосовой ввод",
    voiceError: "Распознавание речи сейчас недоступно. Напишите вопрос текстом.",
    urgent: "Мне жаль, что вам сейчас настолько тяжело. Помощник сайта не заменяет экстренную помощь. Если есть непосредственная опасность или риск причинить себе вред, обратитесь в местные экстренные службы или к близкому человеку, который может быть рядом. В Канаде и США можно позвонить или написать на 988.",
    limitation: "Подсказки помогают ориентироваться, но не являются диагнозом, лечением или обещанием результата.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · EMPIEZA CON UNA CONVERSACIÓN",
    title: "¿Qué te preocupa hoy?",
    lead: "Cuéntanos qué pasa. Haremos una pregunta más para ayudarte a encontrar tu próximo paso.",
    welcome: "¡Hola! Soy la guía de Holistic House. ¿Sobre qué te gustaría conversar?",
    question: "Tu pregunta o situación",
    placeholder: "Quiero entender qué hacer con…",
    send: "Conversemos",
    reset: "Nueva conversación",
    askAgain: "Puedes continuar la conversación o preguntar otra cosa.",
    exampleLabel: "O elige un tema",
    examples: ["Me siento con ansiedad", "Problemas en una relación", "Necesito tomar una decisión", "Quiero aprender y crecer"],
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
    privacyShort: "Texto privado · Cómo funciona",
    privacyDetail: "Tu texto permanece en este navegador mientras la página esté abierta. No se envía a nuestro servidor, CRM, analítica ni a un proveedor de IA. Esta guía local recomienda rutas por temas: no es una terapeuta de IA ni una conversación humana en directo. Si usas la voz, el navegador o sistema operativo puede enviar audio a su proveedor de reconocimiento. Solo activamos el micrófono cuando lo decides. Evita datos confidenciales.",
    voiceStart: "Dictar una pregunta",
    voiceStop: "Detener dictado",
    voiceError: "El reconocimiento de voz no está disponible. Escribe tu pregunta.",
    urgent: "Lamento que estés pasando por esto. Esta guía no ofrece ayuda de emergencia. Si estás en peligro inmediato o piensas hacerte daño, contacta los servicios de emergencia locales o a alguien de confianza que pueda acompañarte. En Canadá y EE. UU. puedes llamar o enviar un mensaje al 988.",
    limitation: "Estas sugerencias sirven para orientarte; no son diagnósticos, tratamientos ni garantías.",
  },
};

export function HomeConversationGuide({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [context, setContext] = useState<Context | null>(null);
  const [goal, setGoal] = useState<HomeGuideGoal | null>(null);
  const [supportsVoice, setSupportsVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const speechRef = useRef<SpeechEngine | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechConstructor;
      webkitSpeechRecognition?: SpeechConstructor;
    };
    setSupportsVoice(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
    return () => { speechRef.current?.stop(); };
  }, []);

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
    const result = resolveHomeGuideQuestion(question, locale);
    const responseCopy = copy[result.lang];
    const answer = result.urgent
      ? responseCopy.urgent
      : (result.matched && result.topic
        ? responseCopy.topics + " «" + responseCopy.topic[result.topic] + "». "
        : responseCopy.unknown + " ") + responseCopy.followup;
    appendExchange(question, answer);
    setContext(result);
    setGoal(null);
    setDraft("");
    setVoiceError(false);
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

  function toggleVoice() {
    if (listening) {
      speechRef.current?.stop();
      setListening(false);
      return;
    }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechConstructor;
      webkitSpeechRecognition?: SpeechConstructor;
    };
    const Speech = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Speech) { setVoiceError(true); return; }
    const engine = new Speech();
    engine.lang = locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-US";
    engine.interimResults = false;
    engine.continuous = false;
    engine.onresult = (event) => {
      const words = event.results[0]?.[0]?.transcript?.trim();
      if (words) setDraft(current => (current.trim() ? current.trim() + " " : "") + words);
      questionRef.current?.focus();
    };
    engine.onerror = () => setVoiceError(true);
    engine.onend = () => { setListening(false); speechRef.current = null; };
    speechRef.current = engine;
    setVoiceError(false);
    try { engine.start(); setListening(true); }
    catch { speechRef.current = null; setListening(false); setVoiceError(true); }
  }

  function reset() {
    speechRef.current?.stop();
    setListening(false);
    setContext(null);
    setGoal(null);
    setDraft("");
    setTurns([]);
    setVoiceError(false);
    questionRef.current?.focus();
  }

  const answerCopy = copy[context?.lang ?? locale];
  const links = context && goal && !context.urgent
    ? homeGuideDestinations({ goal, topic: context.topic, locale })
    : null;

  return (
    <section id="ask-holistic-house" className={styles.root} data-home-conversation-guide aria-labelledby="home-guide-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="home-guide-title">{t.title}</h2>
        <p className={styles.lead}>{t.lead}</p>
        <div className={styles.scenery} aria-hidden="true" />
      </div>
      <div className={styles.conversation}>
        <div className={styles.log} role="log" aria-live="polite" aria-label={t.title} aria-relevant="additions text">
          {turns.length === 0 ? <p className={styles.guideBubble}>{t.welcome}</p> : null}
          {turns.map(turn => (
            <p key={turn.id} className={turn.role === "guide" ? styles.guideBubble : styles.visitorBubble}>{turn.text}</p>
          ))}
        </div>

        {context && !context.urgent && goal === null ? (
          <div className={styles.choices} role="group" aria-label={answerCopy.followup} data-home-guide-choices>
            {homeGuideGoals.map(value => (
              <button key={value} type="button" className={styles.choice} onClick={() => chooseGoal(value)}>
                {answerCopy.goalLabels[value]}
              </button>
            ))}
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

        {turns.length === 0 ? (
          <div className={styles.examples} aria-label={t.exampleLabel}>
            <span>{t.exampleLabel}</span>
            {t.examples.map(example => (
              <button type="button" key={example} onClick={() => ask(example)}>{example}</button>
            ))}
          </div>
        ) : (
          <div className={styles.restart}>
            <span>{answerCopy.askAgain}</span>
            <button type="button" onClick={reset}><RotateCcw size={13} aria-hidden="true" />{t.reset}</button>
          </div>
        )}

        <form className={styles.form} onSubmit={submit} aria-label={t.question}>
          <label className={styles.srOnly} htmlFor="home-guide-question">{t.question}</label>
          <textarea
            id="home-guide-question"
            ref={questionRef}
            value={draft}
            onChange={event => setDraft(event.currentTarget.value)}
            maxLength={500}
            rows={1}
            placeholder={t.placeholder}
            autoComplete="off"
            aria-label={t.question}
          />
          {supportsVoice ? (
            <button
              type="button" className={styles.voiceButton}
              aria-label={listening ? t.voiceStop : t.voiceStart}
              aria-pressed={listening}
              title={listening ? t.voiceStop : t.voiceStart}
              onClick={toggleVoice}
            >{listening ? <MicOff size={19} aria-hidden="true" /> : <Mic size={19} aria-hidden="true" />}</button>
          ) : null}
          <button type="submit" className={styles.sendButton} aria-label={t.send} disabled={!draft.trim()}>
            <Send size={18} aria-hidden="true" />
            <span>{t.send}</span>
          </button>
        </form>
        {voiceError ? <p className={styles.error} role="alert">{t.voiceError}</p> : null}
        <details className={styles.privacy}>
          <summary><ShieldCheck size={14} aria-hidden="true" />{t.privacyShort}</summary>
          <p>{t.privacyDetail}</p>
        </details>
      </div>
    </section>
  );
}
