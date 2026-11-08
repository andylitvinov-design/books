"use client";

import {CalendarDays, Clapperboard, ClipboardCheck, Flower2, Lightbulb, PlayCircle} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./messenger-six-projects.module.css";

export type MessengerProjectId = "hint" | "test" | "mytube" | "sessions" | "practice" | "ai-video";
export type MessengerTestFocus = "personality" | "stress" | "relationships" | "work";
export type MessengerProjectOption = {
  id:string; label:string; kind:"ask" | "test" | "link";
  prompt?:string; href?:string; focus?:MessengerTestFocus;
};
type ProjectDefinition = {
  title:string; subline:string; question:string; options:MessengerProjectOption[];
};

// Only first-party, existing public destinations. No booking/payment/video is claimed
// before the visitor finishes the action on its destination page.
const CONTENT:Record<PublicLocale,Record<MessengerProjectId,ProjectDefinition>>={
  en:{
    hint:{title:"Get a hint",subline:"Life & business insights",question:"Which area would you like to explore?",options:[
      {id:"life",label:"Life & feelings",kind:"ask",prompt:"What is happening in your life that you would like to understand?"},
      {id:"business",label:"Business decisions",kind:"ask",prompt:"Which business situation or decision would you like to explore?"},
      {id:"relationships",label:"Relationships",kind:"ask",prompt:"What relationship situation would you like to understand?"},
      {id:"direction",label:"Meaning & direction",kind:"ask",prompt:"What choice or direction feels unclear right now?"},
    ]},
    test:{title:"Get a test",subline:"Personality & self-insight",question:"What would you like to understand about yourself?",options:[
      {id:"personality",label:"Personality",kind:"test",focus:"personality"},
      {id:"stress",label:"Stress & wellbeing",kind:"test",focus:"stress"},
      {id:"relationships",label:"Relationships",kind:"test",focus:"relationships"},
      {id:"work",label:"Work & resources",kind:"test",focus:"work"},
    ]},
    mytube:{title:"MyTube",subline:"Watch supportive videos",question:"What would you like your videos to help with?",options:[
      {id:"calm",label:"Calm & stress",kind:"link",href:"/mytube?goal=stress"},
      {id:"relationships",label:"Love & relationships",kind:"link",href:"/mytube?goal=relationships"},
      {id:"energy",label:"Energy & motivation",kind:"link",href:"/mytube?goal=energy"},
      {id:"meaning",label:"Meaning & growth",kind:"link",href:"/mytube?goal=meaning"},
    ]},
    sessions:{title:"Sessions",subline:"Personal practitioner support",question:"What kind of personal support would be useful?",options:[
      {id:"free-review",label:"Free situation review",kind:"link",href:"/services/free-situation-review"},
      {id:"imagery",label:"Guided imagery therapy",kind:"link",href:"/services/imagery-therapy"},
      {id:"constellations",label:"Systemic constellations",kind:"link",href:"/services/systemic-constellations"},
      {id:"business",label:"Business consultation",kind:"link",href:"/services/business-consulting"},
    ]},
    practice:{title:"Practice",subline:"Study, practise & grow",question:"What would you like to practise or study?",options:[
      {id:"stress",label:"Anti-stress course",kind:"link",href:"/courses/antistress"},
      {id:"reiki",label:"Free Reiki training",kind:"link",href:"/academy/principles-of-energywork/learn"},
      {id:"meditation",label:"Meditations",kind:"link",href:"/meditations"},
      {id:"academy",label:"Explore the Academy",kind:"link",href:"/academy"},
    ]},
    "ai-video":{title:"AI-Video",subline:"Create your content",question:"What would you like to create?",options:[]},
  },
  ru:{
    hint:{title:"Подсказка",subline:"Анализ жизни и бизнеса",question:"Какую сферу хотите разобрать?",options:[
      {id:"life",label:"Жизнь и чувства",kind:"ask",prompt:"Что происходит в вашей жизни и в чём вы хотите разобраться?"},
      {id:"business",label:"Бизнес и решения",kind:"ask",prompt:"Какую ситуацию или решение в бизнесе вы хотите обсудить?"},
      {id:"relationships",label:"Отношения",kind:"ask",prompt:"Какую ситуацию в отношениях вы хотели бы понять?"},
      {id:"direction",label:"Смысл и путь",kind:"ask",prompt:"Какой выбор или направление сейчас вызывает вопросы?"},
    ]},
    test:{title:"Тесты",subline:"Личность и самопознание",question:"Что вы хотите узнать о себе?",options:[
      {id:"personality",label:"Личность",kind:"test",focus:"personality"},
      {id:"stress",label:"Стресс и состояние",kind:"test",focus:"stress"},
      {id:"relationships",label:"Отношения",kind:"test",focus:"relationships"},
      {id:"work",label:"Работа и ресурсы",kind:"test",focus:"work"},
    ]},
    mytube:{title:"MyTube",subline:"Поддерживающие видео",question:"На какую тему хотите посмотреть видео?",options:[
      {id:"calm",label:"Спокойствие и стресс",kind:"link",href:"/mytube?goal=stress"},
      {id:"relationships",label:"Любовь и отношения",kind:"link",href:"/mytube?goal=relationships"},
      {id:"energy",label:"Энергия и мотивация",kind:"link",href:"/mytube?goal=energy"},
      {id:"meaning",label:"Смыслы и развитие",kind:"link",href:"/mytube?goal=meaning"},
    ]},
    sessions:{title:"Сессии",subline:"Личная помощь мастера",question:"Какая личная поддержка вам нужна?",options:[
      {id:"free-review",label:"Бесплатный разбор",kind:"link",href:"/services/free-situation-review"},
      {id:"imagery",label:"Образная терапия",kind:"link",href:"/services/imagery-therapy"},
      {id:"constellations",label:"Системные расстановки",kind:"link",href:"/services/systemic-constellations"},
      {id:"business",label:"Бизнес-консультация",kind:"link",href:"/services/business-consulting"},
    ]},
    practice:{title:"Практики",subline:"Учиться и развиваться",question:"Что хотите практиковать или изучать?",options:[
      {id:"stress",label:"Курс «Антистресс»",kind:"link",href:"/courses/antistress"},
      {id:"reiki",label:"Бесплатный курс Рейки",kind:"link",href:"/academy/principles-of-energywork/learn"},
      {id:"meditation",label:"Медитации",kind:"link",href:"/meditations"},
      {id:"academy",label:"Все курсы Академии",kind:"link",href:"/academy"},
    ]},
    "ai-video":{title:"AI-Video",subline:"Создать свой контент",question:"Что хотите создать?",options:[]},
  },
  es:{
    hint:{title:"Una orientación",subline:"Vida y negocios",question:"¿Qué área quieres explorar?",options:[
      {id:"life",label:"Vida y emociones",kind:"ask",prompt:"¿Qué ocurre en tu vida que te gustaría comprender?"},
      {id:"business",label:"Decisiones de negocio",kind:"ask",prompt:"¿Qué situación o decisión de negocio quieres explorar?"},
      {id:"relationships",label:"Relaciones",kind:"ask",prompt:"¿Qué situación en tus relaciones te gustaría comprender?"},
      {id:"direction",label:"Sentido y rumbo",kind:"ask",prompt:"¿Qué decisión o dirección te resulta poco clara ahora?"},
    ]},
    test:{title:"Un test",subline:"Personalidad y autoconocimiento",question:"¿Qué te gustaría conocer de ti?",options:[
      {id:"personality",label:"Personalidad",kind:"test",focus:"personality"},
      {id:"stress",label:"Estrés y bienestar",kind:"test",focus:"stress"},
      {id:"relationships",label:"Relaciones",kind:"test",focus:"relationships"},
      {id:"work",label:"Trabajo y recursos",kind:"test",focus:"work"},
    ]},
    mytube:{title:"MyTube",subline:"Vídeos de apoyo",question:"¿Qué te gustaría explorar en los vídeos?",options:[
      {id:"calm",label:"Calma y estrés",kind:"link",href:"/mytube?goal=stress"},
      {id:"relationships",label:"Amor y relaciones",kind:"link",href:"/mytube?goal=relationships"},
      {id:"energy",label:"Energía y motivación",kind:"link",href:"/mytube?goal=energy"},
      {id:"meaning",label:"Sentido y crecimiento",kind:"link",href:"/mytube?goal=meaning"},
    ]},
    sessions:{title:"Sesiones",subline:"Apoyo personal",question:"¿Qué tipo de apoyo personal buscas?",options:[
      {id:"free-review",label:"Revisión gratuita",kind:"link",href:"/services/free-situation-review"},
      {id:"imagery",label:"Terapia con imágenes",kind:"link",href:"/services/imagery-therapy"},
      {id:"constellations",label:"Constelaciones",kind:"link",href:"/services/systemic-constellations"},
      {id:"business",label:"Consulta empresarial",kind:"link",href:"/services/business-consulting"},
    ]},
    practice:{title:"Práctica",subline:"Aprende y crece",question:"¿Qué te gustaría practicar o estudiar?",options:[
      {id:"stress",label:"Curso antiestrés",kind:"link",href:"/courses/antistress"},
      {id:"reiki",label:"Curso gratuito de Reiki",kind:"link",href:"/academy/principles-of-energywork/learn"},
      {id:"meditation",label:"Meditaciones",kind:"link",href:"/meditations"},
      {id:"academy",label:"Explorar la Academia",kind:"link",href:"/academy"},
    ]},
    "ai-video":{title:"AI-Video",subline:"Crea contenido",question:"¿Qué te gustaría crear?",options:[]},
  },
};

const VISUALS=[
  {id:"hint",icon:Lightbulb},
  {id:"test",icon:ClipboardCheck},
  {id:"mytube",icon:PlayCircle},
  {id:"sessions",icon:CalendarDays},
  {id:"practice",icon:Flower2},
  {id:"ai-video",icon:Clapperboard},
] as const;

export function messengerProject(locale:PublicLocale,id:MessengerProjectId):ProjectDefinition {
  return CONTENT[locale][id];
}

export function MessengerSixProjects({locale,onSelect}:{
  locale:PublicLocale;onSelect:(id:MessengerProjectId)=>void;
}) {
  return <div className={styles.grid} data-hh-messenger-six-projects role="group"
    aria-label={locale==="ru"?"Шесть направлений ИИ-помощника":locale==="es"?"Seis opciones del asistente":"Six ways to begin"}>
    {VISUALS.map(({id,icon:Icon})=>{
      const item=messengerProject(locale,id);
      return <button key={id} type="button" className={styles.card}
        data-hh-ai-project={id} onClick={()=>onSelect(id)}>
        <Icon size={24} strokeWidth={1.8} aria-hidden="true"/>
        <strong>{item.title}</strong><small>{item.subline}</small>
        <span className={styles.art} aria-hidden="true"/>
      </button>;
    })}
  </div>;
}