import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageVideo } from "@/components/page-video";
import { ServicesConversionHero } from "@/components/services-conversion-hero";
import { ServicesAboutEntry } from "@/components/services-about-entry";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { ServicesSolutions } from "@/components/services-solutions";
import { ServicesTestsIntro } from "@/components/services-tests-intro";
import solutionStyles from "@/components/services-solutions.module.css";
import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicService } from "@/lib/practitioners/public-types";
import { MarketplaceServiceFinder } from "@/components/master-network-explorer";
import { ServicesSmartDiscovery } from "@/components/services-smart-discovery";
import { coreServiceOffers } from "@/data/core-service-offers";

type PageProps = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Production release marker: Wu Xing marketplace featured service.

const copy = {
  ru: {
    title: "Индивидуальные услуги — Holistic House",
    description: "Личные сессии в Торонто и онлайн. Три бесплатных способа начать: тесты, письменный анализ ситуации и символический профиль ресурсов У-Син.",
    about: "Об Андрее",
    note: "Символические практики не заменяют медицинскую диагностику и лечение. Гомеопатия не имеет надёжных доказательств эффективности для лечения заболеваний; конкретные результаты не гарантируются.",
  },
  en: {
    title: "Personal services — Holistic House",
    description: "Personal sessions in Toronto or online, plus three free entry points: self-check tests, a written situation review, and a symbolic Wu Xing resource profile.",
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
      languages: { ru: "/ru/services", en: "/en/services", es: "/es/services", "x-default": "/en/services" },
    },
    openGraph: { type: "website", siteName: "Holistic House", locale: locale === "ru" ? "ru_RU" : "en_CA",
      url: "/" + locale + "/services", title: current.title, description: current.description,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov — Holistic House" }] },
    twitter: { card: "summary_large_image", title: current.title, description: current.description,
      images: ["/images/holistic-house/andy-about.png"] },
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
  const editorialAreas: Record<string,string> = {
    situation: "emotional_psychological", dao: "homeopathy_holistic",
    alchemy: "relationships", hypnotherapy: "personal_development", business: "business_money",
  };
  // These are established Holistic House services, not anonymous directory
  // links. Their inline request actions use the existing channel handoff.
  const editorialOffers = [
    ...coreServiceOffers(locale as Locale).map((offer) => ({
      id:offer.id, title:offer.title, promise:offer.promise, benefit:offer.benefit, image:offer.image,
      details: offer.id === "situation"
        ? (locale === "ru"
          ? "Заполните коучинг-анкету и нарисуйте схему «Я — цель — проблема». Бесплатный результат — личный письменный разбор, а не живая консультация."
          : "Complete the coaching questionnaire and draw the I — goal — problem scheme. The free offer is a personal written review, not a live call.")
        : offer.id === "dao"
          ? (locale === "ru"
            ? "Знакомство с ресурсами в авторской символической модели пяти элементов У-Син. Это самоисследование, не медицинская диагностика."
            : "Explore personal resources with the author-led symbolic Wu Xing five-element model. This is reflective self-exploration, not a medical diagnosis.")
          : offer.id === "alchemy"
            ? (locale === "ru"
              ? "На личной сессии мы уточняем запрос, исследуем динамику ситуации через системную расстановку и обсуждаем возможные шаги. Символический и дополнительный гомеопатический подходы не заменяют медицинскую помощь."
              : "We clarify your question, explore the dynamics through a personal systemic constellation and discuss possible next steps. Symbolic and complementary homeopathic approaches do not replace medical care.")
            : offer.id === "hypnotherapy"
              ? (locale === "ru"
                ? "Индивидуальная работа с внутренними образами, эмоциями и повторяющимися реакциями. Можно начать с одной встречи и затем обсудить продолжение курса; клиническую помощь это не заменяет."
                : "A personal series of guided-imagery sessions exploring inner resources, emotions and recurring patterns. You can begin with one session and decide later about a longer course; this does not replace clinical care.")
              : offer.id === "business"
                ? (locale === "ru"
                  ? "Проясняем деловую цель, создаём символическую карту бизнеса через расстановку и обсуждаем реальные следующие шаги, включая план на 14 дней. Это не финансовый прогноз и не гарантия дохода."
                  : "Clarify a business goal, map the organization symbolically through a constellation and consider practical next steps, including a 14-day action plan. This is not a financial forecast or income guarantee.")
                : offer.benefit,
      label:offer.label,
      price: offer.id === "situation" || offer.id === "dao"
        ? (locale === "ru" ? "Бесплатно" : "Free")
        : offer.id === "alchemy" || offer.id === "business"
          ? "€50 / 30 min · €100 / 60 min"
          : undefined,
      free:offer.id === "situation" || offer.id === "dao",
      href:offer.href, areaKey:editorialAreas[offer.id],
    })),
    {
      id:"constellations",image:"/images/holistic-house/video-posters/constellations-en-v1.webp",
      title:locale==="ru"?"Системные расстановки и архетипическая поддержка":"Systemic constellations & archetypal support",
      promise:locale==="ru"?"Исследуем отношения, семейные и личные сценарии через символическую расстановку.":"Explore relationship, family and life patterns through a personal symbolic constellation.",
      details:locale==="ru"?"Проясним запрос, рассмотрим роли и динамику ситуации, затем отделим впечатления от фактов и определим возможные шаги.":"Clarify your question, map the roles and dynamics symbolically, then distinguish impressions from facts and consider practical next steps.",
      benefit:locale==="ru"?"Индивидуальная сессия с Андреем":"Personal session with Andrey",
      label:locale==="ru"?"Личная сессия":"Personal session",
      price:"€50 / 30 min · €100 / 60 min",
      free:false,
      href:`/${locale}/services/systemic-constellations`,areaKey:"relationships",
    },
    {
      id:"yggdrasil",image:"/academy/reiki-yggdrasil/source/basic-program.jpg",title:locale==="ru"?"Рейки Иггдрасиль — бесплатная первая ступень":"Reiki Yggdrasil — free Level 1",
      promise:locale==="ru"?"Знакомство с системой Рейки, видео и материалы.":"Reiki practice, original video and study resources.",
      details:locale==="ru"?"Посмотрите вводное видео и учебные материалы, затем выберите бесплатную вводную ступень или индивидуальную инициацию.":"Watch the introductory video and study materials, then choose the free introductory level or a personal initiation.",
      label:locale==="ru"?"Рейки · Первая ступень":"Reiki · Level 1",
      price:locale==="ru"?"Бесплатно":"Free",
      free:true,
      href:`/${locale}/academy/reiki/yggdrasil/free-initiation`,areaKey:"energy_spiritual",
    },
    {
      id:"tantra",image:"/images/tantra-reiki/participant-1-poster.png",title:locale==="ru"?"Тантра Рейки — бесплатная инициация":"Tantra Reiki — free introduction",
      promise:locale==="ru"?"Изучите практику и варианты личной инициации.":"Explore the training and teacher-guided initiation.",
      details:locale==="ru"?"На странице курса есть вводные материалы, бесплатный запрос первой ступени и вариант индивидуальной инициации.":"The course page provides introductory materials, a free Level 1 request and the option of a personal initiation.",
      label:locale==="ru"?"Тантра Рейки · Первая ступень":"Tantra Reiki · Level 1",
      price:locale==="ru"?"Бесплатно":"Free",
      free:true,
      href:`/${locale}/academy/reiki/tantra-reiki/free-initiation`,areaKey:"energy_spiritual",
    },
  ];

  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />

      <ServicesSmartDiscovery
        locale={locale}
        services={offerings}
        editorialOffers={editorialOffers}
        aiAvailable={process.env.HH_MARKETPLACE_AI_ENABLED === "true"
          && Boolean(process.env.OPENROUTER_API_KEY) && Boolean(process.env.HH_MARKETPLACE_AI_MODEL)}
      />

      <ServicesConversionHero locale={locale as Locale} />
      <ServicesTestsIntro locale={locale as Locale} />
      <ServicesSolutions locale={locale as Locale} />
      <ServicesAboutEntry locale={locale as Locale} />

      <details className={solutionStyles.extra} id="method-videos" open>
        <summary className={solutionStyles.extraSummary}>
          <span>
            <strong>{locale === "ru" ? "Видео: как я работаю" : "Watch how I work"}</strong>
            <small>{locale === "ru" ? "Видео доступны сразу — нажмите Play для просмотра" : "Videos are visible below — tap Play to watch"}</small>
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
                <article className="services-method-video" id="service-video-hypnotherapy">
                  <h3>Hypnotherapy</h3>
                  <PageVideo slot="method-hypnotherapy" locale="en" />
                </article>
                <article className="services-method-video" id="service-video-alchemy">
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
              ? "Посмотрите подробности или закажите услугу напрямую у мастера. Публичные профили и услуги проходят модерацию."
              : "View the details or order directly from the practitioner. Public profiles and services are moderated."}
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
                  className="services-marketplace-details"
                  href={`/${locale}/services/${featuredService.practitionerSlug}/${featuredService.slug}`}
                >
                  {locale === "ru" ? "Подробнее" : "Details"}
                </Link>
                <Link
                  className="services-marketplace-request services-marketplace-request--featured"
                  href={`/${locale}/services/${featuredService.practitionerSlug}/${featuredService.slug}#service-order`}
                >
                  {locale === "ru" ? "Заказать" : "Order"}<span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </article>
        ) : null}

        {marketplaceOfferings.length ? (
          <MarketplaceServiceFinder services={marketplaceOfferings} locale={locale} />
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




      <PublicConsultationCta locale={locale as Locale} id="consultation" serviceBooking />
      <p className="remedy-disclaimer services-disclaimer">{current.note}</p>
    </main>
  );
}

