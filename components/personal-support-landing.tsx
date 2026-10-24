import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, Check, LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { StaticPortrait } from "@/components/static-portrait";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { ServiceVideoShowcase } from "@/components/service-video-showcase";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./personal-support-landing.module.css";

const PRODUCT_KEY = "Personal support · 2 x 60 min · EUR 200 per month";

const copy = {
  en: {
    eyebrow: "PERSONAL WORK · ANDREY LITVINOV",
    title: "Personal support for your next step",
    intro: "An ongoing conversation about your situation, decisions and personal resources — with room for reflection between sessions.",
    period: "per month",
    sessions: "2 personal sessions · 60 minutes each",
    messages: "Ask questions between sessions, within agreed response boundaries",
    modes: "Online with a call, in Toronto by arrangement, or remote without a call",
    report: "For remote work without a call: a private personal report and video afterwards",
    action: "Request personal support",
    free: "Start with a free written review",
    note: "A request is not a booking or a payment. Monthly renewal is by your choice, not automatic.",
    modesTitle: "Choose the format that fits",
    modesIntro: "We agree on the schedule and exact format before any payment.",
    formats: [
      { value: "online_call", label: "Online conversation", description: "A personal video conversation at an agreed time." },
      { value: "remote_no_call", label: "Remote work without a call", description: "A scheduled remote session, followed by a personal report and private video." },
      { value: "toronto_in_person", label: "In person in Toronto", description: "A one-to-one meeting when location and availability are agreed." },
    ],
    formatLabel: "Preferred session format",
    howTitle: "How it works",
    steps: [
      "Send a request without paying or sharing sensitive details.",
      "We agree on the two session times, format, boundaries and payment instructions.",
      "After your payment is verified, your monthly programme begins.",
      "Use your private client space for follow-up messages and any personal materials.",
    ],
    about: "Meet Andrey",
    videoTitle: "Get to know my approach",
    faqTitle: "Before you begin",
    faqs: [
      { q: "What is included in €200?", a: "Two full 60-minute personal sessions within one month, plus the possibility of writing questions between sessions within agreed limits." },
      { q: "Is there an automatic subscription?", a: "No. A second month is arranged only if you choose to continue. There is no automatic charge." },
      { q: "Can we work without a call?", a: "Yes, by agreement. For the remote no-call format, you receive a private written report and a video after the work." },
      { q: "Is this treatment or emergency care?", a: "No. This is reflective and complementary personal guidance, not medical diagnosis, psychotherapy by a registered Ontario provider, treatment or an emergency service. Results are not guaranteed." },
    ],
    formTitle: "Ask about a month of personal support",
    formLead: "Leave an email or international phone number so Andrey can confirm the details. Nothing is reserved or charged yet.",
    safety: "Do not enter diagnoses, test answers or health details into the request. Personal materials belong in your protected client space. Cancellation, scheduling and refund terms will be agreed before payment.",
    other: "See other personal services",
    myProgramme: "Already a client? Open My Personal Support",
  },
  ru: {
    eyebrow: "ЛИЧНАЯ РАБОТА · АНДРЕЙ ЛИТВИНОВ",
    title: "Личное сопровождение на протяжении месяца",
    intro: "Спокойная последовательная работа над вашим вопросом, решениями и внутренними ресурсами — с поддержкой между встречами.",
    period: "за месяц",
    sessions: "2 полноценные сессии · по 60 минут",
    messages: "Можно писать вопросы между встречами в согласованных пределах",
    modes: "Онлайн с видеозвонком, очно в Торонто или дистанционно без звонка",
    report: "После дистанционной работы без звонка — личный отчёт и приватное видео",
    action: "Запросить сопровождение",
    free: "Начать с бесплатного письменного разбора",
    note: "Заявка — не запись и не оплата. Продление месяца только по вашему решению.",
    modesTitle: "Выберите удобный формат",
    modesIntro: "Время, условия и способ работы согласуем до оплаты.",
    formats: [
      { value: "online_call", label: "Онлайн со звонком", description: "Личная встреча по видео в согласованное время." },
      { value: "remote_no_call", label: "Дистанционно без звонка", description: "Работа на расстоянии; затем личный письменный отчёт и приватное видео." },
      { value: "toronto_in_person", label: "Лично в Торонто", description: "Очная встреча после согласования места и времени." },
    ],
    formatLabel: "Предпочитаемый формат сессий",
    howTitle: "Как это происходит",
    steps: [
      "Оставляете заявку без оплаты и чувствительных данных.",
      "Мы согласуем две встречи, формат, границы общения и условия оплаты.",
      "После проверки поступившей оплаты начинается месячная программа.",
      "Переписка и персональные материалы доступны в защищённом кабинете.",
    ],
    about: "Познакомиться с Андреем",
    videoTitle: "Посмотрите, как я работаю",
    faqTitle: "Важно знать",
    faqs: [
      { q: "Что входит в €200?", a: "Две полноценные сессии по 60 минут в течение месяца и возможность задавать вопросы между ними в согласованных пределах." },
      { q: "Это автоматически продлеваемая подписка?", a: "Нет. Продление только по вашему желанию. Автоматических списаний нет." },
      { q: "Можно работать без созвона?", a: "Да, по договорённости. После дистанционной работы без звонка вы получите личный отчёт и приватное видео." },
      { q: "Это лечение или экстренная помощь?", a: "Нет. Это рефлексивная и дополнительная индивидуальная практика, не медицинский диагноз, не лечение и не экстренная помощь. Результат не гарантируется." },
    ],
    formTitle: "Запросить месяц личного сопровождения",
    formLead: "Оставьте email или телефон с международным кодом. Андрей лично согласует условия — запись и оплата пока не оформлены.",
    safety: "Не вводите сюда диагнозы, результаты тестов и сведения о здоровье. Личные материалы передаются через защищённый кабинет. Условия отмен, переноса и возврата согласуются до оплаты.",
    other: "Другие личные услуги",
    myProgramme: "Уже клиент? Открыть моё сопровождение",
  },
  es: {
    eyebrow: "TRABAJO PERSONAL · ANDREY LITVINOV",
    title: "Acompañamiento personal durante un mes",
    intro: "Un espacio continuo para explorar tus decisiones, recursos y próximos pasos con apoyo entre sesiones.",
    period: "al mes",
    sessions: "2 sesiones completas · 60 minutos cada una",
    messages: "Puedes escribir preguntas entre sesiones dentro de límites acordados",
    modes: "En línea con videollamada, presencial en Toronto o a distancia sin llamada",
    report: "Sin llamada: un informe personal y un vídeo privado después de la sesión",
    action: "Solicitar acompañamiento",
    free: "Empezar con una revisión escrita gratuita",
    note: "La solicitud no confirma una cita ni cobra dinero. La renovación nunca es automática.",
    modesTitle: "Elige el formato",
    modesIntro: "Confirmaremos horarios, condiciones y método antes de pagar.",
    formats: [
      { value: "online_call", label: "Conversación por vídeo", description: "Una conversación personal a una hora acordada." },
      { value: "remote_no_call", label: "A distancia sin llamada", description: "Trabajo a distancia con informe personal y vídeo privado después." },
      { value: "toronto_in_person", label: "Presencial en Toronto", description: "Una reunión personal con ubicación y horario confirmados." },
    ],
    formatLabel: "Formato de sesión preferido",
    howTitle: "Cómo funciona",
    steps: [
      "Envía una solicitud sin pagar ni compartir datos sensibles.",
      "Acordamos dos sesiones, formato, límites y detalles de pago.",
      "El mes comienza después de verificar el pago.",
      "Mensajes y materiales personales permanecen en el espacio privado.",
    ],
    about: "Conoce a Andrey",
    videoTitle: "Conoce mi enfoque",
    faqTitle: "Antes de empezar",
    faqs: [
      { q: "¿Qué incluye el precio?", a: "Dos sesiones de 60 minutos durante un mes y la posibilidad de hacer preguntas por escrito dentro de límites acordados." },
      { q: "¿Se renueva automáticamente?", a: "No. Solo se renueva con una nueva decisión tuya y sin cobros automáticos." },
      { q: "¿Puede ser sin llamada?", a: "Sí, por acuerdo. Recibirás un informe personal y un vídeo privado después de una sesión a distancia sin llamada." },
      { q: "¿Es tratamiento médico?", a: "No. Es una práctica reflexiva complementaria, no un diagnóstico, tratamiento ni servicio de emergencia. No se garantizan resultados." },
    ],
    formTitle: "Solicita un mes de acompañamiento",
    formLead: "Deja tu correo o número internacional. Andrey confirmará los detalles personalmente; no hay reserva ni cobro.",
    safety: "No envíes diagnósticos, respuestas de pruebas ni datos de salud en esta solicitud. Los materiales privados pertenecen al espacio protegido. Las condiciones se acuerdan antes del pago.",
    other: "Otros servicios personales",
    myProgramme: "¿Ya eres cliente? Abrir mi acompañamiento",
  },
} as const;

export function PersonalSupportLanding({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const photos = [
    "/images/holistic-house/hero-olive-incense.webp",
    "/images/holistic-house/report-lighthouse-coast.avif",
    "/images/holistic-house/course-start-heron.webp",
    "/images/holistic-house/books-library.webp",
  ] as const;
  return (
    <main lang={locale} className={styles.page} data-personal-support-landing data-public-visual-landing="personal-support">
      <PublicSiteHeader locale={locale} />
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={t.other}>
          <Link href={"/" + locale + "/services"}>← {t.other}</Link>
        </nav>
        <section className={styles.hero} aria-labelledby="personal-support-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="personal-support-title">{t.title}</h1>
            <p className={styles.intro}>{t.intro}</p>
            <div className={styles.price} aria-label={"€200 " + t.period}>
              <strong>€200</strong><span>{t.period}</span>
            </div>

            <div className={styles.actions}>
              <a className={styles.primary} href="#support-request">{t.action}<ArrowRight size={17} aria-hidden="true" /></a>
              <Link className={styles.secondary} href={"/" + locale + "/services/free-situation-review"}>{t.free}</Link>
            </div>
            <p className={styles.note}>{t.note}</p>
          </div>
          <div className={styles.portrait}>
            <StaticPortrait src="/images/holistic-house/andy-about.png" alt="Andrey Litvinov" fill priority sizes="(max-width: 640px) 118px, 38vw" />
          </div>
        </section>
        <section className={styles.benefitScene} data-support-visual-screen="benefits">
          <div className={styles.scenePhoto}><Image src={photos[0]} alt="" fill
            sizes="(max-width: 640px) 100vw, 40vw" /></div>
          <div className={styles.sceneWords}>
            <h2>{t.sessions}</h2>
            <ul className={styles.benefits}>
              <li><CalendarCheck2 size={18} aria-hidden="true" />{t.sessions}</li>
              <li><MessageCircle size={18} aria-hidden="true" />{t.messages}</li>
              <li><Check size={18} aria-hidden="true" />{t.modes}</li>
              <li><LockKeyhole size={18} aria-hidden="true" />{t.report}</li>
            </ul>
          </div>
        </section>
        <section className={styles.section} aria-labelledby="support-modes">
          <h2 id="support-modes">{t.modesTitle}</h2>
          <p className={styles.sectionIntro}>{t.modesIntro}</p>
          <div className={styles.formatGrid}>
            {t.formats.map((format, index) => (
              <article className={styles.formatCard} key={format.value} data-support-visual-screen={format.value}>
                <div className={styles.scenePhoto}><Image src={photos[index % photos.length]} alt="" fill
                  sizes="(max-width: 640px) 100vw, 40vw" /></div>
                <div className={styles.sceneWords}>
                  <span className={styles.number}>0{index + 1}</span>
                  <h3>{format.label}</h3><p>{format.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className={styles.section} aria-labelledby="support-process">
          <h2 id="support-process">{t.howTitle}</h2>
          <ol className={styles.steps}>
            {t.steps.map((step, index) => <li key={step} data-support-visual-screen={index+1}>
                <div className={styles.scenePhoto}><Image src={photos[(index+1)%photos.length]}
                  alt="" fill sizes="(max-width: 640px) 100vw, 40vw" /></div>
                <div className={styles.sceneWords}>
                  <span>{index + 1}</span><p>{step}</p>
                </div>
              </li>)}
          </ol>
        </section>
        <section className={styles.media} aria-label={t.videoTitle}>
          <ServiceVideoShowcase locale={locale} topic="overview" id="support-approach-video" />
          <PersonalTestimonials locale={locale === "es" ? "en" : locale} variant="services" />
          <Link className={styles.about} href={"/" + locale + "/about"}>{t.about}<ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
        <section className={[styles.section,styles.faqScene].join(" ")} aria-labelledby="support-faq" data-support-visual-screen="faq">
          <div className={styles.scenePhoto}><Image src={photos[2]} alt="" fill
            sizes="(max-width: 640px) 100vw, 40vw" /></div>
          <div className={styles.sceneWords}>
            <h2 id="support-faq">{t.faqTitle}</h2>
            <div className={styles.faq}>
              {t.faqs.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
            </div>
          </div>
        </section>
        <Link className={styles.myProgramme} href={"/" + (locale === "es" ? "en" : locale) + "/app/personal-support"}>{t.myProgramme}<ArrowRight size={16} aria-hidden="true" /></Link>
        <p className={styles.safety}><ShieldCheck size={17} aria-hidden="true" />{t.safety}</p>
        <div id="support-request" className={styles.capture} data-support-visual-screen="final-capture">
          <div className={styles.scenePhoto}><StaticPortrait src="/images/holistic-house/andy-about.png"
            alt="" fill sizes="(max-width: 640px) 100vw, 40vw" /></div>
          <CompactLeadCapture
            locale={locale}
            serviceTitle={PRODUCT_KEY}
            sourcePath={"/" + locale + "/services/personal-support"}
            title={t.formTitle}
            lead={t.formLead}
            formatLabel={t.formatLabel}
            formatOptions={t.formats}
            disclaimer={t.safety}
          />
        </div>
      </div>
    </main>
  );
}
