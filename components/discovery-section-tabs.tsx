import Link from "next/link";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./discovery-section-tabs.module.css";

export type DiscoverySection = "tests" | "services" | "events" | "courses";

const sectionIds: readonly DiscoverySection[] = ["tests", "services", "events", "courses"];

const text = {
  en: { tests: "Tests", services: "Services", events: "Events", courses: "Courses", label: "Explore Holistic House" },
  ru: { tests: "Тесты", services: "Услуги", events: "События", courses: "Курсы", label: "Разделы Holistic House" },
  es: { tests: "Pruebas", services: "Servicios", events: "Eventos", courses: "Cursos", label: "Explorar Holistic House" },
} as const;

export function discoverySectionHref(locale: PublicLocale, section: DiscoverySection): string {
  if (section === "tests") return "/" + locale + "/client/tests";
  if (section === "services") return "/" + locale + "/services";
  if (section === "events") return "/" + locale + "/events";
  return "/" + locale + "/academy/free-ai-courses";
}

/** Shared entry point used by the public Tests, Services, Events and Academy finders. */
export function DiscoverySectionTabs({ locale, active }: {
  locale: PublicLocale;
  active: DiscoverySection;
}) {
  const t = text[locale];
  return (
    <nav className={styles.tabs} aria-label={t.label} data-discovery-section-tabs>
      {sectionIds.map(section => (
        <Link
          key={section}
          data-discovery-tab={section}
          href={discoverySectionHref(locale, section)}
          prefetch={false}
          aria-current={section === active ? "page" : undefined}
        >
          {t[section]}
        </Link>
      ))}
    </nav>
  );
}
