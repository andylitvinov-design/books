import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { metadataBaseFor } from "@/data/site-metadata";
import type { PublicLocale } from "@/lib/public-locales";

type Props = { params: Promise<{ locale: string }> };

const copy = {
  en: {
    title: "Personal Wu Xing Profile",
    description: "A reflective five-elements framework inside Holistic House.",
    kicker: "Mind–Body Monitor",
    heading: "Personal Wu Xing Profile",
    lead: "A five-elements reflection can be useful for exploring patterns in energy, emotion, relationships and daily life. It is kept separate from validated mental-health screening.",
    statusTitle: "What is available now",
    statusText: "The automated personal Wu Xing scoring model is not live yet because its exact questions, source model and scoring rules still need a separate approved specification. We will not invent a diagnosis or score.",
    canDoTitle: "You can still start with a real measurement",
    canDoText: "Use the current-state check or the monitoring catalogue now. Those results can be saved to your Cabinet and compared over time.",
    start: "Quick State Check",
    tests: "Monitoring Tests",
    note: "For self-reflection and wellbeing tracking. Not a medical diagnosis or treatment recommendation.",
  },
  ru: {
    title: "Личный профиль У-Син",
    description: "Рефлексивная модель пяти элементов внутри Holistic House.",
    kicker: "Монитор состояния",
    heading: "Личный профиль У-Син",
    lead: "Модель пяти элементов может быть полезна для исследования закономерностей энергии, эмоций, отношений и повседневного состояния. Она остаётся отдельной от валидированных психологических скринингов.",
    statusTitle: "Что доступно сейчас",
    statusText: "Автоматическая персональная оценка У-Син пока не запущена: для неё нужно отдельно утвердить точные вопросы, исходную модель и правила расчёта. Мы не будем придумывать диагноз или балл.",
    canDoTitle: "Уже сейчас можно начать с реального замера",
    canDoText: "Пройдите проверку текущего состояния или откройте каталог мониторинга. Результаты можно сохранить в Кабинете и сравнивать со временем.",
    start: "Проверить состояние",
    tests: "Тесты мониторинга",
    note: "Для самонаблюдения и отслеживания состояния. Не является медицинской диагностикой или назначением лечения.",
  },
  es: {
    title: "Perfil personal Wu Xing",
    description: "Un marco reflexivo de cinco elementos dentro de Holistic House.",
    kicker: "Monitor mente–cuerpo",
    heading: "Perfil personal Wu Xing",
    lead: "El marco de cinco elementos puede ayudar a explorar patrones de energía, emoción, relaciones y vida cotidiana. Se mantiene separado del cribado psicológico validado.",
    statusTitle: "Qué está disponible ahora",
    statusText: "El modelo automatizado de puntuación Wu Xing aún no está activo: primero debemos aprobar las preguntas exactas, la fuente y las reglas de puntuación. No inventaremos un diagnóstico ni una puntuación.",
    canDoTitle: "Puedes empezar con una medición real",
    canDoText: "Haz la revisión de estado actual o abre el catálogo de seguimiento. Los resultados pueden guardarse en tu Cabinet y compararse con el tiempo.",
    start: "Revisión rápida",
    tests: "Tests de seguimiento",
    note: "Para autoobservación y seguimiento del bienestar. No es un diagnóstico médico ni una recomendación de tratamiento.",
  },
} as const;

function isLocale(value: string): value is PublicLocale {
  return value === "en" || value === "ru" || value === "es";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { title: "Not found" };
  const text = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: `${text.title} — Holistic House`,
    description: text.description,
    alternates: {
      canonical: `/${locale}/wu-xing`,
      languages: { en: "/en/wu-xing", ru: "/ru/wu-xing", es: "/es/wu-xing" },
    },
  };
}

export default async function WuXingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const text = copy[locale];

  return (
    <main className="wu-xing-intro" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <section className="wu-xing-intro__hero">
        <p className="homeopathy-kicker">{text.kicker}</p>
        <h1>{text.heading}</h1>
        <p>{text.lead}</p>
      </section>

      <section className="wu-xing-intro__grid">
        <article>
          <h2>{text.statusTitle}</h2>
          <p>{text.statusText}</p>
        </article>
        <article>
          <h2>{text.canDoTitle}</h2>
          <p>{text.canDoText}</p>
          <div className="wu-xing-intro__actions">
            <Link className="hh-primary" href={`/${locale}/client#cabinet-tests`}>{text.start}</Link>
            <Link href={`/${locale}/client#cabinet-tests`}>{text.tests}</Link>
          </div>
        </article>
      </section>

      <p className="wu-xing-intro__note">{text.note}</p>
    </main>
  );
}
