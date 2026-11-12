import Link from "next/link";
import { BriefcaseBusiness, House, Search } from "lucide-react";
import styles from "./master-mode-switch.module.css";

const COPY = {
  en: {
    label: "Master: choose a section",
    find: "Find a Master",
    findHint: "Explore practitioners & services",
    share: "I'm a Master",
    shareHint: "Share services & manage practice",
  },
  ru: {
    label: "Мастер: выберите раздел",
    find: "Найти мастера",
    findHint: "Выбирайте мастеров и услуги",
    share: "Я мастер",
    shareHint: "Услуги и кабинет практика",
  },
  es: {
    label: "Master: elige una sección",
    find: "Buscar un maestro",
    findHint: "Explora profesionales y servicios",
    share: "Soy maestro",
    shareHint: "Publica y gestiona servicios",
  },
} as const;

/**
 * Switch between the EXISTING public finder and existing practitioner workspace.
 * Route links, not nested fake panels: the finder is guest-accessible, while
 * protected editing still goes through the original Practice auth/API checks.
 */
export function MasterModeSwitch({
  locale,
  active,
}: {
  locale: string;
  active: "find" | "share";
}) {
  const language = locale === "ru" || locale === "es" ? locale : "en";
  const t = COPY[language];
  const prefix = "/" + language;

  return (
    <nav className={styles.switch} aria-label={t.label}
      data-master-mode-switch data-master-mode-active={active}>
      <Link href={prefix + "/masters"} prefetch={false}
        data-master-mode="find" aria-current={active === "find" ? "page" : undefined}>
        <Search size={21} strokeWidth={2} aria-hidden="true" />
        <span><strong>{t.find}</strong><small>{t.findHint}</small></span>
      </Link>
      <Link href={prefix + "/practice"} prefetch={false}
        data-master-mode="share" aria-current={active === "share" ? "page" : undefined}>
        <BriefcaseBusiness size={21} strokeWidth={2} aria-hidden="true" />
        <span><strong>{t.share}</strong><small>{t.shareHint}</small></span>
      </Link>
    </nav>
  );
}

/**
 * Two views of the same person, not two accounts. Work opens the existing
 * public practitioner overview; publishing still requires its protected editor.
 */
const PROFILE_MODE_COPY = {
  en: { label: "Profile mode: Live or Work", live: "Live — My Space", work: "Work — I'm a Master: publish services" },
  ru: { label: "Режим профиля: Live или Work", live: "Live — Моё пространство", work: "Work — Я мастер: разместить услуги" },
  es: { label: "Modo de perfil: Live o Work", live: "Live — Mi espacio", work: "Work — Soy maestro: publicar servicios" },
} as const;

export function ProfileModeSwitch({ locale, active }: {
  locale: string;
  active: "live" | "work";
}) {
  const language = locale === "ru" || locale === "es" ? locale : "en";
  const profileLocale = language === "es" ? "en" : language;
  const t = PROFILE_MODE_COPY[language];
  return (
    <nav className={styles.profileSwitch} aria-label={t.label}
      data-profile-mode-switch data-profile-mode-active={active}>
      <Link href={"/" + profileLocale + "/app/portrait"} prefetch={false}
        data-profile-mode="live" aria-label={t.live} aria-current={active === "live" ? "page" : undefined}>
        <House size={16} strokeWidth={2} aria-hidden="true" />
        <span>Live</span>
      </Link>
      <Link href={"/" + language + "/practice"} prefetch={false}
        data-profile-mode="work" aria-label={t.work} aria-current={active === "work" ? "page" : undefined}>
        <BriefcaseBusiness size={16} strokeWidth={2} aria-hidden="true" />
        <span>Work</span>
      </Link>
    </nav>
  );
}
