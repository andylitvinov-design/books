import Image from "next/image";
import { StaticPortrait } from "@/components/static-portrait";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, PlayCircle } from "lucide-react";
import { getServiceVideoWatchUrl } from "@/data/service-video-library";
import { coreServiceOffers } from "@/data/core-service-offers";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-solutions.module.css";

// Use existing approved local imagery, including real stills from the two service videos.
// Keep the homepage photo-left layout; do not alter the video links or Services page.
const homepageMedia = {
  situation: "/images/holistic-house/hero-olive-incense.webp",
  dao: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  alchemy: "/images/holistic-house/video-posters/constellations-en-v1.webp",
  hypnotherapy: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
  business: "/images/holistic-house/andy-about.png",
} as const;

const copy = {
  en: {
    eyebrow: "PERSONAL GUIDANCE · WHEN YOU ARE READY",
    homeEyebrow: "FOUR WAYS TO WORK TOGETHER",
    servicesEyebrow: "FIVE SERVICE OPTIONS · TWO FREE STARTS",
    title: "Personal support for your next step",
    homeTitle: "How I can help",
    servicesTitle: "How I can help",
    lead: "Alchemy of the Soul brings together systemic constellations, guided imagery hypnotherapy and optional psycho-homeopathy. Or explore a separate guided-imagery course or practical business strategy and founder coaching.",
    homeLead: "A free written situation review, a free symbolic Wu Xing profile and personal sessions. Explore self-checks below if you prefer.",
    servicesLead: "Start free or explore Alchemy of the Soul (constellations, hypnotherapy and psycho-homeopathy), individual guided imagery and business sessions.",
    more: "Curious about the methods?",
    moreText: "Systemic constellations, guided imagery and homeopathy are approaches used in specific sessions, not extra services you must choose on this page.",
    methods: [
      {label:"Systemic constellations", href:"systemic-constellations"},
      {label:"Guided imagery", href:"imagery-therapy"},
      {label:"Psychohomeopathy · Alchemy of the Soul", href:"alchemy-of-soul"},
    ],
    disclaimer: "The DAO profile is a non-medical symbolic assessment. Homeopathy has no reliable evidence for treating medical or mental-health conditions, and none of these services replaces standard or urgent care.",
  },
  ru: {
    eyebrow: "ЛИЧНАЯ РАБОТА · КОГДА ВЫ ГОТОВЫ",
    homeEyebrow: "ЧЕТЫРЕ ОСНОВНЫХ ПРЕДЛОЖЕНИЯ",
    servicesEyebrow: "ПЯТЬ ФОРМАТОВ · ДВА БЕСПЛАТНЫХ",
    title: "Личная работа для следующего шага",
    homeTitle: "Чем я могу помочь",
    servicesTitle: "Чем я могу помочь",
    lead: "«Алхимия души» объединяет расстановки, образную гипнотерапию и дополнительную психогомеопатию. Есть также отдельные курсы, бизнес-стратегия и коучинг предпринимателей.",
    homeLead: "Бесплатный письменный разбор ситуации, символический профиль У-Син и личные сессии. Ниже — тесты самонаблюдения.",
    servicesLead: "Начните бесплатно или выберите «Алхимию души» (расстановка, гипнотерапия, психогомеопатия), индивидуальную образную работу либо бизнес-сессию.",
    more: "Хотите подробнее о методах?",
    moreText: "Системные расстановки, образная работа и гомеопатия — инструменты отдельных сессий, а не обязательные дополнительные услуги.",
    methods: [
      {label:"Системные расстановки", href:"systemic-constellations"},
      {label:"Образная работа", href:"imagery-therapy"},
      {label:"Психогомеопатия · Алхимия души", href:"alchemy-of-soul"},
    ],
    disclaimer: "Дао-профиль — символическая оценка ресурса, не медицинская диагностика. Эффективность гомеопатии для лечения заболеваний не подтверждена надёжными доказательствами. Эти форматы не заменяют обычную и неотложную медицинскую помощь.",
  },
  es: {
    eyebrow: "ACOMPAÑAMIENTO PERSONAL · CUANDO TE SIENTAS LISTO",
    homeEyebrow: "CUATRO FORMAS DE TRABAJAR JUNTOS",
    servicesEyebrow: "CINCO OPCIONES · DOS FORMAS GRATUITAS DE EMPEZAR",
    title: "Acompañamiento personal para tu siguiente paso",
    homeTitle: "Cómo puedo ayudarte",
    servicesTitle: "Cómo puedo ayudarte",
    lead: "Alquimia del Alma combina constelaciones sistémicas, hipnoterapia con imágenes guiadas y psicohomeopatía opcional. También puedes explorar cursos de imágenes guiadas o estrategia y coaching empresarial.",
    homeLead: "Dos revisiones escritas gratuitas y dos opciones de trabajo personal. También puedes realizar pruebas gratuitas de estrés y personalidad.",
    servicesLead: "Empieza gratis o explora Alquimia del Alma, trabajo individual con imágenes guiadas o consultoría de negocios.",
    more: "¿Quieres conocer los métodos?",
    moreText: "Las constelaciones sistémicas, las imágenes guiadas y la homeopatía son enfoques utilizados en determinadas sesiones, no servicios adicionales obligatorios.",
    methods: [
      {label:"Constelaciones sistémicas", href:"systemic-constellations"},
      {label:"Imágenes guiadas", href:"imagery-therapy"},
      {label:"Psicohomeopatía · Alquimia del Alma", href:"alchemy-of-soul"},
    ],
    disclaimer: "El perfil DAO es una evaluación simbólica, no un diagnóstico médico. La homeopatía carece de pruebas fiables de eficacia para tratar enfermedades. Estos servicios no sustituyen la atención médica habitual ni la urgente.",
  },
} as const;

export function ServicesSolutions({ locale, variant = "services" }: { locale: PublicLocale; variant?: "services" | "home" }) {
  const t = copy[locale];
  const isHome = variant === "home";
  // Home keeps its four approved photo cards. Services uses the same image-left treatment
  // and lists all five real offers below the compact free-tests introduction.
  const allOffers = coreServiceOffers(locale);
  const visibleOffers = isHome ? allOffers.filter((offer) => offer.id !== "business") : allOffers;
  return (
    <section className={[styles.solutions, styles.home, !isHome ? styles.servicesPage : ""].filter(Boolean).join(" ")} id={isHome ? "core-services" : "solutions"} aria-labelledby={isHome ? "home-core-services-title" : "services-solutions-title"} data-core-service-offers={variant}>
      <header className={styles.header} id={isHome ? "free-start" : undefined}>
        <p className={styles.eyebrow}>{isHome ? t.homeEyebrow : t.servicesEyebrow}</p>
        <h2 id={isHome ? "home-core-services-title" : "services-solutions-title"}>{isHome ? t.homeTitle : t.servicesTitle}</h2>
        <p className={styles.intro}>{isHome ? t.homeLead : t.servicesLead}</p>
      </header>
      <div className={styles.grid}>
        {visibleOffers.map((offer, index) => (
          <article className={styles.card} key={offer.id} id={isHome ? undefined : offer.id === "alchemy" ? "alchemy" : offer.id === "business" ? "business" : undefined} data-core-service-id={offer.id}>
            {!isHome && offer.id === "alchemy" ? <span id="archetypal" className={styles.anchor}/> : null}
            <Link className={styles.photo} href={offer.href} tabIndex={-1} aria-hidden="true" prefetch={false}>
              {(isHome ? homepageMedia[offer.id] : offer.image) === "/images/holistic-house/andy-about.png"
                ? <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width: 760px) 45vw, (max-width: 1080px) 30vw, 280px" loading={index === 0 ? "eager" : "lazy"} />
                : <Image src={isHome ? homepageMedia[offer.id] : offer.image} alt="" fill unoptimized={(isHome ? homepageMedia[offer.id] : offer.image).endsWith(".webp") || (isHome ? homepageMedia[offer.id] : offer.image) === "/academy/reiki-yggdrasil/source/eastern-tradition.png"} sizes="(max-width: 760px) 45vw, (max-width: 1080px) 30vw, 280px" loading={index === 0 ? "eager" : "lazy"} />}
            </Link>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>{offer.label}</span>
              <h3><Link href={offer.href} prefetch={false}>{offer.title}</Link></h3>
              <p className={styles.cardSummary}>{offer.promise}</p>
              <p className={styles.cardBenefit}>{offer.benefit}</p>
              {(['alchemy', 'hypnotherapy', 'business'] as const).some(id => id === offer.id) ? (
                <p className={styles.cardPrice} data-personal-session-price>
                  {locale === "ru" ? "Личная сессия · €50 / 30 мин · €100 / 60 мин"
                    : locale === "es" ? "Sesión personal · €50 / 30 min · €100 / 60 min"
                    : "Personal session · €50 / 30 min · €100 / 60 min"}
                </p>
              ) : null}
              {(offer.id === "alchemy" || offer.id === "hypnotherapy") && (
                <a className={styles.cardVideo}
                  href={locale === "ru" ? getServiceVideoWatchUrl(offer.id, locale) : `${offer.href}#service-video`}
                  target={locale === "ru" ? "_blank" : undefined}
                  rel={locale === "ru" ? "noopener noreferrer" : undefined}
                  data-service-card-video={offer.id}
                  aria-label={locale === "ru" ? "Открыть видео о подходе в новой вкладке" : locale === "es" ? "Ver el vídeo y su transcripción en la página del servicio (audio en inglés)" : "Open the original method video and transcript on the service page"}>
                  <PlayCircle size={18} aria-hidden="true" />
                  {locale === "ru" ? "Смотреть видео о подходе" : locale === "es" ? "Vídeo y texto (en inglés)" : "Video & transcript"}
                </a>
              )}
              {offer.id === "alchemy" ? (
                <div className={styles.cardActionRow} data-alchemy-service-actions>
                  <AcquisitionEventLink className={styles.cardDetails} href={offer.href} event="service_view" prefetch={false}>
                    {locale === "ru" ? "Детали" : locale === "es" ? "Detalles" : "Details"}<ArrowUpRight size={15} aria-hidden="true" />
                  </AcquisitionEventLink>
                  <div className={styles.cardDirectOrder}>
                    <ContactChannelChooser locale={locale} label={locale === "ru" ? "Заказать" : locale === "es" ? "Solicitar" : "Book"}
                      className={styles.cardOrderButton} event="service_request_start"
                      whatsappUrl={whatsappEnquiryUrl({
                        locale,
                        service: offer.title,
                        request: locale === "ru"
                          ? "Хочу заказать личный сеанс «Алхимия души». Подтвердите, пожалуйста, доступные время и условия."
                          : locale === "es" ? "Quisiera solicitar una sesión de Alquimia del Alma. Confirma los horarios disponibles y las condiciones." : "I would like to book an Alchemy of the Soul session. Please confirm a time and the terms.",
                        option: locale === "ru" ? "60 минут · €100" : locale === "es" ? "60 minutos · €100" : "60 min · €100",
                        pagePath: offer.href,
                      })}
                      attributes={{ "data-alchemy-booking": "services-card" }}
                    />
                  </div>
                </div>
              ) : (
                <AcquisitionEventLink className={styles.cardCta} href={offer.href} event={offer.id === "situation" || offer.id === "dao" ? "service_request_start" : "service_view"} prefetch={false}>{offer.action}<ArrowUpRight size={18} aria-hidden="true" /></AcquisitionEventLink>
              )}
            </div>
          </article>
        ))}
      </div>

      {!isHome ? (
        <>
          <details className={styles.methodDisclosure} id="methods">
            <summary>{t.more}<ChevronDown size={18} aria-hidden="true" /></summary>
            <div><p>{t.moreText}</p>
              <nav aria-label={t.more}>{t.methods.map(item => <Link key={item.href} href={"/" + locale + "/services/" + item.href} prefetch={false}>{item.label}<ArrowUpRight size={15} aria-hidden="true"/></Link>)}</nav>
            </div>
          </details>
          <p className={styles.disclaimer}>{t.disclaimer}</p>
        </>
      ) : null}
    </section>
  );
}
