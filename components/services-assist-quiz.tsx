"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, BatteryCharging, BookOpen, BriefcaseBusiness, Check, ChevronDown, CircleHelp, Coins, Compass, Flower2, Gift, GraduationCap, HandHeart, HeartHandshake, HeartPulse, Laptop, MapPin, MessageCircle, MonitorPlay, Sparkles, UserRound, Wallet, type LucideIcon } from "lucide-react";
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
    title: "Подберём вашу поддержку", lead: "4 вопроса · персональные рекомендации",
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
      therapy: "Психотерапия и поддержка", homeopathy: "Гомеопатия и ремедии", constellations: "Расстановки и отношения",
      business: "Деньги и бизнес", study: "Курсы и обучение", videos: "Видео и медитации",
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
      therapy: "Psychotherapy & support", homeopathy: "Homeopathy & remedies", constellations: "Constellations & relationships",
      business: "Money & business", study: "Courses & learning", videos: "Video & meditation",
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
      therapy: "Psicoterapia y apoyo", homeopathy: "Homeopatía y remedios", constellations: "Constelaciones y relaciones",
      business: "Dinero y negocios", study: "Cursos y aprendizaje", videos: "Vídeos y meditación",
    },
  },
};
const categories: readonly { key: Category; path: string; image: string; Icon: LucideIcon }[] = [
  { key: "therapy", path: "services/imagery-therapy", image: "/images/holistic-house/messenger-zen-stones.svg", Icon: Flower2 },
  { key: "homeopathy", path: "services/psychohomeopathy", image: "/images/holistic-house/distance-homeopathy.webp", Icon: HandHeart },
  { key: "constellations", path: "services/systemic-constellations", image: "/images/holistic-house/homepage-constellations.svg", Icon: HeartHandshake },
  { key: "business", path: "services/business-consulting", image: "/images/holistic-house/tao-fu-prosperity.webp", Icon: BriefcaseBusiness },
  { key: "study", path: "academy/reiki", image: "/images/holistic-house/books-library.webp", Icon: GraduationCap },
  { key: "videos", path: "mytube", image: "/images/holistic-house/reiki-approved-sunrise-v3.webp", Icon: MonitorPlay },
];

const chromeCopy: Record<PublicLocale, {brand:string;step:string;extra:string;languages:string;profile:string;goBack:string}> = {
  ru: {brand:"УСЛУГИ",step:"Вопрос",extra:"Другие задачи",languages:"Язык сайта",profile:"Мой профиль",goBack:"Вернуться к вопросу"},
  en: {brand:"SERVICES",step:"Question",extra:"Other topics",languages:"Site language",profile:"My profile",goBack:"Return to question"},
  es: {brand:"SERVICIOS",step:"Pregunta",extra:"Otros temas",languages:"Idioma del sitio",profile:"Mi perfil",goBack:"Volver a la pregunta"},
};

const choiceIcons: Record<QuestionKey, Record<string, LucideIcon>> = {
  topic: {stress:Flower2, relationships:HeartHandshake, energy:BatteryCharging, growth:Compass, work:BriefcaseBusiness, health:HeartPulse},
  mode: {human:UserRound, self:GraduationCap, video:MonitorPlay, any:CircleHelp},
  channel: {online:Laptop, inperson:MapPin, async:MessageCircle, any:Compass},
  budget: {free:Gift, under50:Coins, under100:Wallet, flexible:MessageCircle},
};

export function ServicesAssistQuiz({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const ui = chromeCopy[locale];
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, string>>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answered = questionKeys.filter(key => Boolean(answers[key])).length;
  const ready = answered === questionKeys.length;
  const key = questionKeys[currentStep];
  const question = t.questions[key];
  const focus = (answers.topic || "growth") as Focus;
  const preferences: AssistPreferences = {
    mode: answers.mode as AssistMode | undefined,
    channel: answers.channel as AssistChannel | undefined,
    budget: answers.budget as AssistBudget | undefined,
  };
  const matchingIds = rankAssistProducts(focus, preferences);
  const primaryOptions = key === "topic"
    ? question.options.filter(([value]) => value !== "work" && value !== "health")
    : question.options;
  const additionalOptions = key === "topic"
    ? question.options.filter(([value]) => value === "work" || value === "health")
    : [];

  function choose(questionKey: QuestionKey, value: string) {
    setAnswers(old => ({ ...old, [questionKey]: value }));
    setSubmitted(false);
    if (currentStep < questionKeys.length - 1) setCurrentStep(currentStep + 1);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ready && currentStep === questionKeys.length - 1) setSubmitted(true);
  }

  useEffect(() => {
    if (currentStep !== 0) headingRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  useEffect(() => {
    if (!submitted) return;
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

  function renderOption([value, label]: Choice) {
    const selected = answers[key] === value;
    const Icon = choiceIcons[key][value] || Sparkles;
    return <button type="button" className={styles.choice} key={value}
      data-services-quiz-choice={value} aria-pressed={selected} onClick={() => choose(key, value)}>
      <Icon size={27} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>{selected ? <Check className={styles.check} size={17} strokeWidth={2.8} aria-hidden="true" /> : null}
    </button>;
  }

  return <section className={styles.root} data-services-quiz data-services-quiz-questions="4"
    lang={locale} aria-labelledby="services-quiz-title">
    <div className={styles.masthead}>
      <Link href={"/" + locale} className={styles.brand} aria-label="Holistic House" prefetch={false}>
        <svg className={styles.lotus} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M32 40C20 27 25 14 32 6c7 8 12 21 0 34Z"/>
          <path d="M28 43C13 37 10 23 12 15c12 3 20 13 20 28"/>
          <path d="M36 43c15-6 18-20 16-28-12 3-20 13-20 28"/>
          <path d="M28 47C15 48 7 41 3 31c13-3 23 2 29 14"/>
          <path d="M36 47c13 1 21-6 25-16-13-3-23 2-29 14"/>
          <path d="M11 49c12 7 30 9 42 0"/>
        </svg>
        <span className={styles.brandText}><strong>Holistic House</strong><small>{ui.brand}</small></span>
      </Link>
      <div className={styles.mastActions}>
        <details className={styles.languageMenu}>
          <summary aria-label={ui.languages}>{locale.toUpperCase()}<ChevronDown size={16} aria-hidden="true" /></summary>
          <nav aria-label={ui.languages}>
            {(["ru","en","es"] as const).map(lang => <Link key={lang} href={"/" + lang + "/services"}
              lang={lang} hrefLang={lang} aria-current={lang === locale ? "page" : undefined}
              prefetch={false}>{lang.toUpperCase()}</Link>)}
          </nav>
        </details>
        <Link className={styles.profile} href={"/" + (locale === "es" ? "en" : locale) + "/app/portrait"}
          aria-label={ui.profile} prefetch={false}><UserRound size={25} strokeWidth={1.5} aria-hidden="true" /></Link>
      </div>
    </div>

    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1 id="services-quiz-title">{t.title}</h1>
        <p>{t.lead}</p>
      </div>
    </header>

    <form className={styles.form} data-services-quiz-form data-services-quiz-step={currentStep + 1}
      onSubmit={submit} aria-label={t.lead}>
      <div className={styles.progress} data-services-quiz-progress="4">
        <span>{ui.step} {currentStep + 1} / 4</span>
        <div className={styles.progressDots} role="group" aria-label={t.lead}>
          {questionKeys.map((stepKey, index) => <button key={stepKey} type="button"
            className={styles.progressDot} data-current={currentStep === index}
            data-done={Boolean(answers[stepKey])}
            aria-label={ui.goBack + " " + (index + 1)}
            aria-current={currentStep === index ? "step" : undefined}
            disabled={index > currentStep || !answers[stepKey] && index !== currentStep}
            onClick={() => { setCurrentStep(index); setSubmitted(false); }}><span /></button>)}
        </div>
      </div>
      <div className={styles.question} data-services-quiz-question={key}>
        <h2 ref={headingRef} tabIndex={-1} id="services-current-question">{question.title}</h2>
        <div className={styles.choices} data-question-kind={key}
          role="group" aria-labelledby="services-current-question">
          {primaryOptions.map(renderOption)}
        </div>
        {additionalOptions.length > 0 ? <div className={styles.otherTopics}>
          <span>{ui.extra}</span>
          {additionalOptions.map(([value,label]) => <button key={value} type="button"
            data-services-quiz-choice={value} aria-pressed={answers[key] === value}
            onClick={() => choose(key, value)}>{label}</button>)}
        </div> : null}
      </div>
      {ready && currentStep === questionKeys.length - 1 ? <button type="submit"
        className={styles.submit} data-services-quiz-submit
        aria-controls="assist-recommendations">{t.button}<ArrowRight size={21} aria-hidden="true" /></button> : null}
    </form>

    <section className={styles.categories} data-services-quick-categories
      aria-labelledby="services-quiz-categories-title">
      <div className={styles.categoryHeader}>
        <h2 id="services-quiz-categories-title">{t.section}</h2>
        <a href="#services-unified-heading">{t.all}<ArrowRight size={16} aria-hidden="true" /></a>
      </div>
      <div className={styles.categoryGrid}>
        {categories.map(({key: category, path, image, Icon}) => <Link
          href={"/" + locale + "/" + path} key={category} prefetch={false}
          className={styles.category} data-services-quiz-category={category}>
          <div className={styles.categoryPhoto}>
            <Image src={image} alt="" width={240} height={150}
              sizes="(max-width: 350px) 28vw, (max-width: 760px) 31vw, 180px" />
          </div>
          <div className={styles.categoryBody}>
            <span className={styles.categoryIcon}><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></span>
            <strong>{t.categories[category]}</strong>
          </div>
        </Link>)}
      </div>
      <div className={styles.footerRow}>
        <Link href={"/" + locale + "/services?assist=chat"} prefetch={false}>{t.other}</Link>
        <BookOpen size={17} aria-hidden="true" />
      </div>
    </section>

    {submitted ? <div className={styles.results} data-services-quiz-results>
      <AssistTopRecommendations locale={locale} focus={focus} preferences={preferences}
        matchingIds={matchingIds} noMatchLabel={t.empty} />
    </div> : null}
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
