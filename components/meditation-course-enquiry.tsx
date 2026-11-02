"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import type { PublicLocale } from "@/lib/public-locales";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import css from "./meditation-course-enquiry.module.css";

const copy={
  ru:{
    open:"Запросить курс из 8 медитаций",name:"Как к вам обращаться? · необязательно",
    email:"Email для ответа",phone:"Телефон в международном формате · необязательно",
    consent:"Согласен передать контакт только для ответа на эту заявку о курсе. Никакой подписки или рассылки.",
    send:"Отправить заявку",busy:"Отправляем…",done:"Заявка сохранена. Специалист уточнит программу и условия до оплаты.",
    reference:"Номер обращения",error:"Не удалось сохранить заявку. Проверьте контакт или попробуйте позже.",
    contact:"Укажите email либо международный телефон.",fallback:"Узнать о личной работе другим способом",
    note:"Мы передаём только выбранную общую тему курса и контакт. Личный текст медитации, результаты тестов и история не отправляются. Оплата не выполняется.",
    service:"Курс 8 персональных медитаций",description:"Прошу связаться со мной для согласования восьмидневного курса персональных медитаций. Общая тема: ",
  },
  en:{
    open:"Request the 8-meditation course",name:"Your name · optional",
    email:"Email for a reply",phone:"International phone · optional",
    consent:"I agree to share my contact details for a reply about this course only. No mailing-list sign-up.",
    send:"Send request",busy:"Sending…",done:"Request saved. A practitioner will agree on the programme and terms before any payment.",
    reference:"Request reference",error:"The request could not be saved. Check your contact details or try again later.",
    contact:"Enter an email or international phone number.",fallback:"Ask about personal support another way",
    note:"Only your general course topic and contact are sent. Your meditation text, test scores and personal history are not shared. No payment is taken.",
    service:"Eight personal meditations",description:"Please contact me to discuss an eight-day personal meditation course. General topic: ",
  },
  es:{
    open:"Solicitar curso de 8 meditaciones",name:"Tu nombre · opcional",
    email:"Email para responder",phone:"Teléfono internacional · opcional",
    consent:"Acepto compartir mi contacto únicamente para recibir una respuesta sobre este curso. No me suscribo a publicidad.",
    send:"Enviar solicitud",busy:"Enviando…",done:"Solicitud guardada. Un profesional acordará el programa y las condiciones antes de cualquier pago.",
    reference:"Número de solicitud",error:"No se pudo guardar la solicitud. Revisa el contacto o inténtalo más tarde.",
    contact:"Escribe un email o teléfono internacional.",fallback:"Consultar apoyo personal por otra vía",
    note:"Solo se envían el tema general y tus datos de contacto. No se comparten tu meditación, pruebas ni historial. No se realiza ningún pago.",
    service:"Curso de 8 meditaciones personales",description:"Quisiera hablar sobre un curso personal de ocho días. Tema general: ",
  }
} as const;

export function MeditationCourseEnquiry({locale,focus}:{locale:PublicLocale;focus:VideoTheme}){
  const t=copy[locale];
  const [open,setOpen]=useState(false);
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState<string|null>(null);
  const operationRef=useRef<string|null>(null);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy||saved!==null||!consent)return;
    if(!email.trim()&&!phone.trim()){setError(t.contact);return;}
    if(typeof crypto==="undefined"||typeof crypto.randomUUID!=="function"){setError(t.error);return;}
    operationRef.current ||= crypto.randomUUID();
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/service-enquiries",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          operationId:operationRef.current,
          serviceTitle:t.service,
          description:t.description+focus,
          // Only an already-public first-party service path, no user details.
          sourcePath:"/"+locale+"/services/imagery-therapy",
          locale,
          contact:{displayName:name.trim(),email:email.trim(),phone:phone.trim()},
          contactConsent:true,
        }),
      });
      const result=await response.json() as {saved?:boolean;referenceCode?:string};
      if(!response.ok||result.saved!==true){setError(t.error);return;}
      setSaved(typeof result.referenceCode==="string"?result.referenceCode:"");
    }catch{setError(t.error);}
    finally{setBusy(false);}
  }
  return <div className={css.root} data-meditation-course-enquiry>
    {saved!==null?<p className={css.success} data-meditation-course-enquiry-saved role="status">
      {t.done}{saved?<span>{t.reference}: {saved}</span>:null}
    </p>:<>
      <button type="button" className={css.open} data-meditation-course-order
        aria-expanded={open} aria-controls="meditation-course-contact"
        onClick={()=>setOpen(v=>!v)}>{t.open}</button>
      {open?<form id="meditation-course-contact" className={css.form}
        data-meditation-course-contact onSubmit={event=>void submit(event)} noValidate>
        <label>{t.name}<input value={name} maxLength={120} autoComplete="name"
          onChange={event=>{setName(event.target.value);operationRef.current=null;}}/></label>
        <label>{t.email}<input value={email} type="email" maxLength={254} autoComplete="email"
          onChange={event=>{setEmail(event.target.value);operationRef.current=null;}}/></label>
        <label>{t.phone}<input value={phone} type="tel" maxLength={40} autoComplete="tel"
          placeholder="+1 416 000 0000"
          onChange={event=>{setPhone(event.target.value);operationRef.current=null;}}/></label>
        <label className={css.consent}><input type="checkbox" checked={consent}
          onChange={event=>setConsent(event.target.checked)}/><span>{t.consent}</span></label>
        <small>{t.note}</small>
        {error?<p className={css.error} role="alert">{error}</p>:null}
        <button type="submit" data-meditation-course-submit disabled={busy||!consent||(!email.trim()&&!phone.trim())}>
          {busy?t.busy:t.send}
        </button>
      </form>:null}
    </>}
    <Link href={"/"+locale+"/services/imagery-therapy"} prefetch={false}>{t.fallback}</Link>
  </div>;
}
