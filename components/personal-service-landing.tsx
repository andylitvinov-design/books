import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock3, ShieldCheck } from "lucide-react";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
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

  const microcopy = {
    en: { stage: "A personal journey", topics: "Does this sound familiar?", steps: "How the work unfolds", takeaways: "What you can take away", faqs: "Before we begin", details: "Read the full description", private: "One step at a time, at your pace.", contact: "Andrey replies personally after receiving your request.", explore: "Watch the approach", step: "Step" },
    ru: { stage: "Личная работа", topics: "Знакомо ли вам это?", steps: "Как проходит работа", takeaways: "Что можно получить от встречи", faqs: "Перед началом", details: "Подробное описание", private: "Один шаг за раз, в вашем темпе.", contact: "После заявки Андрей лично ответит вам.", explore: "Видео о методе", step: "Шаг" },
    es: { stage: "Trabajo individual", topics: "¿Te resulta familiar?", steps: "Cómo trabajamos", takeaways: "Qué puedes llevarte", faqs: "Antes de empezar", details: "Descripción completa", private: "Un paso a la vez, a tu ritmo.", contact: "Andrey responderá personalmente tras recibir la solicitud.", explore: "Ver el enfoque", step: "Paso" },
  }[locale];
  const illustrations = [
    "/images/holistic-house/hero-olive-incense.webp",
    "/images/holistic-house/course-start-heron.webp",
    "/images/holistic-house/report-lighthouse-coast.avif",
  ];
  const preview = t.lead.split(/(?<=[.!?])\s+/)[0];
  return (
    <main className={styles.page} lang={locale} data-personal-service={service} data-visual-service-landing="one-screen">
      <PublicSiteHeader locale={locale} />
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label={ui.back}>
          <Link href={`/${locale}/services`}>← {ui.back}</Link>
        </nav>

        <section className={[styles.screen, styles.hero].join(" ")} aria-labelledby="personal-service-title" data-service-visual-screen="introduction">
          <div className={[styles.sceneMedia, styles.heroMedia].join(" ")}>
            <Image src={personalServiceImages[service]} alt="" fill priority
              unoptimized={personalServiceImages[service].endsWith(".webp")}
              sizes="(max-width: 767px) 100vw, 45vw" className={styles.sceneImage} />
            <span className={styles.mediaCaption}>{t.title}</span>
          </div>
          <div className={[styles.sceneCopy, styles.heroContent].join(" ")}>
            <p className={styles.eyebrow}>{t.eyebrow} · {ui.remote}</p>
            <h1 id="personal-service-title">{t.headline}</h1>
            <p className={styles.lead}>{preview}</p>
            <div className={styles.heroFacts} aria-label={facts.formats}>
              <span><Clock3 size={17} aria-hidden="true" />{facts.short}<span className={styles.factSeparator} aria-hidden="true">·</span>{facts.full}</span>
            </div>
            <a className={styles.primary} href="#request-session">{t.orderLabel}<ArrowRight size={18} aria-hidden="true" /></a>
            <Link className={styles.secondary} href={`/${locale}/services/free-situation-review`}>{ui.free}</Link>
          </div>
        </section>

        <div className={styles.videoScreen} data-service-visual-screen="video">
          <ServiceVideoShowcase
            locale={locale}
            topic={service === "psychohomeopathy" ? "homeopathy" : service === "imagery-therapy" ? "hypnotherapy" : "constellations"}
            variant={service === "imagery-therapy" && locale === "en" ? "psychotherapy-en" : "default"}
            id="service-video"
          />
        </div>

        <section className={[styles.screen, styles.story].join(" ")} data-service-visual-screen="questions" aria-labelledby="questions-title">
          <div className={styles.sceneMedia}>
            <Image src={illustrations[0]} alt="" fill sizes="(max-width: 767px) 100vw, 45vw" className={styles.sceneImage} />
          </div>
          <div className={styles.sceneCopy}>
            <p className={styles.smallEyebrow}>{microcopy.stage}</p>
            <h2 id="questions-title">{ui.forWhom}</h2>
            <ul className={styles.questions}>
              {t.questions.map(question => <li key={question}><Check size={17} aria-hidden="true" /><span>{question}</span></li>)}
            </ul>
            <details className={styles.more}><summary>{microcopy.details}</summary><p>{t.lead}</p></details>
          </div>
        </section>

        {t.process.map((step, index) => (
          <section key={step.title} className={[styles.screen, styles.story, styles.processScene].join(" ")}
            data-service-visual-screen={`process-${index + 1}`} aria-labelledby={`process-title-${index}`}>
            <div className={styles.sceneMedia}>
              <Image src={illustrations[(index + 1) % illustrations.length]} alt="" fill
                sizes="(max-width: 767px) 100vw, 45vw" className={styles.sceneImage} />
            </div>
            <div className={styles.sceneCopy}>
              <p className={styles.smallEyebrow}>{microcopy.steps} · {microcopy.step} 0{index + 1}</p>
              <h2 id={`process-title-${index}`}>{step.title}</h2>
              <p className={styles.sceneLead}>{step.text}</p>
              <p className={styles.quiet}><ShieldCheck size={17} aria-hidden="true" />{microcopy.private}</p>
            </div>
          </section>
        ))}

        <section className={[styles.screen, styles.story].join(" ")} data-service-visual-screen="takeaways" aria-labelledby="takeaways-title">
          <div className={styles.sceneMedia}>
            <Image src="/images/holistic-house/report-lighthouse-coast.avif" alt="" fill
              sizes="(max-width: 767px) 100vw, 45vw" className={styles.sceneImage} />
          </div>
          <div className={styles.sceneCopy}>
            <p className={styles.smallEyebrow}>{microcopy.stage}</p>
            <h2 id="takeaways-title">{ui.outcomes}</h2>
            <ul className={styles.takeaways}>{t.takeaways.map(item => <li key={item}><Check size={17} aria-hidden="true"/>{item}</li>)}</ul>
          </div>
        </section>

        <section className={[styles.screen, styles.story, styles.faqScreen].join(" ")} data-service-visual-screen="questions-before-booking" aria-labelledby="service-faq-title">
          <div className={styles.sceneMedia}>
            <Image src="/images/holistic-house/course-focus-mountain-boy.webp" alt="" fill
              sizes="(max-width: 767px) 100vw, 45vw" className={styles.sceneImage} />
          </div>
          <div className={styles.sceneCopy}>
            <h2 id="service-faq-title">{ui.faq}</h2>
            <div className={styles.faq}>
              {t.faqs.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
            </div>
            <aside className={styles.safety} aria-label={ui.disclaimerHeading}>
              <ShieldCheck size={17} aria-hidden="true" /><p>{t.disclaimer}</p>
            </aside>
          </div>
        </section>

        <section className={[styles.screen, styles.captureScreen].join(" ")} id="request-session"
          data-service-visual-screen="final-capture" aria-labelledby="capture-heading">
          <div className={styles.capturePortrait}>
            <Image src="/images/holistic-house/andy-about.png" alt="" fill
              sizes="(max-width: 767px) 100vw, 43vw" className={styles.sceneImage} />
          </div>
          <div className={styles.captureContent}>
            <p className={styles.smallEyebrow}>{facts.meet}</p>
            <h2 id="capture-heading">{closing.heading}</h2>
            <p className={styles.captureIntro}>{closing.body}</p>
            <CompactLeadCapture
              locale={locale}
              serviceTitle={t.orderLabel}
              sourcePath={`/${locale}/services/${service}`}
              title={facts.formats}
              lead={microcopy.contact}
              variant="inline"
              formatOptions={[
                { value: "30-min", label: facts.short },
                { value: "60-min", label: facts.full },
              ]}
              disclaimer={ui.requestNote}
            />
            <Link className={styles.closingSecondary} href={`/${locale}/services/free-situation-review`}>
              {ui.free}<ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
