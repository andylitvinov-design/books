"use client";

import {useEffect,useRef,useState,type ReactNode} from "react";
import Link from "next/link";
import {BookOpen, CalendarDays, ClipboardCheck, Clapperboard, Flower2,
  HandHeart, MessageCircle, Play, X, ChevronDown} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import {Heart,Sun,Compass,Leaf,TrendingUp,BriefcaseBusiness,Sprout,Lightbulb,Flag,ArrowRight,Sparkles,UserRound,ShoppingBag,UsersRound} from "lucide-react";
import css from "./messenger-ai-landing.module.css";
import {useAliPersona} from "./use-ali-persona";
import {playAliPersonaAudio,stopAliPersonaAudio,prepareAliNaturalVoice} from "./ali-persona-audio";

// Owner's original HeyGen exports, not a YouTube player and not time-limited
// files2.heygen.ai signed downloads. Both captioned MP4s were checked as
// anonymously reachable binary files on the public resource2 CDN.
const INTRO={
  en:{
    src:"https://resource2.heygen.ai/movio/video/8d998c778af3b563aa63233aa4fb4a06/89b101dc9dbb4fcea06aab3eb6ce5094/caption.mp4",
    embed:"https://app.heygen.com/embeds/8d998c778af3b563aa63233aa4fb4a06",
    durationSeconds:91.2457,
  },
  ru:{
    src:"https://resource2.heygen.ai/movio/video/72e3e6f45c3664b0b8d75281b1b413a5/2e30e44294964059b57670860ee3828b/caption.mp4",
    embed:"https://app.heygen.com/embeds/72e3e6f45c3664b0b8d75281b1b413a5",
    durationSeconds:96.862,
  },
} as const;

const COPY={
  en:{
    hi:"Hi!",title:"I'm Ali, your Holistic Guide",
    lead:"Ask, explore, learn and create with me.",
    question:"What would you like to do today?",
    watch:"Watch the Holistic House introduction (English audio)",
    videoLanguage:"English audio",
    close:"Close introduction video",
    error:"Video could not be loaded.",backup:"Alternative player is ready.",
    retry:"Try again",openOriginal:"Open original video",
    choices:"Choose how to begin",
    test:"Take a test",video:"Create a video",practice:"Do a practice",
    session:"Request a session",course:"Learn a course",ask:"Ask a question",support:"Get support",
  },
  ru:{
    hi:"Привет!",title:"Я Ali — ИИ-помощник Holistic House",
    lead:"Спрашивайте, исследуйте, учитесь и создавайте.",
    question:"Чем вы хотите заняться сегодня?",
    watch:"Посмотреть презентацию Holistic House (русская озвучка)",
    videoLanguage:"Русская озвучка",
    close:"Закрыть видеопрезентацию",
    error:"Не удалось загрузить видео.",backup:"Резервный плеер готов.",
    retry:"Повторить",openOriginal:"Открыть исходное видео",
    choices:"Выберите, с чего начать",
    test:"Пройти тест",video:"Создать видео",practice:"Выбрать практику",
    session:"Запросить сессию",course:"Изучить курс",ask:"Задать вопрос",support:"Get support",
  },
  es:{
    hi:"¡Hola!",title:"Soy Ali, tu guía de IA Holistic House",
    lead:"Pregunta, explora, aprende y crea conmigo.",
    question:"¿Qué te gustaría hacer hoy?",
    watch:"Ver la introducción de Holistic House (audio en inglés)",
    videoLanguage:"Audio en inglés",
    close:"Cerrar vídeo de presentación",
    error:"No se pudo cargar el vídeo.",backup:"Reproductor alternativo disponible.",
    retry:"Reintentar",openOriginal:"Abrir el vídeo original",
    choices:"Elige cómo empezar",
    test:"Hacer un test",video:"Crear un vídeo",practice:"Hacer una práctica",
    session:"Solicitar sesión",course:"Elegir un curso",ask:"Hacer una pregunta",support:"Get support",
  },
} as const;


/* Conversation-first welcome: topics are editable starters, not diagnostic labels. */
const TOPICS=[
 {id:"stress",icon:Leaf,art:"/images/video-goal-art/stress.webp"},
 {id:"relationships",icon:Heart,art:"/images/video-goal-art/love.webp"},
 {id:"money",icon:TrendingUp,art:"/images/video-goal-art/growth.webp"},
 {id:"energy",icon:Leaf,art:"/images/video-goal-art/energy.webp"},
 {id:"confidence",icon:Sun,art:"/images/holistic-house/ideas-zen-landscape.svg"},
 {id:"direction",icon:Compass,art:"/images/holistic-house/ideas-pine-reference.webp"},
 {id:"business",icon:Lightbulb,art:"/images/holistic-house/books-library.webp"},
 {id:"growth",icon:Flag,art:"/images/holistic-house/course-journey-landscape.svg"},
] as const;
const INNER_COPY={
 en:{
  greeting:"Hi! I'm Ali.",
  promise:"Let's understand your situation and find the next step together.",
  question:"What would you like to begin with today?",
  help:"Tell me about your situation, your goal, or what you would like to change.",
  steps:["Tell us your goal","Get a personal next step","Choose support or action"],
  analysis:"Start personal analysis",analysisHelp:"A gentle, free exploration of your situation",
  topics:{
   stress:{label:"Stress & Anxiety Relief",prompt:"I feel stressed or anxious and would like to understand what is happening."},
   relationships:{label:"Love & Relationships",prompt:"I would like to talk about a difficult situation in my relationships."},
   confidence:{label:"Confidence",prompt:"I would like to regain confidence in myself."},
   money:{label:"Money & Growth",prompt:"I would like to understand my challenges with work or money."},
   energy:{label:"Energy & Life Balance",prompt:"I am tired or burned out and want to understand how to restore my energy."},
   direction:{label:"Goals & meaning",prompt:"I want to find clarity about my direction in life."},
   business:{label:"Business support",prompt:"I want to discuss a business challenge and find a practical next step."},
   growth:{label:"Personal growth",prompt:"I would like to understand myself better and grow."},
  },
 },
 ru:{
  greeting:"Привет! Я Ali.",
  promise:"Давай разберёмся в твоей ситуации и вместе найдём следующий шаг.",
  question:"С чего тебе хотелось бы начать сегодня?",
  help:"Расскажи о своей ситуации, проблеме, цели или о том, чего хотелось бы достичь.",
  steps:["Расскажите о цели","Получите личную рекомендацию","Выберите действие"],
  analysis:"Начать личный разбор",analysisHelp:"Бережно и бесплатно разберёмся в твоём вопросе",
  topics:{
   stress:{label:"Стресс и тревога",prompt:"Я испытываю стресс или тревогу и хочу разобраться, что происходит."},
   relationships:{label:"Любовь и отношения",prompt:"Я хочу разобраться в сложной ситуации в отношениях."},
   confidence:{label:"Уверенность",prompt:"Я хочу вернуть уверенность в себе."},
   money:{label:"Деньги и развитие",prompt:"Я хочу разобраться с трудностями в работе или финансах."},
   energy:{label:"Энергия и баланс",prompt:"Я чувствую усталость или выгорание и хочу восстановить силы."},
   direction:{label:"Цели и смысл",prompt:"Я хочу лучше понять, куда двигаться дальше в жизни."},
   business:{label:"Поддержка бизнеса",prompt:"Я хочу обсудить сложность в бизнесе и найти практичное решение."},
   growth:{label:"Личный рост",prompt:"Я хочу лучше понять себя и развиваться."},
  },
 },
 es:{
  greeting:"¡Hola! Soy Ali.",
  promise:"Exploremos juntos tu situación y encontremos el próximo paso.",
  question:"¿Por dónde te gustaría empezar hoy?",
  help:"Cuéntame tu situación, un problema, una meta o lo que te gustaría cambiar.",
  steps:["Cuéntanos tu meta","Recibe un paso personal","Elige cómo avanzar"],
  analysis:"Iniciar análisis personal",analysisHelp:"Una exploración amable y gratuita de tu situación",
  topics:{
   stress:{label:"Estrés y ansiedad",prompt:"Siento estrés o ansiedad y quiero comprender lo que me ocurre."},
   relationships:{label:"Amor y relaciones",prompt:"Quisiera comprender una situación difícil en mis relaciones."},
   confidence:{label:"Confianza",prompt:"Quiero recuperar la confianza en mí."},
   money:{label:"Dinero y crecimiento",prompt:"Quiero aclarar dificultades relacionadas con el trabajo o el dinero."},
   energy:{label:"Energía y equilibrio",prompt:"Me siento cansado o agotado y quiero recuperar energía."},
   direction:{label:"Metas y sentido",prompt:"Quiero aclarar qué dirección tomar en mi vida."},
   business:{label:"Apoyo empresarial",prompt:"Quiero hablar de un problema de negocio y encontrar un próximo paso."},
   growth:{label:"Crecimiento personal",prompt:"Quiero conocerme mejor y crecer."},
  },
 },
} as const;

const ACTIONS=[
  {id:"support",icon:HandHeart},
  {id:"test",icon:ClipboardCheck,href:"tests"},
  {id:"video",icon:Clapperboard},
  {id:"practice",icon:Flower2},
  {id:"session",icon:CalendarDays,href:"services"},
  {id:"course",icon:BookOpen,href:"academy"},
  {id:"ask",icon:MessageCircle},
] as const;

export function MessengerAiLanding({locale,onCreateVideo,onPractice,onAsk,onSupport,onTopicSelect,onStartAnalysis,onGoalChoice,composer}:{
  locale:PublicLocale;onCreateVideo:()=>void;onPractice:()=>void;onAsk:()=>void;onSupport:()=>void;
  onTopicSelect:(text:string)=>void;onStartAnalysis:()=>void;onGoalChoice:(text:string)=>void;composer:ReactNode
}){
  const t=COPY[locale];
  const inner=INNER_COPY[locale];
  const {persona}=useAliPersona();
  const [speaking,setSpeaking]=useState(false);
  const [moreTopics,setMoreTopics]=useState(false);
  useEffect(()=>{void prepareAliNaturalVoice(persona.id,locale);return ()=>stopAliPersonaAudio();},[persona.id,locale]);
  const playGreeting=()=>{
    if(speaking){stopAliPersonaAudio();setSpeaking(false);return;}
    playAliPersonaAudio(persona.id,locale,(isPlaying:boolean)=>setSpeaking(isPlaying));
  };
  const guideName=persona.name[locale];
  const welcomeTitle=locale==="ru"?`Привет! Я ${guideName}.`:
    locale==="es"?`¡Hola! Soy ${guideName}.`:`Hi! I'm ${guideName}.`;
  const guideRole=locale==="ru"?"Ваш внутренний алхимик":
    locale==="es"?"Tu alquimista interior":"Your Inner Alchemist";
  // Spanish has no recorded master; use the existing English version with
  // an explicit "Audio en inglés" label, never silently present Russian audio.
  const introduction=INTRO[locale==="ru"?"ru":"en"];
  const videoRef=useRef<HTMLVideoElement>(null);
  const [playing,setPlaying]=useState(false);
  const [failed,setFailed]=useState(false);
  const [nativeStarted,setNativeStarted]=useState(false);

  // Safari can leave a native media element black without reporting an error.
  // Start a same-master fallback only after an explicit Play tap.
  useEffect(()=>{
    if(!playing||failed||nativeStarted)return;
    const timer=window.setTimeout(()=>{
      videoRef.current?.pause();
      setFailed(true);
    },8000);
    return()=>window.clearTimeout(timer);
  },[playing,failed,nativeStarted]);

  const fail=()=>{
    videoRef.current?.pause();
    setFailed(true);
  };
  const start=()=>{
    setNativeStarted(false);
    setFailed(false);
    setPlaying(true);
    const media=videoRef.current;
    if(!media)return;
    if(media.error)media.load();
    const attempt=media.play();
    // AbortError is expected if the user closes the player during loading.
    if(attempt)void attempt.catch(error=>{
      if(error?.name!=="AbortError")fail();
    });
  };
  const close=()=>{
    videoRef.current?.pause();
    try{if(videoRef.current)videoRef.current.currentTime=0;}
    catch{/* Safari may reject seeking before metadata is available. */}
    setPlaying(false);
    setFailed(false);
    setNativeStarted(false);
  };
  const retry=()=>{
    setNativeStarted(false);
    setFailed(false);
    const media=videoRef.current;
    if(!media)return;
    // A failed HTMLMediaElement needs load(), not another play() alone.
    media.load();
    const attempt=media.play();
    if(attempt)void attempt.catch(error=>{
      if(error?.name!=="AbortError")fail();
    });
  };

  return <section className={css.root} data-hh-ai-landing aria-label={welcomeTitle}
    data-hh-chat-opening="true">
    <div className={css.genieScene} data-hh-genie-scene>
      <div className={css.dialogueProfile}>
        <img className={css.profilePortrait} src={persona.image} alt="" width={48} height={48} loading="eager"/>
        <div className={css.profileIdentity}>
          <strong>Holistic House · {guideName}</strong>
          <span><i aria-hidden="true"/>{locale==="ru"?"На связи":locale==="es"?"En línea":"Online"}</span>
        </div>
        <span className={css.profileSparkle} aria-hidden="true"><Sparkles size={20}/></span>
      </div>
      <div className={css.welcomeRow} data-hh-ali-first-message data-hh-ali-hero-persona={persona.id}>
        <article className={css.welcomeBubble} data-hh-ai-landing-question>
          <h2>{locale==="ru"?<>Привет! Я {guideName} — {persona.id==="alex"?"твой ИИ-джин и проводник":"твой ИИ-проводник"} к мечте. ✨</>:
            locale==="es"?<>¡Hola! Soy {guideName}, {persona.id==="alex"?"tu genio de IA y guía":"tu guía de IA"} hacia tus sueños. ✨</>:
              <>Hi! I&apos;m {guideName} — {persona.id==="alex"?"your AI genie and guide":"your AI guide"} to your dreams. ✨</>}</h2>
          <p>{locale==="ru"?"У тебя есть желание, мечта или цель? А может, ты пока ищешь своё направление?":
            locale==="es"?"¿Tienes un deseo, un sueño o una meta? ¿O todavía buscas tu camino?":
              "Do you have a wish, a dream, or a goal? Or are you still finding your direction?"}</p>
          <p><strong>{locale==="ru"?"Давай найдём путь к ней,":locale==="es"?"Encontremos tu camino,":"Let's find your way,"}</strong>{" "}
            {locale==="ru"?"раскроем твои силы и сделаем следующий шаг.":
              locale==="es"?"descubramos tus fortalezas y demos el siguiente paso.":
                "discover your strengths, and take the next step."}</p>
          <div className={css.welcomeMeta}>
            <button type="button" className={css.welcomeListen} data-hh-ai-persona-voice-play
              aria-pressed={speaking} onClick={playGreeting}
              aria-label={locale==="ru"?(speaking?"Остановить голос ведущего":"Послушать голос ведущего"):
                locale==="es"?(speaking?"Detener voz del guía":"Escuchar voz del guía"):
                  (speaking?"Stop guide voice":"Listen to guide voice")}>
              {speaking?<X size={16} aria-hidden="true"/>:<Play size={16} aria-hidden="true"/>}
              {speaking?(locale==="ru"?"Стоп":locale==="es"?"Detener":"Stop"):
                locale==="ru"?"Послушать":locale==="es"?"Escuchar":"Listen"}
            </button>
          </div>
        </article>
      </div>
    </div>
    <div className={css.goalButtons} role="group" data-hh-genie-goal-choices
      aria-label={locale==="ru"?"С чего начнём":locale==="es"?"Cómo empezamos":"Where shall we begin"}>
      <button type="button" data-hh-genie-goal-choice="discover"
        onClick={()=>onGoalChoice(locale==="ru"?"Помоги мне найти мою цель. Я пока ищу направление и хочу разобраться, чего действительно хочу.":
          locale==="es"?"Ayúdame a descubrir mi meta. Todavía estoy buscando una dirección.":"Help me find my goal. I'm still looking for direction.")}>
        <Compass size={23} aria-hidden="true"/>
        <span>{locale==="ru"?"Помоги найти цель":locale==="es"?"Ayúdame a encontrar mi meta":"Help me find my goal"}</span>
        <ArrowRight size={21} aria-hidden="true"/>
      </button>
      <button type="button" data-hh-genie-goal-choice="defined"
        onClick={()=>onGoalChoice(locale==="ru"?"У меня уже есть цель. Помоги уточнить её и найти лучший следующий шаг.":
          locale==="es"?"Ya tengo una meta. Ayúdame a aclararla y elegir el próximo paso.":"I already have a goal. Help me clarify it and choose the next step.")}>
        <Flag size={23} aria-hidden="true"/>
        <span>{locale==="ru"?"У меня уже есть цель":locale==="es"?"Ya tengo una meta":"I already have a goal"}</span>
        <ArrowRight size={21} aria-hidden="true"/>
      </button>
    </div>
    <div className={css.inlineComposer} data-hh-ai-inline-composer>{composer}</div>
    <details className={css.extraDirections} data-hh-genie-extra-directions>
      <summary>{locale==="ru"?"Другие направления и разделы":locale==="es"?"Más temas y secciones":"More topics and sections"} <ChevronDown size={16} aria-hidden="true"/></summary>
      <nav className={css.chatShortcuts} data-hh-ai-chat-shortcuts
        aria-label={locale==="ru"?"Разделы AI чата":locale==="es"?"Secciones del chat":"Chat sections"}>
        <Link className={css.chatShortcut} data-hh-chat-shortcut="ai" aria-current="page"
          href={"/"+locale+"/app/messages?section=ai"}><Sparkles size={17} aria-hidden="true"/>
          <span>{locale==="ru"?"ИИ":locale==="es"?"IA":"AI"}</span></Link>
        <Link className={css.chatShortcut} data-hh-chat-shortcut="page"
          href={"/"+locale+"/app/portrait"}><UserRound size={17} aria-hidden="true"/>
          <span>{locale==="ru"?"Моя страница":locale==="es"?"Mi página":"My page"}</span></Link>
        <Link className={css.chatShortcut} data-hh-chat-shortcut="orders"
          href={"/"+locale+"/app/messages?section=orders"}><ShoppingBag size={17} aria-hidden="true"/>
          <span>{locale==="ru"?"Мои заказы":locale==="es"?"Mis pedidos":"My orders"}</span></Link>
        <Link className={css.chatShortcut} data-hh-chat-shortcut="clients"
          href={"/"+locale+"/app/messages?section=clients"}><UsersRound size={17} aria-hidden="true"/>
          <span>{locale==="ru"?"Мои клиенты":locale==="es"?"Mis clientes":"My clients"}</span></Link>
      </nav>
      <div className={css.topicTitleRow}>
        <h3 className={css.topicHeading}>{locale==="ru"?"Выбери направление":locale==="es"?"Elige una dirección":"Choose a direction"}</h3>
        <button type="button" className={css.moreTopics} data-hh-alchemist-more-topics
          aria-expanded={moreTopics} onClick={()=>setMoreTopics(value=>!value)}>
          {moreTopics?(locale==="ru"?"Меньше":locale==="es"?"Menos":"Fewer"):
            locale==="ru"?"Все темы":locale==="es"?"Todos los temas":"All topics"}
          <ArrowRight size={17} aria-hidden="true"/>
        </button>
      </div>
      <div className={css.topics} role="group"
        aria-label={locale==="ru"?"Темы для разговора":locale==="es"?"Temas de conversación":"Conversation topics"}
        data-hh-alchemist-topics data-hh-alchemist-visible-topics={moreTopics?8:4}>
        {(moreTopics?TOPICS:TOPICS.slice(0,4)).map(item=>{
          const Icon=item.icon;
          const topic=inner.topics[item.id];
          return <button key={item.id} type="button" data-hh-alchemist-topic={item.id}
            onClick={()=>onTopicSelect(topic.prompt)} title={topic.label}>
            <span className={css.topicIllustration}><img src={item.art} alt="" loading="lazy" width={80} height={80}/></span>
            <span className={css.topicLabel}><Icon size={17} strokeWidth={1.8} aria-hidden="true"/>{topic.label}</span>
            <span className={css.topicArrow}><ArrowRight size={17} aria-hidden="true"/></span>
          </button>;
        })}
      </div>
    </details>
    {moreTopics&&<div className={css.expandedContent} data-hh-ali-more-options>
      <button type="button" className={css.analysisButton} data-hh-alchemist-start-analysis
        onClick={onStartAnalysis}>
        <span aria-hidden="true" className={css.analysisSparkle}><Sprout size={22}/></span>
        <span className={css.analysisWords}><strong>{inner.analysis}</strong><small>{inner.analysisHelp}</small></span>
        <span aria-hidden="true" className={css.analysisArrow}>→</span>
      </button>
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
              className={css.card} onClick={item.id==="support"?onSupport:item.id==="video"?onCreateVideo:
                item.id==="practice"?onPractice:onAsk}>{content}</button>;
        })}
      </div>
      <details className={css.introDetails} onToggle={event=>{
        if(!event.currentTarget.open){videoRef.current?.pause();setPlaying(false);}
      }}>
        <summary>{t.watch}</summary>
    <div className={css.hero} data-hh-ai-video-hero data-playing={playing?"true":"false"}
      data-hh-ali-hero-persona={persona.id}>
      <img className={css.heroPortrait} src={persona.image} alt="" width={320} height={285}
        loading="eager" fetchPriority="high"/>
      <div className={css.player} aria-hidden={!playing} data-backup={failed?"true":"false"}>
        <video ref={videoRef} src={introduction.src} controls playsInline preload="none"
          poster="/images/holistic-house/reiki-approved-sunrise-v3.webp"
          aria-label={t.watch} tabIndex={playing?0:-1}
          onError={fail} onPlaying={()=>{setNativeStarted(true);setFailed(false);}}
          onEnded={close}/>
        {playing&&failed&&<iframe className={css.backup} data-hh-ai-intro-fallback="heygen"
          src={introduction.embed} title={t.watch}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin"/>}
        {playing&&<button type="button" className={css.dismiss} onClick={close}
          aria-label={t.close}><X size={19} aria-hidden="true"/></button>}
        {playing&&failed&&<div className={css.videoError} role="status">
          <span>{t.backup}</span>
          <button type="button" onClick={retry}>{t.retry}</button>
          <a href={introduction.embed} target="_blank" rel="noopener noreferrer">{t.openOriginal}</a>
        </div>}
      </div>
      {!playing&&<>
        <div className={css.heroCopy}>
          <em>{welcomeTitle}</em>
          <h2>{guideRole}</h2>
          <p>{inner.promise}</p>
        </div>
        <button type="button" className={css.voicePlay} data-hh-ai-persona-voice-play
          aria-pressed={speaking} onClick={playGreeting}
          aria-label={locale==="ru"?(speaking?"Остановить приветствие":"Послушать приветствие"):
            locale==="es"?(speaking?"Detener saludo":"Escuchar saludo"):
            (speaking?"Stop greeting":"Listen to greeting")}>
          {speaking?<X size={18} aria-hidden="true"/>:<Play size={18} fill="currentColor" aria-hidden="true"/>}
          <span>{speaking?(locale==="ru"?"Стоп":locale==="es"?"Detener":"Stop"):
            locale==="ru"?"Послушать":locale==="es"?"Escuchar":"Listen"}</span>
        </button>
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

      </details>
    </div>}
  </section>;
}
