import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, ClipboardCheck, Compass, Lightbulb, ShieldCheck } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { PublicSiteHeader } from "@/components/public-site-header";
import { BusinessWebsiteEnquiry } from "@/components/business-website-enquiry";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { businessConsultingCopy, type BusinessLocale } from "@/data/business-consulting-copy";
import styles from "./business-consulting-landing.module.css";

const paidRequests: Record<BusinessLocale, { express: string; full: string; mentoring: string }> = {
  en: {
    express: "I would like a 30-minute Business Strategy Clarity session for €50. Please confirm available times.",
    full: "I would like a 60-minute Business Mapping & Goal Activation session for €100. Please confirm available times.",
    mentoring: "I would like to learn about ongoing Goals Mentoring for my business. Please share the available format and fees.",
  },
  ru: {
    express: "Здравствуйте! Хочу записаться на экспресс-сессию по бизнес-стратегии: 30 минут, €50. Подскажите доступное время.",
    full: "Здравствуйте! Хочу записаться на бизнес-расстановку и активацию цели: 60 минут, €100. Подскажите доступное время.",
    mentoring: "Здравствуйте! Хочу обсудить регулярный коучинг Goals Mentoring для моего бизнеса. Подскажите формат и стоимость.",
  },
  es: {
    express: "Hola, quisiera una sesión de claridad estratégica de 30 minutos por €50. ¿Qué horarios hay disponibles?",
    full: "Hola, quisiera una sesión de consultoría y activación de metas de 60 minutos por €100. ¿Qué horarios hay disponibles?",
    mentoring: "Hola, quisiera información sobre el acompañamiento Goals Mentoring, su formato y tarifas.",
  },
};

export function BusinessConsultingLanding({ locale }: { locale: BusinessLocale }) {
  const t = businessConsultingCopy[locale];
  const detailLabel = locale === "ru" ? "Детали" : locale === "es" ? "Detalles" : "Details";
  const siteRequestLabel = locale === "ru" ? "Заявка с сайта" : locale === "es" ? "Solicitud en la web" : "Website request";
  const offerImages = {
    free: "/images/holistic-house/report-lighthouse-coast.webp",
    express: "/images/holistic-house/books-library.webp",
    full: "/images/holistic-house/andy-about.png",
  } as const;
  const freeHref = "/" + locale + "/services/free-situation-review?topic=business";
  const contactUrl = (kind: "express" | "full" | "mentoring") =>
    whatsappEnquiryUrl({
      locale,
      service: t.title,
      request: paidRequests[locale][kind],
      option: kind === "express" ? "30 min · €50" : kind === "full" ? "60 min · €100" : "Goals Mentoring · details by agreement",
      pagePath: "/" + locale + "/services/business-consulting",
    });

  return (
    <main className={styles.page} lang={locale} data-business-consulting>
      <PublicSiteHeader locale={locale} />
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label={t.navBack}>
          <Link href={"/" + locale + "/services"} prefetch={false}>← {t.navBack}</Link>
        </nav>
        <section className={styles.hero} aria-labelledby="business-hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="business-hero-title">{t.headline}</h1>
            <p className={styles.heroLead}>{t.lead}</p>
            <p className={styles.audiences}><Check size={17} aria-hidden="true" />{t.audiences}</p>
            <div className={styles.heroActions}>
              <AcquisitionEventLink href={freeHref} event="service_request_start" className={styles.primary} prefetch={false} attributes={{ "data-business-cta": "free-hero" }}>
                {t.freeCta}<ArrowRight size={19} aria-hidden="true" />
              </AcquisitionEventLink>
              <a href="#business-offers" className={styles.secondary}>{t.paidCta}<ArrowUpRight size={18} aria-hidden="true" /></a>
            </div>
            <p className={styles.microcopy}><ShieldCheck size={15} aria-hidden="true" />{t.noPromise}</p>
          </div>
          <div className={styles.heroVisual}>
            <Image
              src="/images/holistic-house/andy-about.png"
              alt="Andrey Litvinov"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 43vw"
              className={styles.heroImage}
            />
            <div className={styles.heroCaption}>
              <span>{t.practitioner}</span>
              <strong>{t.boardTitle}</strong>
            </div>
          </div>
        </section>

        <nav className={styles.quickStart} aria-label={t.offersTitle} data-business-quick-start>
          <span className={styles.quickStartTitle}>{locale === "ru" ? "С чего начать?" : locale === "es" ? "¿Por dónde empezar?" : "Where to begin?"}</span>
          <div className={styles.quickStartActions}>
            <AcquisitionEventLink href={freeHref} event="service_request_start" className={styles.quickStartFree} prefetch={false}
              attributes={{ "data-business-quick-action": "free-written-review" }}>
              {t.offers[0].name}<ArrowRight size={16} aria-hidden="true" />
            </AcquisitionEventLink>
            <a href="#business-offers" className={styles.quickStartPaid}>
              {locale === "ru" ? "Личная сессия · от €50" : locale === "es" ? "Sesión personal · desde €50" : "Personal session · from €50"}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
          <small>{t.replyNote}</small>
        </nav>

        <section id="business-offers" className={styles.offers} aria-labelledby="business-offers-title">
          <p className={styles.sectionEyebrow}>{t.offersEyebrow}</p>
          <h2 id="business-offers-title">{t.offersTitle}</h2>
          <p className={styles.sectionLead}>{t.offersLead}</p>
          <div className={styles.offerGrid} data-business-service-cards>
            {t.offers.map((offer, index) => (
              <article key={offer.kind}
                className={[styles.offerCard, offer.kind === "full" ? styles.featured : ""].join(" ")}
                data-business-offer={offer.kind}>
                <div className={styles.offerPhoto} aria-hidden="true">
                  <Image src={offerImages[offer.kind]} alt="" fill
                    sizes="(max-width: 767px) 110px, (max-width: 1100px) 170px, 180px"
                    loading={index === 0 ? "eager" : "lazy"} />
                </div>
                <div className={styles.offerContent}>
                  <div className={styles.offerTop}>
                    <span className={styles.offerKicker}>{offer.kicker}</span>
                    <span className={styles.offerBadge}>{offer.price}</span>
                  </div>
                  <h3>{offer.name}</h3>
                  <p className={styles.offerTeaser}>{offer.description}</p>
                  <p className={styles.offerTime}>{offer.time}</p>
                  <details className={styles.offerDetails}>
                    <summary>{detailLabel}<ChevronDown size={16} aria-hidden="true" /></summary>
                    <p><ClipboardCheck size={16} aria-hidden="true" />{offer.takeaway}</p>
                    {offer.kind === "free" ? <p>{t.replyNote}</p> : null}
                  </details>
                  <div className={styles.offerActions}>
                    {offer.kind === "free" ? (
                      <AcquisitionEventLink href={freeHref} event="service_request_start"
                        className={styles.offerLink} prefetch={false}
                        attributes={{ "data-business-format": "free" }}>
                        {offer.cta}<ArrowRight size={17} aria-hidden="true" />
                      </AcquisitionEventLink>
                    ) : (
                      <ContactChannelChooser locale={locale} whatsappUrl={contactUrl(offer.kind)} label={offer.cta}
                        event="service_request_start" className={styles.contactButton}
                        attributes={{ "data-business-format": offer.kind }} />
                    )}
                    <AcquisitionEventLink className={styles.offerDirectLink}
                      href="#business-direct-request" event="service_request_start" prefetch={false}
                      attributes={{ "data-business-direct-option": offer.kind }}>
                      {siteRequestLabel}<ArrowRight size={15} aria-hidden="true" />
                    </AcquisitionEventLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.problems} aria-labelledby="business-problems-title">
          <p className={styles.sectionEyebrow}>{t.painEyebrow}</p>
          <h2 id="business-problems-title">{t.painTitle}</h2>
          <div className={styles.problemGrid}>
            {t.pains.map((item, index) => (
              <article key={item.title} className={styles.problemCard}>
                <span className={styles.cardNum}>0{index + 1}</span>
                <h3>{item.title}</h3><p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <BusinessWebsiteEnquiry locale={locale}/>

        <section className={styles.workflow} aria-labelledby="business-process-title">
          <p className={styles.sectionEyebrow}>{t.processEyebrow}</p>
          <h2 id="business-process-title">{t.processTitle}</h2>
          <ol className={styles.workflowGrid}>
            {t.process.map((step, index) => (
              <li key={step.title}>
                <span className={styles.workflowNum}>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3><p>{step.text}</p>
              </li>
            ))}
          </ol>
          <div className={styles.twoApproaches}>
            <h3>{t.distinctionTitle}</h3>
            <div className={styles.approachGrid}>
              <div><Compass size={22} aria-hidden="true"/><strong>{t.businessFactTitle}</strong><p>{t.businessFactText}</p></div>
              <div><Lightbulb size={22} aria-hidden="true"/><strong>{t.innerWorkTitle}</strong><p>{t.innerWorkText}</p></div>
            </div>
          </div>
        </section>

        <section className={styles.results} aria-labelledby="business-results-title">
          <div>
            <p className={styles.sectionEyebrow}>{t.resultTitle}</p>
            <h2 id="business-results-title">{t.resultTitle}</h2>
          </div>
          <ul>{t.results.map(result => <li key={result}><Check size={21} aria-hidden="true" />{result}</li>)}</ul>
        </section>

        <section className={styles.mentor} aria-labelledby="business-mentoring-title">
          <div>
            <p className={styles.sectionEyebrow}>{t.mentorEyebrow}</p>
            <h2 id="business-mentoring-title">{t.mentorTitle}</h2>
            <p>{t.mentorText}</p>
          </div>
          <ContactChannelChooser locale={locale} whatsappUrl={contactUrl("mentoring")}
            label={t.mentorCta} className={styles.mentorButton} event="service_request_start"
            attributes={{ "data-business-format": "mentoring" }} />
        </section>

        <section className={styles.request} id="request-session" aria-labelledby="business-request-title">
          <div>
            <p className={styles.sectionEyebrow}>{t.eyebrow}</p>
            <h2 id="business-request-title">{t.requestTitle}</h2>
            <p>{t.requestLead}</p>
            <p className={styles.requestNote}>{t.replyNote}</p>
            <a className={styles.requestDirect} href="#business-direct-request">{locale === "ru" ? "Сохранить заявку напрямую на сайте" : locale === "es" ? "Guardar solicitud directamente en la web" : "Save your request directly on the website"}<ArrowRight size={17} aria-hidden="true"/></a>
          </div>
          <div className={styles.requestChoices}>
            <ContactChannelChooser locale={locale} whatsappUrl={contactUrl("express")}
              label={t.formatCtas[0]} event="service_request_start" className={styles.requestButton}
              attributes={{ "data-business-format": "express-bottom" }} />
            <ContactChannelChooser locale={locale} whatsappUrl={contactUrl("full")}
              label={t.formatCtas[1]} event="service_request_start" className={styles.requestButton}
              attributes={{ "data-business-format": "full-bottom" }} />
            <ContactChannelChooser locale={locale} whatsappUrl={contactUrl("mentoring")}
              label={t.formatCtas[2]} event="service_request_start" className={styles.requestButtonAlt}
              attributes={{ "data-business-format": "mentoring-bottom" }} />
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="business-faq-title">
          <h2 id="business-faq-title">{t.faqTitle}</h2>
          {t.faqs.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
          <div className={styles.disclaimer}><ShieldCheck size={20} aria-hidden="true" /><p>{t.disclaimer}</p></div>
        </section>

        <section className={styles.bottom}>
          <h2>{t.finalTitle}</h2>
          <AcquisitionEventLink href={freeHref} event="service_request_start" prefetch={false}
            className={styles.bottomAction} attributes={{ "data-business-cta": "free-bottom" }}>
            {t.finalCta}<ArrowRight size={18} aria-hidden="true"/>
          </AcquisitionEventLink>
        </section>
      </div>
    </main>
  );
}
