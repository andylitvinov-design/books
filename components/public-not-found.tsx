import Link from "next/link";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";

const copy = {
  en: { title: "Page not found", description: "This page is no longer available or its address has changed. Choose where to go next.", home: "Home", services: "Services", remedies: "Remedy directory", languages: "Choose language" },
  ru: { title: "Страница не найдена", description: "Эта страница недоступна или её адрес изменился. Выберите, куда перейти дальше.", home: "Главная", services: "Услуги", remedies: "Каталог препаратов", languages: "Выбрать язык" },
  es: { title: "Página no encontrada", description: "Esta página ya no está disponible o su dirección ha cambiado. Elige adónde quieres ir.", home: "Inicio", services: "Servicios", remedies: "Catálogo de remedios", languages: "Elegir idioma" },
} as const;

export function PublicNotFound({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  return <main className="homeopathy-shell remedies-landing" lang={locale}>
    <PublicSiteHeader locale={locale} />
    <section className="remedies-hero" aria-labelledby="missing-page-title">
      <p className="homeopathy-kicker">404 — Holistic House</p>
      <h1 id="missing-page-title">{text.title}</h1>
      <p>{text.description}</p>
      <nav aria-label={text.title} className="service-home-actions">
        <Link className="service-home-button service-home-button--primary" href={locale === "en" ? "/" : `/${locale}`}>{text.home} →</Link>
        <Link className="service-home-button service-home-button--secondary" href={`/${locale}/services`}>{text.services} →</Link>
        <Link className="service-home-button service-home-button--secondary" href={`/${locale}/homeopathy/remedies`}>{text.remedies} →</Link>
      </nav>
      <p>{text.languages}:</p>
      <nav aria-label={text.languages} className="service-home-actions">
        <Link href="/">English</Link>
        <Link href="/ru">Русский</Link>
        <Link href="/es">Español</Link>
      </nav>
    </section>
  </main>;
}
