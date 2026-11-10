"use client";
import {CalendarDays,Clapperboard,ClipboardCheck,Flower2,Lightbulb,PlayCircle} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./messenger-six-projects.module.css";

export type MessengerProjectId="hint"|"test"|"mytube"|"sessions"|"practice"|"ai-video";
export type MessengerTestFocus="personality"|"stress"|"relationships"|"work";
export type MessengerProjectOption={id:string;label:string;description:string;kind:"ask"|"test"|"link";prompt?:string;href?:string;focus?:MessengerTestFocus};
type ProjectDefinition={title:string;subline:string;question:string;options:MessengerProjectOption[]};
const CONTENT:Record<PublicLocale,Record<MessengerProjectId,ProjectDefinition>>={
en:{
 hint:{title:"Get a hint",subline:"Life & business insights",question:"Which area would you like to explore?",options:[
 {id:"life",label:"Life & feelings",description:"Understand what's happening and find a clear next step",kind:"ask",prompt:"What is happening in your life that you would like to understand?"},
 {id:"business",label:"Business decisions",description:"Untangle a challenge, choice or work situation",kind:"ask",prompt:"Which business situation or decision would you like to explore?"},
 {id:"relationships",label:"Relationships",description:"Explore communication, boundaries and recurring patterns",kind:"ask",prompt:"What relationship situation would you like to understand?"},
 {id:"direction",label:"Meaning & direction",description:"Clarify priorities and the direction you want to take",kind:"ask",prompt:"What choice or direction feels unclear right now?"}]},
 test:{title:"Get a test",subline:"Personality & self-insight",question:"What would you like to understand about yourself?",options:[
 {id:"personality",label:"Personality",description:"Explore traits, strengths and personal patterns",kind:"test",focus:"personality"},
 {id:"stress",label:"Stress & wellbeing",description:"Check tension, mood, fatigue and current resources",kind:"test",focus:"stress"},
 {id:"relationships",label:"Relationships",description:"Reflect on connection, intimacy and compassion",kind:"test",focus:"relationships"},
 {id:"work",label:"Work & resources",description:"Explore work patterns, motivation and resources",kind:"test",focus:"work"}]},
 mytube:{title:"MyTube",subline:"Watch supportive videos",question:"What would you like your videos to help with?",options:[
 {id:"calm",label:"Calm & stress",description:"Videos for relaxation and emotional balance",kind:"link",href:"/mytube?goal=stress"},
 {id:"relationships",label:"Love & relationships",description:"Insights for connection and healthy boundaries",kind:"link",href:"/mytube?goal=relationships"},
 {id:"energy",label:"Energy & motivation",description:"Find inspiration and restore momentum",kind:"link",href:"/mytube?goal=energy"},
 {id:"meaning",label:"Meaning & growth",description:"Explore purpose, values and personal growth",kind:"link",href:"/mytube?goal=meaning"}]},
 sessions:{title:"Sessions",subline:"Personal practitioner support",question:"What kind of personal support would be useful?",options:[
 {id:"free-review",label:"Free situation review",description:"Describe your situation and receive a personal review",kind:"link",href:"/services/free-situation-review"},
 {id:"imagery",label:"Guided imagery therapy",description:"Work with inner images in a guided session",kind:"link",href:"/services/imagery-therapy"},
 {id:"constellations",label:"Systemic constellations",description:"Explore relationship and family-system dynamics",kind:"link",href:"/services/systemic-constellations"},
 {id:"business",label:"Business consultation",description:"Get support with business choices and team dynamics",kind:"link",href:"/services/business-consulting"}]},
 practice:{title:"Practice",subline:"Study, practise & grow",question:"What would you like to practise or study?",options:[
 {id:"stress",label:"Anti-stress course",description:"Short daily exercises to calm and recover",kind:"link",href:"/courses/antistress"},
 {id:"reiki",label:"Free Reiki training",description:"Learn the foundations through guided lessons",kind:"link",href:"/academy/principles-of-energywork/learn"},
 {id:"meditation",label:"Meditations",description:"Choose a guided practice for the moment",kind:"link",href:"/meditations"},
 {id:"academy",label:"Explore the Academy",description:"Browse courses and structured learning paths",kind:"link",href:"/academy"}]},
 "ai-video":{title:"AI-Video",subline:"Create your content",question:"What would you like to create?",options:[]}},
ru:{
 hint:{title:"Подсказка",subline:"Анализ жизни и бизнеса",question:"Какую сферу хотите разобрать?",options:[
 {id:"life",label:"Жизнь и чувства",description:"Разобраться в ситуации и увидеть следующий шаг",kind:"ask",prompt:"Что происходит в вашей жизни и в чём вы хотите разобраться?"},
 {id:"business",label:"Бизнес и решения",description:"Прояснить сложность, выбор или рабочую ситуацию",kind:"ask",prompt:"Какую ситуацию или решение в бизнесе вы хотите обсудить?"},
 {id:"relationships",label:"Отношения",description:"Понять общение, границы и повторяющиеся сценарии",kind:"ask",prompt:"Какую ситуацию в отношениях вы хотели бы понять?"},
 {id:"direction",label:"Смысл и путь",description:"Определить приоритеты и направление движения",kind:"ask",prompt:"Какой выбор или направление сейчас вызывает вопросы?"}]},
 test:{title:"Тесты",subline:"Личность и самопознание",question:"Что вы хотите узнать о себе?",options:[
 {id:"personality",label:"Личность",description:"Черты характера, сильные стороны и личные особенности",kind:"test",focus:"personality"},
 {id:"stress",label:"Стресс и состояние",description:"Напряжение, настроение, усталость и ресурсы",kind:"test",focus:"stress"},
 {id:"relationships",label:"Отношения",description:"Близость, взаимодействие и эмоциональные ресурсы",kind:"test",focus:"relationships"},
 {id:"work",label:"Работа и ресурсы",description:"Рабочие привычки, мотивация и внутренние опоры",kind:"test",focus:"work"}]},
 mytube:{title:"MyTube",subline:"Поддерживающие видео",question:"На какую тему хотите посмотреть видео?",options:[
 {id:"calm",label:"Спокойствие и стресс",description:"Видео для расслабления и эмоционального баланса",kind:"link",href:"/mytube?goal=stress"},
 {id:"relationships",label:"Любовь и отношения",description:"Общение, близость и здоровые границы",kind:"link",href:"/mytube?goal=relationships"},
 {id:"energy",label:"Энергия и мотивация",description:"Вдохновение и восстановление активности",kind:"link",href:"/mytube?goal=energy"},
 {id:"meaning",label:"Смыслы и развитие",description:"Ценности, предназначение и личный рост",kind:"link",href:"/mytube?goal=meaning"}]},
 sessions:{title:"Сессии",subline:"Личная помощь мастера",question:"Какая личная поддержка вам нужна?",options:[
 {id:"free-review",label:"Бесплатный разбор",description:"Опишите ситуацию и получите персональный разбор",kind:"link",href:"/services/free-situation-review"},
 {id:"imagery",label:"Образная терапия",description:"Работа с внутренними образами в направленной сессии",kind:"link",href:"/services/imagery-therapy"},
 {id:"constellations",label:"Системные расстановки",description:"Исследование семейных и системных динамик",kind:"link",href:"/services/systemic-constellations"},
 {id:"business",label:"Бизнес-консультация",description:"Поддержка в решениях и командных вопросах",kind:"link",href:"/services/business-consulting"}]},
 practice:{title:"Практики",subline:"Учиться и развиваться",question:"Что хотите практиковать или изучать?",options:[
 {id:"stress",label:"Курс «Антистресс»",description:"Короткие ежедневные практики восстановления",kind:"link",href:"/courses/antistress"},
 {id:"reiki",label:"Бесплатный курс Рейки",description:"Основы и последовательные обучающие уроки",kind:"link",href:"/academy/principles-of-energywork/learn"},
 {id:"meditation",label:"Медитации",description:"Подберите практику для текущего состояния",kind:"link",href:"/meditations"},
 {id:"academy",label:"Все курсы Академии",description:"Курсы и последовательные программы обучения",kind:"link",href:"/academy"}]},
 "ai-video":{title:"AI-Video",subline:"Создать свой контент",question:"Что хотите создать?",options:[]}},
es:{
 hint:{title:"Orientación",subline:"Vida y negocios",question:"¿Qué área quieres explorar?",options:[
 {id:"life",label:"Vida y emociones",description:"Comprende tu situación y encuentra el siguiente paso",kind:"ask",prompt:"¿Qué ocurre en tu vida que te gustaría comprender?"},
 {id:"business",label:"Decisiones de negocio",description:"Aclara un reto, una elección o una situación laboral",kind:"ask",prompt:"¿Qué situación o decisión de negocio quieres explorar?"},
 {id:"relationships",label:"Relaciones",description:"Explora la comunicación, los límites y los patrones",kind:"ask",prompt:"¿Qué situación en tus relaciones te gustaría comprender?"},
 {id:"direction",label:"Sentido y rumbo",description:"Aclara tus prioridades y la dirección que deseas tomar",kind:"ask",prompt:"¿Qué decisión o dirección te resulta poco clara ahora?"}]},
 test:{title:"Test",subline:"Personalidad y autoconocimiento",question:"¿Qué te gustaría conocer de ti?",options:[
 {id:"personality",label:"Personalidad",description:"Rasgos, fortalezas y patrones personales",kind:"test",focus:"personality"},
 {id:"stress",label:"Estrés y bienestar",description:"Tensión, ánimo, cansancio y recursos actuales",kind:"test",focus:"stress"},
 {id:"relationships",label:"Relaciones",description:"Conexión, intimidad y compasión",kind:"test",focus:"relationships"},
 {id:"work",label:"Trabajo y recursos",description:"Hábitos laborales, motivación y recursos",kind:"test",focus:"work"}]},
 mytube:{title:"MyTube",subline:"Vídeos de apoyo",question:"¿Qué te gustaría explorar en los vídeos?",options:[
 {id:"calm",label:"Calma y estrés",description:"Vídeos para relajarte y recuperar el equilibrio",kind:"link",href:"/mytube?goal=stress"},
 {id:"relationships",label:"Amor y relaciones",description:"Conexión y límites saludables",kind:"link",href:"/mytube?goal=relationships"},
 {id:"energy",label:"Energía y motivación",description:"Inspiración y recuperación del impulso",kind:"link",href:"/mytube?goal=energy"},
 {id:"meaning",label:"Sentido y crecimiento",description:"Propósito, valores y desarrollo personal",kind:"link",href:"/mytube?goal=meaning"}]},
 sessions:{title:"Sesiones",subline:"Apoyo personal",question:"¿Qué tipo de apoyo personal buscas?",options:[
 {id:"free-review",label:"Revisión gratuita",description:"Describe tu situación y recibe una revisión personal",kind:"link",href:"/services/free-situation-review"},
 {id:"imagery",label:"Terapia con imágenes",description:"Trabaja con imágenes internas en una sesión guiada",kind:"link",href:"/services/imagery-therapy"},
 {id:"constellations",label:"Constelaciones",description:"Explora dinámicas familiares y sistémicas",kind:"link",href:"/services/systemic-constellations"},
 {id:"business",label:"Consulta empresarial",description:"Apoyo para decisiones y dinámicas de equipo",kind:"link",href:"/services/business-consulting"}]},
 practice:{title:"Práctica",subline:"Aprende y crece",question:"¿Qué te gustaría practicar o estudiar?",options:[
 {id:"stress",label:"Curso antiestrés",description:"Ejercicios breves para recuperar la calma y la energía",kind:"link",href:"/courses/antistress"},
 {id:"reiki",label:"Curso gratuito de Reiki",description:"Aprende fundamentos mediante lecciones guiadas",kind:"link",href:"/academy/principles-of-energywork/learn"},
 {id:"meditation",label:"Meditaciones",description:"Elige una práctica guiada para este momento",kind:"link",href:"/meditations"},
 {id:"academy",label:"Explorar la Academia",description:"Cursos y rutas estructuradas de aprendizaje",kind:"link",href:"/academy"}]},
 "ai-video":{title:"AI-Video",subline:"Crea contenido",question:"¿Qué te gustaría crear?",options:[]}}
};
const VISUALS=[{id:"hint",icon:Lightbulb},{id:"test",icon:ClipboardCheck},{id:"mytube",icon:PlayCircle},{id:"sessions",icon:CalendarDays},{id:"practice",icon:Flower2},{id:"ai-video",icon:Clapperboard}] as const;
export function messengerProject(locale:PublicLocale,id:MessengerProjectId):ProjectDefinition{return CONTENT[locale][id]}
export function MessengerSixProjects({locale,onSelect}:{locale:PublicLocale;onSelect:(id:MessengerProjectId)=>void}){
 return <div className={styles.grid} data-hh-messenger-six-projects role="group"
  aria-label={locale==="ru"?"Шесть направлений ИИ-помощника":locale==="es"?"Seis opciones del asistente":"Six ways to begin"}>
  {VISUALS.map(({id,icon:Icon})=>{const item=messengerProject(locale,id);return <button key={id} type="button"
   className={styles.card} data-hh-ai-project={id} onClick={()=>onSelect(id)}>
   <Icon size={24} strokeWidth={1.8} aria-hidden="true"/><strong>{item.title}</strong>
   <small>{item.subline}</small><span className={styles.art} aria-hidden="true"/></button>})}
 </div>
}