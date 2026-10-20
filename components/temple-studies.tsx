import Image from "next/image";
import { cardArtworkUrl, hasCardArtwork } from "@/lib/public-card-artwork";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, ChevronDown, Compass, ScrollText } from "lucide-react";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TempleStudiesSideNavigation } from "@/components/reiki-course-side-nav";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { TempleInitiationChooser } from "@/components/temple-initiation-chooser";
import { TempleCourseHashSync } from "@/components/temple-course-hash-sync";
import {
  academyDisplayTitle,
  academyPublicBlocks,
  findAcademyRecord,
  mediaForRecord,
  youtubeIdFromUrl,
  type AcademySourceRecord,
} from "@/data/academy/catalog";
import { templeStages } from "@/data/academy/temple-studies-curriculum";
import { templeVideoCollections } from "@/data/academy/temple-studies-videos";
import type { PublicLocale } from "@/lib/public-locales";

const copy: Record<PublicLocale, {
  eyebrow: string; title: string; lead: string; intro: string; cta: string; stages: string;
  lesson: string; exercise: string; outcome: string; original: string; next: string;
  missing: string; contact: string; contactNote: string; disclaimer: string; archive: string;
  more: string; learningTitle: string; learningIntro: string; telegram: string;
}> = {
  en: {
    eyebrow: "Holistic House Academy · Personal mysteries",
    title: "Temple Studies",
    lead: "Choose a tradition, a deity’s channel and your initiation.",
    intro: "Explore a god or goddess through a guided initiation meditation, a personal Mystery Constellation or a group Mystery Constellation. Start with your chosen experience; study the background at your own pace.",
    cta: "Choose your mystery", stages: "7 optional learning chapters",
    lesson: "In this stage", exercise: "Your practice", outcome: "What you take forward",
    original: "Original course texts and deeper reading", next: "Continue to the next stage",
    missing: "Historical titles without substantial original text are not presented as separate courses. Available complete source pages and videos are preserved below each relevant stage.",
    contact: "Not sure which mystery to choose?",
    contactNote: "Select a tradition and a deity above, or ask Andrey which channel and format may best suit your question.",
    disclaimer: "This is a newly curated sequence based on historical Academy material, not a claim that the original school taught this exact seven-stage syllabus. Symbolic practices do not promise medical, supernatural or guaranteed personal results.",
    archive: "Historical Academy archive",
    more: "Explore lessons, practice & source materials",
    learningTitle: "Explore the teachings",
    learningIntro: "Seven short chapter previews. Open only the topics that interest you; the detailed lessons, practice, original texts and videos are kept inside.",
    telegram: "Or ask Andrey on Telegram",
  },
  ru: {
    eyebrow: "Holistic House · храмовые мистерии и посвящения",
    title: "Temple Studies — Храмовые мистерии",
    lead: "Выберите традицию, канал божества и формат посвящения.",
    intro: "Войдите в мистерию через медитацию-инициацию, личную или групповую мистерию-расстановку. Начните с интересующего вас канала; теорию можно изучать отдельно.",
    cta: "Выбрать свою мистерию", stages: "7 дополнительных учебных глав",
    lesson: "Содержание этапа", exercise: "Практическая часть", outcome: "Результат этапа",
    original: "Полные исходные курсы и дополнительные материалы", next: "Следующий этап",
    missing: "Исторические названия без полноценного исходного текста не превращены в пустые страницы. Сохранившиеся материалы и видео доступны внутри соответствующих этапов.",
    contact: "Не знаете, какую мистерию выбрать?",
    contactNote: "Выберите традицию и божество выше или попросите Андрея помочь подобрать канал и формат под ваш запрос.",
    disclaimer: "Это новая редакционная последовательность, составленная из исторических материалов Академии, а не утверждение, что первоначальная школа преподавала именно эти семь этапов. Символические практики не гарантируют медицинских или сверхъестественных результатов.",
    archive: "Исторический архив Академии",
    more: "Раскрыть уроки, практику и материалы",
    learningTitle: "Программа и материалы",
    learningIntro: "Семь коротких обзоров. Подробные уроки, упражнения, исходные тексты и видео раскрываются внутри выбранной главы.",
    telegram: "Или написать Андрею в Telegram",
  },
  es: {
    eyebrow: "Holistic House · misterios e iniciaciones",
    title: "Temple Studies — Misterios del Templo",
    lead: "Elige una tradición, el canal de una deidad y tu iniciación.",
    intro: "Explora una deidad mediante meditación–iniciación, una constelación personal o un misterio grupal. Puedes comenzar con tu experiencia y estudiar la teoría después.",
    cta: "Elegir mi misterio", stages: "7 capítulos opcionales",
    lesson: "Contenido de esta etapa", exercise: "Práctica personal", outcome: "Lo que aprendes",
    original: "Cursos originales y lecturas complementarias", next: "Siguiente etapa",
    missing: "Los títulos históricos sin texto sustancial no se presentan como cursos vacíos. Los materiales originales y videos conservados siguen disponibles en cada etapa.",
    contact: "¿No sabes qué misterio elegir?",
    contactNote: "Elige una tradición y una deidad arriba, o pregunta a Andrey qué canal y formato pueden acompañar tu pregunta.",
    disclaimer: "Es una nueva secuencia editorial basada en archivos de la Academia, no una afirmación de que el programa histórico tuviera exactamente estas siete etapas. Las prácticas simbólicas no garantizan resultados médicos ni sobrenaturales.",
    archive: "Archivo histórico de la Academia",
    more: "Abrir lecciones, práctica y materiales",
    learningTitle: "Explora las enseñanzas",
    learningIntro: "Siete resúmenes breves. Abre los temas que te interesen para leer las lecciones, ejercicios, textos y vídeos originales.",
    telegram: "O escribir a Andrey por Telegram",
  },
};


const videoCopy: Record<PublicLocale, {
  eyebrow: string; title: string; audio: string; navigate: string; stageCount: (n: number) => string;
  summary: (lessons: number, courses: number) => string;
  archiveTitle: string; archiveIntro: string; lesson: (n: number) => string;
  repeated: (n: number) => string; original: string;
}> = {
  en: {
    eyebrow: "Original Academy archive · Russian audio",
    title: "Original video courses & meditations",
    audio: "Audio: Russian",
    navigate: "Choose a video course",
    stageCount: (n) => `${n} videos`,
    summary: (lessons, courses) => `${lessons} unique recordings · ${courses} course groups · open to explore`,
    archiveTitle: "Original PsiMaster lessons",
    archiveIntro: "These historic videos are in Russian. Lesson titles are translated where available. Open a course to choose a recording.",
    lesson: (n) => `Lesson ${n}`,
    repeated: (n) => `${n} recordings also belong to an earlier group and are linked there rather than duplicated.`,
    original: "Original source on PsiMaster",
  },
  ru: {
    eyebrow: "Оригинальный архив Академии · на русском",
    title: "Видеокурсы и медитации",
    audio: "Язык видео: русский",
    navigate: "Выберите видеокурс",
    stageCount: (n) => `${n} видео`,
    summary: (lessons, courses) => `${lessons} уникальная видеозапись · ${courses} подборок · нажмите, чтобы раскрыть`,
    archiveTitle: "Видеоуроки из архива PsiMaster",
    archiveIntro: "Откройте подборку и выберите видеоурок. Порядок оригинальных уроков сохранён; повторяющиеся записи не дублируются.",
    lesson: (n) => `Урок ${n}`,
    repeated: (n) => `Ещё ${n} записи из этой подборки представлены в другой группе выше. Повторы не дублируются.`,
    original: "Оригинальная программа на PsiMaster",
  },
  es: {
    eyebrow: "Archivo original · audio en ruso",
    title: "Videocursos y meditaciones originales",
    audio: "Audio: ruso",
    navigate: "Elegir un videocurso",
    stageCount: (n) => `${n} vídeos`,
    summary: (lessons, courses) => `${lessons} grabaciones únicas · ${courses} colecciones · abrir para explorar`,
    archiveTitle: "Lecciones originales de PsiMaster",
    archiveIntro: "Estos vídeos históricos están en ruso. Los títulos de las lecciones están traducidos cuando existe traducción.",
    lesson: (n) => `Lección ${n}`,
    repeated: (n) => `${n} grabaciones ya aparecen en otro grupo y no se duplican.`,
    original: "Fuente original en PsiMaster",
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
  const vt = videoCopy[locale];
  const courseRecords = templeStages.map((stage) => ({
    stage,
    sources: stage.sourceIds.map((id) => findAcademyRecord(id, locale))
      .filter((record): record is AcademySourceRecord => Boolean(record))
      .filter((record) => hasSubstantialSource(record, locale)),
  }));

  const videoIndex = templeStages.map((stage) => {
    const groups = templeVideoCollections(stage.id, locale);
    return {
      id: stage.id,
      title: stage.copy[locale].title,
      collectionCount: groups.length,
      videoCount: groups.reduce((sum, group) => sum + group.videos.length, 0),
    };
  }).filter((stage) => stage.videoCount > 0);
  const totalVideoLessons = videoIndex.reduce((sum, stage) => sum + stage.videoCount, 0);
  const totalVideoCollections = videoIndex.reduce((sum, stage) => sum + stage.collectionCount, 0);

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
            <TempleCourseHashSync />
            <header className="temple-hero">
              <div className="temple-hero-copy">
                <p className="homeopathy-kicker">{t.eyebrow}</p>
                <h1>{t.title}</h1>
                <p className="temple-lead">{t.lead}</p>
                <p>{t.intro}</p>
                <div className="temple-hero-actions">
                  <a className="temple-primary-cta" href="#temple-choose">
                    {t.cta} <ArrowDown size={17} aria-hidden="true" />
                  </a>
                  <span>{t.stages}</span>
                </div>
              </div>
              <div className="temple-hero-image">
                <Image src={cardArtworkUrl("/library/maya-mysteries/media/post-244-1.jpg", "feature")} unoptimized alt="" fill priority sizes="(max-width: 900px) 100vw, 35vw" />
              </div>
            </header>

            <TempleInitiationChooser locale={locale} />

            {videoIndex.length > 0 ? (
              <details className="temple-video-index" aria-labelledby="temple-video-index-heading">
                <summary className="temple-video-index-summary">
                  <span className="temple-video-index-summary-text">
                    <span className="homeopathy-kicker">{vt.eyebrow}</span>
                    <strong id="temple-video-index-heading">{vt.title}</strong>
                    <small>{vt.summary(totalVideoLessons, totalVideoCollections)}</small>
                  </span>
                  <ChevronDown size={22} aria-hidden="true" />
                </summary>
                <nav className="temple-video-index-links" aria-label={vt.navigate}>
                  {videoIndex.map((stage) => (
                    <a href={"#temple-video-" + stage.id} key={stage.id}>
                      <span>{stage.title}</span>
                      <strong>{vt.stageCount(stage.videoCount)} <ArrowRight size={15} aria-hidden="true" /></strong>
                    </a>
                  ))}
                </nav>
              </details>
            ) : null}

            <div className="temple-learning-intro">
              <p className="homeopathy-kicker">{t.stages}</p>
              <h2>{t.learningTitle}</h2>
              <p>{t.learningIntro}</p>
            </div>

            <div className="temple-stage-flow" aria-label={t.stages}>
              {courseRecords.map(({ stage, sources }, index) => {
                const data = stage.copy[locale];
                const nextStage = templeStages[index + 1];
                const videoCollections = templeVideoCollections(stage.id, locale);
                const legacyAliases: Record<string, string[]> = {
                  greek: ["mysteries"], traditions: ["traditions"], symbols: ["symbols"],
                  initiation: ["practice"], application: ["path"],
                };
                return (
                  <section id={"temple-" + stage.id} className="temple-stage" key={stage.id} aria-labelledby={"temple-title-" + stage.id}>
                    {(legacyAliases[stage.id] ?? []).map((alias) => <span className="temple-anchor-alias" id={alias} key={alias} />)}
                    <div className="temple-stage-cover">
                      <Image src={cardArtworkUrl(stage.image, "feature")} unoptimized={hasCardArtwork(stage.image)} alt="" fill sizes="(max-width: 900px) 100vw, 75vw" />
                      <div className="temple-stage-cover-label">{String(index + 1).padStart(2, "0")} / 07</div>
                    </div>
                    <div className="temple-stage-reading">
                      <div className="temple-stage-heading">
                        <p className="homeopathy-kicker">Temple Studies · {String(index + 1).padStart(2, "0")}</p>
                        <h2 id={"temple-title-" + stage.id}>{data.title}</h2>
                        <p className="temple-stage-subtitle">{data.subtitle}</p>
                      </div>
                    </div>
                    <details className="temple-stage-details">
                        <summary>{t.more}<ChevronDown size={19} aria-hidden="true" /></summary>
                        <div className="temple-stage-expanded">
                          <p className="temple-stage-intro">{data.introduction}</p>
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
                        {videoCollections.length ? (
                          <section className="temple-video-archive" id={"temple-video-" + stage.id} aria-label={vt.title}>
                            <div className="temple-video-archive-heading">
                              <h3>{vt.archiveTitle} <span className="temple-language-badge">{vt.audio}</span></h3>
                              <p>{vt.archiveIntro}</p>
                            </div>
                            {videoCollections.map((collection) => (
                              <details className="temple-video-series" key={collection.key}>
                                <summary>
                                  <span className="temple-video-series-summary-text">
                                    <strong lang="ru">{collection.title}</strong>
                                    <small lang="ru">{collection.description}</small>
                                  </span>
                                  <span className="temple-video-series-count">{vt.stageCount(collection.videos.length)}</span>
                                </summary>
                                <div className="temple-video-series-content">
                                  <ol className="temple-video-grid">
                                    {collection.videos.map((video) => (
                                      <li className="temple-video-lesson" key={video.id}>
                                        <AcademyVideoPlayer youtubeId={video.id} title={video.title} />
                                        <p className="temple-video-lesson-title"><span>{vt.lesson(video.order)} · {vt.audio}</span>{video.title}</p>
                                      </li>
                                    ))}
                                  </ol>
                                  {collection.repeatedCount > 0 ? (
                                    <p className="temple-video-repeats">{vt.repeated(collection.repeatedCount)}</p>
                                  ) : null}
                                  {collection.sourceUrl ? (
                                    <a className="temple-video-provenance" href={collection.sourceUrl} target="_blank" rel="noopener noreferrer">
                                      {vt.original} <ArrowRight size={15} aria-hidden="true" />
                                    </a>
                                  ) : null}
                                </div>
                              </details>
                            ))}
                          </section>
                        ) : null}
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
                      </details>
                  </section>
                );
              })}
            </div>

            <section className="temple-finish">
              <Compass size={30} aria-hidden="true" />
              <h2>{t.contact}</h2>
              <p>{t.contactNote}</p>
              <a className="temple-primary-cta" href="#temple-choose">
                {t.cta} <ArrowRight size={18} aria-hidden="true" />
              </a>
              <p className="temple-telegram-link"><a href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.telegram} →</a></p>
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
