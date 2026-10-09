import Link from "next/link";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import { YggdrasilSourceStudyGuide } from "@/components/yggdrasil-source-study-guide";
import type { PublicLocale } from "@/lib/public-locales";

export function YggdrasilSuperSkillsSourcesPage({ locale }: { locale: PublicLocale }) {
  const back = locale === "ru" ? "Вернуться к программе Рейки Иггдрасиль" : locale === "es" ? "Volver al programa Reiki Yggdrasil" : "Return to Reiki Yggdrasil programme";
  const heading = locale === "ru" ? "Первоисточники SuperSkills: Рейки Иггдрасиль" : locale === "es" ? "Fuentes originales de SuperSkills · Reiki Yggdrasil" : "Original SuperSkills Reiki Yggdrasil sources";
  const lead = locale === "ru" ? "19 проверенных связанных страниц в шести темах: система, базовый курс, практика, инструктор, инициации и отзывы." : locale === "es" ? "19 páginas verificadas en seis temas: sistema, niveles básicos, práctica, instructor, iniciación y testimonios." : "19 verified source pages in six topics: system, basic levels, practice, instructor, initiation and student accounts.";
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
          <header className="academy-reading-header">
            <p className="homeopathy-kicker">{locale === "ru" ? "Библиотека документов" : locale === "es" ? "Biblioteca de fuentes" : "Source reading library"}</p>
            <h1>{heading}</h1>
            <p>{lead}</p>
          </header>
          <YggdrasilSourceStudyGuide locale={locale} mode="resources" />
        </article>
      </div>
    </main>
  );
}
