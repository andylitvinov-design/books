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
    title: "Индивидуальные услуги — Holistic House",
    description: "Бесплатная диагностика ситуации, дао-диагностика ресурса, сессия «Алхимия души» и курс гипнотерапии. Четыре варианта личной работы с Андреем.",
    about: "Об Андрее",
    note: "Символические практики не заменяют медицинскую диагностику и лечение. Гомеопатия не имеет надёжных доказательств эффективности для лечения заболеваний; конкретные результаты не гарантируются.",
  },
  en: {
    title: "Personal services — Holistic House",
    description: "Explore four Holistic House offers: a free situation review, a free DAO resource profile, Alchemy of the Soul and guided imagery hypnotherapy.",
    about: "About Andrey",
    note: "These symbolic approaches do not replace medical assessment or treatment. Homeopathy lacks reliable evidence for treating health conditions. Individual results are not guaranteed.",
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

      <PersonalTestimonials locale={locale as Locale} variant="services" />

      <details className={solutionStyles.extra} id="available-services">
        <summary className={solutionStyles.extraSummary}>
          <span>
            <strong>{locale === "ru" ? "Ищете конкретную услугу?" : "Already know which service you need?"}</strong>
            <small>{locale === "ru" ? "Дополнительные форматы и каталог практиков" : "Optional practitioner directory and additional formats"}</small>
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


      <PublicConsultationCta locale={locale as Locale} id="consultation" />
      <p className="remedy-disclaimer services-disclaimer">{current.note}</p>
    </main>
  );
}
