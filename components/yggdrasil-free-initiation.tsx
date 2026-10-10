import Link from "next/link";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { YggdrasilSideNavigation } from "@/components/reiki-course-side-nav";
import { AcademyBackLink } from "@/components/academy-hub";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./yggdrasil-free-initiation.module.css";

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
  back: string;
};

const copy: Record<PublicLocale, LocaleStrings> = {
  en: {
    eyebrow: "A gift for new students · Basic Course / Level 1",
    title: "How to receive Reiki Yggdrasil Level 1 for free",
    lead: "Begin with a personal introduction to the World Tree, the four first-level streams and the traditional teacher-led initiation. All first-level study materials and the seven preparation questions are collected on this page.",
    sourceNote: "Free introductory initiation, timing and personal availability must be confirmed with Andrey; this page does not automatically book or grant an attunement.",
    freeLabel: "7 preparation questions · 3 ways to begin",
    choiceTitle: "Three ways to study",
    choices: [
      { title: "Free group introduction", description: "Join an online or in-person introductory group class when one is scheduled. Ask about availability before planning to attend." },
      { title: "Free individual trial", description: "Read the study materials independently, prepare answers to the seven questions and request a teacher-guided introductory Level 1 session." },
      { title: "Personal paid class", description: "Individual paid study with Andrey may be available. Ask about current format and pricing." },
    ],
    stepsTitle: "How to prepare for the free introductory initiation",
    steps: [
      "Send Andrey a request specifying that you are interested in the free Reiki Yggdrasil Level 1 initiation.",
      "Read the FAQ, the Basic Course book and Level 1 lessons linked below.",
      "Study the seven original checklist topics and write answers in your own words. The questions are about the teaching system, not a medical assessment.",
      "Send your answers or discuss them with Andrey, then agree on the available teacher-led format and time. Do not assume an initiation is booked before confirmation.",
    ],
    readingTitle: "Materials to read before the session",
    readingIntro: "All materials for preparing are now on Holistic House: learning FAQ, the Basic Course book, Level 1 attunements and practical exercises.",
    readingLinks: ["FAQ about learning · Read here", "Basic Course book · Full introduction", "Level 1 · Four attunements and practices", "Exercises · All five basic levels"],
    videoTitle: "Level 1 introduction · English video",
    videoLead: "Watch the first-level introductory recording here before working through the seven questions.",
    checklistTitle: "Seven questions for Reiki Yggdrasil Level 1",
    checklistIntro: "Seven preparation questions to study and discuss with the teacher, not an online exam.",
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
    back: "Reiki Yggdrasil course",
  },
  ru: {
    eyebrow: "Подарок для новых учеников · Базовый курс / ступень 1",
    title: "Как бесплатно получить инициацию в 1-ю ступень Рейки Иггдрасиль",
    lead: "Начните знакомство с Мировым Древом, четырьмя настройками первой ступени и традицией передачи инициации от преподавателя. На этой странице собраны учебные материалы и семь вопросов для самостоятельной подготовки.",
    sourceNote: "Возможность бесплатной вводной инициации, дату и формат нужно подтвердить у Андрея лично; чтение страницы не означает автоматическую запись или настройку.",
    freeLabel: "7 вопросов для подготовки · 3 способа начать",
    choiceTitle: "Три варианта обучения",
    choices: [
      { title: "Бесплатный групповой урок", description: "Присоединиться к ознакомительному занятию онлайн или очно, если открыт набор. Дату и формат нужно уточнить заранее." },
      { title: "Бесплатная индивидуальная инициация", description: "Самостоятельно прочесть материалы, подготовить ответы на семь вопросов и запросить вводную сессию с преподавателем." },
      { title: "Платное индивидуальное занятие", description: "Индивидуальные платные занятия тоже могут быть доступны. Уточните действующий формат и стоимость." },
    ],
    stepsTitle: "Как подготовиться к бесплатной первой ступени",
    steps: [
      "Напишите Андрею, что хотите пройти бесплатное знакомство и инициацию первой ступени Рейки Иггдрасиль.",
      "Изучите FAQ по системе, подробное описание и четыре настройки первой ступени по ссылкам ниже.",
      "Подготовьте ответы своими словами на семь контрольных вопросов. Это проверка понимания учебной системы, а не медицинский опросник.",
      "Отправьте ответы или обсудите их с Андреем, после чего согласуйте время и подходящий формат передачи настройки. Запись подтверждается только личным ответом.",
    ],
    readingTitle: "Что необходимо прочитать",
    readingIntro: "Всё необходимое собрано на Holistic House: вопросы об обучении, книга Базового курса, настройки и практические упражнения.",
    readingLinks: ["Вопросы об обучении · Читать здесь", "Книга Базового курса · Полное описание", "Первая ступень · Целительство, Интуиция, Защита, Гармонизация ситуации", "Практикум · Упражнения пяти ступеней"],
    videoTitle: "Вводное видео первой ступени · английская речь",
    videoLead: "Вводная запись на английском. Просмотр по нажатию, без автоматического звука.",
    checklistTitle: "Семь контрольных вопросов для 1-й ступени",
    checklistIntro: "Семь вопросов для самостоятельной подготовки и обсуждения с преподавателем. Ответы можно записать самостоятельно или обсудить с преподавателем.",
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
    back: "К программе Рейки Иггдрасиль",
  },
  es: {
    eyebrow: "Regalo para estudiantes · Curso básico / Nivel 1",
    title: "Cómo recibir gratis la iniciación de Reiki Yggdrasil Nivel 1",
    lead: "Conoce el Árbol del Mundo, las cuatro prácticas iniciales y la iniciación guiada por un profesor. Aquí encontrarás los materiales de estudio y siete preguntas de preparación.",
    sourceNote: "Andrey confirmará personalmente la disponibilidad y fecha de la iniciación gratuita; leer la página no reserva una sesión.",
    freeLabel: "7 preguntas · 3 maneras de comenzar",
    choiceTitle: "Tres formas de aprender",
    choices: [
      { title: "Clase grupal gratuita", description: "Participa presencialmente o en línea cuando haya una sesión disponible." },
      { title: "Iniciación individual gratuita", description: "Lee los materiales, prepara siete respuestas y solicita una sesión introductoria guiada." },
      { title: "Clase individual de pago", description: "También puede haber clases individuales de pago. Consulta el formato y precio actuales." },
    ],
    stepsTitle: "Pasos para prepararte",
    steps: [
      "Contacta con Andrey y expresa tu interés en el Nivel 1 gratuito.",
      "Lee las preguntas frecuentes, la descripción general y las cuatro prácticas del primer nivel.",
      "Prepara tus respuestas a las siete preguntas con tus propias palabras.",
      "Comparte tus respuestas con el profesor y acuerda la modalidad y la fecha disponibles.",
    ],
    readingTitle: "Lecturas recomendadas",
    readingIntro: "Todos los materiales están aquí: preguntas frecuentes, libro, primera etapa y ejercicios prácticos.",
    readingLinks: ["Preguntas frecuentes · Leer aquí", "Libro del Curso Básico · Guía completa", "Primer nivel · Cuatro prácticas", "Ejercicios prácticos · Cinco niveles"],
    videoTitle: "Introducción al Nivel 1 · Video en inglés",
    videoLead: "Mira el video introductorio aquí y continúa con las siete preguntas.",
    checklistTitle: "Siete preguntas para el Nivel 1",
    checklistIntro: "Siete preguntas para preparar y conversar con el profesor.",
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
    back: "Programa Reiki Yggdrasil",
  },
};

const learningFaqs: Record<PublicLocale, Array<{ q: string; a: string }>> = {
  en: [
    { q: "Do I need previous Reiki experience?", a: "No previous training is needed for the introductory level. Begin with the first-level course materials." },
    { q: "Can I receive initiation simply by reading?", a: "No. The course describes a teacher-led attunement. Reading and the seven questions are preparation." },
    { q: "How should I practise?", a: "Use the exercises inside each level, keep a journal and practise with another person only by mutual consent." },
    { q: "When is the next free session?", a: "Andrey confirms the current availability, date and online or in-person format personally." },
  ],
  ru: [
    { q: "Нужен ли опыт других систем Рейки?", a: "Для вводной первой ступени предварительная подготовка в других традициях не требуется." },
    { q: "Можно ли пройти инициацию самостоятельно по тексту?", a: "Нет. В рамках курса настройка передаётся преподавателем; чтение и семь вопросов — подготовка." },
    { q: "Как выполнять упражнения?", a: "Все задания находятся внутри ступеней. Ведите дневник и практикуйте с партнёром только по взаимному согласию." },
    { q: "Когда ближайшее бесплатное занятие?", a: "Дату, доступность и онлайн- или очный формат подтверждает Андрей лично." },
  ],
  es: [
    { q: "¿Necesito experiencia previa en Reiki?", a: "No necesitas experiencia anterior para comenzar el nivel introductorio." },
    { q: "¿Puedo iniciarme solo leyendo?", a: "No. El curso describe una iniciación guiada por un profesor; la lectura es preparación." },
    { q: "¿Cómo debo practicar?", a: "Abre cada nivel, sigue los ejercicios y lleva un diario. La práctica con otra persona exige consentimiento." },
    { q: "¿Cuándo es la próxima sesión gratuita?", a: "Andrey confirma personalmente la fecha, disponibilidad y modalidad." },
  ],
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
  const reading = ["#learning-faq", root + "/basic-course/description", root + "/basic-course#ry-l01-s01", root + "/basic-course#yggdrasil-basic-course-learning"];
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
                <Link href={url} key={url}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {c.readingLinks[index]} <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
            <details className={styles.faqDisclosure} id="learning-faq">
              <summary>{locale === "ru" ? "Вопросы об обучении и инициации" : locale === "es" ? "Preguntas sobre formación e iniciación" : "Questions about learning and initiation"} ↓</summary>
              <div className={styles.faqAnswers}>
                {learningFaqs[locale].map((item) => (
                  <details key={item.q}>
                    <summary>{item.q}</summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </details>
          </section>

          <section className={styles.section} id="intro-video" aria-labelledby="yggdrasil-original-video">
            <h2 id="yggdrasil-original-video">{c.videoTitle}</h2>
            <p>{c.videoLead}</p>
            <div className={styles.videoFrame}>
              <AcademyVideoPlayer youtubeId="DYo-fG-SyKw" title={c.videoTitle} />
            </div>
          </section>

          <section className={styles.checklist} id="checklist" aria-labelledby="yggdrasil-free-checklist">
            <p className={styles.eyebrow}>{locale === "ru" ? "Базовый курс · Ступень 1" : locale === "es" ? "Curso básico · Nivel 1" : "Basic Course · Level 1"}</p>
            <h2 id="yggdrasil-free-checklist">{c.checklistTitle}</h2>
            <p>{c.checklistIntro}</p>
            <ol className={styles.questions}>{c.questions.map((question) => <li key={question}>{question}</li>)}</ol>
            <p className={styles.claimNote}>{c.statement}</p>
          </section>

          <section className={styles.section} id="after-first-level" aria-labelledby="yggdrasil-free-after">
            <h2 id="yggdrasil-free-after">{c.afterTitle}</h2>
            <ol className={styles.steps}>{c.after.map((step) => <li key={step}>{step}</li>)}</ol>
            <div className={styles.links}>
              <Link href={root + "/basic-course#ry-l01-s01"}>{locale === "ru" ? "Задания первой ступени" : locale === "es" ? "Ejercicios del Nivel 1" : "Level 1 practice"} →</Link>
              <Link href={root + "/basic-course/description"}>{locale === "ru" ? "Книга Базового курса" : locale === "es" ? "Libro del Curso Básico" : "Basic Course book"} →</Link>
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

        </article>
      </div>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}
