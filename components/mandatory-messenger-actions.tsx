"use client";
import {useEffect,useState} from "react";
import {MessageCircle,Send} from "lucide-react";
import {telegramEnquiryUrlFromWhatsApp} from "@/lib/whatsapp-enquiry";
import {resolveTelegramFirstEntry} from "@/lib/app/telegram-entry-url.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./mandatory-messenger-actions.module.css";
const copy={
 ru:{title:"Написать через мессенджер",intro:"Выберите Telegram или WhatsApp. Email или введённый номер телефона не подтверждает переписку.",note:"Нажмите «Отправить» в самом мессенджере. Открытие ссылки — ещё не отправленная заявка, запись или оплата. Не передавайте медицинские данные в чате.",bot:"В Telegram-боте подтвердите согласие на личный ответ, затем напишите вопрос.",review:"Бот предложит бесплатный личный разбор. Это не прямой чат и не вход в кабинет сайта."},
 en:{title:"Message us in a messenger",intro:"Choose Telegram or WhatsApp. Email and a typed phone number do not verify a conversation.",note:"Press Send inside the messenger. Opening a link is not a submitted enquiry, confirmed booking or payment. Do not share private medical information in chat.",bot:"In the Telegram bot, confirm reply consent and then write your question.",review:"The bot starts a free personal-review questionnaire, not direct chat or website sign-in."},
 es:{title:"Escríbenos por mensajería",intro:"Elige Telegram o WhatsApp. Escribir un correo o teléfono no verifica la conversación.",note:"Pulsa Enviar dentro de la aplicación. Abrir el enlace no es una solicitud, reserva o pago confirmado. Evita datos médicos privados.",bot:"En el bot de Telegram, acepta el contacto y escribe tu consulta.",review:"El bot inicia un cuestionario de revisión personal, no un chat directo ni una sesión web."}
} as const;
type Props={locale:PublicLocale;whatsappUrl:string;label?:string;telegramUrl?:string;collapsed?:boolean;id?:string;className?:string};
export function MandatoryMessengerActions({locale,whatsappUrl,label,telegramUrl,collapsed=false,id,className}:Props){
 const t=copy[locale], [bot,setBot]=useState<{href:string;kind:"review"|"direct"}|null>(null);
 // The verified diagnostic bot supports hhreview when directAvailable is OFF.
 // Opening a bot link alone never authenticates a client or stores a CRM lead.
 useEffect(()=>{
  const abort=new AbortController();
  setBot(null);
  fetch("/api/public/telegram-diagnostic",{cache:"no-store",signal:abort.signal})
   .then(r=>r.ok?r.json():null)
   .then((payload:unknown)=>{
    if(!abort.signal.aborted)setBot(resolveTelegramFirstEntry(payload,locale));
   }).catch(()=>{if(!abort.signal.aborted)setBot(null);});
  return ()=>abort.abort();
 },[locale]);
 const channels=<>
  <img className={styles.art} data-hh-messenger-art src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" aria-hidden="true" width="600" height="100" loading="lazy"/>
  <p className={styles.intro}>{t.intro}</p>
  <div className={styles.actions} role="group" aria-label={t.title}>
   <a href={whatsappUrl} className={styles.whatsapp} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" data-messenger-only-channel="whatsapp"><MessageCircle size={19} aria-hidden="true"/>WhatsApp</a>
   <a href={telegramUrl||bot?.href||telegramEnquiryUrlFromWhatsApp(whatsappUrl)} data-telegram-route={bot?.kind||"manual"} className={styles.telegram} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" data-messenger-only-channel="telegram"><Send size={19} aria-hidden="true"/>Telegram</a>
  </div>
  <p className={styles.note}>{t.note}</p>{bot?<p className={styles.note} role="status">{bot.kind==="review"?t.review:t.bot}</p>:null}
 </>;
 return <div id={id} className={[styles.root,className].filter(Boolean).join(" ")} data-messenger-only-contact lang={locale}>
  {collapsed?<details><summary className={styles.summary}>{label||t.title}</summary><div className={styles.body}>{channels}</div></details>
   :<div className={styles.body}><strong>{label||t.title}</strong>{channels}</div>}
 </div>;
}
