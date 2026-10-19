import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, HeartHandshake, Leaf, PlayCircle, Sparkles } from "lucide-react";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./reiki-referral-landing.module.css";

/**
 * Short, shareable, free-first entry to the existing five-lesson Reiki course.
 * This page does not create an enrolment record, collect personal data or
 * imply that course completion automatically grants a teacher-led initiation.
 */
const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE ACADEMY · FREE REIKI COURSE",
    title: "Discover Tantra Reiki. Start for free.",
    promise: "Complete the course and arrange a free introductory Level 1 initiation.",
    lead: "Five guided lessons with Andrey Litvinov: original meditations, simple energy-awareness practices and an introduction to three Reiki systems. No experience needed.",
    facts: ["5 guided lessons", "3 Reiki systems", "At your own pace"],
    cta: "Start the free course",
    actionNote: "Free to start · Google sign-in is only needed to save your progress.",
    imageAlt: "Woman meditating in the warm light of sunrise",
    teacher: "Guided by Andrey Litvinov",
    teacherRole: "Reiki Master Teacher",
    valueEyebrow: "WHAT YOU RECEIVE",
    valueTitle: "A gentle first step into Reiki",
    benefits: [
      { title: "Experience it", body: "Try original guided meditations and notice what you feel for yourself." },
      { title: "Understand the practice", body: "Explore Tantra Reiki, Kundalini Reiki and Reiki Yggdrasil in clear, short lessons." },
      { title: "Take the next step", body: "Complete your reflections and request the free introductory initiation with Andrey." },
    ],
    howEyebrow: "HOW IT WORKS",
    howTitle: "Three simple steps",
    steps: [
      { title: "Start the free course", body: "Open the interactive lessons — no payment required." },
      { title: "Learn and practise", body: "Watch, try the exercises and make brief personal notes across five lessons." },
      { title: "Arrange your initiation", body: "Complete the required course reflections and agree the free Level 1 introduction with Andrey." },
    ],
    faqTitle: "Good to know before you begin",
    faq: [
      { question: "Is the course really free?", answer: "Yes. The five-lesson interactive course is free, as is the introductory Level 1 initiation offered after completing it and confirming the arrangement with Andrey. Optional private one-to-one sessions are separate paid services." },
      { question: "Do I need Reiki experience?", answer: "No. The course starts with the foundations and leads you through all three systems step by step." },
      { question: "Will I be initiated automatically after the last slide?", answer: "No. Attunement is a separate teacher-guided arrangement. For an initiation request, complete the five lesson reports and five course answers; Andrey will review and arrange the next step personally." },
      { question: "Do I need to register?", answer: "You can explore the course as a guest. Sign in with Google and choose private saving if you want to keep your progress and prepare a saved initiation request. Your reflections are not sent to Andrey automatically." },
    ],
    bottomTitle: "Your Reiki journey can begin today",
    bottomLead: "Start with one gentle lesson. Move at your own pace.",
    secondary: "See the detailed Tantra Reiki programme",
    footer: "Spiritual education and personal practice, not medical treatment or a promise of specific results.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE ACADEMY · БЕСПЛАТНЫЙ КУРС РЕЙКИ",
    title: "Откройте Тантра Рейки. Начните бесплатно.",
    promise: "Пройдите курс и получите бесплатную вводную инициацию I ступени по согласованию с Андреем.",
    lead: "Пять коротких уроков с Андреем Литвиновым: авторские медитации, простые энергетические практики и знакомство с тремя системами Рейки. Опыт не нужен.",
    facts: ["5 уроков", "3 системы Рейки", "В своём темпе"],
    cta: "Начать бесплатный курс",
    actionNote: "Без оплаты · Вход через Google нужен только для сохранения прогресса.",
    imageAlt: "Девушка медитирует в тёплом свете рассвета",
    teacher: "Ваш наставник — Андрей Литвинов",
    teacherRole: "Мастер-учитель Рейки",
    valueEyebrow: "ЧТО ВЫ ПОЛУЧИТЕ",
    valueTitle: "Мягкое знакомство с практикой Рейки",
    benefits: [
      { title: "Почувствуете сами", body: "Попробуете авторские медитации и понаблюдаете за своими ощущениями." },
      { title: "Разберётесь в Рейки", body: "Познакомитесь с Тантра Рейки, Кундалини Рейки и Рейки Иггдрасиль." },
      { title: "Сделаете следующий шаг", body: "Завершите задания и сможете получить бесплатную вводную инициацию у Андрея." },
    ],
    howEyebrow: "КАК ЭТО РАБОТАЕТ",
    howTitle: "Три простых шага",
    steps: [
      { title: "Начните бесплатно", body: "Откройте уроки без оплаты и сложной регистрации." },
      { title: "Практикуйте в своём темпе", body: "Смотрите медитации, делайте упражнения и оставляйте короткие заметки." },
      { title: "Получите инициацию", body: "После пяти уроков и необходимых ответов согласуйте бесплатную вводную инициацию с Андреем." },
    ],
    faqTitle: "Частые вопросы",
    faq: [
      { question: "Что именно бесплатно?", answer: "Все пять уроков и вводная инициация I ступени после завершения курса и согласования с Андреем. Отдельные индивидуальные онлайн-сеансы и консультации являются платными услугами." },
      { question: "Нужен ли опыт в Рейки?", answer: "Нет. Курс подходит для первого знакомства: все три системы изучаются последовательно, простыми шагами." },
      { question: "Инициация произойдёт автоматически?", answer: "Нет. Инициация проводится отдельно с мастером. Для заявки нужно завершить пять учебных отчётов и ответить на пять вопросов, после чего Андрей лично согласует следующий шаг." },
      { question: "Нужно ли регистрироваться?", answer: "Курс можно открыть без регистрации. Вход через Google и согласие на приватное сохранение понадобятся, чтобы не потерять прогресс и подготовить сохранённую заявку. Ваши заметки не отправляются Андрею автоматически." },
    ],
    bottomTitle: "Ваш путь в Рейки начинается здесь",
    bottomLead: "Попробуйте первый урок — без спешки и обязательств.",
    secondary: "Подробнее о программе Тантра Рейки",
    footer: "Духовно-образовательная практика, а не медицинское лечение или гарантия результата.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE ACADEMY · CURSO DE REIKI GRATIS",
    title: "Descubre Tantra Reiki. Empieza gratis.",
    promise: "Termina el curso y coordina una iniciación introductoria gratuita de Nivel 1.",
    lead: "Cinco lecciones guiadas por Andrey Litvinov: meditaciones originales, prácticas sencillas de atención a la energía y tres sistemas de Reiki. No necesitas experiencia.",
    facts: ["5 lecciones", "3 sistemas de Reiki", "A tu ritmo"],
    cta: "Empezar el curso gratis (en inglés)",
    actionNote: "Sin pago · El curso interactivo está disponible en inglés; Google solo para guardar el progreso.",
    imageAlt: "Mujer meditando a la cálida luz del amanecer",
    teacher: "Con Andrey Litvinov",
    teacherRole: "Maestro de Reiki",
    valueEyebrow: "QUÉ RECIBIRÁS",
    valueTitle: "Un primer paso amable hacia Reiki",
    benefits: [
      { title: "Experimenta", body: "Prueba meditaciones originales y observa tus propias sensaciones." },
      { title: "Aprende con claridad", body: "Conoce Tantra Reiki, Kundalini Reiki y Reiki Yggdrasil con lecciones breves." },
      { title: "Da el siguiente paso", body: "Completa tus reflexiones y solicita la iniciación introductoria gratuita con Andrey." },
    ],
    howEyebrow: "CÓMO FUNCIONA",
    howTitle: "Tres pasos sencillos",
    steps: [
      { title: "Empieza gratis", body: "Abre las lecciones interactivas sin pagar." },
      { title: "Aprende y practica", body: "Mira las meditaciones, practica y escribe notas breves en cinco lecciones." },
      { title: "Coordina tu iniciación", body: "Completa las reflexiones requeridas y acuerda la iniciación introductoria gratuita con Andrey." },
    ],
    faqTitle: "Preguntas frecuentes",
    faq: [
      { question: "¿Qué incluye la oferta gratuita?", answer: "Las cinco lecciones y una iniciación introductoria gratuita de Nivel 1 después de terminar el curso y confirmarla con Andrey. Las sesiones individuales opcionales son servicios de pago." },
      { question: "¿Necesito experiencia previa?", answer: "No. Empezarás por lo básico y conocerás los tres sistemas paso a paso." },
      { question: "¿La iniciación es automática?", answer: "No. Se organiza por separado con el maestro. Se requieren cinco informes de lección y cinco respuestas para solicitar la revisión; Andrey acuerda personalmente el siguiente paso." },
      { question: "¿Tengo que crear una cuenta?", answer: "Puedes explorar las lecciones como visitante. Para guardar tu progreso y preparar la solicitud necesitarás iniciar sesión con Google y aceptar el guardado privado. Tus notas no se envían automáticamente." },
    ],
    bottomTitle: "Tu camino en Reiki puede empezar hoy",
    bottomLead: "Comienza con una lección a tu propio ritmo.",
    secondary: "Ver el programa completo de Tantra Reiki",
    footer: "Práctica educativa y espiritual; no sustituye la atención médica ni garantiza resultados.",
  },
} as const;

export function ReikiReferralLanding({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const courseHref = REIKI_FREE_COURSE_PATH;
  const tantraHref = "/" + locale + "/academy/reiki/tantra-reiki";
  return (
    <main className={styles.page} data-reiki-referral-landing data-locale={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrap}>
        <section className={styles.hero} aria-labelledby="reiki-referral-title">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
            <h1 id="reiki-referral-title">{t.title}</h1>
            <p className={styles.promise}>{t.promise}</p>
            <AcquisitionEventLink href={courseHref} event="academy_course_enquiry_click" attributes={{ "data-reiki-cta": "hero" }} className={styles.mainCta} prefetch={false}>
              {t.cta}<ArrowRight size={20} aria-hidden="true" />
            </AcquisitionEventLink>
            <p className={styles.actionNote}>{t.actionNote}</p>
            <p className={styles.lead}>{t.lead}</p>
            <ul className={styles.facts}>{t.facts.map((fact) => <li key={fact}><Check size={16} aria-hidden="true" />{fact}</li>)}</ul>
          </div>
          <div className={styles.heroVisual}>
            <Image
              src="/images/holistic-house/reiki-practitioner-sunrise.webp"
              alt={t.imageAlt}
              fill priority unoptimized
              sizes="(max-width: 760px) 100vw, 42vw"
              className={styles.heroPhoto}
            />
            <div className={styles.teacher}>
              <Image src="/images/holistic-house/andy-about.png" width={50} height={50} alt="" unoptimized className={styles.teacherPhoto} />
              <span><strong>{t.teacher}</strong><small>{t.teacherRole}</small></span>
            </div>
          </div>
        </section>

        <section className={styles.value} aria-labelledby="reiki-referral-value">
          <p className={styles.sectionEyebrow}>{t.valueEyebrow}</p>
          <h2 id="reiki-referral-value">{t.valueTitle}</h2>
          <div className={styles.benefitGrid}>
            {t.benefits.map((item, index) => {
              const Icon = [PlayCircle, Leaf, HeartHandshake][index];
              return <article className={styles.benefit} key={item.title}>
                <span className={styles.benefitIcon}><Icon size={23} aria-hidden="true" /></span>
                <h3>{item.title}</h3><p>{item.body}</p>
              </article>;
            })}
          </div>
        </section>

        <section className={styles.how} aria-labelledby="reiki-referral-how">
          <div><p className={styles.sectionEyebrow}>{t.howEyebrow}</p><h2 id="reiki-referral-how">{t.howTitle}</h2></div>
          <ol className={styles.steps}>
            {t.steps.map((step, index) => <li key={step.title}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{step.title}</h3><p>{step.body}</p></div>
            </li>)}
          </ol>
        </section>

        <section className={styles.faq} aria-labelledby="reiki-referral-faq">
          <h2 id="reiki-referral-faq">{t.faqTitle}</h2>
          <div className={styles.faqItems}>{t.faq.map((item) => <details key={item.question}>
            <summary>{item.question}<span aria-hidden="true">+</span></summary>
            <p>{item.answer}</p>
          </details>)}</div>
        </section>

        <section className={styles.bottomCta} aria-labelledby="reiki-referral-end">
          <div><h2 id="reiki-referral-end">{t.bottomTitle}</h2><p>{t.bottomLead}</p></div>
          <AcquisitionEventLink href={courseHref} event="academy_course_enquiry_click" attributes={{ "data-reiki-cta": "footer" }} className={styles.mainCta} prefetch={false}>
            {t.cta}<ArrowRight size={20} aria-hidden="true" />
          </AcquisitionEventLink>
        </section>
        <div className={styles.foot}>
          <Link href={tantraHref}>{t.secondary}</Link>
          <p>{t.footer}</p>
        </div>
      </div>
    </main>
  );
}
