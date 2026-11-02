import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { StaticPortrait } from "@/components/static-portrait";
import { FreeDiagnosisOffers } from "@/components/free-diagnosis-offers";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { metadataBaseFor } from "@/data/site-metadata";
import { publicLocales, type PublicLocale } from "@/lib/public-locales";
import styles from "./free-consultation.module.css";

type Props = { params: Promise<{ locale: string }> };

const copy = {
  en: {
    title: "Free Diagnosis & Personal Consultation | Holistic House",
    description: "Choose a free written situation review, a free symbolic Wu Xing Five Elements resource profile or a €50 personal consultation with Andrey Litvinov.",
    eyebrow: "HOLISTIC HOUSE · FIND YOUR FIRST STEP",
    heading: "Choose your diagnosis or personal consultation.",
    lead: "Two free written options for exploring your situation and resources, or a live 30-minute personal session for €50. See the details and request the option you prefer.",
    action: "See the three options",
    safety: "Wu Xing is a symbolic method for reflection, not a medical diagnostic or treatment. A consultation request is not a confirmed booking or payment.",
    back: "See all personal services",
  },
  ru: {
    title: "Бесплатная диагностика и личная консультация | Holistic House",
    description: "Бесплатная диагностика ситуации, бесплатный разбор энергии и ресурсов по У-Син (Пять стихий) и личная консультация с Андреем Литвиновым 30 минут за €50.",
    eyebrow: "HOLISTIC HOUSE · С ЧЕГО НАЧАТЬ",
    heading: "Выберите диагностику или личную консультацию.",
    lead: "Два варианта бесплатного письменного разбора — ситуации и ресурсов по У-Син. Или личная сессия с Андреем: 30 минут за €50. Под каждой карточкой есть детали и заказ.",
    action: "Посмотреть три варианта",
    safety: "У-Син — символическая модель самоисследования, не медицинская диагностика и не лечение. Заявка на консультацию не означает подтверждённую запись или оплату.",
    back: "Все индивидуальные услуги",
  },
  es: {
    title: "Diagnóstico gratis y consulta personal | Holistic House",
    description: "Revisión escrita gratuita de tu situación, perfil simbólico Wu Xing (Cinco Elementos) o consulta personal de 30 minutos por €50 con Andrey Litvinov.",
    eyebrow: "HOLISTIC HOUSE · TU PRIMER PASO",
    heading: "Elige tu revisión o consulta personal.",
    lead: "Dos revisiones escritas gratuitas de tu situación o tus recursos Wu Xing, o una sesión personal de 30 minutos por €50. Lee los detalles y solicita tu formato.",
    action: "Ver las tres opciones",
    safety: "Wu Xing es un método simbólico de reflexión, no un diagnóstico o tratamiento médico. La solicitud de una consulta no confirma una reserva ni un pago.",
    back: "Todos los servicios personales",
  },
} as const;

export function generateStaticParams() {
  return publicLocales.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!publicLocales.includes(locale as PublicLocale)) return { title: "Not found", robots: { index: false } };
  const t = copy[locale as PublicLocale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title, description: t.description,
    alternates: {
      canonical: "/" + locale + "/services/free-consultation",
      languages: {
        en: "/en/services/free-consultation",
        ru: "/ru/services/free-consultation",
        es: "/es/services/free-consultation",
        "x-default": "/en/services/free-consultation",
      },
    },
    openGraph: {
      type: "website", siteName: "Holistic House",
      locale: locale === "ru" ? "ru_RU" : locale === "es" ? "es_ES" : "en_CA",
      url: "/" + locale + "/services/free-consultation",
      title: t.title, description: t.description,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov — Holistic House" }],
    },
  };
}

export default async function FreeConsultationPage({ params }: Props) {
  const { locale } = await params;
  if (!publicLocales.includes(locale as PublicLocale)) notFound();
  const lang = locale as PublicLocale;
  const t = copy[lang];

  return (
    <main lang={lang} className={styles.page} data-free-consultation-hub>
      <PublicSiteHeader locale={lang} />
      <div className={styles.content}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1>{t.heading}</h1>
            <p className={styles.lead}>{t.lead}</p>
            <a href="#free-diagnosis-options" className={styles.heroAction}>
              {t.action}<ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.portrait}>
            <StaticPortrait src="/images/holistic-house/andy-about.png" alt="Andrey Litvinov"
              fill priority sizes="(max-width: 680px) 40vw, 360px" />
          </div>
        </header>
        <FreeDiagnosisOffers locale={lang} />
        <PersonalTestimonials locale={lang} variant="all" />
        <p className={styles.safety}><ShieldCheck size={19} aria-hidden="true" />{t.safety}</p>
        <Link className={styles.back} href={"/" + lang + "/services"} prefetch={false}>
          {t.back}<ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
