"use client";

import {useEffect,useState} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import {whatsappExpressReviewHandoff} from "@/lib/crm/express-review-channel-handoff.mjs";
import styles from "./telegram-diagnostic-entry.module.css";

const copy={
  en:{
    title:"Start the original six-step express review",
    intro:"Your website language is English. The Telegram bot uses the approved English conversation, not a generic SalesBot template.",
    telegram:"Start English Telegram dialogue",
    whatsapp:"Contact Andrey on WhatsApp (manual)",
    manual:"WhatsApp opens a prepared English request. It is not a connected automated chatbot: review the text and press Send. Andrey answers personally.",
    telegramUnavailable:"The public Telegram bot is not enabled at the moment. Use the secure on-site form or a manual WhatsApp request.",
    note:"A link click is not a submitted lead. Telegram asks for consent first. Do not send medical records, test results or other sensitive documents in either chat.",
  },
  ru:{
    title:"Начать оригинальную экспресс-диагностику из шести шагов",
    intro:"С русской версии сайта Telegram открывает именно утверждённый русский сценарий, а не общий шаблон SalesBot.",
    telegram:"Начать русский диалог Telegram",
    whatsapp:"Написать Андрею в WhatsApp (вручную)",
    manual:"WhatsApp открывает подготовленный запрос на русском языке. Автоматический бот там не подключён: проверьте текст и нажмите «Отправить». Андрей отвечает лично.",
    telegramUnavailable:"Публичный Telegram-бот пока не активирован. Можно воспользоваться защищённой формой сайта или WhatsApp для ручной заявки.",
    note:"Клик по ссылке не означает отправленную заявку. Telegram сначала запрашивает согласие. Не отправляйте медицинские документы, результаты тестов и другие чувствительные сведения в чаты.",
  },
  es:{
    title:"Inicia la revisión exprés original de seis pasos",
    intro:"Desde la versión española, Telegram abre el diálogo aprobado en español, no una plantilla genérica de SalesBot.",
    telegram:"Iniciar el diálogo de Telegram en español",
    whatsapp:"Escribir a Andrey por WhatsApp (manual)",
    manual:"WhatsApp abre una solicitud preparada en español. No es un chatbot automatizado conectado: revisa el texto y pulsa Enviar. Andrey responde personalmente.",
    telegramUnavailable:"El bot público de Telegram no está habilitado. Usa el formulario protegido o una solicitud manual por WhatsApp.",
    note:"Abrir un enlace no crea una solicitud. Telegram pide consentimiento antes de guardar respuestas. Evita enviar documentos médicos o resultados de pruebas por mensajería.",
  },
} as const;

export function TelegramDiagnosticEntry({locale}:{locale:PublicLocale}){
  const [telegramUrl,setTelegramUrl]=useState<string|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    setTelegramUrl(null);
    fetch("/api/public/telegram-diagnostic",{
      cache:"no-store",credentials:"same-origin",signal:controller.signal,
    }).then(response=>response.ok?response.json():null).then(data=>{
      if(controller.signal.aborted)return;
      // Locale comes from the route, not from Telegram's UI/device language.
      const link=data?.available===true?data.urls?.[locale]:null;
      const expected=new RegExp("^https://t\\.me/[A-Za-z0-9_]{5,32}\\?start=hhreview_"+locale+"$");
      setTelegramUrl(typeof link==="string"&&expected.test(link)?link:null);
    }).catch(()=>{if(!controller.signal.aborted)setTelegramUrl(null)});
    return ()=>controller.abort();
  },[locale]);
  const t=copy[locale];
  const whatsappUrl=whatsappExpressReviewHandoff(locale);
  return <aside className={styles.entry} data-express-review-messenger-choice={locale}
    lang={locale} aria-label={t.title}>
    <div className={styles.content}>
      <h3>{t.title}</h3>
      <p>{t.intro}</p>
      <small>{t.note}</small>
    </div>
    <div className={styles.channels}>
      {telegramUrl?
        <a href={telegramUrl} target="_blank" rel="noopener noreferrer nofollow"
          referrerPolicy="no-referrer" data-express-review-channel="telegram"
          data-channel-locale={locale} className={styles.action}>{t.telegram}</a>
        :<p className={styles.unavailable} role="status">{t.telegramUnavailable}</p>}
      {whatsappUrl&&<a href={whatsappUrl} target="_blank" rel="noopener noreferrer nofollow"
        referrerPolicy="no-referrer" data-express-review-channel="whatsapp-manual"
        data-channel-locale={locale} className={styles.manualAction}>{t.whatsapp}</a>}
      <small className={styles.manualNote}>{t.manual}</small>
    </div>
  </aside>;
}
