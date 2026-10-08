import Link from "next/link";
import type { ReactNode } from "react";

import { AcademyBackLink } from "@/components/academy-hub";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { YggdrasilProgramLanding } from "@/components/yggdrasil-program-landing";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TantraReikiSideNavigation, YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import { TantraReikiJourney } from "@/components/tantra-reiki-journey";
import { academyCopy, academyDisplayTitle, academyPublicBlocks, academyPublicOmittedCount, mediaForRecord, sourceLanguageNotice, youtubeIdFromUrl, type AcademyBlock, type AcademySourceRecord } from "@/data/academy/catalog";
import tantraReikiFullArchive from "@/data/academy/tantra-reiki-full.generated.json";
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
      { number: 2, title: "Накопление и сонастройка", description: "Накопление внутренней энергии, настройка на другого человека или группу, работа с темой материального потока и внутренней собранности." },
      { number: 3, title: "Единство, очищение и удача", description: "Более глубокое чувство связи с миром, отпускание напряжений и блоков, развитие интуитивного ощущения удачного хода событий." },
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
      { number: 2, title: "Accumulation & attunement", description: "Building inner energy, attuning with another person or group, and working with themes of material flow and inner coherence." },
      { number: 3, title: "Unity, clearing & luck", description: "A deeper sense of connection with the world, release of tension and blocks, and a more intuitive sense of favourable movement." },
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
      { number: 2, title: "Acumulación y sintonización", description: "Acumulación de energía interior, sintonización con otra persona o grupo y trabajo simbólico con el flujo material y la coherencia interna." },
      { number: 3, title: "Unidad, liberación y suerte", description: "Una conexión más profunda con el mundo, liberación de tensiones y bloqueos y un sentido más intuitivo del curso favorable de los acontecimientos." },
      { number: 4, title: "Energías arquetípicas", description: "Transición a temas simbólicos más elevados: Iluminación, Dioses del Amor y el «Niño Astral» como imagen de un campo compartido." },
      { number: 5, title: "Luz Interior", description: "Contacto con una fuente interior de fuerza, creatividad y la imagen de apertura de los centros energéticos." },
      { number: 6, title: "Mundos de Unidad", description: "Calma profunda, apoyo, nutrición, estabilización y una experiencia de mayor integración interna." },
      { number: 7, title: "Iluminación", description: "Mayor claridad y consciencia: la atención se vuelve más enfocada y la consciencia se siente más luminosa y estable." },
      { number: 8, title: "Creación del Mundo", description: "Paso de la armonización al impulso creativo: no solo sentir el flujo, sino orientar la atención hacia la creación de algo nuevo." },
      { number: 9, title: "Plenitud de la Unidad", description: "Integración de distintos niveles de experiencia en armonía interior, plenitud, fuerza y equilibrio." },
    ],
  },
};

const tantraReikiPhases: Record<PublicLocale, Array<{ range: string; title: string; description: string }>> = {
  ru: [
    { range: "1–3", title: "Основа и чувствительность", description: "Контакт с телом и потоком, накопление энергии, сонастройка и переживание единства." },
    { range: "4–6", title: "Архетипы и внутренний ресурс", description: "Архетипические энергии, Внутренний Свет, поддержка и более цельное состояние." },
    { range: "7–9", title: "Ясность и интеграция", description: "Озарение, созидательный импульс и объединение опыта в состояние внутренней полноты." },
  ],
  en: [
    { range: "1–3", title: "Foundation & sensitivity", description: "Embodied contact, energy accumulation, attunement and the experience of unity." },
    { range: "4–6", title: "Archetypes & inner resource", description: "Archetypal energies, Inner Light, support and a more integrated inner state." },
    { range: "7–9", title: "Clarity & integration", description: "Illumination, creative impulse and integration of experience into inner fullness." },
  ],
  es: [
    { range: "1–3", title: "Base y sensibilidad", description: "Contacto corporal, acumulación de energía, sintonización y experiencia de unidad." },
    { range: "4–6", title: "Arquetipos y recurso interior", description: "Energías arquetípicas, Luz Interior, apoyo y un estado más integrado." },
    { range: "7–9", title: "Claridad e integración", description: "Iluminación, impulso creativo e integración de la experiencia." },
  ],
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
    <main className={"academy-reading-shell" + (isCanonicalYggdrasil || isVerbatimTantraArchive ? " academy-reading-shell--wide" : "") + (isCanonicalYggdrasil ? " academy-reading-shell--yggdrasil" : "")} lang={locale}>
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
                <p className="homeopathy-kicker">{locale === "ru" ? "Tantra Reiki · 9 ступеней" : locale === "es" ? "Tantra Reiki · 9 etapas" : "Tantra Reiki · 9 levels"}</p>
                <h2 id="tantra-course-hero-title">
                  {locale === "ru" ? "Понятная карта системы — без необходимости читать архив целиком" : locale === "es" ? "Un mapa claro del sistema antes del archivo completo" : "A clear map of the system before the full archive"}
                </h2>
                <p>{tantraReikiLevelSummary[locale].intro}</p>
                <div className="tantra-course-stats">
                  <span>9 {locale === "ru" ? "ступеней" : locale === "es" ? "etapas" : "levels"}</span>
                  <span>{videos.length + sourceVideos.length} {locale === "ru" ? "видео" : locale === "es" ? "videos" : "videos"}</span>
                  <span>{sourceImages.length} {locale === "ru" ? "изображений" : locale === "es" ? "imágenes" : "source images"}</span>
                  <span>{locale === "ru" ? "полный исходный текст сохранён" : locale === "es" ? "texto fuente completo conservado" : "full source text preserved"}</span>
                </div>
                <nav className="tantra-course-nav" aria-label={locale === "ru" ? "Навигация по курсу" : locale === "es" ? "Navegación del curso" : "Course navigation"}>
                  <a href="#tantra-levels">{locale === "ru" ? "9 ступеней" : locale === "es" ? "9 etapas" : "9 levels"}</a>
                  <a href="#tantra-media">{locale === "ru" ? "Видео и материалы" : locale === "es" ? "Videos y materiales" : "Videos & materials"}</a>
                  <a href="#tantra-full-source">{locale === "ru" ? "Полный текст системы" : locale === "es" ? "Texto completo" : "Full system text"}</a>
                </nav>
              </div>
              <div className="tantra-phase-grid">
                {tantraReikiPhases[locale].map((phase) => (
                  <article key={phase.range}>
                    <span>{phase.range}</span>
                    <h3>{phase.title}</h3>
                    <p>{phase.description}</p>
                  </article>
                ))}
              </div>
            </section>
            <section className="tantra-level-summary" id="tantra-levels" aria-labelledby="tantra-level-summary-title"><TantraReikiJourney locale={locale} /></section>
          </>
        ) : null}
        {!isVerbatimTantraArchive && outline.length >= 2 ? <nav className="academy-outline" aria-label={locale === "ru" ? "Содержание программы" : locale === "es" ? "Contenido del programa" : "Program contents"}><p>{locale === "ru" ? "Содержание" : locale === "es" ? "Contenido" : "Contents"}</p><ol>{outline.map(({ block, index }) => <li className={block.type === "h3" ? "academy-outline-subitem" : undefined} key={index}><a href={"#academy-section-" + index}>{block.text}</a></li>)}</ol></nav> : null}
        {record.routeKey === "history" ? <section className="academy-history-links" aria-label="Academy history"><Link href={"/" + locale + "/academy/history/faculties"}>{locale === "ru" ? "Исторические факультеты и традиции" : locale === "es" ? "Facultades y tradiciones históricas" : "Historical faculties & traditions"}<span aria-hidden="true">→</span></Link><Link href={"/" + locale + "/academy/history/student-experiences"}>{locale === "ru" ? "Исторические отзывы студентов" : locale === "es" ? "Experiencias históricas de estudiantes" : "Historical student experiences"}<span aria-hidden="true">→</span></Link></section> : null}
        {isVerbatimTantraArchive && (sourceVideos.length || videos.length || sourceImages.length) ? (
          <section className="tantra-media-library" id="tantra-media">
            <div className="tantra-section-heading">
              <div>
                <p className="homeopathy-kicker">{locale === "ru" ? "Медиаархив" : locale === "es" ? "Archivo multimedia" : "Media archive"}</p>
                <h2>{locale === "ru" ? "Видео и визуальные материалы системы" : locale === "es" ? "Videos y materiales visuales del sistema" : "Videos and visual materials from the system"}</h2>
                <p>{locale === "ru" ? "Материалы вынесены выше полного текста, чтобы их было легко найти. Исходные формулировки курса остаются ниже без потерь." : locale === "es" ? "Los materiales aparecen antes del texto completo para que sean fáciles de encontrar." : "Media is surfaced before the long historical text so it is easy to find. The complete source wording remains preserved below."}</p>
              </div>
            </div>
            {sourceVideos.length ? <div className="academy-native-video-grid">{sourceVideos.map((video, index) => <figure className="academy-native-video" key={video.src}><video controls playsInline preload="metadata" poster={video.poster ?? undefined}><source src={video.src} type={video.type} /></video><figcaption>{locale === "ru" ? "Видео из исходной страницы" : locale === "es" ? "Video de la página fuente" : "Video from the source page"} {index + 1}</figcaption></figure>)}</div> : null}
            {videos.length ? <div className="academy-video-grid tantra-youtube-grid">{videos.map((video, index) => <AcademyVideoPlayer key={video.id} youtubeId={video.id} title={video.lessonTitle ?? academyDisplayTitle(record, locale) + " — video " + (index + 1)} />)}</div> : null}
            {sourceImages.length ? (
              <div className="tantra-source-strip" aria-label={locale === "ru" ? "Фото и материалы" : locale === "es" ? "Fotos y materiales" : "Photos and materials"}>
                {sourceImages.map((src, index) => <a href={src} target="_blank" rel="noreferrer" key={src}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt={academyDisplayTitle(record, locale) + " — " + (locale === "ru" ? "материал " : locale === "es" ? "material " : "source material ") + (index + 1)} loading="lazy" decoding="async" /></a>)}
              </div>
            ) : null}
          </section>
        ) : null}
        {isVerbatimTantraArchive ? (
          <aside className="academy-archive-notice">
            {locale === "ru"
              ? "Архивный материал перенесён без пересказа. Формулировки исходной страницы сохранены как исторический источник; старые заявления о здоровье, исцелении, эффективности, сертификации и условиях участия не являются текущей медицинской рекомендацией или гарантией результата."
              : locale === "es"
                ? "Este material de archivo se ha trasladado sin resumir. Las afirmaciones históricas sobre salud, curación, eficacia, certificación o condiciones de participación se conservan como parte de la fuente y no constituyen consejo médico actual ni garantía de resultados."
                : "This archival material is reproduced without summarizing. Historical claims about health, healing, effectiveness, certification or participation terms are preserved as part of the source and are not current medical advice or a guarantee of results."}
          </aside>
        ) : null}
        {isCanonicalYggdrasil ? (
          <YggdrasilProgramLanding locale={locale} />
        ) : isVerbatimTantraArchive && hasBody ? (
          <section className="tantra-full-source" id="tantra-full-source">
            <div className="tantra-section-heading">
              <div>
                <p className="homeopathy-kicker">{locale === "ru" ? "Полный архив" : locale === "es" ? "Archivo completo" : "Complete archive"}</p>
                <h2>{locale === "ru" ? "Полный текст системы Тантра Рейки" : locale === "es" ? "Texto completo del sistema Tantra Reiki" : "Complete Tantra Reiki system text"}</h2>
                <p>{locale === "ru" ? "Ниже сохранён полный исторический текст без пересказа. Ключевая структура курса уже вынесена выше." : locale === "es" ? "El texto histórico completo se conserva a continuación sin resumir." : "The complete historical source text is preserved below without summarising; the key course structure is already surfaced above."}</p>
              </div>
            </div>
            <div className="academy-source-content">{renderBlocks(publicBlocks)}</div>
          </section>
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
      <PublicConsultationCta locale={locale} />
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
