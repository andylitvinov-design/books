"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, CheckCircle2, ChevronDown, MessageCircle, Send, ShieldCheck, ShoppingBag } from "lucide-react";
import { telegramEnquiryUrlFromWhatsApp, whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { BusinessLocale } from "@/data/business-consulting-copy";
import { PhoneCountryInput } from "@/components/phone-country-input";
import { parseBusinessReplyContact } from "@/lib/business-consulting/intake-policy";
import styles from "./business-website-enquiry.module.css";

type Format = "free" | "express" | "full" | "mentoring";

const translations = {
  en: {
    eyebrow:"DIRECT TO ANDREY", title:"Request a consultation",
    lead:"Choose a format and leave a contact. Andrey replies personally. No payment or confirmed booking here.",
    format:"Consultation",formatNames:{free:"Free written review",express:"30 minutes · €50",full:"60 minutes · €100",mentoring:"Goals Mentoring · by arrangement"},
    name:"Your name",namePlaceholder:"How should I address you?",
    contact:"How should Andrey reply?",email:"Email",whatsapp:"WhatsApp",contactPlaceholder:"name@example.com or +1 416 555 1234",
    addNote:"+ Add a question (optional)",hideNote:"− Hide question",question:"Your question (optional)",questionPlaceholder:"What would you like to discuss?",
    consent:"I agree to a personal reply about this request. No marketing.",
    send:"Send request",sending:"Sending…",success:"Request saved. Andrey can see it in his private CRM.",
    next:"For a free written review, continue to the short questionnaire and handwritten drawing.",
    nextAction:"Continue free questionnaire",note:"Please don't share sensitive health details.",
    contactError:"Enter a valid email or a WhatsApp number with country code (+...).",
    error:"Your request was not saved. Please try again or contact Andrey directly.",
    manualFallback:"Open WhatsApp / Telegram contact options",
    rate:"Too many requests. Please try again later.",offline:"The request system is temporarily unavailable.",
  },
  ru: {
    eyebrow:"НАПРЯМУЮ АНДРЕЮ",title:"Запросить консультацию",
    lead:"Выберите формат и оставьте контакт. Андрей ответит лично. Это не запись и не оплата.",
    format:"Формат",formatNames:{free:"Бесплатный письменный разбор",express:"30 минут · €50",full:"60 минут · €100",mentoring:"Goals Mentoring · по договорённости"},
    name:"Ваше имя",namePlaceholder:"Как к вам обращаться?",
    contact:"Как вам ответить?",email:"Email",whatsapp:"WhatsApp",contactPlaceholder:"name@example.com или +1 416 555 1234",
    addNote:"+ Добавить вопрос (по желанию)",hideNote:"− Скрыть вопрос",question:"Ваш вопрос (по желанию)",questionPlaceholder:"Что хотите обсудить?",
    consent:"Согласен(на) получить ответ по этой заявке. Без рассылок.",
    send:"Отправить заявку",sending:"Отправляем…",success:"Заявка сохранена. Андрей увидит её в CRM.",
    next:"Для бесплатного письменного разбора заполните короткую анкету и отправьте рисунок.",
    nextAction:"К бесплатной анкете",note:"Не отправляйте медицинские или другие чувствительные данные.",
    contactError:"Укажите корректный email или номер WhatsApp с кодом страны (+...).",
    error:"Заявка не сохранилась. Попробуйте ещё раз или свяжитесь с Андреем напрямую.",
    manualFallback:"Открыть WhatsApp / Telegram",
    rate:"Слишком много запросов. Попробуйте позже.",offline:"Приём заявок временно недоступен.",
  },
  es: {
    eyebrow:"DIRECTO A ANDREY",title:"Solicitar una consulta",
    lead:"Elige una modalidad y deja un contacto. Andrey responderá personalmente. Sin pago ni reserva confirmada.",
    format:"Modalidad",formatNames:{free:"Revisión escrita gratuita",express:"30 minutos · €50",full:"60 minutos · €100",mentoring:"Goals Mentoring · por acuerdo"},
    name:"Tu nombre",namePlaceholder:"¿Cómo te llamas?",
    contact:"¿Cómo deseas recibir respuesta?",email:"Correo",whatsapp:"WhatsApp",contactPlaceholder:"nombre@ejemplo.com o +1 416 555 1234",
    addNote:"+ Añadir una pregunta (opcional)",hideNote:"− Ocultar pregunta",question:"Tu pregunta (opcional)",questionPlaceholder:"¿De qué quieres hablar?",
    consent:"Acepto recibir una respuesta sobre esta solicitud. Sin publicidad.",
    send:"Enviar solicitud",sending:"Enviando…",success:"Solicitud guardada. Andrey la verá en su CRM privado.",
    next:"Para la revisión gratuita, completa el cuestionario y envía un dibujo a mano.",
    nextAction:"Continuar al cuestionario",note:"No compartas datos médicos ni información muy sensible.",
    contactError:"Indica un correo válido o un número de WhatsApp con prefijo (+...).",
    error:"La solicitud no se guardó. Inténtalo de nuevo o contacta directamente con Andrey.",
    manualFallback:"Abrir contacto por WhatsApp / Telegram",
    rate:"Demasiadas solicitudes. Inténtalo más tarde.",offline:"Las solicitudes web no están disponibles temporalmente.",
  },
} as const;


const experience = {
  en: {
    title: "Choose how to start", lead: "Start with a free written review or choose time with Andrey for a personal conversation.",
    choice: "I would like to…", action: "Request this option", actionNote: "Personal reply · No payment or confirmed booking",
    quickIntro: "Leave a contact so Andrey can reply about your chosen option.",
    savedNext: "Your enquiry was saved. You may also continue the conversation in a messenger — nothing is sent automatically.",
    chat: "Continue in a messenger (optional)",
    noObligation: "No obligation", personalReply: "Personal reply",
    details: {
      free: "A written first step, without a live call",
      express: "One focused question and next steps",
      full: "More space to explore your goals",
      mentoring: "Ongoing work by arrangement",
    },
    prices: { free: "FREE", express: "€50", full: "€100", mentoring: "ASK" },
    chatMessage: "Hello! I've submitted a business consultation request through Holistic House and would like to continue our conversation.",
  },
  ru: {
    title: "Выберите, с чего начать", lead: "Начните с бесплатного письменного разбора или выберите личную консультацию с Андреем.",
    choice: "Меня интересует…", action: "Оставить заявку", actionNote: "Личный ответ · Без оплаты и подтверждённой записи",
    quickIntro: "Оставьте контакт, чтобы Андрей ответил по выбранному формату.",
    savedNext: "Заявка сохранена. При желании продолжите общение в мессенджере — ничего не отправляется автоматически.",
    chat: "Продолжить в мессенджере (по желанию)",
    noObligation: "Без обязательств", personalReply: "Личный ответ",
    details: {
      free: "Первый письменный разбор без видеозвонка",
      express: "Один важный вопрос и следующий шаг",
      full: "Больше времени для вашей ситуации",
      mentoring: "Долгосрочная работа по согласованию",
    },
    prices: { free: "БЕСПЛАТНО", express: "€50", full: "€100", mentoring: "УТОЧНИТЬ" },
    chatMessage: "Здравствуйте! Я оставил(а) заявку на бизнес-консультацию через Holistic House и хотел(а) бы продолжить общение.",
  },
  es: {
    title: "Elige por dónde empezar", lead: "Empieza con una revisión escrita gratuita o elige una sesión personal con Andrey.",
    choice: "Me interesa…", action: "Solicitar esta opción", actionNote: "Respuesta personal · Sin pago ni reserva confirmada",
    quickIntro: "Deja un contacto para que Andrey responda sobre la opción elegida.",
    savedNext: "La solicitud está guardada. También puedes continuar por mensajería; no se envía nada automáticamente.",
    chat: "Continuar por mensajería (opcional)",
    noObligation: "Sin compromiso", personalReply: "Respuesta personal",
    details: {
      free: "Orientación escrita, sin videollamada",
      express: "Una pregunta concreta y próximos pasos",
      full: "Más tiempo para explorar tus metas",
      mentoring: "Acompañamiento según acuerdo",
    },
    prices: { free: "GRATIS", express: "€50", full: "€100", mentoring: "CONSULTAR" },
    chatMessage: "¡Hola! He enviado una solicitud de consulta de negocios desde Holistic House y quisiera continuar la conversación.",
  },
} as const;

const formatImages: Record<Format,string> = {
  free: "/images/holistic-house/report-lighthouse-coast.webp",
  express: "/images/holistic-house/books-library.webp",
  full: "/images/holistic-house/andy-about.png",
  mentoring: "/images/holistic-house/andy-about.png",
};
const formats: Format[] = ["free", "express", "full", "mentoring"];

export function BusinessWebsiteEnquiry({locale}:{locale:BusinessLocale}) {
  const t=translations[locale];
  const e=experience[locale];
  const [format,setFormat]=useState<Format>("free");
  const [expanded,setExpanded]=useState(false);
  const [name,setName]=useState("");
  const [contact,setContact]=useState("");
  const [replyMode,setReplyMode]=useState<"whatsapp"|"email">("whatsapp");
  const [showQuestion,setShowQuestion]=useState(false);
  const [question,setQuestion]=useState("");
  const [consent,setConsent]=useState(false);
  const [website,setWebsite]=useState("");
  const [busy,setBusy]=useState(false);
  const [success,setSuccess]=useState(false);
  const [error,setError]=useState("");
  const operation=useRef<string|null>(null);
  useEffect(()=>{
    const chosen=new URLSearchParams(window.location.search).get("businessFormat");
    if(chosen==="free"||chosen==="express"||chosen==="full"||chosen==="mentoring") setFormat(chosen);
  },[]);
  useEffect(()=>{
    const choose=(event:MouseEvent)=>{
      if(!(event.target instanceof Element))return;
      const option=event.target.closest("[data-business-direct-option]");
      const value=option?.getAttribute("data-business-direct-option");
      if(value==="free"||value==="express"||value==="full"||value==="mentoring"){
        setFormat(value);setExpanded(true);
      }
      // Only a client-selected editorial topic may prefill the optional visible note.
      // Never submit a hidden prefilled question or overwrite the visitor's own text.
      const context=option?.getAttribute("data-business-finder-context");
      if(context&&context.length<=600){
        setQuestion(previous=>previous.trim()?previous:context);
        setShowQuestion(true);
        setSuccess(false);
        setError("");
        operation.current=null;
      }
    };
    document.addEventListener("click",choose);
    return ()=>document.removeEventListener("click",choose);
  },[]);
  function edit() {setSuccess(false);setError("");operation.current=null}
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy||success)return;
    const reply=parseBusinessReplyContact(contact);
    if(!reply||reply.replyChannel!==replyMode){setError(t.contactError);return}
    setBusy(true);setError("");
    try{
      operation.current ||= crypto.randomUUID();
      const search=new URLSearchParams(window.location.search);
      const attribution: Record<string,string>={};
      for(const key of ["source","medium","campaign"] as const){
        const value=search.get("utm_"+key);
        if(value&&/^[a-zA-Z0-9_-]{1,64}$/.test(value))attribution[key]=value;
      }
      const response=await fetch("/api/services/business-consulting",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({operationId:operation.current,locale,format,name,...reply,question:showQuestion?question:"",
          contactConsent:consent,website,attribution}),
      });
      if(!response.ok){
        const body=await response.json().catch(()=>({}));
        if(response.status===429)setError(t.rate);
        else if(response.status===503)setError(t.offline);
        else setError(body.error==="CONTACT_REQUIRED"?t.contactError:t.error);
        return;
      }
      const body=await response.json();
      if(body?.received===true){setSuccess(true);setExpanded(true);}else setError(t.error);
    }catch{setError(t.error)}
    finally{setBusy(false)}
  }
  const chatHref = whatsappEnquiryUrl({
    locale,
    service: "Business consultation",
    request: e.chatMessage,
    option: t.formatNames[format],
    pagePath: "/" + locale + "/services/business-consulting",
  });

  return <section className={styles.panel} id="business-direct-request"
      data-business-website-enquiry aria-labelledby="business-website-title">
    <header className={styles.intro}>
      <div className={styles.portrait}>
        <Image src="/images/holistic-house/andy-about.png" alt="Andrey Litvinov"
          fill sizes="(max-width: 600px) 78px, 110px" />
      </div>
      <div className={styles.introText}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="business-website-title">{e.title}</h2>
        <p className={styles.lead}>{e.lead}</p>
      </div>
    </header>
    {success ? (
      <div className={styles.savedPanel}>
        <div role="status" aria-live="polite" className={styles.success}>
          <CheckCircle2 size={24} aria-hidden="true" />
          <div><strong>{t.success}</strong><p>{e.savedNext}</p></div>
        </div>
        {format === "free" && <Link className={styles.nextAction}
          href={"/"+locale+"/services/free-situation-review?topic=business"}>
          {t.nextAction}<ArrowRight size={17} aria-hidden="true" />
        </Link>}
        <p className={styles.chatTitle}>{e.chat}</p>
        <div className={styles.messengerChoices}>
          <a className={styles.whatsapp} href={chatHref}
            target="_blank" rel="noopener noreferrer">
            <MessageCircle size={20} aria-hidden="true"/>WhatsApp
          </a>
          <a className={styles.telegram} href={telegramEnquiryUrlFromWhatsApp(chatHref)}
            target="_blank" rel="noopener noreferrer">
            <Send size={20} aria-hidden="true"/>Telegram
          </a>
        </div>
      </div>
    ) : (
      <>
        <p className={styles.question}>{e.choice}</p>
        <div className={styles.options} role="group" aria-label={t.format}>
          {formats.map(key => <button key={key} type="button"
            className={styles.option} data-business-field="format"
            aria-pressed={format===key}
            onClick={() => { setFormat(key); edit(); }}>
            <span className={styles.optionImage}>
              <Image src={formatImages[key]} alt="" fill sizes="(max-width: 600px) 68px, 72px" />
            </span>
            <span className={styles.optionCopy}>
              <strong>{t.formatNames[key]}</strong>
              <small>{e.details[key]}</small>
            </span>
            <span className={styles.optionEnd}>
              <span className={styles.optionPrice}>{e.prices[key]}</span>
              <span className={styles.optionCheck} aria-hidden="true">
                {format===key && <Check size={17} strokeWidth={3}/>}
              </span>
            </span>
          </button>)}
        </div>
        <button type="button" className={styles.openRequest}
          aria-expanded={expanded} aria-controls="business-request-form"
          onClick={() => setExpanded(open => !open)}>
          <ShoppingBag size={21} aria-hidden="true"/>
          <span>{e.action}</span>
          <ChevronDown size={22} aria-hidden="true"/>
        </button>
        <p className={styles.actionNote}>{e.actionNote}</p>
        <div id="business-request-form" className={styles.capture} hidden={!expanded}>
          <p className={styles.captureIntro}>{e.quickIntro}</p>
          <form onSubmit={submit} className={styles.form}>
            <label>{t.name}
              <input required type="text" autoComplete="name" maxLength={120} minLength={2}
                value={name} placeholder={t.namePlaceholder} disabled={busy}
                onChange={event=>{setName(event.target.value);edit();}} />
            </label>
            <div className={styles.contactChoice}>
              <div className={styles.replyMode} role="group" aria-label={t.contact}>
                {(["whatsapp","email"] as const).map(mode=><button key={mode} type="button"
                  aria-pressed={replyMode===mode} disabled={busy}
                  onClick={()=>{setReplyMode(mode);setContact("");edit();}}>
                  {t[mode]}
                </button>)}
              </div>
              {replyMode==="whatsapp"?
                <div className={styles.phoneField}>
                  <label htmlFor="business-reply-phone">{t.whatsapp}</label>
                  <PhoneCountryInput id="business-reply-phone" locale={locale} value={contact} required
                    disabled={busy} onChange={value=>{setContact(value);edit();}}/>
                </div>
                :<label>{t.email}<input required type="email" autoComplete="email" maxLength={254}
                    autoCapitalize="none" spellCheck={false} value={contact} placeholder="name@example.com"
                    disabled={busy} onChange={event=>{setContact(event.target.value);edit();}} /></label>}
            </div>
            <button type="button" className={styles.detailsToggle} aria-expanded={showQuestion}
              aria-controls="business-request-note" onClick={()=>{setShowQuestion(open=>!open);edit();}}>
              {showQuestion?t.hideNote:t.addNote}
            </button>
            <div id="business-request-note" hidden={!showQuestion} className={styles.questionField}>
              <label>{t.question}
                <textarea disabled={!showQuestion} maxLength={700} minLength={5} rows={2} value={question}
                  placeholder={t.questionPlaceholder} onChange={event=>{setQuestion(event.target.value);edit();}}/>
              </label>
            </div>
            <label className={styles.honeypot} aria-hidden="true">Website
              <input type="text" value={website} tabIndex={-1} autoComplete="off"
                onChange={event=>setWebsite(event.target.value)} />
            </label>
            <label className={styles.consent}>
              <input type="checkbox" required checked={consent}
                onChange={event=>{setConsent(event.target.checked);edit();}} />
              <span>{t.consent}</span>
            </label>
            <button type="submit" disabled={busy||!consent}>
              {busy?t.sending:t.send}<ArrowRight size={18} aria-hidden="true"/>
            </button>
            {error&&<p className={styles.error} role="alert">{error}{" "}
              <Link prefetch={false} className={styles.fallback}
                href={"/"+locale+"/services/business-consulting#business-offers"}>
                {t.manualFallback}<ArrowRight size={15} aria-hidden="true"/>
              </Link>
            </p>}
          </form>
        </div>
      </>
    )}
    <footer className={styles.footer}>
      <div className={styles.trust}>
        <span><Check size={15} aria-hidden="true"/>{e.personalReply}</span>
        <span><Check size={15} aria-hidden="true"/>{e.noObligation}</span>
      </div>
      <p className={styles.note}><ShieldCheck size={15} aria-hidden="true"/>{t.note}</p>
    </footer>
  </section>;
}
