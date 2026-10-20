"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import type { BusinessLocale } from "@/data/business-consulting-copy";
import styles from "./business-website-enquiry.module.css";

type Format = "free" | "express" | "full" | "mentoring";
const translations = {
  en: {
    eyebrow:"SEND DIRECTLY TO ANDREY", title:"Leave a business enquiry on the website",
    lead:"A short business question is enough. Your request goes into Andrey's private CRM; no account, automatic booking or payment required.",
    name:"Your name",namePlaceholder:"How should I address you?",email:"Email",phone:"Phone / WhatsApp",
    emailHelp:"Provide an email, phone number, or both.",
    format:"Which format interests you?",formatNames:{free:"Free written review",express:"30 minutes · €50",full:"60 minutes · €100",mentoring:"Goals Mentoring · by arrangement"},
    question:"Your question or situation",questionPlaceholder:"What decision or goal would you like to clarify?",
    consent:"I agree to be contacted personally about this enquiry. I am not signing up for marketing.",
    send:"Send my request",sending:"Sending…",success:"Request saved. Andrey can now see it in his private CRM.",
    next:"For the free written review, continue to the short questionnaire and handwritten drawing.",
    nextAction:"Continue free questionnaire",note:"Only necessary business contact information is collected and encrypted. Do not share medical or other highly sensitive details.",
    contactError:"Add a valid email address or international phone number (+...).",
    error:"The request could not be saved. Please retry, or use the WhatsApp/Telegram options above.",
    rate:"Too many requests. Please try again later.",offline:"The website request system is temporarily unavailable.",
  },
  ru: {
    eyebrow:"НАПРЯМУЮ АНДРЕЮ",title:"Оставьте бизнес-заявку прямо на сайте",
    lead:"Достаточно коротко описать деловой вопрос. Заявка сохранится в личной CRM Андрея без регистрации, оплаты и автоматической записи.",
    name:"Как к вам обращаться",namePlaceholder:"Ваше имя",email:"Email",phone:"Телефон / WhatsApp",
    emailHelp:"Укажите email, телефон или оба контакта.",
    format:"Какой формат интересен?",formatNames:{free:"Бесплатный письменный разбор",express:"30 минут · €50",full:"60 минут · €100",mentoring:"Goals Mentoring · по договорённости"},
    question:"Ваш вопрос или ситуация",questionPlaceholder:"Какое решение или цель вы хотите прояснить?",
    consent:"Согласен(на), чтобы Андрей связался со мной по этой заявке. На рекламные рассылки не подписываюсь.",
    send:"Отправить заявку",sending:"Отправляем…",success:"Заявка сохранена. Андрей увидит её в своей CRM.",
    next:"Для бесплатного письменного разбора заполните короткую анкету и отправьте рисунок от руки.",
    nextAction:"Перейти к бесплатной анкете",note:"Контакты шифруются и используются только для ответа. Не указывайте медицинскую или другую особо чувствительную информацию.",
    contactError:"Укажите корректный email или телефон в международном формате (+...).",
    error:"Не удалось сохранить заявку. Попробуйте ещё раз или используйте WhatsApp/Telegram выше.",
    rate:"Слишком много запросов. Попробуйте позже.",offline:"Сохранение заявок временно недоступно.",
  },
  es: {
    eyebrow:"MENSAJE DIRECTO A ANDREY",title:"Envía una solicitud empresarial desde la web",
    lead:"Basta con una pregunta breve. Tu solicitud se guardará en el CRM privado de Andrey, sin registro, pago ni reserva automática.",
    name:"Tu nombre",namePlaceholder:"¿Cómo te llamas?",email:"Correo electrónico",phone:"Teléfono / WhatsApp",
    emailHelp:"Indica correo, teléfono o ambos.",
    format:"¿Qué modalidad te interesa?",formatNames:{free:"Revisión escrita gratuita",express:"30 minutos · €50",full:"60 minutos · €100",mentoring:"Goals Mentoring · por acuerdo"},
    question:"Tu pregunta o situación",questionPlaceholder:"¿Qué decisión o meta deseas aclarar?",
    consent:"Acepto que Andrey me contacte sobre esta solicitud. No me suscribo a comunicaciones comerciales.",
    send:"Enviar solicitud",sending:"Enviando…",success:"Solicitud guardada. Andrey podrá verla en su CRM privado.",
    next:"Para obtener el informe gratuito, completa el cuestionario y envía un dibujo a mano.",
    nextAction:"Continuar con el cuestionario",note:"Solo recopilamos información profesional necesaria, cifrada. No incluyas datos médicos ni otra información sensible.",
    contactError:"Indica un correo válido o un teléfono internacional (+...).",
    error:"No se pudo guardar la solicitud. Inténtalo otra vez o usa WhatsApp/Telegram.",
    rate:"Demasiadas solicitudes. Inténtalo más tarde.",offline:"Las solicitudes web no están disponibles temporalmente.",
  },
} as const;

export function BusinessWebsiteEnquiry({locale}:{locale:BusinessLocale}) {
  const t=translations[locale];
  const [format,setFormat]=useState<Format>("free");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
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
      if(value==="free"||value==="express"||value==="full"||value==="mentoring")setFormat(value);
      // Prefill only an explicitly chosen, non-sensitive editorial topic. Never
      // overwrite a client's own message, and never submit before consent.
      const context=option?.getAttribute("data-business-finder-context");
      if(context&&context.length<=600){
        setQuestion(previous=>previous.trim()?previous:context);
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
    if(!email.trim()&&!phone.trim()){setError(t.contactError);return}
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
        body:JSON.stringify({operationId:operation.current,locale,format,name,email,phone,question,
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
      if(body?.received===true)setSuccess(true);else setError(t.error);
    }catch{setError(t.error)}
    finally{setBusy(false)}
  }
  return <section className={styles.panel} id="business-direct-request" data-business-website-enquiry aria-labelledby="business-website-title">
    <p className={styles.eyebrow}>{t.eyebrow}</p>
    <h2 id="business-website-title">{t.title}</h2>
    <p className={styles.lead}>{t.lead}</p>
    {success?
      <div role="status" aria-live="polite" className={styles.success}>
        <CheckCircle2 size={24} aria-hidden="true"/>
        <div><strong>{t.success}</strong>{format==="free"&&<p>{t.next}
          <Link href={"/"+locale+"/services/free-situation-review?topic=business"}>{t.nextAction}<ArrowRight size={17} aria-hidden="true"/></Link>
        </p>}</div>
      </div>
    :<form onSubmit={submit} className={styles.form}>
      <label>{t.format}
        <select value={format} onChange={event=>{setFormat(event.target.value as Format);edit();}} data-business-field="format">
          {Object.entries(t.formatNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>{t.name}<input required type="text" autoComplete="name" maxLength={120} minLength={2}
        value={name} placeholder={t.namePlaceholder} onChange={event=>{setName(event.target.value);edit();}} /></label>
      <div className={styles.pair}>
        <label>{t.email}<input type="email" autoComplete="email" maxLength={254} value={email}
          onChange={event=>{setEmail(event.target.value);edit();}} /></label>
        <label>{t.phone}<input type="tel" autoComplete="tel" maxLength={40} value={phone} placeholder="+14165551234"
          onChange={event=>{setPhone(event.target.value);edit();}} /></label>
      </div>
      <p className={styles.help}>{t.emailHelp}</p>
      <label>{t.question}
        <textarea required minLength={5} maxLength={700} rows={3} value={question} placeholder={t.questionPlaceholder}
          onChange={event=>{setQuestion(event.target.value);edit();}}/>
      </label>
      <label className={styles.honeypot} aria-hidden="true">Website
        <input type="text" value={website} tabIndex={-1} autoComplete="off" onChange={event=>setWebsite(event.target.value)} />
      </label>
      <label className={styles.consent}><input type="checkbox" required checked={consent}
          onChange={event=>{setConsent(event.target.checked);edit();}}/><span>{t.consent}</span></label>
      <button type="submit" disabled={busy||!consent}>{busy?t.sending:t.send}<ArrowRight size={19} aria-hidden="true"/></button>
      {error&&<p className={styles.error} role="alert">{error}</p>}
    </form>}
    <p className={styles.note}><ShieldCheck size={16} aria-hidden="true"/>{t.note}</p>
  </section>;
}
