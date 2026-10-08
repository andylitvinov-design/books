import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, MessageCircle, ShieldCheck } from "lucide-react";
import { PersonalConsultationForm } from "@/components/personal-consultation-form";
import { PublicSiteHeader } from "@/components/public-site-header";
import {
  personalServiceCopy, personalServiceImages, servicePageShared,
  type PersonalServiceKey, type ServicePageLocale,
} from "@/data/personal-service-pages";
import styles from "./personal-service-landing.module.css";

export function PersonalServiceLanding({ locale, service }: { locale: ServicePageLocale; service: PersonalServiceKey }) {
  const t = personalServiceCopy[service][locale];
  const ui = servicePageShared[locale];
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
            <p className={styles.lead}>{t.lead}</p>
            <p className={styles.practitioner}><ShieldCheck size={19} aria-hidden="true" />{ui.practitioner}</p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href="#request-session">{t.orderLabel}<ArrowRight size={19} aria-hidden="true"/></a>
              <Link className={styles.secondary} href={`/${locale}/services/free-situation-review`}>{ui.free}</Link>
            </div>
          </div>
          <div className={styles.heroMedia}>
            <Image src={personalServiceImages[service]} alt="" fill priority
              sizes="(max-width: 800px) 100vw, 40vw" className={styles.heroImage} />
            <span className={styles.mediaCaption}>{t.title}</span>
          </div>
        </section>

        <div className={styles.mainColumns}>
          <div className={styles.reading}>
            <section className={styles.section} aria-labelledby="questions-title">
              <p className={styles.smallEyebrow}>{ui.forWhom}</p>
              <h2 id="questions-title">{ui.forWhom}</h2>
              <ul className={styles.questions}>
                {t.questions.map(question => <li key={question}><Check size={20} aria-hidden="true"/><span>{question}</span></li>)}
              </ul>
            </section>
            <section className={styles.section} aria-labelledby="process-title">
              <p className={styles.smallEyebrow}>{ui.learn}</p>
              <h2 id="process-title">{ui.how}</h2>
              <ol className={styles.steps}>
                {t.process.map((step, index) => (
                  <li key={step.title}>
                    <span className={styles.number}>0{index + 1}</span>
                    <div><h3>{step.title}</h3><p>{step.text}</p></div>
                  </li>
                ))}
              </ol>
            </section>
            <section className={styles.section} aria-labelledby="takeaways-title">
              <h2 id="takeaways-title">{ui.outcomes}</h2>
              <ul className={styles.takeaways}>
                {t.takeaways.map(item => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <section className={styles.safety} aria-label={ui.disclaimerHeading}>
              <h3><ShieldCheck size={19} aria-hidden="true" />{ui.disclaimerHeading}</h3>
              <p>{t.disclaimer}</p>
            </section>
          </div>
          <aside className={styles.order} id="request-session" aria-label={ui.request}>
            <div className={styles.orderCard}>
              <p className={styles.smallEyebrow}>{ui.remote}</p>
              <h2>{ui.request}</h2>
              <p>{ui.requestIntro}</p>
              <p className={styles.price}>{ui.price}</p>
              <PersonalConsultationForm locale={locale} service={t.orderLabel} />
              <p className={styles.orderNote}>{ui.requestNote}</p>
            </div>
          </aside>
        </div>

        <section className={styles.faq} aria-labelledby="service-faq-title">
          <h2 id="service-faq-title">{ui.faq}</h2>
          {t.faqs.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
        </section>
        <section className={styles.closing}>
          <MessageCircle size={27} aria-hidden="true"/>
          <h2>{ui.start}</h2>
          <p>{ui.freeBody}</p>
          <Link href={`/${locale}/services/free-situation-review`}>{ui.free}<ArrowRight size={19} aria-hidden="true"/></Link>
        </section>
      </div>
    </main>
  );
}
