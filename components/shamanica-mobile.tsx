"use client";
import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, Coins, GraduationCap, Heart, Leaf, Menu, Search, Shield, Sparkles, Sprout, Sun, TrendingUp, UserRound, WandSparkles, Zap} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import {shamanicaServiceHref} from "@/lib/shamanica-recommendations.mjs";
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
const copy={
ru:{
 subtitle:"Рейки, магия, энергия и развитие.",heroLead:"3 коротких вопроса · Практики Рейки, магии и развития",
 start:"Начать путь",pick:"Подобрать для меня",self:"Для себя",work:"Для бизнеса",help:"iHelp",
 quiz:["Что вы хотите получить сейчас?","Какой способ вам ближе?","С чего хотите начать?"],
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
 quiz:["What would you like to gain?","Which approach suits you?","How would you like to start?"],
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
 quiz:["¿Qué deseas conseguir ahora?","¿Qué método prefieres?","¿Cómo quieres empezar?"],
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
export function ShamanicaMobile({locale,audience="self"}:{locale:PublicLocale;audience?:"self"|"business"}){
 const business=audience==="business";
 const router=useRouter(),t=copy[locale];
 const [step,setStep]=useState(0);
 const [goal,setGoal]=useState<Goal>("energy");
 const [method,setMethod]=useState<Method>("energy");
 const select=(choice:string)=>{
  if(step===0){setGoal(choice as Goal);setStep(1);return;}
  if(step===1){setMethod(choice as Method);setStep(2);return;}
  const qs=new URLSearchParams({goal,method,start:choice});
  router.push("/"+locale+"/shamanica/results?"+qs.toString());
 };
 const choices=step===0?goals.map((id,i)=>({id,label:t.goals[i]}))
  :step===1?methods.map((id,i)=>({id,label:t.methods[i]}))
  :starts.map((id,i)=>({id,label:t.starts[i]}));
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
    <Image src="/images/holistic-house/hero-olive-incense.webp" fill priority alt="" sizes="(max-width:640px) 100vw, 920px" className={styles.heroImg}/>
    <div className={styles.heroText}><span className={styles.eyebrow}>HOLISTIC HOUSE</span><h1 id="shamanica-hero-title"><span className={styles.heroDesktopName}>{locale==="ru"?"Шаманик":"Shamanic"}</span><span className={styles.heroMobileName}>{locale==="ru"?"Найдите свой путь":locale==="es"?"Encuentra tu camino":"Find Your Path"}</span></h1><p className={styles.heroSubtitle}>{t.subtitle}</p><p className={styles.heroLead}>{t.heroLead}</p></div>
    <div className={styles.heroActions}>
     <a href="#shamanica-quiz" className={styles.primary}>{t.start}<ArrowRight size={19}/></a>
     <a href="#shamanica-quiz" className={styles.secondary}><Sparkles size={19}/>{t.pick}</a>
    </div>
   </section>
   <section id="shamanica-quiz" className={styles.quiz} data-shamanica-quiz data-quiz-step={step+1} aria-labelledby="shamanica-quiz-question">
    <div className={styles.quizTop}><span className={styles.stepLabel}>{t.step} {step+1} {t.of} 3</span>
     <span className={styles.progress} aria-label={t.step+" "+(step+1)+" / 3"}>{[0,1,2].map(i=><span key={i} className={i<=step?styles.progressOn:""}/>)}</span>
    </div>
    <div className={styles.quizTitleRow}>{step>0?<button className={styles.quizBack} type="button" onClick={()=>setStep(v=>v-1)} aria-label={t.back}>‹</button>:null}
     <h2 id="shamanica-quiz-question" aria-live="polite">{t.quiz[step]}</h2></div>
    <div className={styles.answers} role="group" aria-label={t.quiz[step]}>
     {choices.map(({id,label})=>{const Icon=icons[id as keyof typeof icons];return <button type="button" key={id} onClick={()=>select(id)} data-shamanica-answer={id}
       className={styles.answer+" "+(styles[("answer_"+id) as keyof typeof styles]||"")}><Icon size={26} strokeWidth={1.9} aria-hidden="true"/><span>{label}</span></button>})}
    </div>
   </section>
   <section className={styles.services} aria-labelledby="shamanica-services-title">
    <div className={styles.servicesHeading}><h2 className={styles.sectionTitle} id="shamanica-services-title">{t.servicesTitle}</h2><Link href={"/"+locale+"/shamanica/business"} prefetch={false} className={styles.businessLink}>{t.work}<ArrowRight size={17} aria-hidden="true"/></Link></div>
    <div className={styles.serviceGrid}>{serviceCards.map(id=>{const Icon=icons[id];return <Link key={id} href={id==="free"?"/"+locale+"/academy/principles-of-energywork/learn":shamanicaServiceHref(locale,id)} prefetch={false} className={styles.serviceCard} data-shamanica-service={id}>
      <div className={styles.servicePhoto}><Image src={images[id]} alt="" fill sizes="(max-width:600px) 33vw, 300px"/></div>
      <span className={styles.serviceIcon}><Icon size={21} strokeWidth={1.8}/></span>
      <div className={styles.serviceBody}><h3>{t.services[id][0]}</h3><p>{t.services[id][1]}</p></div>
      <span className={styles.serviceArrow} aria-hidden="true"><ArrowRight size={20}/></span>
    </Link>})}</div>
   </section>
   </>}
  </div>
 </main>;
}
