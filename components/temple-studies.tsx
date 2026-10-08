import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Compass, ScrollText } from "lucide-react";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TempleStudiesSideNavigation } from "@/components/reiki-course-side-nav";
import {
  academyDisplayTitle,
  academyPublicBlocks,
  findAcademyRecord,
  mediaForRecord,
  youtubeIdFromUrl,
  type AcademySourceRecord,
} from "@/data/academy/catalog";
import { templeStages } from "@/data/academy/temple-studies-curriculum";
import type { PublicLocale } from "@/lib/public-locales";

const copy: Record<PublicLocale, {
  eyebrow: string; title: string; lead: string; intro: string; cta: string; stages: string;
  lesson: string; exercise: string; outcome: string; original: string; next: string;
  missing: string; contact: string; contactNote: string; disclaimer: string; archive: string;
}> = {
  en: {
    eyebrow: "Holistic House Academy · One continuous program",
    title: "Temple Studies",
    lead: "From ancient mysteries to a meaningful personal practice.",
    intro: "One connected seven-stage journey through Greek and Egyptian mysteries, cultural traditions, runes, elements, Tarot and archetypal practice. Each step builds on the previous one: first understand, then experience, finally apply.",
    cta: "Begin with Stage 1", stages: "7 connected stages",
    lesson: "In this stage", exercise: "Your practice", outcome: "What you take forward",
    original: "Original course texts and deeper reading", next: "Continue to the next stage",
    missing: "Historical titles without substantial original text are not presented as separate courses. Available complete source pages and videos are preserved below each relevant stage.",
    contact: "Discuss the Temple Studies path",
    contactNote: "Ask which stages and guided formats are currently available. Dates, format and fees are confirmed individually.",
    disclaimer: "This is a newly curated sequence based on historical Academy material, not a claim that the original school taught this exact seven-stage syllabus. Symbolic practices do not promise medical, supernatural or guaranteed personal results.",
    archive: "Historical Academy archive",
  },
  ru: {
    eyebrow: "Holistic House · единая учебная программа",
    title: "Temple Studies — Храмовые мистерии",
    lead: "От древних мистерий к осмысленной личной практике.",
    intro: "Единый путь из семи последовательных этапов: греческие и египетские мистерии, традиции мира, руны, стихии, Таро и архетипическая практика. Каждый этап опирается на предыдущий: сначала понять, затем пережить и наконец применить.",
    cta: "Начать с первого этапа", stages: "7 последовательных этапов",
    lesson: "Содержание этапа", exercise: "Практическая часть", outcome: "Результат этапа",
    original: "Полные исходные курсы и дополнительные материалы", next: "Следующий этап",
    missing: "Исторические названия без полноценного исходного текста не превращены в пустые страницы. Сохранившиеся материалы и видео доступны внутри соответствующих этапов.",
    contact: "Узнать о программе Temple Studies",
    contactNote: "Уточните, какие этапы и форматы обучения сейчас доступны. Даты, стоимость и условия обсуждаются лично.",
    disclaimer: "Это новая редакционная последовательность, составленная из исторических материалов Академии, а не утверждение, что первоначальная школа преподавала именно эти семь этапов. Символические практики не гарантируют медицинских или сверхъестественных результатов.",
    archive: "Исторический архив Академии",
  },
  es: {
    eyebrow: "Holistic House Academia · un solo programa",
    title: "Temple Studies — Misterios del Templo",
    lead: "De los misterios antiguos a una práctica personal consciente.",
    intro: "Un recorrido de siete etapas conectadas: misterios griegos y egipcios, tradiciones del mundo, runas, elementos, Tarot y práctica arquetípica. Primero comprender, después experimentar y finalmente aplicar.",
    cta: "Empezar por la etapa 1", stages: "7 etapas conectadas",
    lesson: "Contenido de esta etapa", exercise: "Práctica personal", outcome: "Lo que aprendes",
    original: "Cursos originales y lecturas complementarias", next: "Siguiente etapa",
    missing: "Los títulos históricos sin texto sustancial no se presentan como cursos vacíos. Los materiales originales y videos conservados siguen disponibles en cada etapa.",
    contact: "Consultar el programa Temple Studies",
    contactNote: "Pregunta por las etapas y formatos disponibles. Las fechas y tarifas se confirman personalmente.",
    disclaimer: "Es una nueva secuencia editorial basada en archivos de la Academia, no una afirmación de que el programa histórico tuviera exactamente estas siete etapas. Las prácticas simbólicas no garantizan resultados médicos ni sobrenaturales.",
    archive: "Archivo histórico de la Academia",
  },
};

function hasSubstantialSource(record: AcademySourceRecord, locale: PublicLocale) {
  const prose = academyPublicBlocks(record, locale).filter((block) => block.type === "p" || block.type === "li");
  const hasVideo = mediaForRecord(record).some((item) => Boolean(youtubeIdFromUrl(item.mediaUrl)));
  return prose.length >= 2 || hasVideo;
}

/** A single course, not four independent catalogs. All stage source IDs are unique. */
export function TempleStudies({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const courseRecords = templeStages.map((stage) => ({
    stage,
    sources: stage.sourceIds.map((id) => findAcademyRecord(id, locale))
      .filter((record): record is AcademySourceRecord => Boolean(record))
      .filter((record) => hasSubstantialSource(record, locale)),
  }));

  return (
    <main className="temple-shell" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className="temple-inner">
        <AcademyBackLink locale={locale} />
        <div className="temple-course-layout">
          <TempleStudiesSideNavigation
            locale={locale}
            stages={templeStages.map((stage) => ({ id: stage.id, title: stage.copy[locale].title }))}
          />

          <div className="temple-course-content">
            <header className="temple-hero">
              <div className="temple-hero-copy">
                <p className="homeopathy-kicker">{t.eyebrow}</p>
                <h1>{t.title}</h1>
                <p className="temple-lead">{t.lead}</p>
                <p>{t.intro}</p>
                <div className="temple-hero-actions">
                  <a className="temple-primary-cta" href="#temple-foundations">
                    {t.cta} <ArrowDown size={17} aria-hidden="true" />
                  </a>
                  <span>{t.stages}</span>
                </div>
              </div>
              <div className="temple-hero-image">
                <Image src="/library/maya-mysteries/media/post-244-1.jpg" alt="" fill priority sizes="(max-width: 900px) 100vw, 35vw" />
              </div>
            </header>

            <div className="temple-stage-flow" aria-label={t.stages}>
              {courseRecords.map(({ stage, sources }, index) => {
                const data = stage.copy[locale];
                const nextStage = templeStages[index + 1];
                const legacyAliases: Record<string, string[]> = {
                  greek: ["mysteries"], traditions: ["traditions"], symbols: ["symbols"],
                  initiation: ["practice"], application: ["path"],
                };
                return (
                  <section id={"temple-" + stage.id} className="temple-stage" key={stage.id} aria-labelledby={"temple-title-" + stage.id}>
                    {(legacyAliases[stage.id] ?? []).map((alias) => <span className="temple-anchor-alias" id={alias} key={alias} />)}
                    <div className="temple-stage-cover">
                      <Image src={stage.image} alt="" fill sizes="(max-width: 900px) 100vw, 75vw" />
                      <div className="temple-stage-cover-label">{String(index + 1).padStart(2, "0")} / 07</div>
                    </div>
                    <div className="temple-stage-reading">
                      <div className="temple-stage-heading">
                        <p className="homeopathy-kicker">Temple Studies · {String(index + 1).padStart(2, "0")}</p>
                        <h2 id={"temple-title-" + stage.id}>{data.title}</h2>
                        <p className="temple-stage-subtitle">{data.subtitle}</p>
                        <p className="temple-stage-intro">{data.introduction}</p>
                      </div>
                      <h3 className="temple-small-heading">{t.lesson}</h3>
                      <ol className="temple-lessons">
                        {data.lessons.map((lesson, lessonIndex) => (
                          <li key={lesson.title}>
                            <span>{String(lessonIndex + 1).padStart(2, "0")}</span>
                            <div><h4>{lesson.title}</h4><p>{lesson.description}</p></div>
                          </li>
                        ))}
                      </ol>
                      <div className="temple-practice">
                        <div><span className="temple-practice-label">{t.exercise}</span><p>{data.exercise}</p></div>
                        <div><span className="temple-practice-label">{t.outcome}</span><p>{data.outcome}</p></div>
                      </div>
                      {sources.length ? (
                        <details className="temple-sources">
                          <summary><BookOpen size={18} aria-hidden="true" /> {t.original} ({sources.length})</summary>
                          <ul>
                            {sources.map((record) => (
                              <li key={record.logicalId}>
                                <Link href={"/" + locale + "/academy/" + record.routeKey}>
                                  {academyDisplayTitle(record, locale)} <ArrowRight size={15} aria-hidden="true" />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                      {nextStage ? (
                        <a className="temple-next-stage" href={"#temple-" + nextStage.id}>
                          <span>{t.next}<strong>{nextStage.copy[locale].title}</strong></span>
                          <ArrowRight size={20} aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>

            <section className="temple-finish">
              <Compass size={30} aria-hidden="true" />
              <h2>{t.contact}</h2>
              <p>{t.contactNote}</p>
              <a className="temple-primary-cta" href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">
                {t.contact} <ArrowRight size={18} aria-hidden="true" />
              </a>
              <div className="temple-archive-footer">
                <ScrollText size={16} aria-hidden="true" />
                <Link href={"/" + locale + "/academy/archive"}>{t.archive}</Link>
              </div>
              <p className="temple-caveat">{t.disclaimer}</p>
              <p className="temple-caveat">{t.missing}</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
