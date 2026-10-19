import Link from "next/link";
import { ArrowRight, ChevronDown, PlayCircle } from "lucide-react";

import { PageVideo } from "@/components/page-video";
import { ServicesAboutEntry } from "@/components/services-about-entry";
import { ServiceVideoShowcase } from "@/components/service-video-showcase";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-studio-extras.module.css";

const copy = {
  en: {
    aboutEyebrow: "MEET YOUR PRACTITIONER",
    aboutTitle: "A personal introduction",
    aboutLead: "Meet Andrey and hear how a first conversation can help you choose an approach.",
    methodsTitle: "How the methods work",
    methodsLead: "Two optional video explanations · watch only if you are curious",
    methodHypnotherapy: "Guided imagery & hypnotherapy",
    methodConstellations: "Systemic constellations",
    methodArchive: "More videos from the archive",
    directoryTitle: "Looking for another practitioner or a different format?",
    directoryLead: "Our full service directory and optional topic-based search are available separately, so you can explore without losing your place here.",
    directoryAction: "Browse all services",
    mastersAction: "Meet other practitioners",
    payments: "Consultation payment options · PayPal / ZEN.COM",
  },
  ru: {
    aboutEyebrow: "ЗНАКОМСТВО С МАСТЕРОМ",
    aboutTitle: "Немного обо мне",
    aboutLead: "Познакомьтесь с Андреем и узнайте, как мы выбираем подход для личной работы.",
    methodsTitle: "Как работают методы",
    methodsLead: "Два дополнительных видео · смотрите, если хочется узнать подробнее",
    methodHypnotherapy: "Образная гипнотерапия",
    methodConstellations: "Системные расстановки",
    methodArchive: "Другие видео из архива",
    directoryTitle: "Ищете другого мастера или иной формат?",
    directoryLead: "Полный каталог услуг и дополнительный подбор по темам находятся отдельно и не отвлекают от личных предложений.",
    directoryAction: "Все услуги и подбор",
    mastersAction: "Познакомиться с мастерами",
    payments: "Варианты оплаты консультаций · PayPal / ZEN.COM",
  },
  es: {
    aboutEyebrow: "CONOCE A TU PROFESIONAL",
    aboutTitle: "Una presentación personal",
    aboutLead: "Conoce a Andrey y cómo elegimos un enfoque para empezar a trabajar juntos.",
    methodsTitle: "Cómo funcionan los métodos",
    methodsLead: "Dos vídeos opcionales · audio original en inglés",
    methodHypnotherapy: "Imágenes guiadas e hipnoterapia",
    methodConstellations: "Constelaciones sistémicas",
    methodArchive: "Más vídeos del archivo",
    directoryTitle: "¿Buscas otro profesional o formato?",
    directoryLead: "El directorio y la búsqueda temática están en una página aparte, sin distraerte de los servicios personales.",
    directoryAction: "Explorar todos los servicios",
    mastersAction: "Conocer a otros profesionales",
    payments: "Opciones de pago · PayPal",
  },
} as const;

export function ServicesIntroMedia({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <section className={styles.intro} id="meet-andrey" aria-labelledby="services-meet-title" data-services-meet lang={locale}>
      <header className={styles.sectionTitle}>
        <p>{t.aboutEyebrow}</p>
        <h2 id="services-meet-title">{t.aboutTitle}</h2>
        <span>{t.aboutLead}</span>
      </header>
      <div className={styles.introGrid}>
        <ServicesAboutEntry locale={locale} />
        <div className={styles.introVideo}>
          {locale === "es"
            ? <ServiceVideoShowcase locale="es" topic="overview" id="es-service-video-overview" />
            : <PageVideo slot="services-intro" locale={locale} />}
        </div>
      </div>
    </section>
  );
}

export function ServicesMethodVideos({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <details className={styles.methods} id="method-videos" data-services-methods lang={locale}>
      <summary>
        <span><strong>{t.methodsTitle}</strong><small>{t.methodsLead}</small></span>
        <ChevronDown size={22} aria-hidden="true" />
      </summary>
      <div className={styles.methodsContent}>
        {locale === "es" ? (
          <div className={styles.methodGrid}>
            <article><h3>{t.methodHypnotherapy}</h3><ServiceVideoShowcase locale="es" topic="hypnotherapy" id="es-service-video-hypnotherapy" /></article>
            <article><h3>{t.methodConstellations}</h3><ServiceVideoShowcase locale="es" topic="constellations" id="es-service-video-constellations" /></article>
          </div>
        ) : (
          <>
            <div className={styles.methodGrid}>
              <article><h3>{t.methodHypnotherapy}</h3><PageVideo slot="method-hypnotherapy" locale={locale} /></article>
              <article><h3>{t.methodConstellations}</h3><PageVideo slot="method-constellations" locale={locale} /></article>
            </div>
            <details className={styles.archive}>
              <summary><PlayCircle size={17} aria-hidden="true" />{t.methodArchive}</summary>
              <div className={styles.methodGrid}>
                <PageVideo slot="service-business" locale={locale} />
                <PageVideo slot="service-alchemy" locale={locale} />
                <PageVideo slot="service-archetypal" locale={locale} />
                <PageVideo slot="consultation" locale={locale} />
              </div>
            </details>
          </>
        )}
      </div>
    </details>
  );
}

export function ServicesDirectoryInvitation({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <aside className={styles.directory} data-services-directory-invitation lang={locale}>
      <div>
        <h2>{t.directoryTitle}</h2>
        <p>{t.directoryLead}</p>
      </div>
      <div className={styles.directoryActions}>
        <Link href={"/" + locale + "/services/catalog"} prefetch={false} className={styles.browse}>
          {t.directoryAction}<ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link href={"/" + locale + "/masters"} prefetch={false} className={styles.masters}>{t.mastersAction}</Link>
        <Link href={"/" + locale + "/payments"} prefetch={false} className={styles.payments}>{t.payments}</Link>
      </div>
    </aside>
  );
}
