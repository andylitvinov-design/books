"use client";

import {useRef,useState,type FormEvent} from "react";
import Image from "next/image";
import Link from "next/link";
import {ArrowRight,BookOpen,BriefcaseBusiness,ChevronDown,HeartHandshake,Menu,Mic,Send,Sparkles,UserRound,Route,PenLine} from "lucide-react";
import {SiteSearch} from "@/components/site-search";
import {HOME_INTENT_HANDOFF_KEY,HOME_INTENT_MAX_LENGTH} from "@/lib/home-intent-handoff.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./home-dialog-first.module.css";

type Mode="self"|"business";
type RecognitionEvent={results:ArrayLike<ArrayLike<{transcript:string}>>};
type SpeechRecognitionLike={
  lang:string;interimResults:boolean;continuous:boolean;
  onresult:((event:RecognitionEvent)=>void)|null;
  onend:(()=>void)|null;onerror:(()=>void)|null;
  start:()=>void;stop:()=>void;
};
type SpeechRecognitionCtor=new()=>SpeechRecognitionLike;
const text={
  ru:{personal:"Для себя",business:"Для бизнеса",title:"Что вы хотите сделать сегодня?",businessTitle:"Что создадим для вашего бизнеса?",
    lead:"Спросите, исследуйте, обучайтесь или создавайте что-то своё.",businessLead:"Расскажите об идее — Ali поможет выбрать первый шаг.",
    placeholder:"Расскажите, что у вас на уме…",send:"Начать диалог с Ali",mic:"Продиктовать сообщение",micHint:"Если диктовка недоступна, используйте микрофон клавиатуры.",
    privacy:"Ваш текст передаётся в Ali только после отправки.",transferError:"Не удалось передать сообщение. Разрешите данные для этой вкладки или откройте AI/Chat.",
    selfIdeas:["Разобраться в себе","Создать что-то","Найти поддержку"],businessIdeas:["Развить бизнес","Создать курс","Разместить услугу"],
    selfPrompts:["Помоги разобраться в моей ситуации.","Хочу создать медитацию или видео.","Помоги найти поддержку."],
    businessPrompts:["Хочу развивать свой бизнес. С чего начать?","Помоги создать мой курс.","Хочу разместить свою услугу в Holistic House."],
    continueSelf:"Продолжить мой путь",continueBusiness:"Открыть кабинет мастера",continueHint:"Мои занятия, результаты и проекты",workHint:"Мои услуги, курсы и клиенты",
    topics:"Исследовать направления",topicsHint:"Можно выбрать раздел вручную, без диалога.",topicLabels:["Тесты","Обучение","Услуги"],
    lang:"Язык",menu:"Меню",search:"Поиск",guide:"Бесплатный AI-помощник"},
  en:{personal:"For myself",business:"For business",title:"What would you like to do today?",businessTitle:"What shall we create for your business?",
    lead:"Ask, explore, learn, or create something of your own.",businessLead:"Tell Ali your idea and take the first step.",
    placeholder:"What's on your mind?",send:"Start a conversation with Ali",mic:"Dictate a message",micHint:"If voice dictation isn't available, use your keyboard microphone.",
    privacy:"Your text is passed to Ali only after you send.",transferError:"Could not hand off your message. Allow this tab's data or open AI/Chat.",
    selfIdeas:["Understand myself","Create something","Find support"],businessIdeas:["Grow my business","Create a course","Publish a service"],
    selfPrompts:["Help me understand my situation.","I would like to create a meditation or video.","Help me find support."],
    businessPrompts:["I want to grow my business. Where should I start?","Help me create my own course.","I want to offer my service on Holistic House."],
    continueSelf:"Continue my path",continueBusiness:"Open my work space",continueHint:"My learning, reports and projects",workHint:"My services, courses and clients",
    topics:"Explore by topic",topicsHint:"You can browse without starting a chat.",topicLabels:["Tests","Learning","Services"],
    lang:"Language",menu:"Menu",search:"Search",guide:"Free AI guide"},
  es:{personal:"Para mí",business:"Para negocios",title:"¿Qué te gustaría hacer hoy?",businessTitle:"¿Qué creamos para tu negocio?",
    lead:"Pregunta, explora, aprende o crea algo propio.",businessLead:"Cuéntale tu idea a Ali y encuentra el primer paso.",
    placeholder:"¿Qué tienes en mente?",send:"Empezar una conversación con Ali",mic:"Dictar mensaje",micHint:"Si no hay dictado, usa el micrófono del teclado.",
    privacy:"Tu mensaje se pasa a Ali solo después de enviarlo.",transferError:"No se pudo transferir el mensaje. Permite datos de esta pestaña o abre IA/Chat.",
    selfIdeas:["Conocerme mejor","Crear algo","Encontrar apoyo"],businessIdeas:["Hacer crecer mi negocio","Crear un curso","Publicar un servicio"],
    selfPrompts:["Ayúdame a comprender mi situación.","Quiero crear una meditación o un vídeo.","Ayúdame a encontrar apoyo."],
    businessPrompts:["Quiero hacer crecer mi negocio. ¿Por dónde empiezo?","Ayúdame a crear mi curso.","Quiero publicar un servicio en Holistic House."],
    continueSelf:"Continuar mi camino",continueBusiness:"Abrir espacio profesional",continueHint:"Mi aprendizaje y resultados",workHint:"Mis servicios, cursos y clientes",
    topics:"Explorar temas",topicsHint:"También puedes explorar sin comenzar un chat.",topicLabels:["Pruebas","Cursos","Servicios"],
    lang:"Idioma",menu:"Menú",search:"Buscar",guide:"Asistente IA gratis"},
} as const;
const MENU_PATHS=[
  {key:"tests",path:"/client/tests"},
  {key:"academy",path:"/academy"},
  {key:"services",path:"/services"},
  {key:"work",path:"/practice"}
] as const;
const MENU_TEXT={
  ru:["Тесты","Обучение","Услуги","Для бизнеса"],
  en:["Tests","Learning","Services","For business"],
  es:["Pruebas","Cursos","Servicios","Para negocios"],
} as const;
const speechLanguage={ru:"ru-RU",en:"en-US",es:"es-ES"};

export function HomeDialogFirst({locale}:{locale:PublicLocale}){
  const t=text[locale];
  const [mode,setMode]=useState<Mode>("self");
  const [draft,setDraft]=useState("");
  const [speaking,setSpeaking]=useState(false);
  const [notice,setNotice]=useState("");
  const inputRef=useRef<HTMLTextAreaElement>(null);
  const speechRef=useRef<SpeechRecognitionLike|null>(null);
  const target=locale==="en"?"/":"/"+locale;
  const assistant="/"+locale+"/app/messages?section=ai&from=home";
  function startAli(value:string){
    const clean=value.trim().slice(0,HOME_INTENT_MAX_LENGTH);
    if(!clean){inputRef.current?.focus();return;}
    try{
      window.sessionStorage.setItem(HOME_INTENT_HANDOFF_KEY,JSON.stringify({
        locale,mode,text:clean,at:Date.now()
      }));
    }catch{
      setNotice(t.transferError);
      inputRef.current?.focus();
      return;
    }
    window.location.assign(assistant);
  }
  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();startAli(draft);
  }
  function toggleMic(){
    if(speechRef.current){speechRef.current.stop();speechRef.current=null;setSpeaking(false);return;}
    const speechWindow=window as Window & {
      SpeechRecognition?:SpeechRecognitionCtor;webkitSpeechRecognition?:SpeechRecognitionCtor
    };
    const Ctor=speechWindow.SpeechRecognition||speechWindow.webkitSpeechRecognition;
    if(!Ctor){inputRef.current?.focus();setNotice(t.micHint);return;}
    try{
      const recognition=new Ctor();
      recognition.lang=speechLanguage[locale];
      recognition.continuous=false;recognition.interimResults=false;
      recognition.onresult=event=>{
        const phrase=Array.from(event.results).map(result=>result[0]?.transcript||"").join(" ").trim();
        if(phrase)setDraft(previous=>(previous?previous+" ":"")+phrase);
      };
      recognition.onend=()=>{speechRef.current=null;setSpeaking(false);};
      recognition.onerror=()=>{speechRef.current=null;setSpeaking(false);setNotice(t.micHint);};
      speechRef.current=recognition;recognition.start();setSpeaking(true);setNotice("");
    }catch{speechRef.current=null;setSpeaking(false);inputRef.current?.focus();setNotice(t.micHint);}
  }
  const icons=[UserRound,PenLine,HeartHandshake];
  const businessIcons=[BriefcaseBusiness,BookOpen,Sparkles];
  return <main className={css.page} lang={locale} data-home-dialog-first data-home-intent-mode={mode}>
    <header className={css.header} data-home-first-header>
      <h1 className={css.title}>My Space</h1>
      <div className={css.headerActions}>
        <details className={css.language} data-home-language>
          <summary aria-label={t.lang}>{locale.toUpperCase()} <ChevronDown size={13} aria-hidden="true"/></summary>
          <nav className={css.languageLinks} aria-label={t.lang}>
            {(["ru","en","es"] as const).map(language=><Link key={language} lang={language} href={language==="en"?"/":"/"+language} prefetch={false}
              aria-current={language===locale?"page":undefined}>{language.toUpperCase()}</Link>)}
          </nav>
        </details>
        <div className={css.search} data-home-search><SiteSearch locale={locale} pathname={target}/></div>
        <details className={css.menu} data-home-menu>
          <summary aria-label={t.menu}><Menu size={23} aria-hidden="true"/></summary>
          <nav className={css.menuLinks} aria-label={t.menu}>{MENU_PATHS.map((item,index)=>
            <Link key={item.key} href={"/"+locale+item.path} prefetch={false}>{MENU_TEXT[locale][index]}</Link>)}</nav>
        </details>
      </div>
    </header>
    <nav className={css.mode} aria-label={locale==="ru"?"Цель":locale==="es"?"Objetivo":"Purpose"} data-home-purpose-switch>
      <button type="button" aria-pressed={mode==="self"} onClick={()=>setMode("self")} data-home-purpose="self">{t.personal}</button>
      <button type="button" aria-pressed={mode==="business"} onClick={()=>setMode("business")} data-home-purpose="business">{t.business}</button>
    </nav>
    <section className={css.hero} data-home-conversation-hero aria-label={mode==="self"?t.title:t.businessTitle}>
      <Image className={css.photo} src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill sizes="(max-width: 760px) 100vw, 850px" priority unoptimized/>
      <div className={css.heroInner}>
        <h2 className={css.heading}>{mode==="self"?t.title:t.businessTitle}</h2>
        <p className={css.lead}>{mode==="self"?t.lead:t.businessLead}</p>
        <form className={css.form} onSubmit={submit} data-home-intent-form>
          <textarea ref={inputRef} className={css.textarea} rows={2} maxLength={HOME_INTENT_MAX_LENGTH}
            value={draft} onChange={event=>setDraft(event.currentTarget.value)} placeholder={t.placeholder}
            aria-label={t.placeholder} data-home-intent-input />
          <button className={css.mic} type="button" onClick={toggleMic} aria-pressed={speaking} aria-label={t.mic}
            data-home-intent-microphone><Mic size={22} aria-hidden="true"/></button>
          <button className={css.send} type="submit" disabled={!draft.trim()} aria-label={t.send}
            data-home-intent-submit><Send size={23} aria-hidden="true"/></button>
        </form>
        <p role="status" className={css.notice}>{notice||t.privacy}</p>
        <div className={css.suggestions} data-home-quick-intents>
          {(mode==="self"?t.selfIdeas:t.businessIdeas).map((label,index)=>{
            const Icon=(mode==="self"?icons:businessIcons)[index];
            return <button type="button" key={label} className={css.action}
              onClick={()=>startAli((mode==="self"?t.selfPrompts:t.businessPrompts)[index])}
              data-home-quick-intent={index}><Icon size={24} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span></button>;
          })}
        </div>
      </div>
    </section>
    <Link href={mode==="self"?"/"+(locale==="es"?"en":locale)+"/app/portrait":"/"+locale+"/practice"}
      className={css.continue} prefetch={false} data-home-continue>
      <Route size={25} aria-hidden="true"/><div>
        <strong>{mode==="self"?t.continueSelf:t.continueBusiness}</strong>
        <small>{mode==="self"?t.continueHint:t.workHint}</small>
      </div><ArrowRight size={20} aria-hidden="true"/>
    </Link>
    <section className={css.explore} aria-labelledby="home-more-topics">
      <h2 id="home-more-topics">{t.topics}</h2><p>{t.topicsHint}</p>
      <nav className={css.topicGrid} aria-label={t.topics}>
        {["/client/tests","/academy","/services"].map((path,index)=>
          <Link key={path} href={"/"+locale+path} prefetch={false} className={css.topic}>{t.topicLabels[index]}</Link>)}
      </nav>
    </section>
  </main>;
}
