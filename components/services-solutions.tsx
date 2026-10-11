import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown, Check } from "lucide-react";
import type { Locale } from "@/data/remedies";
import styles from "./services-solutions.module.css";

const copy = {
  en: {
    eyebrow: "START WITH YOUR SITUATION",
    title: "What would you like to change?",
    lead: "Choose what feels closest to your situation. The first conversation is free."
    outcomeLabel: "What we can explore",
    methodsLabel: "Possible approaches",
    cardAction: "Free situation review",
    solutions: [
      {
        title: "Low energy or constant tension",
        summary: "Explore what drains you and where to find support.",
        outcomes: ["Notice possible sources of strain", "Explore resources and boundaries"],
        method: "Guided imagery; optional complementary homeopathy discussion.",
        topic: "wellbeing",
        image: "/images/holistic-house/homeopathy-still-life.svg",
      },
      {
        title: "Relationships & emotions",
        summary: "Explore recurring reactions and difficult connections.",
        outcomes: ["Notice triggers and repeating patterns", "Explore boundaries and options"],
        method: "Imagery and systemic exploration.",
        topic: "personal",
        image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
      },
      {
        title: "A goal that feels out of reach",
        summary: "Clarify what may be holding you back.",
        outcomes: ["Identify perceived obstacles", "Consider realistic next steps"],
        method: "Imagery and constellations.",
        topic: "goal",
        image: "/images/holistic-house/hero-olive-incense.webp",
      },
      {
        title: "Work & difficult decisions",
        summary: "Explore options before an important decision.",
        outcomes: ["Map roles and priorities", "Compare options and what to verify"],
        method: "Business constellations; not a substitute for expert advice.",
        topic: "business",
        image: "/images/holistic-house/video-posters/services-en-v2.webp",
      },
    ],
    bridgeEyebrow: "YOUR FIRST STEP",
    bridgeTitle: "Start with a free conversation",
    bridgeText: "Clarify your question and a possible next step. No obligation to continue."
    bridgeButton: "Request my free situation review",
    processEyebrow: "HOW IT WORKS",
    processTitle: "What you actually receive",
    steps: [
      { title: "1. Your question", text: "Tell me what matters now." },
      { title: "2. Clarity", text: "Explore patterns and resources." },
      { title: "3. Next step", text: "Choose what, if anything, comes next." },
    ],
    scope: "This is an introductory conversation, not a medical or mental-health diagnosis. No cure, business outcome or personal change is guaranteed.",
    methodEyebrow: "THE METHODS, EXPLAINED",
    methodTitle: "I choose the approach around your question",
    methodLead: "You don't need to choose a method before we speak."
    detailAction: "Understand this approach",
    methods: [
      {
        title: "Guided imagery & hypnotherapy",
        desc: "A reflective conversation using attention, imagery and inner parts to explore emotional responses and repeating patterns.",
        href: "imagery-therapy",
      },
      {
        title: "Systemic & business constellations",
        desc: "A way to map roles, relationships, competing needs and possible choices around a personal or work situation.",
        href: "systemic-constellations",
      },
      {
        title: "Psychohomeopathy & personal resources",
        desc: "A complementary conversation about how you feel and what supports you. Homeopathy has no reliable evidence for treating medical conditions.",
        href: "psychohomeopathy",
      },
    ],
    expandLabel: "How do these methods work? Read brief explanations",
  },
  ru: {
    eyebrow: "НАЧНИТЕ СО СВОЕГО ЗАПРОСА",
    title: "Что вы хотели бы изменить?",
    lead: "Выберите близкую вам ситуацию. Первый разговор — бесплатно."
    outcomeLabel: "Что можно прояснить",
    methodsLabel: "Возможные методы",
    cardAction: "Бесплатный разбор",
    solutions: [
      {
        title: "Нет сил и много напряжения",
        summary: "Исследовать источники напряжения и возможную поддержку.",
        outcomes: ["Замечать повторяющиеся реакции", "Исследовать ресурсы и границы"],
        method: "Образная работа; при желании — беседа о гомеопатии."
        topic: "wellbeing",
        image: "/images/holistic-house/homeopathy-still-life.svg",
      },
      {
        title: "Отношения и эмоции",
        summary: "Разобраться в повторяющихся реакциях и отношениях.",
        outcomes: ["Замечать триггеры и привычные роли", "Рассмотреть границы и варианты"],
        method: "Образы и системное исследование."
        topic: "personal",
        image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
      },
      {
        title: "Цель без движения",
        summary: "Прояснить препятствия и возможный следующий шаг.",
        outcomes: ["Уточнить цель и затруднения", "Наметить реалистичный шаг"],
        method: "Образы и расстановки."
        topic: "goal",
        image: "/images/holistic-house/hero-olive-incense.webp",
      },
      {
        title: "Работа и сложные решения",
        summary: "Увидеть альтернативы перед важным решением.",
        outcomes: ["Разобрать роли и приоритеты", "Сравнить варианты и риски"],
        method: "Бизнес-расстановки как дополнение к экспертной оценке."
        topic: "business",
        image: "/images/holistic-house/video-posters/services-en-v2.webp",
      },
    ],
    bridgeEyebrow: "ВАШ ПЕРВЫЙ ШАГ",
    bridgeTitle: "Начните с бесплатного разбора",
    bridgeText: "Проясним ваш запрос и возможный следующий шаг. Продолжать работу необязательно."
    bridgeButton: "Записаться на бесплатную диагностику",
    processEyebrow: "КАК ЭТО ПРОХОДИТ",
    processTitle: "Что именно вы получите",
    steps: [
      { title: "1. Ваш запрос", text: "Обсудим, что сейчас важно." },
      { title: "2. Ясность", text: "Исследуем реакции и ресурсы." },
      { title: "3. Следующий шаг", text: "Вы решите, нужно ли продолжение." },
    ],
    scope: "Это вводный разбор, а не медицинская или психиатрическая диагностика. Излечение, деловые достижения и личные изменения не гарантируются.",
    methodEyebrow: "МЕТОДЫ — ТОЛЬКО ПОЯСНЕНИЕ",
    methodTitle: "Метод подбирается под задачу",
    methodLead: "Не нужно выбирать метод до нашей беседы."
    detailAction: "Подробнее о подходе",
    methods: [
      {
        title: "Образная работа и гипнотерапия",
        desc: "Бережное исследование эмоциональных реакций и повторяющихся схем через внимание, образы и внутренние части.",
        href: "imagery-therapy",
      },
      {
        title: "Системные и бизнес-расстановки",
        desc: "Исследование ролей, отношений, противоречивых потребностей и вариантов решения личной или деловой ситуации.",
        href: "systemic-constellations",
      },
      {
        title: "Психогомеопатия и личные ресурсы",
        desc: "Дополнительная беседа о самочувствии и ресурсах. Эффективность гомеопатии для лечения заболеваний не подтверждена надёжными доказательствами.",
        href: "psychohomeopathy",
      },
    ],
    expandLabel: "Как устроены методы? Короткие объяснения",
  },
} as const;

export function ServicesSolutions({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <>
      <section className={styles.solutions} id="solutions" aria-labelledby="services-solutions-title">
        <div className={styles.header}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2 id="services-solutions-title">{t.title}</h2>
          <p className={styles.intro}>{t.lead}</p>
        </div>
        <div className={styles.grid}>
          {t.solutions.map((solution) => {
            return (
              <article className={styles.card} key={solution.topic} id={solution.topic}>
                <div className={styles.cardTop}>
                  <div className={styles.photo}>
                    <Image src={solution.image} alt="" fill sizes="(max-width: 760px) 105px, 155px" loading="lazy" />
                  </div>
                  <div className={styles.cardIntro}>
                    <h3>{solution.title}</h3>
                    <p>{solution.summary}</p>
                  </div>
                </div>
                <details className={styles.cardMore}>
                  <summary>{t.outcomeLabel}<ChevronDown size={15} aria-hidden="true" /></summary>
                  <div className={styles.cardBody}>
                  <ul>
                    {solution.outcomes.map((outcome) => <li key={outcome}><Check size={16} aria-hidden="true" />{outcome}</li>)}
                  </ul>
                  <p className={styles.method}><strong>{t.methodsLabel}:</strong> {solution.method}</p>
                  </div>
                </details>
                <Link
                  className={styles.cardCta}
                  href={"/" + locale + "/services/free-situation-review?topic=" + solution.topic}
                >
                  {t.cardAction}<ArrowUpRight size={19} aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.bridge} aria-labelledby="services-bridge-title">
        <div>
          <p className={styles.bridgeEyebrow}>{t.bridgeEyebrow}</p>
          <h2 id="services-bridge-title">{t.bridgeTitle}</h2>
          <p>{t.bridgeText}</p>
        </div>
        <Link href={"/" + locale + "/services/free-situation-review"}>{t.bridgeButton}<ArrowRight size={20} aria-hidden="true" /></Link>
      </section>

      <section className={styles.process} aria-labelledby="services-process-title">
        <div className={styles.processHead}>
          <p className={styles.eyebrow}>{t.processEyebrow}</p>
          <h2 id="services-process-title">{t.processTitle}</h2>
        </div>
        <div className={styles.steps}>
          {t.steps.map((step) => (
            <article className={styles.step} key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
        <p className={styles.scope}>{t.scope}</p>
      </section>

      <section className={styles.methods} id="methods" aria-labelledby="services-method-title">
        <p className={styles.eyebrow}>{t.methodEyebrow}</p>
        <h2 id="services-method-title">{t.methodTitle}</h2>
        <p className={styles.intro}>{t.methodLead}</p>
        <div className={styles.methodGrid}>
          {t.methods.map((method) => (
            <article className={styles.methodCard} key={method.href} id={method.href === "psychohomeopathy" ? "alchemy" : method.href === "systemic-constellations" ? "archetypal" : undefined}>
              <h3>{method.title}</h3>
              <p>{method.desc}</p>
              <Link href={"/" + locale + "/services/" + method.href}>{t.detailAction}<ArrowRight size={16} aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
