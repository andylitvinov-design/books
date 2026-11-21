"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Compass, Home, MessageCircle, Settings2 } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-mobile.module.css";

const copy = {
  en: { home: "Home", practice: "Practice", messages: "Messages", progress: "Progress", settings: "Settings", language: "Language", close: "Close", modeLabel:"Video creation", personal:"Personal · on device", openmotion:"OpenMotion · templates", express:"Express · no verified MP4 yet", ffmpeg:"FFmpeg Fast Assembly prepares offline masters only.", busy:"Finish or cancel the current export before switching." },
  ru: { home: "Главная", practice: "Практика", messages: "Сообщения", progress: "Прогресс", settings: "Настройки", language: "Язык", close: "Закрыть", modeLabel:"Создание видео", personal:"Personal · на устройстве", openmotion:"OpenMotion · шаблоны", express:"Express · MP4 ещё нет", ffmpeg:"FFmpeg Fast Assembly готовит мастер-файлы офлайн.", busy:"Сначала завершите или отмените экспорт." },
  es: { home: "Inicio", practice: "Práctica", messages: "Mensajes", progress: "Progreso", settings: "Ajustes", language: "Idioma", close: "Cerrar", modeLabel:"Crear vídeo", personal:"Personal · en el dispositivo", openmotion:"OpenMotion · plantillas", express:"Express · MP4 no disponible", ffmpeg:"FFmpeg Fast Assembly prepara maestros sin conexión.", busy:"Termina o cancela la exportación antes de cambiar." },
} as const;

/** The free video editor is a part of the approved Support experience, not
 * a return to the legacy seven-link site navigation. */
export function HolisticSupportMandalaDock({ locale, photoMode = false }: { locale: PublicLocale; photoMode?: boolean }) {
  const t = copy[locale];
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportMode,setExportMode] = useState<"personal"|"openmotion"|"express">("personal");
  const [modeBusy,setModeBusy] = useState(false);
  useEffect(()=>{
    if(photoMode)return;
    const q=new URLSearchParams(window.location.search);
    const mode=q.get("videoMode")||(q.has("motionPreset")?"openmotion":"personal");
    if(mode==="personal"||mode==="openmotion"||mode==="express")setExportMode(mode);
    const active=(event:Event)=>{
      const current=(event as CustomEvent<{mode?:string}>).detail?.mode;
      if(current==="personal"||current==="openmotion"||current==="express"){
        setExportMode(current);setModeBusy(false);
      }
    };
    window.addEventListener("hh:video-export-mode-active",active);
    return()=>window.removeEventListener("hh:video-export-mode-active",active);
  },[photoMode]);
  const chooseExportMode=(mode:"personal"|"openmotion"|"express")=>{
    const detail:{mode:typeof mode;accepted:boolean}={mode,accepted:false};
    window.dispatchEvent(new CustomEvent("hh:video-export-mode-change",{detail}));
    if(!detail.accepted){setModeBusy(true);return;}
    setModeBusy(false);setExportMode(mode);setSettingsOpen(false);
  };
  return (
    <>
      <header className={styles.mandalaAppHeader} data-support-app-header data-mandala-legacy-header>
        <Link href={"/" + locale + "/holistic-support/mobile"} prefetch={false}
          aria-label={locale === "ru" ? "Назад к поддержке" : locale === "es" ? "Volver al apoyo" : "Back to Support"}>
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <span>Holistic House</span>
        <button type="button" aria-label={t.settings} aria-expanded={settingsOpen} aria-controls="mandala-support-settings"
          onClick={() => setSettingsOpen(open => !open)}><Settings2 size={20} aria-hidden="true" /></button>
      </header>
      {settingsOpen ? (
        <section className={styles.settingsPanel} id="mandala-support-settings" aria-label={t.settings} data-mandala-settings-panel>
          <h2><Settings2 size={21} aria-hidden="true" />{t.settings}</h2>
          <p>{t.language}</p>
          <div className={styles.localeLinks}>
            {(["en", "ru", "es"] as const).map(language => (
              <Link key={language} href={"/" + language + "/holistic-support/mandala" + (photoMode ? "?mode=photo" : exportMode==="personal" ? "" : "?videoMode="+exportMode)}
                hrefLang={language} aria-current={locale === language ? "page" : undefined}>
                {language.toUpperCase()}
              </Link>
            ))}
          </div>
          {!photoMode?<section className={styles.videoExportSettings}
            data-video-export-menu-settings aria-label={t.modeLabel}>
            <p>{t.modeLabel}</p>
            <div role="group" aria-label={t.modeLabel}>
              {(["personal","openmotion","express"] as const).map(mode=>
                <button key={mode} type="button" aria-pressed={exportMode===mode}
                  data-video-export-menu-mode={mode} onClick={()=>chooseExportMode(mode)}>
                  {t[mode]}
                </button>)}
            </div>
            <small data-video-ffmpeg-offline>{t.ffmpeg}</small>
            {modeBusy?<p role="status" data-video-export-busy>{t.busy}</p>:null}
          </section>:null}
          <button type="button" onClick={() => setSettingsOpen(false)}>{t.close}</button>
        </section>
      ) : null}
      <nav className={styles.bottomNav} aria-label={t.home} data-mandala-support-bottom-nav>
        <Link href={"/" + locale + "/holistic-support/mobile"} prefetch={false}>
          <Home size={24} aria-hidden="true" /><span>{t.home}</span>
        </Link>
        <Link href={"/" + locale + "/practice"} prefetch={false}>
          <Compass size={24} aria-hidden="true" /><span>{t.practice}</span>
        </Link>
        <Link href={"/" + locale + "/app/messages?tab=chats"} prefetch={false}>
          <MessageCircle size={24} aria-hidden="true" /><span>{t.messages}</span>
        </Link>
        <Link href={"/" + locale + "/holistic-support/mobile#support-progress"} prefetch={false}>
          <BarChart3 size={24} aria-hidden="true" /><span>{t.progress}</span>
        </Link>
        <button type="button" aria-expanded={settingsOpen} aria-controls="mandala-support-settings"
          onClick={() => setSettingsOpen(open => !open)}>
          <Settings2 size={24} aria-hidden="true" /><span>{t.settings}</span>
        </button>
      </nav>
    </>
  );
}
