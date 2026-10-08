import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { FreeSituationReviewForm } from "@/components/free-situation-review-form";
import { getHomeopathyLocaleParams } from "@/data/remedies";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "./review.module.css";

type Props = { params: Promise<{ locale: string }> };

const copy = {
  ru: {
    title: "Бесплатная диагностика ситуации",
    description: "Бесплатный личный разбор цели, проблемы или бизнес-ситуации: прояснить точку затруднения, увидеть зону роста и следующий шаг. Без обязательств.",
    eyebrow: "Личная вводная беседа · бесплатно",
    heading: "Застряли в проблеме или не понимаете, куда двигаться дальше?",
    lead: "Не нужно самостоятельно разбираться в методах. Начнём с вашей реальной ситуации: что вас беспокоит, где ощущается тупик и какие возможности вы пока не видите.",
    bullets: ["Проясним вашу главную задачу", "Исследуем точку затруднения", "Наметим реалистичный следующий шаг"],
    free: "Бесплатно · Торонто или онлайн · Без обязательств продолжать",
    request: "Оставить запрос на бесплатный разбор",
    practitioner: "Андрей Литвинов",
    experience: "Личная и групповая практика с 2002 года",
    transparency: "Это разговор о жизненной или деловой ситуации, а не медицинский диагноз и не обещание результата.",
    stepsEyebrow: "Что происходит дальше",
    stepsHeading: "Одна беседа — больше ясности",
    stepsLead: "Никакого теста с «волшебным» результатом. Мы начнём с вашего вопроса и посмотрим на возможные следующие шаги.",
    steps: [
      { title: "Ваш запрос", text: "Расскажите, что сейчас важно: самочувствие, отношения, работа, цель или непростое решение." },
      { title: "Точка затруднения", text: "Обсудим, где ситуация повторяется, что вы уже пробовали и чего пока не хватает для движения." },
      { title: "Следующий шаг", text: "Наметим возможное направление. Вы решите, нужно ли продолжение и в каком формате." },
    ],
    directionsTitle: "Если захочется продолжить, есть три направления",
    directionsLead: "Метод выбирается после разговора, а не до него. Дополнительные индивидуальные встречи не обязательны.",
    directions: [
      { title: "Психогомеопатия и личный ресурс", text: "Обсуждение состояния и самочувствия как дополнительной, не медицинской практики.", href: "andy-litvinov/homeopathy-consultation" },
      { title: "Работа с внутренними образами", text: "Исследование чувств, повторяющихся реакций и внутренней опоры.", href: "imagery-therapy" },
      { title: "Системные расстановки и архетипы", text: "Исследование отношений, жизненных и деловых решений, возможностей двигаться к цели.", href: "andy-litvinov/personal-constellation-session" },
    ],
    aboutHeading: "Вы обращаетесь ко мне лично",
    aboutText: "Я работаю с личными и групповыми запросами, образами и системными расстановками. На первой встрече важно не продать вам метод, а понять ваш вопрос.",
    aboutLink: "Подробнее обо мне",
    faqTitle: "Частые вопросы",
    faqs: [
      { q: "Это действительно бесплатно?", a: "Да, вводный разбор бесплатен. Вы сами решаете, нужны ли затем платные индивидуальные встречи." },
      { q: "Мне нужно заранее знать, какой метод выбрать?", a: "Нет. Достаточно обозначить тему: личная ситуация, ресурс, цель или бизнес-вопрос. Подходящее направление обсудим вместе." },
      { q: "Как проходит запись?", a: "Вы выбираете тему и открываете готовое сообщение в WhatsApp. Ничего не отправляется автоматически: нажмите «Отправить» в самом WhatsApp. Мы затем согласуем формат и время лично." },
      { q: "Это медицинская или психологическая диагностика?", a: "Нет. Это вводный разговор о вашей ситуации, без медицинского диагноза, назначения лечения или обещания конкретного результата. При физических или психических симптомах обращайтесь к квалифицированному врачу." },
    ],
    finalTitle: "Не обязательно решать всё сразу. Начнём с одного вопроса.",
    finalAction: "Запросить бесплатный разбор",
    back: "Все услуги",
  },
  en: {
    title: "Free situation & goal assessment",
    description: "A free personal conversation to clarify your life, work or business situation, identify where you feel stuck and explore a useful next step. No obligation.",
    eyebrow: "A personal introduction · free",
    heading: "Feeling stuck or unsure what to do next?",
    lead: "You don't need to choose a method or a long programme first. Let's start with your real situation: what's difficult, where progress has stalled and what possibilities may be worth exploring.",
    bullets: ["Clarify the question that matters most", "Explore where you feel stuck", "Identify a possible next step"],
    free: "Free · Toronto or online · No obligation to continue",
    request: "Request your free personal review",
    practitioner: "Andrey Litvinov",
    experience: "Facilitating personal and group development since 2002",
    transparency: "This is a conversation about a personal or business situation, not a medical diagnosis or a promised outcome.",
    stepsEyebrow: "How it works",
    stepsHeading: "One conversation. A clearer direction.",
    stepsLead: "No magic score or predetermined treatment plan. We begin with your question and explore what could come next.",
    steps: [
      { title: "Your question", text: "Tell me what matters now: your wellbeing, relationships, work, a goal or an important decision." },
      { title: "Where you're stuck", text: "We explore what's recurring, what you've already tried and what may be missing from the picture." },
      { title: "A possible next step", text: "We outline a direction. You decide whether you would like any further sessions." },
    ],
    directionsTitle: "Three possible directions, only if you wish to continue",
    directionsLead: "You don't have to select one before we speak. Further individual work is always optional.",
    directions: [
      { title: "Psychohomeopathy & personal resources", text: "A complementary conversation about wellbeing and personal resources, not medical treatment.", href: "andy-litvinov/homeopathy-consultation" },
      { title: "Guided imagery & inner stability", text: "Explore emotional patterns, recurring reactions and your sense of inner support.", href: "imagery-therapy" },
      { title: "Systemic & archetypal constellations", text: "Explore relationships, life decisions, business questions and options for moving forward.", href: "andy-litvinov/personal-constellation-session" },
    ],
    aboutHeading: "You will speak with me personally",
    aboutText: "I work with personal and group questions through imagery and systemic approaches. In our first conversation, my priority is understanding your situation — not selling you a method.",
    aboutLink: "Read about my work",
    faqTitle: "Questions before you begin",
    faqs: [
      { q: "Is the first review really free?", a: "Yes. The introductory conversation is free. Whether to book any paid sessions afterwards is entirely your choice." },
      { q: "Do I need to know which method I want?", a: "No. Simply choose a broad topic — a personal difficulty, your energy, a goal or a business question. We can discuss possible directions together." },
      { q: "How do I send my request?", a: "Choose a topic and open a prepared WhatsApp message. Nothing is sent automatically: please press Send in WhatsApp. We then agree on a suitable time and format directly." },
      { q: "Is this a medical or mental-health assessment?", a: "No. It is an introductory conversation, not a diagnosis, prescription or guaranteed result. If you have physical or mental-health symptoms, seek evaluation from an appropriately qualified healthcare professional." },
    ],
    finalTitle: "You don't have to solve everything today. Start with one question.",
    finalAction: "Request a free situation review",
    back: "All services",
  },
  es: {
    title: "Evaluación gratuita de tu situación",
    description: "Una conversación personal gratuita para aclarar tu situación, identificar dónde te sientes bloqueado y explorar un próximo paso. Sin compromiso.",
    eyebrow: "Primera conversación personal · gratis",
    heading: "¿Te sientes bloqueado o no sabes cómo seguir?",
    lead: "No necesitas elegir un método o un programa antes de hablar conmigo. Empecemos por tu situación: qué te preocupa, dónde sientes el bloqueo y qué opciones vale la pena explorar.",
    bullets: ["Aclarar tu pregunta principal", "Explorar dónde está el bloqueo", "Identificar un posible próximo paso"],
    free: "Gratis · Toronto u online · Sin compromiso",
    request: "Solicitar mi conversación gratuita",
    practitioner: "Andrey Litvinov",
    experience: "Experiencia en desarrollo personal y trabajo grupal desde 2002",
    transparency: "Esta conversación no es un diagnóstico médico ni una promesa de resultados.",
    stepsEyebrow: "Cómo funciona",
    stepsHeading: "Una conversación, más claridad",
    stepsLead: "Empezamos por tu pregunta real y exploramos juntos posibles pasos. No se trata de un test con respuestas predeterminadas.",
    steps: [
      { title: "Tu pregunta", text: "Cuéntame qué es importante hoy: bienestar, relaciones, trabajo, una meta o una decisión." },
      { title: "Dónde te bloqueas", text: "Exploramos qué se repite, qué has intentado y qué puede faltar para avanzar." },
      { title: "Un próximo paso", text: "Trazamos una posible dirección. Tú decides si quieres continuar con sesiones." },
    ],
    directionsTitle: "Tres direcciones posibles, solo si quieres continuar",
    directionsLead: "No necesitas elegir ninguna antes de hablar. La continuidad siempre es opcional.",
    directions: [
      { title: "Psicohomeopatía y recursos personales", text: "Conversación complementaria sobre bienestar y recursos, no tratamiento médico.", href: "andy-litvinov/homeopathy-consultation" },
      { title: "Imágenes guiadas y apoyo interior", text: "Explorar emociones, reacciones y estabilidad interior.", href: "imagery-therapy" },
      { title: "Constelaciones sistémicas y arquetipos", text: "Explorar relaciones, decisiones y posibilidades para tus metas.", href: "andy-litvinov/personal-constellation-session" },
    ],
    aboutHeading: "Hablarás conmigo personalmente",
    aboutText: "Trabajo con preguntas personales y grupales mediante imágenes y enfoques sistémicos. La primera conversación empieza por comprender tu situación, no por venderte una técnica.",
    aboutLink: "Conoce mi trabajo",
    faqTitle: "Preguntas frecuentes",
    faqs: [
      { q: "¿La primera conversación es gratuita?", a: "Sí. La conversación inicial es gratuita. Tú decides si deseas reservar después sesiones de pago." },
      { q: "¿Necesito elegir un método?", a: "No. Basta con indicar un tema general. Podemos explorar juntos las direcciones posibles." },
      { q: "¿Cómo puedo enviar mi solicitud?", a: "Elige un tema y abre el mensaje preparado en WhatsApp. No se envía nada automáticamente: pulsa Enviar en WhatsApp. Después acordaremos personalmente el horario y formato." },
      { q: "¿Es un diagnóstico médico o psicológico?", a: "No. Es una conversación introductoria, no un diagnóstico ni una promesa de resultado. Consulta a un profesional sanitario cualificado si tienes síntomas físicos o psicológicos." },
    ],
    finalTitle: "No tienes que resolverlo todo hoy. Empecemos por una pregunta.",
    finalAction: "Solicitar mi evaluación gratuita",
    back: "Todos los servicios",
  },
} as const;

export function generateStaticParams() {
  return [...getHomeopathyLocaleParams(), { locale: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " — Holistic House",
    description: t.description,
    alternates: {
      canonical: "/" + locale + "/services/free-situation-review",
      languages: {
        en: "/en/services/free-situation-review",
        ru: "/ru/services/free-situation-review",
        es: "/es/services/free-situation-review",
      },
    },
  };
}

export default async function FreeSituationReviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy[locale];
  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />

      <section className={styles.contentGrid} aria-labelledby="review-hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1 id="review-hero-title">{t.heading}</h1>
          <p className={styles.lead}>{t.lead}</p>
          <ul className={styles.benefits}>
            {t.bullets.map((point) => <li key={point}><CheckCircle2 size={21} aria-hidden="true"/><span>{point}</span></li>)}
          </ul>
          <p className={styles.freeLine}>{t.free}</p>
          <div className={styles.introContact}>
            <div className={styles.photo}>
              <Image src="/images/holistic-house/andy-about.png" alt={t.practitioner} fill sizes="88px" />
            </div>
            <div><strong>{t.practitioner}</strong><span>{t.experience}</span></div>
          </div>
          <p className={styles.safety}>{t.transparency}</p>
        </div>
        <div className={styles.capturePanel} id="request-free-review">
          <FreeSituationReviewForm locale={locale} />
        </div>
      </section>

      <section className={styles.details} id="how-it-works" aria-labelledby="review-steps-title">
        <header className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t.stepsEyebrow}</p>
          <h2 id="review-steps-title">{t.stepsHeading}</h2>
          <p>{t.stepsLead}</p>
        </header>
        <ol className={styles.steps}>
          {t.steps.map((step, index) => (
            <li key={step.title}>
              <span className={styles.stepNumber}>0{index + 1}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.directions} aria-labelledby="review-directions-title">
        <header className={styles.sectionIntro}>
          <h2 id="review-directions-title">{t.directionsTitle}</h2>
          <p>{t.directionsLead}</p>
        </header>
        <div className={styles.directionList}>
          {t.directions.map((direction, index) => (
            <article key={direction.href}>
              <span className={styles.directionNumber}>0{index + 1}</span>
              <div><h3>{direction.title}</h3><p>{direction.text}</p></div>
              <Link href={"/" + locale + "/services/" + direction.href} aria-label={direction.title}><ArrowRight aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.about} aria-labelledby="review-about-title">
        <div className={styles.aboutPhoto}><Image src="/images/holistic-house/andy-about.png" alt={t.practitioner} fill sizes="(max-width: 767px) 100vw, 380px" /></div>
        <div>
          <p className={styles.eyebrow}>{t.practitioner}</p>
          <h2 id="review-about-title">{t.aboutHeading}</h2>
          <p>{t.aboutText}</p>
          <Link href={"/" + locale + "/about"}>{t.aboutLink} <ArrowRight size={17} aria-hidden="true"/></Link>
        </div>
      </section>

      <section className={styles.faq} aria-labelledby="review-faq-title">
        <h2 id="review-faq-title">{t.faqTitle}</h2>
        <div>
          {t.faqs.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
        </div>
      </section>

      <section className={styles.closing}>
        <MessageCircle aria-hidden="true" size={24}/>
        <h2>{t.finalTitle}</h2>
        <a href="#request-free-review">{t.finalAction} <ArrowRight size={18} aria-hidden="true"/></a>
        <Link href={"/" + locale + "/services"} className={styles.back}>{t.back}</Link>
      </section>
    </main>
  );
}
