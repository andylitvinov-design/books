import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Compass, ScrollText } from "lucide-react";

import { AcademyBackLink } from "@/components/academy-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import {
  academyDisplayTitle,
  academyPublicBlocks,
  mediaForRecord,
  recordsForDirection,
  youtubeIdFromUrl,
  type AcademyDirectionId,
  type AcademySourceRecord,
} from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";

type TrackKey = "traditions" | "symbols" | "practice" | "path";
type Copy = {
  eyebrow: string; title: string; lead: string; intro: string; program: string;
  original: string; legacy: string; sourceLabel: string; noSource: string;
  contact: string; contactNote: string; back: string;
  tracks: Record<TrackKey, {
    title: string; subtitle: string; overview: string;
    chapters: Array<{ title: string; detail: string }>;
  }>;
};

const content: Record<PublicLocale, Copy> = {
  en: {
    eyebrow: "Holistic House · Academy", title: "Temple Studies",
    lead: "Ancient mysteries, living symbols and archetypal practice — one connected learning journey.",
    intro: "Temple Studies brings together the Academy's Greek and Egyptian mysteries, Maya and Northern traditions, runes, elements, Tarot and applied archetypal work. Rather than dozens of disconnected courses, explore four connected chapters. The source materials below are preserved from earlier teaching programs; dates and current availability are confirmed personally.",
    program: "Explore the four chapters", original: "Preserved texts & historical courses",
    legacy: "Historical curriculum, not a promise of results or a current enrolment offer.",
    sourceLabel: "Read original course", noSource: "Some historical titles survive without a complete text. They have been grouped here instead of displayed as empty courses.",
    contact: "Ask about Temple Studies", contactNote: "Tell me which tradition or practice interests you. I can explain the available formats and a sensible starting point.",
    back: "Back to Academy",
    tracks: {
      traditions: {
        title: "I. Mysteries & Ancient Traditions", subtitle: "Myths as maps of inner life",
        overview: "Explore ancient stories as symbolic languages for the human journey. Greek and Egyptian temple imagery forms the core, with comparative material from Maya, Slavic and other traditions.",
        chapters: [
          { title: "Greek mysteries: Demeter, Dionysus, Eros", detail: "Cycles of change, relationship, desire, belonging and transformation, explored through myth, imagery and group reflection." },
          { title: "Egyptian temple traditions", detail: "Isis, Osiris, Horus, Thoth and Ma'at as figures for clarity, choice, action, limitation and renewed direction." },
          { title: "Maya, Slavic and comparative traditions", detail: "Mythic worlds, shamanic imagery and cultural archetypes studied comparatively, with respect for their distinct origins." },
        ],
      },
      symbols: {
        title: "II. Runes, Elements & Symbolic Arts", subtitle: "Learning the language of symbols",
        overview: "Symbolic systems become practical tools for contemplation: runes, elemental imagery, Tarot archetypes, mandalas and personal artifacts.",
        chapters: [
          { title: "Northern runes & Yggdrasil symbolism", detail: "Runes as a framework for exploring qualities, choices, resources and movement through a situation." },
          { title: "Elements, water and talismans", detail: "Attention, ritual objects and natural symbolism used in personal reflection and creative practice." },
          { title: "Major Arcana, planets & symbolic maps", detail: "Tarot, planetary figures and the Sephiroth tree as historical symbolic maps — not guaranteed predictive mechanisms." },
        ],
      },
      practice: {
        title: "III. Applied Archetypal Practice", subtitle: "From story to personal experience",
        overview: "Move from reading about traditions to exploring personal questions through imagery, archetypal constellations, reflective ritual and embodied awareness.",
        chapters: [
          { title: "Archetypal attunement & initiation", detail: "Choose a meaningful image, examine its qualities and work with intention through meditation or symbolic ritual." },
          { title: "Love, relationships & inner figures", detail: "Eros and the Greek gods of love as prompts for exploring desire, boundaries, inner masculine/feminine images and connection." },
          { title: "Goals, decisions & systemic constellations", detail: "Use the Egyptian eight-step course and archetypal inquiry to bring structure to a question and identify possible next actions." },
          { title: "Imagery, dreams & body awareness", detail: "Related historical strands include symboldrama, dream imagery, body-oriented study and personal integration." },
        ],
      },
      path: {
        title: "IV. School Path & Integration", subtitle: "See how the pieces fit together",
        overview: "The historical Academy of Temple Arts combined cultural studies, symbolism and practical exploration. Here its teaching map is preserved without presenting past credentials, schedules or workshops as current.",
        chapters: [
          { title: "Foundations", detail: "Begin with mythic themes and symbolic literacy; establish personal questions, reflection and consent-based participation." },
          { title: "Experiential practice", detail: "Deepen through selected mythology, runes, Tarot imagery, archetypal work and group exploration." },
          { title: "Integration & advanced archive", detail: "Compare traditions, form your own practice framework and consult historical Magister and Academy source material." },
        ],
      },
    },
  },
  ru: {
    eyebrow: "Holistic House · Академия", title: "Temple Studies — Храмовые традиции",
    lead: "Древние мистерии, язык символов и архетипическая практика — одна цельная программа обучения.",
    intro: "Temple Studies объединяет греческие и египетские мистерии, традиции Майя и Севера, руны, стихии, Таро и прикладные архетипические практики. Вместо десятков разрозненных курсов — четыре последовательных раздела. Ниже сохранены тексты из прежних программ Академии; актуальные даты и формат обучения уточняются лично.",
    program: "Четыре раздела программы", original: "Сохранённые тексты и исторические курсы",
    legacy: "Историческая учебная структура, а не обещание результата и не актуальное предложение о зачислении.",
    sourceLabel: "Читать исходный курс", noSource: "У части исторических программ сохранились только названия. Они объединены здесь, а не показаны как пустые курсы.",
    contact: "Узнать о Temple Studies", contactNote: "Напишите, какая традиция или практика вас интересует. Обсудим подходящий формат и с чего лучше начать.",
    back: "Вернуться в Академию",
    tracks: {
      traditions: {
        title: "I. Мистерии и древние традиции", subtitle: "Мифы как карты внутренней жизни",
        overview: "Изучаем древние сюжеты как символические языки человеческого опыта. Основа — греческие и египетские мистерии; дополнение — сравнительный взгляд на традиции Майя, славянские образы и другие культуры.",
        chapters: [
          { title: "Греческие мистерии: Деметра, Дионис, Эрос", detail: "Темы переходов, отношений, желания, принадлежности и трансформации через мифы, образы и групповое исследование." },
          { title: "Египетская храмовая традиция", detail: "Исида, Осирис, Гор, Тот и Маат как образы ясности, выбора, действия, ограничений и нового направления." },
          { title: "Майя, славянские и другие традиции", detail: "Мифологические миры и шаманские образы в сравнительном изучении, с уважением к различиям между культурами." },
        ],
      },
      symbols: {
        title: "II. Руны, стихии и символические искусства", subtitle: "Освоение языка символов",
        overview: "Руны, стихии, архетипы Таро, мандалы и артефакты изучаются как инструменты созерцания, самонаблюдения и творческой практики.",
        chapters: [
          { title: "Северные руны и образы Иггдрасиль", detail: "Рунические образы как способ исследовать качества, выбор, ресурсы и развитие личной ситуации." },
          { title: "Стихии, вода и талисманы", detail: "Работа с вниманием, ритуальными предметами и природной символикой для осмысления личного опыта." },
          { title: "Старшие Арканы, планеты и символические карты", detail: "Таро, планетарные образы и Древо Сефирот как исторические символические модели, без обещания предсказания событий." },
        ],
      },
      practice: {
        title: "III. Прикладная архетипическая практика", subtitle: "От мифа к собственному опыту",
        overview: "Переходим от изучения традиций к работе с личными запросами через образы, архетипические расстановки, символические ритуалы и телесное осознавание.",
        chapters: [
          { title: "Архетипические настройки и инициации", detail: "Выбор значимого образа, изучение его качеств, работа с намерением через медитацию и символическое действие." },
          { title: "Любовь, отношения и внутренние фигуры", detail: "Эрос и греческие архетипы любви как материал для исследования желаний, границ, внутренних мужских и женских образов." },
          { title: "Цели, решения и системные расстановки", detail: "Египетский восьмишаговый курс и архетипический анализ для прояснения запроса и возможных действий." },
          { title: "Образы, сновидения и телесное осознавание", detail: "В архиве представлены символдрама, работа со снами, телесно-ориентированное обучение и интеграция опыта." },
        ],
      },
      path: {
        title: "IV. Школа и интеграция", subtitle: "Как соединяются все направления",
        overview: "Историческая Академия Храмовых Искусств объединяла культурные традиции, символические системы и практические занятия. Здесь сохранена структура школы без переноса прежних сертификатов и расписаний как актуальных.",
        chapters: [
          { title: "Основы", detail: "Начать с мифов и языка символов, формулирования запроса, рефлексии и практик с уважением к границам." },
          { title: "Практика", detail: "Углубиться в отдельные мистерии, руны, образы Таро, архетипическую работу и групповое исследование." },
          { title: "Интеграция и архив", detail: "Сопоставить традиции, сформировать собственную методику и обратиться к историческим материалам программы Magister и школы." },
        ],
      },
    },
  },
  es: {
    eyebrow: "Holistic House · Academia", title: "Temple Studies — Tradiciones del Templo",
    lead: "Misterios antiguos, símbolos y práctica arquetípica — un camino de aprendizaje conectado.",
    intro: "Temple Studies reúne los misterios griegos y egipcios, tradiciones mayas y nórdicas, runas, elementos, Tarot y prácticas arquetípicas. En lugar de decenas de cursos aislados, cuatro capítulos relacionados. Los materiales originales proceden de programas históricos; consulta personalmente las fechas y la disponibilidad.",
    program: "Explora los cuatro capítulos", original: "Textos conservados y cursos históricos",
    legacy: "Plan de estudios histórico; no garantiza resultados ni constituye una oferta de matrícula actual.",
    sourceLabel: "Leer el curso original", noSource: "Algunos cursos históricos solo conservan su título. Aquí aparecen agrupados, no como cursos vacíos.",
    contact: "Preguntar por Temple Studies", contactNote: "Cuéntame qué tradición o práctica te interesa y podemos encontrar un buen punto de partida.",
    back: "Volver a Academia",
    tracks: {
      traditions: {
        title: "I. Misterios y tradiciones antiguas", subtitle: "Los mitos como mapas de la vida interior",
        overview: "Los mitos se estudian como lenguajes simbólicos. La base son los misterios griegos y egipcios, acompañados de materiales comparativos mayas, eslavos y de otras culturas.",
        chapters: [
          { title: "Misterios griegos: Deméter, Dioniso y Eros", detail: "Cambio, vínculos, deseo, pertenencia y transformación mediante relatos, imágenes y reflexión grupal." },
          { title: "Tradiciones del templo egipcio", detail: "Isis, Osiris, Horus, Thot y Maat como figuras para explorar claridad, decisiones, acción y dirección." },
          { title: "Tradiciones mayas, eslavas y comparadas", detail: "Imaginarios míticos y chamánicos, atendiendo a las diferencias entre culturas." },
        ],
      },
      symbols: {
        title: "II. Runas, elementos y artes simbólicas", subtitle: "Aprender el lenguaje de los símbolos",
        overview: "Runas, elementos, Tarot, mandalas y talismanes como herramientas de contemplación y expresión creativa.",
        chapters: [
          { title: "Runas nórdicas e Yggdrasil", detail: "Imágenes rúnicas para observar cualidades, recursos y opciones." },
          { title: "Elementos, agua y objetos simbólicos", detail: "Atención, naturaleza y objetos rituales como apoyos para la reflexión." },
          { title: "Arcanos Mayores y mapas simbólicos", detail: "Tarot, imágenes planetarias y Árbol de las Sefirot como modelos históricos, no predicciones garantizadas." },
        ],
      },
      practice: {
        title: "III. Práctica arquetípica aplicada", subtitle: "Del relato a la experiencia",
        overview: "Explorar preguntas personales mediante visualización, constelaciones arquetípicas, ritual simbólico y atención corporal.",
        chapters: [
          { title: "Sintonizaciones e iniciaciones", detail: "Elegir una imagen significativa y trabajar la intención con meditación y acciones simbólicas." },
          { title: "Amor, relaciones y figuras interiores", detail: "Eros y arquetipos griegos como guía para reflexionar sobre deseos, límites y relaciones." },
          { title: "Objetivos, decisiones y constelaciones", detail: "Modelo egipcio de ocho pasos y preguntas arquetípicas para concretar posibles acciones." },
          { title: "Imágenes, sueños y cuerpo", detail: "Archivos de symboldrama, sueños y estudio corporal." },
        ],
      },
      path: {
        title: "IV. Escuela e integración", subtitle: "Unir las piezas",
        overview: "La Academia histórica conectaba tradiciones, símbolos y práctica. Se preserva el programa sin presentar antiguos certificados o fechas como vigentes.",
        chapters: [
          { title: "Fundamentos", detail: "Mitos, símbolos, reflexión, límites y consentimiento." },
          { title: "Práctica experiencial", detail: "Misterios seleccionados, runas, Tarot y exploración grupal." },
          { title: "Integración y archivo", detail: "Comparar tradiciones y consultar el programa histórico Magister." },
        ],
      },
    },
  },
};

const sections: Array<{
  key: TrackKey; direction: AcademyDirectionId; image: string; imageAlt: Record<PublicLocale, string>;
}> = [
  { key: "traditions", direction: "mysteries", image: "/library/maya-mysteries/media/post-244-1.jpg",
    imageAlt: { en: "Historic image illustrating ancient mysteries", ru: "Иллюстрация к древним мистериям", es: "Imagen sobre los misterios antiguos" } },
  { key: "symbols", direction: "symbolic", image: "/library/maya-egregor-gods/media/post-203-1.jpg",
    imageAlt: { en: "Symbolic imagery from the archive", ru: "Символические образы из архива", es: "Imágenes simbólicas del archivo" } },
  { key: "practice", direction: "applied", image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
    imageAlt: { en: "Archetypal constellation practice", ru: "Архетипическая расстановочная практика", es: "Práctica de constelaciones arquetípicas" } },
  { key: "path", direction: "school", image: "/images/holistic-house/andy-about.png",
    imageAlt: { en: "Academy teaching history", ru: "История обучения в Академии", es: "Historia de la Academia" } },
];

function preservedRecord(record: AcademySourceRecord, locale: PublicLocale) {
  const paragraphs = academyPublicBlocks(record, locale).filter((block) => block.type === "p" || block.type === "li");
  return paragraphs.length >= 2 || mediaForRecord(record).some((item) => Boolean(youtubeIdFromUrl(item.mediaUrl)));
}

export function TempleStudies({ locale }: { locale: PublicLocale }) {
  const t = content[locale];
  return (
    <main className="temple-shell" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className="temple-inner">
        <AcademyBackLink locale={locale} />
        <header className="temple-hero">
          <div className="temple-hero-copy">
            <p className="homeopathy-kicker">{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p className="temple-lead">{t.lead}</p>
            <p>{t.intro}</p>
            <a className="temple-primary-cta" href="#temple-chapters">{t.program} <ArrowDown aria-hidden="true" size={18} /></a>
          </div>
          <div className="temple-hero-image"><Image src="/library/maya-mysteries/media/post-244-1.jpg" alt="" fill sizes="(max-width: 800px) 100vw, 45vw" priority /></div>
        </header>

        <nav className="temple-contents" id="temple-chapters" aria-label={t.program}>
          {sections.map(({ key }, index) => (
            <a href={"#" + key} key={key}><span>0{index + 1}</span><strong>{t.tracks[key].title.replace(/^I{1,3}V?\. |^IV\. /, "")}</strong><ArrowRight size={16} aria-hidden="true" /></a>
          ))}
        </nav>

        {sections.map(({ key, direction, image, imageAlt }, index) => {
          const track = t.tracks[key];
          const sourceRecords = recordsForDirection(direction, locale);
          const readable = sourceRecords.filter((record) => preservedRecord(record, locale));
          return (
            <section className="temple-track" id={key} key={key} aria-labelledby={"temple-" + key}>
              <div className="temple-track-media">
                <Image src={image} alt={imageAlt[locale]} fill sizes="(max-width: 800px) 100vw, 43vw" />
                <span>0{index + 1} / 04</span>
              </div>
              <div className="temple-track-body">
                <p className="homeopathy-kicker">Temple Studies</p>
                <h2 id={"temple-" + key}>{track.title}</h2>
                <p className="temple-track-subtitle">{track.subtitle}</p>
                <p>{track.overview}</p>
                <ol className="temple-chapter-list">
                  {track.chapters.map((chapter, chapterIndex) => (
                    <li key={chapter.title}>
                      <span>{String(chapterIndex + 1).padStart(2, "0")}</span>
                      <div><h3>{chapter.title}</h3><p>{chapter.detail}</p></div>
                    </li>
                  ))}
                </ol>
                {readable.length ? (
                  <details className="temple-sources">
                    <summary><BookOpen size={18} aria-hidden="true" /> {t.original} ({readable.length})</summary>
                    <ul>{readable.map((record) => (
                      <li key={record.logicalId}><Link href={"/" + locale + "/academy/" + record.routeKey}>{academyDisplayTitle(record, locale)} <ArrowRight size={14} aria-hidden="true" /></Link></li>
                    ))}</ul>
                  </details>
                ) : null}
                {sourceRecords.length > readable.length ? <p className="temple-source-note"><ScrollText size={16} aria-hidden="true" /> {t.noSource}</p> : null}
              </div>
            </section>
          );
        })}

        <section className="temple-finish">
          <Compass size={30} aria-hidden="true" />
          <h2>{t.contact}</h2>
          <p>{t.contactNote}</p>
          <a className="temple-primary-cta" href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.contact} <ArrowRight size={18} aria-hidden="true" /></a>
          <small>{t.legacy}</small>
          <Link className="temple-back" href={"/" + locale + "/academy"}>{t.back} →</Link>
        </section>
      </div>
    </main>
  );
}
