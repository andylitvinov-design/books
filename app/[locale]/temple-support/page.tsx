import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IdeasDiscovery } from "@/components/ideas-discovery";
import { MarketplaceMasterFinder } from "@/components/master-network-explorer";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import styles from "./temple-support.module.css";

type Props = { params: Promise<{ locale: string }> };
type Language = "en" | "ru" | "es";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · PERSONAL GUIDANCE",
    title: "Temple Support",
    lead: "Find a symbolic insight, explore an energy practice or choose a practitioner. Start with the kind of support that feels right for you.",
    insight: "Temple Insights", energy: "Energy Support", practitioners: "Find a Practitioner",
    symbols: "Explore all 64 I Ching symbols",
    energyEyebrow: "COMPLEMENTARY PRACTICES",
    energyTitle: "Choose your energy support",
    energyIntro: "Explore the published formats first. Your practitioner confirms their availability, duration and price before any booking or payment.",
    remoteTitle: "Remote energy support", remoteBody: "Choose your practitioner, practice and preferred time for support at a distance or a live online session.",
    remoteAction: "Choose support & request",
    reikiTitle: "Learn before you choose", reikiBody: "Explore the free introductory Reiki course and reflect on the practice at your own pace.",
    reikiAction: "Explore free Reiki course",
    practitionerEyebrow: "REAL PROFILES · REAL REQUESTS",
    practitionerTitle: "Find a Temple Support practitioner",
    practitionerIntro: "Browse published professionals who offer energy or spiritual practices. Open their profiles to review services before requesting help.",
    allPractitioners: "Explore all practitioners",
    disclaimer: "I Ching insights are symbolic reflection, not a prediction. Energy practices are complementary wellbeing activities, not healthcare or emergency care. A request does not confirm a booking or payment.",
    privacy: "Your free symbolic question stays in this browser. Personal details enter CRM only through an explicitly consented request.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ЛИЧНАЯ ПОДДЕРЖКА",
    title: "Temple Support",
    lead: "Получите символическую подсказку, выберите энергетическую практику или найдите подходящего мастера. Начните с того, что вам сейчас ближе.",
    insight: "Храмовые подсказки", energy: "Энергоподдержка", practitioners: "Выбрать мастера",
    symbols: "Посмотреть все 64 символа И-Цзин",
    energyEyebrow: "ДОПОЛНИТЕЛЬНЫЕ ПРАКТИКИ",
    energyTitle: "Выберите энергетическую поддержку",
    energyIntro: "Сначала познакомьтесь с доступными форматами. Мастер отдельно подтвердит время, длительность и стоимость до записи и оплаты.",
    remoteTitle: "Дистанционная энергетическая поддержка", remoteBody: "Выберите мастера, метод и удобное время для дистанционной практики или живого онлайн-сеанса.",
    remoteAction: "Выбрать практику и отправить запрос",
    reikiTitle: "Познакомиться с практикой", reikiBody: "Исследуйте бесплатный вводный курс Рейки и решите, подходит ли вам этот путь.",
    reikiAction: "Открыть бесплатный курс Рейки",
    practitionerEyebrow: "ПУБЛИЧНЫЕ ПРОФИЛИ · РЕАЛЬНЫЕ ЗАЯВКИ",
    practitionerTitle: "Найдите своего мастера",
    practitionerIntro: "Здесь отображаются опубликованные профили специалистов по энергетическим и духовным практикам. Сначала посмотрите услуги и опыт.",
    allPractitioners: "Все специалисты",
    disclaimer: "И-Цзин — символическое размышление, а не предсказание. Энергопрактики не являются лечением или экстренной помощью. Заявка не равна подтверждённой записи или оплате.",
    privacy: "Вопрос для бесплатной подсказки остаётся в браузере. Контакт попадает в CRM только после согласованной отправки заявки.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ACOMPAÑAMIENTO PERSONAL",
    title: "Temple Support",
    lead: "Recibe una reflexión simbólica, descubre una práctica energética o elige un profesional. Empieza por lo que te resulte más útil.",
    insight: "Reflexiones del templo", energy: "Apoyo energético", practitioners: "Elegir profesional",
    symbols: "Explorar los 64 símbolos del I Ching",
    energyEyebrow: "PRÁCTICAS COMPLEMENTARIAS",
    energyTitle: "Elige tu apoyo energético",
    energyIntro: "Conoce las opciones publicadas. El profesional confirmará disponibilidad, duración y precio antes de cualquier reserva o pago.",
    remoteTitle: "Apoyo energético a distancia", remoteBody: "Elige profesional, práctica y horario preferido para apoyo a distancia o sesión online en vivo.",
    remoteAction: "Elegir apoyo y solicitar",
    reikiTitle: "Conoce la práctica", reikiBody: "Descubre el curso gratuito de introducción a Reiki y avanza a tu propio ritmo.",
    reikiAction: "Explorar curso gratuito",
    practitionerEyebrow: "PERFILES PUBLICADOS · SOLICITUDES REALES",
    practitionerTitle: "Encuentra tu profesional",
    practitionerIntro: "Consulta perfiles publicados de profesionales con servicios energéticos o espirituales. Revisa sus ofertas antes de solicitar apoyo.",
    allPractitioners: "Todos los profesionales",
    disclaimer: "El I Ching sirve para reflexionar, no para predecir. Las prácticas energéticas son complementarias, no atención médica ni de urgencias. Una solicitud no confirma reserva ni pago.",
    privacy: "Tu pregunta simbólica gratuita se queda en este navegador. Los datos de contacto llegan al CRM solo después del consentimiento y envío de una solicitud.",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const t = copy[locale as Language];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " · " + t.insight + " | Holistic House",
    description: t.lead,
    alternates: {
      canonical: "/" + locale + "/temple-support",
      languages: {
        en: "/en/temple-support",
        ru: "/ru/temple-support",
        es: "/es/temple-support",
        "x-default": "/en/temple-support",
      },
    },
  };
}

export default async function TempleSupportPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const language = locale as Language;
  const t = copy[language];
  let practitioners: PublicPractitioner[] = [];
  try {
    practitioners = await createPractitionerRepository(getAppConfig()).listPublicPractitioners(language);
  } catch {
    // Keep the insight engine and the existing energy-request journey available.
  }
  const templePractitioners = practitioners.filter(practitioner =>
    (practitioner.services || []).some(service => service.areaKey === "energy_spiritual" && service.status === "published")
  );

  return (
    <main className={styles.page} data-temple-support lang={language}>
      <PublicSiteHeader locale={language} />
      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="temple-support-title">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="temple-support-title">{t.title}</h1>
            <p>{t.lead}</p>
          </div>
          <div className={styles.heroPhoto}>
            <Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill priority sizes="(max-width:760px) 35vw, 330px" />
          </div>
        </section>

        <nav className={styles.quickNav} aria-label={t.title} data-temple-quick-nav>
          <a href="#insights"><span aria-hidden="true">☯</span>{t.insight}</a>
          <a href="#energy"><span aria-hidden="true">✦</span>{t.energy}</a>
          <a href="#practitioners"><span aria-hidden="true">♧</span>{t.practitioners}</a>
        </nav>

        <section id="insights" className={styles.insights} data-temple-insights>
          <IdeasDiscovery locale={language} variant="temple" />
          <Link className={styles.libraryLink} href={"/" + language + "/dao/hexagrams"} prefetch={false}>
            {t.symbols} <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section id="energy" className={styles.section} aria-labelledby="temple-energy-title" data-temple-energy>
          <p className={styles.sectionEyebrow}>{t.energyEyebrow}</p>
          <h2 id="temple-energy-title">{t.energyTitle}</h2>
          <p className={styles.sectionIntro}>{t.energyIntro}</p>
          <div className={styles.offers}>
            <article className={styles.offer}>
              <div className={styles.offerImage}><Image src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width:760px) 115px, 180px" /></div>
              <div className={styles.offerContent}>
                <h3>{t.remoteTitle}</h3>
                <p>{t.remoteBody}</p>
                <Link className={styles.primaryAction} href={"/" + language + "/services/remote-energy-support"} prefetch={false}>
                  {t.remoteAction} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
            <article className={styles.offer}>
              <div className={styles.offerImage}><Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill sizes="(max-width:760px) 115px, 180px" /></div>
              <div className={styles.offerContent}>
                <h3>{t.reikiTitle}</h3>
                <p>{t.reikiBody}</p>
                <Link className={styles.secondaryAction} href={"/" + language + "/academy/principles-of-energywork/learn"} prefetch={false}>
                  {t.reikiAction} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section id="practitioners" className={styles.section} aria-labelledby="temple-practitioners-title" data-temple-practitioners>
          <p className={styles.sectionEyebrow}>{t.practitionerEyebrow}</p>
          <h2 id="temple-practitioners-title">{t.practitionerTitle}</h2>
          <p className={styles.sectionIntro}>{t.practitionerIntro}</p>
          <MarketplaceMasterFinder practitioners={templePractitioners} locale={language} />
          <Link className={styles.libraryLink} href={"/" + language + "/masters"} prefetch={false}>
            {t.allPractitioners} <span aria-hidden="true">→</span>
          </Link>
        </section>
        <footer className={styles.privacy} data-temple-disclaimer>
          <p>{t.disclaimer}</p>
          <p>{t.privacy}</p>
        </footer>
      </div>
    </main>
  );
}
