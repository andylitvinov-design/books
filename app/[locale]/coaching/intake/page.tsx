import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { CoachingIntakeForm } from "@/components/coaching-intake-form";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "../coaching-page.module.css";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: {
    title: "My coaching questionnaire — Holistic House",
    description: "A private, one-page coaching questionnaire to clarify your request, desired outcome and questions for a coach.",
    back: "All coaching sessions", intro: "PERSONAL COACHING · ONE PAGE", hero: "Begin with a question that matters to you.",
    caption: "Your words, your pace. Signing in is optional until you choose to save privately.",
    artAlt: "Quiet heron standing among reeds in warm morning light",
    privacy: "A draft is not a booking or a message to a coach.",
  },
  ru: {
    title: "Моя коучинг-анкета — Holistic House",
    description: "Приватная коучинг-анкета на одной странице: ваш запрос, цель, ресурсы и вопросы коучу.",
    back: "Все коуч-сессии", intro: "ЛИЧНЫЙ КОУЧИНГ · ОДНА СТРАНИЦА", hero: "Начните с вопроса, который действительно важен.",
    caption: "Ваши слова, ваш темп. Вход нужен только для приватного сохранения.",
    artAlt: "Цапля в камышах в тёплом утреннем свете",
    privacy: "Черновик не является записью на сессию или сообщением коучу.",
  },
  es: {
    title: "Mi formulario de coaching — Holistic House",
    description: "Un formulario privado de coaching en una página para explorar tu consulta, tus metas y tus preguntas.",
    back: "Todas las sesiones", intro: "COACHING PERSONAL · UNA PÁGINA", hero: "Empieza con una pregunta importante para ti.",
    caption: "Tus palabras, tu ritmo. Solo necesitas iniciar sesión si quieres guardar en privado.",
    artAlt: "Garza tranquila entre los juncos a la luz cálida de la mañana",
    privacy: "Un borrador no es una reserva ni un mensaje al coach.",
  },
} as const;
export const dynamic = "force-dynamic";
export const revalidate = 0;
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
      canonical: "/" + locale + "/coaching/intake",
      languages: { en: "/en/coaching/intake", ru: "/ru/coaching/intake", es: "/es/coaching/intake", "x-default": "/en/coaching/intake" },
    },
    robots: { index: true, follow: true },
    referrer: "no-referrer",
  };
}
export default async function CoachingPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy[locale];
  return <div className={styles.page} lang={locale}>
    <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
    <main className={styles.shell}>
      <nav className={styles.breadcrumb} aria-label={t.back}>
        <Link href={"/" + locale + "/coaching"} prefetch={false}><ArrowLeft size={16} aria-hidden="true" />{t.back}</Link>
      </nav>
      <section className={styles.hero} aria-labelledby="coaching-page-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{t.intro}</p>
          <h1 id="coaching-page-title">{t.hero}</h1>
          <p>{t.caption}</p>
          <span className={styles.privacy}><ShieldCheck size={16} aria-hidden="true" />{t.privacy}</span>
        </div>
        <div className={styles.heroImage}>
          <Image src="/images/holistic-house/course-start-heron.webp" alt={t.artAlt} fill priority sizes="(max-width: 680px) 100vw, 35vw" />
        </div>
      </section>
      <CoachingIntakeForm locale={locale} />
    </main>
  </div>;
}
