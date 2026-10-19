import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Link from "next/link";
import type { ReactNode } from "react";

import { AcademyBackLink } from "@/components/academy-hub";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { EnglishGuidedMeditations } from "@/components/english-guided-meditations";
import { YggdrasilProgramLanding } from "@/components/yggdrasil-program-landing";
import { YggdrasilLeadForms } from "@/components/reiki-landing-forms";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { TantraReikiLeadForms } from "@/components/tantra-reiki-lead-forms";
import { TantraReikiFestivalMoments, TantraReikiTeacher } from "@/components/tantra-reiki-story";
import { TantraReikiProgrammeModules } from "@/components/tantra-reiki-programme-modules";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TantraReikiSideNavigation, YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import { TantraReikiJourney, TantraReikiOverviewLinks } from "@/components/tantra-reiki-journey";
import { TantraReikiTestimonials } from "@/components/tantra-reiki-testimonials";
import { academyCopy, academyDisplayTitle, academyPublicBlocks, academyPublicOmittedCount, mediaForRecord, sourceLanguageNotice, youtubeIdFromUrl, type AcademyBlock, type AcademySourceRecord } from "@/data/academy/catalog";
import tantraReikiFullArchive from "@/data/academy/tantra-reiki-full.generated.json";
import { reikiPhotoUrl } from "@/lib/academy/reiki-photo";
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
                <p className="homeopathy-kicker">{locale === "ru" ? "Тантра Рейки · первая ступень · Родник жизни" : locale === "es" ? "Tantra Reiki · Nivel 1 · Manantial de vida" : "Tantra Reiki · Level 1 · Spring of Life"}</p>
                <h2 id="tantra-course-hero-title">{locale === "ru" ? "Первая ступень Тантра Рейки: «Родник жизни»" : locale === "es" ? "Tantra Reiki Nivel 1: Manantial de vida" : "Tantra Reiki Level 1: Spring of Life"}</h2>
                <p>{locale === "ru" ? "Начните с самого главного: научитесь замечать телесные ощущения, развивать чувствительность и осознанный контакт с собой и другим человеком. Необязательно изучать все девять ступеней сразу." : locale === "es" ? "Empieza por lo esencial: reconocer sensaciones, cultivar la sensibilidad y relacionarte con atención y consentimiento. No necesitas estudiar los nueve niveles de una vez." : "Begin with what matters: notice your sensations, explore sensitivity and develop mindful, consent-based connection. You do not need to study all nine levels at once."}</p>
                <div className="tantra-course-stats">
                  <span>{locale === "ru" ? "1-я ступень · Родник жизни" : locale === "es" ? "Nivel 1 · Manantial de vida" : "Level 1 · Spring of Life"}</span>
                  <span>{locale === "ru" ? "3 традиционные настройки" : locale === "es" ? "3 sintonizaciones tradicionales" : "3 traditional attunements"}</span>
                  <span>{locale === "ru" ? "Знакомство бесплатно" : locale === "es" ? "Introducción gratuita" : "Free introduction available"}</span>
                </div>
                <div className="tantra-course-hero__actions">
                  <Link className="tantra-course-hero__cta" href={"/" + locale + "/academy/reiki/tantra-reiki/free-initiation"}>{locale === "ru" ? "Получить Тантра Рейки 1-ю ступень в подарок ↗" : locale === "es" ? "Recibir Tantra Reiki Nivel 1 de regalo ↗" : "Get Tantra Reiki Level 1 as a gift ↗"}</Link>
                  <Link className="tantra-course-hero__tests-cta" href={"/" + locale + "/client/tests?focus=tantra"}>{locale === "ru" ? "Пройти бесплатные тантрические тесты ↗" : locale === "es" ? "Hacer los tests tántricos gratuitos ↗" : "Take free Tantra self-reflection tests ↗"}</Link>
                  <div className="tantra-course-hero__secondary-links">
                    <a href="#tantra-level-1">{locale === "ru" ? "Что изучим на 1-й ступени ↓" : locale === "es" ? "Qué aprenderás en Nivel 1 ↓" : "What you learn in Level 1 ↓"}</a>
                    <Link href={REIKI_FREE_COURSE_PATH}>{locale === "ru" ? "Попробовать бесплатный курс из 5 уроков ↗" : locale === "es" ? "Probar el curso gratis de 5 lecciones ↗" : "Try the free 5-lesson course ↗"}</Link>
                    <a href="#tantra-next-levels">{locale === "ru" ? "Остальные ступени (2–9) ↓" : locale === "es" ? "Otros niveles (2–9) ↓" : "Other levels (2–9) ↓"}</a>
                    <a className="tantra-course-hero__guide" href={"/api/academy/reiki-guide?course=tantra&locale=" + locale}>{locale === "ru" ? "Скачать PDF для телефона ↓" : locale === "es" ? "Descargar guía móvil ↓" : "Get the mobile PDF ↓"}</a>
                  </div>
                </div>
                <p className="tantra-course-hero__note">{locale === "ru" ? "Подарок — бесплатная вводная инициация 1-й ступени по согласованию с Андреем. Тесты — для самопознания, не диагностики. Все практики добровольны и по согласию." : locale === "es" ? "El regalo es una iniciación introductoria gratuita del Nivel 1, sujeta a la confirmación de Andrey. Los tests son para la reflexión personal, no para diagnosticar." : "The gift is a free introductory Level 1 initiation, subject to Andrey's confirmation. The tests support self-reflection, not diagnosis. All practices are optional and consent-based."}</p>
              </div>
              <figure className="tantra-course-hero__visual">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reikiPhotoUrl(tantraReikiFullArchive.images.ru[12], 1200)} alt={locale === "ru" ? "Люди на настоящей тантрической встрече" : locale === "es" ? "Personas en un encuentro auténtico de Tantra" : "People together at an original Tantra gathering"} loading="eager" decoding="async" />
                <figcaption>{locale === "ru" ? "Реальная фотография из архива практик" : locale === "es" ? "Fotografía real del archivo" : "Real photograph from the practice archive"}</figcaption>
              </figure>
            </section>
            <section className="tantra-level-summary" aria-label={locale === "ru" ? "Первая ступень и остальные по желанию" : locale === "es" ? "Nivel 1 y niveles posteriores opcionales" : "Level 1 first; optional later levels"}><TantraReikiJourney locale={locale} /></section>
            <section className="tantra-mobile-guide tantra-mobile-guide--combined" id="tantra-levels" aria-labelledby="tantra-mobile-guide-heading">
              <div className="tantra-mobile-guide__cover" aria-hidden="true">
                <span>HOLISTIC HOUSE</span>
                <div className="tantra-mobile-guide__ornament"><span>✦</span></div>
                <strong>Tantra<br />Reiki</strong>
                <small>{locale === "ru" ? "9 СТУПЕНЕЙ · ДЛЯ ТЕЛЕФОНА" : locale === "es" ? "9 ETAPAS · EDICIÓN MÓVIL" : "9 LEVELS · MOBILE EDITION"}</small>
              </div>
              <div className="tantra-mobile-guide__copy">
                <p className="homeopathy-kicker">{locale === "ru" ? "9 СТУПЕНЕЙ · БЕСПЛАТНЫЙ PDF" : locale === "es" ? "9 ETAPAS · GUÍA PDF GRATIS" : "9 LEVELS · FREE MOBILE PDF"}</p>
                <h2 id="tantra-mobile-guide-heading">{locale === "ru" ? "Тантра Рейки: девять ступеней" : locale === "es" ? "Tantra Reiki: nueve etapas" : "Tantra Reiki: the nine levels"}</h2>
                <p>{locale === "ru" ? "Настройки и упражнения каждой ступени. Скачайте бесплатную методичку с крупным шрифтом." : locale === "es" ? "Sintonizaciones y prácticas de cada etapa. Descarga gratis la guía con letra grande para el móvil." : "Explore attunements and practical exercises. Download the free large-print guide for your phone."}</p>
                <a className="tantra-mobile-guide__download" href={"/api/academy/reiki-guide?course=tantra&locale=" + locale}>{locale === "ru" ? "Скачать PDF бесплатно ↓" : locale === "es" ? "Descargar PDF gratis ↓" : "Download free PDF ↓"}</a>
                <TantraReikiOverviewLinks locale={locale} />
              </div>
            </section>
            <TantraReikiFestivalMoments locale={locale} />
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
            <div className="academy-source-gallery">{sourceImages.map((src, index) => <a href={src} target="_blank" rel="noreferrer" key={src} aria-label={(locale === "ru" ? "Открыть исходное изображение " : locale === "es" ? "Abrir imagen de origen " : "Open source image ") + (index + 1)}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={reikiPhotoUrl(src, 640)} alt={academyDisplayTitle(record, locale) + " — " + (locale === "ru" ? "материал " : locale === "es" ? "material " : "source material ") + (index + 1)} loading="lazy" decoding="async" /></a>)}</div>
          </section>
        ) : null}
        <section className="academy-resource-links" aria-label={text.reading}><Link href={"/" + locale + "/library"}>{text.reading}<span aria-hidden="true">→</span></Link><Link href={"/" + locale + "/services"}>{text.services}<span aria-hidden="true">→</span></Link></section>
        {isCanonicalYggdrasil ? <YggdrasilLeadForms locale={locale} placement="bottom" /> : null}
        {!isCanonicalYggdrasil ? (
          <footer className="academy-source-footer">
            {!isVerbatimTantraArchive && (record.skippedRiskyBlocks || publicOmittedCount) ? <p>{text.filtered}</p> : null}
            <a href={record.sourceUrl} rel="noreferrer" target="_blank">{text.source}<span aria-hidden="true">↗</span></a>
            {record.contentHash ? <code>{record.hashAlgorithm ?? "hash"} {record.contentHash}</code> : null}
          </footer>
        ) : null}
        {isVerbatimTantraArchive ? <TantraReikiTeacher locale={locale} /> : null}
        {isVerbatimTantraArchive ? <TantraReikiLeadForms locale={locale} /> : null}
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
