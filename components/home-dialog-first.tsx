"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, HeartHandshake,
  Mic, Route, Send, Sparkles, WandSparkles } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import { encodeHomeAiHandoff, HOME_AI_HANDOFF_KEY } from "@/lib/home-ai-handoff.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-dialog-first.module.css";

type Mode = "self" | "business";
type Recognition = {
  lang:string;interimResults:boolean;continuous:boolean;
  onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null;
  onerror:(()=>void)|null;onend:(()=>void)|null;
  start:()=>void;stop:()=>void;
};
type SpeechWindow = Window & {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};

const COPY = {
  ru: {
    mode:"С чего начнём", self:"Для себя",business:"Для бизнеса",
    title:"Что вы хотите сделать сегодня?",
    businessTitle:"Что вы хотите создать для бизнеса?",
    lead:"Расскажите о своей идее, вопросе или о том, что хотите изменить.",
    businessLead:"От идеи и решения до собственной услуги, курса или видео.",
    placeholder:"Напишите, что у вас на уме…", send:"Начать разговор с Ali",
    mic:"Продиктовать сообщение", fallback:"Используйте микрофон клавиатуры или введите текст.",
    speechError:"Не удалось распознать речь. Попробуйте ещё раз или напишите сообщение.",
    privacy:"После отправки сообщение откроется в AI Assistant. Личный результат можно сохранить после входа.",
    choose:"Или начните с одного из вариантов",continue:"Продолжить мой путь",
    more:"Исследовать возможности",about:"О Holistic House",search:"Поиск и меню",
    selfStarts:[
      {label:"Разобраться в себе",prompt:"Хочу лучше разобраться в своей ситуации.",Icon:HeartHandshake},
      {label:"Создать что-то",prompt:"Хочу создать что-то своё. Помоги начать.",Icon:WandSparkles},
      {label:"Найти поддержку",prompt:"Хочу найти подходящую поддержку.",Icon:Sparkles},
    ],
    businessStarts:[
      {label:"Создать курс",prompt:"Хочу создать авторский курс для бизнеса. С чего начать?",Icon:BookOpen},
      {label:"Создать видео",prompt:"Хочу создать видео для своего проекта.",Icon:WandSparkles},
      {label:"Продвигать услуги",prompt:"Хочу представить свои услуги и найти клиентов.",Icon:BriefcaseBusiness},
    ],
  },
  en: {
    mode:"Choose your space",self:"For me",business:"For business",
    title:"What would you like to do today?",
    businessTitle:"What would you like to create for work?",
    lead:"Tell us about an idea, a question or something you'd like to change.",
    businessLead:"From a new idea to your own service, course or video.",
    placeholder:"What's on your mind?",send:"Start a conversation with Ali",
    mic:"Dictate your message",fallback:"Use your keyboard microphone, or type your message.",
    speechError:"Speech recognition stopped. Please try again or type.",
    privacy:"Sending opens your message in AI Assistant. Save private results only after sign-in.",
    choose:"Or start with one of these",continue:"Continue my path",
    more:"Explore more",about:"About Holistic House",search:"Search and menu",
    selfStarts:[
      {label:"Understand myself",prompt:"I'd like to better understand my situation.",Icon:HeartHandshake},
      {label:"Create something",prompt:"I'd like to create something of my own. Help me begin.",Icon:WandSparkles},
      {label:"Find support",prompt:"I'd like to find the right kind of support.",Icon:Sparkles},
    ],
    businessStarts:[
      {label:"Create a course",prompt:"I'd like to create a course for my business. Where do I start?",Icon:BookOpen},
      {label:"Create a video",prompt:"I'd like to create a video for my project.",Icon:WandSparkles},
      {label:"Offer services",prompt:"I'd like to publish my services and reach clients.",Icon:BriefcaseBusiness},
    ],
  },
  es: {
    mode:"Elige tu espacio",self:"Para mí",business:"Para negocios",
    title:"¿Qué te gustaría hacer hoy?",
    businessTitle:"¿Qué te gustaría crear para tu negocio?",
    lead:"Cuéntanos tu idea, pregunta o algo que quieras cambiar.",
    businessLead:"De una idea a un servicio, curso o vídeo propio.",
    placeholder:"¿Qué tienes en mente?",send:"Comenzar una conversación con Ali",
    mic:"Dictar mensaje",fallback:"Usa el micrófono del teclado o escribe.",
    speechError:"No se reconoció la voz. Prueba de nuevo o escribe.",
    privacy:"Al enviar, tu mensaje se abre en AI Assistant. Guarda resultados privados después de iniciar sesión.",
    choose:"O elige un comienzo",continue:"Continuar mi camino",
    more:"Explorar más",about:"Sobre Holistic House",search:"Buscar y menú",
    selfStarts:[
      {label:"Conocerme mejor",prompt:"Quiero comprender mejor mi situación.",Icon:HeartHandshake},
      {label:"Crear algo",prompt:"Quiero crear algo propio. Ayúdame a empezar.",Icon:WandSparkles},
      {label:"Encontrar apoyo",prompt:"Quiero encontrar apoyo adecuado.",Icon:Sparkles},
    ],
    businessStarts:[
      {label:"Crear un curso",prompt:"Quiero crear un curso para mi negocio. ¿Cómo empiezo?",Icon:BookOpen},
      {label:"Crear un vídeo",prompt:"Quiero crear un vídeo para mi proyecto.",Icon:WandSparkles},
      {label:"Ofrecer servicios",prompt:"Quiero publicar mis servicios y encontrar clientes.",Icon:BriefcaseBusiness},
    ],
  },
} as const;
export function HomeDialogFirst({locale}:{locale:PublicLocale}){
  const router=useRouter();
  const [mode,setMode]=useState<Mode>("self");
  const [draft,setDraft]=useState("");
  const [notice,setNotice]=useState("");
  const [listening,setListening]=useState(false);
  const recognitionRef=useRef<Recognition|null>(null);
  const inputRef=useRef<HTMLTextAreaElement|null>(null);
  const t=COPY[locale];
  const intro=mode==="self"?t.title:t.businessTitle;
  const starts=mode==="self"?t.selfStarts:t.businessStarts;

  function launch(question:string){
    const payload=encodeHomeAiHandoff({text:question,locale,mode});
    if(!payload){inputRef.current?.focus();return}
    try{window.sessionStorage.setItem(HOME_AI_HANDOFF_KEY,payload)}
    catch{setNotice(t.fallback);inputRef.current?.focus();return}
    // The message is NOT in the URL or referrer. Ali consumes it once in the
    // existing Messenger, with existing auth, model and consent safeguards.
    router.push("/"+locale+"/app/messages?section=ai");
  }
  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();launch(draft);
  }
  function dictate(){
    if(listening){recognitionRef.current?.stop();return}
    const speechWindow=window as SpeechWindow;
    const Constructor=speechWindow.SpeechRecognition||speechWindow.webkitSpeechRecognition;
    if(!Constructor){setNotice(t.fallback);inputRef.current?.focus();return}
    try{
      const engine=new Constructor();
      engine.lang=locale==="ru"?"ru-RU":locale==="es"?"es-ES":"en-US";
      engine.interimResults=false;engine.continuous=false;
      engine.onresult=event=>{
        const spoken=Array.from(event.results).map(result=>result[0]?.transcript||"").join(" ").trim();
        if(spoken)setDraft(previous=>(previous?previous+" ":"")+spoken.slice(0,1200));
      };
      engine.onerror=()=>{setNotice(t.speechError);setListening(false)};
      engine.onend=()=>{recognitionRef.current=null;setListening(false)};
      recognitionRef.current=engine;setNotice("");setListening(true);
      engine.start();
    }catch{setListening(false);setNotice(t.fallback);inputRef.current?.focus()}
  }
  const otherLocale=(value:PublicLocale)=>value==="en"?"/":"/"+value;
  return <section className={styles.root} data-hh-dialog-first lang={locale} data-home-mode={mode}>
    <header className={styles.header} data-hh-dialog-header>
      <Link href={otherLocale(locale)} prefetch={false} className={styles.brand}>My Space</Link>
      <div className={styles.headerTools}>
        <details className={styles.language} data-hh-home-language>
          <summary aria-label={locale==="ru"?"Выберите язык":"Choose a language"}>{locale.toUpperCase()}<ChevronDown size={14} aria-hidden="true"/></summary>
          <div className={styles.languages}>{(["ru","en","es"] as const).map(lang=>
            <Link key={lang} href={otherLocale(lang)} prefetch={false} lang={lang}
              aria-current={locale===lang?"page":undefined}>{lang.toUpperCase()}</Link>)}</div>
        </details>
        <SiteNavigation locale={locale} compact />
      </div>
    </header>
    <nav className={styles.switch} aria-label={t.mode} data-hh-home-business-switch>
      <button type="button" aria-pressed={mode==="self"} onClick={()=>setMode("self")}>
        <HeartHandshake size={19} aria-hidden="true"/>{t.self}
      </button>
      <button type="button" aria-pressed={mode==="business"} onClick={()=>setMode("business")}>
        <BriefcaseBusiness size={19} aria-hidden="true"/>{t.business}
      </button>
    </nav>
    <div className={styles.landscape} data-hh-dialog-first-hero>
      <div className={styles.heroCopy}>
        <h1>{intro}</h1>
        <p>{mode==="self"?t.lead:t.businessLead}</p>
      </div>
      <form className={styles.composer} onSubmit={submit} data-hh-home-composer>
        <label htmlFor="hh-home-dialog-text" className={styles.srOnly}>{t.placeholder}</label>
        <textarea id="hh-home-dialog-text" ref={inputRef} rows={2} maxLength={1200}
          value={draft} onChange={event=>setDraft(event.currentTarget.value)}
          onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){
            event.preventDefault();event.currentTarget.form?.requestSubmit()
          }}}
          placeholder={t.placeholder} autoComplete="off"/>
        <div className={styles.composerActions}>
          <button type="button" onClick={dictate} aria-pressed={listening} aria-label={t.mic}>
            <Mic size={20} aria-hidden="true"/>
          </button>
          <button type="submit" className={styles.send} aria-label={t.send} disabled={!draft.trim()}>
            <Send size={20} aria-hidden="true"/>
          </button>
        </div>
      </form>
      {notice&&<p className={styles.notice} role="alert">{notice}</p>}
      <p className={styles.privacy}>{t.privacy}</p>
    </div>
    <div className={styles.starters} role="group" aria-label={t.choose} data-hh-home-starters>
      {starts.map(item=><button type="button" key={item.label} onClick={()=>launch(item.prompt)}>
        <item.Icon size={23} strokeWidth={1.8} aria-hidden="true"/><span>{item.label}</span>
      </button>)}
    </div>
    <Link href={"/"+(locale==="es"?"en":locale)+"/app/portrait"} prefetch={false}
      className={styles.continue} data-hh-home-continue>
      <Route size={21} aria-hidden="true"/>{t.continue}<ArrowRight size={20} aria-hidden="true"/>
    </Link>
  </section>;
}
