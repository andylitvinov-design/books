import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Compass, HeartHandshake, HeartPulse, Check } from "lucide-react";
import type { Locale } from "@/data/remedies";
import styles from "./services-solutions.module.css";

const copy = {
  en: {
    eyebrow: "START WITH YOUR SITUATION",
    title: "What would you like to change?",
    lead: "You don't need to choose between hypnotherapy, constellations or other methods. Choose the question that sounds closest to yours. The first conversation is free.",
    outcomeLabel: "What we can explore together",
    methodsLabel: "Possible approaches",
    cardAction: "Discuss this for free",
    solutions: [
      {
        title: "I feel tense, exhausted or out of balance",
        summary: "You want to understand what's draining your energy and find a more supportive way forward.",
        outcomes: ["Identify possible sources of strain and patterns worth noticing", "Clarify the resources, boundaries or support you may need"],
        method: "Reflective imagery and personal-resource exploration; complementary psychohomeopathy only if appropriate.",
        topic: "wellbeing",
        image: "/images/holistic-house/homeopathy-still-life.svg",
      },
      {
        title: "I struggle with relationships or repeating emotions",
        summary: "You feel caught in the same reactions, inner conflicts or difficult relationship dynamics.",
        outcomes: ["Explore triggers, recurring roles and unmet needs", "Look at boundaries, choices and a possible different response"],
        method: "Guided imagery, parts-oriented reflection and systemic mapping.",
        topic: "personal",
        image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
      },
      {
        title: "I have a goal, but I can't move forward",
        summary: "You know what you want, yet hesitation, uncertainty or familiar obstacles keep returning.",
        outcomes: ["Clarify the goal and the obstacles you perceive", "Explore realistic next steps and new perspectives"],
        method: "Personal imagery, systemic and archetypal constellation work.",
        topic: "goal",
        image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      },
      {
        title: "I face a business, career or major life decision",
        summary: "You want to see a complex situation clearly before choosing where to invest your energy.",
        outcomes: ["Map people, roles, constraints and competing priorities", "Consider alternative directions and questions to verify"],
        method: "Business and decision constellations, alongside your own research and expert advice.",
        topic: "business",
        image: "/images/holistic-house/video-posters/services-en-v2.webp",
      },
    ],
    bridgeEyebrow: "YOUR FIRST STEP",
    bridgeTitle: "A free conversation, not a commitment to a programme",
    bridgeText: "Tell me what is happening. We'll clarify the question and look for a sensible next step together. You can stop there — no paid session is required.",
    bridgeButton: "Request my free situation review",
    processEyebrow: "HOW IT WORKS",
    processTitle: "What you actually receive",
    steps: [
      { title: "1. Your question", text: "We start with your actual concern, not a predefined technique or package." },
      { title: "2. A clearer picture", text: "We discuss patterns, what you've tried and what could be worth exploring further." },
      { title: "3. An optional next step", text: "You may leave with ideas to consider independently or ask about an individual session." },
    ],
    scope: "This is an introductory conversation, not a medical or mental-health diagnosis. No cure, business outcome or personal change is guaranteed.",
    methodEyebrow: "THE METHODS, EXPLAINED",
    methodTitle: "I choose the approach around your question",
    methodLead: "These are optional ways of exploring a concern, not four extra services you have to compare before getting in touch.",
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
    lead: "Не нужно разбираться в гипнотерапии, расстановках и других методах. Выберите ситуацию, которая вам близка. Первый разговор — бесплатно.",
    outcomeLabel: "Что можем прояснить вместе",
    methodsLabel: "Возможные методы",
    cardAction: "Обсудить бесплатно",
    solutions: [
      {
        title: "Не хватает сил, много напряжения",
        summary: "Хочется понять, что забирает ресурс, и найти более устойчивый способ справляться с ситуацией.",
        outcomes: ["Рассмотреть возможные причины перегрузки и повторяющиеся реакции", "Прояснить, каких ресурсов, границ или поддержки вам не хватает"],
        method: "Образная работа и исследование ресурсов; при необходимости — дополнительная беседа о психогомеопатии.",
        topic: "wellbeing",
        image: "/images/holistic-house/homeopathy-still-life.svg",
      },
      {
        title: "Трудности в отношениях и повторяющиеся эмоции",
        summary: "Снова возникают знакомые реакции, внутренние конфликты или сложные ситуации с близкими.",
        outcomes: ["Исследовать эмоциональные триггеры, роли и потребности", "Посмотреть на границы, варианты выбора и новые способы реагирования"],
        method: "Образы, работа с внутренними частями и системное исследование.",
        topic: "personal",
        image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
      },
      {
        title: "Есть цель, но не получается двигаться",
        summary: "Вы знаете, чего хотите, но сталкиваетесь с сомнениями, неясностью или привычными препятствиями.",
        outcomes: ["Уточнить цель и предполагаемые препятствия", "Найти варианты следующих реалистичных шагов"],
        method: "Образная работа, системные и архетипические расстановки.",
        topic: "goal",
        image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      },
      {
        title: "Сложное решение в бизнесе, карьере или жизни",
        summary: "Хочется увидеть ситуацию шире, прежде чем выбрать направление и вкладывать силы.",
        outcomes: ["Разобрать роли, участников, ограничения и приоритеты", "Рассмотреть альтернативы и вопросы, которые нужно проверить"],
        method: "Бизнес-расстановки и анализ решений как дополнение к вашей экспертизе.",
        topic: "business",
        image: "/images/holistic-house/video-posters/services-en-v2.webp",
      },
    ],
    bridgeEyebrow: "ВАШ ПЕРВЫЙ ШАГ",
    bridgeTitle: "Бесплатный разбор без обязательной покупки сессий",
    bridgeText: "Расскажите, что происходит. Вместе проясним ваш запрос и возможный следующий шаг. На этом можно остановиться — платная работа необязательна.",
    bridgeButton: "Записаться на бесплатную диагностику",
    processEyebrow: "КАК ЭТО ПРОХОДИТ",
    processTitle: "Что именно вы получите",
    steps: [
      { title: "1. Ваш запрос", text: "Начинаем с реальной ситуации, а не с готовой техники или программы." },
      { title: "2. Больше ясности", text: "Обсуждаем повторяющиеся схемы, уже опробованные решения и возможные ресурсы." },
      { title: "3. Возможный следующий шаг", text: "Вы сможете обдумать варианты самостоятельно или узнать о личной работе." },
    ],
    scope: "Это вводный разбор, а не медицинская или психиатрическая диагностика. Излечение, деловые достижения и личные изменения не гарантируются.",
    methodEyebrow: "МЕТОДЫ — ТОЛЬКО ПОЯСНЕНИЕ",
    methodTitle: "Метод подбирается под задачу",
    methodLead: "Это дополнительные способы исследования запроса, а не ещё несколько конкурирующих услуг, которые нужно выбрать заранее.",
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

const solutionIcons = [HeartPulse, HeartHandshake, Compass, BriefcaseBusiness] as const;

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
          {t.solutions.map((solution, index) => {
            const Icon = solutionIcons[index];
            return (
              <article className={styles.card} key={solution.topic} id={solution.topic}>
                <div className={styles.cardTop}>
                  <div className={styles.photo}>
                    <Image src={solution.image} alt="" fill sizes="(max-width: 760px) 105px, 155px" loading="lazy" />
                  </div>
                  <div className={styles.cardIntro}>
                    <span className={styles.icon}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
                    <h3>{solution.title}</h3>
                    <p>{solution.summary}</p>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.label}>{t.outcomeLabel}</p>
                  <ul>
                    {solution.outcomes.map((outcome) => <li key={outcome}><Check size={16} aria-hidden="true" />{outcome}</li>)}
                  </ul>
                  <p className={styles.method}><strong>{t.methodsLabel}:</strong> {solution.method}</p>
                </div>
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
