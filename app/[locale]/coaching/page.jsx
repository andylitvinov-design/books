import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Ellipsis, Heart, Headset, House, Clapperboard, Leaf, UserRound } from "lucide-react";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createServiceReviewRepository } from "@/lib/practitioners/reviews";
import { createPractitionerCourseRepository } from "@/lib/practitioners/course-repository";
import { MarketplaceMasterFinder } from "@/components/master-network-explorer";
import styles from "./page.module.css";

const meta = {
  en: { title: "My Coach · Find your personal coach | Holistic House", description: "Find a verified public Holistic House practitioner by topic, language, method and session format." },
  ru: { title: "My Coach · Подберите личного коуча | Holistic House", description: "Подберите специалиста по теме, методу, языку и формату. Профили и отзывы показываются только из опубликованного каталога." },
  es: { title: "Mi coach · Encuentra tu coach personal | Holistic House", description: "Encuentra un profesional por tema, método, idioma y modalidad de sesión." },
};

export function generateStaticParams() {
  return ["en", "ru", "es"].map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    ...meta[locale],
    alternates: {
      canonical: `/${locale}/coaching`,
      languages: { en: "/en/coaching", ru: "/ru/coaching", es: "/es/coaching", "x-default": "/en/coaching" },
    },
  };
}

function copy(locale) {
  return ({
    ru: {
      title: "My Coach",
      subtitle: "Выбери своего коуча для личной сессии, поддержки и развития",
      chips: ["Энергия и ресурс", "Отношения и любовь", "Стресс и баланс", "Развитие и смысл"],
      directory: "Подберите своего коуча",
      intro: "Сравните реальные профили, подходы, языки и опубликованные отзывы.",
      unavailable: "Каталог специалистов временно недоступен. Попробуйте позже или откройте все профили.",
      empty: "Пока нет опубликованных профилей. Мы добавим специалистов после проверки их анкет.",
      all: "Все специалисты",
      practices: "Самостоятельные практики",
      practicesText: "Бесплатные коучинг-сессии и методики, которые можно пройти самостоятельно.",
      practicesAction: "Выбрать практику",
      menu: "Разделы",
      close: "Главная",
      find: "Коучи",
      practice: "Практики",
      video: "Видео",
      profile: "Профиль",
      openAll: "Все специалисты",
    },
    en: {
      title: "My Coach",
      subtitle: "Choose a coach for personal sessions, support and growth",
      chips: ["Energy & vitality", "Love & relationships", "Stress & balance", "Growth & meaning"],
      directory: "Find your coach",
      intro: "Explore real public profiles, approaches, languages and published reviews.",
      unavailable: "The coach directory is temporarily unavailable. Please try again later.",
      empty: "There are no published public profiles yet. New practitioners appear after profile review.",
      all: "All practitioners",
      practices: "Self-guided practices",
      practicesText: "Free coaching sessions and methods you can explore independently.",
      practicesAction: "Explore practices",
      menu: "Sections",
      close: "Home",
      find: "Coaches",
      practice: "Practices",
      video: "Video",
      profile: "Profile",
      openAll: "All practitioners",
    },
    es: {
      title: "Mi coach",
      subtitle: "Elige un coach para tus sesiones, apoyo y crecimiento personal",
      chips: ["Energía y vitalidad", "Amor y relaciones", "Estrés y equilibrio", "Crecimiento y sentido"],
      directory: "Encuentra tu coach",
      intro: "Explora perfiles públicos, métodos, idiomas y opiniones publicadas.",
      unavailable: "El directorio no está disponible temporalmente. Vuelve a intentarlo más tarde.",
      empty: "Todavía no hay perfiles públicos. Los profesionales aparecerán después de revisar sus perfiles.",
      all: "Todos los profesionales",
      practices: "Prácticas autoguiadas",
      practicesText: "Sesiones y métodos gratuitos que puedes explorar por tu cuenta.",
      practicesAction: "Ver prácticas",
      menu: "Secciones",
      close: "Inicio",
      find: "Coaches",
      practice: "Prácticas",
      video: "Vídeo",
      profile: "Perfil",
      openAll: "Todos",
    },
  })[locale];
}

function Header({ locale }) {
  const t = copy(locale);
  return (
    <header className={styles.topbar}>
      <Link className={styles.brand} href={"/" + locale} aria-label="Holistic House">
        <Image src="/icons/holistic-house-teal.svg" alt="" width={66} height={46} priority />
        <span>Holistic House<sup>®</sup></span>
      </Link>
      <div className={styles.headerActions}>
        <Link className={styles.headerIcon} href="#coach-finder" aria-label={t.find} title={t.find}>
          <Heart size={23} strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <details className={styles.menu}>
          <summary className={styles.headerIcon} aria-label={t.menu} title={t.menu}>
            <Ellipsis size={25} strokeWidth={2} aria-hidden="true" />
          </summary>
          <nav className={styles.menuPanel} aria-label={t.menu}>
            <Link href={"/" + locale}>{t.close}</Link>
            <Link href={"/" + locale + "/coaching"}>{t.find}</Link>
            <Link href={"/" + locale + "/coaching/sessions"}>{t.practice}</Link>
            <Link href={"/" + locale + "/holistic-support/mandala"}>{t.video}</Link>
            <Link href={"/" + (locale === "es" ? "en" : locale) + "/app/portrait"}>{t.profile}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function Hero({ locale }) {
  const t = copy(locale);
  return (
    <>
      <section className={styles.hero} aria-labelledby="my-coach-title">
        <Image className={styles.heroImage} src="/images/holistic-house/reiki-approved-sunrise-v3.webp"
          alt="" fill priority sizes="(max-width: 700px) 100vw, 1180px" />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>HOLISTIC HOUSE · PERSONAL SUPPORT</p>
          <h1 id="my-coach-title">{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className={styles.heroWave} aria-hidden="true" />
      </section>
      <div className={styles.topicChips} aria-label={locale === "ru" ? "Основные направления" : locale === "es" ? "Temas principales" : "Main topics"}>
        {t.chips.map((chip, index) => (
          <span className={styles.topicChip} key={chip}>
            <span aria-hidden="true">{["↗", "♡", "◉", "✧"][index]}</span>{chip}
          </span>
        ))}
      </div>
    </>
  );
}

export default async function PublicCoachingPage({ params }) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy(locale);

  let practitioners = [];
  let courses = [];
  let directoryUnavailable = false;
  let coursesUnavailable = false;
  try {
    const config = getAppConfig();
    const [mastersResult, coursesResult] = await Promise.allSettled([
      createPractitionerRepository(config).listPublicPractitioners(locale),
      createPractitionerCourseRepository(config).catalog(),
    ]);
    if (mastersResult.status === "fulfilled") practitioners = mastersResult.value;
    else directoryUnavailable = true;
    coursesUnavailable = coursesResult.status === "rejected";
    const publishedRows = coursesResult.status === "fulfilled" ? coursesResult.value : [];
    const approvedSlugs = new Set(practitioners.map((coach) => coach.slug));
    courses = publishedRows
      .filter((row) => approvedSlugs.has(row.practitionerSlug)
        && ["en", "ru", "es"].includes(row.course?.locale)
        && Boolean(row.course?.title))
      .map((row) => ({
        slug: row.slug,
        practitionerSlug: row.practitionerSlug,
        title: row.course.title,
        description: row.course.description || "",
        locale: row.course.locale,
      }));
    if (practitioners.length) {
      try {
        const summaries =
          await createServiceReviewRepository(config)
            .listPublicSummariesForPractitioners(practitioners.map((coach) => coach.id));
        const byId = new Map(summaries.map((summary) => [summary.practitionerId, {
          count: summary.count, average: summary.average,
        }]));
        practitioners = practitioners.map((coach) => ({
          ...coach,
          reviewSummary: byId.get(coach.id) ?? { count: 0, average: 0 },
        }));
      } catch {
        // Keep approved profiles when published review summaries are unavailable.
      }
    }
  } catch {
    directoryUnavailable = true;
    coursesUnavailable = true;
  }

  return (
    <main className={styles.page} lang={locale} data-coaching-hub>
      <Header locale={locale} />
      <div className={styles.wrap}>
        <Hero locale={locale} />
        <section className={styles.directory} id="coach-finder" aria-labelledby="coach-finder-title">
          <div className={styles.directoryHeading}>
            <div>
              <p className={styles.eyebrow}>{locale === "ru" ? "ВЫБОР СПЕЦИАЛИСТА" : locale === "es" ? "ENCUENTRA TU PROFESIONAL" : "FIND YOUR GUIDE"}</p>
              <h2 id="coach-finder-title">{t.directory}</h2>
              <p>{t.intro}</p>
            </div>
            <span className={styles.count}>{practitioners.length} {t.all}</span>
          </div>
          {directoryUnavailable ? (
            <p className={styles.unavailable} role="status">{t.unavailable}</p>
          ) : practitioners.length ? (
            <MarketplaceMasterFinder practitioners={practitioners} courses={courses}
              coursesUnavailable={coursesUnavailable} locale={locale} embedded />
          ) : (
            <p className={styles.empty} role="status">{t.empty}</p>
          )}
        </section>
        <section className={styles.practices}>
          <div>
            <p className={styles.eyebrow}>{locale === "ru" ? "БЕЗ ЗАПИСИ · В СВОЁМ ТЕМПЕ" : locale === "es" ? "A TU RITMO" : "NO BOOKING NEEDED"}</p>
            <h2>{t.practices}</h2>
            <p>{t.practicesText}</p>
          </div>
          <Link href={"/" + locale + "/coaching/sessions"}>{t.practicesAction}<ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </div>
      <nav className={styles.bottomNav} aria-label={locale === "ru" ? "Основная навигация" : locale === "es" ? "Navegación principal" : "Primary navigation"}>
        <Link href={"/" + locale}><House size={23} strokeWidth={1.8} aria-hidden="true"/><span>{t.close}</span></Link>
        <Link href={"/" + locale + "/coaching"} aria-current="page"><Headset size={23} strokeWidth={1.8} aria-hidden="true"/><span>{t.find}</span></Link>
        <Link href={"/" + locale + "/coaching/sessions"}><Leaf size={23} strokeWidth={1.8} aria-hidden="true"/><span>{t.practice}</span></Link>
        <Link href={"/" + locale + "/holistic-support/mandala"}><Clapperboard size={23} strokeWidth={1.8} aria-hidden="true"/><span>{t.video}</span></Link>
        <Link href={"/" + (locale === "es" ? "en" : locale) + "/app/portrait"}><UserRound size={23} strokeWidth={1.8} aria-hidden="true"/><span>{t.profile}</span></Link>
      </nav>
    </main>
  );
}
