"use client";
import Link from "next/link";
import Image from "next/image";
import {useState} from "react";
import {ArrowLeft, ArrowRight, ClipboardCheck, Compass, Gem, Search, Sprout, Target, TrendingUp, UserRound, Users} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import {BUSINESS_SERVICES,shamanicaBusinessHref,shamanicaBusinessRecommendations} from "@/lib/shamanica-business.mjs";
import {MandatoryMessengerActions} from "@/components/mandatory-messenger-actions";
import {whatsappEnquiryUrl} from "@/lib/whatsapp-enquiry";
import {telegramBusinessStrategyRequestUrl,telegramServiceRequestUrl} from "@/lib/assist/telegram-business-request.mjs";
import styles from "./shamanica-business-content.module.css";

const goalChoices=[{id:"express",Icon:Search},{id:"analysis",Icon:TrendingUp},{id:"team",Icon:Users},{id:"leader",Icon:UserRound}] as const;
const concernChoices=[{id:"unclear",Icon:Search},{id:"decision",Icon:Compass},{id:"conflict",Icon:Users},{id:"resources",Icon:Sprout}] as const;
const startChoices=[{id:"free",Icon:ClipboardCheck},{id:"consultation",Icon:UserRound},{id:"team",Icon:Users},{id:"tools",Icon:Gem}] as const;
const businessShelves=[
 {id:"express",target:"express",Icon:Search,image:"/images/holistic-house/report-lighthouse-coast.webp",routes:["express","support","analysis","analysis"]},
 {id:"remedies",target:"remedies",Icon:Sprout,image:"/images/holistic-house/distance-homeopathy.webp",routes:["remedies","remedies","remedies","remedies"]},
 {id:"strategy",target:"analysis",Icon:TrendingUp,image:"/images/holistic-house/books-library.webp",routes:["analysis","support","team","leader"]},
 {id:"artifacts",target:"artifacts",Icon:Gem,image:"/images/holistic-house/tao-fu-balance.webp",routes:["artifacts","artifacts","artifacts","artifacts"]},
 {id:"energy",target:"support",Icon:Target,image:"/images/holistic-house/reiki-approved-sunrise-v3.webp",routes:["remote-energy","remote-energy","artifacts","remote-energy"]},
 {id:"energywork",target:"team",Icon:Users,image:"/images/holistic-house/homepage-constellations.svg",routes:["team","remote-energy","ritual","team"]}
] as const;
const businessDetailHref=(locale:PublicLocale,id:string)=>{
 if(id==="remote-energy")return "/"+locale+"/services/remote-energy-support";
 if(id==="ritual")return "/"+locale+"/holistic-support/mandala";
 return shamanicaBusinessHref(locale,id);
};
const businessArtifactCopy={
 en:{heading:"What will you find here?",popular:"Popular Business Artifacts",all:"See All",more:"More business services",back:"All categories",titles:["Psychic Remedies","Artifacts","Rituals & Reiki Energy Support","Shamanic Mandalas Support"],subtitles:["(homeopathic support)","(archetypal energy support)","",""],featured:["Personal talisman","Daoist Fu","Personal mandala"]},
 ru:{heading:"Что вы найдёте здесь?",popular:"Популярные бизнес-артефакты",all:"Все",more:"Другие бизнес-услуги",back:"Все направления",titles:["Психические средства","Артефакты","Ритуалы и энергетическая поддержка Рейки","Поддержка шаманских мандал"],subtitles:["(гомеопатическая поддержка)","(архетипическая энергоподдержка)","",""],featured:["Личный талисман","Талисман Фу","Личная мандала"]},
 es:{heading:"¿Qué encontrarás aquí?",popular:"Artefactos empresariales destacados",all:"Ver todos",more:"Más servicios empresariales",back:"Todas las categorías",titles:["Remedios psíquicos","Artefactos","Rituales y apoyo energético Reiki","Apoyo con mandalas chamánicos"],subtitles:["(apoyo homeopático)","(apoyo energético arquetípico)","",""],featured:["Talismán personal","Talismán Fu","Mandala personal"]}
} as const;
const businessArtifactCards=[
 {id:"remedies",Icon:Sprout,image:"/images/holistic-house/distance-homeopathy.webp"},
 {id:"artifacts",Icon:Gem,image:"/images/holistic-house/tao-fu-balance.webp"},
 {id:"energy",Icon:Target,image:"/images/holistic-house/reiki-approved-sunrise-v3.webp"},
 {id:"mandala",Icon:Compass,image:"/images/holistic-house/mandala-gold-reference.webp"}
] as const;
const businessFeaturedArtifacts=[
 {image:"/academy/reiki-yggdrasil/source/advanced-runes.png",path:"holistic-support#talismans"},
 {image:"/images/holistic-house/tao-fu-balance.webp",path:"holistic-support#talismans"},
 {image:"/images/holistic-house/mandala-gold-reference.webp",path:"holistic-support/mandala"}
] as const;
const expressPrices=["FREE","45 CAD","75 CAD","200 CAD","300 CAD"] as const;
type ShelfId=(typeof businessShelves)[number]["id"];
const translations={
 ru:{
  title:"Бизнес-анализ и поддержка",
  subtitle:"Диагностика, аналитика и индивидуальная поддержка для развития вашего бизнеса.",
  diagnosis:"Пройти диагностику",choose:"Подобрать решение",
  step:"Шаг",of:"из",back:"Назад",
  questions:["Что сейчас больше всего нужно вашему бизнесу?","Что вызывает основные сложности?","Как вы хотите начать?"],
  goals:["Экспресс-диагностика","Бизнес-анализ","Поддержка команды","Поддержка руководителя"],
  concerns:["Неясна причина проблем","Сложно принять решение","Напряжение в команде","Не хватает ресурсов"],
  starts:["Письменный разбор","Личная консультация","Работа с командой","Другие методы поддержки"],
  featured:"Главная услуга",featureTitle:"Экспресс-диагностика ситуации",
  featureDesc:"Ключевые факторы и ближайшие решения.",
  begin:"Начать",servicesTitle:"Ключевые услуги",resultTitle:"Два направления для вашего запроса",
  resultLead:"Подборка основана на ваших ответах. Выберите подходящий вариант.",
  restart:"Изменить ответы",
  express:["Экспресс-диагностика","Начните с письменного разбора вашей бизнес-ситуации."],
  shelves:["Экспресс-бизнес-инсайт","Средства для ясности и лидерства","Стратегический бизнес-анализ","Артефакты для поддержки целей","Энергоподдержка бизнеса","Академия бизнес-энергопрактик"],
  subservices:[["Экспресс-инсайт","Расширенный инсайт","Экспресс-консультация онлайн","Полная онлайн-консультация","Онлайн-консультация + поддержка"],["Ясность и концентрация","Уверенность и лидерство","Стресс и эмоциональный баланс","Индивидуальный подбор средств"],["Анализ стратегической цели","Анализ бизнес-функций","Анализ бизнес-команды","Стратегия роста и внедрение"],["Персональный бизнес-талисман","Мандала для концентрации","Символ успеха и процветания","Индивидуальный ритуальный артефакт"],["Восстановительные практики руководителя","Баланс и поддержка команды","Гармонизация рабочего пространства","Дистанционная энергоподдержка"],["Расстановка о деньгах и ценности","Активация лидерских качеств","Ритуал запуска проекта","Согласование команды и партнёрства"]],
  expressMeta:["Короткий текстовый формат","Подробный анализ + даосские подсказки","30 минут, онлайн","60 минут, онлайн","Поддержка в течение 2 недель"],
  getDetails:"Узнать подробнее",
  contactRequest:"Хочу узнать подробнее о бизнес-услуге и доступном формате.",
  contactNote:"WhatsApp откроет подготовленное сообщение с выбранным форматом. В Telegram укажите его в разговоре с Ali. Открытие чата — ещё не заявка, запись или оплата.",
  chooseFocus:"Выберите конкретное направление",
  backToShelves:"Все 6 направлений",
  details:"Подробнее",
  categoryHint:"Ссылки ведут к ближайшим существующим услугам. Формат и стоимость уточняются на странице услуги.",
  services:[
   ["Бизнес-анализ","Расширенный разбор ситуации, факторов и направлений роста."],
   ["Аналитическая поддержка","Сопровождение решений и регулярный разбор бизнеса."],
   ["Диагностика команды","Роли, напряжения, потенциал и взаимодействие."],
   ["Поддержка руководителя","Индивидуальный анализ, ресурсы и ясность."],
   ["Предметы силы","Артефакты и символы для пространства и проектов."],
   ["Подбор препаратов","Индивидуальная консультация о средствах поддержки состояния."]
  ]
 },
 en:{
  title:"Business analysis & support",
  subtitle:"Diagnosis, insight and individual support for developing your business.",
  diagnosis:"Start a review",choose:"Find my approach",
  step:"Step",of:"of",back:"Back",
  questions:["What does your business need most right now?","What is the main difficulty?","How would you like to begin?"],
  goals:["Quick situation review","Business analysis","Team support","Leadership support"],
  concerns:["The causes are unclear","A difficult decision","Team tensions","Not enough resources"],
  starts:["Written review","Personal consultation","Work with the team","Other support methods"],
  featured:"Featured service",featureTitle:"Quick business situation review",
  featureDesc:"Key factors and the next steps.",
  begin:"Begin",servicesTitle:"Key services",resultTitle:"Two paths for your situation",
  resultLead:"Selected from your answers. Choose how to begin.",
  restart:"Change answers",
  express:["Quick situation review","Start with a written review of your business situation."],
  shelves:["Express Business Insight","Remedies for Clarity & Leadership","Strategic Business Analyses","Artefacts for Goal Support","Business Energy Support","Academy of Business Energywork"],
  subservices:[["Express Insight","Advanced Insight","Express Live Consulting","Full Live Consulting","Live Consulting + Support"],["Clarity & Focus","Confidence & Leadership","Stress & Emotional Balance","Personal Remedy Selection"],["Strategic Goal Review","Business Functions Analyses","Business Teams Review","Growth Strategy & Implementation"],["Personal Business Talisman","Mandala for Focus","Success & Prosperity Symbol","Custom Ritual Artifact"],["Executive Energy Recovery","Team Energy Balance","Business Space Harmony","Remote Energy Support"],["Money & Value Constellation","Leadership Activation","Business Launch Ritual","Partnership & Team Alignment"]],
  expressMeta:["Short text format","Detailed analyses + Taoist hints","30-minute live consultation","60-minute live consultation","2 weeks of consulting support"],
  getDetails:"Get details",
  contactRequest:"I would like details about this business service and its available formats.",
  contactNote:"WhatsApp prepares a message with your selected option. In Telegram, tell Ali which option you chose. Opening the chat does not submit a request, book or charge you.",
  chooseFocus:"Choose a specific focus",
  backToShelves:"All 6 categories",
  details:"Details",
  categoryHint:"Links open the closest existing service pages. Format and price are confirmed on the service page.",
  services:[
   ["Business analysis","A fuller look at your situation, factors and growth paths."],
   ["Analytical support","Ongoing reviews and support for business decisions."],
   ["Team diagnosis","Roles, tensions, potential and collaboration."],
   ["Leader support","Individual analysis, resources and perspective."],
   ["Symbolic objects","Artefacts and symbols for a workspace or project."],
   ["Remedy guidance","Personal consultation about wellbeing-related approaches."]
  ]
 },
 es:{
  title:"Análisis y apoyo empresarial",
  subtitle:"Diagnóstico, análisis y apoyo individual para el desarrollo de tu negocio.",
  diagnosis:"Empezar análisis",choose:"Encontrar solución",
  step:"Paso",of:"de",back:"Volver",
  questions:["¿Qué necesita más tu negocio ahora?","¿Cuál es la principal dificultad?","¿Cómo te gustaría comenzar?"],
  goals:["Diagnóstico rápido","Análisis empresarial","Apoyo al equipo","Apoyo al líder"],
  concerns:["Causas poco claras","Decisión difícil","Tensiones del equipo","Faltan recursos"],
  starts:["Análisis escrito","Consulta personal","Trabajo con el equipo","Otros métodos de apoyo"],
  featured:"Servicio principal",featureTitle:"Diagnóstico rápido de la situación",
  featureDesc:"Factores clave y próximos pasos.",
  begin:"Empezar",servicesTitle:"Servicios principales",resultTitle:"Dos opciones para tu situación",
  resultLead:"Selección basada en tus respuestas. Elige cómo empezar.",
  restart:"Cambiar respuestas",
  express:["Diagnóstico rápido","Comienza con un análisis escrito de tu situación empresarial."],
  shelves:["Diagnóstico empresarial exprés","Remedios para claridad y liderazgo","Análisis estratégicos empresariales","Artefactos para apoyar objetivos","Apoyo energético empresarial","Academia de trabajo energético empresarial"],
  subservices:[["Diagnóstico exprés","Diagnóstico avanzado","Consultoría exprés en vivo","Consultoría completa en vivo","Consultoría en vivo + apoyo"],["Claridad y concentración","Confianza y liderazgo","Estrés y equilibrio emocional","Selección individual de remedios"],["Revisión del objetivo estratégico","Análisis de funciones empresariales","Revisión de equipos","Estrategia de crecimiento e implementación"],["Talismán empresarial personal","Mandala para concentrarse","Símbolo de éxito y prosperidad","Artefacto ritual personalizado"],["Recuperación energética del líder","Equilibrio energético del equipo","Armonía del espacio de trabajo","Apoyo energético a distancia"],["Constelación de dinero y valor","Activación del liderazgo","Ritual de lanzamiento","Alineación de socios y equipos"]],
  expressMeta:["Formato de texto breve","Análisis detallados + orientación taoísta","Consulta en vivo de 30 minutos","Consulta en vivo de 60 minutos","Apoyo durante 2 semanas"],
  getDetails:"Ver detalles",
  contactRequest:"Quisiera información sobre este servicio empresarial y sus modalidades.",
  contactNote:"WhatsApp prepara un mensaje con tu opción. En Telegram, indícale a Ali cuál elegiste. Abrir el chat no envía una solicitud ni confirma una reserva o un pago.",
  chooseFocus:"Elige un área específica",
  backToShelves:"Las 6 categorías",
  details:"Detalles",
  categoryHint:"Los enlaces abren los servicios existentes más cercanos. El formato y el precio se confirman allí.",
  services:[
   ["Análisis empresarial","Revisión de la situación, los factores y el crecimiento."],
   ["Apoyo analítico","Acompañamiento y revisión continua de decisiones."],
   ["Diagnóstico del equipo","Roles, tensiones, potencial y colaboración."],
   ["Apoyo al líder","Análisis individual, recursos y perspectiva."],
   ["Objetos simbólicos","Artefactos y símbolos para espacios y proyectos."],
   ["Orientación sobre remedios","Consulta personal sobre opciones de bienestar."]
  ]
 }
} as const;

type Goal=typeof goalChoices[number]["id"];
type Concern=typeof concernChoices[number]["id"];
type Start=typeof startChoices[number]["id"];
type ServiceId="express"|typeof BUSINESS_SERVICES[number];

export function ShamanicaBusinessContent({locale}:{locale:PublicLocale}){
 const t=translations[locale],a=businessArtifactCopy[locale];
 const [step,setStep]=useState(0);
 const [goal,setGoal]=useState<Goal>("express");
 const [concern,setConcern]=useState<Concern>("unclear");
 const [start,setStart]=useState<Start>("free");
 const [finished,setFinished]=useState(false);
 const [selectedShelf,setSelectedShelf]=useState<ShelfId|null>(null);
 const [selectedOption,setSelectedOption]=useState<number|null>(null);
 const activeShelf=businessShelves.find(item=>item.id===selectedShelf);
 const shelfIndex=businessShelves.findIndex(item=>item.id===selectedShelf);
 const current=step===0?goalChoices:step===1?concernChoices:startChoices;
 const labels=step===0?t.goals:step===1?t.concerns:t.starts;
 const choose=(id:string)=>{
  if(step===0){setGoal(id as Goal);setStep(1);}
  else if(step===1){setConcern(id as Concern);setStep(2);}
  else{setStart(id as Start);setFinished(true);}
 };
 const recommended=finished?shamanicaBusinessRecommendations({goal,concern,start}) as ServiceId[]:[];
 const serviceDescription=(id:ServiceId):readonly [string,string]=>{
  if(id==="express")return t.express;
  const index=BUSINESS_SERVICES.indexOf(id);
  return t.services[index>=0?index:0];
 };
 // Mark this client component only after its DOM ref has committed (not during SSR).
 return <div className={styles.root} data-shamanica-business ref={node=>{if(node)node.dataset.businessHydrated="true";}}>
  <details className={styles.quizDrawer} data-business-extras><summary>{locale==="ru"?"Подобрать решение · 3 вопроса":locale==="es"?"Encontrar solución · 3 preguntas":"Find my approach · 3 questions"}<ArrowRight size={17} aria-hidden="true"/></summary>
  <section id="business-quiz" className={styles.quiz} data-business-quiz data-quiz-step={step+1} aria-labelledby="business-quiz-heading">
   <div className={styles.quizTop}>
    <span className={styles.stepLabel}>{t.step} {step+1} {t.of} 3</span>
    <span className={styles.progress} aria-label={t.step+" "+(step+1)+" / 3"}>
     {[0,1,2].map(i=><span key={i} className={i<=step?styles.done:""}/>)}
    </span>
   </div>
   {finished?<div className={styles.results} data-business-recommendations aria-live="polite">
     <h2 id="business-quiz-heading">{t.resultTitle}</h2><p>{t.resultLead}</p>
     <div className={styles.resultLinks}>{recommended.map((id,index)=>{
      const details=serviceDescription(id);
      return <Link href={shamanicaBusinessHref(locale,id)} key={id} prefetch={false} data-recommended-business-service={id} className={styles.resultLink}>
       <span className={styles.resultCount}>{index+1} / 2</span><strong>{details[0]}</strong><ArrowRight size={18} aria-hidden="true"/>
      </Link>;
     })}</div>
     <button className={styles.restart} type="button" onClick={()=>{setStep(0);setFinished(false);}}><ArrowLeft size={16} aria-hidden="true"/>{t.restart}</button>
    </div>:<>
     <div className={styles.quizHeading}>{step>0?<button className={styles.back} type="button" onClick={()=>setStep(value=>value-1)} aria-label={t.back}><ArrowLeft size={19}/></button>:null}
      <h2 id="business-quiz-heading" aria-live="polite">{t.questions[step]}</h2>
     </div>
     <div className={styles.answers} role="group" aria-label={t.questions[step]}>
      {current.map(({id,Icon},index)=><button type="button" key={id} className={styles.answer} onClick={()=>choose(id)} data-business-answer={id}>
       <Icon size={29} strokeWidth={1.65} aria-hidden="true"/><span>{labels[index]}</span>
      </button>)}
     </div>
    </>}
  </section>
  </details>
  <section className={styles.services} data-business-cabinet-shelves data-expanded={activeShelf?"true":"false"} aria-labelledby="business-services-heading">
   <h2 id="business-services-heading">{activeShelf?(businessArtifactCards.findIndex(item=>item.id===activeShelf.id)>=0?a.titles[businessArtifactCards.findIndex(item=>item.id===activeShelf.id)]:t.shelves[shelfIndex]):a.heading}</h2>
   {activeShelf?<>
    <button type="button" className={styles.shelfBack} onClick={()=>{setSelectedShelf(null);setSelectedOption(null);}} data-business-back-to-shelves><ArrowLeft size={18} aria-hidden="true"/>{a.back}</button>
    <p className={styles.focusLead}>{t.chooseFocus}</p>
    {activeShelf.id==="express"||activeShelf.id==="strategy"?<>
     <div className={styles.offerChoices} role="group" aria-label={t.chooseFocus} data-business-second-level={activeShelf.id}>
      {t.subservices[shelfIndex].map((name,index)=><button key={activeShelf.id+"-"+index} type="button"
       className={styles.offerChoice} aria-pressed={selectedOption===index} onClick={()=>setSelectedOption(index)}
       data-business-subservice={activeShelf.id+"-"+index}>
       <span className={styles.secondNumber}>{index+1}</span>
       <span className={styles.offerText}><strong>{name}</strong>
        {activeShelf.id==="express"&&<small>{t.expressMeta[index]}</small>}
       </span>
       {activeShelf.id==="express"&&<span className={styles.offerPrice}>{expressPrices[index]}</span>}
      </button>)}
     </div>
     <div className={styles.detailsWrap} data-business-get-details={activeShelf.id} key={activeShelf.id}>
      <MandatoryMessengerActions locale={locale} collapsed compact
       label={t.getDetails} className={styles.getDetailsButton}
       whatsappUrl={whatsappEnquiryUrl({
        locale,service:t.shelves[shelfIndex],request:t.contactRequest,
        option:selectedOption===null?undefined:
         t.subservices[shelfIndex][selectedOption]+(activeShelf.id==="express"?" · "+expressPrices[selectedOption]:"")
       })}
       telegramUrl={activeShelf.id==="strategy"
        ?(telegramBusinessStrategyRequestUrl(locale)||undefined)
        :(telegramServiceRequestUrl("business",locale)||undefined)}/>
      <p className={styles.contactNote}>{t.contactNote}</p>
     </div>
    </>:<>
     <div className={styles.secondGrid} data-business-second-level={activeShelf.id}>
      {activeShelf.routes.map((target,index)=><Link key={activeShelf.id+"-"+index} href={businessDetailHref(locale,target)} prefetch={false} className={styles.secondCard} data-business-subservice={activeShelf.id+"-"+index}>
       <span className={styles.secondNumber}>{index+1}</span><strong>{t.subservices[shelfIndex][index]}</strong>
       <span className={styles.detailLabel}>{t.details}</span><ArrowRight size={16} aria-hidden="true"/>
      </Link>)}
     </div>
     <p className={styles.catalogHint}>{t.categoryHint}</p>
    </>}
   </>:<>
    <div className={styles.artifactGrid} data-business-artifact-categories>
     {businessArtifactCards.map(({id,Icon,image},index)=>{
      const contents=<><span className={styles.artifactPhoto}><Image src={image} alt="" fill sizes="(max-width:640px) 20vw, 100px"/></span><span className={styles.artifactText}><Icon size={16} aria-hidden="true"/><strong>{a.titles[index]}</strong>{a.subtitles[index]&&<small>{a.subtitles[index]}</small>}<ArrowRight className={styles.artifactArrow} size={16} aria-hidden="true"/></span></>;
      return id==="mandala"?<Link key={id} className={styles.artifactCard} href={"/"+locale+"/holistic-support/mandala"} prefetch={false} data-business-artifact-category={id}>{contents}</Link>:<button key={id} type="button" className={styles.artifactCard} data-business-artifact-category={id} onClick={()=>{setSelectedShelf(id);setSelectedOption(null);}}>{contents}</button>;
     })}
    </div>
   </>}
   <section id="business-artifact-list" className={styles.businessFeatured} aria-labelledby="business-artifact-heading">
    <div className={styles.businessFeaturedHeader}><h2 id="business-artifact-heading">{a.popular}</h2><Link href={shamanicaBusinessHref(locale,"artifacts")} prefetch={false}>{a.all}<ArrowRight size={15}/></Link></div>
    <div className={styles.businessFeaturedGrid}>{businessFeaturedArtifacts.map((item,index)=><Link href={"/"+locale+"/"+item.path} key={item.path+"-"+index} prefetch={false}><span className={styles.businessFeaturedPhoto}><Image src={item.image} alt="" fill sizes="(max-width:640px) 30vw, 190px"/></span><strong>{a.featured[index]}</strong></Link>)}</div>
   </section>
   {!activeShelf&&<details className={styles.moreServices}><summary>{a.more}</summary><div className={styles.serviceGrid}>
    {businessShelves.map(({id,Icon},index)=><button className={styles.serviceCard} type="button" key={id}
     onClick={()=>{setSelectedShelf(id);setSelectedOption(null);}} data-business-shelf={id} aria-label={t.shelves[index]}>
     <span className={styles.serviceImage} aria-hidden="true"/>
     <span className={styles.serviceText}><Icon size={25} className={styles.serviceIcon} strokeWidth={1.6} aria-hidden="true"/><strong>{t.shelves[index]}</strong><ArrowRight size={16} className={styles.cardArrow} aria-hidden="true"/></span>
    </button>)}
   </div></details> }

  </section>
 </div>;
}
