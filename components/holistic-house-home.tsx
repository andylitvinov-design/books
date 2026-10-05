"use client";

import { BriefcaseBusiness, Flower2, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { MindBodyMonitorHome } from "@/components/mind-body-monitor-home";
import { MindBodyMonitorStrip } from "@/components/mind-body-monitor-strip";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { LOCAL_ACQUISITION } from "@/data/local-acquisition";
import type { Locale } from "@/data/remedies";
import type { PublishedSiteVideo } from "@/lib/site-videos/model";

const copy = {
  ru: { wordmark: "восстановление · практика · поддержка", homeLabel: "Holistic House — главная", servicesTitle: "Форматы личной работы", seeAll: "Все форматы", learnMore: "Подробнее", libraryEyebrow: "Авторская книга", libraryTitle: "Алхимия души", libraryText: "Моя книга о внутреннем развитии, психогомеопатии и авторском подходе к работе с состояниями.", libraryAction: "Все книги", bookUrl: "/ru/books", footer: "Индивидуальная работа, осознанные практики и пространство для внутреннего развития." },
  en: { wordmark: "healing · practice · guidance", homeLabel: "Holistic House — home", servicesTitle: "Ways to work together", seeAll: "All services", learnMore: "Explore", libraryEyebrow: "Author book", libraryTitle: "The Power of Life", libraryText: "My book on inner development, psychohomeopathy, and an integrative approach to working with human states.", libraryAction: "Browse books", bookUrl: "/en/books", footer: "Individual work, thoughtful practice, and a space for inner development." },
} as const;

const serviceIcons = { hypnotherapy: Sparkles, "systemic-constellations": Flower2, "business-decision-constellations": BriefcaseBusiness, "reiki-energy-work": Sparkles } as const;

type HolisticHouseHomeProps = { locale?: Locale; introVideos?: Partial<Record<Locale, PublishedSiteVideo>> };

export function HolisticHouseHome({ locale = "en", introVideos = {} }: HolisticHouseHomeProps) {
  const router = useRouter();
  const text = copy[locale];
  const entry = LOCAL_ACQUISITION[locale];
  const introVideo = introVideos[locale];

  function selectLocale(nextLocale: Locale) {
    const target = new URL(window.location.href);
    target.searchParams.set("lang", nextLocale);
    router.replace(target.pathname + target.search + target.hash, { scroll: false });
  }

  return <main className="house-home house-home--services" lang={locale}>
    <header className="house-header house-header--services"><Link className="house-wordmark" href="/" aria-label={text.homeLabel}>Holistic House<span>{text.wordmark}</span></Link><SiteNavigation locale={locale} onLocaleChange={selectLocale} /></header>
    <MindBodyMonitorStrip locale={locale} />

    <section className="service-home-hero" aria-labelledby="house-title">
      <div className="service-home-hero-photo" aria-hidden="true"><Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill priority sizes="(max-width: 767px) 100vw, (max-width: 1127px) 55vw, 620px" /></div>
      <div className="service-home-hero-copy"><p className="service-home-kicker">{entry.hero.eyebrow}</p><h1 id="house-title"><span>{entry.hero.title}</span></h1><p className="service-home-intro">{entry.hero.intro}</p><div className="service-home-actions"><AcquisitionEventLink className="service-home-button service-home-button--primary" href={entry.selfCheck.href} event="self_check_start">{entry.selfCheck.label}<span aria-hidden="true">→</span></AcquisitionEventLink><AcquisitionEventLink className="service-home-button service-home-button--secondary" href={`/${locale}/services`} event="service_view">{entry.hero.servicesLabel}<span aria-hidden="true">→</span></AcquisitionEventLink></div></div>
    </section>

    <MindBodyMonitorHome locale={locale} />

    {introVideo ? <section className="site-video-block" data-video-slot="home-intro" data-video-locale={locale} aria-label={introVideo.title}><SiteVideoPlayer key={locale} video={introVideo} locale={locale} className="site-video--home" /></section> : null}

    <section className="service-home-services" aria-labelledby="service-home-services-title"><div className="service-home-section-heading"><h2 id="service-home-services-title">{text.servicesTitle}</h2><Link href={`/${locale}/services`}>{text.seeAll}<span aria-hidden="true">→</span></Link></div><div className="service-home-card-grid">{entry.services.map((service) => { const Icon = serviceIcons[service.id]; return <AcquisitionEventLink className="service-home-card" href={`/${locale}/services#${service.id}`} key={service.id} event="service_view"><span className="service-home-card-symbol" aria-hidden="true"><Icon /></span><h3>{service.title}</h3><p>{service.text}</p><span className="service-home-card-action">{text.learnMore}<span aria-hidden="true">→</span></span></AcquisitionEventLink>; })}</div></section>

    <section className="service-home-about" aria-labelledby="service-home-about-title"><div><p className="service-home-kicker">{entry.practitioner.label}</p><h2 id="service-home-about-title">Andrey Litvinov</h2></div><div><p>{entry.practitioner.text}</p><AcquisitionEventLink href={entry.practitioner.href} event="practitioner_view">{entry.practitioner.label}<span aria-hidden="true">→</span></AcquisitionEventLink></div></section>

    <section className="service-home-self-check" aria-labelledby="self-check-title"><p className="service-home-kicker">{entry.selfCheck.title}</p><h2 id="self-check-title">{entry.selfCheck.label}</h2><p>{entry.selfCheck.text}</p><AcquisitionEventLink href={entry.selfCheck.href} event="self_check_start">{entry.selfCheck.label}<span aria-hidden="true">→</span></AcquisitionEventLink></section>

    <section className="service-home-library" aria-labelledby="service-home-library-title"><Image src="/images/holistic-house/books-library.webp" alt="" fill sizes="(max-width: 767px) 100vw, 1200px" className="service-home-library-photo" /><div className="service-home-library-copy"><p className="service-home-kicker">{text.libraryEyebrow}</p><h2 id="service-home-library-title">{text.libraryTitle}</h2><p className="service-home-library-intro">{text.libraryText}</p><Link href={text.bookUrl}>{text.libraryAction}<span aria-hidden="true">→</span></Link></div></section>

    <PublicConsultationCta locale={locale} />
    <footer className="service-home-footer"><Link className="house-wordmark" href="/">Holistic House</Link><p>{text.footer}</p><Link href={`/${locale}/services`}>{entry.hero.servicesLabel}<span aria-hidden="true">→</span></Link><p className="service-home-footer__legal"><Link href="/privacy">Privacy</Link><span aria-hidden="true"> · </span><Link href="/terms">Terms</Link></p></footer>
  </main>;
}
