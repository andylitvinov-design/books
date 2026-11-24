"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUp, BriefcaseBusiness, ChevronDown, HeartHandshake, Route, Sparkles, Leaf, Heart, TrendingUp, X, CheckCircle2, Play, Pause, UsersRound, Plus, Image as ImageIcon, MessageCircle, CalendarDays, Compass, Flame, Flower2, ClipboardList, Shield, Sprout, ChevronsRight, GraduationCap, BarChart3 } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";

import {useAliPersona} from "@/components/app/use-ali-persona";
import {playAliPersonaAudio,stopAliPersonaAudio} from "@/components/app/ali-persona-audio";
import { stageHomeAliHandoff } from "@/lib/home-ali-handoff.mjs";
import {MessengerVoiceNote} from "@/components/app/messenger-voice-note";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-dialogue-entry.module.css";

// Load the 4-persona selection dialog, its cards and styles only when asked.
const AliPersonaPicker=dynamic(()=>import("@/components/app/ali-persona-picker"),{ssr:false});

type Mode = "self" | "business";
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
    speechPrivacy:"Микрофон записывает речь. Галочка — распознавание через Groq Whisper Free; текст можно исправить перед отправкой.",
    speechRecognized:"Речь распознана. Проверьте текст и начните чат.",
    speechTranscribing:"Распознаю запись…",
    speechDenied:"Микрофон заблокирован. Разрешите доступ в Safari или введите текст.",
    speechQuota:"Бесплатный лимит распознавания исчерпан. Попробуйте позже или введите текст.",
    speechSilent:"Не удалось услышать речь. Нажмите микрофон ещё раз.",
    speechFallback:"Браузер не распознал голос. Нажмите микрофон ещё раз для записи.",
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
    speechPrivacy:"Tap the mic to record; confirm to transcribe via Groq Whisper Free. Review and edit before sending.",
    speechRecognized:"Recognized. Review your text and start the chat.",
    speechTranscribing:"Transcribing the recording…",
    speechDenied:"Microphone blocked. Allow access in Safari or type instead.",
    speechQuota:"Free transcription limit reached. Try later or type.",
    speechSilent:"No speech heard. Tap the microphone and try again.",
    speechFallback:"Browser speech failed. Tap the microphone again to record.",
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
    speechPrivacy:"Toca el micrófono para grabar; confirma para transcribir con Groq Whisper Free. Revisa el texto antes de enviarlo.",
    speechRecognized:"Voz reconocida. Revisa el texto e inicia el chat.",
    speechTranscribing:"Transcribiendo la grabación…",
    speechDenied:"Micrófono bloqueado. Permite el acceso en Safari o escribe.",
    speechQuota:"Límite gratuito de transcripción alcanzado. Inténtalo después.",
    speechSilent:"No se escuchó voz. Toca el micrófono e inténtalo otra vez.",
    speechFallback:"El navegador no reconoció tu voz. Toca de nuevo para grabar.",
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
  const {persona,select}=useAliPersona("alex");
  // New visitors meet Max as in the approved mobile design. An explicit
  // previous selection is respected across the whole Ali conversation.
  useEffect(()=>{
    try{if(!window.localStorage.getItem("hh:ai-chat-persona-v1"))select("alex")}
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
  const [mode]=useState<Mode>("self");
  const [draft,setDraft]=useState("");
  const [error,setError]=useState("");
  const [interactive,setInteractive]=useState(false);
  const inputRef=useRef<HTMLTextAreaElement|null>(null);
  useEffect(()=>{setInteractive(true);},[]);
  const chatPath="/"+locale+"/app/messages?section=ai";
  const hints=t.focusHints;

  function startConversationWith(value:string, selectedMode:Mode=audienceFor(value)) {
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
    if(event.currentTarget.querySelector("[data-hh-dictation-active]"))return;
    if(!draft.trim()){startConversationWith(locale==="ru"?"Привет, Самир! Помоги разобраться, с чего начать.":locale==="es"?"Hola Samir, ¿por dónde empiezo?":"Hi Samir! Help me figure out where to begin.");return}
    startConversationWith(draft);
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
  const picture=persona.id==="alex"?"/images/holistic-house/ali-inner-alchemist-hero.webp":persona.image;
  const chatRoute="/"+locale+"/app/messages?section=ai";
  const ideasRoute="/"+locale+(mode==="business"?"/explore/business":"/services/free-situation-review");
  const supportRoute="/"+locale+(mode==="business"?"/services#service-group-business":"/services/free-consultation");

  const audienceFor=(message:string):Mode=>/business|company|revenue|clients|startup|бизнес|компан|клиент|продаж|negocio|empresa|ventas/i.test(message)?"business":"self";
  const programCopy={
    ru:{intro:"Твой ИИ-проводник к ясности, цели и развитию.",welcome:"Давай вместе разберёмся, что для тебя сейчас важно — снять напряжение, достичь цели или развить бизнес.",listen:"Послушать моё приветствие",prompt:"С чем ты хочешь поработать сегодня?",methods:"В нашей работе мы используем:",tools:["ИИ-коучи","Программы","Видео","Тесты","Практики"],send:"Отправить сообщение",listenOn:"Воспроизвести приветствие",privacy:"Начать можно бесплатно без регистрации. Сохранение памяти — только с разрешения.",group:"Выбери программу",programs:[
      {title:"Ясность и снятие стресса",detail:"Спокойствие и восстановление ресурсов.",steps:["Снять стресс","Вернуть силы","Найти ясность"],prompt:"Хочу начать программу «Ясность и снятие стресса». Помоги понять мою ситуацию и выбрать первый шаг."},
      {title:"Достижение моей цели",detail:"От идеи к результату: найти цель, ресурсы и пройти путь.",steps:["Найти цель","Создать план","Достичь цели"],prompt:"Хочу начать программу «Достижение моей цели». Помоги определить мою цель и следующий шаг."},
      {title:"Поддержка бизнеса",detail:"Развитие проектов, стратегия, ресурсы и рост дохода.",steps:["Стратегия","Ресурсы","Рост"],prompt:"Хочу начать программу «Поддержка бизнеса». Помоги прояснить задачу моего бизнеса и следующий шаг."}]},
    en:{intro:"Your AI guide to clarity, goals and growth.",welcome:"Let's discover what matters now — relieving stress, achieving a goal or growing your business.",listen:"Listen to my greeting",prompt:"What would you like to work on today?",methods:"What we use to help:",tools:["AI coaches","Programs","Videos","Tests","Practices"],send:"Send a message",listenOn:"Play my greeting",privacy:"Start free without signing in. Long-term memory requires your permission.",group:"Choose a program",programs:[
      {title:"Clarity & Stress Relief",detail:"Find calm, clarity and restore your resources.",steps:["Relieve stress","Restore energy","Find clarity"],prompt:"I'd like to start the Clarity & Stress Relief program. Help me understand my situation and choose the first step."},
      {title:"Achieving My Goal",detail:"From idea to result: find your goal, resources and path.",steps:["Define my goal","Build a plan","Achieve results"],prompt:"I'd like to start the Achieving My Goal program. Help me define my goal and next step."},
      {title:"Business Support",detail:"Develop projects, strategy, resources and revenue.",steps:["Strategy","Resources","Grow results"],prompt:"I'd like to start the Business Support program. Help me clarify my business challenge and next step."}]},
    es:{intro:"Tu guía de IA hacia la claridad, las metas y el crecimiento.",welcome:"Descubramos qué importa ahora: aliviar el estrés, alcanzar una meta o desarrollar tu negocio.",listen:"Escucha mi bienvenida",prompt:"¿En qué quieres trabajar hoy?",methods:"Trabajamos con:",tools:["Coaches IA","Programas","Vídeos","Pruebas","Prácticas"],send:"Enviar mensaje",listenOn:"Reproducir bienvenida",privacy:"Empieza gratis sin registrarte. Guardamos memoria solo con tu permiso.",group:"Elige un programa",programs:[
      {title:"Claridad y alivio del estrés",detail:"Calma, claridad y recuperación de recursos.",steps:["Menos estrés","Más energía","Claridad"],prompt:"Quiero empezar el programa Claridad y alivio del estrés. Ayúdame a entender mi situación y elegir el primer paso."},
      {title:"Alcanzar mi meta",detail:"De la idea al resultado: encuentra tu meta, recursos y camino.",steps:["Definir mi meta","Crear un plan","Lograr resultados"],prompt:"Quiero empezar el programa Alcanzar mi meta. Ayúdame a definir mi objetivo y el siguiente paso."},
      {title:"Apoyo empresarial",detail:"Desarrollo de proyectos, estrategia, recursos e ingresos.",steps:["Estrategia","Recursos","Resultados"],prompt:"Quiero empezar el programa Apoyo empresarial. Ayúdame a aclarar el reto de mi negocio y el siguiente paso."}]}
  } as const;
  const msg=programCopy[locale];
  const programArt=[
    {id:"clarity",image:"/images/holistic-house/support-business-choice-photos-hd.webp",icon:Flower2,steps:[Flower2,Leaf,Sparkles]},
    {id:"goal",image:"/images/holistic-house/support-personal-choice-photos-hd.webp",icon:Compass,steps:[Compass,Route,TrendingUp]},
    {id:"business",image:"/images/holistic-house/profile-card-photos.webp",icon:BarChart3,steps:[BriefcaseBusiness,Sprout,TrendingUp]},
  ] as const;
  const methodIcons=[UsersRound,GraduationCap,Play,BarChart3,Flower2] as const;

  function openGoalIntent(prompt:string) {
    const typed=draft.trim();
    startConversationWith(typed?prompt+"\\n"+typed:prompt,audienceFor(typed||prompt));
  }
  function openAttachments(){
    openGoalIntent(locale==="ru"?"Я хочу добавить фотографию к своему вопросу.":locale==="es"?"Quiero adjuntar una imagen a mi pregunta.":"I'd like to add a photo to my question.");
  }
  // A CSS background cannot be discovered by the HTML preload scanner.
  // React hoists resource hints into the initial document <head> without
  // changing the existing portrait, hero, copy or mobile layout.
  return <section className={styles.root} data-home-dialogue-entry data-home-mode="self"
    data-home-interactive={interactive?"true":"false"} lang={locale}>
    <link rel="preload" as="image" href={picture} fetchPriority="high"/>
    <link rel="preload" as="image" href="/images/holistic-house/ideas-pine-reference.webp" fetchPriority="high"/>
    <header className={styles.header} data-home-dialogue-header>
      <Link href={locale==="en"?"/":"/"+locale} className={styles.brand} prefetch={false} aria-label="Holistic House">
        <span className={styles.brandIcon} aria-hidden="true"><Leaf size={25}/></span>
        <span className={styles.brandCopy}><h1>Holistic House</h1><small>{screen.brandTag}</small></span>
      </Link>
      <div className={styles.headerActions}>
        <details className={styles.language} data-home-language-switch>
          <summary aria-label={locale==="ru"?"Выбрать язык":locale==="es"?"Elegir idioma":"Choose language"}>{locale.toUpperCase()} <ChevronDown size={14} aria-hidden="true"/></summary>
          <div className={styles.languageMenu}>
            {LOCALES.map(next=><Link key={next} href={next==="en"?"/":"/"+next} lang={next} hrefLang={next} prefetch={false} aria-current={locale===next?"page":undefined}>{next.toUpperCase()}</Link>)}
          </div>
        </details>
        <div className={styles.siteTools} data-home-site-tools><SiteNavigation locale={locale} compact /></div>
      </div>
    </header>

    <div className={styles.hero} data-home-dialogue-hero>
      <div className={styles.scene} aria-hidden="true"/>
      <div className={styles.heroContent} data-home-ali-persona={persona.id}>
        <img className={styles.heroPortrait} src={picture} width={530} height={480} loading="eager" fetchPriority="high" alt={greetingName}/>
        <div className={styles.heroStory}>
          <div className={styles.heroMessage}>
            <div className={styles.kicker}><Sparkles size={15} aria-hidden="true"/> {locale==="ru"?"ИИ-ПРОВОДНИК":locale==="es"?"GUÍA IA":"AI GUIDE"}</div>
            <h2 className={styles.heroTitle}>{guideLine}</h2>
            <p className={styles.guideRole}>{persona.id==="alex"?msg.intro:persona.role[locale]}</p>
            <p className={styles.subtitle}>{msg.welcome}</p>
          </div>
          <button type="button" className={styles.guideAudio} data-home-ali-greeting-play
            aria-pressed={greetingSpeaking} aria-label={msg.listenOn} onClick={startGuideGreeting}>
            {greetingSpeaking?<Pause size={19} aria-hidden="true"/>:<Play size={19} aria-hidden="true"/>}
            <span>{msg.listen}</span><span className={styles.audioWave} aria-hidden="true">{[7,13,20,12,24,16,8].map((height,i)=><i key={i} style={{height}}/>)}</span>
          </button>
          <button type="button" className={styles.personaButton} data-home-open-ali-persona
            onClick={()=>setPersonaOpen(true)} aria-label={screen.choosePersona} title={screen.choosePersona}>
            <UsersRound size={21} aria-hidden="true"/>
          </button>
        </div>
      </div>
    </div>
    {personaOpen&&<AliPersonaPicker open={personaOpen} onClose={closePersona} locale={locale}/>}

    <form className={styles.composer} onSubmit={startConversation} data-home-intent-form data-home-has-draft={Boolean(draft.trim())}>
      <span className={styles.composerSparkle} aria-hidden="true"><Sparkles size={24}/></span>
      <label className={styles.visuallyHidden} htmlFor={"home-intent-"+locale}>{msg.prompt}</label>
      <textarea id={"home-intent-"+locale} ref={inputRef} value={draft} rows={2} maxLength={2000}
        onChange={event=>{setDraft(event.target.value);setError("")}} placeholder={msg.prompt}
        data-home-intent-composer autoComplete="off"/>
      <div className={styles.composerButtons}>
        
        
        <MessengerVoiceNote locale={locale} variant="dictation" micMarker="data-home-intent-mic"
          micClassName={styles.microphone} micDescribedBy="home-voice-disclosure" onBegin={()=>stopAliPersonaAudio()}
          onSendTranscript={text=>{setDraft(previous=>((previous?previous+" ":"")+text).slice(0,2000));return true;}}/>
        <button type="submit" className={styles.send} data-home-send-to-ali aria-label={msg.send} title={msg.send}><ArrowUp size={21} aria-hidden="true"/></button>
      </div>
    </form>
    <p id="home-voice-disclosure" className={styles.visuallyHidden} data-home-voice-disclosure>{t.speechPrivacy}</p>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <p className={styles.privacy}>{msg.privacy}</p>

    <div className={styles.programGrid} role="group" aria-label={msg.group} data-home-focus-grid>
      {msg.programs.map((program,index)=>{
        const art=programArt[index],ProgramIcon=art.icon;
        return <button type="button" key={art.id} className={styles.programCard} data-home-intent-option={art.id}
          aria-label={program.title} onClick={()=>startConversationWith(draft.trim()?program.prompt+"\n"+draft.trim():program.prompt,art.id==="business"?"business":"self")}>
          <span className={styles.programImage} data-home-program-art={art.id}><img src={art.image} width={240} height={180} alt="" loading="eager" decoding="async"/><ProgramIcon aria-hidden="true" size={28}/></span>
          <span className={styles.programContent}><strong>{program.title}</strong><small>{program.detail}</small>
            <span className={styles.programSteps}>{program.steps.map((step,i)=>{const StepIcon=art.steps[i];return <span key={step}><StepIcon size={15} aria-hidden="true"/><span>{step}</span></span>})}</span>
          </span>
          <span className={styles.programArrow}><ArrowRight size={19} aria-hidden="true"/></span>
        </button>
      })}
    </div>

    <section className={styles.methods} data-home-methods aria-label={msg.methods}>
      <h3><Sparkles size={20} aria-hidden="true"/>{msg.methods}</h3>
      <div className={styles.methodGrid}>
        {msg.tools.map((name,index)=>{
          const ToolIcon=methodIcons[index];
          return <div className={styles.method} key={name}><ToolIcon size={27} aria-hidden="true"/><span>{name}</span></div>;
        })}
      </div>
    </section>
    <Link className={styles.continue} data-home-continue-path href={"/"+(locale==="es"?"en":locale)+"/app/portrait?space=path"} prefetch={false}>
      {locale==="ru"?"Мой личный путь":locale==="es"?"Mi camino":"My journey"} <ArrowRight size={19}/>
    </Link>
  </section>;
}
