import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { daoStages } from "@/data/dao/taoist-stages.mjs";
import styles from "./dao-stages.module.css";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: {
    title: "The 18 stages of Dao · Inner Alchemy",
    description: "Explore all 18 stages of Andrey Litvinov's authored Inner Alchemy framework: Health, Success, and Spirit.",
    eyebrow: "TAOIST WISDOM · THE INNER ALCHEMY PATH",
    intro: "A symbolic map of personal development in three cycles. Each stage has its own theme and invitation to grow. This is the author's reflective framework, not a medical diagnosis or a validated measurement.",
    phases: [
      { title: "Cycle 1 · Alchemy of Health", note: "Stages 1–7 · Finding your ground, energy and living connection" },
      { title: "Cycle 2 · Alchemy of Success", note: "Stages 8–14 · Relationships, contribution and purposeful action" },
      { title: "Cycle 3 · Alchemy of Spirit", note: "Stages 15–18 · Presence and connection with Dao" },
    ],
    stage: "Stage",
    theme: "Developmental theme",
    back: "Back to Taoist aphorisms",
    diagnosticTitle: "Where are you on your Dao journey?",
    diagnosticLead: "Request a free personal written reflection. Tell Andrey what you are experiencing in a confidential coaching questionnaire, and ask for a symbolic stage interpretation and recommendations.",
    diagnosticAction: "Request my free personal Dao review",
    disclaimer: "These stages are reflective images, not scores, health levels or clinical diagnoses. Your stage is not inferred automatically.",
  },
  ru: {
    title: "18 ступеней Дао · Внутренняя алхимия",
    description: "Все 18 ступеней авторской модели Внутренней алхимии Андрея Литвинова: здоровье, успех и дух.",
    eyebrow: "ДАОССКАЯ МУДРОСТЬ · ПУТЬ ВНУТРЕННЕЙ АЛХИМИИ",
    intro: "Символическая карта личного развития из трёх циклов. У каждой ступени своя тема и задача роста. Это авторская модель для самопознания, а не медицинская диагностика или проверенная количественная шкала.",
    phases: [
      { title: "Цикл 1 · Алхимия здоровья", note: "Ступени 1–7 · Опора, энергия, живой контакт" },
      { title: "Цикл 2 · Алхимия успеха", note: "Ступени 8–14 · Отношения, вклад, реализация" },
      { title: "Цикл 3 · Алхимия духа", note: "Ступени 15–18 · Присутствие и связь с Дао" },
    ],
    stage: "Ступень",
    theme: "Задача развития",
    back: "К даосским афоризмам",
    diagnosticTitle: "Где вы на пути Дао?",
    diagnosticLead: "Закажите бесплатный личный письменный разбор. Опишите вашу ситуацию в защищённой коучинговой анкете и попросите Андрея рассмотреть вашу возможную ступень Дао и рекомендации.",
    diagnosticAction: "Заказать бесплатную диагностику ступени Дао",
    disclaimer: "Ступени — образы для размышления, а не баллы, уровни здоровья или диагнозы. Определение ступени не происходит автоматически.",
  },
  es: {
    title: "Las 18 etapas del Dao · Alquimia Interior",
    description: "Conoce las 18 etapas del modelo original de Alquimia Interior de Andrey Litvinov: salud, éxito y espíritu.",
    eyebrow: "SABIDURÍA TAOÍSTA · EL CAMINO DE ALQUIMIA INTERIOR",
    intro: "Un mapa simbólico de desarrollo personal en tres ciclos. Cada etapa plantea una tarea de crecimiento. Es un marco de reflexión del autor, no un diagnóstico médico ni una medición validada.",
    phases: [
      { title: "Ciclo 1 · Alquimia de la salud", note: "Etapas 1–7 · Apoyo, energía y conexión" },
      { title: "Ciclo 2 · Alquimia del éxito", note: "Etapas 8–14 · Relaciones, aportación y acción" },
      { title: "Ciclo 3 · Alquimia del espíritu", note: "Etapas 15–18 · Presencia y conexión con el Dao" },
    ],
    stage: "Etapa",
    theme: "Tema de crecimiento",
    back: "Volver a los aforismos",
    diagnosticTitle: "¿En qué etapa de tu camino estás?",
    diagnosticLead: "Solicita una reflexión personal escrita y gratuita. Describe tu situación en el cuestionario privado de coaching y pide a Andrey una interpretación simbólica de tu etapa y recomendaciones.",
    diagnosticAction: "Solicitar evaluación personal gratuita",
    disclaimer: "Las etapas son imágenes de reflexión, no puntuaciones, niveles de salud ni diagnósticos. Tu etapa no se calcula automáticamente.",
  },
} as const;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false } };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title,
    description: t.description,
    alternates: {
      canonical: "/" + locale + "/dao/stages",
      languages: {
        en: "/en/dao/stages",
        ru: "/ru/dao/stages",
        es: "/es/dao/stages",
        "x-default": "/en/dao/stages",
      },
    },
  };
}

export default async function DaoStagesPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy[locale];

  return (
    <main className={styles.page} lang={locale} data-dao-stages-page>
      <PublicSiteHeader locale={locale} />
      <div className={styles.shell}>
        <Link href={"/" + locale + "/holistic-support"} prefetch={false} className={styles.back}>
          <span aria-hidden="true">←</span> {t.back}
        </Link>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </header>

        {([1, 2, 3] as const).map(phase => (
          <section key={phase} className={styles.phase} aria-labelledby={"dao-phase-" + phase}>
            <div className={styles.phaseHeading}>
              <h2 id={"dao-phase-" + phase}>{t.phases[phase - 1].title}</h2>
              <p>{t.phases[phase - 1].note}</p>
            </div>
            <div className={styles.stageGrid}>
              {daoStages.filter(stage => stage.phase === phase).map(stage => (
                <article key={stage.number} id={"stage-" + stage.number} className={styles.stage} data-dao-stage={stage.number}>
                  <span className={styles.stageNumber}>{t.stage} {stage.number}</span>
                  <h3>{stage.name[locale]}</h3>
                  <p className={styles.stageLabel}>{t.theme}</p>
                  <p>{stage.task[locale]}</p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className={styles.diagnostic} aria-labelledby="dao-diagnostic-heading">
          <h2 id="dao-diagnostic-heading">{t.diagnosticTitle}</h2>
          <p>{t.diagnosticLead}</p>
          <Link href={"/" + locale + "/coaching/intake?topic=personal"} prefetch={false} className={styles.diagnosticLink}>
            {t.diagnosticAction}<span aria-hidden="true"> →</span>
          </Link>
        </section>
        <p className={styles.disclaimer}>{t.disclaimer}</p>
      </div>
    </main>
  );
}
