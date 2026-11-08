"use client";

import {useState} from "react";
import Link from "next/link";
import {BookOpen, CalendarDays, ClipboardCheck, Clapperboard, Flower2,
  MessageCircle, Play, X} from "lucide-react";
import {approvedTelegramPresentation} from "@/lib/crm/telegram-presentation.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./messenger-ai-landing.module.css";

const COPY={
  en:{
    hi:"Hi!",title:"I'm your AI Holistic Guide",
    lead:"Ask, explore, learn and create with me.",
    question:"What would you like to do today?",
    watch:"Watch the Holistic House introduction (Russian audio)",
    videoLanguage:"Russian audio",openOnYouTube:"Open on YouTube",
    close:"Close introduction video",
    choices:"Choose how to begin",
    test:"Take a test",video:"Create a video",practice:"Do a practice",
    session:"Request a session",course:"Learn a course",ask:"Ask a question",
  },
  ru:{
    hi:"Привет!",title:"Я ваш ИИ-помощник Holistic House",
    lead:"Спрашивайте, исследуйте, учитесь и создавайте.",
    question:"Чем вы хотите заняться сегодня?",
    watch:"Посмотреть видео о Holistic House",
    videoLanguage:"Русская озвучка",openOnYouTube:"Открыть на YouTube",
    close:"Закрыть видеопрезентацию",
    choices:"Выберите, с чего начать",
    test:"Пройти тест",video:"Создать видео",practice:"Выбрать практику",
    session:"Запросить сессию",course:"Изучить курс",ask:"Задать вопрос",
  },
  es:{
    hi:"¡Hola!",title:"Soy tu guía de IA Holistic House",
    lead:"Pregunta, explora, aprende y crea conmigo.",
    question:"¿Qué te gustaría hacer hoy?",
    watch:"Ver la introducción de Holistic House (audio en ruso)",
    videoLanguage:"Audio en ruso",openOnYouTube:"Abrir en YouTube",
    close:"Cerrar vídeo de presentación",
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

export function MessengerAiLanding({locale,onCreateVideo,onPractice,onAsk}:{
  locale:PublicLocale;onCreateVideo:()=>void;onPractice:()=>void;onAsk:()=>void
}){
  const t=COPY[locale];
  const [playing,setPlaying]=useState(false);
  // RU alone has a real, approved published master. No EN/ES film is claimed.
  const introduction=approvedTelegramPresentation("ru");
  return <section className={css.root} data-hh-ai-landing aria-label={t.title}>
    <div className={css.hero} data-hh-ai-video-hero>
      {playing&&introduction?
        <div className={css.player}>
          <iframe title={t.watch} loading="eager"
            src={`https://www.youtube-nocookie.com/embed/${introduction.youtubeId}?autoplay=1&playsinline=1&rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
          <a href={introduction.url} className={css.externalYouTube} target="_blank"
            rel="noopener noreferrer">{t.openOnYouTube}</a>
          <button type="button" className={css.dismiss} onClick={()=>setPlaying(false)}
            aria-label={t.close}><X size={19} aria-hidden="true"/></button>
        </div>:
        <>
          <div className={css.heroCopy}>
            <em>{t.hi}</em>
            <h2>{t.title}</h2>
            <p>{t.lead}</p>
          </div>
          {introduction&&<button type="button" className={css.play}
            data-hh-ai-intro-play onClick={()=>setPlaying(true)}
            aria-label={t.watch} title={t.watch}>
            <Play size={27} fill="currentColor" aria-hidden="true"/>
          </button>}
          {introduction&&<span className={css.languageNote}>
            {Math.round(introduction.durationSeconds)}s · {t.videoLanguage}
          </span>}
        </>}
    </div>
    <div className={css.question} data-hh-ai-landing-question>
      <img src="/images/holistic-house/reiki-approved-sunrise-v3.webp"
        width={42} height={42} alt="" loading="lazy"/>
      <strong>{t.question}</strong>
    </div>
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
