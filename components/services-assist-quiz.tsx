"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, Check, Flower2, GraduationCap, HandHeart, HeartHandshake, MonitorPlay, Sparkles, type LucideIcon } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { AssistMode, AssistChannel, AssistBudget, AssistPreferences } from "@/lib/assist/service-match.mjs";
import { rankAssistProducts } from "@/lib/assist/product-recommendations.mjs";
import { AssistTopRecommendations } from "./assist-top-recommendations";
import styles from "./services-assist-quiz.module.css";

type QuestionKey = "topic" | "mode" | "channel" | "budget";
type Focus = "stress" | "relationships" | "energy" | "work" | "health" | "growth";
type Category = "therapy" | "homeopathy" | "constellations" | "business" | "study" | "videos";
type Choice = readonly [string, string];
type QuizCopy = {
  title: string; lead: string; button: string; all: string; other: string; privacy: string;
  empty: string; section: string; count: string;
  questions: Record<QuestionKey, { title: string; options: readonly Choice[] }>;
  categories: Record<Category, string>;
};
const questionKeys = ["topic", "mode", "channel", "budget"] as const;
const copy: Record<PublicLocale, QuizCopy> = {
  ru: {
    title: "Подберём поддержку", lead: "4 вопроса · персональные рекомендации",
    button: "Показать рекомендации", all: "Все услуги", other: "Предпочитаете диалог с Ali?",
    privacy: "Подбор работает в браузере. Ответы не отправляются ИИ и не сохраняются.",
    empty: "Под выбранные условия подтверждённых вариантов пока нет. Измените формат или бюджет.",
    section: "Услуги", count: "ответов",
    questions: {
      topic: { title: "С чем хотите разобраться?", options: [
        ["stress", "Стресс"], ["relationships", "Отношения"], ["energy", "Энергия"],
        ["work", "Деньги и бизнес"], ["health", "Здоровье"], ["growth", "Развитие"],
      ] },
      mode: { title: "Какая помощь вам ближе?", options: [
        ["human", "Личная сессия"], ["self", "Курс / практика"],
        ["video", "Видео"], ["any", "Пока не знаю"],
      ] },
      channel: { title: "Как вам удобно?", options: [
        ["online", "Онлайн"], ["inperson", "Торонто"], ["async", "Заочно"], ["any", "Неважно"],
      ] },
      budget: { title: "Комфортный бюджет?", options: [
        ["free", "Бесплатно"], ["under50", "До €50"], ["under100", "До €100"], ["flexible", "Обсудить"],
      ] },
    },
    categories: {
      therapy: "Психотерапия", homeopathy: "Гомеопатия", constellations: "Расстановки",
      business: "Деньги и бизнес", study: "Курсы и практики", videos: "Видео и медитации",
    },
  },
  en: {
    title: "Find your support", lead: "4 questions · personal recommendations",
    button: "See recommendations", all: "View all", other: "Prefer to chat with Ali?",
    privacy: "Matching runs in your browser. Answers are not saved or sent to AI.",
    empty: "No verified options match your choices yet. Change format or budget.",
    section: "Services", count: "answered",
    questions: {
      topic: { title: "What would you like help with?", options: [
        ["stress", "Stress"], ["relationships", "Relationships"], ["energy", "Energy"],
        ["work", "Money & business"], ["health", "Wellbeing"], ["growth", "Personal growth"],
      ] },
      mode: { title: "What kind of support suits you?", options: [
        ["human", "Personal session"], ["self", "Course / practice"],
        ["video", "Videos"], ["any", "Not sure yet"],
      ] },
      channel: { title: "How would you connect?", options: [
        ["online", "Online"], ["inperson", "Toronto"], ["async", "No meeting"], ["any", "Any"],
      ] },
      budget: { title: "Comfortable budget?", options: [
        ["free", "Free"], ["under50", "Up to €50"], ["under100", "Up to €100"], ["flexible", "Discuss"],
      ] },
    },
    categories: {
      therapy: "Psychotherapy", homeopathy: "Homeopathy", constellations: "Constellations",
      business: "Money & business", study: "Courses & practice", videos: "Video & meditation",
    },
  },
  es: {
    title: "Encuentra tu apoyo", lead: "4 preguntas · recomendaciones personales",
    button: "Ver recomendaciones", all: "Ver todo", other: "¿Prefieres hablar con Ali?",
    privacy: "La selección ocurre en tu navegador. No se guardan respuestas ni se envían a IA.",
    empty: "No hay opciones confirmadas para esas condiciones. Cambia formato o presupuesto.",
    section: "Servicios", count: "respuestas",
    questions: {
      topic: { title: "¿Qué necesitas ahora?", options: [
        ["stress", "Estrés"], ["relationships", "Relaciones"], ["energy", "Energía"],
        ["work", "Dinero y negocios"], ["health", "Bienestar"], ["growth", "Desarrollo"],
      ] },
      mode: { title: "¿Qué apoyo prefieres?", options: [
        ["human", "Sesión personal"], ["self", "Curso / práctica"],
        ["video", "Vídeos"], ["any", "Aún no sé"],
      ] },
      channel: { title: "¿Cómo te resulta mejor?", options: [
        ["online", "En línea"], ["inperson", "Toronto"], ["async", "Sin cita"], ["any", "Me da igual"],
      ] },
      budget: { title: "¿Qué presupuesto prefieres?", options: [
        ["free", "Gratis"], ["under50", "Hasta €50"], ["under100", "Hasta €100"], ["flexible", "Consultar"],
      ] },
    },
    categories: {
      therapy: "Psicoterapia", homeopathy: "Homeopatía", constellations: "Constelaciones",
      business: "Dinero y negocios", study: "Cursos y prácticas", videos: "Vídeos y meditación",
    },
  },
};
const categories: readonly { key: Category; path: string; Icon: LucideIcon }[] = [
  { key: "therapy", path: "services/imagery-therapy", Icon: Flower2 },
  { key: "homeopathy", path: "services/psychohomeopathy", Icon: HandHeart },
  { key: "constellations", path: "services/systemic-constellations", Icon: HeartHandshake },
  { key: "business", path: "services/business-consulting", Icon: BriefcaseBusiness },
  { key: "study", path: "academy/reiki", Icon: GraduationCap },
  { key: "videos", path: "mytube", Icon: MonitorPlay },
];

export function ServicesAssistQuiz({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const answered = questionKeys.filter(key => Boolean(answers[key])).length;
  const ready = answered === questionKeys.length;
  const focus = (answers.topic || "growth") as Focus;
  const preferences: AssistPreferences = {
    mode: answers.mode as AssistMode | undefined,
    channel: answers.channel as AssistChannel | undefined,
    budget: answers.budget as AssistBudget | undefined,
  };
  const matchingIds = rankAssistProducts(focus, preferences);
  function choose(key: QuestionKey, value: string) {
    setAnswers(old => ({ ...old, [key]: value }));
    setSubmitted(false);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ready) setSubmitted(true);
  }
  useEffect(() => {
    if (!submitted) return;
    // Only a deliberate completed submission scrolls away from the first screen.
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById("assist-recommendations");
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [submitted]);

  return <section className={styles.root} data-services-quiz data-services-quiz-questions="4"
    lang={locale} aria-labelledby="services-quiz-title">
    <header className={styles.hero}>
      <span className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" /> HOLISTIC HOUSE · ASSIST</span>
      <h1 id="services-quiz-title">{t.title}</h1>
      <p>{t.lead}</p>
    </header>
    <form className={styles.form} data-services-quiz-form onSubmit={submit}>
      {questionKeys.map((key, index) => {
        const question = t.questions[key];
        return <fieldset className={styles.question} data-services-quiz-question={key} key={key}>
          <legend><span className={styles.questionNumber}>{index + 1}</span>{question.title}</legend>
          <div className={styles.choices} data-question-kind={key}>
            {question.options.map(([value, label]) => {
              const selected = answers[key] === value;
              return <button type="button" className={styles.choice} key={value}
                data-services-quiz-choice={value} aria-pressed={selected} onClick={() => choose(key, value)}>
                <span>{label}</span>{selected ? <Check size={15} strokeWidth={2.8} aria-hidden="true" /> : null}
              </button>;
            })}
          </div>
        </fieldset>;
      })}
      <button type="submit" className={styles.submit} data-services-quiz-submit disabled={!ready}
        aria-controls="assist-recommendations">{t.button}<ArrowRight size={19} aria-hidden="true" /></button>
    </form>
    <section className={styles.categories} data-services-quick-categories aria-labelledby="services-quiz-categories-title">
      <div className={styles.categoryHeader}>
        <h2 id="services-quiz-categories-title">{t.section}</h2>
        <a href="#services-unified-heading">{t.all}<ArrowRight size={15} aria-hidden="true"/></a>
      </div>
      <div className={styles.categoryGrid}>
        {categories.map(({key, path, Icon}) => <Link href={"/" + locale + "/" + path} key={key} prefetch={false}
          className={styles.category} data-services-quiz-category={key}>
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" /><span>{t.categories[key]}</span>
        </Link>)}
      </div>
      <div className={styles.footerRow}>
        <Link href={"/" + locale + "/services?assist=chat"} prefetch={false}>{t.other}</Link>
        <BookOpen size={15} aria-hidden="true" />
      </div>
    </section>
    {submitted ? <div className={styles.results} data-services-quiz-results>
      <AssistTopRecommendations locale={locale} focus={focus} preferences={preferences}
        matchingIds={matchingIds} noMatchLabel={t.empty} />
    </div> : null}
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
