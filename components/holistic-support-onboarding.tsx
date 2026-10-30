"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BarChart3, BookOpen, Coins, Compass, Heart, HeartPulse,
  ListChecks, LockKeyhole, Sparkles, TestTubeDiagonal, UserRound,
} from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-onboarding.module.css";

const topics = [
  { id: "wellbeing", Icon: HeartPulse },
  { id: "work", Icon: Coins },
  { id: "relationships", Icon: Heart },
  { id: "identity", Icon: Compass },
] as const;

// All destinations reuse the original guest profile builder or Test Explorer.
// No profile, health result, CRM lead or account is created just by clicking.
const copy = {
  ru: {
    eyebrow: "БЕСПЛАТНОЕ САМОПОЗНАНИЕ",
    title: "Создайте свой профиль",
    lead: "Узнайте свои сильные стороны, ресурсы и направления роста. Подберите бесплатные тесты по важным для вас темам, изучите результаты и наметьте следующие шаги.",
    profile: "Создать свой профиль",
    profileHint: "Выбрать направления и подходящие тесты",
    tests: "Или пройти бесплатные тесты без профиля",
    quote: "Больше понимания — больше себя",
    how: "Как это работает",
    steps: [
      ["Выберите направление", "Энергия и самочувствие, отношения, дело и деньги или смыслы."],
      ["Пройдите бесплатные тесты", "Мы предложим подходящие опросники, а вы сможете изменить их набор."],
      ["Получите результаты и рекомендации", "Изучите отчёты и наметьте следующие шаги."],
    ],
    privacy: "Выбирать темы можно без регистрации. Для приватного сохранения результатов понадобится вход в кабинет.",
    popular: "Популярные направления",
    all: "Все направления",
    topics: {
      wellbeing: ["Профиль здоровья", "Энергия и самочувствие"],
      work: ["Профиль денег", "Доход и устойчивость"],
      relationships: ["Профиль отношений", "Близость и поддержка"],
      identity: ["Профиль смыслов", "Ценности и направление"],
    },
    testsEyebrow: "ТЕСТЫ",
    testsTitle: "Исследуй свой запрос",
    testsDescription: "Выбери бесплатный тест или профиль. Результаты помогают в самоисследовании, но не заменяют диагностику.",
    openTests: "Открыть тесты",
  },
  en: {
    eyebrow: "FREE SELF-EXPLORATION",
    title: "Create your personal profile",
    lead: "Discover your strengths, resources and directions for growth. Choose free tests on topics that matter to you, explore your results and plan your next steps.",
    profile: "Create my profile",
    profileHint: "Choose topics and matching tests",
    tests: "Or take free tests without creating a profile",
    quote: "Understand more — become more yourself",
    how: "How it works",
    steps: [
      ["Choose a direction", "Energy and wellbeing, relationships, work and money, or meaning."],
      ["Take free tests", "We suggest suitable questionnaires and you can change the selection."],
      ["Explore results and recommendations", "Review reports and choose your next steps."],
    ],
    privacy: "You can choose topics without signing in. Private saving of available results requires an account sign-in.",
    popular: "Popular directions",
    all: "All directions",
    topics: {
      wellbeing: ["Health profile", "Energy and wellbeing"],
      work: ["Money profile", "Income and stability"],
      relationships: ["Relationships profile", "Connection and support"],
      identity: ["Meaning profile", "Values and direction"],
    },
    testsEyebrow: "TESTS",
    testsTitle: "Explore your question",
    testsDescription: "Choose a free test or personality profile. Results support self-reflection, not medical diagnosis.",
    openTests: "Open tests",
  },
  es: {
    eyebrow: "AUTOCONOCIMIENTO GRATIS",
    title: "Crea tu perfil personal",
    lead: "Descubre tus fortalezas, recursos y posibilidades de crecimiento. Elige tests gratuitos sobre temas importantes, consulta los resultados y prepara tus próximos pasos.",
    profile: "Crear mi perfil",
    profileHint: "Elegir temas y pruebas adecuadas",
    tests: "O hacer tests gratuitos sin crear un perfil",
    quote: "Más comprensión — más autenticidad",
    how: "Cómo funciona",
    steps: [
      ["Elige un área", "Energía y bienestar, relaciones, trabajo y dinero o sentido."],
      ["Realiza tests gratuitos", "Sugerimos cuestionarios adecuados y puedes cambiar la selección."],
      ["Explora resultados y recomendaciones", "Consulta los informes y elige tus próximos pasos."],
    ],
    privacy: "Puedes elegir temas sin registrarte. Para guardar los resultados disponibles de forma privada necesitas iniciar sesión.",
    popular: "Áreas populares",
    all: "Todas las áreas",
    topics: {
      wellbeing: ["Perfil de salud", "Energía y bienestar"],
      work: ["Perfil de dinero", "Ingresos y estabilidad"],
      relationships: ["Perfil de relaciones", "Conexión y apoyo"],
      identity: ["Perfil de sentido", "Valores y dirección"],
    },
    testsEyebrow: "TESTS",
    testsTitle: "Explora tu pregunta",
    testsDescription: "Elige un test gratuito o un perfil personal. Los resultados ayudan a reflexionar, no diagnostican.",
    openTests: "Abrir tests",
  },
} as const;

const steps = [Compass, ListChecks, BarChart3] as const;

export function HolisticSupportOnboarding({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const builder = `/${locale}/personality-profiles?start=1`;
  const tests = `/${locale}/client/tests`;
  return <div className={styles.root} data-support-onboarding>
    <section className={styles.hero} aria-labelledby="support-onboarding-title" data-support-onboarding-hero>
      <Image src="/images/holistic-house/support-mock-hero.webp" alt="" fill
        priority sizes="(max-width: 640px) 75vw, 480px" className={styles.heroPhoto} />
      <div className={styles.heroWash} aria-hidden="true" />
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
        <h1 id="support-onboarding-title">{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>
        <Link href={builder} className={styles.primary} prefetch={false}
          data-support-start-profile>
          <UserRound size={21} aria-hidden="true" />
          <span><strong>{t.profile}</strong><small>{t.profileHint}</small></span>
          <ArrowRight size={22} aria-hidden="true" />
        </Link>
        <Link href={tests} className={styles.secondary} prefetch={false} data-support-start-tests>
          <span>{t.tests}</span><ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <span className={styles.heroQuote} aria-hidden="true">{t.quote}</span>
    </section>

    <section className={styles.how} aria-labelledby="support-how-heading"
      data-support-how-it-works>
      <h2 id="support-how-heading"><BookOpen size={23} aria-hidden="true" />{t.how}</h2>
      <ol className={styles.steps}>
        {t.steps.map(([name, description], index) => {
          const Icon = steps[index];
          return <li key={name} className={styles.step} data-support-how-step>
            <span className={styles.number}>{index + 1}</span>
            <Icon size={24} aria-hidden="true" />
            <div><strong>{name}</strong><p>{description}</p></div>
          </li>;
        })}
      </ol>
      <p className={styles.privacy}><LockKeyhole size={18} aria-hidden="true" />{t.privacy}</p>
    </section>

    <section className={styles.directions} aria-labelledby="support-popular-heading"
      data-support-popular-directions>
      <div className={styles.sectionHeading}>
        <h2 id="support-popular-heading">{t.popular}</h2>
        <Link href={builder} prefetch={false}>{t.all}<ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
      <div className={styles.tiles}>
        {topics.map(({ id, Icon }) => <Link
          key={id} className={styles.tile} data-topic={id}
          data-support-popular-profile={id}
          href={builder + "&focus=" + id} prefetch={false}>
          <Icon size={25} aria-hidden="true" />
          <strong>{t.topics[id][0]}</strong>
          <small>{t.topics[id][1]}</small>
        </Link>)}
      </div>
    </section>

    <section className={styles.testsTeaser} aria-labelledby="support-teaser-title"
      data-support-tests-teaser>
      <div>
        <p className={styles.teaserEyebrow}><TestTubeDiagonal size={18} aria-hidden="true" />{t.testsEyebrow}</p>
        <h2 id="support-teaser-title">{t.testsTitle}</h2>
        <p>{t.testsDescription}</p>
      </div>
      <Link href={tests} prefetch={false} data-support-teaser-tests>
        {t.openTests}<ArrowRight size={18} aria-hidden="true" />
      </Link>
    </section>
  </div>;
}
