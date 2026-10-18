import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, MapPin, MessageCircle } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { StaticPortrait } from "@/components/static-portrait";
import { FreeReviewQuickRequest } from "@/components/free-review-quick-request";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "./toronto.module.css";

type Props = { params: Promise<{ locale: string }> };

const copy = {
  en: {
    title: "Toronto personal sessions & free written review",
    description: "Meet Andrey Litvinov at Holistic House. Explore a free written situation review, hypnotherapy, systemic constellations and personal sessions; ask about Toronto or online availability.",
    eyebrow: "HOLISTIC HOUSE · TORONTO & ONLINE",
    heading: "Bring one real question. Start with a clear conversation.",
    lead: "Relationships, work, important decisions or a pattern that keeps returning — explore your question with Andrey Litvinov through thoughtful one-to-one work.",
    free: "Start with a free written review",
    session: "Ask about a personal session",
    trust: "Free = questionnaire, hand drawing and personal written reflection, not a live call. Paid sessions start at €50. Availability and format are confirmed before an appointment.",
    meet: "Meet Andrey",
    direction: "Which way would you like to begin?",
    intro: "You do not need to choose a technique before contacting me. We can discuss what fits your question.",
    offers: [
      { name: "Hypnotherapy & guided imagery", text: "Explore an inner pattern or response through conversation, attention and imagery.", url: "services#consultation" },
      { name: "Systemic & family constellations", text: "Reflect on relationships, roles and competing needs without making assumptions about others.", url: "services/systemic-constellations" },
      { name: "Business & decision constellations", text: "Map questions about a project, team or decision alongside your own professional judgment.", url: "services/business-consulting" },
    ],
    learn: "Explore this direction",
    processTitle: "What happens next?",
    process: ["Choose a free written review or ask about a session.", "Send your message yourself via WhatsApp or Telegram.", "We clarify the format, availability and next steps before any paid appointment."],
    contactTitle: "Send a short enquiry",
    contactDescription: "A message is a request, not an automatic booking. You review and send it in your chosen messenger.",
    practicalTitle: "Practical questions",
    faqs: [
      { q: "Can I come to an office without an appointment?", a: "No walk-in service is promised. Please ask about the actual meeting format and location before travelling." },
      { q: "What is free?", a: "A written review based on a short questionnaire and your hand-drawn I / goal / problem sketch. It does not include a live call." },
      { q: "Are sessions offered online?", a: "You can enquire about online work. Toronto meeting availability and location should always be confirmed directly." },
      { q: "Is this medical treatment?", a: "No. The approaches described here support reflection and personal development and do not replace medical or mental-health care when needed." },
    ],
    footer: "No guaranteed results. Other practitioners shown elsewhere on Holistic House have their own locations and availability.",
  },
  ru: {
    title: "Торонто: личные сессии и бесплатный письменный разбор",
    description: "Holistic House, Андрей Литвинов: бесплатный письменный разбор ситуации, гипнотерапия, расстановки и индивидуальные сессии. Уточняйте формат приёма в Торонто и онлайн.",
    eyebrow: "HOLISTIC HOUSE · ТОРОНТО И ОНЛАЙН",
    heading: "Начнём с одного важного для вас вопроса.",
    lead: "Отношения, работа, решение или повторяющаяся ситуация — исследуйте свой запрос вместе с Андреем Литвиновым в спокойной индивидуальной работе.",
    free: "Начать с бесплатного письменного разбора",
    session: "Запросить личную сессию",
    trust: "Бесплатный формат — анкета, рисунок от руки и личный письменный разбор, не созвон. Платные сессии — от €50. Место, время и формат уточняются заранее.",
    meet: "Об Андрее",
    direction: "С чего можно начать?",
    intro: "Вам не нужно заранее выбирать метод. Мы можем обсудить, что подходит под ваш запрос.",
    offers: [
      { name: "Гипнотерапия и работа с образами", text: "Исследование внутренних реакций через разговор, внимание и образы.", url: "services#consultation" },
      { name: "Системные и семейные расстановки", text: "Осмысление отношений, ролей и противоречивых потребностей без предположений о других.", url: "services/systemic-constellations" },
      { name: "Бизнес-расстановки и решения", text: "Исследование рабочих и деловых вопросов вместе с вашими собственными выводами.", url: "services/business-consulting" },
    ],
    learn: "Подробнее",
    processTitle: "Что будет дальше?",
    process: ["Выберите письменный разбор или личную сессию.", "Самостоятельно отправьте сообщение через WhatsApp или Telegram.", "Мы уточним формат, доступность и дальнейшие шаги до платной записи."],
    contactTitle: "Отправить короткий запрос",
    contactDescription: "Сообщение — это обращение, а не автоматическая запись. Вы сами проверяете и отправляете его.",
    practicalTitle: "Практические вопросы",
    faqs: [
      { q: "Можно ли прийти без записи?", a: "Приём без подтверждённой записи не заявлен. Сначала уточните формат и место встречи." },
      { q: "Что именно бесплатно?", a: "Письменный разбор короткой анкеты и рисунка «Я — цель — проблема». Бесплатный созвон в него не входит." },
      { q: "Есть ли онлайн-сессии?", a: "Вы можете запросить онлайн-формат. Возможность встречи в Торонто и адрес нужно подтвердить напрямую." },
      { q: "Это медицинское лечение?", a: "Нет. Эти подходы предназначены для самоисследования и не заменяют необходимую медицинскую или психиатрическую помощь." },
    ],
    footer: "Результаты не гарантируются. Другие мастера Holistic House имеют собственную доступность и местонахождение.",
  },
  es: {
    title: "Toronto: sesiones personales y revisión escrita gratuita",
    description: "Holistic House con Andrey Litvinov: revisión escrita gratuita, hipnoterapia, constelaciones y sesiones personales en Toronto o en línea, según disponibilidad.",
    eyebrow: "HOLISTIC HOUSE · TORONTO Y EN LÍNEA",
    heading: "Empecemos con una pregunta importante para ti.",
    lead: "Relaciones, trabajo, decisiones o situaciones que se repiten: explora tu pregunta en una conversación personal y respetuosa con Andrey Litvinov.",
    free: "Empezar con una revisión escrita gratuita",
    session: "Consultar una sesión personal",
    trust: "La opción gratuita incluye un formulario, dibujo a mano e informe escrito; no incluye llamada. Las sesiones de pago comienzan en €50. Confirma la modalidad y disponibilidad antes de acudir.",
    meet: "Conoce a Andrey",
    direction: "¿Por dónde empezar?",
    intro: "No necesitas elegir un método antes de escribir. Podemos hablar de lo que encaja con tu situación.",
    offers: [
      { name: "Hipnoterapia e imaginación guiada", text: "Explora patrones y respuestas interiores con conversación, atención e imágenes.", url: "services#consultation" },
      { name: "Constelaciones sistémicas y familiares", text: "Reflexiona sobre relaciones, roles y necesidades sin sacar conclusiones sobre otras personas.", url: "services/systemic-constellations" },
      { name: "Constelaciones de empresa y decisiones", text: "Explora preguntas sobre proyectos o decisiones junto con tu criterio profesional.", url: "services/business-consulting" },
    ],
    learn: "Ver esta opción",
    processTitle: "¿Qué sucede después?",
    process: ["Elige una revisión escrita gratuita o pregunta por una sesión.", "Envía el mensaje tú mismo por WhatsApp o Telegram.", "Confirmamos modalidad, disponibilidad y siguientes pasos antes de reservar o pagar."],
    contactTitle: "Envía una consulta breve",
    contactDescription: "El mensaje no reserva nada automáticamente. Tú lo revisas y lo envías.",
    practicalTitle: "Preguntas habituales",
    faqs: [
      { q: "¿Puedo acudir sin cita?", a: "No se ofrecen visitas sin cita confirmada. Pregunta primero por la modalidad y la ubicación." },
      { q: "¿Qué es gratuito?", a: "Un análisis escrito del breve formulario y del dibujo Yo / objetivo / problema; no incluye videollamada." },
      { q: "¿Hay sesiones en línea?", a: "Puedes consultar esta modalidad. Confirma directamente cualquier encuentro presencial en Toronto." },
      { q: "¿Es un tratamiento médico?", a: "No. Son prácticas de reflexión y desarrollo personal que no sustituyen la atención médica o psicológica necesaria." },
    ],
    footer: "No se garantizan resultados. Los otros profesionales del sitio tienen ubicaciones y disponibilidad propias.",
  },
} as const;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const t = copy[locale];
  const path = "/" + locale + "/toronto";
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " | Holistic House",
    description: t.description,
    alternates: { canonical: path, languages: {
      en: "/en/toronto", ru: "/ru/toronto", es: "/es/toronto", "x-default": "/en/toronto",
    } },
    openGraph: { type: "website", siteName: "Holistic House", url: path,
      title: t.title, description: t.description,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov — Holistic House" }],
    },
  };
}

export default async function TorontoEntryPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy[locale];
  return <main className={styles.page} lang={locale} data-gbp-toronto-entry>
    <PublicSiteHeader locale={locale} />
    <section className={styles.hero} aria-labelledby="toronto-hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><MapPin size={18} aria-hidden="true" />{t.eyebrow}</p>
        <h1 id="toronto-hero-title">{t.heading}</h1>
        <p className={styles.lead}>{t.lead}</p>
        <div className={styles.actions}>
          <a href="#request" className={styles.primary}>{t.free}<ArrowRight size={18} aria-hidden="true"/></a>
          <a href="#request" className={styles.secondary}>{t.session}<ArrowRight size={18} aria-hidden="true"/></a>
        </div>
        <p className={styles.truth}>{t.trust}</p>
        <Link className={styles.aboutLink} href={"/" + locale + "/about"}>
          {t.meet}<ArrowRight size={15} aria-hidden="true"/>
        </Link>
      </div>
      <div className={styles.heroPortrait}>
        <StaticPortrait src="/images/holistic-house/andy-about.png" alt="Andrey Litvinov" fill priority sizes="(max-width: 760px) 100vw, 480px" />
        <div className={styles.portraitCaption}>Andrey Litvinov · Holistic House</div>
      </div>
    </section>
    <section className={styles.offerSection} aria-labelledby="toronto-directions-title">
      <div className={styles.sectionHead}><h2 id="toronto-directions-title">{t.direction}</h2><p>{t.intro}</p></div>
      <div className={styles.offerGrid}>
        {t.offers.map((offer) => <article key={offer.name} className={styles.offer}>
          <h3>{offer.name}</h3><p>{offer.text}</p>
          <Link href={"/" + locale + "/" + offer.url}>{t.learn}<ArrowRight size={16} aria-hidden="true" /></Link>
        </article>)}
      </div>
    </section>
    <section className={styles.process} aria-labelledby="toronto-process-title">
      <h2 id="toronto-process-title">{t.processTitle}</h2>
      <ol>{t.process.map((step, index) => <li key={step}><CheckCircle2 size={20} aria-hidden="true"/><span>{step}</span></li>)}</ol>
    </section>
    <section className={styles.request} id="request" aria-labelledby="toronto-request-title">
      <div className={styles.requestIntro}>
        <MessageCircle size={29} aria-hidden="true"/>
        <h2 id="toronto-request-title">{t.contactTitle}</h2>
        <p>{t.contactDescription}</p>
      </div>
      <FreeReviewQuickRequest locale={locale} pagePath={"/" + locale + "/toronto"} />
    </section>
    <section className={styles.faq} aria-labelledby="toronto-faq-title">
      <h2 id="toronto-faq-title">{t.practicalTitle}</h2>
      {t.faqs.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
    </section>
    <footer className={styles.footer}>
      <p>{t.footer}</p>
      <Link href={"/" + locale + "/services"}>{locale === "ru" ? "Все услуги" : locale === "es" ? "Todos los servicios" : "All services"}</Link>
      <Link href="/privacy">Privacy</Link>
    </footer>
  </main>;
}
