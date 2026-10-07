import Image from "next/image";
import Link from "next/link";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { YggdrasilCurriculum } from "@/components/yggdrasil-curriculum";
import { YggdrasilEnglishVideoGuide } from "@/components/yggdrasil-english-video-guide";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import { yggdrasilModuleLandings, type YggdrasilModuleLanding } from "@/data/academy/yggdrasil-module-map";
import type { PublicLocale } from "@/lib/public-locales";

export function YggdrasilModuleLandingPage({ locale, module }: { locale: PublicLocale; module: YggdrasilModuleLanding }) {
  const level = curriculum.levels.find((item) => item.id === module.levelId);
  if (!level) return null;
  const index = yggdrasilModuleLandings.findIndex((item) => item.slug === module.slug);
  const previous = index > 0 ? yggdrasilModuleLandings[index - 1] : null;
  const next = index >= 0 && index < yggdrasilModuleLandings.length - 1 ? yggdrasilModuleLandings[index + 1] : null;
  const settings = level.steps.reduce((sum, step) => sum + step.settings.length, 0);
  const videos = level.steps.reduce((sum, step) => sum + (step.video?.videos?.filter((video) => Boolean(video.youtubeId)).length ?? 0), 0);

  const copy = {
    en: {
      back: "Reiki Yggdrasil program",
      source: "This page uses the current canonical Reiki Yggdrasil course map and preserves the historical PsiTrends program as source context.",
      archive: "Full historical program source",
      notice: "Historical descriptions of healing, energy, clairvoyance and other esoteric effects are presented as course/source material, not as medical advice or guaranteed outcomes.",
      steps: "steps", attunements: "attunements", videos: "video lectures",
      previous: "Previous module", next: "Next module",
    },
    ru: {
      back: "Программа Рейки Иггдрасиль",
      source: "Страница использует актуальную каноническую карту курса Reiki Yggdrasil и сохраняет историческую программу PsiTrends как источник.",
      archive: "Полный исторический текст программы",
      notice: "Исторические описания целительства, энергетических, ясновидческих и других эзотерических эффектов сохранены как учебный материал системы, а не как медицинская рекомендация или гарантия результата.",
      steps: "ступеней", attunements: "настроек", videos: "видеолекций",
      previous: "Предыдущий модуль", next: "Следующий модуль",
    },
    es: {
      back: "Programa Reiki Yggdrasil",
      source: "La página usa el mapa canónico actual de Reiki Yggdrasil y conserva el programa histórico de PsiTrends como contexto.",
      archive: "Fuente histórica completa",
      notice: "Las descripciones históricas de sanación, energía, clarividencia y otros efectos esotéricos se presentan como material del curso, no como consejo médico ni garantía.",
      steps: "etapas", attunements: "sintonizaciones", videos: "videoclases",
      previous: "Módulo anterior", next: "Módulo siguiente",
    },
  }[locale];

  return (
    <main className="academy-reading-shell yggdrasil-module-page" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <AcademyBackLink locale={locale} />
      <article className="academy-reading">
        <nav className="yggdrasil-module-breadcrumb" aria-label="Reiki Yggdrasil">
          <Link href={`/${locale}/academy/reiki/yggdrasil`}>← {copy.back}</Link>
          <Link href={`/${locale}/academy/reiki/yggdrasil/archive`}>{copy.archive} →</Link>
        </nav>

        <header className="yggdrasil-module-hero">
          <div className="yggdrasil-module-hero-copy">
            <p className="homeopathy-kicker">{module.eyebrow[locale]}</p>
            <h1>{module.title[locale]}</h1>
            <p>{module.lead[locale]}</p>
            <div className="yggdrasil-module-stats" aria-label="Module coverage">
              <span>{level.steps.length} {copy.steps}</span>
              <span>{settings} {copy.attunements}</span>
              <span>{videos} {copy.videos}</span>
            </div>
          </div>
          <div className="yggdrasil-module-hero-image">
            <Image src={module.image} alt="" fill sizes="(max-width: 800px) 100vw, 42vw" priority />
          </div>
        </header>

        <aside className="academy-archive-notice">{copy.notice}</aside>
        <p className="yggdrasil-program-source-note">{copy.source}</p>

        {module.levelId <= 2 ? <YggdrasilEnglishVideoGuide locale={locale} compact /> : null}

        <YggdrasilCurriculum locale={locale} levelId={module.levelId} showSupport={module.levelId === 1} />

        <nav className="yggdrasil-module-pagination" aria-label="Reiki Yggdrasil modules">
          {previous ? <Link href={`/${locale}/academy/reiki/yggdrasil/${previous.slug}`}><small>{copy.previous}</small><strong>{previous.title[locale]}</strong></Link> : <span />}
          {next ? <Link href={`/${locale}/academy/reiki/yggdrasil/${next.slug}`}><small>{copy.next}</small><strong>{next.title[locale]}</strong></Link> : <span />}
        </nav>
      </article>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
