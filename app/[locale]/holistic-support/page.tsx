import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "../temple-support/temple-support.module.css";

type Language = "en" | "ru" | "es";
type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · PRACTICAL SUPPORT", title: "Holistic Support",
    lead: "Find the format of support that fits your situation: remote energy practices, Psychic Alchemy or an experienced practitioner.",
    energy: "Energy Support", alchemy: "Psychic Alchemy", masters: "Find a Master",
    energyTitle: "Energy support at a distance", energyBody: "Describe what kind of support you want and choose a real published practitioner, method and preferred time. A request is not a booking.",
    energyAction: "Explore energy support", alchemyTitle: "Psychic Alchemy · situation analysis",
    alchemyBody: "Explore one situation through reflective imagery and the existing Alchemy of Soul consultation. Homeopathy is not a substitute for evidence-based medical care.",
    alchemyAction: "Explore Psychic Alchemy", mastersTitle: "Choose a specialist", mastersBody: "View published profiles and services before sending a consented personal enquiry.",
    mastersAction: "Find a practitioner", note: "Complementary practices do not diagnose, treat or replace healthcare. Practitioner approval, availability and price are confirmed separately."
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ПРАКТИЧЕСКАЯ ПОДДЕРЖКА", title: "Holistic Support",
    lead: "Выберите подходящую форму помощи: дистанционная энергоподдержка, психическая алхимия или работа со специалистом.",
    energy: "Энергоподдержка", alchemy: "Психическая алхимия", masters: "Выбрать мастера",
    energyTitle: "Дистанционная энергетическая поддержка", energyBody: "Опишите запрос, выберите опубликованного специалиста, метод и удобное время. Заявка ещё не означает запись.",
    energyAction: "Выбрать энергоподдержку", alchemyTitle: "Психическая алхимия · разбор ситуации",
    alchemyBody: "Исследуйте ситуацию через работу с образами в существующей консультации «Алхимия души». Гомеопатия не заменяет медицинскую помощь.",
    alchemyAction: "Подробнее о психической алхимии", mastersTitle: "Выбрать специалиста", mastersBody: "Посмотрите опубликованные профили и услуги, затем при желании отправьте согласованную заявку.",
    mastersAction: "Найти мастера", note: "Дополнительные практики не диагностируют и не заменяют лечение. Возможность записи, время и цену специалист подтверждает отдельно."
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · APOYO PRÁCTICO", title: "Apoyo holístico",
    lead: "Elige entre apoyo energético a distancia, Alquimia Psíquica o una consulta con un profesional.",
    energy: "Apoyo energético", alchemy: "Alquimia Psíquica", masters: "Buscar profesional",
    energyTitle: "Apoyo energético a distancia", energyBody: "Explica qué necesitas, elige un profesional publicado, una práctica y un horario. Una solicitud no es una reserva.",
    energyAction: "Explorar apoyo energético", alchemyTitle: "Alquimia Psíquica · análisis de situación",
    alchemyBody: "Explora una situación con imágenes y la consulta existente de Alquimia del Alma. La homeopatía no sustituye a la atención médica.",
    alchemyAction: "Conocer la Alquimia Psíquica", mastersTitle: "Encontrar profesional", mastersBody: "Consulta perfiles y servicios publicados antes de enviar una solicitud con consentimiento.",
    mastersAction: "Elegir profesional", note: "Las prácticas complementarias no diagnostican ni sustituyen el tratamiento. Disponibilidad, horario y precio requieren confirmación."
  }
} as const;

export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }]; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false } };
  const t = copy[locale as Language];
  return {
    metadataBase: metadataBaseFor(), title: t.title + " | Holistic House", description: t.lead,
    alternates: { canonical: "/" + locale + "/holistic-support",
      languages: { en: "/en/holistic-support", ru: "/ru/holistic-support", es: "/es/holistic-support", "x-default": "/en/holistic-support" } }
  };
}
export default async function HolisticSupportPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const language = locale as Language;
  const t = copy[language];
  return <main className={styles.page} data-holistic-support-page lang={language}>
    <PublicSiteHeader locale={language} />
    <div className={styles.shell}>
      <section className={styles.hero} aria-labelledby="holistic-support-title">
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{t.eyebrow}</p><h1 id="holistic-support-title">{t.title}</h1><p>{t.lead}</p>
        </div>
        <div className={styles.heroPhoto}><Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill priority sizes="(max-width:760px) 35vw, 330px" /></div>
      </section>
      <nav className={styles.quickNav} aria-label={t.title}>
        <a href="#energy"><span aria-hidden="true">✦</span>{t.energy}</a>
        <a href="#alchemy"><span aria-hidden="true">☼</span>{t.alchemy}</a>
        <a href="#masters"><span aria-hidden="true">♧</span>{t.masters}</a>
      </nav>
      <section id="energy" className={styles.section}>
        <h2>{t.energyTitle}</h2><p className={styles.sectionIntro}>{t.energyBody}</p>
        <div className={styles.offers}><article className={styles.offer}>
          <div className={styles.offerImage}><Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill sizes="(max-width:760px) 115px, 180px" /></div>
          <div className={styles.offerContent}>
            <h3>{t.energy}</h3><p>{t.energyBody}</p>
            <Link className={styles.primaryAction} href={"/" + language + "/services/remote-energy-support"} prefetch={false}>{t.energyAction} <span aria-hidden="true">→</span></Link>
          </div>
        </article></div>
      </section>
      <section id="alchemy" className={styles.section}>
        <h2>{t.alchemyTitle}</h2><p className={styles.sectionIntro}>{t.alchemyBody}</p>
        <Link className={styles.primaryAction} href={"/" + language + "/services/alchemy-of-soul"} prefetch={false}>{t.alchemyAction} <span aria-hidden="true">→</span></Link>
      </section>
      <section id="masters" className={styles.section}>
        <h2>{t.mastersTitle}</h2><p className={styles.sectionIntro}>{t.mastersBody}</p>
        <Link className={styles.secondaryAction} href={"/" + language + "/masters"} prefetch={false}>{t.mastersAction} <span aria-hidden="true">→</span></Link>
      </section>
      <footer className={styles.privacy}><p>{t.note}</p></footer>
    </div>
  </main>;
}
