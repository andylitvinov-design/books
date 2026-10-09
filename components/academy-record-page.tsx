import Link from "next/link";
import type { ReactNode } from "react";

import { AcademyBackLink } from "@/components/academy-hub";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { EnglishGuidedMeditations } from "@/components/english-guided-meditations";
import { YggdrasilProgramLanding } from "@/components/yggdrasil-program-landing";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { TantraReikiLeadForms } from "@/components/tantra-reiki-lead-forms";
import { TantraReikiFestivalMoments, TantraReikiTeacher } from "@/components/tantra-reiki-story";
import { TantraReikiProgrammeModules } from "@/components/tantra-reiki-programme-modules";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TantraReikiSideNavigation, YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import { TantraReikiJourney } from "@/components/tantra-reiki-journey";
import { TantraReikiTestimonials } from "@/components/tantra-reiki-testimonials";
import { academyCopy, academyDisplayTitle, academyPublicBlocks, academyPublicOmittedCount, mediaForRecord, sourceLanguageNotice, youtubeIdFromUrl, type AcademyBlock, type AcademySourceRecord } from "@/data/academy/catalog";
import tantraReikiFullArchive from "@/data/academy/tantra-reiki-full.generated.json";
import tantraReikiOriginalRuEnglish from "@/data/academy/tantra-reiki-ru-en.generated.json";
import type { PublicLocale } from "@/lib/public-locales";

function renderBlocks(blocks: AcademyBlock[]) {
  const nodes: ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    const items = list; list = [];
    nodes.push(<ul className="academy-source-list" key={"list-" + nodes.length}>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>);
  };
  blocks.forEach((block, index) => {
    if (block.type === "li") { list.push(block.text); return; }
    flushList();
    if (block.type === "h1") return;
    if (block.type === "h2") nodes.push(<h2 id={"academy-section-" + index} key={index}>{block.text}</h2>);
    if (block.type === "h3") nodes.push(<h3 id={"academy-section-" + index} key={index}>{block.text}</h3>);
    if (block.type === "h4") nodes.push(<h4 id={"academy-section-" + index} key={index}>{block.text}</h4>);
    if (block.type === "p") nodes.push(<p key={index}>{block.text}</p>);
  });
  flushList(); return nodes;
}

function statusLabel(record: AcademySourceRecord, locale: PublicLocale) {
  if (record.routeKey === "reiki/yggdrasil") return academyCopy[locale].current;
  if (record.logicalId === "reiki/tantra-reiki") return locale === "ru" ? "Даты и формат — по запросу" : locale === "es" ? "Fechas y formato a consultar" : "Ask for dates & format";
  return academyCopy[locale][record.status] ?? academyCopy[locale].historical;
}

const tantraReikiLevelSummary: Record<PublicLocale, {
  title: string;
  intro: string;
  levels: Array<{ number: number; title: string; description: string }>;
}> = {
  ru: {
    title: "Кратко о 9 ступенях",
    intro: "Каждая ступень — это углубление в один и тот же поток Тантра Рейки: от телесной чувствительности и контакта к внутренней опоре, ясности и созиданию.",
    levels: [
      { number: 1, title: "Активация и контакт", description: "Пробуждение жизненности и сексуальной энергии, усиление чувствительности, привлекательности и способности наполнять энергией выбранную ситуацию." },
      { number: 2, title: "Жар жизни · накопление и комплексы", description: "Накопление внутренней энергии, настройка «Денежный магнит» и работа с комплексами — как в оригинальном русском описании второй ступени." },
      { number: 3, title: "Океан единства · сонастройка и талисман", description: "Сонастройка с миром, удача («ускорение времени») и создание талисмана — настройки третьей ступени в оригинальной русской программе." },
      { number: 4, title: "Архетипические энергии", description: "Переход к более высоким образам: Просветление, Боги Любви и «Астральный ребёнок» как символ общего поля пары или группы." },
      { number: 5, title: "Внутренний Свет", description: "Контакт с внутренним источником силы, творчеством и ощущением раскрытия энергетических центров." },
      { number: 6, title: "Миры Единства", description: "Глубокое успокоение, поддержка, подпитка, стабилизация и переживание более цельного внутреннего состояния." },
      { number: 7, title: "Озарение", description: "Усиление ясности и осознанности: внимание становится более собранным, а сознание — более светлым и устойчивым." },
      { number: 8, title: "Созидание Мира", description: "Переход от гармонизации к творческому импульсу: не только чувствовать поток, но и направлять внимание в создание нового." },
      { number: 9, title: "Полнота Единства", description: "Интеграция разных уровней опыта в состояние внутренней гармонии, наполненности, силы и баланса." },
    ],
  },
  en: {
    title: "The 9 levels at a glance",
    intro: "Each level deepens the same Tantra Reiki flow: from embodied sensitivity and connection toward inner support, clarity and creative expression.",
    levels: [
      { number: 1, title: "Activation & connection", description: "Awakening vitality and sexual energy, increasing sensitivity, attractiveness and the ability to bring more energy into a chosen situation." },
      { number: 2, title: "Fire of Life · energy and complexes", description: "Accumulating energy, the Money Magnet and Burn Away Complexes — faithfully following Andrey’s original Russian Level 2 attunements." },
      { number: 3, title: "Ocean of Unity · attunement and talisman", description: "Attunement with the world, Luck (acceleration of time) and Talisman — the attunements from the original Russian Level 3 text." },
      { number: 4, title: "Archetypal energies", description: "A transition toward higher symbolic themes: Enlightenment, Gods of Love and the “Astral Child” as an image of a shared couple or group field." },
      { number: 5, title: "Inner Light", description: "Contact with an inner source of strength, creativity and the image of opening the energy centres." },
      { number: 6, title: "Worlds of Unity", description: "Deep calming, support, nourishment, stabilisation and the experience of a more integrated inner state." },
      { number: 7, title: "Illumination", description: "Greater clarity and awareness: attention becomes more focused and consciousness is experienced as brighter and steadier." },
      { number: 8, title: "Creation of the World", description: "Moving from harmonising experience into creative impulse: not only sensing the flow, but directing attention toward creating something new." },
      { number: 9, title: "Fullness of Unity", description: "Integrating different layers of experience into inner harmony, fullness, strength and balance." },
    ],
  },
  es: {
    title: "Las 9 etapas de un vistazo",
    intro: "Cada etapa profundiza en el mismo flujo de Tantra Reiki: desde la sensibilidad corporal y la conexión hacia el apoyo interior, la claridad y la expresión creativa.",
    levels: [
      { number: 1, title: "Activación y conexión", description: "Despertar de la vitalidad y de la energía sexual, mayor sensibilidad, atractivo y capacidad de aportar energía a una situación elegida." },
      { number: 2, title: "Fuego de vida · energía y complejos", description: "Acumulación de energía, Imán del dinero y Disolver complejos, siguiendo el texto ruso original." },
      { number: 3, title: "Océano de unidad · sintonía y talismán", description: "Sintonización, Suerte y Talismán, según los nombres del tercer nivel en el texto original ruso." },
      { number: 4, title: "Energías arquetípicas", description: "Transición a temas simbólicos más elevados: Iluminación, Dioses del Amor y el «Niño Astral» como imagen de un campo compartido." },
      { number: 5, title: "Luz Interior", description: "Contacto con una fuente interior de fuerza, creatividad y la imagen de apertura de los centros energéticos." },
      { number: 6, title: "Mundos de Unidad", description: "Calma profunda, apoyo, nutrición, estabilización y una experiencia de mayor integración interna." },
      { number: 7, title: "Iluminación", description: "Mayor claridad y consciencia: la atención se vuelve más enfocada y la consciencia se siente más luminosa y estable." },
      { number: 8, title: "Creación del Mundo", description: "Paso de la armonización al impulso creativo: no solo sentir el flujo, sino orientar la atención hacia la creación de algo nuevo." },
      { number: 9, title: "Plenitud de la Unidad", description: "Integración de distintos niveles de experiencia en armonía interior, plenitud, fuerza y equilibrio." },
    ],
  },
};

export function AcademyRecordPage({ locale, record }: { locale: PublicLocale; record: AcademySourceRecord }) {
  const text = academyCopy[locale];
  const sourceNotice = sourceLanguageNotice(record, locale);
  const isCanonicalYggdrasil = record.routeKey === "reiki/yggdrasil";
  const isVerbatimTantraArchive = record.logicalId === "reiki/tantra-reiki";
  const archiveLocale: "en" | "ru" = locale === "ru" ? "ru" : "en";
  const mediaItems = mediaForRecord(record);
  const videos = mediaItems
    .map((item) => ({
      id: youtubeIdFromUrl(item.mediaUrl),
      url: item.mediaUrl,
      lessonTitle: locale === "ru" ? item.lessonTitle : (item.lessonTitleEn ?? item.lessonTitle),
      order: item.order,
    }))
    .filter((item): item is { id: string; url: string; lessonTitle: string | undefined; order: number | undefined } => Boolean(item.id))
    .concat(isVerbatimTantraArchive ? tantraReikiFullArchive.youtubeIds.map((id) => ({ id, url: "https://youtube.com/embed/" + id, lessonTitle: undefined, order: undefined })) : [])
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, 48);
  const sourceImages = isVerbatimTantraArchive ? tantraReikiFullArchive.images[archiveLocale] : [];
  const sourceVideos = isVerbatimTantraArchive ? tantraReikiFullArchive.html5Videos[archiveLocale] : [];
  const publicBlocks = isCanonicalYggdrasil ? [] : academyPublicBlocks(record, locale);
  const publicOmittedCount = isCanonicalYggdrasil ? 0 : academyPublicOmittedCount(record, locale);
  const hasBody = publicBlocks.some((block) => block.type !== "h1");
  const outline = publicBlocks.map((block, index) => ({ block, index })).filter(({ block }) => block.type === "h2" || block.type === "h3").slice(0, 32);
  return (
    <main className={"academy-reading-shell" + (isCanonicalYggdrasil || isVerbatimTantraArchive ? " academy-reading-shell--wide" : "") + (isCanonicalYggdrasil ? " academy-reading-shell--yggdrasil" : "") + (isVerbatimTantraArchive ? " academy-reading-shell--tantra" : "")} lang={locale}>
      <PublicSiteHeader locale={locale} /><AcademyBackLink locale={locale} />
      <div className={isCanonicalYggdrasil || isVerbatimTantraArchive ? "academy-course-layout" : undefined}>
        {isCanonicalYggdrasil ? <YggdrasilSideNavigation locale={locale} /> : null}
        {isVerbatimTantraArchive ? <TantraReikiSideNavigation locale={locale} levels={tantraReikiLevelSummary[locale].levels} /> : null}
        <article className="academy-reading">
        {!isCanonicalYggdrasil ? (
          <header className="academy-reading-header">
            <p className="homeopathy-kicker">{text.title}</p><h1>{academyDisplayTitle(record, locale)}</h1>
            <div className="academy-reading-meta"><span>{statusLabel(record, locale)}</span>{sourceNotice ? <span>{sourceNotice}</span> : null}</div>
          </header>
        ) : null}
        {isVerbatimTantraArchive ? (
          <>
            <section className="tantra-course-hero" aria-labelledby="tantra-course-hero-title">
              <div className="tantra-course-hero__copy">
                <span className="tantra-course-hero__tao-seal" aria-hidden="true">
                  <svg viewBox="0 0 100 100" focusable="false">
                    <circle cx="50" cy="50" r="47" fill="#f2d3a0" stroke="#ba864d" strokeWidth="2" />
                    <path d="M50 4 A46 46 0 0 1 50 96 A23 23 0 0 1 50 50 A23 23 0 0 0 50 4 Z" fill="#153f38" />
                    <circle cx="50" cy="27" r="7" fill="#153f38" />
                    <circle cx="50" cy="73" r="7" fill="#f2d3a0" />
                  </svg>
                </span>
                <p className="homeopathy-kicker">{locale === "ru" ? "Tantra Reiki · обучение · 9 ступеней" : locale === "es" ? "Tantra Reiki · formación · 9 etapas" : "Tantra Reiki · training · 9 levels"}</p>
                <h2 id="tantra-course-hero-title">{locale === "ru" ? "Почувствуйте поток. Углубите контакт. Научитесь с ним работать." : locale === "es" ? "Siente el flujo. Profundiza la conexión. Aprende a trabajar con él." : "Feel the flow. Deepen connection. Learn to work with it."}</h2>
                <p>{locale === "ru" ? "Девять ступеней — от пробуждения чувствительности и внутренней энергии до контакта, архетипов и творческого потока. Начните с первого шага." : locale === "es" ? "Un recorrido de nueve etapas, desde la sensibilidad corporal hasta la conexión, los arquetipos y la creatividad. Comienza por la primera etapa." : "Nine levels, from awakening sensitivity and inner vitality to connection, archetypes and creative flow. Begin with Level 1."}</p>
                <div className="tantra-course-stats">
                  <span>{locale === "ru" ? "9 последовательных ступеней" : locale === "es" ? "9 etapas progresivas" : "9 progressive levels"}</span>
                  <span>{locale === "ru" ? "Практика с партнёром" : locale === "es" ? "Prácticas en pareja" : "Partner practices"}</span>
                  <span>{locale === "ru" ? "Мандалы и ритуалы" : locale === "es" ? "Mandalas y rituales" : "Mandalas & rituals"}</span>
                </div>
                <div className="tantra-course-hero__actions">
                  <a className="tantra-course-hero__cta" href="#tantra-master-course">{locale === "ru" ? "Узнать о ближайшем обучении ↗" : locale === "es" ? "Consultar la próxima formación ↗" : "Enquire about training ↗"}</a>
                  <a href="#tantra-levels">{locale === "ru" ? "Посмотреть 9 ступеней ↓" : locale === "es" ? "Explorar las 9 etapas ↓" : "Explore the 9 levels ↓"}</a>
                </div>
                <p className="tantra-course-hero__note">{locale === "ru" ? "Даты, стоимость и формат участия уточняются лично. Все практики — по выбору и взаимному согласию." : locale === "es" ? "Consulta fechas, tarifas y formato. Todas las prácticas son voluntarias y consensuadas." : "Dates, fees and format are confirmed individually. All partner practices are optional and consent-based."}</p>
              </div>
              <figure className="tantra-course-hero__visual">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tantraReikiFullArchive.images.ru[12]} alt={locale === "ru" ? "Люди на настоящей тантрической встрече" : locale === "es" ? "Personas en un encuentro auténtico de Tantra" : "People together at an original Tantra gathering"} loading="eager" decoding="async" />
                <figcaption>{locale === "ru" ? "Реальная фотография из архива практик" : locale === "es" ? "Fotografía real del archivo" : "Real photograph from the practice archive"}</figcaption>
              </figure>
            </section>
            <TantraReikiFestivalMoments locale={locale} />
            <section className="tantra-level-summary" id="tantra-levels" aria-labelledby="tantra-level-summary-title"><TantraReikiJourney locale={locale} /></section>
            {locale === "en" ? <EnglishGuidedMeditations focus="tantra-reiki" /> : null}
            <TantraReikiTestimonials locale={locale} />
          </>
        ) : null}
        {!isVerbatimTantraArchive && outline.length >= 2 ? <nav className="academy-outline" aria-label={locale === "ru" ? "Содержание программы" : locale === "es" ? "Contenido del programa" : "Program contents"}><p>{locale === "ru" ? "Содержание" : locale === "es" ? "Contenido" : "Contents"}</p><ol>{outline.map(({ block, index }) => <li className={block.type === "h3" ? "academy-outline-subitem" : undefined} key={index}><a href={"#academy-section-" + index}>{block.text}</a></li>)}</ol></nav> : null}
        {record.routeKey === "history" ? <section className="academy-history-links" aria-label="Academy history"><Link href={"/" + locale + "/academy/history/faculties"}>{locale === "ru" ? "Исторические факультеты и традиции" : locale === "es" ? "Facultades y tradiciones históricas" : "Historical faculties & traditions"}<span aria-hidden="true">→</span></Link><Link href={"/" + locale + "/academy/history/student-experiences"}>{locale === "ru" ? "Исторические отзывы студентов" : locale === "es" ? "Experiencias históricas de estudiantes" : "Historical student experiences"}<span aria-hidden="true">→</span></Link></section> : null}
        {isCanonicalYggdrasil ? (
          <YggdrasilProgramLanding locale={locale} />
        ) : isVerbatimTantraArchive ? (
          <TantraReikiProgrammeModules locale={locale} publicBlocks={publicBlocks} />
        ) : hasBody ? <div className="academy-source-content">{renderBlocks(publicBlocks)}</div> : <p className="academy-empty-source">{text.noContent}</p>}
        {!isVerbatimTantraArchive && (sourceVideos.length || videos.length) ? (
          <section className="academy-media-section" aria-label={text.videos}>
            <h2>{text.videos}</h2>
            {sourceVideos.length ? <div className="academy-native-video-grid">{sourceVideos.map((video, index) => <figure className="academy-native-video" key={video.src}><video controls playsInline preload="metadata" poster={video.poster ?? undefined}><source src={video.src} type={video.type} /></video><figcaption>{locale === "ru" ? "Видео из исходной страницы" : locale === "es" ? "Video de la página fuente" : "Video from the source page"} {index + 1}</figcaption></figure>)}</div> : null}
            {videos.length ? <div className="academy-video-grid">{videos.map((video, index) => <AcademyVideoPlayer key={video.id} youtubeId={video.id} title={video.lessonTitle ?? academyDisplayTitle(record, locale) + " — video " + (index + 1)} />)}</div> : null}
          </section>
        ) : null}
        {!isVerbatimTantraArchive && sourceImages.length ? (
          <section className="academy-source-gallery-section" aria-label={locale === "ru" ? "Фото и материалы" : locale === "es" ? "Fotos y materiales" : "Photos and materials"}>
            <h2>{locale === "ru" ? "Фото и материалы из исходной страницы" : locale === "es" ? "Fotos y materiales de la página fuente" : "Source photos and materials"}</h2>
            <div className="academy-source-gallery">{sourceImages.map((src, index) => <a href={src} target="_blank" rel="noreferrer" key={src} aria-label={(locale === "ru" ? "Открыть исходное изображение " : locale === "es" ? "Abrir imagen de origen " : "Open source image ") + (index + 1)}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt={academyDisplayTitle(record, locale) + " — " + (locale === "ru" ? "материал " : locale === "es" ? "material " : "source material ") + (index + 1)} loading="lazy" decoding="async" /></a>)}</div>
          </section>
        ) : null}
        {isVerbatimTantraArchive ? <TantraReikiTeacher locale={locale} /> : null}
        {isVerbatimTantraArchive ? <TantraReikiLeadForms locale={locale} /> : null}
        <section className="academy-resource-links" aria-label={text.reading}><Link href={"/" + locale + "/library"}>{text.reading}<span aria-hidden="true">→</span></Link><Link href={"/" + locale + "/services"}>{text.services}<span aria-hidden="true">→</span></Link></section>
        <footer className="academy-source-footer">
          {isCanonicalYggdrasil ? (
            <>
              <a href="https://reiki-yggdrasil.vercel.app/" rel="noreferrer" target="_blank">
                {locale === "ru" ? "Актуальный сайт Reiki Yggdrasil" : locale === "es" ? "Sitio actual de Reiki Yggdrasil" : "Current Reiki Yggdrasil site"}
                <span aria-hidden="true">↗</span>
              </a>
              <a className="academy-secondary-source" href={record.sourceUrl} rel="noreferrer" target="_blank">
                {locale === "ru" ? "Исторический источник PsiTrends" : locale === "es" ? "Fuente histórica de PsiTrends" : "Historical PsiTrends source"}
                <span aria-hidden="true">↗</span>
              </a>
            </>
          ) : (
            <>
              {record.skippedRiskyBlocks || publicOmittedCount ? <p>{text.filtered}</p> : null}
              <a href={record.sourceUrl} rel="noreferrer" target="_blank">{text.source}<span aria-hidden="true">↗</span></a>
            </>
          )}
          {isCanonicalYggdrasil ? <code>reiki-yggdrasil@3fd7960aa77862c38f8a5754b64c3a79f5e0c96a</code> : record.contentHash ? <code>{record.hashAlgorithm ?? "hash"} {record.contentHash}</code> : null}
        </footer>
        </article>
      </div>
      {!isCanonicalYggdrasil && !isVerbatimTantraArchive ? <PublicConsultationCta locale={locale} /> : null}
    </main>
  );
}

export function makeFacultiesRecord(record: AcademySourceRecord, locale: PublicLocale): AcademySourceRecord {
  const start = record.content.findIndex((block) => /study areas.*facult|факульт|направлен.*обуч/i.test(block.text));
  const source = start >= 0 ? record.content.slice(start + 1) : record.content;
  const end = source.findIndex((block) => /specializations|специализац/i.test(block.text));
  const content = (end >= 0 ? source.slice(0, end) : source).filter((block) => block.type !== "h1");
  return { ...record, logicalId: "history/faculties", routeKey: "history/faculties", title: locale === "ru" ? "Исторические факультеты и традиции" : locale === "es" ? "Facultades y tradiciones históricas" : "Historical faculties & traditions", content };
}
