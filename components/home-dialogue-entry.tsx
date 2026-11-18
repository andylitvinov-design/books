"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUp, BriefcaseBusiness, ChevronDown, HeartHandshake, Mic, Route, Sparkles, Leaf, Heart, TrendingUp, Target, UsersRound, BatteryCharging, X, CheckCircle2 } from "lucide-react";
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
    title:"Что вам нужно сегодня?",
    subtitle:"Выберите направление или расскажите Али о своей ситуации.",
    businessSubtitle:"Обсудите задачу с Али — вместе определим следующий шаг.",
    personal:"Для себя", business:"Для бизнеса",
    placeholder:"Расскажите Али, что вам нужно…",
    send:"Отправить сообщение Али", mic:"Продиктовать запрос", stopMic:"Остановить диктовку",
    unsupported:"Используйте микрофон клавиатуры или напишите запрос.",
    speechError:"Не удалось распознать речь. Можно написать запрос.",
    speechRunning:"Слушаю. Скажите, что вас беспокоит.",
    speechPrivacy:"Диктовка может использовать службу распознавания браузера.",
    transferError:"Не удалось передать запрос. Попробуйте ещё раз или откройте AI/Chat.",
    transferPrivacy:"Сообщение передаётся в чат Али. Начать можно без регистрации.",
    freeReviewTitle:"Разобраться в своей ситуации", freeReviewDetail:"Бесплатный личный разбор", businessReviewTitle:"Разобраться в задаче бизнеса", businessReviewDetail:"Бесплатный письменный бизнес-разбор",
    focusTitle:"Что важно для вас сегодня?",
    focusHints:[
      {id:"stress",label:"Стресс и энергия",detail:"Тревога, усталость, восстановление",topic:"stress_energy",need:"stress_tension"},
      {id:"love",label:"Любовь и отношения",detail:"Близость, семья, конфликты",topic:"relationships_esteem",need:"relationship_couple"},
      {id:"confidence",label:"Уверенность и развитие",detail:"Самооценка, новые возможности",topic:"relationships_esteem",need:"esteem_confidence"},
      {id:"money",label:"Деньги и жизненный путь",detail:"Доход, работа, направление",topic:"money_growth",need:"growth_income"},
    ],
    businessHints:[
      {id:"business_clients",label:"Клиенты и доход",detail:"Клиентов мало или доход не растёт",topic:"business_support",need:"business_clients"},
      {id:"business_strategy",label:"Стратегия и решения",detail:"Непонятно, куда двигаться дальше",topic:"business_support",need:"business_strategy"},
      {id:"business_team",label:"Команда и партнёры",detail:"Сложности с командой или партнёрами",topic:"business_support",need:"business_team"},
      {id:"business_burnout",label:"Стресс и выгорание",detail:"Всё держится на мне, сил не хватает",topic:"business_support",need:"business_burnout"},
    ],
    path:"Продолжить мой путь", pathDetail:"Мои практики, обучение и прогресс", benefits:["Личный взгляд","Практические шаги","Следующие возможности"], more:"Ещё возможности",
  },
  en: {
    title:"What do you need today?",
    subtitle:"Choose a direction or describe what you need.",
    businessSubtitle:"Tell Ali what you're working on and explore your options.",
    personal:"For myself", business:"For business",
    placeholder:"Tell Ali what you need…",
    send:"Send a message to Ali", mic:"Dictate your request", stopMic:"Stop dictation",
    unsupported:"Use your keyboard microphone or type a message.",
    speechError:"Speech recognition did not work. You can type your request.",
    speechRunning:"Listening. Tell me what is on your mind.",
    speechPrivacy:"Dictation may use your browser's speech service.",
    transferError:"Couldn't pass your message to Ali. Try again or open AI/Chat.",
    transferPrivacy:"Your message goes to Ali’s chat. You can start without signing in.",
    freeReviewTitle:"Understand my situation", freeReviewDetail:"Get a free personal review", businessReviewTitle:"Understand my business", businessReviewDetail:"Free written business review",
    focusTitle:"What do you need today?",
    focusHints:[
      {id:"stress",label:"Stress & Energy",detail:"Stress, fatigue, recovery",topic:"stress_energy",need:"stress_tension"},
      {id:"love",label:"Love & Relationships",detail:"Close relationships and conflict",topic:"relationships_esteem",need:"relationship_couple"},
      {id:"confidence",label:"Confidence & Growth",detail:"Self-esteem and personal development",topic:"relationships_esteem",need:"esteem_confidence"},
      {id:"money",label:"Money & Direction",detail:"Income, work and life direction",topic:"money_growth",need:"growth_income"},
    ],
    businessHints:[
      {id:"business_clients",label:"Clients & Revenue",detail:"Not enough clients or stagnant income",topic:"business_support",need:"business_clients"},
      {id:"business_strategy",label:"Strategy & Decisions",detail:"Unsure where to take the business",topic:"business_support",need:"business_strategy"},
      {id:"business_team",label:"Team & Partners",detail:"Conflicts, leadership or delegation",topic:"business_support",need:"business_team"},
      {id:"business_burnout",label:"Stress & Burnout",detail:"Too much responsibility, not enough energy",topic:"business_support",need:"business_burnout"},
    ],
    path:"Continue my path", pathDetail:"My practices, learning and progress", benefits:["Personal insights","Practical steps","Next best options"], more:"More ways to explore",
  },
  es: {
    title:"¿Qué necesitas hoy?",
    subtitle:"Elige un tema o cuéntale a Ali qué necesitas.",
    businessSubtitle:"Cuéntale a Ali tu reto y explora las opciones.",
    personal:"Para mí", business:"Para mi negocio",
    placeholder:"Cuéntale a Ali qué necesitas…",
    send:"Enviar un mensaje a Ali", mic:"Dictar tu mensaje",stopMic:"Detener dictado",
    unsupported:"Usa el micrófono del teclado o escribe un mensaje.",
    speechError:"No se pudo reconocer tu voz. Puedes escribir tu mensaje.",
    speechRunning:"Te escucho. Cuéntame qué necesitas.",
    speechPrivacy:"El dictado puede usar el servicio de voz del navegador.",
    transferError:"No pudimos pasar el mensaje a Ali. Inténtalo de nuevo o abre IA/Chat.",
    transferPrivacy:"Tu mensaje llega al chat de Ali. Puedes empezar sin registrarte.",
    freeReviewTitle:"Comprender mi situación", freeReviewDetail:"Recibir una revisión personal gratuita", businessReviewTitle:"Comprender mi negocio", businessReviewDetail:"Revisión empresarial gratuita por escrito",
    focusTitle:"¿Qué necesitas hoy?",
    focusHints:[
      {id:"stress",label:"Estrés y energía",detail:"Tensión, cansancio y recuperación",topic:"stress_energy",need:"stress_tension"},
      {id:"love",label:"Amor y relaciones",detail:"Pareja, familia y conflictos",topic:"relationships_esteem",need:"relationship_couple"},
      {id:"confidence",label:"Confianza y desarrollo",detail:"Autoestima y nuevas posibilidades",topic:"relationships_esteem",need:"esteem_confidence"},
      {id:"money",label:"Dinero y rumbo",detail:"Ingresos, trabajo y propósito",topic:"money_growth",need:"growth_income"},
    ],
    businessHints:[
      {id:"business_clients",label:"Clientes e ingresos",detail:"Faltan clientes o los ingresos no crecen",topic:"business_support",need:"business_clients"},
      {id:"business_strategy",label:"Estrategia y decisiones",detail:"No sé hacia dónde avanzar",topic:"business_support",need:"business_strategy"},
      {id:"business_team",label:"Equipo y socios",detail:"Conflictos, liderazgo o delegación",topic:"business_support",need:"business_team"},
      {id:"business_burnout",label:"Estrés y agotamiento",detail:"Demasiada carga y poca energía",topic:"business_support",need:"business_burnout"},
    ],
    path:"Continuar mi camino", pathDetail:"Mis prácticas, aprendizaje y progreso", benefits:["Ideas personales","Pasos prácticos","Próximas opciones"], more:"Más posibilidades",
  },
} as const;
const FOCUS_ICONS = [Leaf, Heart, Sparkles, TrendingUp] as const;
const BUSINESS_ICONS = [TrendingUp, Target, UsersRound, BatteryCharging] as const;

export function HomeDialogueEntry({locale}: {locale:PublicLocale}) {
  const router=useRouter();
  const t=COPY[locale];
  const [mode,setMode]=useState<Mode>("self");
  const [draft,setDraft]=useState("");
  const [error,setError]=useState("");
  const [voiceMessage,setVoiceMessage]=useState("");
  const [listening,setListening]=useState(false);
  const [interactive,setInteractive]=useState(false);
  const inputRef=useRef<HTMLTextAreaElement|null>(null);
  const speechRef=useRef<SpeechRecognitionEngine|null>(null);
  useEffect(()=>{
    setInteractive(true);
    return ()=>{speechRef.current?.abort();speechRef.current=null};
  },[]);
  const chatPath="/"+locale+"/app/messages?section=ai";
  const hints=mode==="business"?t.businessHints:t.focusHints;
  const hintIcons=mode==="business"?BUSINESS_ICONS:FOCUS_ICONS;

  function startTopicJourney(topic:string,need:string) {
    // Send only a public option ID to Support, not personal text or test data.
    router.push("/"+locale+"/services?topic="+encodeURIComponent(topic)+"&need="+encodeURIComponent(need));
  }

  function startConversationWith(value:string, selectedMode:Mode=mode) {
    const prompt=value.trim();
    if(!prompt)return;
    // The explicit Send tap OR a starter choice carries the exact user's words.
    let passed=false;
    try{passed=stageHomeAliHandoff(window.sessionStorage,{text:prompt,locale,mode:selectedMode})}
    catch{/* Some private browsers prohibit sessionStorage; don't silently lose text. */}
    if(!passed){setDraft(prompt);setError(t.transferError);return}
    setError("");
    router.push(chatPath);
  }
  function startConversation(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();startConversationWith(draft);
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
  return <section className={styles.root} data-home-dialogue-entry data-home-mode={mode}
    data-home-interactive={interactive?"true":"false"} lang={locale}>
    <header className={styles.header} data-home-dialogue-header>
      <div className={styles.brand}><span className={styles.brandIcon} aria-hidden="true"><Leaf size={25}/></span><h1>Holistic House</h1></div>
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
        <p className={styles.subtitle}>{mode==="business"?t.businessSubtitle:t.subtitle}</p>
        <Link href={mode==="business"?"/"+locale+"/explore/business":"/"+locale+"/services/free-situation-review"} prefetch={false}
          className={styles.reviewCta} data-home-free-review>
          <span className={styles.reviewCtaIcon}><Sparkles size={27} aria-hidden="true"/></span>
          <span className={styles.reviewCtaText}>
            <strong>{mode==="business"?t.businessReviewTitle:t.freeReviewTitle}</strong>
            <small>{mode==="business"?t.businessReviewDetail:t.freeReviewDetail}</small>
          </span>
          <ArrowRight size={23} className={styles.reviewCtaArrow} aria-hidden="true"/>
        </Link>
        <div className={styles.focusGrid} role="group" aria-label={t.focusTitle} data-home-focus-grid>
          {hints.map((hint,index)=>{
            const Icon=hintIcons[index];
            return <button type="button" key={hint.id} className={styles.focusCard}
              data-home-intent-option={hint.id}
              aria-label={hint.label+" · "+hint.detail}
              onClick={()=>startTopicJourney(hint.topic,hint.need)}>
              <Icon className={styles.focusIcon} size={29} aria-hidden="true"/>
              <span className={styles.focusCopy}><strong>{hint.label}</strong></span>
              <ArrowRight className={styles.focusArrow} size={19} aria-hidden="true"/>
            </button>
          })}
        </div>
        <form className={styles.composer} onSubmit={startConversation} data-home-intent-form>
          <label className={styles.visuallyHidden} htmlFor={"home-intent-"+locale}>{t.placeholder}</label>
          <textarea id={"home-intent-"+locale} ref={inputRef} value={draft}
            onChange={event=>{setDraft(event.target.value);setError("")}}
            maxLength={2000} rows={3} placeholder={t.placeholder}
            data-home-intent-composer autoComplete="off"/>
          <div className={styles.composerButtons}>
            {draft&&<button type="button" className={styles.clear} aria-label={locale==="ru"?"Очистить":locale==="es"?"Borrar":"Clear"}
              onClick={()=>{setDraft("");inputRef.current?.focus()}}><X size={18}/></button>}
            <button type="button" className={styles.microphone} aria-label={listening?t.stopMic:t.mic}
              aria-pressed={listening} onClick={dictate}><Mic size={24} aria-hidden="true"/></button>
            <button type="submit" className={styles.send} disabled={!draft.trim()} data-home-send-to-ali
              aria-label={t.send} title={t.send}><ArrowUp size={25} aria-hidden="true"/></button>
          </div>
        </form>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        {voiceMessage&&<p className={styles.voiceStatus} role="status">{voiceMessage}</p>}
        <div className={styles.benefits} aria-label={t.benefits.join(", ")}>
          <span><CheckCircle2 size={15} aria-hidden="true"/>{t.benefits[0]}</span>
          <span><Leaf size={15} aria-hidden="true"/>{t.benefits[1]}</span>
          <span><Sparkles size={15} aria-hidden="true"/>{t.benefits[2]}</span>
        </div>
        <small className={styles.privacy}>{t.transferPrivacy}</small>
      </div>
    </div>
    <Link className={styles.continue} href={"/"+(locale==="es"?"en":locale)+"/app/portrait?space=path"}
      prefetch={false} data-home-continue-path>
      <span className={styles.continueIcon}><Route size={25} aria-hidden="true"/></span>
      <span className={styles.continueCopy}><strong>{t.path}</strong><small>{t.pathDetail}</small></span>
      <ArrowRight size={23} aria-hidden="true"/>
    </Link>
    <a href="#home-discover" className={styles.explore}>{t.more} <ChevronDown size={16} aria-hidden="true"/></a>
  </section>;
}
