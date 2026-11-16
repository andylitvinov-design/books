"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUp, BriefcaseBusiness, ChevronDown, HeartHandshake, Mic, Route, Sparkles, WandSparkles, X } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import { stageHomeAliHandoff } from "@/lib/home-ali-handoff.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-dialogue-entry.module.css";

type Mode = "self" | "business";
type SpeechEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionEngine = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionEngine;
  webkitSpeechRecognition?: new () => SpeechRecognitionEngine;
};
const LOCALES = ["ru", "en", "es"] as const;
const COPY = {
  ru: {
    title:"Что вы хотите сделать сегодня?",
    subtitle:"Спросите, исследуйте, обучайтесь или создавайте что-то своё.",
    personal:"Для себя",business:"Для бизнеса",
    placeholder:"Расскажите, что у вас на уме…",
    send:"Начать разговор с Ali", mic:"Продиктовать запрос", stopMic:"Остановить диктовку",
    unsupported:"Используйте микрофон клавиатуры или напишите запрос.",
    speechError:"Не удалось распознать речь. Можно написать запрос.",
    speechRunning:"Слушаю. Скажите, что вы хотите сделать.",
    speechPrivacy:"Диктовка может использовать службу распознавания вашего браузера.",
    transferError:"Не удалось передать текст в Ali. Откройте чат через нижнее меню.",
    transferPrivacy:"Ваш запрос переносится только в чат Ali в этой вкладке. Без регистрации можно начать с подсказки.",
    personalHints:[
      {id:"understand",label:"Разобраться в себе",prompt:"Хочу разобраться в своей ситуации"},
      {id:"create",label:"Создать что-то",prompt:"Хочу создать что-то своё"},
      {id:"support",label:"Найти поддержку",prompt:"Помоги подобрать поддержку для меня"},
    ],
    businessHints:[
      {id:"offer",label:"Предложить услугу",prompt:"Хочу опубликовать свою услугу"},
      {id:"course",label:"Создать курс",prompt:"Хочу создать собственный обучающий курс"},
      {id:"growth",label:"Развить бизнес",prompt:"Мне нужна помощь с развитием моего бизнеса"},
    ],
    path:"Продолжить мой путь",pathDetail:"Мои практики, курсы и прогресс",
    more:"Смотреть направления ниже",
  },
  en: {
    title:"What would you like to do today?",
    subtitle:"Ask, explore, learn, or create something of your own.",
    personal:"For myself",business:"For business",
    placeholder:"Tell me what's on your mind…",
    send:"Start a conversation with Ali", mic:"Dictate your request", stopMic:"Stop dictation",
    unsupported:"Use your keyboard microphone or type a message.",
    speechError:"Speech recognition did not work. You can type your request.",
    speechRunning:"Listening. Tell me what you would like to do.",
    speechPrivacy:"Dictation may use your browser's speech service.",
    transferError:"Couldn't pass your message to Ali. Open AI/Chat from the bottom bar.",
    transferPrivacy:"Your request passes only to Ali's chat in this tab. You can begin without signing in.",
    personalHints:[
      {id:"understand",label:"Understand myself",prompt:"I want to understand my situation"},
      {id:"create",label:"Create something",prompt:"I want to create something of my own"},
      {id:"support",label:"Find support",prompt:"Help me find the right support"},
    ],
    businessHints:[
      {id:"offer",label:"Offer a service",prompt:"I want to publish my own service"},
      {id:"course",label:"Create a course",prompt:"I want to create a training course"},
      {id:"growth",label:"Grow a business",prompt:"I need help growing my business"},
    ],
    path:"Continue my path",pathDetail:"My practices, learning and progress",
    more:"Explore the options below",
  },
  es: {
    title:"¿Qué te gustaría hacer hoy?",
    subtitle:"Pregunta, explora, aprende o crea algo propio.",
    personal:"Para mí",business:"Para mi negocio",
    placeholder:"Cuéntame qué tienes en mente…",
    send:"Iniciar conversación con Ali",mic:"Dictar tu mensaje",stopMic:"Detener dictado",
    unsupported:"Usa el micrófono del teclado o escribe tu mensaje.",
    speechError:"No se pudo reconocer tu voz. Puedes escribir el mensaje.",
    speechRunning:"Te escucho. Cuéntame qué quieres hacer.",
    speechPrivacy:"El dictado puede usar el servicio de voz de tu navegador.",
    transferError:"No pudimos pasar el texto a Ali. Abre IA/Chat desde el menú inferior.",
    transferPrivacy:"Tu mensaje pasa solo al chat de Ali en esta pestaña. Puedes empezar sin registrarte.",
    personalHints:[
      {id:"understand",label:"Conocerme",prompt:"Quiero comprender mi situación"},
      {id:"create",label:"Crear algo",prompt:"Quiero crear algo propio"},
      {id:"support",label:"Buscar apoyo",prompt:"Ayúdame a encontrar apoyo"},
    ],
    businessHints:[
      {id:"offer",label:"Ofrecer servicio",prompt:"Quiero publicar mi servicio"},
      {id:"course",label:"Crear curso",prompt:"Quiero crear un curso"},
      {id:"growth",label:"Crecer negocio",prompt:"Necesito ayuda para hacer crecer mi negocio"},
    ],
    path:"Continuar mi camino",pathDetail:"Mis prácticas, cursos y progreso",
    more:"Explorar opciones más abajo",
  },
} as const;

export function HomeDialogueEntry({locale}: {locale:PublicLocale}) {
  const router=useRouter();
  const t=COPY[locale];
  const [mode,setMode]=useState<Mode>("self");
  const [draft,setDraft]=useState("");
  const [error,setError]=useState("");
  const [voiceMessage,setVoiceMessage]=useState("");
  const [listening,setListening]=useState(false);
  const inputRef=useRef<HTMLTextAreaElement|null>(null);
  const speechRef=useRef<SpeechRecognitionEngine|null>(null);
  useEffect(()=>()=>{speechRef.current?.abort();speechRef.current=null},[]);
  const chatPath="/"+locale+"/app/messages?section=ai";
  const hints=mode==="business"?t.businessHints:t.personalHints;

  function startConversation(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt=draft.trim();
    if(!prompt)return;
    // An explicit Send click is needed; preserve a single bounded, ephemeral
    // message for the established Ali chat. No prompt ever enters the URL.
    let passed=false;
    try{passed=stageHomeAliHandoff(window.sessionStorage,{text:prompt,locale,mode})}
    catch{/* Some private browsers prohibit sessionStorage; don't silently lose text. */}
    if(!passed){setError(t.transferError);return}
    setError("");
    router.push(chatPath);
  }
  function dictate() {
    if(speechRef.current){speechRef.current.stop();return}
    const scope=window as SpeechWindow;
    const Constructor=scope.SpeechRecognition||scope.webkitSpeechRecognition;
    if(!Constructor){setVoiceMessage(t.unsupported);inputRef.current?.focus();return}
    const speech=new Constructor();
    speech.lang=locale==="ru"?"ru-RU":locale==="es"?"es-ES":"en-US";
    speech.interimResults=false;
    speech.continuous=false;
    speech.onresult=event=>{
      const spoken=event.results?.[0]?.[0]?.transcript?.trim();
      if(spoken)setDraft(previous=>(previous?previous+" ":"")+spoken.slice(0,2000-previous.length));
    };
    speech.onerror=()=>{setVoiceMessage(t.speechError);setListening(false);speechRef.current=null};
    speech.onend=()=>{setListening(false);speechRef.current=null};
    speechRef.current=speech;
    setVoiceMessage(t.speechRunning);
    setListening(true);
    try{speech.start()}catch{setVoiceMessage(t.speechError);setListening(false);speechRef.current=null}
  }
  return <section className={styles.root} data-home-dialogue-entry data-home-mode={mode} lang={locale}>
    <header className={styles.header} data-home-dialogue-header>
      <h1>My Space</h1>
      <div className={styles.headerActions}>
        <details className={styles.language} data-home-language-switch>
          <summary aria-label={locale==="ru"?"Выбрать язык":locale==="es"?"Elegir idioma":"Choose language"}>
            {locale.toUpperCase()} <ChevronDown size={14} aria-hidden="true"/>
          </summary>
          <div className={styles.languageMenu}>
            {LOCALES.map(next=><Link key={next} href={next==="en"?"/":"/"+next}
              lang={next} hrefLang={next} prefetch={false}
              aria-current={locale===next?"page":undefined}>{next.toUpperCase()}</Link>)}
          </div>
        </details>
        <div className={styles.siteTools} data-home-site-tools>
          <SiteNavigation locale={locale} compact />
        </div>
      </div>
    </header>
    <div className={styles.modes} role="group" aria-label={locale==="ru"?"Режим главной":locale==="es"?"Modo principal":"Home mode"}>
      <button type="button" data-home-mode-button="self" aria-pressed={mode==="self"}
        className={mode==="self"?styles.modeActive:styles.mode}
        onClick={()=>{setMode("self");setError("")}}>
        <HeartHandshake size={19} aria-hidden="true"/>{t.personal}
      </button>
      <button type="button" data-home-mode-button="business" aria-pressed={mode==="business"}
        className={mode==="business"?styles.modeActive:styles.mode}
        onClick={()=>{setMode("business");setError("")}}>
        <BriefcaseBusiness size={19} aria-hidden="true"/>{t.business}
      </button>
    </div>
    <div className={styles.hero} data-home-dialogue-hero>
      <div className={styles.scene} aria-hidden="true"/>
      <div className={styles.heroContent}>
        <div className={styles.kicker}><Sparkles size={18} aria-hidden="true"/> HOLISTIC HOUSE</div>
        <h2>{t.title}</h2>
        <p className={styles.subtitle}>{t.subtitle}</p>
        <form className={styles.composer} onSubmit={startConversation} data-home-intent-form>
          <label className={styles.visuallyHidden} htmlFor={"home-intent-"+locale}>{t.placeholder}</label>
          <textarea id={"home-intent-"+locale} ref={inputRef} value={draft}
            onChange={event=>{setDraft(event.target.value);setError("")}}
            maxLength={2000} rows={2} placeholder={t.placeholder}
            data-home-intent-composer autoComplete="off"/>
          <div className={styles.composerButtons}>
            {draft&&<button type="button" className={styles.clear} aria-label={locale==="ru"?"Очистить":locale==="es"?"Borrar":"Clear"}
              onClick={()=>{setDraft("");inputRef.current?.focus()}}><X size={18}/></button>}
            <button type="button" className={styles.microphone} aria-label={listening?t.stopMic:t.mic}
              aria-pressed={listening} onClick={dictate}><Mic size={21} aria-hidden="true"/></button>
            <button type="submit" className={styles.send} disabled={!draft.trim()} data-home-send-to-ali
              aria-label={t.send} title={t.send}><ArrowUp size={22} aria-hidden="true"/></button>
          </div>
        </form>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        {voiceMessage&&<p className={styles.voiceStatus} role="status">{voiceMessage}</p>}
        <div className={styles.starters} aria-label={t.title}>
          {hints.map((hint,index)=><button type="button" key={hint.id} data-home-intent-option={hint.id}
            onClick={()=>{setDraft(hint.prompt);setError("");inputRef.current?.focus({preventScroll:true})}}>
            {index===0?<HeartHandshake size={20} aria-hidden="true"/>:
              index===1?<WandSparkles size={20} aria-hidden="true"/>:
              <Sparkles size={20} aria-hidden="true"/>}
            <span>{hint.label}</span>
          </button>)}
        </div>
        <small className={styles.privacy}>{t.transferPrivacy} {t.speechPrivacy}</small>
      </div>
    </div>
    <Link className={styles.continue} href={"/"+(locale==="es"?"en":locale)+"/app/portrait?space=path"}
      prefetch={false} data-home-continue-path>
      <span className={styles.continueIcon}><Route size={22} aria-hidden="true"/></span>
      <span><strong>{t.path}</strong><small>{t.pathDetail}</small></span>
      <ArrowRight size={20} aria-hidden="true"/>
    </Link>
    <a href="#home-discover" className={styles.explore}>{t.more} <ChevronDown size={16} aria-hidden="true"/></a>
  </section>;
}
