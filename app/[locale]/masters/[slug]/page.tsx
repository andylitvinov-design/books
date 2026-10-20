import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createArticleRepository } from "@/lib/practitioners/article-repository";
import type { PublicPractitioner, PublicService } from "@/lib/practitioners/public-types";
import { PractitionerServicesGrid } from "@/components/master-network-explorer";
import PractitionerPresentationVideo from "@/components/practitioner-presentation-video";
import PractitionerVideoGallery from "@/components/practitioner-video-gallery";
import { publicPresentationUrl } from "@/lib/practitioners/presentation-contract";
import styles from "./profile.module.css";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

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
  let articles: { id: string; slug: string; published: { title: string; excerpt: string; locale: string } }[] = [];
  try {
    articles = await createArticleRepository(getAppConfig()).publicByPractitioner(practitioner.slug);
  } catch {
    // The profile remains useful when article listing is unavailable.
  }

  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.layout}>
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
              {location && <p className={styles.location}>{location}</p>}
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
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="#practitioner-services">
              {ru ? "Выбрать услугу" : es ? "Elegir un servicio" : "Choose a service"}
              <span aria-hidden="true">→</span>
            </Link>
            {hasEnergySupport && (
              <Link className={styles.secondary}
                href={"/" + locale + "/services/remote-energy-support?practitioner=" + encodeURIComponent(practitioner.slug)}>
                {ru ? "Энергетическая поддержка" : es ? "Apoyo energético" : "Remote energy support"} →
              </Link>
            )}
          </div>
        </section>

        <section className={styles.services} id="practitioner-services" aria-labelledby="practitioner-services-heading">
          <header className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>{ru ? "УСЛУГИ" : es ? "SERVICIOS" : "SERVICES"}</p>
              <h2 id="practitioner-services-heading">
                {ru ? "Выберите формат" : es ? "Elige tu sesión" : "Choose your session"}
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

        <section className={styles.about} aria-labelledby="practitioner-about-heading">
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

        {profile.videoPresentation && (
          <PractitionerPresentationVideo
            locale={locale}
            video={profile.videoPresentation}
            playbackUrl={publicPresentationUrl(profile.videoPresentation, getAppConfig().supabaseUrl)}
          />
        )}

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

        {Boolean(profile.videoMaterials?.length) && (
          <PractitionerVideoGallery videos={profile.videoMaterials || []} locale={locale} />
        )}
        {articles.length > 0 && (
          <section id="practitioner-articles" className={styles.articles}>
            <h2>{ru ? "Статьи автора" : es ? "Artículos" : "Articles by this practitioner"}</h2>
            <div className={styles.articleGrid}>
              {articles.map((article) => (
                <article key={article.id}>
                  <small>{article.published.locale.toUpperCase()}</small>
                  <h3>{article.published.title}</h3>
                  <p>{article.published.excerpt}</p>
                  <Link href={"/" + article.published.locale + "/articles/" + article.slug}>
                    {ru ? "Читать" : es ? "Leer" : "Read"} →
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
