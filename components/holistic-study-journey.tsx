"use client";

import Image from "next/image";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {ArrowRight,BookOpen,Check,ChevronRight,Flower2,GraduationCap,Heart,MessageCircle,RotateCcw,Sparkles,UserRound,Zap} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {LearningCatalogItem} from "@/components/holistic-support-learning-catalog";
import {rankPublishedStudyCourses,studyGoalHasDirectMatch} from "@/lib/holistic-support/study-recommendations.mjs";
import styles from "./holistic-study-journey.module.css";

type StepKey="goal"|"format"|"time"|"level"|"support";
type Answers=Partial<Record<StepKey,string>>;
type StudyGoal="stress"|"relationships"|"energy"|"growth";
type Tab="courses"|"programs"|"sessions"|"masters";
type Question={key:StepKey,title:string,choices:readonly [string,string][]};
type StudyText={title:string,intro:string,step:string,stepOf:string,next:string,ready:string,retry:string,recommended:string,note:string,related:string,all:string,free:string,ask:string,tabs:Record<Tab,string>,questions:readonly Question[],sessions:string,sessionsText:string,masters:string,mastersText:string};
const COPY:Record<PublicLocale,StudyText>={
 ru:{
  title:"Ваш путь обучения",intro:"Ответьте на несколько вопросов, чтобы мы подобрали для вас лучшие курсы.",
  step:"Шаг",stepOf:"из",next:"Далее",ready:"Подборка готова",retry:"Пройти заново",
  recommended:"Рекомендовано для вас",note:"Подборка курсов на основе ваших ответов.",
  related:"Близкие варианты: точного совпадения пока нет",all:"Все курсы Академии",free:"Бесплатно",ask:"Уточнить условия",
  tabs:{courses:"Курсы",programs:"Программы",sessions:"Сессии",masters:"Мастера"},
  sessions:"Личные сессии",sessionsText:"Консультации и индивидуальная поддержка в каталоге услуг.",
  masters:"Наши мастера",mastersText:"Опубликованные профили мастеров и способы связи.",
  questions:[
   {key:"goal",title:"Какая ваша главная цель?",choices:[["stress","Снять стресс"],["relationships","Отношения"],["energy","Энергия"],["growth","Развитие"]]},
   {key:"format",title:"Как удобнее учиться?",choices:[["practice","Практики"],["course","Видеокурс"],["guided","Программа"],["personal","С мастером"]]},
   {key:"time",title:"Сколько времени есть?",choices:[["short","10 минут в день"],["medium","20–30 минут"],["long","Полный курс"],["flexible","Без графика"]]},
   {key:"level",title:"Ваш опыт?",choices:[["new","Начинаю"],["some","Немного знаком"],["experienced","Есть практика"],["professional","Хочу преподавать"]]},
   {key:"support",title:"Какая поддержка нужна?",choices:[["self","Самостоятельно"],["video","Видеоуроки"],["teacher","С наставником"],["unsure","Пока не знаю"]]}
  ]
 },
 en:{
  title:"Your learning path",intro:"Answer a few questions to find courses that fit you.",
  step:"Step",stepOf:"of",next:"Next",ready:"Your selection is ready",retry:"Start again",
  recommended:"Recommended for you",note:"Published learning options based on your answers.",
  related:"Related options: no exact match is available",all:"All Academy courses",free:"Free",ask:"Ask about conditions",
  tabs:{courses:"Courses",programs:"Programs",sessions:"Sessions",masters:"Teachers"},
  sessions:"One-to-one sessions",sessionsText:"Consultations and individual support in the Services catalog.",
  masters:"Our practitioners",mastersText:"Published practitioner profiles and contact options.",
  questions:[
   {key:"goal",title:"What is your main goal?",choices:[["stress","Reduce stress"],["relationships","Relationships"],["energy","More energy"],["growth","Learn and grow"]]},
   {key:"format",title:"How would you like to learn?",choices:[["practice","Practices"],["course","Video course"],["guided","Program"],["personal","With a teacher"]]},
   {key:"time",title:"How much time do you have?",choices:[["short","10 min daily"],["medium","20–30 min"],["long","Full course"],["flexible","Flexible"]]},
   {key:"level",title:"What is your experience?",choices:[["new","Beginner"],["some","Some experience"],["experienced","Regular practice"],["professional","Want to teach"]]},
   {key:"support",title:"Which support suits you?",choices:[["self","Self-guided"],["video","Video lessons"],["teacher","With a teacher"],["unsure","Not sure yet"]]}
  ]
 },
 es:{
  title:"Tu camino de aprendizaje",intro:"Responde unas preguntas para encontrar cursos adecuados.",
  step:"Paso",stepOf:"de",next:"Siguiente",ready:"Tu selección está lista",retry:"Empezar de nuevo",
  recommended:"Recomendado para ti",note:"Cursos publicados según tus respuestas.",
  related:"Opciones relacionadas: no hay coincidencia exacta",all:"Todos los cursos",free:"Gratis",ask:"Consultar condiciones",
  tabs:{courses:"Cursos",programs:"Programas",sessions:"Sesiones",masters:"Maestros"},
  sessions:"Sesiones personales",sessionsText:"Consultas y apoyo individual en el catálogo de Servicios.",
  masters:"Nuestros maestros",mastersText:"Perfiles de maestros publicados y opciones de contacto.",
  questions:[
   {key:"goal",title:"¿Cuál es tu objetivo?",choices:[["stress","Reducir el estrés"],["relationships","Relaciones"],["energy","Más energía"],["growth","Aprender y crecer"]]},
   {key:"format",title:"¿Cómo prefieres aprender?",choices:[["practice","Prácticas"],["course","Videocurso"],["guided","Programa"],["personal","Con maestro"]]},
   {key:"time",title:"¿Cuánto tiempo tienes?",choices:[["short","10 min diarios"],["medium","20–30 minutos"],["long","Curso completo"],["flexible","Flexible"]]},
   {key:"level",title:"¿Qué experiencia tienes?",choices:[["new","Principiante"],["some","Algo de experiencia"],["experienced","Practico a menudo"],["professional","Quiero enseñar"]]},
   {key:"support",title:"¿Qué apoyo prefieres?",choices:[["self","Por mi cuenta"],["video","Videolecciones"],["teacher","Con maestro"],["unsure","No lo sé"]]}
  ]
 }
};
const icons=[Flower2,Heart,Zap,GraduationCap];
const tabs:readonly Tab[]=["courses","programs","sessions","masters"];
function opora(locale:PublicLocale):LearningCatalogItem{
 const title={ru:"ОПОРА: 14 дней антистресса",en:"OPORA · 14-day anti-stress course",es:"OPORA · 14 días antiestrés"};
 const description={ru:"Короткие ежедневные практики для спокойствия и внутренней опоры.",en:"Short daily practices for calm and inner stability.",es:"Prácticas breves para la calma y el equilibrio."};
 return {id:"study-opora",title:title[locale],description:description[locale],href:"/"+locale+"/courses/antistress",image:"/images/holistic-house/course-start-heron.webp",direction:"temple",topic:"other",kind:"course",cost:"free",lessons:14};
}
function priceLabel(item:LearningCatalogItem,locale:PublicLocale,t:StudyText):string{
 if(item.cost==="free")return t.free;
 if(item.cost==="priced" && item.price?.currency && Number.isFinite(item.price.amount))
   return new Intl.NumberFormat(locale,{style:"currency",currency:item.price.currency}).format(item.price.amount);
 return t.ask;
}
function safeHref(item:LearningCatalogItem,locale:PublicLocale):string{
 return item.id==="reiki-practitioner" ? item.href.replace(/^\/en\//,"/"+locale+"/") : item.href;
}
export function HolisticStudyJourney({locale,learningItems,defaultGoal,headingLevel=2}:{locale:PublicLocale;learningItems:LearningCatalogItem[];defaultGoal?:StudyGoal;headingLevel?:1|2}){
 const t=COPY[locale];
 const [step,setStep]=useState(0);
 const [answers,setAnswers]=useState<Answers>(defaultGoal?{goal:defaultGoal}:{});
 const [hydrated,setHydrated]=useState(false);
 useEffect(()=>setHydrated(true),[]);
 const [finished,setFinished]=useState(false);
 const [tab,setTab]=useState<Tab>("courses");
 const question=t.questions[step], selected=answers[question.key];
 const Heading=headingLevel===1?"h1":"h2";
 const allItems=useMemo(()=>[opora(locale),...learningItems],[locale,learningItems]);
 const ranked=useMemo(()=>rankPublishedStudyCourses(allItems,answers,tab==="programs"?"programs":"courses"),[allItems,answers,tab]);
 const exact=studyGoalHasDirectMatch(ranked,answers.goal);
 const completed=t.questions.filter(q=>Boolean(answers[q.key])).length;
 const answer=(value:string)=>{setAnswers(old=>({...old,[question.key]:value}));setFinished(false);};
 const next=()=>{if(!selected)return;if(step<4)setStep(s=>s+1);else setFinished(true);};
 const reset=()=>{setStep(0);setAnswers({});setFinished(false);setTab("courses");};
 return <div className={styles.root} data-study-personalized-path data-study-step={step+1}
   data-study-hydrated={hydrated?"true":"false"}
   data-study-active-goal={answers.goal??"none"}
   data-study-finished={finished?"true":"false"}>
   <section className={styles.hero} aria-label={t.title}>
    <div className={styles.heroTop}>
     <Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill sizes="(max-width:600px) 100vw,660px" className={styles.heroPhoto} priority />
     <span className={styles.heroTint} aria-hidden="true" />
     <div className={styles.heroCopy}>
      <Heading>{t.title}</Heading><p>{t.intro}</p>
      <nav className={styles.progress} aria-label={t.step+" "+(step+1)+" / 5"}>
       {t.questions.map((q,i)=><button key={q.key} type="button" className={styles.progressStep}
         data-active={i===step} data-done={i!==step&&Boolean(answers[q.key])}
         disabled={!hydrated||i>completed||(i>0&&!answers[t.questions[i-1].key])}
         aria-label={t.step+" "+(i+1)+": "+q.title} aria-current={i===step?"step":undefined}
         onClick={()=>{setStep(i);setFinished(false);}}><span>{i+1}</span></button>)}
      </nav>
     </div>
    </div>
    <div className={styles.quiz}>
     <div className={styles.questionRow}><span className={styles.stepLabel}>{t.step} {step+1} {t.stepOf} 5</span><h3>{question.title}</h3></div>
     <div className={styles.answerGrid} role="group" aria-label={question.title}>
      {question.choices.map(([id,label],i)=>{const Icon=step===0?icons[i]:null;return <button key={id} type="button" className={styles.answer} aria-pressed={selected===id} disabled={!hydrated} onClick={()=>answer(id)}>
       {Icon?<Icon size={25} strokeWidth={1.8} aria-hidden="true"/>:null}<span>{label}</span>
       {selected===id?<Check className={styles.check} size={15} strokeWidth={3} aria-hidden="true"/>:null}
      </button>;})}
     </div>
     <button type="button" className={styles.next} onClick={next} disabled={!selected||!hydrated} data-study-next>{step===4?t.ready:t.next}<ArrowRight size={20} aria-hidden="true"/></button>
    </div>
   </section>
   <section className={styles.recommendations} aria-labelledby="study-recommended-title">
    <header className={styles.recommendationHeader}>
     <span className={styles.sparkle}><Sparkles size={25} aria-hidden="true"/></span>
     <span className={styles.headerCopy}><h2 id="study-recommended-title">{t.recommended}</h2><p>{t.note}</p></span>
     {finished?<button type="button" className={styles.restart} onClick={reset} aria-label={t.retry}><RotateCcw size={16} aria-hidden="true"/></button>:null}
    </header>
    <div className={styles.categoryTabs} role="group" aria-label={t.recommended}>
      {tabs.map(id=><button type="button" key={id} className={styles.categoryTab} aria-pressed={tab===id} onClick={()=>setTab(id)}>{t.tabs[id]}</button>)}
    </div>
    {(tab==="courses"||tab==="programs")?<div className={styles.results} aria-live="polite">
      {answers.goal&&!exact?<p className={styles.related}>{t.related}</p>:null}
      {ranked.slice(0,3).map(item=><Link href={safeHref(item,locale)} prefetch={false} key={item.id} className={styles.courseCard} data-study-recommendation={item.id}>
       <span className={styles.coursePhoto}>{item.image?<Image src={item.image} alt="" fill unoptimized sizes="(max-width:600px) 36vw,230px"/>:<BookOpen size={36} aria-hidden="true"/>}</span>
       <span className={styles.courseContent}>
         <span className={styles.courseType}>{t.tabs[tab]}{item.lessons?" · "+item.lessons:""}</span>
         <strong className={styles.courseTitle}>{item.title}</strong>
         <span className={styles.courseDescription}>{item.description}</span>
         <span className={styles.coursePrice}>{priceLabel(item,locale,t)}</span>
       </span><span className={styles.openCircle}><ChevronRight size={22} aria-hidden="true"/></span>
      </Link>)}
      <Link className={styles.academyLink} href={"/"+locale+"/academy"} prefetch={false}>{t.all}<ArrowRight size={17} aria-hidden="true"/></Link>
    </div>:<Link href={"/"+locale+"/"+(tab==="sessions"?"services":"masters")} className={styles.directoryCard} prefetch={false}>
      {tab==="sessions"?<MessageCircle size={30} aria-hidden="true"/>:<UserRound size={30} aria-hidden="true"/>}
      <span><strong>{tab==="sessions"?t.sessions:t.masters}</strong><small>{tab==="sessions"?t.sessionsText:t.mastersText}</small></span>
      <ChevronRight size={24} aria-hidden="true"/>
    </Link>}
   </section>
 </div>;
}
