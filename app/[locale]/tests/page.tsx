import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { metadataBaseFor } from "@/data/site-metadata";
import type { Locale } from "@/data/remedies";
import styles from "./tests.module.css";

type PublicLocale = "en" | "ru" | "es";
type Props = { params: Promise<{ locale: string }> };

const copy = {
  en: {
    title: "Free self-check tests and personal insights | Holistic House",
    description: "Explore free self-check questionnaires about stress, personal patterns and relationships. Reflect on your results and choose your next step, without a diagnosis.",
    eyebrow: "HOLISTIC HOUSE · FREE SELF-CHECKS",
    heading: "Understand yourself, one simple step at a time.",
    intro: "Explore questions about stress, relationships and personal resources. Start with what matters to you; personal support is optional.",
    start: "Explore free tests",
    review: "Get a free written situation review",
    stepsTitle: "How it works",
    steps: [
      ["Choose your focus", "Select a subject that feels useful to explore."],
      ["Answer at your pace", "Work through the questions and review the available explanations."],
      ["Choose what comes next", "Keep exploring or request personal guidance if you want it."],
    ],
    noteTitle: "What these tests can and cannot tell you",
    note: "Self-checks are educational tools for reflection. They are not medical or psychiatric diagnoses and do not replace assessment or care from a qualified professional. Methods and scoring may differ across questionnaires.",
    privacy: "Your individual answers and private reports are not published on this public information page.",
    about: "Learn about Andrey and Holistic House",
  },
  ru: {
    title: "Бесплатные психологические тесты для самопознания | Holistic House",
    description: "Пройдите бесплатные опросники о стрессе, отношениях и личных ресурсах. Исследуйте свои результаты и выберите дальнейший шаг без медицинских диагнозов.",
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНЫЕ ТЕСТЫ",
    heading: "Узнайте себя лучше — спокойно, шаг за шагом.",
    intro: "Выберите интересующую тему: стресс, отношения или личные ресурсы. Начните с простого самоисследования, а личная поддержка — только по желанию.",
    start: "Выбрать бесплатный тест",
    review: "Получить бесплатный письменный разбор ситуации",
    stepsTitle: "Как это работает",
    steps: [
      ["Выберите тему", "Начните с того вопроса, который важен вам сейчас."],
      ["Отвечайте в своём темпе", "Пройдите вопросы и изучите доступные пояснения."],
      ["Выберите следующий шаг", "Продолжайте исследование или обратитесь за личной поддержкой."],
    ],
    noteTitle: "О возможностях и ограничениях тестов",
    note: "Опросники предназначены для саморефлексии и обучения. Они не ставят медицинские или психиатрические диагнозы и не заменяют оценку или помощь квалифицированного специалиста. Методики и способы подсчёта могут различаться.",
    privacy: "Индивидуальные ответы и личные отчёты не публикуются на этой открытой информационной странице.",
    about: "Об Андрее и Holistic House",
  },
  es: {
    title: "Tests gratuitos de autoevaluación y reflexión | Holistic House",
    description: "Explora cuestionarios gratuitos sobre estrés, relaciones y recursos personales. Reflexiona sobre los resultados y elige tu siguiente paso sin diagnósticos médicos.",
    eyebrow: "HOLISTIC HOUSE · AUTOEVALUACIONES GRATUITAS",
    heading: "Conócete mejor, un paso sencillo a la vez.",
    intro: "Explora preguntas sobre el estrés, las relaciones y tus recursos personales. Comienza por lo que más te importa; el acompañamiento individual es opcional.",
    start: "Explorar tests gratuitos",
    review: "Solicitar un análisis escrito gratuito",
    stepsTitle: "Cómo funciona",
    steps: [
      ["Elige un tema", "Empieza por la cuestión que te resulte más útil."],
      ["Responde a tu ritmo", "Completa las preguntas y revisa las explicaciones disponibles."],
      ["Decide qué sigue", "Continúa explorando o solicita orientación personal si lo deseas."],
    ],
    noteTitle: "Qué pueden y qué no pueden indicar estos tests",
    note: "Son herramientas educativas para la reflexión. No ofrecen diagnósticos médicos o psiquiátricos ni sustituyen la evaluación o atención de profesionales cualificados. Los métodos y las puntuaciones varían entre cuestionarios.",
    privacy: "Tus respuestas individuales y los informes privados no se publican en esta página informativa.",
    about: "Conoce a Andrey y Holistic House",
  },
} as const;

const locales: PublicLocale[] = ["en", "ru", "es"];
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as PublicLocale)) return { robots: { index: false } };
  const c = copy[locale as PublicLocale];
  const origin = metadataBaseFor();
  const path = `/${locale}/tests`;
  const languages = Object.fromEntries(locales.map((language) => [language, new URL(`/${language}/tests`, origin).href]));
  languages["x-default"] = languages.en;
  return {
    metadataBase: origin,
    title: c.title,
    description: c.description,
    alternates: { canonical: new URL(path, origin).href, languages },
    openGraph: {
      type: "website",
      siteName: "Holistic House",
      locale: locale === "ru" ? "ru_RU" : locale === "es" ? "es_ES" : "en_CA",
      url: new URL(path, origin).href,
      title: c.title,
      description: c.description,
    },
    twitter: { card: "summary_large_image", title: c.title, description: c.description },
  };
}

export default async function PublicTestsLanding({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as PublicLocale)) notFound();
  const c = copy[locale as PublicLocale];
  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale as Locale} />
      <div className={styles.container}>
        <section className={styles.hero} aria-labelledby="tests-heading">
          <p className={styles.eyebrow}>{c.eyebrow}</p>
          <h1 id="tests-heading">{c.heading}</h1>
          <p className={styles.intro}>{c.intro}</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={`/${locale}/client/tests`}>{c.start} <span aria-hidden="true">→</span></Link>
            <Link className={styles.secondary} href={`/${locale}/services/free-situation-review`}>{c.review}</Link>
          </div>
        </section>
        <section className={styles.section} aria-labelledby="how-tests-work">
          <h2 id="how-tests-work">{c.stepsTitle}</h2>
          <ol className={styles.steps}>
            {c.steps.map(([heading, detail], i) => (
              <li className={styles.step} key={heading}>
                <span className={styles.number} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3>{heading}</h3>
                <p>{detail}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.note} aria-labelledby="tests-limitations">
          <h2 id="tests-limitations">{c.noteTitle}</h2>
          <p>{c.note}</p>
          <p className={styles.privacy}>{c.privacy}</p>
          <Link className={styles.about} href={`/${locale}/about`}>{c.about} <span aria-hidden="true">→</span></Link>
        </section>
      </div>
    </main>
  );
}
