import Link from "next/link";
import { headers } from "next/headers";

const copy = {
  en: {
    heading: "Page not found",
    description: "This Holistic House page is unavailable. Explore the home page, our services or the remedy reference library.",
    intro: "The link may have changed. You can continue exploring the site:",
    home: "Home", services: "Services", remedies: "Remedy library", language: "Choose language", test: "Take a free self-test", review: "Free personal analysis",
  },
  ru: {
    heading: "Страница не найдена",
    description: "Страница Holistic House недоступна. Вернитесь на главную, откройте услуги или справочник препаратов.",
    intro: "Возможно, ссылка изменилась. Продолжите знакомство с сайтом:",
    home: "Главная", services: "Услуги", remedies: "Справочник препаратов", language: "Выбрать язык", test: "Пройти бесплатный тест", review: "Бесплатный анализ ситуации",
  },
  es: {
    heading: "Página no encontrada",
    description: "Esta página de Holistic House no está disponible. Vuelve al inicio o explora los servicios y el catálogo de remedios.",
    intro: "Es posible que el enlace haya cambiado. Sigue explorando el sitio:",
    home: "Inicio", services: "Servicios", remedies: "Catálogo de remedios", language: "Elegir idioma", test: "Hacer un test gratuito", review: "Análisis personal gratuito",
  },
} as const;

export default async function NotFound() {
  const selected = (await headers()).get("x-public-page-locale");
  const locale = selected === "ru" || selected === "es" ? selected : "en";
  const c = copy[locale];
  const homePath = locale === "en" ? "/" : `/${locale}`;
  return (
    <main className="homeopathy-shell" lang={locale} style={{ margin: "clamp(3rem, 9vw, 8rem) auto", maxWidth: 800, padding: "0 1.25rem" }}>
      <title>{`404 — ${c.heading} | Holistic House`}</title>
      <meta name="description" content={c.description} />
      <p className="homeopathy-kicker">404 · Holistic House</p>
      <h1>{c.heading}</h1>
      <p>{c.intro}</p>
      <nav aria-label={c.heading} style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "2rem" }}>
        <Link href={homePath}>{c.home}</Link>
        <Link href={`/${locale}/services`}>{c.services}</Link>
        <Link href={`/${locale}/homeopathy/remedies`}>{c.remedies}</Link>
        <Link href={`/${locale}/client/tests`}>{c.test}</Link>
        <Link href={`/${locale}/services/free-situation-review`}>{c.review}</Link>
      </nav>
      <p style={{ marginTop: "2.5rem" }}>{c.language}</p>
      <nav aria-label={c.language} style={{ display: "flex", gap: "1.25rem" }}>
        <Link href="/" lang="en">English</Link>
        <Link href="/ru" lang="ru">Русский</Link>
        <Link href="/es" lang="es">Español</Link>
      </nav>
    </main>
  );
}
