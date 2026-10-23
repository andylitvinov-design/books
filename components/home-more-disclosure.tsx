"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { PublicLocale } from "@/lib/public-locales";

// The owner-approved hidden section is useful on demand, but its service cards,
// filters and image trees must not inflate the initial HTML/React Flight stream.
// Import the existing modules only when a visitor opens the native disclosure.
const ServicesSolutions = dynamic(
  () => import("./services-solutions").then(mod => mod.ServicesSolutions),
  { ssr: false },
);
const HomepageTopicJourneys = dynamic(
  () => import("./homepage-topic-journeys").then(mod => mod.HomepageTopicJourneys),
  { ssr: false },
);
const TestSelectionCourseBanner = dynamic(
  () => import("./sitewide-antistress-banner").then(mod => mod.TestSelectionCourseBanner),
  { ssr: false },
);
const HomeExploreSections = dynamic(
  () => import("./home-explore-sections").then(mod => mod.HomeExploreSections),
  { ssr: false },
);

export function HomeMoreDisclosure({
  locale, children,
}: { locale: PublicLocale; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const label = locale === "ru" ? "Все направления и услуги"
    : locale === "es" ? "Todos los programas y servicios"
      : "All programmes and services";

  return (
    <details className="service-home-more" id="more-directions"
      data-home-more-deferred="true"
      onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>{label} <span aria-hidden="true">↓</span></summary>
      {children}
      {expanded ? (locale === "es"
        ? <HomeExploreSections locale="es" />
        : <>
            <ServicesSolutions locale={locale} variant="home" />
            <HomepageTopicJourneys locale={locale} />
            <TestSelectionCourseBanner locale={locale} />
            <HomeExploreSections locale={locale} />
          </>
      ) : null}
      <noscript>
        <nav aria-label={label}>
          <Link href={"/" + locale + "/services"}>{locale === "ru" ? "Все услуги" : locale === "es" ? "Todos los servicios" : "All services"}</Link>
          {" · "}
          <Link href={"/" + locale + "/client/tests"}>{locale === "ru" ? "Бесплатные тесты" : locale === "es" ? "Pruebas gratis" : "Free tests"}</Link>
          {" · "}
          <Link href={"/" + locale + "/academy"}>{locale === "ru" ? "Курсы" : locale === "es" ? "Cursos" : "Courses"}</Link>
        </nav>
      </noscript>
    </details>
  );
}
