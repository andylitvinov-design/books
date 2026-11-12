"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, HeartPulse, MessageCircle, ShieldCheck, X } from "lucide-react";

import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import {websiteMessengerOnlyUi} from "@/lib/crm/website-messenger-only.mjs";
import { TelegramDiagnosticEntry } from "@/components/telegram-diagnostic-entry";
import { FreeExpressWizard } from "@/components/free-express-wizard";
import {EXPRESS_GOOGLE_CLAIM_PENDING_KEY,validExpressGoogleClaimIntent} from "@/lib/practitioners/free-express-google-claim.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./personal-express-enquiry.module.css";

type Focus = "situation" | "energy";
const copy = {
  en: {
    label: "04 / PERSONAL REQUEST",
    title: "Ask Andrey for your free express review",
    shortTitle: "Free express review",
    lead: "One personal written review. Choose what your question is about; the service stays the same.",
    legend: "What is your request about?",
    secureAlternative: "Choose Telegram or WhatsApp", close: "Close request form",
    areas: {
      situation: { title: "My situation", short: "Situation", hint: "A decision, relationship, work or something that feels stuck.", tag: "Situation" },
      energy: { title: "Energy & health", short: "Energy / health", hint: "Your energy, wellbeing and everyday resources — not a medical diagnosis.", tag: "Energy and wellbeing" },
    },
    step: "Choose Telegram or WhatsApp and send the message yourself. No payment or appointment is confirmed.",
    privacy: "Please do not include symptoms, diagnoses, reports or private drawings here or in the chat. Andrey can agree a secure way to review details later.",
    safety: "Privacy: no medical details in chat",
    service: "Free personal express review",
    request: "I would like a free personal express review. Please tell me how to continue securely.",
    note: "The messenger link opens a draft, not a saved CRM enquiry. Press Send in the app; only verified provider conversations can be linked to CRM.",
    alt: "Andrey Litvinov",
  },
  ru: {
    label: "04 / ЛИЧНАЯ ЗАЯВКА",
    title: "Запросить бесплатную экспресс-диагностику",
    shortTitle: "Экспресс-диагностика",
    lead: "Один личный письменный разбор. Выберите тему обращения — это не разные услуги.",
    legend: "С чем связан ваш запрос?",
    secureAlternative: "Выбрать Telegram или WhatsApp", close: "Свернуть форму",
    areas: {
      situation: { title: "По ситуации", short: "Ситуация", hint: "Решение, отношения, работа или вопрос, в котором вы застряли.", tag: "Ситуация" },
      energy: { title: "По энергии и здоровью", short: "Энергия", hint: "Самочувствие, энергия и ресурсы — без медицинской диагностики.", tag: "Энергия и самочувствие" },
    },
    step: "Выберите Telegram или WhatsApp и отправьте сообщение. Запись и оплата пока не подтверждены.",
    privacy: "Не отправляйте здесь и в чат симптомы, диагнозы, анализы или личные рисунки. При необходимости Андрей согласует защищённую передачу информации.",
    safety: "Приватность: без медицинских данных в чате",
    service: "Бесплатная личная экспресс-диагностика",
    request: "Хочу получить бесплатный личный экспресс-разбор. Подскажите, как безопасно продолжить.",
    note: "Ссылка открывает черновик, а не сохранённую заявку CRM. Отправьте сообщение в Telegram или WhatsApp; привязка к CRM требует подтверждения диалога.",
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
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const revealRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeDisclosure = useCallback(() => {
    // A delayed hashchange after Escape can re-open the folded form in WebKit.
    // Remove only our form anchor; never clear search params or client identity.
    if (window.location.hash === "#request-free-review") {
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
    }
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
      if (window.location.hash === "#request-free-review") setExpanded(true);
    };
    const openFromAnchor = (event: MouseEvent) => {
      if (event.target instanceof Element
        && event.target.closest('a[href="#request-free-review"]')) setExpanded(true);
    };
    openFromHash();
    // Google OAuth uses the existing allowlisted landing route, but must not
    // reopen an unrelated visitor's form based on the URL alone.
    if (enableWizard && new URLSearchParams(window.location.search).get("hh_enquiry") === "google") {
      try {
        const prior = JSON.parse(window.sessionStorage.getItem("hh-free-express-wizard-resume-v2") || "null");
        if (prior?.locale === locale && /^HH-[A-F0-9]{12}$/.test(prior.referenceCode || ""))
          setExpanded(true);
      } catch { /* Unknown browser state is never an authorization source. */ }
    }
    if (!enableWizard) {
      try {
        const intent = JSON.parse(window.sessionStorage.getItem(EXPRESS_GOOGLE_CLAIM_PENDING_KEY) || "null");
        if (validExpressGoogleClaimIntent(intent,locale,window.location.pathname))
          setExpanded(true);
      } catch { /* Untrusted browser state cannot link an account. */ }
    }
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", openFromAnchor);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", openFromAnchor);
    };
  }, [enableWizard, locale]);

  useEffect(() => {
    if (!expanded) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && panelRef.current?.contains(document.activeElement)) {
        closeDisclosure();
        revealRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [expanded, closeDisclosure]);
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
            onClick={() => { if (expanded) closeDisclosure(); else setExpanded(true); }}>
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
          {publicWizard ? <FreeExpressWizard locale={locale} focus={focus} serviceTitle={t.service}
            onSaved={() => setFocusLocked(true)} onRestoredFocus={setFocus} />
          : <ContactChannelChooser key={focus} locale={locale}
            whatsappUrl={whatsappUrl} compactPhone stayAfterSave resetKey={focus}
            allowSecureExpressClaim publicServiceTitle={t.service}
            publicTopic={"Express review focus: " + t.areas[focus].tag} />}
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
