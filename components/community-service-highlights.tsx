import Link from "next/link";
import type { PublicService } from "@/lib/practitioners/public-types";
import { getPublicServiceDetailHref } from "@/lib/practitioners/public-service-links.js";
import styles from "./community-service-highlights.module.css";

type Locale = "en" | "ru" | "es";
const COPY = {
  en: { title: "Explore our published services", description: "Discover the real offers of approved practitioners.", count: "services", single: "service", by: "With", free: "Free", ask: "Price on request", from: "From", details: "Service details", full: "All services", note: "Articles are awaiting review. Meanwhile, these services are already published." },
  ru: { title: "Опубликованные услуги", description: "Подберите практику среди услуг одобренных мастеров.", count: "услуг", single: "услуга", by: "Мастер", free: "Бесплатно", ask: "Цена по запросу", from: "От", details: "Подробнее", full: "Все услуги", note: "Статьи ещё проходят проверку, но эти услуги уже опубликованы." },
  es: { title: "Servicios publicados", description: "Encuentra los servicios reales de profesionales aprobados.", count: "servicios", single: "servicio", by: "Con", free: "Gratis", ask: "Precio a consultar", from: "Desde", details: "Ver servicio", full: "Todos los servicios", note: "Los artículos siguen en revisión. Estos servicios ya están publicados." },
} as const;

function price(service: PublicService, locale: Locale) {
  const t = COPY[locale];
  if (service.pricingMode === "free" || (service.pricingMode !== "contact" && service.confirmedPrice === 0)) return t.free;
  if (service.pricingMode === "contact" || service.confirmedPrice == null) return t.ask;
  const amount = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA", {
    style: "currency", currency: service.currency || "CAD", maximumFractionDigits: 2,
  }).format(service.confirmedPrice);
  return service.pricingMode === "from" ? t.from + " " + amount : amount;
}

export function CommunityServiceHighlights({
  locale, services, articlesAvailable = true,
}: { locale: string; services: PublicService[]; articlesAvailable?: boolean }) {
  const language: Locale = locale === "ru" || locale === "es" ? locale : "en";
  const t = COPY[language];
  // The repository supplies approved public snapshots. Never expose draft_copy.
  const published = services.filter((service) => service.active && Boolean(service.copy?.title));
  if (!published.length) return null;
  return (
    <section className={styles.section} aria-label={t.title} data-community-published-services>
      <header className={styles.head}>
        <div><p className={styles.eyebrow}>HOLISTIC HOUSE · SERVICES</p>
          <h2>{t.title}</h2><p className={styles.intro}>{t.description}</p></div>
        <span className={styles.count}>{published.length} {published.length === 1 ? t.single : t.count}</span>
      </header>
      {!articlesAvailable && <p className={styles.note}>{t.note}</p>}
      <div className={styles.grid} role="list">
        {published.map((service) => {
          const href = getPublicServiceDetailHref(locale, service.practitionerSlug, service.slug);
          const cover = service.photos?.[0] || service.imagePath || service.practitionerPhoto;
          return (
            <div key={service.id} role="listitem" className={styles.card} data-community-service>
              <Link href={href} className={styles.cover} tabIndex={-1} aria-hidden="true">
                {cover ? <img src={cover} loading="lazy" alt="" /> : <span aria-hidden="true">✦</span>}
              </Link>
              <div className={styles.body}>
                <p className={styles.byline}>{t.by} {service.practitionerName} <span>{price(service, language)}</span></p>
                <h3><Link href={href}>{service.copy.title}</Link></h3>
                {(service.copy.shortDescription || service.copy.description) && <p className={styles.excerpt}>{service.copy.shortDescription || service.copy.description}</p>}
                <Link href={href} className={styles.action}>{t.details} <span aria-hidden="true">→</span></Link>
              </div>
            </div>
          );
        })}
      </div>
      <Link className={styles.all} href={"/" + locale + "/services/catalog"}>{t.full} →</Link>
    </section>
  );
}
