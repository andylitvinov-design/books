import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { ServicesSmartDiscovery } from "@/components/services-smart-discovery";
import { MarketplaceServiceFinder } from "@/components/master-network-explorer";
import { coreServiceOffers } from "@/data/core-service-offers";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicService } from "@/lib/practitioners/public-types";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-directory-page.module.css";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · EXTENDED SERVICE DIRECTORY",
    title: "Find the right support",
    lead: "Browse by topic, format or budget. This optional directory includes additional practitioners and services.",
    personal: "Back to Andrey's personal services",
    listTitle: "Available practitioner services",
    listLead: "Open a service to check the scope and send a request. Availability is confirmed with the practitioner.",
    empty: "Approved practitioner services will appear here.",
    all: "Meet all practitioners",
    constellation: "Personal constellation session",
    constellationAbout: "Explore a relationship, life or work question using symbolic mapping.",
    remote: "Remote energy support",
    remoteAbout: "Choose a practitioner, method, format and preferred time.",
    support: "Personal session",
    remoteLabel: "Remote Reiki session",
    detailed: "Service details and conditions are confirmed before booking.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ПОЛНЫЙ КАТАЛОГ УСЛУГ",
    title: "Подберите поддержку под свой запрос",
    lead: "Дополнительный каталог с выбором темы, формата и бюджета. Здесь представлены также услуги других мастеров.",
    personal: "Вернуться к личным услугам Андрея",
    listTitle: "Услуги мастеров",
    listLead: "Откройте описание и отправьте запрос мастеру. Доступное время подтверждается лично.",
    empty: "Одобренные предложения мастеров появятся здесь.",
    all: "Все мастера",
    constellation: "Индивидуальная расстановка",
    constellationAbout: "Исследуйте отношения, рабочий или жизненный вопрос через символическую карту.",
    remote: "Дистанционная энергетическая поддержка",
    remoteAbout: "Выберите мастера, метод, формат и удобное время.",
    support: "Личная сессия",
    remoteLabel: "Дистанционный сеанс Рейки",
    detailed: "Детали и условия услуги уточняются до записи.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · DIRECTORIO COMPLETO",
    title: "Encuentra el apoyo adecuado",
    lead: "Explora por tema, modalidad y presupuesto, incluidos otros profesionales y servicios.",
    personal: "Volver a los servicios personales de Andrey",
    listTitle: "Servicios profesionales disponibles",
    listLead: "Abre los detalles y envía una solicitud. El profesional confirmará la disponibilidad.",
    empty: "Próximamente habrá más servicios aprobados.",
    all: "Conocer a los profesionales",
    constellation: "Constelación personal",
    constellationAbout: "Explora relaciones, trabajo o una decisión mediante mapas simbólicos.",
    remote: "Apoyo energético a distancia",
    remoteAbout: "Elige profesional, método, modalidad y horario preferido.",
    support: "Sesión individual",
    remoteLabel: "Reiki a distancia",
    detailed: "Los detalles y condiciones se confirman antes de reservar.",
  },
} as const;

const area: Record<string, string> = {
  situation: "emotional_psychological",
  dao: "homeopathy_holistic",
  alchemy: "relationships",
  hypnotherapy: "personal_development",
  business: "business_money",
};

export async function ServicesDirectoryPage({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  let services: PublicService[] = [];
  try {
    services = await createPractitionerRepository(getAppConfig()).listPublicServices(locale);
  } catch {
    services = [];
  }
  const editorialOffers = [
    ...coreServiceOffers(locale).map((offer) => ({
      id: offer.id,
      title: offer.title,
      promise: offer.promise,
      benefit: offer.benefit,
      details: offer.benefit,
      image: offer.image,
      href: offer.href,
      areaKey: area[offer.id],
      label: offer.label,
      price: offer.id === "situation" || offer.id === "dao" ? undefined : "€50 / 30 min · €100 / 60 min",
      free: offer.id === "situation" || offer.id === "dao",
    })),
    {
      id: "constellations", title: t.constellation, promise: t.constellationAbout,
      details: t.detailed, image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      href: "/" + locale + "/services/systemic-constellations", areaKey: "relationships",
      label: t.support, price: "€50 / 30 min · €100 / 60 min", free: false,
    },
    {
      id: "remote-energy-support", title: t.remote, promise: t.remoteAbout,
      details: t.detailed, image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
      href: "/" + locale + "/services/remote-energy-support", areaKey: "energy_spiritual",
      label: t.remoteLabel, price: undefined, free: false,
    },
  ];
  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <header className={styles.header}>
        <Link href={"/" + locale + "/services"} className={styles.back} prefetch={false}>
          <ArrowLeft size={17} aria-hidden="true" />{t.personal}
        </Link>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </header>
      <ServicesSmartDiscovery locale={locale} services={services} editorialOffers={editorialOffers}
        aiAvailable={process.env.HH_MARKETPLACE_AI_ENABLED === "true"
          && Boolean(process.env.OPENROUTER_API_KEY) && Boolean(process.env.HH_MARKETPLACE_AI_MODEL)} />
      <section className={styles.marketplace} id="service-listings" aria-labelledby="services-directory-list-title">
        <h2 id="services-directory-list-title">{t.listTitle}</h2>
        <p>{t.listLead}</p>
        {services.length ? <MarketplaceServiceFinder services={services} locale={locale} /> : <p>{t.empty}</p>}
        <Link href={"/" + locale + "/masters"} className={styles.all} prefetch={false}>
          {t.all}<ArrowRight size={17} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
