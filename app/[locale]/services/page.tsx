import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageVideo } from "@/components/page-video";
import { ServicesConversionHero } from "@/components/services-conversion-hero";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { ServicesSolutions } from "@/components/services-solutions";
import solutionStyles from "@/components/services-solutions.module.css";
import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicService } from "@/lib/practitioners/public-types";

type PageProps = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Production release marker: Wu Xing marketplace featured service.

const copy = {
  ru: {
    title: "Индивидуальная работа в Торонто и онлайн — Holistic House",
    description: "Начните с бесплатной вводной консультации, чтобы прояснить вашу ситуацию, найти точку ступора и выбрать следующий шаг. Психогомеопатия, образная терапия и расстановки.",
    kicker: "Торонто и онлайн",
    heading: "Индивидуальная работа",
    lead: "Исследуйте повторяющиеся паттерны, отношения, важные решения и внутренние блоки в бережной индивидуальной работе.",
    marketplaceCta: "Выбрать услугу",
    freeReviewTitle: "Бесплатная диагностика ситуации",
    freeReviewText: "Разбор вашей цели, бизнеса или личной проблемы: точка ступора, зона роста и возможный следующий шаг. Без обязательств продолжать работу.",
    freeReviewAction: "Запросить бесплатный разбор",
    approachKicker: "Как устроена работа",
    approachTitle: "Начинаем с вашего реального вопроса",
    approachText: "Мы обсуждаем ваш запрос, границы и подходящий формат. Системная работа, образы и другие методы используются только по взаимному согласию и в подходящем контексте.",
    about: "Об Андрее",
    consultationKicker: "Первый шаг",
    consultation: "Начните с короткого разговора",
    consultationText: "Опишите ваш запрос — вместе определим, какой из трёх форматов сейчас наиболее уместен.",
    telegram: "Написать в Telegram",
    whatsapp: "WhatsApp",
    note: "Эти форматы не заменяют медицинскую диагностику или неотложную помощь. Бизнес-расстановки не заменяют финансовую, юридическую или профессиональную экспертизу и не гарантируют результат.",
  },
  en: {
    title: "Personal work in Toronto and online — Holistic House",
    description: "Start with a free personal consultation to clarify what is holding you back. Explore psychohomeopathy, guided imagery and systemic constellations at Holistic House.",
    kicker: "Toronto & online",
    heading: "Personal work",
    lead: "Explore repeating patterns, relationships, important decisions and inner blocks through thoughtful one-to-one work.",
    marketplaceCta: "Choose a service",
    freeReviewTitle: "Free situation & goal assessment",
    freeReviewText: "A free review of your goal, business or personal challenge: where you feel stuck, possible growth areas and a next step. No obligation to book paid work.",
    freeReviewAction: "Request a free review",
    approachKicker: "How the work begins",
    approachTitle: "Start with your real question",
    approachText: "We discuss your question, boundaries and the format that may fit. Systemic work, imagery and other methods are used only by mutual agreement and in an appropriate context.",
    about: "About Andrey",
    consultationKicker: "First step",
    consultation: "Start with a short conversation",
    consultationText: "Tell me what you would like to explore, and we can choose which of the three formats fits best right now.",
    telegram: "Message on Telegram",
    whatsapp: "WhatsApp",
    note: "These formats do not replace medical diagnosis or urgent care. Business constellations do not replace financial, legal or professional advice and do not guarantee an outcome.",
  },
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const current = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.title,
    description: current.description,
    alternates: {
      canonical: "/" + locale + "/services",
      languages: { ru: "/ru/services", en: "/en/services" },
    },
  };
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const current = copy[locale as Locale];
  let offerings: PublicService[] = [];
  try {
    offerings = await createPractitionerRepository(getAppConfig()).listPublicServices(locale);
  } catch {
    offerings = [];
  }
  const featuredService = offerings.find((service) => service.slug === "free-wu-xing-diagnostic");
  const marketplaceOfferings = offerings.filter((service) => service.id !== featuredService?.id);

  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} />

      <ServicesConversionHero locale={locale as Locale} />

      <ServicesSolutions locale={locale as Locale} />

      <details className={solutionStyles.extra} id="available-services">
        <summary className={solutionStyles.extraSummary}>
          <span>
            <strong>{locale === "ru" ? "Ищете конкретную услугу?" : "Already know which service you need?"}</strong>
            <small>{locale === "ru" ? "Разверните каталог отдельных предложений и мастеров" : "Expand the separate practitioner offers and formats"}</small>
          </span>
          <span className={solutionStyles.expandSymbol} aria-hidden="true">+</span>
        </summary>
      <section className="services-marketplace" id="service-listings" aria-labelledby="services-marketplace-title">
        <div className="services-marketplace-heading">
          <p className="homeopathy-kicker">{locale === "ru" ? "Доступные услуги" : "Available services"}</p>
          <h2 id="services-marketplace-title">{locale === "ru" ? "Выберите услугу" : "Choose a service"}</h2>
          <p>
            {locale === "ru"
              ? "Можно открыть подробности или сразу отправить запрос выбранному мастеру. Публичные профили и услуги проходят модерацию."
              : "Open the details or send a request directly to the practitioner. Public profiles and services are moderated."}
          </p>
        </div>


        {featuredService ? (
          <article className="services-marketplace-featured">
            <div className="services-marketplace-featured-mark" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <div className="services-marketplace-featured-copy">
              <div className="services-marketplace-featured-topline">
                <span className="services-marketplace-free-badge">
                  {locale === "ru" ? "Бесплатно" : "Free"}
                </span>
                <Link href={`/${locale}/masters/${featuredService.practitionerSlug}`}>
                  {featuredService.practitionerName}
                </Link>
              </div>
              <h3>{featuredService.copy.title}</h3>
              <p>{featuredService.copy.shortDescription}</p>
              <div className="services-marketplace-featured-meta">
                <span>{locale === "ru" ? "Онлайн" : "Online"}</span>
                {featuredService.durationMinutes ? <span>{featuredService.durationMinutes} min</span> : null}
                <span>{locale === "ru" ? "Личный профиль У-Син" : "Personal Wu Xing profile"}</span>
              </div>
              <div className="services-marketplace-actions">
                <Link
                  className="services-marketplace-request services-marketplace-request--featured"
                  href={`/${locale}/app/consultations?service=${encodeURIComponent(featuredService.id)}`}
                >
                  {locale === "ru" ? "Пройти бесплатно" : "Start free"}<span aria-hidden="true">→</span>
                </Link>
                <Link
                  className="services-marketplace-details"
                  href={`/${locale}/services/${featuredService.practitionerSlug}/${featuredService.slug}`}
                >
                  {locale === "ru" ? "Подробнее" : "Details"}
                </Link>
              </div>
            </div>
          </article>
        ) : null}

        {marketplaceOfferings.length ? (
          <div className="services-marketplace-grid">
            {marketplaceOfferings.map((service) => {
              const format =
                service.deliveryFormat === "in_person"
                  ? (locale === "ru" ? "Очно" : "In person")
                  : service.deliveryFormat === "hybrid"
                    ? (locale === "ru" ? "Онлайн / очно" : "Online / in person")
                    : "Online";
              const isFree = service.pricingMode === "free" || (service.pricingMode !== "contact" && service.confirmedPrice === 0);
              const price =
                isFree
                  ? (locale === "ru" ? "Бесплатно" : "Free")
                  : service.pricingMode !== "contact" && service.confirmedPrice != null
                    ? `${service.pricingMode === "from" ? (locale === "ru" ? "от " : "from ") : ""}${service.currency || ""} ${service.confirmedPrice}`
                    : (locale === "ru" ? "По запросу" : "On request");
              return (
                <article className="services-marketplace-card" key={service.id}>
                  <div className="services-marketplace-card-top">
                    <Link
                      className="services-marketplace-provider"
                      href={`/${locale}/masters/${service.practitionerSlug}`}
                    >
                      <span className="services-marketplace-avatar" aria-hidden="true">
                        {(service.practitionerName || "H").slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <small>{locale === "ru" ? "Мастер" : "Practitioner"}</small>
                        <strong>{service.practitionerName}</strong>
                      </span>
                    </Link>
                    <span className={`services-marketplace-price${isFree ? " services-marketplace-price--free" : ""}`}>
                      {price}
                    </span>
                  </div>
                  <h3>{service.copy.title}</h3>
                  {service.professionalTitle ? (
                    <p className="services-marketplace-role">{service.professionalTitle}</p>
                  ) : null}
                  <p className="services-marketplace-description">{service.copy.shortDescription}</p>
                  <div className="services-marketplace-meta">
                    <span>{format}</span>
                    {service.locationLabel && service.locationLabel !== "Online" ? <span>{service.locationLabel}</span> : null}
                    {service.durationMinutes ? <span>{service.durationMinutes} min</span> : null}
                  </div>
                  <div className="services-marketplace-actions">
                    <Link
                      className="services-marketplace-request"
                      href={`/${locale}/app/consultations?service=${encodeURIComponent(service.id)}`}
                    >
                      {isFree ? (locale === "ru" ? "Запросить бесплатно" : "Request free service") : (locale === "ru" ? "Заказать" : "Request")}<span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      className="services-marketplace-details"
                      href={`/${locale}/services/${service.practitionerSlug}/${service.slug}`}
                    >
                      {locale === "ru" ? "Подробнее" : "Details"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : !featuredService ? (
          <p className="services-marketplace-empty">
            {locale === "ru" ? "Каталог услуг сейчас обновляется." : "The service catalogue is being updated."}
          </p>
        ) : null}
        <p className="services-marketplace-all">
          <Link href={`/${locale}/masters`}>
            {locale === "ru" ? "Все мастера и практики" : "View all practitioners"}<span aria-hidden="true">→</span>
          </Link>
        </p>
      </section>
      </details>

      <details className={solutionStyles.extra} id="method-videos">
        <summary className={solutionStyles.extraSummary}>
          <span>
            <strong>{locale === "ru" ? "Видео: как я работаю" : "Watch how I work"}</strong>
            <small>{locale === "ru" ? "Короткие объяснения методов — по желанию" : "Short explanations of methods, if you'd like more detail"}</small>
          </span>
          <span className={solutionStyles.expandSymbol} aria-hidden="true">+</span>
        </summary>
        <div className={solutionStyles.extraVideos}>
          <PageVideo slot="services-intro" locale={locale} />

          {locale === "en" ? (
            <section className="services-method-videos" id="methods-video-explainers" aria-labelledby="services-method-videos-title">
              <div className="services-method-videos-heading">
                <p className="homeopathy-kicker">More about the approaches</p>
                <h2 id="services-method-videos-title">Two short explanations</h2>
              </div>
              <div className="services-method-videos-grid">
                <article className="services-method-video">
                  <h3>Hypnotherapy</h3>
                  <PageVideo slot="method-hypnotherapy" locale="en" />
                </article>
                <article className="services-method-video">
                  <h3>Systemic constellations</h3>
                  <PageVideo slot="method-constellations" locale="en" />
                </article>
              </div>
            </section>
          ) : null}
          <div className={solutionStyles.archivedClips}>
            {(["business", "alchemy", "archetypal"] as const).map((id) => (
              <PageVideo key={id} slot={"service-" + id} locale={locale} />
            ))}
          </div>
          <PageVideo slot="consultation" locale={locale} />
          <p className={solutionStyles.extraAbout}>
            <Link href={"/" + locale + "/about"}>{current.about}<span aria-hidden="true"> →</span></Link>
          </p>
        </div>
      </details>



      <PersonalTestimonials locale={locale as Locale} variant="services" />

      <PublicConsultationCta locale={locale as Locale} id="consultation" />
      <p className="remedy-disclaimer services-disclaimer">{current.note}</p>
    </main>
  );
}
