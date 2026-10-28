import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Link from "next/link";
import type { ReactNode } from "react";

import { AcademyBackLink } from "@/components/academy-hub";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { getServiceVideoMedia } from "@/data/service-video-library";
import loveIntroStyles from "./academy-love-mysteries-intro.module.css";
import { AcademyCourseVideoPlaylist } from "@/components/academy-course-video-playlist";
import { EnglishGuidedMeditations } from "@/components/english-guided-meditations";
import { YggdrasilProgramLanding } from "@/components/yggdrasil-program-landing";
import { YggdrasilLeadForms } from "@/components/reiki-landing-forms";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { TantraReikiLeadForms } from "@/components/tantra-reiki-lead-forms";
import { TantraReikiFestivalMoments, TantraReikiTeacher } from "@/components/tantra-reiki-story";
import { TantraReikiProgrammeModules } from "@/components/tantra-reiki-programme-modules";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TantraReikiSideNavigation, YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import { TantraReikiJourney } from "@/components/tantra-reiki-journey";
import { TantraReikiTestimonials } from "@/components/tantra-reiki-testimonials";
import { academyCopy, academyDisplayTitle, academyPublicBlocks, academyPublicOmittedCount, findAcademyRecord, mediaForRecord, sourceLanguageNotice, youtubeIdFromUrl, type AcademyBlock, type AcademySourceRecord } from "@/data/academy/catalog";
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

// PsiMaster historical curricula and original lesson recordings share related
// subject matter, but not an identical syllabus. Preserve each original route.
const originalMysteryVideoIds: Record<string, string[]> = {
  "mysteries/maya-aztec/feathered-serpent": ["videos/maya-archetypes"],
  "mysteries/egypt/high-wisdom": ["videos/egypt-osiris"],
  "mysteries/greece-rome/beauty-and-power": ["videos/greek-mysteries-demeter", "videos/greek-mysteries-dionysus"],
};

export function AcademyRecordPage({ locale, record }: { locale: PublicLocale; record: AcademySourceRecord }) {
  const text = academyCopy[locale];
  const sourceNotice = sourceLanguageNotice(record, locale);
  const isCanonicalYggdrasil = record.routeKey === "reiki/yggdrasil";
  const isVerbatimTantraArchive = record.logicalId === "reiki/tantra-reiki";
  // The RU approved overview mentions systemic constellations; the EN original is a real case.
  const loveVideo = record.logicalId === "mysteries/archetypes-of-love"
    ? getServiceVideoMedia(locale === "ru" ? "overview" : "constellation-case", locale)
    : null;
  const archiveLocale: "en" | "ru" = locale === "ru" ? "ru" : "en";
  const mediaItems = mediaForRecord(record);
  const allVideos = mediaItems
    .map((item) => ({
      id: youtubeIdFromUrl(item.mediaUrl),
      url: item.mediaUrl,
      lessonTitle: locale === "ru" ? item.lessonTitle : (item.lessonTitleEn ?? item.lessonTitle),
      order: item.order,
    }))
    .filter((item): item is { id: string; url: string; lessonTitle: string | undefined; order: number | undefined } => Boolean(item.id))
    .concat(isVerbatimTantraArchive ? tantraReikiFullArchive.youtubeIds.map((id) => ({ id, url: "https://youtube.com/embed/" + id, lessonTitle: undefined, order: undefined })) : [])
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  // A native video course always shows every original lesson. Other archive
  // pages retain their existing media cap for layout and performance.
  const videos = record.direction === "videos" ? allVideos : allVideos.slice(0, 48);
  const relatedMysteryVideos = locale === "ru"
    ? (originalMysteryVideoIds[record.logicalId] ?? []).flatMap((logicalId) => {
      const originalVideo = findAcademyRecord(logicalId, locale);
      if (!originalVideo) return [];
      const videoCount = mediaForRecord(originalVideo)
        .filter((media) => Boolean(youtubeIdFromUrl(media.mediaUrl))).length;
      return videoCount ? [{
        id: logicalId,
        title: academyDisplayTitle(originalVideo, locale),
        href: "/" + locale + "/academy/" + originalVideo.routeKey,
        videoCount,
      }] : [];
    })
    : [];
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
        {!isCanonicalYggdrasil && !isVerbatimTantraArchive ? (
          <header className="academy-reading-header">
            <p className="homeopathy-kicker">{text.title}</p><h1>{academyDisplayTitle(record, locale)}</h1>
            <div className="academy-reading-meta"><span>{statusLabel(record, locale)}</span>{sourceNotice ? <span>{sourceNotice}</span> : null}</div>
          </header>
        ) : null}

        {loveVideo?.video.youtubeId ? (
          <section className={loveIntroStyles.intro} data-academy-love-intro data-video-language={loveVideo.video.language}
            aria-label={locale === "ru" ? "Введение: личные расстановки-мистерии" : locale === "es" ? "Introducción: constelaciones personales" : "Introduction: personal constellation mysteries"}>
            <div className={loveIntroStyles.media}>
              <p className={loveIntroStyles.eyebrow}>{locale === "ru" ? "Видео · системные расстановки" : locale === "es" ? "Vídeo · constelaciones sistémicas" : "Video · systemic constellations"}</p>
              <AcademyVideoPlayer youtubeId={loveVideo.video.youtubeId} title={loveVideo.video.title} locale={locale} posterLoading="eager" />
              <p className={loveIntroStyles.caption}>{locale === "ru"
                ? "На русском: Андрей объясняет, как выбирает метод, в том числе системные расстановки."
                : locale === "es"
                  ? "Audio en inglés: ejemplo de constelaciones aplicadas a una situación empresarial."
                  : "In English: an example of systemic constellations in a business situation."}</p>
            </div>
            <div className={loveIntroStyles.copy}>
              <p className={loveIntroStyles.eyebrow}>{locale === "ru" ? "О курсе" : locale === "es" ? "Sobre el curso" : "About the course"}</p>
              <h2>{locale === "ru" ? "Личные расстановки-мистерии" : locale === "es" ? "Misterios de constelación personal" : "Personal constellation mysteries"}</h2>
              <p>{locale === "ru"
                ? "Этот курс — серия личных расстановок-мистерий по отдельным темам для внутренней трансформации."
                : locale === "es"
                  ? "Este curso es una serie de constelaciones-misterio personales, cada una dedicada a un tema para la transformación interior."
                  : "This course is a series of personal constellation-mysteries, each exploring a theme for inner transformation."}</p>
              <p>{locale === "ru"
                ? "Восемь встреч приглашают исследовать любовь, близость, свободу и внутренние образы через символическую работу. Опыт и результаты индивидуальны."
                : locale === "es"
                  ? "Ocho encuentros para explorar el amor, la intimidad, la libertad y los arquetipos. Cada experiencia es individual."
                  : "Eight themed sessions invite you to explore love, intimacy, freedom and archetypal patterns. Each person's experience is individual."}</p>
            </div>
          </section>
        ) : null}
        {["videos/egypt-osiris", "mysteries/egypt/high-wisdom"].includes(record.logicalId) ? (
          <aside className="academy-archive-notice" data-egypt-course-invitation>
            <strong>{locale === "ru" ? "Египетское жречество — новый видеокурс" : locale === "es" ? "Sacerdocio egipcio — nuevo videocurso" : "Egyptian Priesthood — interactive video course"}</strong>
            <p>{locale === "ru" ? "Семь оригинальных записей Осириса, короткие экраны, вопросы и практика — по образцу курса «Практик Рейки»."
              : locale === "es" ? "Siete vídeos originales de Osiris, prácticas y reflexión, una idea por pantalla."
              : "Seven original Osiris videos, guided screens and reflective practice, based on the Reiki Practitioner format."}</p>
            <Link href={"/" + locale + "/academy/egyptian-priesthood"} prefetch={false}>
              {locale === "ru" ? "Открыть программу →" : locale === "es" ? "Abrir programa →" : "Open programme →"}
            </Link>
          </aside>
        ) : null}
        {relatedMysteryVideos.length > 0 ? (
          <section className="academy-mystery-video-bridge" aria-label="Оригинальные русскоязычные видеокурсы PsiMaster">
            <h2>Оригинальные видеоуроки из PsiMaster</h2>
            <p>Сохранённые записи отдельных циклов. Полная программа выше включает и темы, для которых видеозаписи пока не подтверждены.</p>
            <div className="academy-resource-links">
              {relatedMysteryVideos.map((video) => (
                <Link key={video.id} href={video.href} prefetch={false}>
                  {video.title} · {video.videoCount} видео <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        {isVerbatimTantraArchive ? (
          <>
            <section className="tantra-course-hero reiki-screen reiki-screen--hero" aria-labelledby="tantra-course-hero-title">
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
                <h1 id="tantra-course-hero-title">{locale === "ru" ? "Первая ступень Тантра Рейки: «Родник жизни»" : locale === "es" ? "Tantra Reiki Nivel 1: Manantial de vida" : "Tantra Reiki Level 1: Spring of Life"}</h1>
                <p>{locale === "ru" ? "Начните с телесной чувствительности, внимания к себе и бережного контакта. Для начала достаточно первой ступени." : locale === "es" ? "Empieza con la sensibilidad corporal, la presencia y una conexión respetuosa. Solo necesitas el primer nivel para comenzar." : "Begin with body awareness, gentle sensitivity and respectful connection. Level 1 is enough to start."}</p>
                <div className="tantra-course-stats">
                  <span>{locale === "ru" ? "1 из 9 ступеней" : locale === "es" ? "Nivel 1 de 9" : "Level 1 of 9"}</span>
                  <span>{locale === "ru" ? "Бесплатное обучение" : locale === "es" ? "Estudio gratuito" : "Free to study"}</span>
                </div>
                <div className="tantra-course-hero__actions" role="group" aria-label={locale === "ru" ? "Варианты обучения и личной работы" : locale === "es" ? "Opciones de aprendizaje y sesiones personales" : "Learning and personal session options"}>
                  <Link className="tantra-course-hero__cta" href={REIKI_FREE_COURSE_PATH} data-reiki-course-cta>{locale === "ru" ? "Начать БЕСПЛАТНУЮ онлайн-программу «Практик Тантра Рейки» и получить 1-ю ступень Тантра Рейки В ПОДАРОК ↗" : locale === "es" ? "Empezar el programa online GRATIS «Tantra Reiki Practitioner» y recibir el Nivel 1 de Tantra Reiki de REGALO ↗" : "Start FREE Online Program Tantra Reiki Practitioner and get Tantra Reiki Level 1 as a GIFT ↗"}</Link>
                  <details className="tantra-course-hero__healing-request" data-tantra-healing-request="true">
                    <summary className="tantra-course-hero__healing-cta">{locale === "ru" ? "Запросить сеанс Tantra Reiki Healing →" : locale === "es" ? "Solicitar una sesión de Tantra Reiki Healing →" : "Request Tantra Reiki Healing →"}</summary>
                    <div className="tantra-course-hero__healing-panel">
                      <p>{locale === "ru" ? "Оставьте телефон и выберите WhatsApp или Telegram. Андрей согласует формат, стоимость и время лично." : locale === "es" ? "Deja tu teléfono y elige WhatsApp o Telegram. Andrey confirmará el formato, el precio y la hora." : "Add your phone and choose WhatsApp or Telegram. Andrey will confirm the format, price and time personally."}</p>
                      <ContactChannelChooser
                        compactPhone
                        stayAfterSave
                        locale={locale}
                        publicTopic={locale === "ru" ? "Заявка на индивидуальный сеанс Tantra Reiki Healing" : locale === "es" ? "Solicitud de sesión personal Tantra Reiki Healing" : "Personal Tantra Reiki Healing session enquiry"}
                        whatsappUrl={whatsappEnquiryUrl({
                          locale,
                          service: "Tantra Reiki Healing",
                          request: locale === "ru" ? "Хочу запросить индивидуальный сеанс Tantra Reiki Healing. Подскажите, пожалуйста, доступные форматы, стоимость и время." : locale === "es" ? "Quisiera solicitar una sesión personal de Tantra Reiki Healing. Indíqueme los formatos, el precio y los horarios disponibles." : "I would like to request a personal Tantra Reiki Healing session. Please confirm available formats, pricing and times.",
                          pagePath: "/" + locale + "/academy/reiki/tantra-reiki",
                        })}
                      />
                    </div>
                  </details>
                  <a className="tantra-course-hero__initiation-cta" href="#tantra-master-course">{locale === "ru" ? "Записаться на личную инициацию Тантра Рейки с мастером →" : locale === "es" ? "Inscribirme en una iniciación personal en vivo de Tantra Reiki →" : "Sign up for Live Personal Tantra Reiki Initiation →"}</a>
                </div>
                <p className="tantra-course-hero__note">{locale === "ru" ? "Подарок — вводная инициация 1-й ступени по согласованию с Андреем. Практики добровольны, тесты не предназначены для диагностики." : locale === "es" ? "El regalo es una iniciación de Nivel 1, sujeta a la confirmación de Andrey. Las prácticas son voluntarias; los tests no son diagnósticos." : "The gift is an introductory Level 1 initiation, subject to Andrey's confirmation. Practices are optional; tests are not diagnostic."}</p>
              </div>
              <figure className="tantra-course-hero__visual">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reikiPhotoUrl(tantraReikiFullArchive.images.ru[12], 1200)} alt={locale === "ru" ? "Люди на настоящей тантрической встрече" : locale === "es" ? "Personas en un encuentro auténtico de Tantra" : "People together at an original Tantra gathering"} loading="eager" decoding="async" />
                <figcaption>{locale === "ru" ? "Реальная фотография из архива практик" : locale === "es" ? "Fotografía real del archivo" : "Real photograph from the practice archive"}</figcaption>
              </figure>
            </section>
            <section className="tantra-level-summary" aria-label={locale === "ru" ? "Первая ступень и остальные по желанию" : locale === "es" ? "Nivel 1 y niveles posteriores opcionales" : "Level 1 first; optional later levels"}><TantraReikiJourney locale={locale} /></section>
            <section className="tantra-mobile-guide tantra-mobile-guide--combined tantra-mobile-guide--promo reiki-screen reiki-screen--feature" id="tantra-levels" aria-labelledby="tantra-mobile-guide-heading">
              <div className="tantra-mobile-guide__cover" aria-hidden="true">
                <span>HOLISTIC HOUSE</span>
                <div className="tantra-mobile-guide__ornament"><span>✦</span></div>
                <strong>Tantra<br />Reiki</strong>
                <small>{locale === "ru" ? "9 СТУПЕНЕЙ · ДЛЯ ТЕЛЕФОНА" : locale === "es" ? "9 ETAPAS · EDICIÓN MÓVIL" : "9 LEVELS · MOBILE EDITION"}</small>
              </div>
              <div className="tantra-mobile-guide__copy">
                <p className="homeopathy-kicker">{locale === "ru" ? "9 СТУПЕНЕЙ · БЕСПЛАТНАЯ МЕТОДИЧКА" : locale === "es" ? "9 ETAPAS · GUÍA GRATUITA" : "9 LEVELS · FREE STUDY GUIDE"}</p>
                <h2 id="tantra-mobile-guide-heading">{locale === "ru" ? "Тантра Рейки: девять ступеней" : locale === "es" ? "Tantra Reiki: nueve etapas" : "Tantra Reiki: the nine levels"}</h2>
                <p>{locale === "ru" ? "Настройки и упражнения каждой ступени — в удобной PDF-методичке для телефона." : locale === "es" ? "Sintonizaciones y ejercicios de cada etapa en una guía PDF cómoda para el móvil." : "A phone-friendly PDF with the attunements and exercises for all nine levels."}</p>
                <div className="tantra-mobile-guide__course-promo">
                  <p className="tantra-mobile-guide__course-eyebrow">{locale === "ru" ? "БЕСПЛАТНЫЙ ОНЛАЙН-КУРС · 5 ДНЕЙ" : locale === "es" ? "CURSO ONLINE GRATIS · 5 DÍAS" : "FREE ONLINE COURSE · 5 DAYS"}</p>
                  <h3>{locale === "ru" ? "Практик Рейки: обучение и инициация" : locale === "es" ? "Reiki Practitioner: estudio e iniciación" : "Reiki Practitioner: Study & Initiation"}</h3>
                  <p>{locale === "ru" ? "Пять коротких уроков, медитации и практика Тантра, Кундалини и Иггдрасиль Рейки. После обучения можно запросить вводную инициацию у Андрея." : locale === "es" ? "Cinco lecciones, meditaciones y prácticas de Tantra, Kundalini y Yggdrasil Reiki. Al terminar, puedes solicitar una iniciación introductoria con Andrey." : "Five guided lessons with meditations and Tantra, Kundalini & Yggdrasil Reiki. After the course, you can request an introductory initiation with Andrey."}</p>
                  <Link className="tantra-mobile-guide__course-link" href={REIKI_FREE_COURSE_PATH} data-reiki-course-cta>{locale === "ru" ? "Начать бесплатный курс →" : locale === "es" ? "Empezar el curso gratis →" : "Start free Reiki Practitioner course →"}</Link>
                </div>
                <div className="tantra-mobile-guide__pdf-row">
                  <div className="tantra-mobile-guide__pdf-meta">
                    <strong>{locale === "ru" ? "Методичка: 9 ступеней" : locale === "es" ? "Guía: nueve etapas" : "Your 9-level guide"}</strong>
                    <span>{locale === "ru" ? "PDF · крупный шрифт · для телефона" : locale === "es" ? "PDF · letra grande · para móvil" : "PDF · large print · mobile-friendly"}</span>
                  </div>
                  <a className="tantra-mobile-guide__download" href={"/api/academy/reiki-guide?course=tantra&locale=" + locale}>{locale === "ru" ? "Скачать PDF бесплатно ↓" : locale === "es" ? "Descargar PDF gratis ↓" : "Download free PDF ↓"}</a>
                </div>
              </div>
            </section>
            <div className="reiki-screen reiki-screen--social"><TantraReikiFestivalMoments locale={locale} /></div>
            {locale === "en" ? <EnglishGuidedMeditations focus="tantra-reiki" /> : null}
            <div className="reiki-screen reiki-screen--social"><TantraReikiTestimonials locale={locale} /></div>
          </>
        ) : null}
        {!isVerbatimTantraArchive && outline.length >= 2 ? <nav className="academy-outline" aria-label={locale === "ru" ? "Содержание программы" : locale === "es" ? "Contenido del programa" : "Program contents"}><p>{locale === "ru" ? "Содержание" : locale === "es" ? "Contenido" : "Contents"}</p><ol>{outline.map(({ block, index }) => <li className={block.type === "h3" ? "academy-outline-subitem" : undefined} key={index}><a href={"#academy-section-" + index}>{block.text}</a></li>)}</ol></nav> : null}
        {record.routeKey === "history" ? <section className="academy-history-links" aria-label="Academy history"><Link href={"/" + locale + "/academy/history/faculties"}>{locale === "ru" ? "Исторические факультеты и традиции" : locale === "es" ? "Facultades y tradiciones históricas" : "Historical faculties & traditions"}<span aria-hidden="true">→</span></Link><Link href={"/" + locale + "/academy/history/student-experiences"}>{locale === "ru" ? "Исторические отзывы студентов" : locale === "es" ? "Experiencias históricas de estudiantes" : "Historical student experiences"}<span aria-hidden="true">→</span></Link></section> : null}
        {record.direction === "videos" && videos.length > 0 ? (
          <AcademyCourseVideoPlaylist
            locale={locale}
            courseTitle={academyDisplayTitle(record, locale)}
            lessons={videos.map((video, index) => ({
              id: video.id,
              title: video.lessonTitle ?? academyDisplayTitle(record, locale) + " · " + (index + 1),
              order: video.order ?? index + 1,
            }))}
          />
        ) : null}
        {isCanonicalYggdrasil ? (
          <YggdrasilProgramLanding locale={locale} />
        ) : isVerbatimTantraArchive ? (
          <section className="reiki-screen reiki-screen--archive" aria-label={locale === "ru" ? "Материалы и история Тантра Рейки" : locale === "es" ? "Materiales e historia de Tantra Reiki" : "Tantra Reiki teaching & source archive"}><TantraReikiProgrammeModules locale={locale} publicBlocks={publicBlocks} /></section>
        ) : hasBody ? <div className="academy-source-content">{renderBlocks(publicBlocks)}</div> : <p className="academy-empty-source">{text.noContent}</p>}
        {!isVerbatimTantraArchive && record.direction !== "videos" && (sourceVideos.length || videos.length) ? (
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
        {!isCanonicalYggdrasil && !isVerbatimTantraArchive ? (
          <footer className="academy-source-footer">
            {!isVerbatimTantraArchive && (record.skippedRiskyBlocks || publicOmittedCount) ? <p>{text.filtered}</p> : null}
            <a href={record.sourceUrl} rel="noreferrer" target="_blank">{text.source}<span aria-hidden="true">↗</span></a>
            {record.contentHash ? <code>{record.hashAlgorithm ?? "hash"} {record.contentHash}</code> : null}
          </footer>
        ) : null}
        {isVerbatimTantraArchive ? <TantraReikiTeacher locale={locale} sourceUrl={record.sourceUrl} /> : null}
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
