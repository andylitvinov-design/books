import Link from "next/link";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import { YggdrasilSourceStudyGuide } from "@/components/yggdrasil-source-study-guide";
import type { PublicLocale } from "@/lib/public-locales";

export function YggdrasilSuperSkillsSourcesPage({ locale }: { locale: PublicLocale }) {
  const back = locale === "ru" ? "Вернуться к программе Рейки Иггдрасиль" : locale === "es" ? "Volver al programa Reiki Yggdrasil" : "Return to Reiki Yggdrasil programme";
  return (
    <main className="academy-reading-shell academy-reading-shell--wide" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <AcademyBackLink locale={locale} />
      <div className="academy-course-layout">
        <YggdrasilSideNavigation locale={locale} activeSlug="superskills-sources" />
        <article className="academy-reading">
          <nav className="yggdrasil-module-breadcrumb" aria-label="Reiki Yggdrasil">
            <Link href={"/" + locale + "/academy/reiki/yggdrasil"}>← {back}</Link>
          </nav>
          <YggdrasilSourceStudyGuide locale={locale} mode="resources" />
        </article>
      </div>
    </main>
  );
}
