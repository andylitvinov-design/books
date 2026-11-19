"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, HeartPulse, MessageCircle, ShieldCheck, X } from "lucide-react";


import {websiteMessengerOnlyUi} from "@/lib/crm/website-messenger-only.mjs";
import { TelegramDiagnosticEntry } from "@/components/telegram-diagnostic-entry";

import {EXPRESS_GOOGLE_CLAIM_PENDING_KEY,validExpressGoogleClaimIntent} from "@/lib/practitioners/free-express-google-claim.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./personal-express-enquiry.module.css";

// Heavy form modules are deferred until the visitor opens the request.
const ContactChannelChooser = dynamic(
  () => import("@/components/contact-channel-chooser").then((module) => module.ContactChannelChooser),
  { ssr: false },
);
const FreeExpressWizard = dynamic(
  () => import("@/components/free-express-wizard").then((module) => module.FreeExpressWizard),
  { ssr: false },
);

type Focus = "situation" | "energy";
const copy = {
en: {
    label: "A NOTE TO ANDREY",
    title: "Let's start with your question",
    shortTitle: "Write to Andrey",
    lead: "Tell me what you'd like to look at. You can write about a situation in your life or how you've been feeling lately.",
    legend: "What's your question about?",
    secureAlternative: "Choose Telegram or WhatsApp", close: "Close",
    areas: {
      situation: { title: "Something in my life", short: "Life situation", hint: "A decision, relationship, work or something that keeps coming up.", tag: "Situation" },
      energy: { title: "How I've been feeling", short: "Wellbeing", hint: "Energy and everyday wellbeing, not medical diagnosis.", tag: "Energy and wellbeing" },
    },
    step: "Choose Telegram or WhatsApp, then press Send in the app. This doesn't book a session or charge you.",
    privacy: "Please don't put medical records, symptoms, personal drawings or other sensitive details in a chat. We can arrange a private way to share them if needed.",
    safety: "About your privacy",
    service: "Free personal express review",
    request: "I'd like to ask for a free written review. How can I share my question privately?",
    note: "The messenger opens a prepared message. Your request isn't submitted just by opening the link; please press Send in the app.",
    alt: "Andrey Litvinov",
  },
ru: {
    label: "НАПИШИТЕ АНДРЕЮ",
    title: "Начнём с вашего вопроса",
    shortTitle: "Написать Андрею",
    lead: "Расскажите, что хотите понять. Это может быть ситуация в жизни или ваше повседневное самочувствие.",
    legend: "О чём ваш вопрос?",
    secureAlternative: "Выбрать Telegram или WhatsApp", close: "Закрыть",
    areas: {
      situation: { title: "О ситуации в жизни", short: "Ситуация", hint: "Решение, отношения, работа или то, что никак не меняется.", tag: "Ситуация" },
      energy: { title: "О самочувствии", short: "Самочувствие", hint: "Силы, усталость, повседневное состояние. Без медицинской диагностики.", tag: "Энергия и самочувствие" },
    },
    step: "Выберите Telegram или WhatsApp и нажмите «Отправить» в приложении. Это не запись на платную сессию.",
    privacy: "Медицинские документы, симптомы, личные рисунки и другие чувствительные сведения не отправляйте в чат. Если понадобится, договоримся о защищённой передаче.",
    safety: "Как сохранить приватность",
    service: "Бесплатная личная экспресс-диагностика",
    request: "Хочу попросить бесплатный письменный разбор. Как передать свой вопрос приватно?",
    note: "Мессенджер откроет подготовленное сообщение. Сам переход по ссылке заявку не отправляет: нажмите «Отправить» в приложении.",
    alt: "Андрей Литвинов",
  },
  es: {
    label: "04 / SOLICITUD PERSONAL",
    title: "Solicita tu revisión personal exprés gratuita",
    shortTitle: "Revisión exprés gratuita",
    lead: "Una sola revisión personal escrita. Elige el tema de tu pregunta, no un servicio diferente.",
    legend: "¿Sobre qué es tu consulta?",
    secureAlternative: "Elegir Telegram o WhatsApp", close: "Cerrar formulario",
    areas: {
      situation: { title: "Mi situación", short: "Situación", hint: "Decisiones, relaciones, trabajo o algo que te bloquea.", tag: "Situación" },
      energy: { title: "Energía y salud", short: "Energía / salud", hint: "Bienestar y recursos personales, sin diagnóstico médico.", tag: "Energía y bienestar" },
    },
    step: "Elige Telegram o WhatsApp y pulsa Enviar. No se confirma ningún pago ni cita.",
    privacy: "No compartas síntomas, diagnósticos, informes ni dibujos privados aquí ni por chat. Andrey puede acordar un intercambio seguro más adelante.",
    safety: "Privacidad: sin datos médicos en el chat",
    service: "Revisión personal exprés gratuita",
    request: "Quisiera solicitar una revisión personal exprés gratuita. Indícame cómo continuar de forma segura.",
    note: "El enlace abre un borrador, no una solicitud guardada en CRM. Pulsa Enviar; la vinculación requiere verificar el chat.",
    alt: "Andrey Litvinov",
  },
} as const;

/** The two focuses are intake categories, not a choice between separate services. */
export function PersonalExpressEnquiry({
  locale, intro, children, enableWizard = false,
}: {
  locale: PublicLocale; intro?: ReactNode; children?: ReactNode; enableWizard?: boolean;
}) {
  const t = copy[locale];
  const pathname = usePathname();
  const [focus, setFocus] = useState<Focus>("situation");
  const [focusLocked, setFocusLocked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  // When the visitor folds the panel, retain any entered answers.
  const [disclosureOpenedOnce, setDisclosureOpenedOnce] = useState(false);
  useEffect(() => {
    if (expanded) setDisclosureOpenedOnce(true);
  }, [expanded]);
  const revealRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openDisclosure = useCallback(() => {
    expandedRef.current = true;
    setExpanded(true);
  }, []);
  const closeDisclosure = useCallback(() => {
    // A delayed hashchange after Escape can re-open the folded form in WebKit.
    // Remove only our form anchor; never clear search params or client identity.
    if (window.location.hash === "#request-free-review") {
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
    }
    expandedRef.current = false;
    setExpanded(false);
  }, []);

  // The compact mobile capture begins at the top of the visible card after opening.
  useEffect(() => {
    if (!expanded || !window.matchMedia("(max-width: 720px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.closest("section")?.scrollIntoView({ block: "start", behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expanded]);

  // The hero and benefit links retain their normal anchor/scroll behavior.
  // They also open this in-flow section, including repeated clicks on the same hash.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#request-free-review") openDisclosure();
    };
    const openFromAnchor = (event: MouseEvent) => {
      if (event.target instanceof Element
        && event.target.closest('a[href="#request-free-review"]')) openDisclosure();
    };
    openFromHash();
    // Google OAuth uses the existing allowlisted landing route, but must not
    // reopen an unrelated visitor's form based on the URL alone.
    if (enableWizard && new URLSearchParams(window.location.search).get("hh_enquiry") === "google") {
      try {
        const prior = JSON.parse(window.sessionStorage.getItem("hh-free-express-wizard-resume-v2") || "null");
        if (prior?.locale === locale && /^HH-[A-F0-9]{12}$/.test(prior.referenceCode || ""))
          openDisclosure();
      } catch { /* Unknown browser state is never an authorization source. */ }
    }
    if (!enableWizard) {
      try {
        const intent = JSON.parse(window.sessionStorage.getItem(EXPRESS_GOOGLE_CLAIM_PENDING_KEY) || "null");
        if (validExpressGoogleClaimIntent(intent,locale,window.location.pathname))
          openDisclosure();
      } catch { /* Untrusted browser state cannot link an account. */ }
    }
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", openFromAnchor);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", openFromAnchor);
    };
  }, [enableWizard, locale, openDisclosure]);

  // Register once: the Escape listener must not disappear during touch renders.
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || (!expandedRef.current && panelRef.current?.hidden !== false)) return;
      // Touching a non-focusable choice can move focus back to <body>,
      // especially at 320px. The expanded form must still fold on Escape.
      // Let any active nested modal handle Escape before this disclosure.
      const activeDialog = document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
      if (activeDialog?.contains(document.activeElement)) return;
      // Some native summary controls prevent the default Escape action.
      // Once the review is expanded, close it unless a real modal owns focus.
      event.preventDefault();
      closeDisclosure();
      revealRef.current?.focus();
    };
    // Capture Escape before a nested summary or focus handler consumes it.
    window.addEventListener("keydown", onEscape, true);
    return () => window.removeEventListener("keydown", onEscape, true);
  }, [closeDisclosure]);
  const publicWizard = enableWizard && !websiteMessengerOnlyUi();
  const whatsappUrl = whatsappEnquiryUrl({
    locale, service: t.service, request: t.request, pagePath: pathname,
    // Deliberately omit the selected focus and all health/personal information
    // from the external WhatsApp / Telegram message.
  });

  return (
    <div className={styles.wrapper} data-personal-express-review>
      {intro}
      <section className={styles.capture} id="request-free-review" data-personal-express-enquiry
        data-expanded={expanded ? "true" : "false"} data-express-hydrated={hydrated ? "true" : "false"} lang={locale} aria-labelledby="express-enquiry-title">
        <div className={styles.photo}>
          <Image src="/images/holistic-house/andy-about.png" alt={t.alt}
            fill sizes="(max-width: 720px) 90px, 38vw" />
          <span className={styles.photoMark}><CheckCircle2 size={15} aria-hidden="true" />{locale === "ru" ? "Лично с Андреем" : locale === "es" ? "Con Andrey" : "Personally with Andrey"}</span>
        </div>
        <div className={styles.body}>
          <p className={styles.eyebrow}><MessageCircle size={15} aria-hidden="true" />{t.label}</p>
          <h2 id="express-enquiry-title"><span className={styles.longTitle}>{t.title}</span><span className={styles.shortTitle}>{t.shortTitle}</span></h2>
          <p className={styles.lead}>{t.lead}</p>
          <TelegramDiagnosticEntry locale={locale} />
          <button ref={revealRef} type="button" className={styles.reveal}
            data-express-reveal disabled={!hydrated} aria-expanded={expanded} aria-controls="express-request-form"
            aria-label={expanded ? t.close : t.secureAlternative}
            onClick={() => { if (expandedRef.current) closeDisclosure(); else openDisclosure(); }}>
            {expanded ? <X size={19} aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}
            <span>{expanded ? t.close : t.secureAlternative}</span>
            <ChevronDown className={styles.revealChevron} size={16} aria-hidden="true" />
          </button>
          <div ref={panelRef} className={styles.disclosure} id="express-request-form"
            data-express-inline-disclosure hidden={!expanded} tabIndex={-1}
            role="region" aria-label={t.title}>
          <fieldset className={styles.choices} data-express-focus-group disabled={focusLocked}>
            <legend>{t.legend}</legend>
            {(["situation", "energy"] as const).map((area) => (
              <label className={styles.choice} data-express-focus={area} key={area}
                data-selected={focus === area ? "true" : "false"}
                onClick={() => { if (!focusLocked) setFocus(area); }}>
                <input type="radio" name="express-review-focus" value={area}
                  checked={focus === area} onChange={() => setFocus(area)} />
                {area === "situation" ? <MessageCircle size={19} aria-hidden="true" /> : <HeartPulse size={19} aria-hidden="true" />}
                <span><strong><span className={styles.choiceLong}>{t.areas[area].title}</span><span className={styles.choiceShort}>{t.areas[area].short}</span></strong><small>{t.areas[area].hint}</small></span>
              </label>
            ))}
          </fieldset>
          <p className={styles.step}>{publicWizard
            ? (locale === "ru" ? "Сначала зарегистрируем заявку, затем можно уточнить вопрос и приватно добавить фото или рисунок."
              : locale === "es" ? "Primero registramos tu solicitud; después puedes añadir tus respuestas e imágenes de forma privada."
              : "First register your request, then optionally add answers and private images.")
            : t.step}</p>
          {disclosureOpenedOnce ? (publicWizard ? <FreeExpressWizard locale={locale} focus={focus} serviceTitle={t.service}
            onSaved={() => setFocusLocked(true)} onRestoredFocus={setFocus} />
          : <ContactChannelChooser key={focus} locale={locale}
            whatsappUrl={whatsappUrl} compactPhone stayAfterSave resetKey={focus}
            allowSecureExpressClaim publicServiceTitle={t.service}
            publicTopic={"Express review focus: " + t.areas[focus].tag} />) : null}
          {!publicWizard && <>
            <p className={styles.privacy}><ShieldCheck size={16} aria-hidden="true" />{t.privacy}</p>
            <p className={styles.note}>{t.note}</p>
            <details className={styles.safetyDetails}>
              <summary><ShieldCheck size={14} aria-hidden="true" />{t.safety}</summary>
              <p>{t.privacy} {t.note}</p>
            </details>
          </>}
          </div>
        </div>
      </section>
      {!publicWizard && focus === "situation" ? children : null}
    </div>
  );
}
