import Link from "next/link";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import { AcademyBackLink } from "@/components/academy-hub";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./yggdrasil-free-initiation.module.css";

const source = "https://superskills.vip";
const freeInitiationSource =
  source + "/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class/step-0-how-to-get-runic-reiki-initiation-free.html";
const readingSource =
  source + "/books/reiki/runic-reiki-yggdrasil-brief-description/questions-to-get-the-free-class-of-runic-reiki.html";
const faqSource =
  source + "/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class/faq-how-to-study-runic-reiki-yggdrasil.html";
const fullDescriptionSource =
  source + "/books/reiki/runic-reiki-yggdrasil-brief-description/what-is-runic-reiki-detailed-overview.html";
const levelOneSource =
  source + "/books/reiki/runic-reiki-yggdrasil-brief-description/retreat-1-details-basic-5-levels-of-initiation-into-runic-reiki.html";
const exerciseSource =
  source + "/books/reiki/runic-reiki-yggdrasil-brief-description/runic-reiki-practice.html";
const originalFreeListing = source + "/free-trial-runic-reiki-initiation-level-1.html";
// Public group linked from the historical SuperSkills post-initiation reading page.
const originalStudentGroup = "https://www.facebook.com/groups/538515487068141/";

type LocaleStrings = {
  eyebrow: string; title: string; lead: string;
  sourceNote: string; freeLabel: string;
  choiceTitle: string; choices: Array<{ title: string; description: string }>;
  stepsTitle: string; steps: string[];
  readingTitle: string; readingIntro: string;
  readingLinks: string[]; videoTitle: string; videoLead: string; checklistTitle: string; checklistIntro: string;
  questions: string[]; statement: string;
  afterTitle: string; after: string[];
  ctaTitle: string; ctaText: string; whatsapp: string; telegram: string;
  footer: string; back: string; source: string; sourceReading: string; exercises: string;
};

const copy: Record<PublicLocale, LocaleStrings> = {
  en: {
    eyebrow: "A gift for new students · Basic Course / Level 1",
    title: "How to receive Reiki Yggdrasil Level 1 for free",
    lead: "Begin with a personal introduction to the World Tree, the four first-level streams and the traditional teacher-led initiation. This guide follows the original SuperSkills materials and makes the seven preparation questions easy to find.",
    sourceNote: "The original article describes a historical offer. Free participation, schedules and personal availability must be confirmed with Andrey before any initiation; completing this page does not automatically grant an attunement.",
    freeLabel: "7 original preparation topics · 3 ways to begin",
    choiceTitle: "Three ways to study",
    choices: [
      { title: "Free group introduction", description: "Join an online or in-person introductory group class when one is scheduled. Ask about availability before planning to attend." },
      { title: "Free individual trial", description: "Read the study materials independently, prepare answers to the seven questions and request a teacher-guided introductory Level 1 session." },
      { title: "Personal paid class", description: "The old source also describes a paid one-to-one class and initiation. Its historic listed price is not a current quote; ask about the present format and terms." },
    ],
    stepsTitle: "How to prepare for the free introductory initiation",
    steps: [
      "Send Andrey a request specifying that you are interested in the free Reiki Yggdrasil Level 1 initiation.",
      "Read the system FAQ, detailed overview and Level 1 stream descriptions linked below.",
      "Study the seven original checklist topics and write answers in your own words. The questions are about the teaching system, not a medical assessment.",
      "Send your answers or discuss them with Andrey, then agree on the available teacher-led format and time. Do not assume an initiation is booked before confirmation.",
    ],
    readingTitle: "Materials to read before the session",
    readingIntro: "Two readings are specifically requested in the original free-initiation article. The Level 1 description and practical exercises help you prepare more thoroughly.",
    readingLinks: ["Study FAQ · Required reading", "Detailed explanation · Required reading", "Level 1 · Healing, Intuition, Protection, Situation balancing", "Practice examples · First four levels"],
    videoTitle: "Original Level 1 introduction · English audio",
    videoLead: "An introductory video preserved in the SuperSkills study materials. Watch in place, then continue to the seven preparation questions.",
    checklistTitle: "Seven questions for Reiki Yggdrasil Level 1",
    checklistIntro: "The original SuperSkills list, accurately restated in English. These are self-study questions, not an online exam or a condition that this website evaluates automatically.",
    questions: [
      "Which is more fundamental to the Runic Reiki system: Reiki, runes, or their combination?",
      "What differences does the author claim between Runic Reiki and classical Usui Reiki, and how are these claims explained within the tradition?",
      "What does Yggdrasil, the World Tree, represent in Scandinavian tradition and in the course?",
      "What is the Healing stream or attunement in Runic Reiki, and how is it traditionally described as being used?",
      "How is the Protection stream described, and in what situations do students practise it?",
      "What is the Money Stream Activation attunement, and what symbolic or practical purposes does the course associate with it?",
      "Which pantheons and deities does the course introduce for study at Level 5?",
    ],
    statement: "The source describes energy, healing and other esoteric effects as part of its spiritual teaching. These claims are not established medical facts. Reiki Yggdrasil does not replace health care or guarantee healing, money or supernatural abilities.",
    afterTitle: "After the first initiation: what to do next",
    after: [
      "Read the first-level descriptions again and revisit the course FAQ.",
      "Practise the four first-level themes—Healing, Intuition, Protection and Situation Balancing—in a reflective way, with another willing participant if appropriate.",
      "Keep a learning journal of impressions, questions and what you discover. Do not use sensations to diagnose others.",
      "Share the seven answers and questions with the teacher, discuss your experience and only then decide whether to progress to the next course level.",
    ],
    ctaTitle: "Ready to begin?",
    ctaText: "Write directly to Andrey. Your message is prepared but will not be sent until you approve it in WhatsApp or Telegram.",
    whatsapp: "Request free Level 1 via WhatsApp",
    telegram: "Contact Andrey in Telegram",
    footer: "Historical source references · The details above are adapted, not verbatim reproductions of SuperSkills articles.",
    back: "Reiki Yggdrasil course",
    source: "Read how to get the free initiation on SuperSkills",
    sourceReading: "Read the post-initiation guide and original checklist",
    exercises: "See the practical exercises",
  },
  ru: {
    eyebrow: "Подарок для новых учеников · Базовый курс / ступень 1",
    title: "Как бесплатно получить инициацию в 1-ю ступень Рейки Иггдрасиль",
    lead: "Начните знакомство с Мировым Древом, четырьмя настройками первой ступени и традицией передачи инициации от преподавателя. Эта страница объединяет правила SuperSkills и все семь вопросов для самостоятельной подготовки.",
    sourceNote: "В исходной статье описаны исторические условия предложения. Возможность бесплатной инициации, расписание и формат необходимо подтвердить у Андрея; прочтение этой страницы само по себе не означает запись или передачу настройки.",
    freeLabel: "7 вопросов для подготовки · 3 способа начать",
    choiceTitle: "Три варианта обучения",
    choices: [
      { title: "Бесплатный групповой урок", description: "Присоединиться к ознакомительному занятию онлайн или очно, если открыт набор. Дату и формат нужно уточнить заранее." },
      { title: "Бесплатная индивидуальная инициация", description: "Самостоятельно прочесть материалы, подготовить ответы на семь вопросов и запросить вводную сессию с преподавателем." },
      { title: "Платное индивидуальное занятие", description: "В старой статье упоминается также платный персональный урок с инициацией. Историческая цена не является актуальным предложением — уточните условия." },
    ],
    stepsTitle: "Как подготовиться к бесплатной первой ступени",
    steps: [
      "Напишите Андрею, что хотите пройти бесплатное знакомство и инициацию первой ступени Рейки Иггдрасиль.",
      "Изучите FAQ по системе, подробное описание и четыре настройки первой ступени по ссылкам ниже.",
      "Подготовьте ответы своими словами на семь контрольных вопросов. Это проверка понимания учебной системы, а не медицинский опросник.",
      "Отправьте ответы или обсудите их с Андреем, после чего согласуйте время и подходящий формат передачи настройки. Запись подтверждается только личным ответом.",
    ],
    readingTitle: "Что необходимо прочитать",
    readingIntro: "В исходной статье обязательными для самостоятельного изучения названы FAQ и подробное описание системы. Описание первой ступени и практикум полезны для углубления.",
    readingLinks: ["FAQ по обучению · Обязательное чтение", "Подробное описание системы · Обязательное чтение", "Первая ступень · Целительство, Интуиция, Защита, Гармонизация ситуации", "Практикум · Упражнения первых четырёх ступеней"],
    videoTitle: "Оригинальное вводное видео · речь на английском",
    videoLead: "Видеозапись из исходных учебных материалов SuperSkills. Просмотр — по нажатию, звук не включается автоматически.",
    checklistTitle: "Семь контрольных вопросов для 1-й ступени",
    checklistIntro: "Все семь тем из оригинального списка SuperSkills, переформулированные по-русски без изменения содержания. Ответы можно записать самостоятельно или обсудить с преподавателем.",
    questions: [
      "Что лежит в основе системы Рейки Иггдрасиль — Рейки, руны или их сочетание?",
      "Чем автор системы объясняет заявленные отличия Рейки Иггдрасиль от классического Усуи Рейки?",
      "Что такое Иггдрасиль — Мировое Древо — в скандинавской традиции и в системе обучения?",
      "Что означает поток или настройка «Целительство» и как его традиционно описывают?",
      "Как описывается работа потока «Защита» и в каких ситуациях его практикуют?",
      "В чём идея настройки «Активация денежного потока» и какие символические задачи с ней связывают?",
      "С какими пантеонами и богами предполагается знакомство на пятой ступени Рейки Иггдрасиль?",
    ],
    statement: "Описания целительства, энергетических потоков и иных эзотерических эффектов являются частью традиции, а не доказанными медицинскими фактами. Инициация не заменяет медицинскую помощь и не гарантирует исцеления, дохода или сверхъестественных способностей.",
    afterTitle: "После первой инициации: что делать дальше",
    after: [
      "Повторно прочитайте описание первой ступени и FAQ по системе.",
      "Практикуйте темы четырёх настроек — «Целительство», «Интуиция», «Защита», «Гармонизация ситуации» — как упражнения внимания. Работайте с партнёром только по согласию.",
      "Ведите личную книгу практики: отмечайте переживания, вопросы и наблюдения, не используя ощущения для диагностики других людей.",
      "Передайте преподавателю ответы на семь вопросов и задайте свои вопросы. Следующую ступень планируйте после обсуждения с преподавателем.",
    ],
    ctaTitle: "Хотите начать?",
    ctaText: "Напишите Андрею напрямую. В WhatsApp откроется готовое сообщение, которое вы отправите только после подтверждения.",
    whatsapp: "Запросить бесплатную 1-ю ступень в WhatsApp",
    telegram: "Написать Андрею в Telegram",
    footer: "Исторические первоисточники · Материалы адаптированы на основе SuperSkills и не воспроизводят статьи дословно.",
    back: "К программе Рейки Иггдрасиль",
    source: "Исходная статья SuperSkills: как получить бесплатно",
    sourceReading: "Исходный список вопросов и инструкция после инициации",
    exercises: "Открыть практические задания",
  },
  es: {
    eyebrow: "Regalo para estudiantes · Curso básico / Nivel 1",
    title: "Cómo recibir gratis la iniciación de Reiki Yggdrasil Nivel 1",
    lead: "Conoce el Árbol del Mundo, las cuatro prácticas iniciales y la iniciación guiada por un profesor. Esta guía reúne las condiciones históricas y siete preguntas de preparación.",
    sourceNote: "La oferta original es histórica. Confirma disponibilidad, calendario y condiciones actuales con Andrey. Leer esta página no reserva ni realiza una iniciación.",
    freeLabel: "7 preguntas · 3 maneras de comenzar",
    choiceTitle: "Tres formas de aprender",
    choices: [
      { title: "Clase grupal gratuita", description: "Participa presencialmente o en línea cuando haya una sesión disponible." },
      { title: "Iniciación individual gratuita", description: "Lee los materiales, prepara siete respuestas y solicita una sesión introductoria guiada." },
      { title: "Clase individual de pago", description: "La fuente histórica también menciona esta opción. Consulta las condiciones y precios actuales." },
    ],
    stepsTitle: "Pasos para prepararte",
    steps: [
      "Contacta con Andrey y expresa tu interés en el Nivel 1 gratuito.",
      "Lee las preguntas frecuentes, la descripción general y las cuatro prácticas del primer nivel.",
      "Prepara tus respuestas a las siete preguntas con tus propias palabras.",
      "Comparte tus respuestas con el profesor y acuerda la modalidad y la fecha disponibles.",
    ],
    readingTitle: "Lecturas recomendadas",
    readingIntro: "La fuente solicita leer las preguntas frecuentes y la descripción detallada. El material del primer nivel y los ejercicios amplían la preparación.",
    readingLinks: ["Preguntas frecuentes · Lectura requerida", "Descripción del sistema · Lectura requerida", "Primer nivel · Cuatro prácticas", "Ejercicios prácticos · Niveles 1–4"],
    videoTitle: "Introducción original al Nivel 1 · Audio en inglés",
    videoLead: "Video introductorio enlazado desde SuperSkills. Haz clic para reproducirlo y continúa con las siete preguntas.",
    checklistTitle: "Siete preguntas para el Nivel 1",
    checklistIntro: "Los siete temas originales de SuperSkills, reformulados en español para el estudio.",
    questions: [
      "¿Reiki, runas o su combinación: qué fundamenta Reiki Yggdrasil?",
      "¿Cómo explica el autor las diferencias que afirma entre Reiki Yggdrasil y Usui Reiki?",
      "¿Qué es Yggdrasil, el Árbol del Mundo?",
      "¿Qué representa la corriente de Sanación y cómo se describe su práctica?",
      "¿Cómo se describe la corriente de Protección?",
      "¿En qué consiste la llamada Activación del flujo de dinero?",
      "¿Qué panteones y deidades se estudian en el quinto nivel?",
    ],
    statement: "Las afirmaciones esotéricas y de sanación pertenecen a la tradición y no constituyen evidencia clínica ni sustituyen la atención médica.",
    afterTitle: "Después de la primera iniciación",
    after: [
      "Vuelve a leer la descripción del primer nivel y las preguntas frecuentes.",
      "Practica las cuatro temáticas, de manera reflexiva y siempre con consentimiento de otras personas.",
      "Registra tus observaciones sin utilizarlas para diagnosticar.",
      "Comparte tus respuestas y dudas con el profesor antes de continuar.",
    ],
    ctaTitle: "¿Listo para comenzar?",
    ctaText: "Contacta directamente con Andrey. WhatsApp prepara el mensaje, pero tú decides si lo envías.",
    whatsapp: "Solicitar Nivel 1 gratis por WhatsApp",
    telegram: "Escribir a Andrey por Telegram",
    footer: "Materiales históricos adaptados de SuperSkills. Enlaces a las fuentes originales.",
    back: "Programa Reiki Yggdrasil",
    source: "Condiciones históricas de la iniciación gratuita",
    sourceReading: "Lista de preguntas y guía para después",
    exercises: "Ver ejercicios prácticos",
  },
};

export function YggdrasilFreeInitiation({ locale }: { locale: PublicLocale }) {
  const c = copy[locale];
  const root = "/" + locale + "/academy/reiki/yggdrasil";
  const msg = {
    en: "Hello Andrey! I would like to request the free Level 1 Reiki Yggdrasil initiation. I found your seven-question preparation guide on Holistic House. Please let me know about the available format and what to do with my answers.",
    ru: "Здравствуйте, Андрей! Хочу запросить бесплатную инициацию 1-й ступени Рейки Иггдрасиль. Прочитал(а) семь вопросов на Holistic House. Подскажите, как передать ответы и договориться о вводной сессии.",
    es: "Hola Andrey. Quisiera solicitar la iniciación gratuita de Reiki Yggdrasil Nivel 1. He visto las siete preguntas de preparación. ¿Cómo comparto mis respuestas y coordinamos la sesión?",
  }[locale];
  const whatsAppHref = "https://wa.me/14376066502?text=" + encodeURIComponent(msg);
  const reading = [faqSource, fullDescriptionSource, levelOneSource, exerciseSource];
  return (
    <main className="academy-reading-shell academy-reading-shell--wide" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <AcademyBackLink locale={locale} />
      <div className="academy-course-layout">
        <YggdrasilSideNavigation locale={locale} activeSlug="free-initiation" />
        <article className={styles.page}>
          <div className={styles.breadcrumb}><Link href={root}>← {c.back}</Link></div>
          <header className={styles.hero}>
            <p className={styles.eyebrow}>{c.eyebrow}</p>
            <h1>{c.title}</h1>
            <p className={styles.lead}>{c.lead}</p>
            <p className={styles.metrics}>{c.freeLabel}</p>
            <div className={styles.heroActions}>
              <a href="#checklist" className={styles.primary}>{c.checklistTitle} ↓</a>
              <a href="#request-free-initiation" className={styles.secondary}>{c.ctaTitle} ↓</a>
            </div>
            <p className={styles.sourceNote}>{c.sourceNote}</p>
          </header>

          <section className={styles.section} aria-labelledby="yggdrasil-free-choices">
            <h2 id="yggdrasil-free-choices">{c.choiceTitle}</h2>
            <div className={styles.choices}>
              {c.choices.map((choice, index) => (
                <article key={choice.title} className={styles.choice}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{choice.title}</h3>
                  <p>{choice.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="yggdrasil-free-steps">
            <h2 id="yggdrasil-free-steps">{c.stepsTitle}</h2>
            <ol className={styles.steps}>{c.steps.map((item) => <li key={item}>{item}</li>)}</ol>
          </section>

          <section className={styles.section} id="preparation-readings" aria-labelledby="yggdrasil-free-reading">
            <h2 id="yggdrasil-free-reading">{c.readingTitle}</h2>
            <p>{c.readingIntro}</p>
            <div className={styles.links}>
              {reading.map((url, index) => (
                <a href={url} target="_blank" rel="noopener noreferrer" key={url}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {c.readingLinks[index]} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </section>

          <section className={styles.section} id="intro-video" aria-labelledby="yggdrasil-original-video">
            <h2 id="yggdrasil-original-video">{c.videoTitle}</h2>
            <p>{c.videoLead}</p>
            <div className={styles.videoFrame}>
              <AcademyVideoPlayer youtubeId="DYo-fG-SyKw" title={c.videoTitle} />
            </div>
            <a className={styles.videoSource} href={readingSource} target="_blank" rel="noopener noreferrer">{c.sourceReading} ↗</a>
          </section>

          <section className={styles.checklist} id="checklist" aria-labelledby="yggdrasil-free-checklist">
            <p className={styles.eyebrow}>SuperSkills · Level 1 · 7 questions</p>
            <h2 id="yggdrasil-free-checklist">{c.checklistTitle}</h2>
            <p>{c.checklistIntro}</p>
            <ol className={styles.questions}>{c.questions.map((question) => <li key={question}>{question}</li>)}</ol>
            <p className={styles.claimNote}>{c.statement}</p>
            <a href={freeInitiationSource} target="_blank" rel="noopener noreferrer">{c.source} ↗</a>
          </section>

          <section className={styles.section} id="after-first-level" aria-labelledby="yggdrasil-free-after">
            <h2 id="yggdrasil-free-after">{c.afterTitle}</h2>
            <ol className={styles.steps}>{c.after.map((step) => <li key={step}>{step}</li>)}</ol>
            <div className={styles.links}>
              <a href={readingSource} target="_blank" rel="noopener noreferrer">{c.sourceReading} ↗</a>
              <a href={exerciseSource} target="_blank" rel="noopener noreferrer">{c.exercises} ↗</a>
              <a href={originalStudentGroup} target="_blank" rel="noopener noreferrer">{locale === "ru" ? "Историческая группа учеников в Facebook (доступность не проверена)" : locale === "es" ? "Grupo histórico de estudiantes en Facebook (disponibilidad no verificada)" : "Historical student Facebook group (availability unverified)"} ↗</a>
              <Link href={root + "/basic-course"}>{c.back} →</Link>
            </div>
          </section>

          <section className={styles.cta} id="request-free-initiation" aria-labelledby="yggdrasil-free-contact">
            <h2 id="yggdrasil-free-contact">{c.ctaTitle}</h2>
            <p>{c.ctaText}</p>
            <div className={styles.heroActions}>
              <a className={styles.primary} target="_blank" rel="noopener noreferrer" href={whatsAppHref}>{c.whatsapp} ↗</a>
              <a className={styles.secondary} target="_blank" rel="noopener noreferrer" href="https://t.me/AndyTherapist">{c.telegram} ↗</a>
            </div>
          </section>
          <footer className={styles.footer}>
            <p>{c.footer}</p>
            <a href={freeInitiationSource} target="_blank" rel="noopener noreferrer">{c.source} ↗</a>
            <a href={readingSource} target="_blank" rel="noopener noreferrer">{c.sourceReading} ↗</a>
            <a href={originalFreeListing} target="_blank" rel="noopener noreferrer">{locale === "ru" ? "Исходная карточка бесплатного курса SuperSkills (историческая)" : locale === "es" ? "Oferta original de nivel gratuito (histórica)" : "Original $0 introductory course listing (historical)"} ↗</a>
          </footer>
        </article>
      </div>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
