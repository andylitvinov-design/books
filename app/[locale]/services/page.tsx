import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, Flower2, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { PageVideo } from "@/components/page-video";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { LOCAL_ACQUISITION } from "@/data/local-acquisition";
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
    description: "Гипнотерапия, системные и семейные расстановки, работа с решениями и Рейки в Holistic House.",
    kicker: "Торонто и онлайн",
    heading: "Индивидуальная работа",
    lead: "Исследуйте повторяющиеся паттерны, отношения, важные решения и внутренние блоки в бережной индивидуальной работе.",
    marketplaceCta: "Выбрать услугу",
    cards: [
      {
        id: "business",
        title: "Бизнес-расстановки",
        subtitle: "Анализ перспектив бизнес-проектов",
        text: "Системное исследование проекта: его перспектив, скрытых динамик, партнёрств, ролей, денег, ограничений и возможных следующих шагов. Это способ увидеть ситуацию шире и проверить решения через расстановочное поле.",
        icon: BriefcaseBusiness,
      },
      {
        id: "alchemy",
        title: "Алхимия души / психогомеопатия",
        subtitle: "Индивидуальная работа с внутренними состояниями",
        text: "Авторский формат, объединяющий образную и системную работу с навигацией по поддерживающим средствам. Фокус — внутренние состояния, повторяющиеся паттерны, ресурсы и движение к более целостному состоянию.",
        icon: Flower2,
      },
      {
        id: "archetypal",
        title: "Архетипические расстановки",
        subtitle: "Мистерии и инициации",
        text: "Экспериментальная работа с архетипами, мифологическими образами, ритуальной структурой и трансперсональным полем — индивидуально или в группе.",
        icon: Sparkles,
      },
    ],
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
    description: "Hypnotherapy, systemic and family constellations, decision work, and Reiki at Holistic House.",
    kicker: "Toronto & online",
    heading: "Personal work",
    lead: "Explore repeating patterns, relationships, important decisions and inner blocks through thoughtful one-to-one work.",
    marketplaceCta: "Choose a service",
    cards: [
      {
        id: "business",
        title: "Business Constellations",
        subtitle: "Exploring the prospects of business projects",
        text: "A systemic exploration of a project: its prospects, hidden dynamics, partnerships, roles, money, constraints, and possible next steps. The aim is to widen the view and test decisions through constellation work.",
        icon: BriefcaseBusiness,
      },
      {
        id: "alchemy",
        title: "Alchemy of the Soul / Psychohomeopathy",
        subtitle: "Individual work with inner states",
        text: "An author-developed format combining imagery and systemic exploration with guidance around supportive remedies. The focus is on inner states, recurring patterns, resources, and movement toward greater wholeness.",
        icon: Flower2,
      },
      {
        id: "archetypal",
        title: "Archetypal Constellations",
        subtitle: "Mysteries & Initiations",
        text: "Experiential work with archetypes, mythic imagery, ritual structure, and the transpersonal field — individually or in groups.",
        icon: Sparkles,
      },
    ],
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
  const entry = LOCAL_ACQUISITION[locale as Locale];
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

      <section className="services-studio-hero">
        <div className="services-studio-hero-copy">
          <p className="homeopathy-kicker">{current.kicker}</p>
          <h1>{current.heading}</h1>
          <p>{current.lead}</p>
          <Link className="services-studio-primary" href="#available-services">
            {current.marketplaceCta}<span aria-hidden="true">→</span>
          </Link>
          <AcquisitionEventLink className="services-studio-primary" href={entry.selfCheck.href} event="self_check_start">
            {entry.selfCheck.label}<span aria-hidden="true">→</span>
          </AcquisitionEventLink>
        </div>
        <div className="services-studio-photo" aria-hidden="true">
          <Image
            src="/images/holistic-house/hero-olive-incense.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, 44vw"
          />
        </div>
      </section>

      <section className="services-marketplace" id="available-services" aria-labelledby="services-marketplace-title">
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
              const isFree = service.pricingMode !== "contact" && service.confirmedPrice === 0;
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
                      {locale === "ru" ? "Заказать" : "Request"}<span aria-hidden="true">→</span>
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

      <PageVideo slot="services-intro" locale={locale} />

      <section className="services-studio-grid services-studio-grid--three" aria-label={current.heading}>
        {entry.services.map(({ id, title, subtitle, text }) => {
          const Icon = id === "business-decision-constellations" ? BriefcaseBusiness : id === "reiki-energy-work" ? Flower2 : Sparkles;
          return <article className="services-studio-card services-studio-card--detailed" id={id} key={id}>
            <span className="services-studio-icon" aria-hidden="true"><Icon /></span>
            <h2>{title}</h2>
            <p className="services-studio-card-subtitle">{subtitle}</p>
            <p>{text}</p>
          </article>;
        })}
      </section>

      <section className="services-studio-grid services-studio-grid--three" aria-label={locale === "ru" ? "Дополнительные направления" : "Additional directions"}>
        {current.cards.map(({ id, icon: Icon, title, subtitle, text }) => (
          <article className="services-studio-card services-studio-card--detailed" id={id} key={title}>
            <span className="services-studio-icon" aria-hidden="true"><Icon /></span>
            <h2>{title}</h2>
            <p className="services-studio-card-subtitle">{subtitle}</p>
            <p>{text}</p>
            <PageVideo slot={"service-" + id} locale={locale} className="site-video--service-card" />
          </article>
        ))}
      </section>

      {locale === "en" ? (
        <section className="services-method-videos" id="methods" aria-labelledby="services-method-videos-title">
          <div className="services-method-videos-heading">
            <p className="homeopathy-kicker">Methods in more detail</p>
            <h2 id="services-method-videos-title">Two short explanations</h2>
          </div>
          <div className="services-method-videos-grid">
            <article className="services-method-video">
              <h3>Hypnotherapy</h3>
              <PageVideo slot="method-hypnotherapy" locale="en" />
            </article>
            <article className="services-method-video">
              <h3>Systemic Constellations</h3>
              <PageVideo slot="method-constellations" locale="en" />
            </article>
          </div>
        </section>
      ) : null}

      <section className="services-studio-approach">
        <div>
          <p className="homeopathy-kicker">{current.approachKicker}</p>
          <h2>{current.approachTitle}</h2>
        </div>
        <div>
          <p>{current.approachText}</p>
          <Link href={"/" + locale + "/about"}>{current.about}<span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <PageVideo slot="consultation" locale={locale} />

      <PublicConsultationCta locale={locale as Locale} id="consultation" />
      <p className="remedy-disclaimer services-disclaimer">{current.note}</p>
    </main>
  );
}
