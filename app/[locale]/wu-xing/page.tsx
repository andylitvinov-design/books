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
  text: string;
  direction?: string;
};

const stagesRu: Stage[] = [
  { number: 1, name: "Шторм (хаос)", resource: "1–2 ед.", text: "Болезнь, нет опоры, сил. Энергия как будто сползает вниз, проваливается.", direction: "Даем опору." },
  { number: 2, name: "Снежная королева", resource: "2–2.5 ед.", text: "Замороженность жизни. Ресурс еще не активен, но не исчезает. Появляется первая точка опоры, равновесия.", direction: "Даем тепло." },
  { number: 3, name: "Прометей", resource: "2.5–3.0 ед.", text: "Нестабильность ресурса. Первое наполнение силой. Свечение жизни. Ресурс уже можно нащупать, он начинает излучать, но пока очень мягко.", direction: "Даем структуру." },
  { number: 4, name: "Крепость", resource: "3.0–3.5 ед.", text: "Начинается чувствоваться первая ось. Она пока слаба, но человек уже не соскальзывает в дефицит.", direction: "Даем проявленность." },
  { number: 5, name: "Король / Королева", resource: "3.5–4.0 ед.", text: "Идут первые импульсы вовне. Заполнение пространства, проявление Я, свободной воли.", direction: "Даем силу." },
  { number: 6, name: "Капитан", resource: "4.0–4.5 ед.", text: "Достаточно крепкий стержень. Есть способность заявлять о себе, подстраивать мир под себя. Пока слегка жестковато и скованно.", direction: "Даем мягкость." },
  { number: 7, name: "Ручей", resource: "4.5–5.0 ед.", text: "Проявляются импульсы интереса к контакту с миром. Любопытство к мягкому взаимодействию.", direction: "Даем смелость." },
  { number: 8, name: "Река", resource: "5.0–5.5 ед.", text: "Уже ощущается некоторая мягкая полнота, изобилие, но пока робкая, смущенная." },
  { number: 9, name: "Озеро", resource: "5.5–6.0 ед.", text: "Возникает желание мягко делиться с миром своим ресурсом, тем, что накоплено, формировать связи и процессы." },
  { number: 10, name: "Хозяин Гавани", resource: "6.0–6.5 ед.", text: "Легкий праздник. Открытие гавани. Возникает желание выходить в более большой мир, проявляться." },
  { number: 11, name: "Парусник", resource: "6.5–7.0 ед.", text: "Больше целеустремленности. Есть цели, желание в большом мире довести их до реализации." },
  { number: 12, name: "Владыка водопада", resource: "7.0–7.5 ед.", text: "Есть уверенность в том, что ты делаешь, смелость, готовность вещать широко, рассказывать, делиться, проявляться." },
  { number: 13, name: "Дельта реки", resource: "7.5–8.0 ед.", text: "Возникает некоторая гордость, самоуверенность. Ощущение приближения миссии, значимости того, что ты делаешь, готовности вовлечь мир." },
  { number: 14, name: "Океан / Хранитель морей", resource: "8.0–8.5 ед.", text: "Ощущение масштаба. Значимости и ценности того, что ты делаешь для мира. Самодостаточность, личная гордость, ценность." },
  { number: 15, name: "Провидец / Исток реки в горах", resource: "8.5 ед.", text: "Соединение с ДАО. Ощущение, что тебя несет поток, волна. Ты делаешь не для себя, а помогаешь реализоваться через себя более большим течениям. Влияешь на сознание других через свою модель мышления, видение, философию." },
  { number: 16, name: "Пустота / Дао Сюй", resource: "9 ед.", text: "Ты глубоко связан с какими-то линиями мира и реальности. Сам уже не столько творишь, сколько помогаешь реальности более мягко развернуться в определенном направлении. Больше даешь подсказки другим." },
  { number: 17, name: "У-Вэй / Закон", resource: "9.5 ед.", text: "Глубокая связь со Стихиями, Дао. Ты больше направлен на то, чтобы помочь другим найти эту связь с Дао своим состоянием и присутствием. Материальные вопросы интересуют меньше." },
  { number: 18, name: "У-цзи / Беспредельное", resource: "10 ед.", text: "Ты постоянно включен и сонастроен с Дао. Ты живешь в Дао. Ты и есть часть Дао. Основное внимание — на сохранении этой связи." },
];

const stagesEn: Stage[] = [
  { number: 1, name: "Storm (chaos)", resource: "1–2", text: "Illness, little support or strength. Energy feels as if it is sliding downward or falling through.", direction: "Give support." },
  { number: 2, name: "Snow Queen", resource: "2–2.5", text: "Life feels frozen. Resource is not yet active, but it is no longer disappearing. The first point of support and balance appears.", direction: "Give warmth." },
  { number: 3, name: "Prometheus", resource: "2.5–3.0", text: "Resource is unstable. The first filling with strength appears; life begins to glow, but still very softly.", direction: "Give structure." },
  { number: 4, name: "Fortress", resource: "3.0–3.5", text: "The first inner axis begins to be felt. It is still weak, but the person no longer slips so easily into deficit.", direction: "Give expression." },
  { number: 5, name: "King / Queen", resource: "3.5–4.0", text: "The first impulses move outward: occupying space, expressing the self and free will.", direction: "Give strength." },
  { number: 6, name: "Captain", resource: "4.0–4.5", text: "A fairly solid inner core. There is an ability to declare oneself and shape the environment, though still somewhat rigid.", direction: "Give softness." },
  { number: 7, name: "Stream", resource: "4.5–5.0", text: "Interest in contact with the world appears. There is curiosity toward softer interaction.", direction: "Give courage." },
  { number: 8, name: "River", resource: "5.0–5.5", text: "A soft sense of fullness and abundance is already present, though still shy and tentative." },
  { number: 9, name: "Lake", resource: "5.5–6.0", text: "A desire appears to share accumulated resource with the world and to form connections and processes." },
  { number: 10, name: "Harbour Keeper", resource: "6.0–6.5", text: "A light sense of celebration. The harbour opens and there is a wish to enter a larger world and become more visible." },
  { number: 11, name: "Sailboat", resource: "6.5–7.0", text: "More purposefulness. Goals are clearer and there is a wish to bring them into reality in the larger world." },
  { number: 12, name: "Lord of the Waterfall", resource: "7.0–7.5", text: "Confidence in what you do, courage, and readiness to speak widely, share and be visible." },
  { number: 13, name: "River Delta", resource: "7.5–8.0", text: "Pride and self-confidence grow. There is a sense of approaching mission, meaning and readiness to involve the world." },
  { number: 14, name: "Ocean / Keeper of the Seas", resource: "8.0–8.5", text: "A sense of scale and of the value of what you do for the world. Self-sufficiency, personal pride and value." },
  { number: 15, name: "Seer / Mountain Source", resource: "8.5", text: "Connection with Dao. It feels as though a current or wave carries you. You act less for yourself and more as a channel for larger movements, influencing others through vision and philosophy." },
  { number: 16, name: "Emptiness / Dao Xu", resource: "9", text: "A deep connection with lines of reality. You create less directly and instead help reality unfold more gently in a certain direction, offering guidance to others." },
  { number: 17, name: "Wu Wei / Law", resource: "9.5", text: "Deep connection with the Elements and Dao. Attention shifts toward helping others find this connection through your state and presence. Material concerns matter less." },
  { number: 18, name: "Wuji / The Boundless", resource: "10", text: "Continuous attunement with Dao. You live in Dao and experience yourself as part of it. The main task is to preserve this connection." },
];

const stagesEs: Stage[] = [
  { number: 1, name: "Tormenta (caos)", resource: "1–2", text: "Enfermedad, poca base y poca fuerza. La energía parece deslizarse hacia abajo o hundirse.", direction: "Damos apoyo." },
  { number: 2, name: "Reina de las Nieves", resource: "2–2.5", text: "La vida se siente congelada. El recurso aún no está activo, pero ya no desaparece. Aparece el primer punto de apoyo y equilibrio.", direction: "Damos calor." },
  { number: 3, name: "Prometeo", resource: "2.5–3.0", text: "El recurso es inestable. Aparece el primer llenado de fuerza; la vida empieza a brillar, todavía de forma suave.", direction: "Damos estructura." },
  { number: 4, name: "Fortaleza", resource: "3.0–3.5", text: "Empieza a sentirse el primer eje interno. Aún es débil, pero la persona ya no cae tan fácilmente en déficit.", direction: "Damos expresión." },
  { number: 5, name: "Rey / Reina", resource: "3.5–4.0", text: "Aparecen los primeros impulsos hacia fuera: ocupar espacio, expresar el Yo y la voluntad libre.", direction: "Damos fuerza." },
  { number: 6, name: "Capitán", resource: "4.0–4.5", text: "Un núcleo interno bastante firme. Hay capacidad de afirmarse y adaptar el mundo a uno mismo, aunque todavía con cierta rigidez.", direction: "Damos suavidad." },
  { number: 7, name: "Arroyo", resource: "4.5–5.0", text: "Aparece interés por el contacto con el mundo y curiosidad por una interacción más suave.", direction: "Damos valentía." },
  { number: 8, name: "Río", resource: "5.0–5.5", text: "Ya se siente cierta plenitud y abundancia suaves, aunque todavía tímidas." },
  { number: 9, name: "Lago", resource: "5.5–6.0", text: "Aparece el deseo de compartir con el mundo el recurso acumulado y de crear vínculos y procesos." },
  { number: 10, name: "Guardián del Puerto", resource: "6.0–6.5", text: "Una ligera sensación de fiesta. El puerto se abre y surge el deseo de salir a un mundo más grande y mostrarse." },
  { number: 11, name: "Velero", resource: "6.5–7.0", text: "Más determinación. Hay objetivos y deseo de llevarlos a la realidad en un mundo más amplio." },
  { number: 12, name: "Señor de la Cascada", resource: "7.0–7.5", text: "Confianza en lo que haces, valentía y disposición para hablar ampliamente, compartir y manifestarte." },
  { number: 13, name: "Delta del Río", resource: "7.5–8.0", text: "Crecen el orgullo y la seguridad. Aparece la sensación de acercarse a una misión y de poder involucrar al mundo." },
  { number: 14, name: "Océano / Guardián de los Mares", resource: "8.0–8.5", text: "Sensación de escala y del valor de lo que haces para el mundo. Autosuficiencia, orgullo personal y valor." },
  { number: 15, name: "Vidente / Nacimiento del río en las montañas", resource: "8.5", text: "Conexión con el Dao. Se siente como si una corriente o una ola te llevara. Actúas menos para ti y más como canal de movimientos mayores, influyendo a través de visión y filosofía." },
  { number: 16, name: "Vacío / Dao Xu", resource: "9", text: "Conexión profunda con ciertas líneas de la realidad. Creas menos directamente y ayudas a que la realidad se despliegue con más suavidad en una dirección, orientando a otros." },
  { number: 17, name: "Wu Wei / Ley", resource: "9.5", text: "Conexión profunda con los Elementos y el Dao. La atención se dirige a ayudar a otros a encontrar esa conexión mediante tu estado y presencia. Los asuntos materiales importan menos." },
  { number: 18, name: "Wuji / Lo ilimitado", resource: "10", text: "Sintonización continua con el Dao. Vives en el Dao y te experimentas como parte de él. La atención principal está en conservar esta conexión." },
];

const copy = {
  ru: {
    title: "Даосская алхимия. Уровни здоровья",
    description: "Авторская методичка Андрея Литвинова: 18 ступеней ресурса в трёх этапах Даосской Алхимии.",
    kicker: "ДАОССКАЯ АЛХИМИЯ",
    heading: "Уровни здоровья",
    badge: "МЕТОДИЧКА",
    lead: "Простая карта из 18 ступеней: сначала восстановление ресурса, затем социальная проявленность и успех, затем духовное развитие.",
    stagesTitle: "3 этапа внутренней алхимии",
    phases: [
      { n: "01", title: "Восстановление ресурсов тела и здоровья", note: "Нижний Дянь Тянь" },
      { n: "02", title: "Социальная проявленность, дела и отношения", note: "Срединный Дянь Тянь" },
      { n: "03", title: "Духовное развитие", note: "Верхний Дянь Тянь" },
    ],
    scaleTitle: "Как читать шкалу",
    scaleText: "Первые два этапа содержат по 7 ступеней, третий — 4. Всего 18 ступеней. Они показывают рост внутреннего ресурса по авторской шкале от 1 до 10.",
    scale: [
      { range: "1–5", label: "ресурс здоровья" },
      { range: "5–8", label: "ресурс успеха" },
      { range: "9–10", label: "духовная сила" },
    ],
    cycleTitle: "Как проходит цикл",
    cycleText: "В моей рабочей модели один цикл Даосской Алхимии — это переход примерно на одну ступень вверх. В среднем я закладываю около 1 месяца и 2 сессии. Обычно клиенты начинают примерно со 2-й ступени.",
    diagnostic: "Экспресс-диагностика подскажет, где вы сейчас.",
    diagnosticCta: "Пройти экспресс-диагностику",
    levels: "Описание ступеней",
    health: "Этап 1. Алхимия здоровья",
    success: "Этап 2. Алхимия успеха · Любовь и Деньги",
    spirit: "Этап 3. Алхимия духа",
    exampleTitle: "Как проходит работа на 1–7 ступени",
    example: [
      "Определяем текущую ступень по экспресс-диагностике и живому разбору.",
      "Выбираем ближайшую задачу уровня: опора, тепло, структура, проявленность, сила, мягкость или смелость.",
      "Проходим цикл из двух сессий примерно за месяц.",
      "Повторно смотрим состояние и решаем, готов ли ресурс перейти на следующую ступень.",
    ],
    linksTitle: "Ключевые ссылки",
    links: [
      { label: "Описание этапов", href: "https://t.me/daomagic/170" },
      { label: "Описание ступеней", href: "https://t.me/daomagic/131" },
      { label: "Краткий тест (1–4 уровень)", href: "https://t.me/daomagic/93" },
    ],
    trauma: "Психотерапия травмы: прямой и обратный круг У-Син",
    daoPath: "Мой путь к Китайской Традиции",
    intro: "Краткое введение",
    books: "Открыть книги и материалы по Даосской традиции",
    contact: "Чтобы заказать личную диагностику и разбор ситуации, напишите мне в Telegram.",
    contactCta: "Написать @AndyTherapist",
    note: "Это авторская символическая шкала ресурса и развития, а не медицинская шкала здоровья и не диагноз. При физических или психических симптомах, требующих медицинской помощи, нужна обычная профессиональная оценка.",
  },
  en: {
    title: "Daoist Alchemy. Levels of Health",
    description: "Andy Litvinov’s 18-stage resource map across three stages of Daoist Alchemy.",
    kicker: "DAOIST ALCHEMY",
    heading: "Levels of Health",
    badge: "GUIDE",
    lead: "A simple 18-stage map: first restore resource, then expand social expression and success, then move toward spiritual development.",
    stagesTitle: "3 stages of inner alchemy",
    phases: [
      { n: "01", title: "Restoring body resources and health", note: "Lower Dantian" },
      { n: "02", title: "Social expression, work and relationships", note: "Middle Dantian" },
      { n: "03", title: "Spiritual development", note: "Upper Dantian" },
    ],
    scaleTitle: "How to read the scale",
    scaleText: "The 18 stages describe growth of inner resource on the author’s 1–10 scale.",
    scale: [
      { range: "1–5", label: "health resource" },
      { range: "5–8", label: "success resource" },
      { range: "9–10", label: "spiritual strength" },
    ],
    cycleTitle: "How one cycle works",
    cycleText: "In my working model, one Daoist Alchemy cycle usually means moving roughly one stage upward. I normally allow about one month and two sessions. Many clients begin around stage 2.",
    diagnostic: "A short assessment helps identify your current stage.",
    diagnosticCta: "Start express assessment",
    levels: "The 18 stages",
    health: "Stage 1. Alchemy of Health",
    success: "Stage 2. Alchemy of Success · Love & Money",
    spirit: "Stage 3. Alchemy of Spirit",
    exampleTitle: "How work usually proceeds through stages 1–7",
    example: [
      "Identify the current stage through a short assessment and personal review.",
      "Choose the nearest task: support, warmth, structure, expression, strength, softness, or courage.",
      "Complete a two-session cycle over about one month.",
      "Review the state again and decide whether the resource is ready for the next stage.",
    ],
    linksTitle: "Key links",
    links: [
      { label: "Description of the three stages", href: "https://t.me/daomagic/170" },
      { label: "Description of the levels", href: "https://t.me/daomagic/131" },
      { label: "Short test (levels 1–4)", href: "https://t.me/daomagic/93" },
    ],
    trauma: "Trauma psychotherapy: direct and reverse Wu Xing cycle",
    daoPath: "My path to the Chinese Tradition",
    intro: "Short introduction",
    books: "Open Daoist books and materials",
    contact: "For a personal assessment and situation review, write to me on Telegram.",
    contactCta: "Message @AndyTherapist",
    note: "This is an author-developed symbolic resource and development scale, not a medical health scale or diagnosis. Physical or mental-health symptoms that need care require ordinary professional assessment.",
  },
  es: {
    title: "Alquimia taoísta. Niveles de salud",
    description: "Mapa de 18 etapas de recurso de Andy Litvinov en tres fases de Alquimia Taoísta.",
    kicker: "ALQUIMIA TAOÍSTA",
    heading: "Niveles de salud",
    badge: "GUÍA",
    lead: "Un mapa sencillo de 18 etapas: primero recuperar recurso, después ampliar la expresión social y el éxito, y luego avanzar hacia el desarrollo espiritual.",
    stagesTitle: "3 etapas de alquimia interna",
    phases: [
      { n: "01", title: "Restaurar recursos del cuerpo y la salud", note: "Dantian inferior" },
      { n: "02", title: "Expresión social, trabajo y relaciones", note: "Dantian medio" },
      { n: "03", title: "Desarrollo espiritual", note: "Dantian superior" },
    ],
    scaleTitle: "Cómo leer la escala",
    scaleText: "Las 18 etapas describen el crecimiento del recurso interno en la escala de autor de 1 a 10.",
    scale: [
      { range: "1–5", label: "recurso de salud" },
      { range: "5–8", label: "recurso de éxito" },
      { range: "9–10", label: "fuerza espiritual" },
    ],
    cycleTitle: "Cómo funciona un ciclo",
    cycleText: "En mi modelo de trabajo, un ciclo de Alquimia Taoísta suele equivaler a subir aproximadamente una etapa. Normalmente calculo alrededor de un mes y dos sesiones. Muchos clientes comienzan cerca de la etapa 2.",
    diagnostic: "Una evaluación breve ayuda a identificar tu etapa actual.",
    diagnosticCta: "Hacer evaluación breve",
    levels: "Las 18 etapas",
    health: "Etapa 1. Alquimia de la salud",
    success: "Etapa 2. Alquimia del éxito · Amor y Dinero",
    spirit: "Etapa 3. Alquimia del espíritu",
    exampleTitle: "Cómo suele ser el trabajo en las etapas 1–7",
    example: [
      "Identificamos la etapa actual con una evaluación breve y una revisión personal.",
      "Elegimos la tarea más cercana: apoyo, calor, estructura, expresión, fuerza, suavidad o valentía.",
      "Realizamos un ciclo de dos sesiones durante aproximadamente un mes.",
      "Revisamos de nuevo el estado y decidimos si el recurso está listo para la siguiente etapa.",
    ],
    linksTitle: "Enlaces clave",
    links: [
      { label: "Descripción de las tres etapas", href: "https://t.me/daomagic/170" },
      { label: "Descripción de los niveles", href: "https://t.me/daomagic/131" },
      { label: "Test breve (niveles 1–4)", href: "https://t.me/daomagic/93" },
    ],
    trauma: "Psicoterapia del trauma: ciclo Wu Xing directo e inverso",
    daoPath: "Mi camino hacia la Tradición China",
    intro: "Introducción breve",
    books: "Abrir libros y materiales taoístas",
    contact: "Para una evaluación personal y revisión de la situación, escríbeme por Telegram.",
    contactCta: "Escribir a @AndyTherapist",
    note: "Esta es una escala simbólica de recurso y desarrollo creada por el autor, no una escala médica de salud ni un diagnóstico. Los síntomas físicos o de salud mental que requieren atención necesitan una evaluación profesional habitual.",
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

function StageList({ title, stages }: { title: string; stages: Stage[] }) {
  return (
    <section className={styles.levelSection}>
      <h2>{title}</h2>
      <div className={styles.levels}>
        {stages.map((stage) => (
          <article className={styles.levelCard} key={stage.number}>
            <div className={styles.levelNumber}>{stage.number}</div>
            <div className={styles.levelBody}>
              <div className={styles.levelTop}>
                <h3>{stage.name}</h3>
                <span>{stage.resource}</span>
              </div>
              <p>{stage.text}</p>
              {stage.direction ? <strong>{stage.direction}</strong> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
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

      <section className={styles.overview}>
        <h2>{text.stagesTitle}</h2>
        <div className={styles.phaseGrid}>
          {text.phases.map((phase) => (
            <article key={phase.n}>
              <span>{phase.n}</span>
              <h3>{phase.title}</h3>
              <p>{phase.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.scale}>
        <div>
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

      <section className={styles.cycle}>
        <div>
          <h2>{text.cycleTitle}</h2>
          <p>{text.cycleText}</p>
          <strong>{text.diagnostic}</strong>
        </div>
        <Link className="hh-primary" href={`/${locale}/services#available-services`}>{text.diagnosticCta}</Link>
      </section>

      <div className={styles.levelsIntro}>
        <p className="homeopathy-kicker">{text.levels}</p>
      </div>

      <StageList title={text.health} stages={stages.slice(0, 7)} />
      <StageList title={text.success} stages={stages.slice(7, 14)} />
      <StageList title={text.spirit} stages={stages.slice(14)} />

      <section className={styles.example}>
        <h2>{text.exampleTitle}</h2>
        <ol>
          {text.example.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className={styles.links}>
        <h2>{text.linksTitle}</h2>
        <div className={styles.linkGrid}>
          {text.links.map((item) => (
            <a href={item.href} key={item.href} rel="noreferrer" target="_blank">{item.label} ↗</a>
          ))}
          <span>{text.trauma}</span>
          <span>{text.daoPath}</span>
          <span>{text.intro}</span>
          <Link href={`/${locale}/books`}>{text.books}</Link>
        </div>
      </section>

      <section className={styles.contact}>
        <div>
          <h2>{text.contact}</h2>
          <p>{text.note}</p>
        </div>
        <a className="hh-primary" href="https://t.me/AndyTherapist" rel="noreferrer" target="_blank">{text.contactCta}</a>
      </section>
    </main>
  );
}
