"use client";
import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useRef, useState} from "react";
import {ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, CircleHelp, Coins, Flame, GraduationCap, Heart, Leaf, Menu, Mic, Play, Search, Shield, Sparkles, Sprout, Sun, TrendingUp, UserRound, WandSparkles, Zap} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import {shamanicaCategoryHref} from "@/lib/shamanica-recommendations.mjs";
import styles from "./shamanica-mobile.module.css";
import { ShamanicaBusinessContent } from "./shamanica-business-content";

type Goal="energy"|"relationships"|"money"|"growth";
type Method="remedies"|"artifacts"|"energy"|"rituals"|"learning";
const goals=["energy","relationships","money","growth"] as const;
const methods=["remedies","artifacts","energy","rituals","learning"] as const;
// Existing free Reiki course is an additional real entry, not a new paid offering.
const serviceCards=[...methods,"free"] as const;
const starts=["free","personal","object","course"] as const;
const icons={energy:Zap,relationships:Heart,money:Coins,growth:TrendingUp,remedies:Sprout,artifacts:Shield,rituals:WandSparkles,learning:GraduationCap,free:Sparkles,personal:Heart,object:Shield,course:BookOpen};
const images={
 remedies:"/images/holistic-house/distance-homeopathy.webp",
 artifacts:"/images/holistic-house/tao-fu-balance.webp",
 energy:"/images/holistic-house/reiki-approved-sunrise-v3.webp",
 rituals:"/images/holistic-house/mandala-gold-reference.webp",
 learning:"/images/holistic-house/books-library.webp",
 free:"/images/holistic-house/reiki-practitioner-sunrise.webp",
} as const;
// Three additional doors point to existing, published category-offer routes.
// They introduce no new products, prices, bookings or checkout flows.
const shelfExtras=[
 {id:"cleansing",category:"rituals",image:images.rituals,labels:{ru:"Очищение и защита",en:"Cleansing & protection",es:"Limpieza y protección"}},
 {id:"places",category:"artifacts",image:images.artifacts,labels:{ru:"Места силы и путешествия",en:"Power places & journeys",es:"Lugares de poder y viajes"}},
 {id:"soul",category:"energy",image:images.energy,labels:{ru:"Исцеление души",en:"Soul healing & guidance",es:"Sanación y guía interior"}}
] as const;
const copy={
ru:{
 subtitle:"Рейки, магия, энергия и развитие.",heroLead:"3 коротких вопроса · Практики Рейки, магии и развития",
 start:"Начать путь",pick:"Подобрать для меня",self:"Для себя",work:"Для бизнеса",help:"iHelp",
 quiz:["Что вам сейчас необходимо?","Какой способ вам ближе?","С чего хотите начать?"],
 goals:["Энергия и защита","Гармония в отношениях","Деньги","Личностное развитие"],
 methods:["Подбор препаратов","Артефакты и места силы","Энергетическая подкачка","Ритуалы и мандалы","Обучение"],
 starts:["Попробовать бесплатно","Личная поддержка","Выбрать инструмент","Пройти курс"],
 servicesTitle:"Ключевые услуги",services:{
 remedies:["Подбор препаратов","Гомеопатия и подбор"],
 artifacts:["Артефакты и места силы","Талисманы и места силы"],
 energy:["Энергоподдержка","Личные Рейки-сеансы"],
 rituals:["Ритуалы и талисманы","Для качеств и целей"],
 learning:["Обучение","Шаманизм, Рейки и магия"],
 free:["Практики Рейки","Бесплатное обучение"]},
 step:"Шаг",of:"из",back:"Назад",search:"Поиск",menu:"Меню"},
en:{
 subtitle:"Reiki, magic, energy & growth.",heroLead:"3 short questions · Reiki, magic & growth",
 start:"Start my path",pick:"Find my path",self:"For myself",work:"For business",help:"iHelp",
 quiz:["What do you need right now?","Which approach suits you?","How would you like to start?"],
 goals:["Energy & protection","Harmony in relationships","Money & prosperity","Personal growth"],
 methods:["Remedy guidance","Artefacts & power places","Energy support","Rituals & mandalas","Learning"],
 starts:["Try something free","One-to-one support","Choose a symbolic tool","Take a course"],
 servicesTitle:"Key services",services:{
 remedies:["Remedy guidance","Homeopathy advice"],
 artifacts:["Artefacts & places","Talismans & power places"],
 energy:["Energy support","Reiki sessions"],
 rituals:["Rituals & talismans","Mandalas & intentions"],
 learning:["Learning","Shamanism, Reiki & magic"],
 free:["Free Reiki practice","Introductory course"]},
 step:"Step",of:"of",back:"Back",search:"Search",menu:"Menu"},
es:{
 subtitle:"Reiki, magia, energía y desarrollo.",heroLead:"3 preguntas · Reiki, magia y desarrollo",
 start:"Iniciar camino",pick:"Encontrar mi camino",self:"Para mí",work:"Negocios",help:"iHelp",
 quiz:["¿Qué necesitas ahora?","¿Qué método prefieres?","¿Cómo quieres empezar?"],
 goals:["Energía y protección","Armonía en relaciones","Dinero y prosperidad","Desarrollo personal"],
 methods:["Orientación sobre remedios","Objetos y lugares de poder","Apoyo energético","Rituales y mandalas","Aprendizaje"],
 starts:["Probar gratis","Apoyo personal","Elegir herramienta","Hacer un curso"],
 servicesTitle:"Servicios principales",services:{
 remedies:["Orientación sobre remedios","Homeopatía personal"],
 artifacts:["Objetos y lugares","Talismanes y lugares de poder"],
 energy:["Apoyo energético","Sesiones personales de Reiki"],
 rituals:["Rituales y talismanes","Mandalas para tus objetivos"],
 learning:["Aprendizaje","Chamanismo, Reiki y magia"],
 free:["Reiki gratis","Curso introductorio"]},
 step:"Paso",of:"de",back:"Volver",search:"Buscar",menu:"Menú"}
} as const;

const mirrorCopy={
 ru:{
  tagline:"Ритуалы · Исцеление · Сакральные путешествия",
  intro:"Подберите шаманскую практику, ритуал или путешествие под свою цель, состояние или жизненную ситуацию.",
  play:"Посмотреть короткое видео о природе",or:"ИЛИ",next:"Далее",
  placeholder:"Опишите вашу цель или ситуацию…",dictate:"Открыть клавиатуру для диктовки",
  hint:"Необязательно. Текст остаётся на странице, рекомендации строятся по выбранному направлению."
 },
 en:{
  tagline:"Rituals · Healing · Sacred Journeys",
  intro:"Find the right shamanic practice, ritual or journey for your current goal, state or life situation.",
  play:"Play a short nature video",or:"OR",next:"Next",
  placeholder:"Describe your goal or situation…",dictate:"Open keyboard for dictation",
  hint:"Optional. Your text stays on this page; recommendations follow your selected path."
 },
 es:{
  tagline:"Rituales · Sanación · Viajes sagrados",
  intro:"Encuentra una práctica chamánica, ritual o viaje acorde con tu objetivo o situación actual.",
  play:"Reproducir un vídeo breve de naturaleza",or:"O",next:"Siguiente",
  placeholder:"Describe tu objetivo o situación…",dictate:"Abrir teclado para dictar",
  hint:"Opcional. El texto permanece en esta página; las recomendaciones siguen la opción elegida."
 }
} as const;
const quizPhotos={
 energy:"/images/holistic-house/reiki-practitioner-sunrise.webp",
 relationships:"/videos/holistic-house/film-collection-v3/heart-flow.jpg",
 money:"/videos/holistic-house/money-films-v1/abundance-tree.jpg",
 growth:"/videos/holistic-house/film-collection-v3/forest-renewal.jpg",
 remedies:"/images/holistic-house/distance-homeopathy.webp",
 artifacts:"/images/holistic-house/tao-fu-balance.webp",
 rituals:"/images/holistic-house/mandala-gold-reference.webp",
 learning:"/images/holistic-house/books-library.webp",
 free:"/images/holistic-house/reiki-practitioner-sunrise.webp",
 personal:"/images/holistic-house/reiki-approved-sunrise-v3.webp",
 object:"/images/holistic-house/tao-fu-balance.webp",
 course:"/images/holistic-house/books-library.webp"
} as const;

export function ShamanicaMobile({locale,audience="self"}:{locale:PublicLocale;audience?:"self"|"business"}){
 const business=audience==="business";
 const router=useRouter(),t=copy[locale];
 const [step,setStep]=useState(0);
 const [goal,setGoal]=useState<Goal>("energy");
 const [method,setMethod]=useState<Method>("energy");
 const [startChoice,setStartChoice]=useState<(typeof starts)[number]>("personal");
 const [intention,setIntention]=useState("");
 const [videoPlaying,setVideoPlaying]=useState(false);
 const inputRef=useRef<HTMLInputElement|null>(null);
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const mirror=mirrorCopy[locale];
 const choose=(choice:string)=>{
  if(step===0)setGoal(choice as Goal);
  else if(step===1)setMethod(choice as Method);
  else setStartChoice(choice as (typeof starts)[number]);
 };
 // Optional words help select an existing focus locally; private free text
 // is never sent in a URL, analytics event or external provider request.
 const describe=(value:string)=>{
  setIntention(value);
  const words=value.toLowerCase();
  if(/love|relation|family|partner|любов|отнош|семь|партн|amor|relaci|famil/.test(words))setGoal("relationships");
  else if(/money|financ|business|career|денег|деньг|финанс|бизнес|работ|dinero|negocio|econom/.test(words))setGoal("money");
  else if(/learn|grow|develop|meaning|разв|обуч|путь|crecim|aprend|desarroll/.test(words))setGoal("growth");
  else if(/energy|protect|healing|health|энерг|защит|сил|здоров|energ|protec|salud/.test(words))setGoal("energy");
 };
 const advance=()=>{
  if(step<2){setStep(value=>value+1);return;}
  const qs=new URLSearchParams({goal,method,start:startChoice});
  router.push("/"+locale+"/shamanica/results?"+qs.toString());
 };
 const playIntro=()=>{
  setVideoPlaying(true);
  // Playback starts only in a user gesture. Safari's native controls remain
  // available if playback requires a second tap.
  void videoRef.current?.play().catch(()=>{});
 };
 const choices=step===0?goals.map((id,i)=>({id,label:t.goals[i]}))
  :step===1?methods.map((id,i)=>({id,label:t.methods[i]}))
  :starts.map((id,i)=>({id,label:t.starts[i]}));
 const chosen=step===0?goal:step===1?method:startChoice;
 return <main className={styles.page} lang={locale} data-shamanica-mobile data-shamanica-audience={business?"business":"self"} data-shamanica-business-page={business?"true":undefined}>
  <div className={styles.container}>
   <header className={styles.header}>
    <Link className={styles.brand} href={locale==="en"?"/":"/"+locale} prefetch={false}><Leaf size={33} strokeWidth={1.8} aria-hidden="true"/><span>Holistic House{!business&&<small className={styles.brandSub}>{locale==="ru"?"ШАМАНИК":"SHAMANIC"}</small>}</span></Link>
    <div className={styles.tools}>
     <label className={styles.lang}>
      <span className={styles.srOnly}>Language</span>
      <select aria-label="Language" value={locale} onChange={e=>router.push("/"+e.target.value+"/shamanica"+(business?"/business":""))}>
       <option value="en">EN</option><option value="ru">RU</option><option value="es">ES</option>
      </select><ChevronDown size={15} aria-hidden="true"/>
     </label>
     <Link className={styles.iconButton} href={"/"+locale+"/explore"} aria-label={t.search} prefetch={false}><Search size={22}/></Link>
     {!business&&<button type="button" className={styles.helpButton} aria-label={t.help} onClick={()=>window.dispatchEvent(new Event("hh:open-ihelp"))}><CircleHelp size={22} aria-hidden="true"/></button>}
     {!business&&<Link className={styles.profileButton} href={"/"+(locale==="es"?"en":locale)+"/app/portrait"} aria-label={locale==="ru"?"Профиль":locale==="es"?"Perfil":"Profile"} prefetch={false}><UserRound size={23}/></Link>}
     <details className={styles.menu}><summary className={styles.iconButton} aria-label={t.menu}><Menu size={22}/></summary>
      <nav className={styles.menuPop}><Link href={locale==="en"?"/":"/"+locale}>{t.self}</Link><Link href={"/"+locale+"/shamanica/business"}>{t.work}</Link><Link href={"/"+locale+"/academy"}>{t.services.learning[0]}</Link><Link href={"/"+locale+"/explore"}>{t.search}</Link></nav>
     </details>
    </div>
   </header>
   <nav className={styles.audiences} aria-label="Audience">
    <Link className={!business?styles.audienceActive:undefined} aria-current={!business?"page":undefined} href={"/"+locale+"/shamanica"}><Heart size={18}/>{t.self}</Link>
    <Link className={business?styles.audienceActive:undefined} aria-current={business?"page":undefined} href={"/"+locale+"/shamanica/business"}><BriefcaseBusiness size={18}/>{t.work}</Link>
    {business?<button type="button" data-shamanica-ihelp-trigger aria-label={t.help} onClick={()=>window.dispatchEvent(new Event("hh:open-ihelp"))}><Sparkles size={18}/>{t.help}</button>:<Link href={"/"+locale+"/holistic-support/mobile"}><Sparkles size={18}/>{t.help}</Link>}
   </nav>
   {business?<ShamanicaBusinessContent locale={locale}/>:<>
   <section className={styles.hero} aria-labelledby="shamanica-hero-title">
    <div className={styles.mirrorIntro}>
     <span className={styles.mirrorSymbol} aria-hidden="true"><Sun size={23} strokeWidth={1.45}/><Sparkles size={15}/></span>
     <h1 id="shamanica-hero-title">{locale==="ru"?"Кабинет алхимика":locale==="es"?"Gabinete del alquimista":"Alchemist’s Cabinet"}</h1>
     <p className={styles.mirrorTagline}>{mirror.tagline}</p>
     <p className={styles.mirrorLead}>{mirror.intro}</p>
    </div>
    <div className={styles.mirrorLaptop}>
     <div className={styles.mirrorScreen}>
      <video ref={videoRef} className={styles.mirrorVideo}
       poster="/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg"
       src="/videos/holistic-house/film-collection-v3/sun-autumn-hills.mp4"
       preload="none" playsInline controls={videoPlaying} onEnded={()=>setVideoPlaying(false)}
       aria-label={mirror.play}/>
      {!videoPlaying&&<>
       <span className={styles.mirrorDrum} aria-hidden="true"><Sun size={38} strokeWidth={1.1}/></span>
       <span className={styles.mirrorFire} aria-hidden="true"><Flame size={27} strokeWidth={1.4}/></span>
       <button type="button" className={styles.mirrorPlay} onClick={playIntro} aria-label={mirror.play}>
        <Play size={30} fill="currentColor" strokeWidth={1.1} aria-hidden="true"/>
       </button>
      </>}
     </div>
     <div className={styles.mirrorBase} aria-hidden="true"/>
    </div>
   </section>
   <section id="shamanica-quiz" className={styles.quiz} data-shamanica-quiz data-quiz-step={step+1} aria-labelledby="shamanica-quiz-question">
    <div className={styles.quizTop}>
     <span className={styles.stepLabel}>{t.step} {step+1} {t.of} 3</span>
     <span className={styles.progress} aria-label={t.step+" "+(step+1)+" / 3"}>
      {[0,1,2].map(i=><span key={i} className={i<=step?styles.progressOn:""}/>)}
     </span>
    </div>
    <div className={styles.quizTitleRow}>
     {step>0&&<button className={styles.quizBack} type="button" onClick={()=>setStep(value=>Math.max(0,value-1))} aria-label={t.back}>‹</button>}
     <h2 id="shamanica-quiz-question" aria-live="polite">{t.quiz[step]}</h2>
    </div>
    <div className={styles.answers} role="group" aria-label={t.quiz[step]}>
     {choices.map(({id,label})=>{
      const Icon=icons[id as keyof typeof icons];
      return <button type="button" key={id} onClick={()=>choose(id)} data-shamanica-answer={id} aria-pressed={chosen===id}
       className={styles.answer+" "+(chosen===id?styles.answerSelected:"")}>
       <span className={styles.answerPhoto}><Image src={quizPhotos[id as keyof typeof quizPhotos]} alt="" fill sizes="(max-width:640px) 45vw, 240px"/></span>
       <span className={styles.answerText}><Icon size={24} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span></span>
      </button>;
     })}
    </div>
    {step===0&&<>
     <div className={styles.orSeparator}><span>{mirror.or}</span></div>
     <div className={styles.requestField}>
      <Sparkles size={21} aria-hidden="true"/>
      <input ref={inputRef} type="text" value={intention} onChange={event=>describe(event.target.value)}
       maxLength={280} placeholder={mirror.placeholder} aria-label={mirror.placeholder}/>
      <button type="button" onClick={()=>inputRef.current?.focus()} aria-label={mirror.dictate}><Mic size={23}/></button>
     </div>
     <p className={styles.inputHint}>{mirror.hint}</p>
    </>}
    <button type="button" className={styles.nextButton} data-shamanica-next onClick={advance}>
     {mirror.next}<ArrowRight size={24} aria-hidden="true"/>
    </button>
   </section>
   <section className={styles.services} data-shamanica-cabinet-shelves aria-labelledby="shamanica-services-title">
    <div className={styles.servicesHeading}><h2 className={styles.sectionTitle} id="shamanica-services-title">{t.servicesTitle}</h2><Link href={"/"+locale+"/shamanica/business"} prefetch={false} className={styles.businessLink}>{t.work}<ArrowRight size={17} aria-hidden="true"/></Link></div>
    <div className={styles.serviceGrid}>{serviceCards.map(id=>{const Icon=icons[id];return <Link key={id} href={id==="free"?"/"+locale+"/academy/principles-of-energywork/learn":shamanicaCategoryHref(locale,id)} prefetch={false} className={styles.serviceCard} data-shamanica-service={id}>
      <div className={styles.servicePhoto}><Image src={images[id]} alt="" fill sizes="(max-width:600px) 33vw, 300px"/></div>
      <span className={styles.serviceIcon}><Icon size={21} strokeWidth={1.8}/></span>
      <div className={styles.serviceBody}><h3>{t.services[id][0]}</h3><p>{t.services[id][1]}</p></div>
      <span className={styles.serviceArrow} aria-hidden="true"><ArrowRight size={20}/></span>
    </Link>})}
    {shelfExtras.map(({id,category,image,labels})=><Link key={id} href={shamanicaCategoryHref(locale,category)}
     prefetch={false} className={styles.serviceCard+" "+styles.shelfExtra} data-shamanica-service={id}
     data-shamanica-shelf-quick-link={category}>
      <div className={styles.servicePhoto}><Image src={image} alt="" fill sizes="(max-width:600px) 33vw, 240px"/></div>
      <div className={styles.serviceBody}><h3>{labels[locale]}</h3></div>
      <span className={styles.serviceArrow} aria-hidden="true"><ArrowRight size={20}/></span>
    </Link>)}</div>
   </section>
   </>}
  </div>
 </main>;
}
