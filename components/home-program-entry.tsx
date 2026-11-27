import Link from "next/link";
import { ChevronDown, Leaf } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import { ProfileSpaceDashboard } from "@/components/app/profile-space-dashboard";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-dialogue-entry.module.css";

const LOCALES = ["ru", "en", "es"] as const;
const tagline={en:"Therapy · Coaching · Growth",ru:"Терапия · Коучинг · Развитие",es:"Terapia · Coaching · Desarrollo"} as const;

/** Public discovery only. No account fetch or Ali composer is mounted on Home. */
export function HomeProgramEntry({locale}:{locale:PublicLocale}) {
 return <section className={styles.root} data-home-program-page lang={locale}>
    <header className={styles.header} data-home-dialogue-header>
      <Link href={locale==="en"?"/":"/"+locale} className={styles.brand} prefetch={false} aria-label="Holistic House">
        <span className={styles.brandIcon} aria-hidden="true"><Leaf size={25}/></span>
        <span className={styles.brandCopy}><h1>Holistic House</h1><small>{tagline[locale]}</small></span>
      </Link>
      <div className={styles.headerActions}>
        <details className={styles.language} data-home-language-switch>
          <summary aria-label={locale==="ru"?"Выбрать язык":locale==="es"?"Elegir idioma":"Choose language"}>{locale.toUpperCase()} <ChevronDown size={14} aria-hidden="true"/></summary>
          <div className={styles.languageMenu}>
            {LOCALES.map(next=><Link key={next} href={next==="en"?"/":"/"+next} lang={next} hrefLang={next} prefetch={false} aria-current={locale===next?"page":undefined}>{next.toUpperCase()}</Link>)}
          </div>
        </details>
        <div className={styles.siteTools} data-home-site-tools><SiteNavigation locale={locale} compact /></div>
      </div>
    </header>
    <section className={styles.programEntrance} data-home-program-entrance>
      <ProfileSpaceDashboard locale={locale} root={`/${locale === "es" ? "en" : locale}/app`} homeDiscovery={true} />
    </section>
 </section>;
}
