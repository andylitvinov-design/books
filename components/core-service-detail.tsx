import Image from "next/image";
import { StaticPortrait } from "@/components/static-portrait";
import { cardArtworkUrl, hasCardArtwork } from "@/lib/public-card-artwork";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { ServiceVideoShowcase } from "@/components/service-video-showcase";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import styles from "./core-service-detail.module.css";

import { coreOfferDetailData, type DetailKind } from "@/components/core-offer-data";
export { coreOfferDetailData, type DetailKind } from "@/components/core-offer-data";

export function CoreServiceDetail({ locale, kind }: { locale: PublicLocale; kind: DetailKind }) {
  const t = coreOfferDetailData(locale, kind);
  const serviceSlug = { dao: "dao-health-profile", alchemy: "alchemy-of-soul", hypnotherapy: "hypnotherapy-course" }[kind];
  const pathFacts = {
    ru: {
      free: "Бесплатно · Символический профиль",
      session: "Индивидуальные сессии · Стоимость согласуем до записи",
      alchemy: "30 мин · €50 / 60 мин · €100",
      noPayment: "Вы отправляете запрос, а не оплачиваете и не подтверждаете запись",
    },
    en: {
      free: "Free · Symbolic resource profile",
      session: "Personal sessions · Price agreed before booking",
      alchemy: "30 min · €50 / 60 min · €100",
      noPayment: "Send an enquiry first; no payment or automatic booking",
    },
    es: {
      free: "Gratis · Perfil simbólico de recursos",
      session: "Sesiones personales · Precio confirmado antes de reservar",
      alchemy: "30 min · €50 / 60 min · €100",
      noPayment: "Primero envías una solicitud; no hay pago ni reserva automática",
    },
  }[locale];
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: t.title,
    request: t.actionMessage,
    option: t.action,
    pagePath: "/" + locale + "/services/" + serviceSlug,
  });

  const screen = {
    en: { stages: "What happens in the session", guide: "Your experience comes first", full: "Read the full introduction", caution: "A clear, safe scope", contact: "A personal reply about format and timing — no automatic booking or charge", ask: "Choose how to begin", other: "Other ways to ask" },
    ru: { stages: "Этапы личной работы", guide: "Ваш опыт — в центре внимания", full: "Читать полное описание", caution: "Границы и безопасность", contact: "Личный ответ о формате и времени — без автоматической записи и оплаты", ask: "Выберите первый шаг", other: "Другие способы связаться" },
    es: { stages: "Etapas de la sesión", guide: "Tu experiencia es lo primero", full: "Leer descripción completa", caution: "Límites y seguridad", contact: "Respuesta personal sobre formato y horario, sin reserva ni cobro automático", ask: "Elige cómo empezar", other: "Otras formas de contactar" },
  }[locale];
  const visualPhotos = [
    "/images/holistic-house/hero-olive-incense.webp",
    "/images/holistic-house/course-start-heron.webp",
    "/images/holistic-house/report-lighthouse-coast.avif",
    "/images/holistic-house/course-focus-mountain-boy.webp",
  ];
  const introductorySentence = t.lead.split(/(?<=[.!?])\s+/)[0];
  return (
    <main className={styles.main} lang={locale} data-core-service-detail={kind} data-core-service-visual="one-screen">
      <div className={styles.breadcrumb}>
        <Link href={"/" + locale + "/services"}><ArrowLeft size={17} aria-hidden="true" />
          {locale === "ru" ? "Все услуги" : locale === "es" ? "Todos los servicios" : "All services"}
        </Link>
      </div>
      <section className={styles.hero} data-core-visual-screen="introduction" aria-labelledby="core-hero-heading">
        <div className={styles.photo}>
          <Image src={cardArtworkUrl(t.image, "feature")} unoptimized={hasCardArtwork(t.image)}
            alt="" fill priority sizes="(max-width: 760px) 100vw, 44vw" />
        </div>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1 id="core-hero-heading">{t.title}</h1>
          <p className={styles.lead}>{introductorySentence}</p>
          <div className={styles.quickFacts} aria-label={locale === "ru" ? "Условия" : locale === "es" ? "Condiciones" : "Session details"}>
            <strong>{kind === "dao" ? pathFacts.free : kind === "alchemy" ? pathFacts.alchemy : pathFacts.session}</strong>
            <span>{pathFacts.noPayment}</span>
          </div>
          <a className={styles.primary} href="#core-final-capture">{t.action}<ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </section>
      <div className={styles.videoScreen} data-core-visual-screen="video">
        <ServiceVideoShowcase topic={kind === "dao" ? "overview" : kind} locale={locale} id="service-video" />
      </div>
      <section className={styles.outcomes} aria-label={t.sectionsTitle}>
        <div className={styles.items}>
          {t.sections.map((step,index) => (
            <article key={step.title} className={styles.topicScene} data-core-visual-screen={`step-${index + 1}`}>
              <div className={styles.topicPhoto}>
                <Image src={visualPhotos[index % visualPhotos.length]} alt="" fill unoptimized
                  sizes="(max-width: 760px) 100vw, 44vw" />
              </div>
              <div className={styles.topicCopy}>
                <p className={styles.eyebrow}>{t.sectionsTitle} · 0{index + 1}</p>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
                {index === 0 ? <details className={styles.more}><summary>{screen.full}</summary><p>{t.lead}</p></details> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
      {kind === "alchemy" ? (
        <section className={[styles.topicScene, styles.alchemySupport].join(" ")} data-core-visual-screen="extended-support" aria-labelledby="alchemy-support-heading">
          <div className={styles.topicPhoto}>
            <Image src={visualPhotos[2]} alt="" fill unoptimized sizes="(max-width: 760px) 100vw, 44vw" />
          </div>
          <div className={styles.topicCopy}>
            <p className={styles.eyebrow}>{coreOfferDetailData(locale, "alchemy").supportKicker}</p>
            <h2 id="alchemy-support-heading">{coreOfferDetailData(locale, "alchemy").supportTitle}</h2>
            <p>{coreOfferDetailData(locale, "alchemy").supportLead}</p>
            <ul className={styles.supportList}>
              {coreOfferDetailData(locale, "alchemy").supportItems.map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}
            </ul>
            <small>{coreOfferDetailData(locale, "alchemy").supportFootnote}</small>
          </div>
        </section>
      ) : null}
      <section className={[styles.topicScene, styles.safetyScreen].join(" ")} data-core-visual-screen="limitations" aria-labelledby="core-safety-heading">
        <div className={styles.topicPhoto}>
          <Image src={visualPhotos[3]} alt="" fill unoptimized sizes="(max-width: 760px) 100vw, 44vw" />
        </div>
        <div className={styles.topicCopy}>
          <p className={styles.eyebrow}>{screen.guide}</p>
          <h2 id="core-safety-heading"><ShieldCheck size={24} aria-hidden="true" />{screen.caution}</h2>
          <p>{t.safety}</p>
          <Link href={t.secondaryHref} className={styles.related}>{t.secondary}<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
      <section className={styles.captureScene} data-core-visual-screen="final-capture" id="core-final-capture" aria-labelledby="core-capture-heading">
        <div className={styles.topicPhoto}>
          <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill
            sizes="(max-width: 760px) 100vw, 40vw" />
        </div>
        <div className={styles.topicCopy}>
          <h2 id="core-capture-heading">{screen.ask}</h2>
          <p>{screen.contact}</p>
          <CompactLeadCapture locale={locale} serviceTitle={t.title}
            title={t.action} lead={pathFacts.noPayment} variant="inline"
            sourcePath={"/" + locale + "/services/" + serviceSlug}
            {...(kind !== "dao" ? { formatOptions: [
              {value:"30-min",label: locale === "ru" ? "30 минут · €50" : "30 min · €50"},
              {value:"60-min",label: locale === "ru" ? "60 минут · €100" : "60 min · €100"},
            ] } : {})}
          />
          <details className={styles.more}><summary>{screen.other}</summary>
            <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} label={t.action}
              id={kind === "dao" ? "request-free-wu-xing" : undefined}
              event="service_request_start" attributes={{ "data-service-request": kind }} />
          </details>
          <Link href={"/" + locale + "/services/free-situation-review"} className={styles.related}>
            {locale === "ru" ? "Начать с бесплатного письменного разбора" : locale === "es" ? "Empezar con una revisión gratuita por escrito" : "Start with a free written review"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
