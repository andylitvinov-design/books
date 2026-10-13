import Image from "next/image";
import Link from "next/link";

import { LibraryBackLink } from "@/components/library-hub";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";

import styles from "./distance-homeopathy-guide.module.css";
import { distanceHomeopathyCopy } from "@/data/distance-homeopathy-content";

const copy = distanceHomeopathyCopy;

export function distanceHomeopathyMetadata(locale: PublicLocale) {
  return {
    title: copy[locale].title,
    description: copy[locale].description,
  };
}


export function DistanceHomeopathyGuide({ locale, embedded = false, report = false }: { locale: PublicLocale; embedded?: boolean; report?: boolean }) {
  const text = copy[locale];
  const Container = embedded ? "section" : "main";

  return (
    <Container id={embedded && !report ? "distance-homeopathy-guide" : undefined} className={`${styles.page} ${embedded ? styles.embedded : ""} ${report ? styles.report : ""}`} lang={locale} data-report-appendix={report ? "distance-homeopathy" : undefined}>
      {!embedded && <PublicSiteHeader locale={locale} />}
      {!embedded && <LibraryBackLink locale={locale} />}

      {report && <p className={styles.reportAppendixLabel}>
        {locale === "ru" ? "Приложение · Дистанционная гомеопатия" : locale === "es" ? "Apéndice · Homeopatía a distancia" : "Appendix · Distance homeopathy"}
      </p>}
      <article className={styles.article}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{text.kicker}</p>
          <h1>{text.heading}</h1>
          <h2>{text.subheading}</h2>
          <p className={styles.lead}>{text.lead}</p>
          <figure className={styles.heroImage}>
            <Image
              alt={locale === "ru" ? "Флаконы, стакан воды и фотографии на рабочем столе" : locale === "es" ? "Frascos, un vaso de agua y fotografías sobre una mesa" : "Remedy bottles, a glass of water, and photographs on a desk"}
              fill
              priority={!embedded}
              sizes="(max-width: 820px) 100vw, 780px"
              src="/images/holistic-house/distance-homeopathy.webp"
            />
          </figure>
        </header>

        <aside className={styles.safety}>
          <strong>{text.safetyTitle}.</strong> {text.safetyText}
        </aside>

        <section className={styles.section} aria-labelledby="guide-basic">
          <h2 id="guide-basic">{text.baseTitle}</h2>
          <p>{text.baseIntro}</p>
          <h3>{text.optionOneTitle}</h3>
          <p>{text.optionOneText}</p>
          <h3>{text.optionTwoTitle}</h3>
          <p>{text.optionTwoText}</p>
        </section>

        <section className={styles.section} aria-labelledby="guide-photos">
          <h2 id="guide-photos">{text.photoTitle}</h2>
          <p>{text.photoLead}</p>
          <ol className={styles.steps}>
            {text.photoSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className={styles.review}>
            <h3>{text.observeTitle}</h3>
            <p>{text.observeText}</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="guide-advanced">
          <h2 id="guide-advanced">{text.advancedTitle}</h2>
          <p>{text.advancedLead}</p>
          <h3>{text.selfTitle}</h3>
          <ol className={styles.practices}>
            {text.selfItems.map((item) => (
              <li key={item.title}>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
          <h3>{text.sessionTitle}</h3>
          {text.sessionItems.map((item) => (
            <div className={styles.sessionItem} key={item.title}>
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </div>
          ))}
        </section>

        <section className={styles.section} aria-labelledby="guide-finish">
          <h2 id="guide-finish">{text.finishTitle}</h2>
          <p>{text.finishText}</p>
        </section>

        {!report && <nav className={styles.articleLinks} aria-label={text.library}>
          <Link className="hh-primary" href={`/${locale}/homeopathy/remedies`}>{text.remedies}</Link>
          <Link href={`/${locale}/library`}>{text.library}</Link>
        </nav>}
      </article>

      {!embedded && <div className={styles.consultation}>
        <PublicConsultationCta locale={locale} />
      </div>}
    </Container>
  );
}
