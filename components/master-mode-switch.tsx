import Link from "next/link";
import { BriefcaseBusiness, Search } from "lucide-react";
import styles from "./master-mode-switch.module.css";

const COPY = {
  en: {
    label: "Master: choose a section",
    find: "Find a Master",
    findHint: "Masters & services",
    share: "I'm a Master",
    shareHint: "Share services",
  },
  ru: {
    label: "Мастер: выберите раздел",
    find: "Найти мастера",
    findHint: "Мастера и услуги",
    share: "Я мастер",
    shareHint: "Разместить услуги",
  },
  es: {
    label: "Master: elige una sección",
    find: "Buscar un maestro",
    findHint: "Maestros y servicios",
    share: "Soy maestro",
    shareHint: "Compartir servicios",
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
