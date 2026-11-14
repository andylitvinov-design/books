"use client";

import {useRef,useState,type ReactNode} from "react";
import Link from "next/link";
import {BookOpen, CalendarDays, ClipboardCheck, Clapperboard, Flower2,
  MessageCircle, Play, X} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./messenger-ai-landing.module.css";

// Owner's original HeyGen exports, not a YouTube player and not time-limited
// files2.heygen.ai signed downloads. Both captioned MP4s were checked as
// anonymously reachable binary files on the public resource2 CDN.
const INTRO={
  en:{
    src:"https://resource2.heygen.ai/movio/video/8d998c778af3b563aa63233aa4fb4a06/89b101dc9dbb4fcea06aab3eb6ce5094/caption.mp4",
    durationSeconds:91.2457,
  },
  ru:{
    src:"https://resource2.heygen.ai/movio/video/72e3e6f45c3664b0b8d75281b1b413a5/2e30e44294964059b57670860ee3828b/caption.mp4",
    durationSeconds:96.862,
  },
} as const;

const COPY={
  en:{
    hi:"Hi!",title:"I'm your AI Holistic Guide",
    lead:"Ask, explore, learn and create with me.",
    question:"What would you like to do today?",
    watch:"Watch the Holistic House introduction (English audio)",
    videoLanguage:"English audio",
    close:"Close introduction video",
    error:"Video could not be loaded.",
    retry:"Try again",openOriginal:"Open original video",
    choices:"Choose how to begin",
    test:"Take a test",video:"Create a video",practice:"Do a practice",
    session:"Request a session",course:"Learn a course",ask:"Ask a question",
  },
  ru:{
    hi:"Привет!",title:"Я ваш ИИ-помощник Holistic House",
    lead:"Спрашивайте, исследуйте, учитесь и создавайте.",
    question:"Чем вы хотите заняться сегодня?",
    watch:"Посмотреть презентацию Holistic House (русская озвучка)",
    videoLanguage:"Русская озвучка",
    close:"Закрыть видеопрезентацию",
    error:"Не удалось загрузить видео.",
    retry:"Повторить",openOriginal:"Открыть исходное видео",
    choices:"Выберите, с чего начать",
    test:"Пройти тест",video:"Создать видео",practice:"Выбрать практику",
    session:"Запросить сессию",course:"Изучить курс",ask:"Задать вопрос",
  },
  es:{
    hi:"¡Hola!",title:"Soy tu guía de IA Holistic House",
    lead:"Pregunta, explora, aprende y crea conmigo.",
    question:"¿Qué te gustaría hacer hoy?",
    watch:"Ver la introducción de Holistic House (audio en inglés)",
    videoLanguage:"Audio en inglés",
    close:"Cerrar vídeo de presentación",
    error:"No se pudo cargar el vídeo.",
    retry:"Reintentar",openOriginal:"Abrir el vídeo original",
    choices:"Elige cómo empezar",
    test:"Hacer un test",video:"Crear un vídeo",practice:"Hacer una práctica",
    session:"Solicitar sesión",course:"Elegir un curso",ask:"Hacer una pregunta",
  },
} as const;

const ACTIONS=[
  {id:"test",icon:ClipboardCheck,href:"tests"},
  {id:"video",icon:Clapperboard},
  {id:"practice",icon:Flower2},
  {id:"session",icon:CalendarDays,href:"services"},
  {id:"course",icon:BookOpen,href:"academy"},
  {id:"ask",icon:MessageCircle},
] as const;

export function MessengerAiLanding({locale,onCreateVideo,onPractice,onAsk,composer}:{
  locale:PublicLocale;onCreateVideo:()=>void;onPractice:()=>void;onAsk:()=>void;composer?:ReactNode
}){
  const t=COPY[locale];
  // Spanish has no recorded master; use the existing English version with
  // an explicit "Audio en inglés" label, never silently present Russian audio.
  const introduction=INTRO[locale==="ru"?"ru":"en"];
  const videoRef=useRef<HTMLVideoElement>(null);
  const [playing,setPlaying]=useState(false);
  const [failed,setFailed]=useState(false);

  const start=()=>{
    setFailed(false);
    setPlaying(true);
    // The video node already exists with preload=none: calling play() inside
    // the actual tap keeps iPhone Safari's user activation for sound.
    const attempt=videoRef.current?.play();
    if(attempt)void attempt.catch(()=>{ /* Native controls permit a second tap. */ });
  };
  const close=()=>{
    videoRef.current?.pause();
    if(videoRef.current)videoRef.current.currentTime=0;
    setPlaying(false);
    setFailed(false);
  };
  const retry=()=>{
    setFailed(false);
    videoRef.current?.load();
    const attempt=videoRef.current?.play();
    if(attempt)void attempt.catch(()=>{ /* Keep native user-controlled playback. */ });
  };

  return <section className={css.root} data-hh-ai-landing aria-label={t.title}>
    <div className={css.hero} data-hh-ai-video-hero data-playing={playing?"true":"false"}>
      <div className={css.player} aria-hidden={!playing}>
        <video ref={videoRef} src={introduction.src} controls playsInline preload="none"
          poster="/images/holistic-house/reiki-approved-sunrise-v3.webp"
          aria-label={t.watch} tabIndex={playing?0:-1}
          onError={()=>setFailed(true)} onPlaying={()=>setFailed(false)}/>
        {playing&&<button type="button" className={css.dismiss} onClick={close}
          aria-label={t.close}><X size={19} aria-hidden="true"/></button>}
        {playing&&failed&&<div className={css.videoError} role="alert">
          <span>{t.error}</span>
          <button type="button" onClick={retry}>{t.retry}</button>
          <a href={introduction.src} target="_blank" rel="noopener noreferrer">{t.openOriginal}</a>
        </div>}
      </div>
      {!playing&&<>
        <div className={css.heroCopy}>
          <em>{t.hi}</em>
          <h2>{t.title}</h2>
          <p>{t.lead}</p>
        </div>
        <button type="button" className={css.play}
          data-hh-ai-intro-play onClick={start}
          aria-label={t.watch} title={t.watch}>
          <Play size={27} fill="currentColor" aria-hidden="true"/>
        </button>
        <span className={css.languageNote}>
          {Math.round(introduction.durationSeconds)}s · {t.videoLanguage}
        </span>
      </>}
    </div>
    <div className={css.question} data-hh-ai-landing-question>
      <img src="/images/holistic-house/reiki-approved-sunrise-v3.webp"
        width={42} height={42} alt="" loading="lazy"/>
      <strong>{t.question}</strong>
    </div>
    {composer&&<div className={css.inlineComposer} data-hh-ai-inline-composer>{composer}</div>}
    <div className={css.cards} role="group" aria-label={t.choices} data-hh-ai-quick-actions>
      {ACTIONS.map(item=>{
        const Icon=item.icon;
        const label=t[item.id];
        const content=<><Icon size={23} strokeWidth={1.9} aria-hidden="true"/>
          <strong>{label}</strong><span className={css.art} aria-hidden="true"/></>;
        return "href" in item?
          <Link key={item.id} data-hh-ai-choice={item.id}
            href={"/"+locale+"/"+item.href} className={css.card}>{content}</Link>:
          <button type="button" key={item.id} data-hh-ai-choice={item.id}
            className={css.card} onClick={item.id==="video"?onCreateVideo:
              item.id==="practice"?onPractice:onAsk}>{content}</button>;
      })}
    </div>
  </section>;
}
