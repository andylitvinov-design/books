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
const TestSelectionCourseBanner = dynamic(
  () => import("./sitewide-antistress-banner").then(mod => mod.TestSelectionCourseBanner),
  { ssr: false },
);
const HomeExploreSections = dynamic(
  () => import("./home-explore-sections").then(mod => mod.HomeExploreSections),
  { ssr: false },
);
// Supporting formats remain reachable without loading or repeating them on the main journey.
const HomeFreeDiagnosisBanner = dynamic(
  () => import("./home-free-diagnosis-banner").then(mod => mod.HomeFreeDiagnosisBanner),
  { ssr: false },
);
const HomeConversationGuide = dynamic(
  () => import("./home-conversation-guide").then(mod => mod.HomeConversationGuide),
  { ssr: false },
);
const HomePersonalSpaceCard = dynamic(
  () => import("./home-personal-space").then(mod => mod.HomePersonalSpaceCard),
  { ssr: false },
);
const HomepageTopicJourneys = dynamic(
  () => import("./homepage-topic-journeys").then(mod => mod.HomepageTopicJourneys),
  { ssr: false },
);

export function HomeMoreDisclosure({
  locale, children,
}: { locale: PublicLocale; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const label = locale === "ru" ? "Дополнительные инструменты и услуги"
    : locale === "es" ? "Más herramientas y servicios"
      : "More tools and services";

  return (
    <details className="service-home-more" id="more-directions"
      data-home-more-deferred="true"
      onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>{label} <span aria-hidden="true">↓</span></summary>
      {expanded && (
        <>
          <HomeFreeDiagnosisBanner locale={locale} />
          <HomeConversationGuide locale={locale} />
          <HomePersonalSpaceCard locale={locale} />
          <HomepageTopicJourneys locale={locale} />
        </>
      )}
      {children}
      {expanded ? (locale === "es"
        ? <HomeExploreSections locale="es" />
        : <>
            <ServicesSolutions locale={locale} variant="home" />
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
