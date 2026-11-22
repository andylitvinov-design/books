"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUp, BriefcaseBusiness, ChevronDown, HeartHandshake, Mic, Route, Sparkles, Leaf, Heart, TrendingUp, X, CheckCircle2, Play, Pause, UsersRound, Plus, Image as ImageIcon, MessageCircle, CalendarDays } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";

import {useAliPersona} from "@/components/app/use-ali-persona";
import {playAliPersonaAudio,stopAliPersonaAudio} from "@/components/app/ali-persona-audio";
import { stageHomeAliHandoff } from "@/lib/home-ali-handoff.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-dialogue-entry.module.css";

// Load the 4-persona selection dialog, its cards and styles only when asked.
const AliPersonaPicker=dynamic(()=>import("@/components/app/ali-persona-picker"),{ssr:false});

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
    subtitle:"Выберите направление или расскажите Ali о своей ситуации.",
    businessSubtitle:"Обсудите задачу с Ali — вместе определим следующий шаг.",
    personal:"Для себя", business:"Для бизнеса",
    placeholder:"Расскажите Ali, что вам нужно…",
    send:"Отправить сообщение Ali", mic:"Продиктовать запрос", stopMic:"Остановить диктовку",
    unsupported:"Используйте микрофон клавиатуры или напишите запрос.",
    speechError:"Не удалось распознать речь. Можно написать запрос.",
    speechRunning:"Слушаю. Скажите, что вас беспокоит.",
    speechPrivacy:"Диктовка может использовать службу распознавания браузера.",
    transferError:"Не удалось передать запрос. Попробуйте ещё раз или откройте AI/Chat.",
    transferPrivacy:"Сообщение передаётся в чат Ali. Начать можно без регистрации.",
    freeReviewTitle:"Разобраться в своей ситуации", freeReviewDetail:"Бесплатный личный разбор",
    focusTitle:"Что важно для вас сегодня?",
    focusHints:[
      {id:"stress",label:"Энергия и снятие стресса",detail:"Меньше тревоги, больше сил",prompt:"Мне нужна помощь со стрессом и энергией. Хочу спокойно понять, с чего начать."},
      {id:"love",label:"Любовь и уверенность",detail:"Отношения и самооценка",prompt:"Хочу разобраться в отношениях или уверенности в себе. Помоги выбрать первый шаг."},
      {id:"money",label:"Деньги и развитие",detail:"Цели, работа, личный рост",prompt:"Хочу разобраться с целями, деньгами и личным развитием. С чего мне начать?"},
      {id:"business",label:"Поддержка бизнеса",detail:"Стратегия, команда, развитие",prompt:"Мне нужна бизнес-поддержка: стратегия, команда или рост. Помоги разобраться в задаче."},
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
    freeReviewTitle:"Understand my situation", freeReviewDetail:"Get a free personal review",
    focusTitle:"What do you need today?",
    focusHints:[
      {id:"stress",label:"Energy & Stress Release",detail:"Calm stress and restore balance",prompt:"I'd like help with stress and low energy. Can we work out a gentle first step?"},
      {id:"love",label:"Love & Confidence",detail:"Relationships and self-esteem",prompt:"I'd like to understand my relationships or self-confidence better. Where should I begin?"},
      {id:"money",label:"Money & Growth",detail:"Goals, work and direction",prompt:"I'd like help with money, goals and personal growth. Can we explore my next step?"},
      {id:"business",label:"Business Support",detail:"Work, strategy and growth",prompt:"I need business support with strategy, team or growth. Help me clarify the issue."},
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
    freeReviewTitle:"Comprender mi situación", freeReviewDetail:"Recibir una revisión personal gratuita",
    focusTitle:"¿Qué necesitas hoy?",
    focusHints:[
      {id:"stress",label:"Energía y alivio del estrés",detail:"Más calma y vitalidad",prompt:"Necesito apoyo para manejar el estrés y recuperar energía. ¿Por dónde empezar?"},
      {id:"love",label:"Amor y confianza",detail:"Relaciones y autoestima",prompt:"Quiero entender mejor mis relaciones o mi confianza personal. ¿Cuál es el primer paso?"},
      {id:"money",label:"Dinero y crecimiento",detail:"Metas, trabajo y rumbo",prompt:"Quiero mejorar mis metas, trabajo y crecimiento personal. ¿Por dónde empezar?"},
      {id:"business",label:"Apoyo empresarial",detail:"Estrategia, equipo y progreso",prompt:"Necesito apoyo para mi negocio: estrategia, equipo o crecimiento. Ayúdame a aclararlo."},
    ],
    path:"Continuar mi camino", pathDetail:"Mis prácticas, aprendizaje y progreso", benefits:["Ideas personales","Pasos prácticos","Próximas opciones"], more:"Más posibilidades",
  },
} as const;
const FOCUS_ICONS = [Leaf, Heart, TrendingUp, BriefcaseBusiness] as const;

const SCREEN_COPY = {
  en: {
    brandTag:"Therapy · Coaching · Growth", guideRole:"Your Inner Alchemist",
    welcome:"Let’s understand your needs and find the next step together.",
    listen:"Listen", choosePersona:"Choose your AI guide", entry:"Describe your goal or wish…",
    start:"Start free chat", tools:"Open more tools in Ali chat", photo:"Open Ali chat to add a photo",
    direction:"Choose a direction", all:"All topics",
    stress:"Stress & Anxiety Relief", love:"Love & Relationships",
    money:"Money & Growth", energy:"Energy & Life Balance",
    energyPrompt:"I'd like more energy and a better balance in everyday life. What can I start with?",
    businessFocus:"Business Support", strategy:"Strategy & Decisions",
    strategyPrompt:"I'd like to clarify a business decision and plan the next step.",
    team:"Team & Leadership", teamPrompt:"I need help with my team or leadership at work.",
    how:"How it works — in 3 simple steps",
    steps:["Tell us your goal","Get a personal plan","Take the next step"],
    stepNotes:["Or choose a topic","Analysis, practices, ideas","Practice, course or a session"],
    ideas:"Get Ideas",ideasDetail:"Diagnostic & Hints",
    support:"Get Support",supportDetail:"Session & Service",
  },
  ru: {
    brandTag:"Терапия · Коучинг · Развитие", guideRole:"Ваш внутренний алхимик",
    welcome:"Разберёмся в вашей ситуации и вместе найдём следующий шаг.",
    listen:"Послушать",choosePersona:"Выбрать ведущего ИИ",entry:"Опишите свою цель или желание…",
    start:"Начать бесплатный чат",tools:"Открыть инструменты в чате Ali",photo:"Открыть чат Ali, чтобы добавить фото",
    direction:"Выберите направление",all:"Все темы",
    stress:"Стресс и тревога",love:"Любовь и отношения",
    money:"Деньги и развитие",energy:"Энергия и баланс",
    energyPrompt:"Хочу восстановить силы и найти баланс в повседневной жизни. С чего начать?",
    businessFocus:"Поддержка бизнеса",strategy:"Стратегия и решения",
    strategyPrompt:"Помогите прояснить бизнес-решение и наметить следующий шаг.",
    team:"Команда и лидерство",teamPrompt:"Хочу разобраться в вопросах команды или лидерства.",
    how:"Как это работает — 3 простых шага",
    steps:["Расскажите о цели","Получите личный план","Сделайте следующий шаг"],
    stepNotes:["Или выберите тему","Анализ и практики","Практика, курс или сессия"],
    ideas:"Получить идеи",ideasDetail:"Диагностика и подсказки",
    support:"Получить поддержку",supportDetail:"Сессии и услуги",
  },
  es: {
    brandTag:"Terapia · Coaching · Crecimiento",guideRole:"Tu alquimista interior",
    welcome:"Comprendamos tu situación y encontremos juntos el próximo paso.",
    listen:"Escuchar",choosePersona:"Elegir tu guía de IA",entry:"Describe tu objetivo o deseo…",
    start:"Iniciar chat gratis",tools:"Abrir herramientas en el chat de Ali",photo:"Abrir el chat de Ali para añadir una foto",
    direction:"Elige un tema",all:"Todos los temas",
    stress:"Estrés y ansiedad",love:"Amor y relaciones",
    money:"Dinero y crecimiento",energy:"Energía y equilibrio",
    energyPrompt:"Me gustaría recuperar energía y equilibrio en mi vida. ¿Por dónde empiezo?",
    businessFocus:"Apoyo empresarial",strategy:"Estrategia y decisiones",
    strategyPrompt:"Quiero aclarar una decisión de negocios y planificar mi siguiente paso.",
    team:"Equipo y liderazgo",teamPrompt:"Quiero mejorar el trabajo con mi equipo y el liderazgo.",
    how:"Cómo funciona — 3 pasos sencillos",
    steps:["Cuéntanos tu meta","Recibe un plan personal","Da el siguiente paso"],
    stepNotes:["O elige un tema","Ideas, análisis y prácticas","Práctica, curso o sesión"],
    ideas:"Obtener ideas",ideasDetail:"Diagnóstico y consejos",
    support:"Recibir apoyo",supportDetail:"Sesiones y servicios",
  },
} as const;

export function HomeDialogueEntry({locale}: {locale:PublicLocale}) {
  const router=useRouter();
  const t=COPY[locale];
  const {persona,select}=useAliPersona("max");
  // New visitors meet Max as in the approved mobile design. An explicit
  // previous selection is respected across the whole Ali conversation.
  useEffect(()=>{
    try{if(!window.localStorage.getItem("hh:ai-chat-persona-v1"))select("max")}
    catch{/* Private-mode storage may be unavailable; keep the safe default. */}
  },[select]);
  const [personaOpen,setPersonaOpen]=useState(false);
  const closePersona=useCallback(()=>setPersonaOpen(false),[]);
  const [greetingSpeaking,setGreetingSpeaking]=useState(false);
  useEffect(()=>()=>stopAliPersonaAudio(),[]);
  const startGuideGreeting=()=>{
    if(greetingSpeaking){stopAliPersonaAudio();setGreetingSpeaking(false);return}
    playAliPersonaAudio(persona.id,locale,(playing:boolean)=>setGreetingSpeaking(playing));
  };
  const greetingName=persona.name[locale];
  const guideLine=locale==="ru"?`Привет! Я ${greetingName}.`:
    locale==="es"?`¡Hola! Soy ${greetingName}.`:`Hi! I’m ${greetingName}.`;
  const guideSubtitle=locale==="ru"?"Вместе найдём подходящий следующий шаг":
    locale==="es"?"Encontraremos juntos el mejor siguiente paso":"Let’s find your best next step together";
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
  const hints=t.focusHints;

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
    event.preventDefault();
    if(!draft.trim()){router.push(chatPath);return}
    startConversationWith(draft);
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
  const screen=SCREEN_COPY[locale];
  const categories=mode==="self" ? [
    {...hints[0],label:screen.stress,image:"stress.webp"},
    {...hints[1],label:screen.love,image:"love.webp"},
    {...hints[2],label:screen.money,image:"growth.webp"},
    {id:"energy",label:screen.energy,detail:screen.energy,prompt:screen.energyPrompt,image:"energy.webp"},
  ] : [
    {...hints[3],label:screen.businessFocus,image:"growth.webp"},
    {...hints[2],label:screen.money,image:"growth.webp"},
    {id:"strategy",label:screen.strategy,detail:screen.strategy,prompt:screen.strategyPrompt,image:"energy.webp"},
    {id:"team",label:screen.team,detail:screen.team,prompt:screen.teamPrompt,image:"love.webp"},
  ];
  const picture="/images/holistic-house/my-coach-motion/"+persona.id+"-living.webp";
  const chatRoute="/"+locale+"/app/messages?section=ai";
  const ideasRoute="/"+locale+(mode==="business"?"/explore/business":"/services/free-situation-review");
  const supportRoute="/"+locale+"/services"+(mode==="business"?"#service-group-business":"");

  // A CSS background cannot be discovered by the HTML preload scanner.
  // React hoists resource hints into the initial document <head> without
  // changing the existing portrait, hero, copy or mobile layout.
  return <section className={styles.root} data-home-dialogue-entry data-home-mode={mode}
    data-home-interactive={interactive?"true":"false"} lang={locale}>
    <link rel="preload" as="image" href={picture} fetchPriority="high" />
    <link rel="preload" as="image" href="/images/holistic-house/ideas-pine-reference.webp" fetchPriority="high" />
    <header className={styles.header} data-home-dialogue-header>
      <div className={styles.brand}>
        <span className={styles.brandIcon} aria-hidden="true"><Leaf size={25}/></span>
        <span className={styles.brandCopy}><h1>Holistic House</h1><small>{screen.brandTag}</small></span>
      </div>
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

    <div className={styles.modes} role="group"
      aria-label={locale==="ru"?"Режим главной":locale==="es"?"Modo principal":"Home mode"}>
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
        <div className={styles.heroStory} data-home-ali-persona={persona.id}>
          <img className={styles.heroPortrait} src={picture} width={530} height={480}
            loading="eager" fetchPriority="high" alt="" aria-hidden="true"/>
          <div className={styles.kicker}><Sparkles size={18} aria-hidden="true"/> AI Assistant</div>
          <h2 className={styles.heroTitle}>{guideLine}</h2>
          <p className={styles.guideRole}>{screen.guideRole}</p>
          <p className={styles.subtitle}>{screen.welcome}</p>
          <button type="button" className={styles.guideAudio}
            data-home-ali-greeting-play onClick={startGuideGreeting}
            aria-pressed={greetingSpeaking}
            aria-label={greetingSpeaking?t.stopMic:screen.listen}>
            {greetingSpeaking?<Pause size={19} aria-hidden="true"/>:<Play size={19} aria-hidden="true"/>}
            {screen.listen}
          </button>
          <button type="button" className={styles.personaButton}
            data-home-open-ali-persona onClick={()=>setPersonaOpen(true)}
            aria-label={screen.choosePersona} title={screen.choosePersona}>
            <UsersRound size={22} aria-hidden="true"/>
          </button>
        </div>
        <form className={styles.composer} onSubmit={startConversation} data-home-intent-form>
          <label className={styles.visuallyHidden} htmlFor={"home-intent-"+locale}>{t.placeholder}</label>
          <textarea id={"home-intent-"+locale} ref={inputRef} value={draft}
            onChange={event=>{setDraft(event.target.value);setError("")}}
            maxLength={2000} rows={2} placeholder={screen.entry}
            data-home-intent-composer autoComplete="off"/>
          <div className={styles.composerButtons}>
            <button type="button" className={styles.moreTool} onClick={()=>router.push(chatRoute)}
              aria-label={screen.tools} title={screen.tools}><Plus size={23} aria-hidden="true"/></button>
            <button type="button" className={styles.photoTool} onClick={()=>router.push(chatRoute)}
              aria-label={screen.photo} title={screen.photo}><ImageIcon size={22} aria-hidden="true"/></button>
            {draft&&<button type="button" className={styles.clear}
              aria-label={locale==="ru"?"Очистить":locale==="es"?"Borrar":"Clear"}
              onClick={()=>{setDraft("");inputRef.current?.focus()}}><X size={19} aria-hidden="true"/></button>}
            <button type="button" className={styles.microphone}
              aria-label={listening?t.stopMic:t.mic} aria-pressed={listening} onClick={dictate}>
              <Mic size={23} aria-hidden="true"/>
            </button>
            <button type="submit" className={styles.send} data-home-send-to-ali
              aria-label={t.send} title={screen.start}>
              <ArrowUp className={styles.sendIcon} size={21} aria-hidden="true"/>
              <span>{screen.start}</span>
            </button>
          </div>
        </form>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        {voiceMessage&&<p className={styles.voiceStatus} role="status">{voiceMessage}</p>}
      </div>
    </div>
    {personaOpen&&<AliPersonaPicker open={personaOpen} onClose={closePersona} locale={locale}/>}

    <div className={styles.directionHead}>
      <h3>{screen.direction}</h3>
      <Link href="#home-discover" prefetch={false}>{screen.all}<ArrowRight size={18} aria-hidden="true"/></Link>
    </div>
    <div className={styles.focusGrid} role="group" aria-label={t.focusTitle} data-home-focus-grid>
      {categories.map((hint,index)=>{
        const TopicIcon=hint.id==="love"?Heart:hint.id==="money"?TrendingUp:
          (hint.id==="business"||hint.id==="strategy"||hint.id==="team")?BriefcaseBusiness:Leaf;
        return <button type="button" key={hint.id} className={styles.focusCard}
          data-home-intent-option={hint.id}
          aria-label={hint.label+" · "+hint.detail+" · "+t.send}
          onClick={()=>startConversationWith(hint.prompt,hint.id==="business"?"business":mode)}>
          <img className={styles.focusPhoto} src={"/images/video-goal-art/"+hint.image}
            width={72} height={72} alt="" loading="eager" aria-hidden="true"/>
          <span className={styles.focusCopy}>
            <TopicIcon className={styles.focusIcon} size={18} aria-hidden="true"/>
            <strong>{hint.label}</strong>
          </span>
          <ArrowRight className={styles.focusArrow} size={17} aria-hidden="true"/>
        </button>;
      })}
    </div>

    <section className={styles.howWorks} data-home-how-it-works aria-label={screen.how}>
      <h3>{screen.how}</h3>
      <div className={styles.steps}>
        {screen.steps.map((step,index)=><div className={styles.step} key={step}>
          <span className={styles.stepIcon}>
            {index===0?<MessageCircle size={18}/>:index===1?<Sparkles size={18}/>:<Leaf size={18}/>}
          </span>
          <strong>{index+1}. {step}</strong>
          <small>{screen.stepNotes[index]}</small>
        </div>)}
      </div>
    </section>
    <div className={styles.finalActions}>
      <Link className={styles.reviewCta} href={ideasRoute} prefetch={false}
        data-home-free-review>
        <Sparkles size={25} aria-hidden="true"/>
        <span><strong>{screen.ideas}</strong><small>{screen.ideasDetail}</small></span>
        <ArrowRight size={22} aria-hidden="true"/>
      </Link>
      <Link className={styles.supportCta} href={supportRoute} prefetch={false}
        data-home-request-session>
        <CalendarDays size={24} aria-hidden="true"/>
        <span><strong>{screen.support}</strong><small>{screen.supportDetail}</small></span>
        <ArrowRight size={22} aria-hidden="true"/>
      </Link>
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
