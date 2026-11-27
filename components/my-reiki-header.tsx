import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import type { PublicLocale } from "@/lib/public-locales";
import type { ReikiProgram } from "./reiki-programs";
import profile from "./app/profile-hub-tabs.module.css";

export function MyReikiHeader({ locale, program, modulePath }: { locale: PublicLocale; program: ReikiProgram; modulePath?: `/academy/reiki/yggdrasil/${string}` }) {
  const label = locale === "ru" ? "Выбрать язык сайта" : locale === "es" ? "Elegir idioma" : "Choose site language";
  return <div className={profile.hub} data-profile-active="today" data-my-reiki-header>
    <header className={profile.heading}>
      <div className={profile.headingTitle}>
        <span className={profile.brandMark} aria-hidden="true" />
        <h2><span className={profile.titleFull}>Holistic House</span><span className={profile.titleCompact}>Holistic House</span></h2>
      </div>
      <div className={profile.profileHeadingActions}>
        <details className={profile.languageSwitch}>
          <summary aria-label={label}>{locale.toUpperCase()}<ChevronDown size={13} aria-hidden="true" /></summary>
          <div className={profile.languageOptions}>{(["ru","en","es"] as const).map(language => <Link key={language} href={modulePath ? "/" + language + modulePath : "/" + language + "/academy/principles-of-energywork" + (program === "free" ? "" : "?program=" + program)} lang={language} hrefLang={language} prefetch={false} aria-current={language === locale ? "page" : undefined}>{language.toUpperCase()}</Link>)}</div>
        </details>
        <div className={profile.headingNav}><SiteNavigation locale={locale} compact /></div>
      </div>
    </header>
  </div>;
}
