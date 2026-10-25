"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flower2, HeartHandshake, Sparkles } from "lucide-react";
import { FreeDiagnosticStart } from "@/components/free-diagnostic-start";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import styles from "./coaching-lounge-entry.module.css";

type Locale = "en" | "ru" | "es";
type Choice = "free" | "session";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · COACHING LOUNGE",
    title: "Free Diagnosis & Personal Coaching",
    headline: "Choose a way to explore your situation.",
    lead: "A free written review, a live coaching session, or deeper imagery-based personal work with Andrey.",
    choose: "Choose your starting point",
    freeAction: "Get free diagnosis",
    sessionAction: "Request coaching session · from €50",
    deepAction: "Explore depth-oriented work",
    offersHeading: "Three ways to work together",
    offersLead: "Choose your preferred depth and format. A request is not an appointment.",
    details: "Details",
    request: "Choose this option",
    learn: "Explore depth work",
    freeBadge: "FREE · WRITTEN",
    freeTitle: "Free situation diagnosis",
    freeBody: "A written review of one situation, challenge and possible ways forward.",
    freeDetail: "Leave a contact and topic, then complete the coaching questionnaire and your ME — GOAL — PROBLEM drawing. Your full answers are sent only with explicit consent.",
    sessionBadge: "30 MIN €50 · 60 MIN €100",
    sessionTitle: "Personal coaching session",
    sessionBody: "Talk directly with Andrey about a goal, decision or difficulty.",
    sessionDetail: "Choose a 30- or 60-minute online session. Send a consented request; Andrey personally agrees the time, format and payment before booking.",
    deepBadge: "INDIVIDUAL · FROM €50",
    deepTitle: "Depth-oriented personal work",
    deepBody: "Explore feelings, inner images, conflicts and patterns that repeat.",
    deepDetail: "A guided-imagery-informed conversation at a pace you choose. This is not a substitute for licensed psychotherapy, medical or crisis care.",
    freeSelected: "Free written diagnosis · contact and coaching questionnaire",
    sessionSelected: "Personal coaching · request a live session",
    formTitle: "Request a personal coaching session",
    formLead: "Leave a contact for one reply. Select 30 or 60 minutes; the session is arranged personally, not booked or charged here.",
    formDisclaimer: "€50 / 30 minutes or €100 / 60 minutes. No appointment or payment is confirmed by this form. Please do not include medical or test details.",
    formatLabel: "Session length",
    formats: [{ value: "30 min · €50", label: "30 minutes · €50" }, { value: "60 min · €100", label: "60 minutes · €100" }],
    note: "Free reviews are written, not live calls. Coaching and imagery-based work do not provide medical diagnoses or emergency treatment.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ГОСТИНАЯ КОУЧИНГА",
    title: "Диагностика, коучинг и глубинная работа",
    headline: "Выберите подходящий формат работы.",
    lead: "Бесплатный письменный разбор, личная коучинг-сессия или глубинная работа с образами и переживаниями.",
    choose: "Как хотите начать",
    freeAction: "Бесплатная диагностика",
    sessionAction: "Коучинг-сессия · от €50",
    deepAction: "Глубинная терапия",
    offersHeading: "Три направления работы",
    offersLead: "Выберите глубину и формат. Заявка ещё не означает запись.",
    details: "Детали",
    request: "Выбрать",
    learn: "Подробнее о глубинной работе",
    freeBadge: "БЕСПЛАТНО · ПИСЬМЕННО",
    freeTitle: "Бесплатная диагностика ситуации",
    freeBody: "Разбор сложности, препятствий и возможных путей решения.",
    freeDetail: "Оставьте контакт и тему, затем ответьте на коучинговые вопросы и подготовьте рисунок «Я — Цель — Проблема». Полная анкета отправляется только после явного согласия.",
    sessionBadge: "30 МИН €50 · 60 МИН €100",
    sessionTitle: "Личная коучинг-сессия",
    sessionBody: "Вместе с Андреем разберите вопрос, цель или жизненную ситуацию.",
    sessionDetail: "Выберите 30 или 60 минут онлайн. После заявки Андрей лично согласует время, формат и оплату; отправка заявки не означает запись.",
    deepBadge: "ИНДИВИДУАЛЬНО · ОТ €50",
    deepTitle: "Глубинная терапия",
    deepBody: "Исследование чувств, внутренних образов, конфликтов и повторяющихся сценариев.",
    deepDetail: "Бережная индивидуальная работа с образами и ассоциациями в согласованном темпе. Не заменяет лицензированную психотерапию, медицинскую или кризисную помощь.",
    freeSelected: "Бесплатный письменный разбор · контакты и коучинговая анкета",
    sessionSelected: "Личный коучинг · заявка на живую сессию",
    formTitle: "Запросить личную коучинг-сессию",
    formLead: "Оставьте контакт для одного ответа. Выберите 30 или 60 минут; встреча и оплата согласуются отдельно.",
    formDisclaimer: "€50 / 30 минут или €100 / 60 минут. Заявка не подтверждает запись или оплату. Не вводите медицинские данные и результаты тестов.",
    formatLabel: "Длительность сессии",
    formats: [{ value: "30 min · €50", label: "30 минут · €50" }, { value: "60 min · €100", label: "60 минут · €100" }],
    note: "Бесплатный разбор проводится письменно, не по видеосвязи. Коучинг и работа с образами не являются медицинским диагнозом или экстренной помощью.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · SALÓN DE COACHING",
    title: "Diagnóstico gratis y coaching personal",
    headline: "Elige cómo explorar tu situación.",
    lead: "Una revisión escrita gratis, una sesión de coaching o un trabajo personal más profundo con imágenes.",
    choose: "Elige cómo empezar",
    freeAction: "Diagnóstico gratuito",
    sessionAction: "Sesión de coaching · desde €50",
    deepAction: "Trabajo personal profundo",
    offersHeading: "Tres caminos para trabajar juntos",
    offersLead: "Elige la profundidad y el formato. Una solicitud aún no es una reserva.",
    details: "Detalles",
    request: "Elegir",
    learn: "Conocer el trabajo profundo",
    freeBadge: "GRATIS · POR ESCRITO",
    freeTitle: "Diagnóstico gratuito de la situación",
    freeBody: "Revisión escrita de una dificultad, los obstáculos y posibles próximos pasos.",
    freeDetail: "Deja tu contacto y tema, responde las preguntas de coaching y prepara un dibujo YO — META — PROBLEMA. El cuestionario completo se envía solo con consentimiento explícito.",
    sessionBadge: "30 MIN €50 · 60 MIN €100",
    sessionTitle: "Sesión personal de coaching",
    sessionBody: "Habla con Andrey sobre una meta, decisión o situación difícil.",
    sessionDetail: "Elige 30 o 60 minutos en línea. Andrey confirma personalmente horario, formato y pago antes de reservar.",
    deepBadge: "PERSONAL · DESDE €50",
    deepTitle: "Trabajo personal profundo",
    deepBody: "Explora emociones, imágenes internas, conflictos y patrones repetidos.",
    deepDetail: "Exploración personal mediante imágenes guiadas a tu propio ritmo; no sustituye psicoterapia acreditada, atención médica ni ayuda de crisis.",
    freeSelected: "Revisión escrita gratis · contacto y cuestionario de coaching",
    sessionSelected: "Coaching personal · solicitud de sesión en vivo",
    formTitle: "Solicita una sesión personal de coaching",
    formLead: "Deja un contacto para una respuesta. Elige 30 o 60 minutos; horario y pago se confirman por separado.",
    formDisclaimer: "€50 / 30 minutos o €100 / 60 minutos. Enviar este formulario no confirma reserva ni pago. No compartas datos médicos ni resultados de pruebas.",
    formatLabel: "Duración de la sesión",
    formats: [{ value: "30 min · €50", label: "30 minutos · €50" }, { value: "60 min · €100", label: "60 minutos · €100" }],
    note: "Las revisiones gratuitas son escritas, no videollamadas. Estas prácticas no diagnostican enfermedades ni sustituyen atención de emergencia.",
  },
} as const;

export function CoachingLoungeEntry({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [selected, setSelected] = useState<Choice>("free");
  const [requestOpen, setRequestOpen] = useState(false);
  const [format, setFormat] = useState<string>(t.formats[0].value);
  function choose(choice: Choice) { setSelected(choice); setRequestOpen(true); }
  // Legacy in-page CTAs point to the same registration section. Open the
  // appropriate panel for direct deep links instead of scrolling to hidden UI.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#coaching-intake") {
        setSelected("session"); setRequestOpen(true);
      } else if (window.location.hash === "#free-diagnostic-start") {
        setSelected("free"); setRequestOpen(true);
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);
  useEffect(() => {
    if (!requestOpen) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("coaching-intake")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth", block: "start"
    });
  }, [requestOpen, selected]);

  const offers = [
    { id: "free", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", badge: t.freeBadge,
      title: t.freeTitle, body: t.freeBody, detail: t.freeDetail },
    { id: "session", image: "/images/holistic-house/andy-about.png", badge: t.sessionBadge,
      title: t.sessionTitle, body: t.sessionBody, detail: t.sessionDetail },
    { id: "deep", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", badge: t.deepBadge,
      title: t.deepTitle, body: t.deepBody, detail: t.deepDetail },
  ] as const;

  return <div className={styles.root} data-coaching-three-paths lang={locale}>
    <section className={styles.hero} data-coaching-first-screen aria-labelledby="coaching-entry-title">
      <Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill priority
        className={styles.heroImage} sizes="(max-width: 650px) 100vw, 1080px" />
      <div className={styles.heroOverlay} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1 id="coaching-entry-title">{t.title}</h1>
        <p className={styles.heroHeadline}>{t.headline}</p>
        <p className={styles.heroLead}>{t.lead}</p>
        <nav className={styles.heroChoices} aria-label={t.choose}>
          <a href="#free-diagnostic-start" onClick={() => choose("free")} data-coaching-hero-choice="free">
            <Sparkles size={20} aria-hidden="true"/><span>{t.freeAction}</span><ArrowRight size={19} aria-hidden="true"/>
          </a>
          <a href="#coaching-intake" onClick={() => choose("session")} data-coaching-hero-choice="session">
            <HeartHandshake size={20} aria-hidden="true"/><span>{t.sessionAction}</span><ArrowRight size={19} aria-hidden="true"/>
          </a>
          <Link href={"/" + locale + "/services/imagery-therapy#request-session"} prefetch={false} data-coaching-hero-choice="deep">
            <Flower2 size={20} aria-hidden="true"/><span>{t.deepAction}</span><ArrowRight size={19} aria-hidden="true"/>
          </Link>
        </nav>
      </div>
    </section>

    <section className={styles.offersSection} aria-labelledby="coaching-three-paths-heading">
      <header className={styles.sectionHeading}>
        <h2 id="coaching-three-paths-heading">{t.offersHeading}</h2>
        <p>{t.offersLead}</p>
      </header>
      <div className={styles.cards}>
        {offers.map(offer => <article className={styles.card} key={offer.id} data-coaching-offer={offer.id}
          data-selected={selected === offer.id ? "true" : "false"}>
          <div className={styles.cardPhoto}>
            <Image src={offer.image} alt="" fill loading="lazy" sizes="(max-width: 600px) 115px, 165px"/>
          </div>
          <div className={styles.cardContent}>
            <span className={styles.price}>{offer.badge}</span>
            <h3>{offer.title}</h3>
            <p>{offer.body}</p>
            <div className={styles.cardActions}>
              <details className={styles.details}>
                <summary>{t.details}</summary>
                <p>{offer.detail}</p>
              </details>
              {offer.id === "deep" ? (
                <Link href={"/" + locale + "/services/imagery-therapy#request-session"} className={styles.cardButton}
                  prefetch={false} data-coaching-select="deep">{t.learn}<ArrowRight size={15} aria-hidden="true"/></Link>
              ) : (
                <a href={offer.id === "free" ? "#free-diagnostic-start" : "#coaching-intake"} className={styles.cardButton}
                  onClick={() => choose(offer.id as Choice)} data-coaching-select={offer.id}>
                  {t.request}<ArrowRight size={15} aria-hidden="true"/>
                </a>
              )}
            </div>
          </div>
        </article>)}
      </div>
    </section>

    <section className={styles.intake} id="coaching-intake" aria-label={t.choose} data-coaching-intake
      data-open={requestOpen ? "true" : "false"} hidden={!requestOpen}>
      <p className={styles.selectedText} role="status">{selected === "free" ? t.freeSelected : t.sessionSelected}</p>
      {selected === "free" ? <FreeDiagnosticStart locale={locale} compact /> : (
        <div id="coaching-session-request" data-coaching-session-request>
          <div className={styles.durationChoice} role="radiogroup" aria-label={t.formatLabel}>
            {t.formats.map(item => <button key={item.value} type="button" role="radio"
              aria-checked={format === item.value} data-coaching-session-format={item.value}
              onClick={() => setFormat(item.value)}>{item.label}</button>)}
          </div>
          <CompactLeadCapture key={format} locale={locale} variant="coaching"
            sourcePath={"/" + locale + "/coaching"}
            serviceTitle={"Personal Coaching Session with Andrey · " + format}
            title={t.formTitle} lead={t.formLead} />
        </div>
      )}
      <p className={styles.safety}>{t.note}</p>
    </section>
  </div>;
}
