import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { metadataBaseFor } from "@/data/site-metadata";
import type { PublicLocale } from "@/lib/public-locales";

import styles from "./wu-xing-manual.module.css";

type Props = { params: Promise<{ locale: string }> };

type Stage = {
  number: number;
  name: string;
  resource: string;
  short: string;
};

const stagesRu: Stage[] = [
  { number: 1, name: "Шторм (хаос)", resource: "1–2", short: "Нет опоры и сил. Главная задача — не «развиваться», а собраться и почувствовать: «я есть»." },
  { number: 2, name: "Снежная королева", resource: "2–2.5", short: "Жизнь как будто заморожена. Следующий шаг — тепло, безопасность и первая внутренняя опора." },
  { number: 3, name: "Прометей", resource: "2.5–3.0", short: "Появляется первый огонь жизни. Важно разрешить себе хотеть, жить и проявляться." },
  { number: 4, name: "Крепость", resource: "3.0–3.5", short: "Ресурс собирается в ось и границы. Человек уже может удерживать себя под нагрузкой." },
  { number: 5, name: "Король / Королева", resource: "3.5–4.0", short: "Возвращаются достоинство и ценность. Появляется желание занимать пространство и показывать себя миру." },
  { number: 6, name: "Капитан", resource: "4.0–4.5", short: "Есть руль и курс. Задача — управлять жизнью не из жёсткого контроля, а из внутренней силы." },
  { number: 7, name: "Ручей", resource: "4.5–5.0", short: "Энергия начинает течь наружу мягко. Контакт с людьми и миром становится естественнее." },
  { number: 8, name: "Река", resource: "5.0–5.5", short: "Появляется мягкая полнота и чувство, что ресурсом уже можно делиться." },
  { number: 9, name: "Озеро", resource: "5.5–6.0", short: "Хочется формировать связи, процессы и делиться тем, что накоплено." },
  { number: 10, name: "Хозяин Гавани", resource: "6.0–6.5", short: "Возникает готовность выходить в более большой мир и становиться заметнее." },
  { number: 11, name: "Парусник", resource: "6.5–7.0", short: "Цели становятся яснее, появляется движение к реализации." },
  { number: 12, name: "Владыка водопада", resource: "7.0–7.5", short: "Больше уверенности, смелости и готовности широко проявляться." },
  { number: 13, name: "Дельта реки", resource: "7.5–8.0", short: "Ощущается приближение миссии и готовность сильнее вовлекать мир." },
  { number: 14, name: "Океан / Хранитель морей", resource: "8.0–8.5", short: "Появляется ощущение масштаба, ценности и самодостаточности." },
  { number: 15, name: "Провидец / Исток реки в горах", resource: "8.5", short: "Человек всё сильнее ощущает поток, видение и связь с чем-то большим, чем личная выгода." },
  { number: 16, name: "Пустота / Дао Сюй", resource: "9", short: "Меньше прямого давления на мир, больше способности помогать реальности мягко развернуться." },
  { number: 17, name: "У-Вэй / Закон", resource: "9.5", short: "Главным инструментом становится состояние и присутствие, через которое другие находят свой путь." },
  { number: 18, name: "У-цзи / Беспредельное", resource: "10", short: "Состояние постоянной сонастройки с Дао. Главное — сохранять эту связь." },
];

const stagesEn: Stage[] = [
  { number: 1, name: "Storm (chaos)", resource: "1–2", short: "There is little support or strength. The task is not growth yet, but to stabilise and feel: “I exist.”" },
  { number: 2, name: "Snow Queen", resource: "2–2.5", short: "Life feels frozen. The next step is warmth, safety and the first inner point of support." },
  { number: 3, name: "Prometheus", resource: "2.5–3.0", short: "The first fire of life appears. The task is to allow desire, life and expression." },
  { number: 4, name: "Fortress", resource: "3.0–3.5", short: "Resource forms an inner axis and boundaries. The person can hold themselves more reliably under pressure." },
  { number: 5, name: "King / Queen", resource: "3.5–4.0", short: "Dignity and value return. There is a wish to occupy space and show oneself to the world." },
  { number: 6, name: "Captain", resource: "4.0–4.5", short: "There is a helm and a course. The task is to steer from inner strength rather than rigid control." },
  { number: 7, name: "Stream", resource: "4.5–5.0", short: "Energy starts moving outward more softly. Contact with people and the world becomes more natural." },
  { number: 8, name: "River", resource: "5.0–5.5", short: "Soft fullness appears and resource begins to feel shareable." },
  { number: 9, name: "Lake", resource: "5.5–6.0", short: "There is a wish to form connections and processes and share what has accumulated." },
  { number: 10, name: "Harbour Keeper", resource: "6.0–6.5", short: "Readiness to enter a larger world and become more visible." },
  { number: 11, name: "Sailboat", resource: "6.5–7.0", short: "Goals become clearer and move toward realisation." },
  { number: 12, name: "Lord of the Waterfall", resource: "7.0–7.5", short: "More confidence, courage and readiness for wider expression." },
  { number: 13, name: "River Delta", resource: "7.5–8.0", short: "A sense of mission appears and the person is ready to involve the world more fully." },
  { number: 14, name: "Ocean / Keeper of the Seas", resource: "8.0–8.5", short: "A sense of scale, value and self-sufficiency." },
  { number: 15, name: "Seer / Mountain Source", resource: "8.5", short: "The person increasingly experiences flow, vision and connection with something larger than personal benefit." },
  { number: 16, name: "Emptiness / Dao Xu", resource: "9", short: "Less direct force, more ability to help reality unfold gently." },
  { number: 17, name: "Wu Wei / Law", resource: "9.5", short: "Presence itself becomes the main instrument through which others can find their way." },
  { number: 18, name: "Wuji / The Boundless", resource: "10", short: "Continuous attunement with Dao. The task is to preserve the connection." },
];

const stagesEs: Stage[] = [
  { number: 1, name: "Tormenta (caos)", resource: "1–2", short: "Hay poca base y poca fuerza. La tarea todavía no es crecer, sino estabilizarse y sentir: «existo»." },
  { number: 2, name: "Reina de las Nieves", resource: "2–2.5", short: "La vida se siente congelada. El siguiente paso es calor, seguridad y el primer apoyo interno." },
  { number: 3, name: "Prometeo", resource: "2.5–3.0", short: "Aparece el primer fuego de vida. La tarea es permitirse desear, vivir y expresarse." },
  { number: 4, name: "Fortaleza", resource: "3.0–3.5", short: "El recurso forma un eje y límites internos. La persona puede sostenerse mejor bajo presión." },
  { number: 5, name: "Rey / Reina", resource: "3.5–4.0", short: "Regresan dignidad y valor. Aparece el deseo de ocupar espacio y mostrarse al mundo." },
  { number: 6, name: "Capitán", resource: "4.0–4.5", short: "Ya hay timón y rumbo. La tarea es dirigir desde la fuerza interna y no desde el control rígido." },
  { number: 7, name: "Arroyo", resource: "4.5–5.0", short: "La energía empieza a fluir hacia fuera con más suavidad. El contacto se vuelve más natural." },
  { number: 8, name: "Río", resource: "5.0–5.5", short: "Aparece una plenitud suave y el recurso empieza a poder compartirse." },
  { number: 9, name: "Lago", resource: "5.5–6.0", short: "Surge el deseo de formar vínculos y procesos y compartir lo acumulado." },
  { number: 10, name: "Guardián del Puerto", resource: "6.0–6.5", short: "Disposición a entrar en un mundo más grande y hacerse más visible." },
  { number: 11, name: "Velero", resource: "6.5–7.0", short: "Los objetivos se vuelven más claros y avanzan hacia la realización." },
  { number: 12, name: "Señor de la Cascada", resource: "7.0–7.5", short: "Más confianza, valentía y capacidad de expresarse ampliamente." },
  { number: 13, name: "Delta del Río", resource: "7.5–8.0", short: "Aparece una sensación de misión y disposición a implicar más al mundo." },
  { number: 14, name: "Océano / Guardián de los Mares", resource: "8.0–8.5", short: "Sensación de escala, valor y autosuficiencia." },
  { number: 15, name: "Vidente / Nacimiento del río", resource: "8.5", short: "Se perciben cada vez más el flujo, la visión y la conexión con algo mayor que el beneficio personal." },
  { number: 16, name: "Vacío / Dao Xu", resource: "9", short: "Menos fuerza directa y más capacidad de ayudar a que la realidad se despliegue suavemente." },
  { number: 17, name: "Wu Wei / Ley", resource: "9.5", short: "La presencia se convierte en la herramienta principal para que otros encuentren su camino." },
  { number: 18, name: "Wuji / Lo ilimitado", resource: "10", short: "Sintonización continua con el Dao. La tarea es conservar esa conexión." },
];

const copy = {
  ru: {
    title: "Уровни У-Син: краткая карта для новичка",
    description: "Простое введение в авторскую модель ДАО УСИН: 18 ступеней ресурса, три этапа и следующий шаг для каждого уровня.",
    kicker: "ДАОССКАЯ АЛХИМИЯ",
    heading: "Уровни У-Син",
    badge: "КРАТКАЯ МЕТОДИЧКА",
    lead: "Эта страница — не полная теория, а карта на 3–5 минут. Сначала поймите, где вы сейчас и какой следующий шаг нужен. Подробности можно открыть ниже.",
    minuteTitle: "Суть за одну минуту",
    minutePoints: [
      "Уровень показывает не «хороший вы или плохой», а сколько внутреннего ресурса сейчас доступно.",
      "Каждая ступень отвечает на 4 вопроса: где я сейчас → что уже собрано → чего не хватает → что развивать дальше.",
      "Ступени лучше не перепрыгивать: следующая опирается на предыдущую. Если базы нет, система обычно откатывается.",
      "Один рабочий цикл в моей модели обычно рассчитан примерно на одну ступень: около месяца и 2 сессии.",
    ],
    formulaTitle: "Главная логика первых ступеней",
    formula: "выживание → тепло → огонь → границы → достоинство → управление → поток",
    threeTitle: "Три больших этапа",
    three: [
      { range: "1–7", title: "Алхимия здоровья", note: "Нижний Дянь Тянь", text: "Сначала собираем тело, базовую опору и способность удерживать ресурс." },
      { range: "8–14", title: "Алхимия успеха", note: "Срединный Дянь Тянь · Любовь и Деньги", text: "Ресурс начинает двигаться наружу: отношения, цели, влияние, реализация." },
      { range: "15–18", title: "Алхимия духа", note: "Верхний Дянь Тянь", text: "Фокус смещается от личной реализации к видению, присутствию и связи с Дао." },
    ],
    scaleTitle: "Шкала ресурса",
    scaleText: "Это авторская ориентировочная шкала 1–10. Важнее не точная цифра, а попадание в текущий диапазон и понимание следующего качества.",
    scale: [
      { range: "1–5", label: "ресурс здоровья" },
      { range: "5–8", label: "ресурс успеха" },
      { range: "9–10", label: "духовная сила" },
    ],
    baseTitle: "Первые 7 ступеней — база",
    baseLead: "Именно здесь лучше всего видно логику переходов. Каждая следующая ступень добавляет одно ключевое качество.",
    allTitle: "Что идёт дальше",
    allLead: "После Ручья начинается этап социальной реализации, а затем — духовный. Для быстрого обзора достаточно этой карты.",
    diagnosticTitle: "С чего начать",
    diagnosticText: "Сначала определите текущую ступень. Экспресс-диагностика нужна не ради точной цифры, а чтобы понять: что уже устойчиво и какое одно качество сейчас важнее всего дорастить.",
    diagnosticCta: "Пройти экспресс-диагностику",
    deeperTitle: "Если хотите глубже",
    deeperText: "Полная методичка разбирает логику переходов, вызовы, задачи, критерии перехода и примеры по каждой ступени.",
    fullGuide: "Открыть полную методичку «Модель ДАО УСИН и ступени развития»",
    links: [
      { label: "Описание этапов · Telegram", href: "https://t.me/daomagic/170" },
      { label: "Описание ступеней · Telegram", href: "https://t.me/daomagic/131" },
      { label: "Краткий тест 1–4 уровня · Telegram", href: "https://t.me/daomagic/93" },
    ],
    contact: "Нужен личный разбор?",
    contactText: "Можно пройти экспресс-диагностику или написать мне, чтобы вместе определить текущую ступень и ближайший шаг.",
    contactCta: "Написать @AndyTherapist",
    note: "Это авторская символическая модель ресурса и развития, а не медицинская шкала здоровья и не диагноз.",
  },
  en: {
    title: "Wu Xing Levels: a beginner’s map",
    description: "A simple introduction to the author’s DAO Wu Xing model: 18 resource stages, three broad phases, and the next step at each level.",
    kicker: "DAOIST ALCHEMY",
    heading: "Wu Xing Levels",
    badge: "BEGINNER GUIDE",
    lead: "This is not the full theory. It is a 3–5 minute map: first understand where you are and what the next quality is. Open the deeper material only if you need it.",
    minuteTitle: "The idea in one minute",
    minutePoints: [
      "A level does not mean “good or bad”; it describes how much inner resource is currently available.",
      "Each stage answers four questions: where am I → what is already built → what is missing → what should grow next.",
      "Stages are not meant to be skipped: each one rests on the previous one.",
      "In my working model, one cycle usually aims at roughly one stage: about one month and two sessions.",
    ],
    formulaTitle: "The logic of the first stages",
    formula: "survival → warmth → fire → boundaries → dignity → steering → flow",
    threeTitle: "Three broad phases",
    three: [
      { range: "1–7", title: "Alchemy of Health", note: "Lower Dantian", text: "Build body resource, basic support and the ability to hold energy." },
      { range: "8–14", title: "Alchemy of Success", note: "Middle Dantian · Love & Money", text: "Resource moves outward into relationships, goals, influence and realisation." },
      { range: "15–18", title: "Alchemy of Spirit", note: "Upper Dantian", text: "Attention shifts from personal achievement toward vision, presence and connection with Dao." },
    ],
    scaleTitle: "Resource scale",
    scaleText: "This is an author-developed 1–10 orientation scale. The exact number matters less than identifying the current range and the next quality.",
    scale: [
      { range: "1–5", label: "health resource" },
      { range: "5–8", label: "success resource" },
      { range: "9–10", label: "spiritual strength" },
    ],
    baseTitle: "The first 7 stages are the foundation",
    baseLead: "This is where the transition logic is easiest to see. Each stage adds one central quality.",
    allTitle: "What comes next",
    allLead: "After Stream comes social realisation, then the spiritual stage. For a quick overview, this map is enough.",
    diagnosticTitle: "Where to start",
    diagnosticText: "Identify the current stage first. The point of the short assessment is not a perfect number, but to see what is already stable and what one quality needs to grow next.",
    diagnosticCta: "Start express assessment",
    deeperTitle: "If you want more detail",
    deeperText: "The full guide explains transition logic, challenges, tasks, criteria for moving on, and examples for each stage.",
    fullGuide: "Open the full guide “DAO Wu Xing Model and Stages of Development”",
    links: [
      { label: "Three phases · Telegram", href: "https://t.me/daomagic/170" },
      { label: "Stage descriptions · Telegram", href: "https://t.me/daomagic/131" },
      { label: "Short test, levels 1–4 · Telegram", href: "https://t.me/daomagic/93" },
    ],
    contact: "Need a personal reading?",
    contactText: "Use the express assessment or write to me so we can identify the current stage and the nearest step together.",
    contactCta: "Message @AndyTherapist",
    note: "This is an author-developed symbolic resource and development model, not a medical health scale or diagnosis.",
  },
  es: {
    title: "Niveles Wu Xing: mapa para principiantes",
    description: "Introducción sencilla al modelo DAO Wu Xing: 18 etapas de recurso, tres grandes fases y el siguiente paso en cada nivel.",
    kicker: "ALQUIMIA TAOÍSTA",
    heading: "Niveles Wu Xing",
    badge: "GUÍA BREVE",
    lead: "No es la teoría completa. Es un mapa de 3–5 minutos: primero entiende dónde estás y qué cualidad viene después; luego abre el material profundo si lo necesitas.",
    minuteTitle: "La idea en un minuto",
    minutePoints: [
      "Un nivel no significa «bueno o malo»; describe cuánto recurso interno está disponible ahora.",
      "Cada etapa responde cuatro preguntas: dónde estoy → qué ya está construido → qué falta → qué desarrollar después.",
      "No conviene saltar etapas: cada una se apoya en la anterior.",
      "En mi modelo de trabajo, un ciclo suele apuntar a una etapa: alrededor de un mes y dos sesiones.",
    ],
    formulaTitle: "La lógica de las primeras etapas",
    formula: "supervivencia → calor → fuego → límites → dignidad → dirección → flujo",
    threeTitle: "Tres grandes fases",
    three: [
      { range: "1–7", title: "Alquimia de la salud", note: "Dantian inferior", text: "Construir recurso corporal, base y capacidad de sostener energía." },
      { range: "8–14", title: "Alquimia del éxito", note: "Dantian medio · Amor y Dinero", text: "El recurso sale hacia relaciones, objetivos, influencia y realización." },
      { range: "15–18", title: "Alquimia del espíritu", note: "Dantian superior", text: "La atención pasa del logro personal a visión, presencia y conexión con el Dao." },
    ],
    scaleTitle: "Escala de recurso",
    scaleText: "Es una escala orientativa de autor de 1 a 10. Importa menos la cifra exacta que reconocer el rango actual y la siguiente cualidad.",
    scale: [
      { range: "1–5", label: "recurso de salud" },
      { range: "5–8", label: "recurso de éxito" },
      { range: "9–10", label: "fuerza espiritual" },
    ],
    baseTitle: "Las primeras 7 etapas son la base",
    baseLead: "Aquí se ve mejor la lógica de transición. Cada etapa añade una cualidad central.",
    allTitle: "Qué viene después",
    allLead: "Después de Arroyo empieza la realización social y luego el nivel espiritual. Para una visión rápida, este mapa es suficiente.",
    diagnosticTitle: "Por dónde empezar",
    diagnosticText: "Primero identifica la etapa actual. La evaluación breve no busca una cifra perfecta, sino entender qué ya es estable y qué cualidad conviene desarrollar ahora.",
    diagnosticCta: "Hacer evaluación breve",
    deeperTitle: "Si quieres profundizar",
    deeperText: "La guía completa explica la lógica de transición, desafíos, tareas, criterios de paso y ejemplos para cada etapa.",
    fullGuide: "Abrir la guía completa «Modelo DAO Wu Xing y etapas de desarrollo»",
    links: [
      { label: "Tres fases · Telegram", href: "https://t.me/daomagic/170" },
      { label: "Descripción de etapas · Telegram", href: "https://t.me/daomagic/131" },
      { label: "Test breve, niveles 1–4 · Telegram", href: "https://t.me/daomagic/93" },
    ],
    contact: "¿Necesitas una lectura personal?",
    contactText: "Haz la evaluación breve o escríbeme para identificar juntos la etapa actual y el paso más cercano.",
    contactCta: "Escribir a @AndyTherapist",
    note: "Es un modelo simbólico de recurso y desarrollo creado por el autor, no una escala médica de salud ni un diagnóstico.",
  },
} as const;

function isLocale(value: string): value is PublicLocale {
  return value === "en" || value === "ru" || value === "es";
}

function stagesFor(locale: PublicLocale) {
  if (locale === "ru") return stagesRu;
  if (locale === "es") return stagesEs;
  return stagesEn;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { title: "Not found" };
  const text = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: `${text.title} — Holistic House`,
    description: text.description,
    alternates: {
      canonical: `/${locale}/wu-xing`,
      languages: { en: "/en/wu-xing", ru: "/ru/wu-xing", es: "/es/wu-xing" },
    },
  };
}

export default async function WuXingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const text = copy[locale];
  const stages = stagesFor(locale);

  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />

      <header className={styles.hero}>
        <p className="homeopathy-kicker">{text.kicker}</p>
        <h1>{text.heading}</h1>
        <span className={styles.badge}>{text.badge}</span>
        <p className={styles.lead}>{text.lead}</p>
      </header>

      <section className={styles.minute}>
        <div>
          <p className="homeopathy-kicker">01</p>
          <h2>{text.minuteTitle}</h2>
        </div>
        <ol>
          {text.minutePoints.map((point, index) => (
            <li key={point}><span>{String(index + 1).padStart(2, "0")}</span><p>{point}</p></li>
          ))}
        </ol>
      </section>

      <section className={styles.formula}>
        <p>{text.formulaTitle}</p>
        <strong>{text.formula}</strong>
      </section>

      <section className={styles.overview}>
        <p className="homeopathy-kicker">02</p>
        <h2>{text.threeTitle}</h2>
        <div className={styles.phaseGrid}>
          {text.three.map((phase) => (
            <article key={phase.range}>
              <span>{phase.range}</span>
              <h3>{phase.title}</h3>
              <strong>{phase.note}</strong>
              <p>{phase.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.scale}>
        <div>
          <p className="homeopathy-kicker">03</p>
          <h2>{text.scaleTitle}</h2>
          <p>{text.scaleText}</p>
        </div>
        <div className={styles.scaleGrid}>
          {text.scale.map((item) => (
            <article key={item.range}>
              <strong>{item.range}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.baseStages}>
        <div className={styles.sectionHeading}>
          <p className="homeopathy-kicker">04</p>
          <h2>{text.baseTitle}</h2>
          <p>{text.baseLead}</p>
        </div>
        <div className={styles.stageList}>
          {stages.slice(0, 7).map((stage) => (
            <article key={stage.number}>
              <span className={styles.stageNumber}>{stage.number}</span>
              <div>
                <div className={styles.stageTop}>
                  <h3>{stage.name}</h3>
                  <span>{stage.resource}</span>
                </div>
                <p>{stage.short}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.laterStages}>
        <div className={styles.sectionHeading}>
          <p className="homeopathy-kicker">05</p>
          <h2>{text.allTitle}</h2>
          <p>{text.allLead}</p>
        </div>
        <div className={styles.laterGroups}>
          <div>
            <h3>{text.three[1].title}</h3>
            {stages.slice(7, 14).map((stage) => (
              <div className={styles.compactStage} key={stage.number}>
                <span>{stage.number}</span>
                <strong>{stage.name}</strong>
                <small>{stage.resource}</small>
              </div>
            ))}
          </div>
          <div>
            <h3>{text.three[2].title}</h3>
            {stages.slice(14).map((stage) => (
              <div className={styles.compactStage} key={stage.number}>
                <span>{stage.number}</span>
                <strong>{stage.name}</strong>
                <small>{stage.resource}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.start}>
        <div>
          <p className="homeopathy-kicker">06</p>
          <h2>{text.diagnosticTitle}</h2>
          <p>{text.diagnosticText}</p>
        </div>
        <Link className="hh-primary" href={`/${locale}/services#available-services`}>{text.diagnosticCta}</Link>
      </section>

      <section className={styles.deeper}>
        <div className={styles.sectionHeading}>
          <p className="homeopathy-kicker">07</p>
          <h2>{text.deeperTitle}</h2>
          <p>{text.deeperText}</p>
        </div>
        <Link className={styles.fullGuide} href="/books/dao-wuxing-model-steps">{text.fullGuide} →</Link>
        <div className={styles.linkGrid}>
          {text.links.map((item) => (
            <a href={item.href} key={item.href} rel="noreferrer" target="_blank">{item.label} ↗</a>
          ))}
        </div>
      </section>

      <section className={styles.contact}>
        <div>
          <h2>{text.contact}</h2>
          <p>{text.contactText}</p>
          <small>{text.note}</small>
        </div>
        <a className="hh-primary" href="https://t.me/AndyTherapist" rel="noreferrer" target="_blank">{text.contactCta}</a>
      </section>
    </main>
  );
}
