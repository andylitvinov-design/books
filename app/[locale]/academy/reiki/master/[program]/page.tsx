import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { metadataBaseFor } from "@/data/site-metadata";
import {
  masterProgramIds, masterReikiPrograms, masterReikiUi, type MasterProgramId,
} from "@/lib/reiki-master-programs";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./master-reiki.module.css";

type Props = { params: Promise<{ locale: string; program: string }> };

function validLocale(value: string): value is PublicLocale {
  return value === "en" || value === "ru" || value === "es";
}
function validProgram(value: string): value is MasterProgramId {
  return masterProgramIds.some((id) => id === value);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, program } = await params;
  if (!validLocale(locale) || !validProgram(program)) return { title: "Not found", robots: { index: false } };
  const offer = masterReikiPrograms[program];
  const path = "/academy/reiki/master/" + program;
  return {
    metadataBase: metadataBaseFor(),
    title: offer.title[locale] + " | Holistic House",
    description: offer.teaser[locale] + " " + masterReikiUi[locale].requestLead,
    alternates: {
      canonical: "/" + locale + path,
      languages: { en: "/en" + path, ru: "/ru" + path, es: "/es" + path, "x-default": "/en" + path },
    },
    openGraph: {
      type: "website",
      title: offer.title[locale],
      description: offer.description[locale],
      images: [{ url: offer.image, alt: offer.title[locale] }],
    },
  };
}

export default async function MasterReikiLanding({ params }: Props) {
  const { locale, program } = await params;
  if (!validLocale(locale) || !validProgram(program)) notFound();
  const offer = masterReikiPrograms[program];
  const t = masterReikiUi[locale];
  const path = "/" + locale + "/academy/reiki/master/" + program;
  const overviewHref = "/" + locale + "/pro#profi-masters";
  const messageUrl = whatsappEnquiryUrl({
    locale,
    service: offer.title[locale],
    request: t.requestText,
    option: t.interested,
    pagePath: path,
  });

  return (
    <main className={styles.page} lang={locale} data-reiki-master-landing={program}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.container}>
        <Link href={overviewHref} className={styles.back} prefetch={false}>
          <ArrowLeft size={16} aria-hidden="true" /> {t.back}
        </Link>
        <header className={styles.hero}>
          <div className={styles.heroArt}>
            <Image src={offer.image} alt="" fill unoptimized priority
              sizes="(max-width: 800px) 100vw, 40vw" className={styles.heroImage} />
          </div>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}><GraduationCap size={16} aria-hidden="true" /> {t.kicker}</p>
            <h1>{offer.title[locale]}</h1>
            <p className={styles.heroLead}>{offer.description[locale]}</p>
            <span className={styles.paid}><CheckCircle2 size={15} aria-hidden="true" />{t.paid}</span>
            <a href="#request" className={styles.primary} data-master-request-link>
              {t.interested}<ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.curriculum} aria-labelledby="master-syllabus">
            <p className={styles.eyebrow}>{t.preview}</p>
            <h2 id="master-syllabus">{t.overview}</h2>
            <ol>
              {offer.topics[locale].map((topic, index) => (
                <li key={topic}>
                  <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                  <p>{topic}</p>
                </li>
              ))}
            </ol>
          </section>
          <div className={styles.context}>
            <section aria-labelledby="master-audience">
              <h2 id="master-audience">{t.target}</h2>
              <p>{offer.audience[locale]}</p>
            </section>
            <section aria-labelledby="master-format">
              <h2 id="master-format">{t.format}</h2>
              <p>{offer.format[locale]}</p>
            </section>
            <Link href={"/" + locale + "/academy/" + offer.academyPath} prefetch={false} className={styles.sourceLink}>
              <BookOpen size={18} aria-hidden="true" /> {t.studyMaterials}<ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <section className={styles.request} id="request" aria-labelledby="master-contact-title" data-reiki-master-request>
          <div>
            <p className={styles.eyebrow}>{t.paid}</p>
            <h2 id="master-contact-title">{t.requestTitle}</h2>
            <p>{t.requestLead}</p>
            <p className={styles.notice}><ShieldCheck size={18} aria-hidden="true" />{t.notice}</p>
          </div>
          <div className={styles.requestControl}>
            <ContactChannelChooser
              locale={locale}
              stayAfterSave
              whatsappUrl={messageUrl}
              label={t.interested}
              event="academy_course_enquiry_click"
              attributes={{ "data-reiki-master-request": program }}
            />
          </div>
        </section>
        <Link href={overviewHref} prefetch={false} className={styles.backBottom}>
          <ArrowLeft size={16} aria-hidden="true" /> {t.back}
        </Link>
      </div>
    </main>
  );
}
