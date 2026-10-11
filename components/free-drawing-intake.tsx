"use client";

import { useEffect, useId, useState } from "react";
import { ArrowUpRight, Check, ClipboardCopy, FileText, PenLine, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import styles from "./free-drawing-intake.module.css";

type Topic = "personal" | "goal" | "business" | "wellbeing";
const topics: Topic[] = ["personal", "goal", "business", "wellbeing"];
const phone = "14376066502";

const copy = {
  en: {
    eyebrow: "FREE DRAWING-BASED SITUATION ASSESSMENT",
    title: "Send your question and drawing",
    lead: "This is not a free live call. Complete the short coaching questionnaire, draw your situation by hand, and send both to Andrey. He reviews them and sends a personal written report.",
    topicQuestion: "What is your question about?",
    topicLabel: "Topic",
    options: { personal: "Personal situation", goal: "Goal or decision", business: "Work or business", wellbeing: "Wellbeing or energy" },
    question1: "What is the problem or situation?",
    question2: "What goal or change would you like?",
    question3: "What seems to be blocking you? (optional)",
    question4: "What have you already tried? (optional)",
    placeholder1: "Briefly describe what is happening and why it matters.",
    placeholder2: "Describe what you would like to achieve or understand.",
    placeholder3: "What feels difficult or repetitive?",
    placeholder4: "Steps or approaches you have already taken.",
    drawingTitle: "Draw on paper with a pen",
    drawingText: "On one sheet, draw three elements in any way that feels natural: ME, MY GOAL and MY PROBLEM. Take a clear photo of your drawing. Do not use a digital illustration.",
    drawLabels: ["ME", "MY GOAL", "MY PROBLEM"],
    prepare: "Prepare my coaching answers",
    ready: "Your coaching answers are ready",
    copyButton: "Copy answers",
    copied: "Copied — paste them into WhatsApp",
    copyFallback: "Select and copy the text below, then paste it into WhatsApp.",
    openWhatsapp: "Copy answers & open WhatsApp",
    sendNote: "Paste the copied answers and attach your drawing photo. If copying was blocked, use Copy answers here. Nothing is sent automatically.",
    privacy: "This page does not upload or store your answers or drawing. You choose what to send in WhatsApp. The written report is a symbolic situation review, not a medical or mental-health diagnosis.",
    questionLabel: "Coaching questionnaire — free drawing assessment",
    request: "Request: Please review my coaching answers and handwritten drawing (ME / MY GOAL / MY PROBLEM) and send me a personal written report.",
    whatsappIntro: "Hello Andrey. I am requesting the FREE drawing-based situation assessment. I will paste my coaching questionnaire and attach a photo of my handwritten drawing. Please send me the written report.",
    problemField: "Situation / problem",
    goalField: "Desired goal",
    obstacleField: "Perceived obstacle",
    triedField: "Previous attempts",
  },
  ru: {
    eyebrow: "БЕСПЛАТНАЯ ДИАГНОСТИКА СИТУАЦИИ ПО РИСУНКУ",
    title: "Опишите запрос и сделайте рисунок",
    lead: "Это не бесплатный созвон. Заполните короткую коучинг-форму, нарисуйте ситуацию от руки и отправьте оба материала Андрею. Он анализирует их и присылает персональный письменный отчёт.",
    topicQuestion: "К какой теме относится ваш запрос?",
    topicLabel: "Тема",
    options: { personal: "Личная ситуация", goal: "Цель или решение", business: "Работа и бизнес", wellbeing: "Самочувствие и ресурс" },
    question1: "В чём проблема или ситуация?",
    question2: "Какую цель или изменение вы хотите?",
    question3: "Что, по вашему ощущению, мешает? (необязательно)",
    question4: "Что уже пробовали? (необязательно)",
    placeholder1: "Кратко опишите, что происходит и почему это важно.",
    placeholder2: "Что вы хотите получить или понять?",
    placeholder3: "Что повторяется или создаёт трудности?",
    placeholder4: "Какие шаги уже предпринимали?",
    drawingTitle: "Нарисуйте от руки ручкой",
    drawingText: "На одном листе изобразите три элемента так, как вам подсказывает ощущение: Я, МОЯ ЦЕЛЬ и МОЯ ПРОБЛЕМА. Чётко сфотографируйте рисунок. Это рисунок ручкой на бумаге, не цифровая картинка.",
    drawLabels: ["Я", "МОЯ ЦЕЛЬ", "МОЯ ПРОБЛЕМА"],
    prepare: "Подготовить ответы анкеты",
    ready: "Ответы коучинг-формы готовы",
    copyButton: "Скопировать ответы",
    copied: "Скопировано — вставьте в WhatsApp",
    copyFallback: "Выделите и скопируйте текст ниже, затем вставьте его в WhatsApp.",
    openWhatsapp: "Скопировать ответы и открыть WhatsApp",
    sendNote: "Вставьте скопированные ответы и фото рисунка. Если копирование заблокировано, вернитесь к кнопке «Скопировать ответы». Автоматически ничего не отправляется.",
    privacy: "Страница не загружает и не хранит ваши ответы и рисунок. Вы сами выбираете, что отправить через WhatsApp. Отчёт — символический разбор ситуации, а не медицинский или психиатрический диагноз.",
    questionLabel: "Коучинг-форма — бесплатная диагностика по рисунку",
    request: "Запрос: прошу провести диагностику по моим ответам и рисунку (Я / МОЯ ЦЕЛЬ / МОЯ ПРОБЛЕМА) и прислать персональный письменный отчёт.",
    whatsappIntro: "Здравствуйте, Андрей! Хочу получить БЕСПЛАТНУЮ диагностику ситуации по рисунку. Отправлю ответы коучинг-формы и фотографию рисунка от руки. Прошу прислать письменный отчёт.",
    problemField: "Ситуация / проблема",
    goalField: "Желаемая цель",
    obstacleField: "Предполагаемое препятствие",
    triedField: "Что уже предпринимали",
  },
  es: {
    eyebrow: "EVALUACIÓN GRATUITA DE TU SITUACIÓN MEDIANTE UN DIBUJO",
    title: "Describe tu situación y haz un dibujo",
    lead: "No es una llamada gratuita. Completa el breve formulario de coaching, dibuja a mano tu situación y envía ambos a Andrey. Él los revisa y te envía un informe escrito personal.",
    topicQuestion: "¿Sobre qué trata tu consulta?",
    topicLabel: "Tema",
    options: { personal: "Situación personal", goal: "Meta o decisión", business: "Trabajo o negocios", wellbeing: "Bienestar y energía" },
    question1: "¿Cuál es tu problema o situación?",
    question2: "¿Qué meta o cambio deseas?",
    question3: "¿Qué te impide avanzar? (opcional)",
    question4: "¿Qué has intentado? (opcional)",
    placeholder1: "Describe brevemente lo que ocurre.",
    placeholder2: "¿Qué te gustaría lograr o comprender?",
    placeholder3: "¿Qué resulta difícil o se repite?",
    placeholder4: "Pasos que ya has dado.",
    drawingTitle: "Dibuja en papel con bolígrafo",
    drawingText: "En una hoja, dibuja tres elementos como prefieras: YO, MI META y MI PROBLEMA. Haz una foto clara del dibujo; no utilices una ilustración digital.",
    drawLabels: ["YO", "MI META", "MI PROBLEMA"],
    prepare: "Preparar mis respuestas",
    ready: "Tus respuestas están listas",
    copyButton: "Copiar respuestas",
    copied: "Copiado — pega las respuestas en WhatsApp",
    copyFallback: "Selecciona y copia el texto siguiente y pégalo en WhatsApp.",
    openWhatsapp: "Copiar respuestas y abrir WhatsApp",
    sendNote: "Pega las respuestas copiadas y adjunta la foto. Si falla la copia, usa el botón Copiar respuestas. Nada se envía automáticamente.",
    privacy: "Esta página no sube ni guarda tus respuestas ni tu dibujo. Tú decides qué enviar por WhatsApp. El informe es una reflexión simbólica sobre la situación, no un diagnóstico médico ni de salud mental.",
    questionLabel: "Formulario de coaching — evaluación gratuita mediante dibujo",
    request: "Solicitud: analiza mis respuestas y mi dibujo a mano (YO / MI META / MI PROBLEMA) y envíame un informe escrito personal.",
    whatsappIntro: "Hola Andrey. Solicito la evaluación GRATUITA de mi situación mediante un dibujo. Enviaré mis respuestas del formulario de coaching y una foto del dibujo hecho a mano. Espero el informe escrito.",
    problemField: "Situación / problema",
    goalField: "Meta deseada",
    obstacleField: "Obstáculo percibido",
    triedField: "Intentos anteriores",
  },
} as const;

export function FreeDrawingIntake({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const titleId = useId();
  const [topic, setTopic] = useState<Topic>("personal");
  const [problem, setProblem] = useState("");
  const [goal, setGoal] = useState("");
  const [obstacle, setObstacle] = useState("");
  const [tried, setTried] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("topic");
    if (topics.includes(requested as Topic)) setTopic(requested as Topic);
  }, []);

  const answers = [
    t.questionLabel,
    t.topicLabel + ": " + t.options[topic],
    t.problemField + ": " + problem.trim(),
    t.goalField + ": " + goal.trim(),
    ...(obstacle.trim() ? [t.obstacleField + ": " + obstacle.trim()] : []),
    ...(tried.trim() ? [t.triedField + ": " + tried.trim()] : []),
    "",
    t.request,
  ].join("\n");

  // Only the broad topic and the generic request enter the WhatsApp URL.
  // The user's answers stay in this browser until they explicitly copy/paste them.
  const whatsappUrl = "https://wa.me/" + phone + "?text=" + encodeURIComponent(
    [t.whatsappIntro, t.topicLabel + ": " + t.options[topic]].join("\n")
  );

  function changeAnswer(setter: (value: string) => void, value: string) {
    setter(value);
    setPrepared(false);
    setCopied(false);
    setCopyFailed(false);
  }

  async function copyAnswers() {
    try {
      await navigator.clipboard.writeText(answers);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <section className={styles.card} aria-labelledby={titleId} data-free-drawing-intake lang={locale}>
      <p className={styles.eyebrow}><FileText size={17} aria-hidden="true" />{t.eyebrow}</p>
      <h2 id={titleId}>{t.title}</h2>
      <p className={styles.lead}>{t.lead}</p>
      <form onSubmit={(event) => { event.preventDefault(); setPrepared(true); }} className={styles.form}>
        <fieldset className={styles.topics}>
          <legend>{t.topicQuestion}</legend>
          <div className={styles.topicGrid}>
            {topics.map((choice) => <button key={choice} type="button" aria-pressed={topic === choice}
              data-selected={topic === choice} onClick={() => { setTopic(choice); setPrepared(false); setCopied(false); setCopyFailed(false); }}>
              {topic === choice ? <Check size={15} aria-hidden="true" /> : null}{t.options[choice]}
            </button>)}
          </div>
        </fieldset>
        <label className={styles.field}>{t.question1}
          <textarea required rows={3} maxLength={3000} value={problem} placeholder={t.placeholder1}
            onChange={event => changeAnswer(setProblem, event.target.value)} />
        </label>
        <label className={styles.field}>{t.question2}
          <textarea required rows={2} maxLength={2000} value={goal} placeholder={t.placeholder2}
            onChange={event => changeAnswer(setGoal, event.target.value)} />
        </label>
        <details className={styles.optional}>
          <summary>{locale === "ru" ? "Добавить детали (необязательно)" : locale === "es" ? "Añadir detalles (opcional)" : "Add context (optional)"}</summary>
          <label className={styles.field}>{t.question3}
            <textarea rows={2} maxLength={2000} value={obstacle} placeholder={t.placeholder3}
              onChange={event => changeAnswer(setObstacle, event.target.value)} />
          </label>
          <label className={styles.field}>{t.question4}
            <textarea rows={2} maxLength={2000} value={tried} placeholder={t.placeholder4}
              onChange={event => changeAnswer(setTried, event.target.value)} />
          </label>
        </details>
        <div className={styles.drawing}>
          <h3><PenLine size={19} aria-hidden="true" />{t.drawingTitle}</h3>
          <div className={styles.drawingTags}>
            {t.drawLabels.map((label) => <span key={label}>{label}</span>)}
          </div>
          <p>{t.drawingText}</p>
        </div>
        <button className={styles.prepare} type="submit">{t.prepare}<ArrowUpRight size={20} aria-hidden="true" /></button>
      </form>
      {prepared ? <div className={styles.ready} role="region" aria-label={t.ready}>
        <h3>{t.ready}</h3>
        <textarea className={styles.preview} readOnly value={answers} rows={7} aria-label={t.ready}
          onFocus={event => event.currentTarget.select()} />
        <AcquisitionEventLink className={styles.whatsapp} href={whatsappUrl} prefetch={false} target="_blank" rel="noopener noreferrer"
          event="service_request_start" onClick={() => { void copyAnswers(); }} attributes={{ "data-contact-channel": "whatsapp" }}>
          <Send size={18} aria-hidden="true" />{t.openWhatsapp}<ArrowUpRight size={18} aria-hidden="true" />
        </AcquisitionEventLink>
        <button type="button" onClick={() => { void copyAnswers(); }} className={styles.copyButton}>
          <ClipboardCopy size={18} aria-hidden="true" />{t.copyButton}
        </button>
        <p aria-live="polite" className={styles.copyStatus}>{copied ? t.copied : copyFailed ? t.copyFallback : null}</p>
        <p className={styles.note}>{t.sendNote}</p>
      </div> : null}
      <p className={styles.privacy}>{t.privacy}</p>
    </section>
  );
}
