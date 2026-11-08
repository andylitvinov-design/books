"use client";
import {useEffect,useState} from "react";
import {MessageCircle,Send} from "lucide-react";
import {telegramEnquiryUrlFromWhatsApp} from "@/lib/whatsapp-enquiry";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./mandatory-messenger-actions.module.css";
const copy={
 ru:{title:"Написать через мессенджер",intro:"Выберите Telegram или WhatsApp. Email или введённый номер телефона не подтверждает переписку.",note:"Нажмите «Отправить» в самом мессенджере. Открытие ссылки — ещё не отправленная заявка, запись или оплата. Не передавайте медицинские данные в чате.",bot:"В Telegram-боте подтвердите согласие на личный ответ, затем напишите вопрос."},
 en:{title:"Message us in a messenger",intro:"Choose Telegram or WhatsApp. Email and a typed phone number do not verify a conversation.",note:"Press Send inside the messenger. Opening a link is not a submitted enquiry, confirmed booking or payment. Do not share private medical information in chat.",bot:"In the Telegram bot, confirm reply consent and then write your question."},
 es:{title:"Escríbenos por mensajería",intro:"Elige Telegram o WhatsApp. Escribir un correo o teléfono no verifica la conversación.",note:"Pulsa Enviar dentro de la aplicación. Abrir el enlace no es una solicitud, reserva o pago confirmado. Evita datos médicos privados.",bot:"En el bot de Telegram, acepta el contacto y escribe tu consulta."}
} as const;
type Props={locale:PublicLocale;whatsappUrl:string;label?:string;telegramUrl?:string;collapsed?:boolean;id?:string;className?:string};
export function MandatoryMessengerActions({locale,whatsappUrl,label,telegramUrl,collapsed=false,id,className}:Props){
 const t=copy[locale], [bot,setBot]=useState<string|null>(null);
 useEffect(()=>{
  const abort=new AbortController();
  fetch("/api/public/telegram-diagnostic",{cache:"no-store",signal:abort.signal})
   .then(r=>r.ok?r.json():null).then((value:unknown)=>{
    const data=value as {directAvailable?:boolean;url?:string;directUrls?:Record<string,string>}|null;
    const raw=data?.directUrls?.[locale];
    if(data?.directAvailable!==true||typeof data.url!=="string"||typeof raw!=="string")return;
    const u=new URL(raw),base=new URL(data.url);
    if(u.origin==="https://t.me"&&u.origin===base.origin&&u.pathname===base.pathname&&
      /^\/[A-Za-z0-9_]{5,32}bot$/i.test(u.pathname)&&
      [...u.searchParams.keys()].length===1&&u.searchParams.get("start")==="hhtalk_"+locale&&
      !u.hash&&!u.username&&!u.password)setBot(u.href);
   }).catch(()=>{});
  return ()=>abort.abort();
 },[locale]);
 const channels=<>
  <p className={styles.intro}>{t.intro}</p>
  <div className={styles.actions} role="group" aria-label={t.title}>
   <a href={whatsappUrl} className={styles.whatsapp} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" data-messenger-only-channel="whatsapp"><MessageCircle size={19} aria-hidden="true"/>WhatsApp</a>
   <a href={telegramUrl||bot||telegramEnquiryUrlFromWhatsApp(whatsappUrl)} className={styles.telegram} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" data-messenger-only-channel="telegram"><Send size={19} aria-hidden="true"/>Telegram</a>
  </div>
  <p className={styles.note}>{t.note}</p>{bot?<p className={styles.note}>{t.bot}</p>:null}
 </>;
 return <div id={id} className={[styles.root,className].filter(Boolean).join(" ")} data-messenger-only-contact lang={locale}>
  {collapsed?<details><summary className={styles.summary}>{label||t.title}</summary><div className={styles.body}>{channels}</div></details>
   :<div className={styles.body}><strong>{label||t.title}</strong>{channels}</div>}
 </div>;
}
