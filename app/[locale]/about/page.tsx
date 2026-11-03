import type { Metadata } from "next";
import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PersonalConsultationForm } from "@/components/personal-consultation-form";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { PageVideo } from "@/components/page-video";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicPathwayStrip } from "@/components/public-pathway-strip";
import refreshStyles from "@/components/public-journey-refresh.module.css";
import { PsychicAlchemyIntroVideo } from "@/components/psychic-alchemy-intro-video";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { existingAboutIntroVideo } from "@/lib/site-videos/defaults";
import { getPublishedSiteVideo } from "@/lib/site-videos/public";
import { videoKey } from "@/lib/site-videos/model";
import { aboutBiography } from "@/data/about-biography";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const consultationCopy = {
  en: {
    kicker: "Personal work",
    heading: "Personal Consultation",
    text: "Choose a paid live consultation: €50 for 30 minutes (express) or €100 for 60 minutes. A separate free drawing assessment with written report is also available.",
    cabinetAction: "Log in to Client Cabinet",
  },
  ru: {
    kicker: "Личная работа",
    heading: "Личная консультация",
    text: "Выберите личную платную консультацию: €50 за 30 минут (экспресс) или €100 за 60 минут. Отдельно доступна бесплатная диагностика по рисунку с письменным отчётом.",
    cabinetAction: "Войти в кабинет клиента",
  },
} as const;

export function generateStaticParams() {
  return getHomeopathyLocaleParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };

  const current = aboutBiography[locale as Locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.meta.title,
    description: current.meta.description,
    alternates: {
      canonical: "/" + locale + "/about",
      languages: { ru: "/ru/about", en: "/en/about", es: "/es/about", "x-default": "/en/about" },
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const current = aboutBiography[typedLocale];
  const consultation = consultationCopy[typedLocale];
  const aboutIntro = await getPublishedSiteVideo(videoKey("about-intro", typedLocale));

  return (
    <main className={"about-shell " + refreshStyles.page} lang={typedLocale} data-public-design-migration="wave1">
      <PublicSiteHeader locale={typedLocale} />

      {aboutIntro && (typedLocale === "en" && aboutIntro.heygenId === existingAboutIntroVideo.heygenId
        ? <PsychicAlchemyIntroVideo video={aboutIntro} />
        : <section className="site-video-block" data-video-slot="about-intro" data-video-locale={typedLocale} aria-label={aboutIntro.title}><SiteVideoPlayer video={aboutIntro} locale={typedLocale} minimal={typedLocale === "ru"} posterPriority internalOnly /></section>)}

      <section className="about-introduction" aria-labelledby="about-title">
        <div className="about-portrait">
          <StaticPortrait alt={current.photoAlt} fill priority sizes="(max-width: 767px) 100vw, (max-width: 1127px) 56vw, 660px" src="/images/holistic-house/andy-about.png" />
        </div>
        <div className="about-introduction-copy">
          <p className="about-kicker">{current.eyebrow}</p>
          <h1 id="about-title">Andy</h1>
          {current.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>

      <PublicPathwayStrip locale={typedLocale} />

      <article className="about-biography">
        {current.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </article>

      <section className="about-explore" aria-labelledby="about-explore-title">
        <p className="about-kicker">Holistic House</p>
        <h2 id="about-explore-title">{current.explore.heading}</h2>
        <nav aria-label={current.explore.heading}>{current.explore.links.map((link) => <Link href={link.href} key={link.href}>{link.label}<span aria-hidden="true">→</span></Link>)}</nav>
      </section>

      <PersonalTestimonials locale={typedLocale} variant="about" />

      <PageVideo slot="consultation" locale={typedLocale} internalOnly />

      <section className="about-consultation" aria-labelledby="personal-consultation-title">
        <div className="about-consultation-copy">
          <p className="about-kicker">{consultation.kicker}</p>
          <h2 id="personal-consultation-title">{consultation.heading}</h2>
          <p>{consultation.text}</p>
        </div>
        <PersonalConsultationForm locale={typedLocale} onSiteContact />
      </section>

      <section className="about-client-cabinet" aria-labelledby="client-cabinet-title">
        <h2 id="client-cabinet-title">{current.cabinet.heading}</h2>
        <p>{current.cabinet.body}</p>
        <Link className="about-client-cabinet-login" href={"/" + typedLocale + "/client"}>
          {consultation.cabinetAction}<span aria-hidden="true">→</span>
        </Link>
        <p className="about-client-cabinet-prompt">{current.cabinet.prompt}</p>
        <Link href={current.cabinet.href}>{current.cabinet.action}<span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
