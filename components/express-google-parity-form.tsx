"use client";

import {useRef,useState} from "react";
import {
 GOOGLE_EXPRESS_FIELDS,GOOGLE_EXPRESS_EMAIL,GOOGLE_EXPRESS_VERSION,
 buildExpressGoogleParityQuestionnaire,expressGoogleParityProgress,
} from "@/lib/coaching/express-google-parity.mjs";
import styles from "./express-google-parity-form.module.css";

type Locale="ru"|"en";
type ValueMap=Record<string,string>;
type SourceQuestion={id:string;kind:"text"|"tel"|"long";max:number;required:boolean;en:string;ru:string};
const questions=GOOGLE_EXPRESS_FIELDS as SourceQuestion[];
const groups=[["name","city","whatsapp"],["request","activity","challenge","attempts"],
  ["outcome","importance","startingPoint","resources"],["questions","priority","extra"]] as const;
const TEXT={
 ru:{
  title:"Анкета для бесплатной диагностики",
  lead:"Вопросы из английской Express Diagnostic Form — с русским переводом. Ответы сохраняются в защищённой переписке Holistic House после отправки.",
  steps:["Контакты","Ситуация","Цель и возможности","Ваши вопросы"],
  required:"Обязательный вопрос",optional:"Необязательно",next:"Продолжить",back:"Назад",
  send:"Отправить ответы",saving:"Проверяем и сохраняем…",
  agreement:"Я разрешаю сохранить этот email, WhatsApp и мои ответы в защищённой CRM Holistic House, чтобы ответить по моему запросу. Это не согласие на рекламную рассылку.",
  offer:"Формат: бесплатная экспресс-диагностика. Платная запись не создаётся.",
  error:"Пожалуйста, заполните обязательные вопросы и укажите корректный email.",
  failure:"Не удалось подтвердить получение анкеты. Нажмите ещё раз: повтор использует тот же номер заявки и не создаёт дубль.",
  expired:"Срок действия ссылки истёк. Вернитесь в Telegram-чат Ali и напишите /form для новой ссылки.",
  done:"Анкета и контактные данные подтверждённо сохранены в защищённой CRM.",
  saved:"Номер подтверждения",return:"Вернуться в Telegram-чат",count:"заполнено",
 },
 en:{
  title:"Free Express Diagnostic Form",
  lead:"The same questions as the original Express Diagnostic Form. Answers are sent to the protected Holistic House CRM conversation after you submit.",
  steps:["Contact details","Your situation","Goal and resources","Your questions"],
  required:"Required question",optional:"Optional",next:"Continue",back:"Back",
  send:"Send answers",saving:"Checking and saving…",
  agreement:"I agree to store this email, WhatsApp number and my answers in Holistic House's protected CRM for a personal reply. This is not consent to promotional messages.",
  offer:"Format: Free Express Analysis. No paid appointment will be made.",
  error:"Please answer the required questions and provide a valid email.",
  failure:"We couldn't confirm receipt. You can retry with the same request ID; it won't create a duplicate.",
  expired:"This link has expired. Return to Ali on Telegram and send /form for a fresh secure link.",
  done:"Your questionnaire and contact details have been verified and saved in the protected CRM.",
  saved:"Confirmation reference",return:"Return to Telegram chat",count:"answered",
 },
} as const;

export default function ExpressGoogleParityForm({locale,handoff}:{locale:Locale;handoff:string}){
 const t=TEXT[locale];
 const [step,setStep]=useState(0);
 const [values,setValues]=useState<ValueMap>({});
 const [email,setEmail]=useState("");
 const [emailConsent,setEmailConsent]=useState(false);
 const [busy,setBusy]=useState(false);
 const [failure,setFailure]=useState("");
 const [receipt,setReceipt]=useState("");
 const [locked,setLocked]=useState(false);
 const attempted=useRef<string|null>(null);
 const progress=expressGoogleParityProgress(values);
 const completed=questions.filter(f=>f.required&&values[f.id]?.trim()).length;
 const setField=(id:string,text:string)=>{
  if(locked)return;
  setValues(x=>({...x,[id]:text}));
  setFailure("");
 };
 const validateStep=()=>{
  const keys=groups[step];
  const missing=keys.some(id=>questions.some(f=>f.id===id&&f.required&&!values[id]?.trim()));
  if(missing||(step===0&&!/^[^\s@<>]+@[^\s@<>]+\.[a-zA-Z]{2,}$/u.test(email.trim()))||
    (step===3&&!emailConsent)){
    setFailure(t.error);return false;
  }
  setFailure("");return true;
 };
 const next=()=>{if(validateStep())setStep(x=>Math.min(x+1,3));};
 const submit=async()=>{
  if(busy||receipt||!validateStep())return;
  setBusy(true);setFailure("");setLocked(true);
  try{
   if(!attempted.current){
    const questionnaire=buildExpressGoogleParityQuestionnaire({
     operationId:window.crypto.randomUUID(),locale,values,email,emailConsent,
    });
    attempted.current=JSON.stringify({action:"submit",handoff,questionnaire});
   }
   const response=await fetch("/api/coaching-diagnostic/telegram",{
    method:"POST",credentials:"same-origin",
    headers:{"content-type":"application/json"},body:attempted.current,
   });
   const result=await response.json().catch(()=>null);
   if(!response.ok||result?.saved!==true||!/^HH-[A-F0-9]{12}$/u.test(result.referenceCode||"")){
    if(response.status===400){attempted.current=null;setLocked(false);}
    setFailure(response.status===409?t.expired:response.status===400?t.error:t.failure);
    return;
   }
   setReceipt(result.referenceCode);
  }catch{setFailure(t.failure);}
  finally{setBusy(false);}
 };
 return <section className={styles.shell} data-google-express-parity={GOOGLE_EXPRESS_VERSION} lang={locale}>
   <header className={styles.header}>
    <span className={styles.kicker}>Holistic House · Free Diagnostic</span>
    <h2>{t.title}</h2>
    <p>{t.lead}</p>
    <p className={styles.offer}>{t.offer}</p>
   </header>
   {receipt?<div className={styles.receipt} role="status" data-google-express-receipt>
      <strong>{t.done}</strong>
      <p>{t.saved}: <b>{receipt}</b></p>
      <a href="https://t.me/holistichouse_bot">{t.return}</a>
    </div>:
    <form onSubmit={event=>{event.preventDefault();void submit();}} noValidate>
     <div className={styles.progress} aria-label={t.count}>
      <span>{t.steps[step]}</span><strong>{progress.complete}/{progress.total} · {t.count}</strong>
      <div className={styles.track}><div style={{width:(completed/progress.total*100)+"%"}} /></div>
     </div>
     {step===0?<label className={styles.field}>
      <span>{GOOGLE_EXPRESS_EMAIL[locale]} <b>*</b></span>
      <input name="email" type="email" maxLength={254} autoComplete="email" required
       disabled={busy||locked} value={email} onChange={event=>{setEmail(event.target.value);setFailure("");}}/>
     </label>:null}
     {questions.filter(f=>groups[step].some(id=>id===f.id)).map((f,i)=>
      <label className={styles.field} key={f.id}>
       <span>{f[locale]} {f.required?<b>*</b>:<small>{t.optional}</small>}</span>
       {f.kind==="long"?<textarea value={values[f.id]||""} name={f.id} required={f.required}
         maxLength={f.max} rows={3} disabled={busy||locked}
         onChange={event=>setField(f.id,event.target.value)} />:
        <input type={f.kind==="tel"?"tel":"text"} value={values[f.id]||""}
         name={f.id} maxLength={f.max} required={f.required} disabled={busy||locked}
         autoComplete={f.id==="name"?"name":f.id==="city"?"address-level2":"tel"}
         onChange={event=>setField(f.id,event.target.value)}/>}
      </label>
     )}
     {step===3?<label className={styles.consent}>
      <input type="checkbox" checked={emailConsent} required disabled={busy||locked}
       onChange={event=>{setEmailConsent(event.target.checked);setFailure("");}}/>
      <span>{t.agreement}</span>
     </label>:null}
     {failure?<p className={styles.error} role="alert">{failure}</p>:null}
     <div className={styles.actions}>
      {step>0?<button type="button" disabled={busy||locked}
       className={styles.secondary} onClick={()=>{setFailure("");setStep(x=>Math.max(0,x-1));}}>{t.back}</button>:null}
      {step<3?<button type="button" disabled={busy||locked}
        className={styles.primary} onClick={next}>{t.next}</button>:
       <button type="submit" disabled={busy} className={styles.primary}>{busy?t.saving:t.send}</button>}
     </div>
     <p className={styles.footnote}>* {t.required}</p>
    </form>}
  </section>;
}
