"use client";

import {BriefcaseBusiness, Heart, Leaf, Sparkles, Zap} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./ihelp-welcome.module.css";

// Presentation only. Route-to-action decisions stay in the existing page-context
// resolver and the existing chat. No private page text or health data is read here.
const AREAS:Record<PublicLocale,Record<string,string>>={
  en:{general:"AI Holistic Guide",video:"AI Video Director",ideas:"AI Ideas Guide",
    montage:"AI Montage Guide",audio:"AI Audio Guide",effects:"AI Effects Guide",
    text:"AI Text Guide",tests:"AI Test Guide",learning:"AI Practice Guide",
    mytube:"AI Video Library Guide",services:"AI Services Guide",
    library:"AI Library Guide",account:"AI Account Guide",shop:"AI Shop Guide"},
  ru:{general:"ИИ-помощник Holistic House",video:"ИИ-видеорежиссёр",ideas:"ИИ-помощник идей",
    montage:"ИИ-помощник монтажа",audio:"ИИ-помощник звука",effects:"ИИ-помощник эффектов",
    text:"ИИ-помощник текста",tests:"ИИ-помощник тестов",learning:"ИИ-помощник практик",
    mytube:"ИИ-помощник видеотеки",services:"ИИ-помощник услуг",
    library:"ИИ-помощник библиотеки",account:"ИИ-помощник кабинета",shop:"ИИ-помощник магазина"},
  es:{general:"Guía IA Holistic House",video:"Director de vídeo IA",ideas:"Guía IA de ideas",
    montage:"Guía IA de montaje",audio:"Guía IA de audio",effects:"Guía IA de efectos",
    text:"Guía IA de texto",tests:"Guía IA de tests",learning:"Guía IA de prácticas",
    mytube:"Guía IA de vídeos",services:"Guía IA de servicios",
    library:"Guía IA de biblioteca",account:"Guía IA de cuenta",shop:"Guía IA de tienda"}
};
const HEADLINES:Record<PublicLocale,Record<string,string>>={
  en:{general:"Let's explore together",video:"Let's create your video",ideas:"Let's find your idea",
    montage:"Let's shape your video",audio:"Let's find your sound",effects:"Let's refine the scene",
    text:"Let's find your words",tests:"Let's choose a test",learning:"Let's find a practice",
    mytube:"Let's discover a video",services:"Let's find your next step",
    library:"Let's explore a topic",account:"Let's find your way",shop:"Let's explore your options"},
  ru:{general:"Давайте разберёмся",video:"Создадим ваше видео",ideas:"Найдём вашу идею",
    montage:"Соберём ваше видео",audio:"Подберём звучание",effects:"Настроим эффект",
    text:"Найдём нужные слова",tests:"Подберём тест",learning:"Найдём практику",
    mytube:"Подберём видео",services:"Найдём ваш следующий шаг",
    library:"Исследуем вашу тему",account:"Помогу с кабинетом",shop:"Сравним варианты"},
  es:{general:"Exploremos juntos",video:"Creemos tu vídeo",ideas:"Encontremos tu idea",
    montage:"Demos forma al vídeo",audio:"Elijamos tu sonido",effects:"Ajustemos la escena",
    text:"Encontremos las palabras",tests:"Elijamos un test",learning:"Busquemos una práctica",
    mytube:"Descubramos un vídeo",services:"Veamos el siguiente paso",
    library:"Exploremos un tema",account:"Te guío por tu cuenta",shop:"Exploremos opciones"}
};
const WORDS={
  en:{hello:"Hi!",subtitle:"Tell me what matters. I'll help you explore your options.",
    lead:"Ask in your own words or choose a helpful starting point below.",
    topicLabel:"Or choose a topic:",
    topics:{
      body:{label:"Body",prompt:"Help me explore resources or practices for body awareness."},
      energy:{label:"Energy",prompt:"Help me find a gentle practice focused on energy."},
      love:{label:"Love",prompt:"Help me explore a relationship-related practice or resource."},
      work:{label:"Work",prompt:"Help me find resources for a work or career question."}
    }},
  ru:{hello:"Привет!",subtitle:"Расскажите, что важно. Помогу разобраться в возможностях.",
    lead:"Напишите вопрос своими словами или выберите один из вариантов ниже.",
    topicLabel:"Или выберите тему:",
    topics:{
      body:{label:"Тело",prompt:"Помоги найти материалы или практики для осознания тела."},
      energy:{label:"Энергия",prompt:"Помоги подобрать мягкую практику для поддержания энергии."},
      love:{label:"Любовь",prompt:"Помоги найти практику или материал по теме отношений."},
      work:{label:"Работа",prompt:"Помоги найти материалы по вопросу работы и карьеры."}
    }},
  es:{hello:"¡Hola!",subtitle:"Cuéntame lo que te importa; te ayudo a explorar opciones.",
    lead:"Escribe tu pregunta o elige una opción para comenzar.",
    topicLabel:"O elige un tema:",
    topics:{
      body:{label:"Cuerpo",prompt:"Ayúdame a encontrar recursos o prácticas de conciencia corporal."},
      energy:{label:"Energía",prompt:"Ayúdame a encontrar una práctica suave para la energía."},
      love:{label:"Amor",prompt:"Ayúdame a explorar un recurso relacionado con las relaciones."},
      work:{label:"Trabajo",prompt:"Ayúdame a encontrar recursos sobre trabajo o carrera."}
    }}
} as const;

const TOPIC_KEYS=["body","energy","love","work"] as const;
const ICONS={body:Leaf,energy:Zap,love:Heart,work:BriefcaseBusiness};

export function IHelpWelcome({locale,section="general",compact=false}:{
  locale:PublicLocale;section?:string;compact?:boolean
}){
  const t=WORDS[locale];
  return <section className={css.root+(compact?" "+css.compact:"")} data-hh-ihelp-welcome
    data-hh-ihelp-visual-section={section}>
    <div className={css.identity}>
      <span className={css.avatar} aria-hidden="true"><Sparkles size={23}/></span>
      <div className={css.identityText}>
        <strong>{AREAS[locale][section]||AREAS[locale].general}</strong>
        <small>{t.subtitle}</small>
      </div>
    </div>
    <div className={css.hero} data-hh-ihelp-hero>
      <h2><em>{t.hello}</em><span>{HEADLINES[locale][section]||HEADLINES[locale].general}</span></h2>
      <p>{t.lead}</p>
    </div>
  </section>;
}

export function IHelpTopics({locale,onSelect}:{
  locale:PublicLocale;onSelect:(unsentPrompt:string)=>void
}){
  const t=WORDS[locale];
  return <section className={css.topics} data-hh-ihelp-topics aria-label={t.topicLabel}>
    <p>{t.topicLabel}</p>
    <div className={css.topicRail} role="group" aria-label={t.topicLabel}>
      {TOPIC_KEYS.map(key=>{
        const Icon=ICONS[key];
        return <button key={key} type="button" data-hh-ihelp-topic={key}
          onClick={()=>onSelect(t.topics[key].prompt)}>
          <Icon size={18} aria-hidden="true"/><strong>{t.topics[key].label}</strong>
        </button>;
      })}
    </div>
  </section>;
}
