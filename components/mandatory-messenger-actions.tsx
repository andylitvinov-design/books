"use client";
import {useEffect,useState} from "react";
import {MessageCircle,Send} from "lucide-react";
import {telegramEnquiryUrlFromWhatsApp} from "@/lib/whatsapp-enquiry";
import {resolveTelegramFirstEntry,resolveTelegramServiceHandoffUrl,isOfficialFreeReviewWhatsAppDraft} from "@/lib/app/telegram-entry-url.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./mandatory-messenger-actions.module.css";
const copy={
 ru:{title:"Написать через мессенджер",intro:"Выберите Telegram или WhatsApp. Email или введённый номер телефона не подтверждает переписку.",note:"Нажмите «Отправить» в самом мессенджере. Открытие ссылки — ещё не отправленная заявка, запись или оплата. Не передавайте медицинские данные в чате.",bot:"В Telegram-боте подтвердите согласие на личный ответ, затем напишите вопрос.",review:"Бот предложит бесплатный личный разбор. Это не прямой чат и не вход в кабинет сайта."},
 en:{title:"Message us in a messenger",intro:"Choose Telegram or WhatsApp. Email and a typed phone number do not verify a conversation.",note:"Press Send inside the messenger. Opening a link is not a submitted enquiry, confirmed booking or payment. Do not share private medical information in chat.",bot:"In the Telegram bot, confirm reply consent and then write your question.",review:"The bot starts a free personal-review questionnaire, not direct chat or website sign-in."},
 es:{title:"Escríbenos por mensajería",intro:"Elige Telegram o WhatsApp. Escribir un correo o teléfono no verifica la conversación.",note:"Pulsa Enviar dentro de la aplicación. Abrir el enlace no es una solicitud, reserva o pago confirmado. Evita datos médicos privados.",bot:"En el bot de Telegram, acepta el contacto y escribe tu consulta.",review:"El bot inicia un cuestionario de revisión personal, no un chat directo ni una sesión web."}
} as const;
type Props={locale:PublicLocale;whatsappUrl:string;label?:string;telegramUrl?:string;collapsed?:boolean;compact?:boolean;active?:boolean;id?:string;className?:string};
export function MandatoryMessengerActions({locale,whatsappUrl,label,telegramUrl,collapsed=false,compact=false,active=true,id,className}:Props){
 const t=copy[locale];
 const [serviceBot,setServiceBot]=useState<string|null>(null);
 const [botKind,setBotKind]=useState<"review"|"direct"|"service"|null>(null);
 useEffect(()=>{
   // Hidden service cards never fetch. The five supported service orders use
   // a deterministic server handoff below; only free review needs a lookup.
   if(!active||telegramUrl||!isOfficialFreeReviewWhatsAppDraft(whatsappUrl,locale)){
     setServiceBot(null);setBotKind(null);return;
   }
   const abort=new AbortController();
   setServiceBot(null);setBotKind(null);
   fetch('/api/public/telegram-diagnostic',{cache:'no-store',signal:abort.signal})
     .then(r=>r.ok?r.json():null)
     .then(payload=>{
       if(abort.signal.aborted)return;
       const entry=resolveTelegramFirstEntry(payload,locale);
       setServiceBot(entry?.href||null);
       setBotKind(entry?.kind||null);
     })
     .catch(()=>{if(!abort.signal.aborted){setServiceBot(null);setBotKind(null);}});
   return ()=>abort.abort();
 },[telegramUrl,whatsappUrl,locale,active]);
 const directBot=typeof telegramUrl==='string'&&
   /^https:\/\/t\.me\/holistichouse_bot\?start=hhitem_[a-z]+_[a-z0-9]+_(?:ru|en|es)$/.test(telegramUrl);
 const serviceRoute=active?resolveTelegramServiceHandoffUrl(
   telegramUrl||telegramEnquiryUrlFromWhatsApp(whatsappUrl),locale):null;
 // Every service/order request keeps its selected product; never launch the
 // unrelated opt-in free-review Telegram bot from a purchasing button.
 const channels=<>
  {!compact&&<><img className={styles.art} data-hh-messenger-art src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" aria-hidden="true" width="600" height="100" loading="lazy"/>
  <p className={styles.intro}>{t.intro}</p></>}
  <div className={styles.actions} role="group" aria-label={t.title}>
   <a href={whatsappUrl} className={styles.whatsapp} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" data-messenger-only-channel="whatsapp"><MessageCircle size={19} aria-hidden="true"/>WhatsApp</a>
   <a href={serviceRoute||serviceBot||telegramUrl||telegramEnquiryUrlFromWhatsApp(whatsappUrl)} data-telegram-route={serviceRoute?"service-router":serviceBot?(botKind||"review"):directBot?"service-bot":telegramUrl?"manual":"service"} className={styles.telegram} target={directBot?"_self":"_blank"} rel="noopener noreferrer" referrerPolicy="no-referrer" data-messenger-only-channel="telegram"><Send size={19} aria-hidden="true"/>Telegram</a>
  </div>
  {!compact&&<p className={styles.note}>{t.note}</p>}
 </>;
 return <div id={id} className={[styles.root,!compact?className:""].filter(Boolean).join(" ")}
  data-messenger-only-contact data-compact-messenger={compact?"true":undefined} lang={locale}>
  {collapsed?<details><summary className={[styles.summary,compact?className:""].filter(Boolean).join(" ")}
      data-contact-order={compact?"":undefined}>{label||t.title}</summary><div className={styles.body}>{channels}</div></details>
   :<div className={styles.body}><strong>{label||t.title}</strong>{channels}</div>}
 </div>;
}
