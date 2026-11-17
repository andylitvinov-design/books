"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight, BatteryCharging, BookOpen, BriefcaseBusiness, Check, ChevronDown,
  CircleHelp, Compass, CreditCard, Flower2, Gift, Globe2, GraduationCap,
  HandHeart, HeartHandshake, HeartPulse, Laptop, Leaf, MapPin, MessageCircle,
  MonitorPlay, UserRound, UsersRound, Wallet, type LucideIcon,
} from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { AssistMode, AssistChannel, AssistBudget, AssistPreferences } from "@/lib/assist/service-match.mjs";
import { rankAssistProducts } from "@/lib/assist/product-recommendations.mjs";
import { AssistTopRecommendations } from "./assist-top-recommendations";
import styles from "./services-assist-quiz.module.css";

type QuestionKey = "topic" | "mode" | "channel" | "budget";
type Focus = "stress" | "relationships" | "energy" | "work" | "health" | "growth";
type Category = "therapy" | "homeopathy" | "constellations" | "practice" | "study" | "videos" | "business";
type Choice = readonly [string, string];
type QuizCopy = {
  title: string; lead: string; button: string; all: string; other: string; privacy: string;
  empty: string; section: string; step: string; more: string; less: string; profile: string;
  questions: Record<QuestionKey, { title: string; options: readonly Choice[] }>;
  categories: Record<Category, string>;
};
const questionKeys = ["topic", "mode", "channel", "budget"] as const;
const publicLocales: readonly PublicLocale[] = ["ru", "en", "es"];
const copy: Record<PublicLocale, QuizCopy> = {
  ru: {
    title: "Подберём вашу поддержку",
    lead: "Короткий квиз · 4 вопроса · Персональные рекомендации",
    button: "Посмотреть рекомендации", all: "Все услуги", other: "Предпочитаете диалог с Ali?",
    privacy: "Подбор работает в браузере. Ответы не сохраняются и не передаются ИИ.",
    empty: "Под выбранные условия подтверждённых вариантов пока нет. Измените формат или бюджет.",
    section: "Направления и услуги", step: "Вопрос", more: "Деньги, бизнес или самочувствие?", less: "Скрыть другие темы",
    profile: "Личный кабинет",
    questions: {
      topic: { title: "С какой задачей вы обращаетесь сейчас?", options: [
        ["stress", "Снять стресс и напряжение"],
        ["relationships", "Улучшить отношения"],
        ["energy", "Восстановить энергию"],
        ["growth", "Найти ясность и смысл"],
        ["work", "Деньги и бизнес"],
        ["health", "Улучшить самочувствие"],
      ] },
      mode: { title: "Какая поддержка вам ближе?", options: [
        ["human", "Личная сессия"], ["self", "Курс или практика"],
        ["video", "Видео и медитации"], ["any", "Пока не знаю"],
      ] },
      channel: { title: "Как вам удобнее?", options: [
        ["online", "Онлайн"], ["inperson", "В Торонто"],
        ["async", "Без встречи"], ["any", "Любой формат"],
      ] },
      budget: { title: "Какой бюджет комфортен?", options: [
        ["free", "Бесплатно"], ["under50", "До €50"],
        ["under100", "До €100"], ["flexible", "Обсудить"],
      ] },
    },
    categories: {
      therapy: "Психотерапия\nи поддержка", homeopathy: "Гомеопатия\nи ремедии",
      constellations: "Расстановки\nи отношения", practice: "Практики\nи энергия",
      study: "Курсы\nи обучение", videos: "Видео\nи медитации", business: "Деньги и бизнес",
    },
  },
  en: {
    title: "Find your support",
    lead: "A short quiz · 4 questions · Personal recommendations",
    button: "See recommendations", all: "All services", other: "Prefer to chat with Ali?",
    privacy: "Matching runs in your browser. Answers are not saved or sent to AI.",
    empty: "No verified options match your choices yet. Change format or budget.",
    section: "Areas & services", step: "Question", more: "Money, business or wellbeing?", less: "Hide other topics",
    profile: "My profile",
    questions: {
      topic: { title: "What brings you here today?", options: [
        ["stress", "Ease stress and tension"], ["relationships", "Improve relationships"],
        ["energy", "Restore my energy"], ["growth", "Find clarity and meaning"],
        ["work", "Money & business"], ["health", "Improve wellbeing"],
      ] },
      mode: { title: "Which support feels right?", options: [
        ["human", "Personal session"], ["self", "Course or practice"],
        ["video", "Videos & meditations"], ["any", "Not sure yet"],
      ] },
      channel: { title: "How would you like to connect?", options: [
        ["online", "Online"], ["inperson", "In Toronto"],
        ["async", "No meeting"], ["any", "Any format"],
      ] },
      budget: { title: "What budget feels comfortable?", options: [
        ["free", "Free"], ["under50", "Up to €50"],
        ["under100", "Up to €100"], ["flexible", "Discuss"],
      ] },
    },
    categories: {
      therapy: "Psychotherapy\n& support", homeopathy: "Homeopathy\n& remedies",
      constellations: "Constellations\n& relationships", practice: "Practices\n& energy",
      study: "Courses\n& learning", videos: "Videos\n& meditations", business: "Money & business",
    },
  },
  es: {
    title: "Encontremos tu apoyo",
    lead: "Cuestionario breve · 4 preguntas · Recomendaciones personales",
    button: "Ver recomendaciones", all: "Todos los servicios", other: "¿Prefieres hablar con Ali?",
    privacy: "La selección ocurre en tu navegador. No se guardan respuestas ni se envían a IA.",
    empty: "No hay opciones confirmadas para esas condiciones. Cambia formato o presupuesto.",
    section: "Áreas y servicios", step: "Pregunta", more: "¿Dinero, negocios o bienestar?", less: "Ocultar otros temas",
    profile: "Mi perfil",
    questions: {
      topic: { title: "¿Qué necesitas en este momento?", options: [
        ["stress", "Reducir el estrés"], ["relationships", "Mejorar mis relaciones"],
        ["energy", "Recuperar energía"], ["growth", "Encontrar claridad"],
        ["work", "Dinero y negocios"], ["health", "Mejorar mi bienestar"],
      ] },
      mode: { title: "¿Qué tipo de apoyo prefieres?", options: [
        ["human", "Sesión personal"], ["self", "Curso o práctica"],
        ["video", "Vídeos y meditación"], ["any", "Aún no sé"],
      ] },
      channel: { title: "¿Cómo prefieres conectar?", options: [
        ["online", "En línea"], ["inperson", "En Toronto"],
        ["async", "Sin cita"], ["any", "Cualquier formato"],
      ] },
      budget: { title: "¿Qué presupuesto prefieres?", options: [
        ["free", "Gratis"], ["under50", "Hasta €50"],
        ["under100", "Hasta €100"], ["flexible", "Consultar"],
      ] },
    },
    categories: {
      therapy: "Psicoterapia\ny apoyo", homeopathy: "Homeopatía\ny remedios",
      constellations: "Constelaciones\ny relaciones", practice: "Prácticas\ny energía",
      study: "Cursos\ny formación", videos: "Vídeos\ny meditación", business: "Dinero y negocios",
    },
  },
};

const choiceIcons: Record<QuestionKey, Record<string, LucideIcon>> = {
  topic: { stress: Flower2, relationships: UsersRound, energy: BatteryCharging,
    growth: Compass, work: BriefcaseBusiness, health: HeartPulse },
  mode: { human: UserRound, self: BookOpen, video: MonitorPlay, any: CircleHelp },
  channel: { online: Laptop, inperson: MapPin, async: MessageCircle, any: Globe2 },
  budget: { free: Gift, under50: Wallet, under100: CreditCard, flexible: MessageCircle },
};

const categories: readonly { key: Category; path: string; image: string; Icon: LucideIcon }[] = [
  { key: "therapy", path: "services/imagery-therapy", image: "/images/holistic-house/messenger-zen-stones.svg", Icon: Flower2 },
  { key: "homeopathy", path: "services/psychohomeopathy", image: "/images/holistic-house/distance-homeopathy.webp", Icon: HandHeart },
  { key: "constellations", path: "services/systemic-constellations", image: "/images/holistic-house/homepage-constellations.svg", Icon: HeartHandshake },
  { key: "practice", path: "services/remote-energy-support", image: "/images/holistic-house/reiki-practitioner-sunrise.webp", Icon: Leaf },
  { key: "study", path: "academy/reiki", image: "/images/holistic-house/books-library.webp", Icon: GraduationCap },
  { key: "videos", path: "mytube", image: "/images/holistic-house/assist-video-botanical.svg", Icon: MonitorPlay },
];

export function ServicesAssistQuiz({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, string>>>({});
  const [step, setStep] = useState(0);
  const [moreTopics, setMoreTopics] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const questionHeading = useRef<HTMLSpanElement>(null);
  const currentKey = questionKeys[step];
  const question = t.questions[currentKey];
  const options = currentKey === "topic" && !moreTopics ? question.options.slice(0, 4) : question.options;
  const ready = questionKeys.every(key => Boolean(answers[key]));
  const focus = (answers.topic || "growth") as Focus;
  const preferences: AssistPreferences = {
    mode: answers.mode as AssistMode | undefined,
    channel: answers.channel as AssistChannel | undefined,
    budget: answers.budget as AssistBudget | undefined,
  };
  const matchingIds = rankAssistProducts(focus, preferences);

  function selectOption(key: QuestionKey, value: string) {
    setAnswers(old => ({ ...old, [key]: value }));
    setSubmitted(false);
    if (step < questionKeys.length - 1) {
      setStep(index => Math.min(index + 1, questionKeys.length - 1));
      requestAnimationFrame(() => questionHeading.current?.focus());
    }
  }
  function jumpTo(index: number) {
    if (index > step && !answers[questionKeys[index]]) return;
    setStep(index);
    setSubmitted(false);
    requestAnimationFrame(() => questionHeading.current?.focus());
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ready) setSubmitted(true);
  }
  useEffect(() => {
    if (!submitted) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById("assist-recommendations") ||
        document.querySelector<HTMLElement>("[data-services-quiz-results]");
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [submitted]);

  return <section className={styles.root} data-services-quiz data-services-quiz-questions="4"
    data-services-quiz-step={step + 1} lang={locale} aria-labelledby="services-quiz-title">
    <div className={styles.brandBar}>
      <Link href={"/" + locale} prefetch={false} className={styles.brand} aria-label="Holistic House">
        <Flower2 size={40} strokeWidth={1.5} aria-hidden="true" />
        <span><strong>Holistic House</strong><small>S E R V I C E S</small></span>
      </Link>
      <div className={styles.brandActions}>
        <details className={styles.languageMenu}>
          <summary aria-label="Language"><span>{locale.toUpperCase()}</span><ChevronDown size={16} aria-hidden="true" /></summary>
          <div className={styles.languageOptions}>{publicLocales.map(lang =>
            <Link href={"/" + lang + "/services"} prefetch={false} key={lang} lang={lang}
              aria-current={lang === locale ? "page" : undefined}>{lang.toUpperCase()}</Link>)}</div>
        </details>
        <Link className={styles.profile} href={"/" + (locale === "es" ? "en" : locale) + "/app/portrait"}
          prefetch={false} aria-label={t.profile}><UserRound size={22} aria-hidden="true" /></Link>
      </div>
    </div>

    <header className={styles.hero}>
      <h1 id="services-quiz-title">{t.title}</h1>
      <p>{t.lead}</p>
    </header>

    <form className={styles.form} data-services-quiz-form onSubmit={submit}>
      <div className={styles.progress}>
        <span>{t.step} {step + 1} / {questionKeys.length}</span>
        <div className={styles.progressSteps} aria-label={t.step + " " + (step + 1)}>
          {questionKeys.map((key, index) =>
            <button type="button" key={key} className={styles.progressDot} data-quiz-dot={index + 1}
              aria-label={t.step + " " + (index + 1)} aria-current={step === index ? "step" : undefined}
              data-complete={Boolean(answers[key])} disabled={index > step && !answers[key]}
              onClick={() => jumpTo(index)}><span className={styles.progressInner}>
                {answers[key] && index !== step ? <Check size={13} aria-hidden="true" /> : null}
              </span></button>)}
        </div>
      </div>

      <fieldset className={styles.question} data-services-quiz-question={currentKey} key={currentKey}>
        <legend><span ref={questionHeading} tabIndex={-1} className={styles.questionTitle}>{question.title}</span></legend>
        <div className={styles.choices} data-question-kind={currentKey}>
          {options.map(([value, label]) => {
            const selected = answers[currentKey] === value;
            const Icon = choiceIcons[currentKey][value];
            return <button type="button" className={styles.choice} key={value}
              data-services-quiz-choice={value} aria-pressed={selected}
              onClick={() => selectOption(currentKey, value)}>
              <Icon size={27} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
              {selected ? <Check className={styles.check} size={16} strokeWidth={3} aria-hidden="true" /> : null}
            </button>;
          })}
        </div>
      </fieldset>
      {currentKey === "topic" ? <button type="button" className={styles.moreTopics}
        data-services-more-topics aria-expanded={moreTopics} onClick={() => setMoreTopics(old => !old)}>
        <BriefcaseBusiness size={15} aria-hidden="true" />{moreTopics ? t.less : t.more}
        <ChevronDown size={14} className={moreTopics ? styles.rotated : ""} aria-hidden="true" />
      </button> : null}
      {step === questionKeys.length - 1 ? <button type="submit" className={styles.submit}
        data-services-quiz-submit disabled={!ready} aria-controls="assist-recommendations">
        {t.button}<ArrowRight size={19} aria-hidden="true" />
      </button> : null}
    </form>

    <section className={styles.categories} data-services-quick-categories aria-labelledby="services-quiz-categories-title">
      <div className={styles.categoryHeader}>
        <h2 id="services-quiz-categories-title">{t.section}</h2>
        <a href="#services-unified-heading">{t.all}<ArrowRight size={17} aria-hidden="true" /></a>
      </div>
      <div className={styles.categoryGrid}>
        {categories.map(({key,path,image,Icon}) =>
          <Link href={"/" + locale + "/" + path} key={key} prefetch={false}
            className={styles.category} data-services-quiz-category={key}>
            <span className={styles.categoryMedia}>
              <Image src={image} alt="" fill sizes="(max-width: 520px) 32vw, 160px" />
            </span>
            <span className={styles.categoryInfo}>
              <span className={styles.categoryIcon}><Icon size={26} strokeWidth={1.65} aria-hidden="true" /></span>
              <span className={styles.categoryName}>{t.categories[key]}</span>
            </span>
          </Link>)}
      </div>
      <div className={styles.categoryExtras}>
        <Link href={"/" + locale + "/services/business-consulting"} prefetch={false}
          data-services-business-link><BriefcaseBusiness size={15} aria-hidden="true" /> {t.categories.business}</Link>
        <Link href={"/" + locale + "/services?assist=chat"} prefetch={false}>{t.other}</Link>
      </div>
    </section>

    {submitted ? <div className={styles.results} tabIndex={-1} data-services-quiz-results>
      <AssistTopRecommendations locale={locale} focus={focus} preferences={preferences}
        matchingIds={matchingIds} noMatchLabel={t.empty} />
    </div> : null}
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
