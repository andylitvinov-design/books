"use client";

import { useEffect, useState } from "react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./telegram-diagnostic-entry.module.css";

const copy = {
  en: {
    title:"Prefer to apply in Telegram?",
    intro:"A guided chat asks for consent, your topic, a short question and an optional photo. Andrey replies personally.",
    action:"Start Telegram request",
    note:"An enquiry is registered only after you agree inside the bot. Please don't send medical records or test results.",
  },
  ru: {
    title:"Удобнее оформить заявку через Telegram?",
    intro:"Чат-бот попросит согласие, тему, краткий вопрос и по желанию фото. Андрей ответит лично.",
    action:"Начать заявку в Telegram",
    note:"Заявка регистрируется только после согласия в боте. Не пересылайте меддокументы и результаты тестов.",
  },
  es: {
    title:"¿Prefieres solicitarlo por Telegram?",
    intro:"El chat pide consentimiento, tema, pregunta breve y una foto opcional. Andrey responderá personalmente.",
    action:"Iniciar solicitud en Telegram",
    note:"La solicitud se registra solo tras aceptar en el bot. Evita documentos médicos y resultados de pruebas.",
  },
} as const;

export function TelegramDiagnosticEntry({locale}:{locale:PublicLocale}){
  const [url,setUrl]=useState<string|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/public/telegram-diagnostic",{
      cache:"no-store",credentials:"same-origin",signal:controller.signal,
    }).then(response=>response.ok?response.json():null).then(data=>{
      if(controller.signal.aborted)return;
      const link=data?.available===true?data.urls?.[locale]:null;
      setUrl(typeof link==="string"&&/^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}\?start=hhreview_(?:en|ru|es)$/.test(link)?link:null);
    }).catch(()=>{if(!controller.signal.aborted)setUrl(null)});
    return ()=>controller.abort();
  },[locale]);
  if(!url)return null;
  const t=copy[locale];
  return <aside className={styles.entry} aria-label={t.title}>
    <div><h3>{t.title}</h3><p>{t.intro}</p>
      <small>{t.note}</small></div>
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer"
      className={styles.action}>{t.action}</a>
  </aside>;
}
