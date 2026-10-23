import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, Check, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import { PersonalConsultationForm } from "@/components/personal-consultation-form";
import { ServiceStoryPanel } from "@/components/service-story-panel";
import { ServiceVideoShowcase } from "@/components/service-video-showcase";
import { PublicSiteHeader } from "@/components/public-site-header";
import {
  personalServiceCopy, personalServiceImages, servicePageShared,
  type PersonalServiceKey, type ServicePageLocale,
} from "@/data/personal-service-pages";
import styles from "./personal-service-landing.module.css";

export function PersonalServiceLanding({ locale, service }: { locale: ServicePageLocale; service: PersonalServiceKey }) {
  const t = personalServiceCopy[service][locale];
  const ui = servicePageShared[locale];
  const facts = {
    en: {
      formats: "Personal session formats",
      short: "30 min · €50",
      full: "60 min · €100",
      confirmation: "Time and format agreed before payment",
      meet: "Personally with Andrey",
      next: "Choose a format and send your request; Andrey confirms availability before a booking.",
    },
    ru: {
      formats: "Форматы личных сессий",
      short: "30 мин · €50",
      full: "60 мин · €100",
      confirmation: "Время и формат согласуем до оплаты",
      meet: "Лично с Андреем",
      next: "Выберите формат и отправьте запрос; Андрей подтвердит время до оформления записи.",
    },
    es: {
      formats: "Formatos de sesiones individuales",
      short: "30 min · €50",
      full: "60 min · €100",
      confirmation: "Horario y modalidad confirmados antes del pago",
      meet: "Personalmente con Andrey",
      next: "Elige el formato y envía tu solicitud; Andrey confirmará el horario antes de reservar.",
    },
  }[locale];
  const closing = {
    en: {
      heading: "Choose your next step",
      body: "Ask about a personal session, or begin with a free written review. Nothing is booked or charged automatically.",
    },
    ru: {
      heading: "Выберите удобный первый шаг",
      body: "Можно запросить личную сессию или начать с бесплатного письменного разбора. Никакой автоматической записи или оплаты.",
    },
    es: {
      heading: "Elige tu próximo paso",
      body: "Solicita una sesión personal o empieza con una revisión escrita gratuita. No hay reservas ni cobros automáticos.",
    },
  }[locale];
  return (
    <main className={styles.page} lang={locale} data-personal-service={service}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label={ui.back}>
          <Link href={`/${locale}/services`}>← {ui.back}</Link>
        </nav>
        <section className={styles.hero} aria-labelledby="personal-service-title">
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>{t.eyebrow} · {ui.remote}</p>
            <h1 id="personal-service-title">{t.headline}</h1>
            <p className={styles.lead}>{t.takeaways[0]}</p>
            <div className={styles.heroFacts} aria-label={facts.formats}>
              <span><Clock3 size={17} aria-hidden="true" />{facts.short}<span className={styles.factSeparator} aria-hidden="true">·</span>{facts.full}</span>
              <span><CalendarCheck2 size={17} aria-hidden="true" />{facts.confirmation}</span>
            </div>
            <p className={styles.practitioner}><ShieldCheck size={19} aria-hidden="true" />{ui.practitioner}</p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href="#request-session">{t.orderLabel}<ArrowRight size={19} aria-hidden="true"/></a>
              <Link className={styles.secondary} href={`/${locale}/services/free-situation-review`}>{ui.free}</Link>
            </div>
          </div>
          <div className={styles.heroMedia}>
            <Image src={personalServiceImages[service]} alt="" fill priority
              unoptimized={personalServiceImages[service].endsWith(".webp")}
              sizes="(max-width: 800px) 100vw, 40vw" className={styles.heroImage} />
            <span className={styles.mediaCaption}>{t.title}</span>
          </div>
        </section>

        <div className={styles.storySequence} data-personal-one-thought-screens>
          <ServiceStoryPanel index="02" image="/images/holistic-house/hero-olive-incense.webp"
            eyebrow={ui.forWhom} title={t.questions[0]} body={t.takeaways[0]}
            href="#request-session" action={ui.next} />
          <ServiceStoryPanel index="03" image="/images/holistic-house/report-lighthouse-coast.webp"
            eyebrow={ui.forWhom} title={t.questions[1]} body={t.takeaways[1]}
            href="#request-session" action={ui.next} />
          <ServiceStoryPanel index="04" image={personalServiceImages[service]}
            eyebrow={ui.how} title={t.process[0].title} body={t.process[0].text}
            href="#request-session" action={ui.next} />
          <ServiceStoryPanel index="05" image="/images/holistic-house/books-library.webp"
            eyebrow={ui.how} title={t.process[1].title} body={t.process[1].text}
            href="#request-session" action={ui.next} />
          <ServiceStoryPanel index="06" image="/images/holistic-house/andy-about.png"
            eyebrow={ui.outcomes} title={t.takeaways[2]} body={t.process[t.process.length - 1].title}
            href="#request-session" action={ui.next} />
        </div>

        <section className={styles.bookingStage} aria-label={ui.request}>
          <aside className={styles.order} id="request-session" aria-label={ui.request}>
            <div className={styles.orderCard}>
              <div className={styles.bookingCover}>
                <Image src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width:767px) 100vw, 420px" />
              </div>
              <div className={styles.bookingIdentity}>
                <Image src="/images/holistic-house/andy-about.png" alt="" width={54} height={54} sizes="54px" />
                <div><strong>{facts.meet}</strong><span>{facts.next}</span></div>
              </div>
              <PersonalConsultationForm locale={locale} service={t.orderLabel} />
              <p className={styles.orderNote}>{ui.price} {ui.requestNote}</p>
            </div>
          </aside>
        </section>

        <details className={styles.optionalReading} data-personal-service-more>
          <summary>{locale === "ru" ? "Подробнее о методе и ответы на вопросы" : locale === "es" ? "Detalles del método y preguntas" : "Explore the method & FAQs"}</summary>
          <div className={styles.reading}>
            <section className={styles.section} aria-label={ui.forWhom}>
              <h2>{ui.forWhom}</h2>
              <ul className={styles.questions}>
                {t.questions.map(question => <li key={question}><Check size={20} aria-hidden="true"/><span>{question}</span></li>)}
              </ul>
            </section>
            <section className={styles.section} aria-label={ui.how}>
              <h2>{ui.how}</h2>
              <ol className={styles.steps}>
                {t.process.map((step, index) => (
                  <li key={step.title}><span className={styles.number}>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>
                ))}
              </ol>
            </section>
            <section className={styles.section} aria-label={ui.outcomes}>
              <h2>{ui.outcomes}</h2>
              <ul className={styles.takeaways}>{t.takeaways.map(item => <li key={item}>{item}</li>)}</ul>
            </section>
            <section className={styles.safety} aria-label={ui.disclaimerHeading}>
              <h3><ShieldCheck size={19} aria-hidden="true" />{ui.disclaimerHeading}</h3>
              <p>{t.disclaimer}</p>
            </section>
          </div>
          <ServiceVideoShowcase
            locale={locale}
            topic={service === "psychohomeopathy" ? "homeopathy" : service === "imagery-therapy" ? "hypnotherapy" : "constellations"}
            id="service-video"
          />
        </details>
        <section className={styles.faq} aria-labelledby="service-faq-title">
          <h2 id="service-faq-title">{ui.faq}</h2>
          {t.faqs.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
        </section>
        <section className={styles.closing}>
          <div className={styles.closingPhoto}><Image src={personalServiceImages[service]} alt="" fill sizes="(max-width: 767px) 100vw, 420px"/></div>
          <MessageCircle size={27} aria-hidden="true"/>
          <h2>{closing.heading}</h2>
          <p>{closing.body}</p>
          <div className={styles.closingActions}>
            <a className={styles.closingPrimary} href="#request-session">{t.orderLabel}<ArrowRight size={19} aria-hidden="true"/></a>
            <Link className={styles.closingSecondary} href={`/${locale}/services/free-situation-review`}>{ui.free}<ArrowRight size={19} aria-hidden="true"/></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
