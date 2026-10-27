import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createArticleRepository } from "@/lib/practitioners/article-repository";
import { createDirectMessages } from "@/lib/practitioners/direct-messages";
import { createPractitionerCourseRepository } from "@/lib/practitioners/course-repository";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import type { PublicPractitioner, PublicService } from "@/lib/practitioners/public-types";
import { PractitionerServicesGrid } from "@/components/master-network-explorer";
import PractitionerPresentationVideo from "@/components/practitioner-presentation-video";
import PractitionerPublicFeed from "@/components/practitioner-public-feed";
import { publicPresentationUrl } from "@/lib/practitioners/presentation-contract";
import styles from "./profile.module.css";

type PageProps = { params: Promise<{ locale: string; slug: string }> };
type PublishedCourse = {
  slug: string;
  practitionerSlug: string;
  publishedAt?: string | null;
  course: {
    title: string;
    description?: string;
    locale: "en" | "ru" | "es";
    contentType?: "course" | "audio_meditation" | "video_meditation";
  };
};
type PublishedArticle = {
  id: string;
  slug: string;
  publishedAt?: string | null;
  published: { title: string; excerpt?: string; locale: "en" | "ru" | "es"; coverPath?: string; body?: string; kind?: string; media?: Array<{source?: string; type?: string; url?: string; assetId?: string}> };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function load(locale: string, slug: string): Promise<PublicPractitioner | null> {
  try {
    return (await createPractitionerRepository(getAppConfig()).getPublicPractitioner(slug, locale)) as PublicPractitioner;
  } catch {
    return null;
  }
}

function isFreeService(service: PublicService) {
  return service.pricingMode === "free" ||
    (service.pricingMode !== "contact" && service.confirmedPrice === 0);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  const practitioner = await load(locale, slug);
  if (!practitioner) return { title: "Not found", robots: { index: false, follow: false } };
  const name = practitioner.profile.displayName || practitioner.profile.name ||
    (locale === "es" ? "Profesional" : "Practitioner");
  return {
    metadataBase: metadataBaseFor(),
    title: name + " | Holistic House",
    description: practitioner.profile.shortBio || "",
    alternates: {
      canonical: "/" + locale + "/masters/" + slug,
      languages: {
        en: "/en/masters/" + slug,
        ru: "/ru/masters/" + slug,
        es: "/es/masters/" + slug,
      },
    },
  };
}

export default async function MasterProfile({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale)) notFound();
  const practitioner = await load(locale, slug);
  if (!practitioner) notFound();

  const ru = locale === "ru";
  const es = locale === "es";
  const profile = practitioner.profile;
  const name = profile.displayName || profile.name || (ru ? "Практик" : es ? "Profesional" : "Practitioner");
  const location = [profile.city, profile.region, profile.country].filter(Boolean).join(", ");
  const shortBio = (profile.shortBio || "").trim();
  const fullBio = (profile.fullBio || "").trim();
  const showFullBio = Boolean(fullBio && fullBio !== shortBio);
  const services = [...practitioner.services].sort(
    (a, b) => Number(isFreeService(b)) - Number(isFreeService(a))
  );
  const hasEnergySupport = services.some(
    (service) => service.slug === "remote-energy-support" && service.areaKey === "energy_spiritual"
  );
  const hasVerifiedCredential = practitioner.credentials.some(
    (item) => item.public && item.verificationStatus === "verified" &&
      (!item.expiresOn || item.expiresOn >= new Date().toISOString().slice(0, 10))
  );
  const config = getAppConfig();
  let articles: PublishedArticle[] = [];
  let publishedCourses: PublishedCourse[] = [];
  let sharedAudios: {id:string;title:string;locale:'en'|'ru'|'es'}[] = [];
  // Both repositories return *only* approved public snapshots. No drafts, client data or media URLs.
  const [articleResult, courseResult, audioResult] = await Promise.allSettled([
    createArticleRepository(config).publicByPractitioner(practitioner.slug),
    createPractitionerCourseRepository(config).catalog(),
    createDirectMessages(config).publicAudios(practitioner.slug),
  ]);
  if (articleResult.status === "fulfilled") {
    articles = (articleResult.value as PublishedArticle[])
      .sort((a, b) => Number(b.published.locale === locale) - Number(a.published.locale === locale))
      .slice(0, 30);
  }
  if (courseResult.status === "fulfilled") {
    publishedCourses = (courseResult.value as PublishedCourse[])
      .filter(item => item.practitionerSlug === practitioner.slug &&
        ["en", "ru", "es"].includes(item.course?.locale) && Boolean(item.course?.title))
      .slice(0, 40);
  }
  if (audioResult.status === 'fulfilled') sharedAudios = audioResult.value;
  // Reuse verified original media only for its actual author. Never invent translations or audio files.
  const originalVideos = practitioner.slug === "andy-litvinov"
    ? freeMeditationVideos(ru ? "ru" : es ? "es" : "en").map(item => ({
      title: item.title,
      description: ru ? "Оригинальная русскоязычная видеомедитация" :
        es ? "Vídeo original con audio en inglés" : "Original English-language guided video",
      locale: ru ? "ru" as const : "en" as const,
      url: "https://www.youtube.com/watch?v=" + item.id,
    }))
    : [];
  const seenPublicVideos = new Set<string>();
  const videos = [...(profile.videoMaterials || []), ...originalVideos].filter(item => {
    if (seenPublicVideos.has(item.url)) return false;
    seenPublicVideos.add(item.url);
    return true;
  });

  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.layout}>
        <div className={styles.breadcrumbs}>
          <Link href={"/" + locale + "/masters"}>
            ← {ru ? "Все мастера" : es ? "Todos los profesionales" : "All masters"}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{name}</span>
        </div>
        <section className={styles.hero} aria-labelledby="practitioner-name">
          <div className={styles.identity}>
            {profile.photoPath ? (
              <img className={styles.portrait} src={profile.photoPath} alt={name}
                width={144} height={168} />
            ) : (
              <div className={styles.portraitFallback} aria-hidden="true">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className={styles.identityCopy}>
              <p className={styles.kicker}>
                {ru ? "ПРАКТИК HOLISTIC HOUSE" : es ? "PROFESIONAL HOLISTIC HOUSE" : "HOLISTIC HOUSE PRACTITIONER"}
              </p>
              <h1 id="practitioner-name">{name}</h1>
              {profile.professionalTitle && <p className={styles.professionalTitle}>{profile.professionalTitle}</p>}
              <div className={styles.heroFacts}>
                {location && <span className={styles.location}>⌖ {location}</span>}
                {Boolean(profile.languages?.length) && (
                  <span className={styles.location}>◉ {profile.languages?.join(" · ").toUpperCase()}</span>
                )}
              </div>
              {(practitioner.isPartner || hasVerifiedCredential) && (
                <div className={styles.badges}>
                  {practitioner.isPartner && (
                    <span>{ru ? "Партнёр Holistic House" : es ? "Colaborador Holistic House" : "Holistic House Partner"}</span>
                  )}
                  {hasVerifiedCredential && (
                    <span>{ru ? "Квалификация проверена" : es ? "Formación verificada" : "Credentials verified"}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {(shortBio || fullBio) && <p className={styles.heroBio}>{shortBio || fullBio}</p>}
          <p className={styles.heroHint}>
            {ru ? "Знакомьтесь с подходом, выбирайте услуги и открывайте авторские материалы." :
              es ? "Conoce su enfoque, descubre servicios y explora sus materiales originales." :
                "Explore this practitioner's approach, services and original materials."}
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="#practitioner-services">
              {ru ? "Выбрать услугу" : es ? "Elegir un servicio" : "Choose a service"}
              <span aria-hidden="true">→</span>
            </Link>
            {practitioner.canMessage && (
              <Link className={styles.secondary}
                href={'/' + locale + '/app/messages?to=' + encodeURIComponent(practitioner.slug)}
                prefetch={false}>
                {ru ? 'Написать сообщение' : es ? 'Enviar un mensaje' : 'Send a message'} →
              </Link>
            )}
            {hasEnergySupport && (
              <Link className={styles.secondary}
                href={"/" + locale + "/services/remote-energy-support?practitioner=" + encodeURIComponent(practitioner.slug)}>
                {ru ? "Энергетическая поддержка" : es ? "Apoyo energético" : "Remote energy support"} →
              </Link>
            )}
          </div>
        </section>

        <nav className={styles.sectionNav} aria-label={ru ? "Разделы профиля" : es ? "Secciones del perfil" : "Profile sections"}>
          <a href="#practitioner-services">{ru ? "Услуги" : es ? "Servicios" : "Services"}</a>
          <a href="#practitioner-feed">{ru ? "Лента" : es ? "Publicaciones" : "Feed"}</a>
          <a href="#practitioner-about">{ru ? "О мастере" : es ? "Acerca de" : "About"}</a>
        </nav>

        {profile.videoPresentation && (
          <div className={styles.welcomeVideo}>
            <PractitionerPresentationVideo
              locale={locale}
              video={profile.videoPresentation}
              playbackUrl={publicPresentationUrl(profile.videoPresentation, config.supabaseUrl)}
            />
          </div>
        )}

        {/* Preserve existing bookmarks when the separate media/article sections become one feed. */}
        <span id="practitioner-meditations" className={styles.legacyFeedAnchor} aria-hidden="true" />
        <span id="practitioner-articles" className={styles.legacyFeedAnchor} aria-hidden="true" />
        <PractitionerPublicFeed
          locale={locale as "en" | "ru" | "es"}
          masterSlug={practitioner.slug}
          articles={articles}
          courses={publishedCourses}
          videos={videos}
          audios={sharedAudios}
        />

        <section className={styles.services} id="practitioner-services" aria-labelledby="practitioner-services-heading">
          <header className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>{ru ? "УСЛУГИ" : es ? "SERVICIOS" : "SERVICES"}</p>
              <h2 id="practitioner-services-heading">
                {ru ? "Мои услуги" : es ? "Mis servicios" : "My services"}
              </h2>
            </div>
            <span className={styles.count}>
              {services.length} {ru ? "услуг" : es ? "opciones" : services.length === 1 ? "service" : "services"}
            </span>
          </header>
          {services.length ? (
            <PractitionerServicesGrid services={services} locale={locale} />
          ) : (
            <p className={styles.emptyServices}>
              {ru ? "Сейчас нет опубликованных услуг." : es ? "Todavía no hay servicios publicados." : "No published services are available yet."}
            </p>
          )}
        </section>


        <section id="practitioner-about" className={styles.about} aria-labelledby="practitioner-about-heading">
          <div>
            <p className={styles.kicker}>{ru ? "ПОДХОД" : es ? "ENFOQUE" : "APPROACH"}</p>
            <h2 id="practitioner-about-heading">{ru ? "О специалисте" : es ? "Sobre mí" : "About"}</h2>
          </div>
          <div className={styles.aboutContent}>
            {profile.methods && profile.methods.length > 0 && (
              <div>
                <h3>{ru ? "Методы" : es ? "Métodos" : "Methods"}</h3>
                <ul className={styles.tags}>
                  {profile.methods.map((method) => <li key={method}>{method}</li>)}
                </ul>
              </div>
            )}
            {profile.languages && profile.languages.length > 0 && (
              <p className={styles.languages}>
                <strong>{ru ? "Языки:" : es ? "Idiomas:" : "Languages:"}</strong>{" "}
                {profile.languages.join(" · ").toUpperCase()}
              </p>
            )}
            {showFullBio && (
              <details className={styles.disclosure}>
                <summary>{ru ? "Подробнее о моём подходе" : es ? "Más sobre mi enfoque" : "More about my approach"} <span aria-hidden="true">⌄</span></summary>
                <p>{fullBio}</p>
              </details>
            )}
            {es && <p className={styles.note}>La biografía facilitada por el profesional puede aparecer en su idioma original.</p>}
          </div>
        </section>

        {practitioner.credentials.length > 0 && (
          <details className={styles.credentials}>
            <summary>
              {ru ? "Квалификации и обучение" : es ? "Formación y credenciales" : "Credentials & training"}
              <span aria-hidden="true">⌄</span>
            </summary>
            <div className={styles.credentialsGrid}>
              {practitioner.credentials.map((item) => (
                <article key={item.id}>
                  <h3>{item.title}</h3>
                  <p>{[item.issuer, item.jurisdiction, item.reference].filter(Boolean).join(" · ")}</p>
                  <small>
                    {item.verificationStatus === "verified"
                      ? ru ? "Проверено Holistic House" : es ? "Verificado por Holistic House" : "Verified by Holistic House"
                      : ru ? "Заявлено практиком" : es ? "Declarado por el profesional" : "Declared by practitioner"}
                  </small>
                </article>
              ))}
            </div>
          </details>
        )}

        <section className={styles.finalCta}>
          <div>
            <p className={styles.kicker}>{ru ? "СДЕЛАЙТЕ ПЕРВЫЙ ШАГ" : es ? "DA EL PRIMER PASO" : "YOUR NEXT STEP"}</p>
            <h2>{ru ? "Хотите поработать вместе?" : es ? "¿Trabajamos juntos?" : "Ready to explore working together?"}</h2>
            <p>{ru ? "Посмотрите опубликованные услуги и отправьте запрос мастеру." :
              es ? "Explora los servicios disponibles y envía una solicitud al profesional." :
                "Choose a published service and send a request to this practitioner."}</p>
          </div>
          <Link className={styles.primary} href="#practitioner-services">
            {ru ? "Посмотреть услуги" : es ? "Ver servicios" : "Explore services"} <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
