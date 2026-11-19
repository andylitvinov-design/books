"use client";

import Link from "next/link";
import {ArrowRight, MessageCircle, Sparkles} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./home-intent-panel.module.css";

export type HomeIntentId="stress"|"love"|"money"|"business";
type Option={label:string;prompt:string};
type Offer={label:string;detail:string;href:string};
type IntentCopy={title:string;opening:string;question:string;offerHeading:string;choices:Option[];offers:Offer[]};
type CommonCopy={eyebrow:string};
const COMMON:Record<PublicLocale,CommonCopy>={
  en:{eyebrow:"Ali · A starting point for you"},
  ru:{eyebrow:"Али · Начнём с вашей темы"},
  es:{eyebrow:"Ali · Un comienzo para ti"},
};
const COPY:Record<PublicLocale,Record<HomeIntentId,IntentCopy>>={
  en:{
    stress:{title:"Energy & Stress Release",opening:"We can start by finding what drains your energy and what might make today easier. Choose a question, or explore a practical option below.",question:"What would you like help with first?",offerHeading:"Ways to begin",choices:[
      {label:"I'm feeling stressed",prompt:"I'm feeling stressed. Help me understand one useful first step; ask me one short question."},
      {label:"I'm low on energy",prompt:"I have low energy. Help me clarify what is difficult right now, one question at a time."},
      {label:"I need a calmer routine",prompt:"I'd like a calmer everyday routine. Help me find one manageable change."},
    ],offers:[
      {label:"Free personal review",detail:"Describe your situation in writing",href:"/services/free-situation-review"},
      {label:"Anti-stress course",detail:"Short practices for everyday recovery",href:"/courses/antistress"},
      {label:"Guided imagery session",detail:"Explore your experience with a practitioner",href:"/services/imagery-therapy"},
    ]},
    love:{title:"Love & Confidence",opening:"Relationships and self-confidence can be explored gently and practically. We can start with one situation, then choose the support that fits.",question:"Which part matters most to you?",offerHeading:"Your possible next steps",choices:[
      {label:"Relationship difficulties",prompt:"I want to understand a difficult relationship. Ask me one short question to start."},
      {label:"More self-confidence",prompt:"I want to feel more confident. Help me explore what holds me back, one question at a time."},
      {label:"Boundaries & communication",prompt:"I want to improve my boundaries and communication. Help me find a practical next step."},
    ],offers:[
      {label:"Free relationship review",detail:"A written look at your situation",href:"/services/free-situation-review"},
      {label:"Guided imagery therapy",detail:"Explore inner patterns and feelings",href:"/services/imagery-therapy"},
      {label:"Systemic constellations",detail:"Look at relationship and family patterns",href:"/services/systemic-constellations"},
    ]},
    money:{title:"Money & Growth",opening:"Let's clarify your priorities, money decisions or next direction. You don't need to solve everything at once.",question:"Where should we start?",offerHeading:"Useful starting options",choices:[
      {label:"Money decisions",prompt:"I have a money or work decision. Help me clarify it with one short question."},
      {label:"Personal direction",prompt:"I feel uncertain about my direction and goals. Help me find the next practical step."},
      {label:"Motivation & growth",prompt:"I want to regain motivation and grow personally. Ask one question to understand my goal."},
    ],offers:[
      {label:"Free situation review",detail:"Describe a personal decision or challenge",href:"/services/free-situation-review"},
      {label:"Self-insight tests",detail:"Explore strengths, resources and motivation",href:"/tests"},
      {label:"Personal consultation",detail:"Discuss priorities and choices",href:"/services#consultation"},
    ]},
    business:{title:"Business Support",opening:"We can work from the actual challenge: strategy, people, decisions or finding clients. Choose where to focus and I'll help clarify the next step.",question:"What is the main business challenge?",offerHeading:"Business support options",choices:[
      {label:"Strategy & decisions",prompt:"I need to make a business strategy decision. Ask me one focused question about my situation."},
      {label:"Team & leadership",prompt:"I need support with my team or leadership. Ask me one question to clarify the issue."},
      {label:"Clients & growth",prompt:"I want to improve client acquisition and business growth. Help me identify the main obstacle."},
    ],offers:[
      {label:"Business consultation",detail:"Strategy, leadership and key decisions",href:"/services/business-consulting"},
      {label:"Systemic constellations",detail:"Explore team and organizational dynamics",href:"/services/systemic-constellations"},
      {label:"Explore support",detail:"See available services and formats",href:"/services"},
    ]},
  },
  ru:{
    stress:{title:"Энергия и снятие стресса",opening:"Давайте поймём, что забирает силы и что может облегчить сегодняшний день. Выберите вопрос или подходящий вариант помощи.",question:"С чего начнём?",offerHeading:"Варианты поддержки",choices:[
      {label:"Стресс и напряжение",prompt:"Меня беспокоит стресс. Помоги найти первый шаг, задавай по одному короткому вопросу."},
      {label:"Мало энергии",prompt:"У меня мало энергии. Помоги понять, что сейчас истощает меня, по одному вопросу."},
      {label:"Хочу больше спокойствия",prompt:"Хочу выстроить более спокойный день. Помоги найти одно посильное изменение."},
    ],offers:[
      {label:"Бесплатный личный разбор",detail:"Расскажите о своей ситуации",href:"/services/free-situation-review"},
      {label:"Курс «Антистресс»",detail:"Короткие ежедневные практики",href:"/courses/antistress"},
      {label:"Образная терапия",detail:"Исследование переживаний с мастером",href:"/services/imagery-therapy"},
    ]},
    love:{title:"Любовь и уверенность",opening:"Можно бережно разобраться в отношениях или самооценке. Начнём с одной конкретной ситуации и найдём подходящую поддержку.",question:"Что для вас сейчас важнее?",offerHeading:"Что можно попробовать",choices:[
      {label:"Сложности в отношениях",prompt:"Хочу разобраться в сложных отношениях. Задай мне один короткий вопрос для начала."},
      {label:"Уверенность в себе",prompt:"Хочу стать увереннее. Помоги выяснить, что мне мешает, по одному вопросу."},
      {label:"Границы и общение",prompt:"Хочу улучшить личные границы и общение. Помоги определить практический следующий шаг."},
    ],offers:[
      {label:"Бесплатный разбор отношений",detail:"Личный письменный разбор ситуации",href:"/services/free-situation-review"},
      {label:"Образная психотерапия",detail:"Внутренние образы и переживания",href:"/services/imagery-therapy"},
      {label:"Системные расстановки",detail:"Семейные и партнёрские сценарии",href:"/services/systemic-constellations"},
    ]},
    money:{title:"Деньги и развитие",opening:"Помогу прояснить приоритеты, денежные решения или направление развития. Необязательно решать всё сразу.",question:"Что хочется прояснить?",offerHeading:"Подходящие первые шаги",choices:[
      {label:"Финансовое решение",prompt:"Мне нужно принять решение о деньгах или работе. Помоги прояснить его, начни с одного вопроса."},
      {label:"Направление и цели",prompt:"Я не уверен в своих целях и направлении. Помоги найти практический следующий шаг."},
      {label:"Мотивация и рост",prompt:"Хочу вернуть мотивацию и развиваться. Задай один вопрос, чтобы лучше понять мою цель."},
    ],offers:[
      {label:"Бесплатный разбор",detail:"Исследовать личную ситуацию и выбор",href:"/services/free-situation-review"},
      {label:"Тесты самопознания",detail:"Ресурсы, сильные стороны и мотивация",href:"/tests"},
      {label:"Личная консультация",detail:"Обсудить приоритеты и решения",href:"/services#consultation"},
    ]},
    business:{title:"Поддержка бизнеса",opening:"Можно начать с вашей реальной задачи: стратегия, команда, решения или привлечение клиентов. Выберите направление, и я помогу с первым шагом.",question:"Что сейчас важнее для бизнеса?",offerHeading:"Возможности для бизнеса",choices:[
      {label:"Стратегия и решения",prompt:"Мне нужна помощь со стратегическим решением в бизнесе. Задай один точный вопрос о моей ситуации."},
      {label:"Команда и руководство",prompt:"Мне нужна поддержка по команде или лидерству. Задай один вопрос, чтобы прояснить проблему."},
      {label:"Клиенты и рост",prompt:"Хочу увеличить число клиентов и развивать бизнес. Помоги определить главное препятствие."},
    ],offers:[
      {label:"Бизнес-консультация",detail:"Стратегия, управление и решения",href:"/services/business-consulting"},
      {label:"Системные расстановки",detail:"Команда и организационные связи",href:"/services/systemic-constellations"},
      {label:"Все форматы поддержки",detail:"Выбрать подходящую услугу",href:"/services"},
    ]},
  },
  es:{
    stress:{title:"Energía y alivio del estrés",opening:"Podemos empezar por entender qué te agota y qué podría ayudarte hoy. Elige una pregunta o una opción de apoyo.",question:"¿Por dónde comenzamos?",offerHeading:"Opciones para empezar",choices:[
      {label:"Estrés y tensión",prompt:"Tengo estrés. Ayúdame a encontrar un primer paso con una pregunta breve."},
      {label:"Me falta energía",prompt:"Me falta energía. Ayúdame a aclarar mi situación con una pregunta a la vez."},
      {label:"Quiero más calma",prompt:"Quiero una rutina más tranquila. Ayúdame a elegir un cambio pequeño."},
    ],offers:[
      {label:"Revisión personal gratis",detail:"Describe tu situación por escrito",href:"/services/free-situation-review"},
      {label:"Curso antiestrés",detail:"Prácticas breves para cada día",href:"/courses/antistress"},
      {label:"Terapia de imágenes",detail:"Explora tu experiencia con un profesional",href:"/services/imagery-therapy"},
    ]},
    love:{title:"Amor y confianza",opening:"Podemos explorar con calma tus relaciones o tu confianza personal, empezando por una situación concreta.",question:"¿Qué es lo más importante?",offerHeading:"Próximos pasos",choices:[
      {label:"Problemas en una relación",prompt:"Quiero comprender una relación difícil. Empieza con una pregunta breve."},
      {label:"Más confianza personal",prompt:"Quiero sentirme más seguro. Ayúdame con una pregunta a la vez."},
      {label:"Límites y comunicación",prompt:"Quiero mejorar mis límites y comunicación. Ayúdame a encontrar un paso práctico."},
    ],offers:[
      {label:"Revisión gratuita",detail:"Un análisis escrito de tu situación",href:"/services/free-situation-review"},
      {label:"Terapia con imágenes",detail:"Explora sentimientos y patrones personales",href:"/services/imagery-therapy"},
      {label:"Constelaciones sistémicas",detail:"Relaciones y dinámicas familiares",href:"/services/systemic-constellations"},
    ]},
    money:{title:"Dinero y crecimiento",opening:"Aclaremos tus prioridades, decisiones de dinero o dirección de crecimiento. Podemos empezar con una sola pregunta.",question:"¿Qué quieres aclarar primero?",offerHeading:"Opciones para ti",choices:[
      {label:"Decisiones económicas",prompt:"Tengo una decisión sobre dinero o trabajo. Ayúdame con una pregunta breve."},
      {label:"Dirección personal",prompt:"No tengo claro mi rumbo. Ayúdame a encontrar el siguiente paso."},
      {label:"Motivación y crecimiento",prompt:"Quiero recuperar la motivación y crecer. Haz una pregunta para aclarar mi meta."},
    ],offers:[
      {label:"Revisión de situación gratis",detail:"Comprende una decisión personal",href:"/services/free-situation-review"},
      {label:"Tests de autoconocimiento",detail:"Fortalezas, recursos y motivación",href:"/tests"},
      {label:"Consulta personal",detail:"Habla sobre tus prioridades",href:"/services#consultation"},
    ]},
    business:{title:"Apoyo empresarial",opening:"Empecemos por tu reto real: estrategia, equipo, decisiones o clientes. Elige un tema para encontrar el siguiente paso.",question:"¿Qué necesita tu negocio?",offerHeading:"Opciones de apoyo",choices:[
      {label:"Estrategia y decisiones",prompt:"Necesito tomar una decisión estratégica de negocio. Hazme una pregunta concreta."},
      {label:"Equipo y liderazgo",prompt:"Necesito ayuda con mi equipo o liderazgo. Empieza con una pregunta."},
      {label:"Clientes y crecimiento",prompt:"Quiero atraer clientes y crecer. Ayúdame a identificar el obstáculo principal."},
    ],offers:[
      {label:"Consultoría empresarial",detail:"Estrategia y decisiones de liderazgo",href:"/services/business-consulting"},
      {label:"Constelaciones sistémicas",detail:"Dinámicas de equipo y organización",href:"/services/systemic-constellations"},
      {label:"Explorar apoyo",detail:"Ver servicios y formatos",href:"/services"},
    ]},
  },
};
export const HOME_INTENTS=["stress","love","money","business"] as const;
export function isHomeIntentId(value:unknown):value is HomeIntentId {
  return typeof value==="string"&&HOME_INTENTS.some(id=>id===value);
}
export function HomeIntentPanel({locale,intent,onAsk,disabled=false}:{
  locale:PublicLocale;intent:HomeIntentId;onAsk:(prompt:string)=>void;disabled?:boolean
}){
  const data=COPY[locale][intent];
  return <section className={styles.root} lang={locale} data-home-intent-panel={intent} aria-label={data.title}>
    <div className={styles.assistant}>
      <span className={styles.eyebrow}><Sparkles size={16} aria-hidden="true"/>{COMMON[locale].eyebrow}</span>
      <h2>{data.title}</h2>
      <p>{data.opening}</p>
      <h3>{data.question}</h3>
      <div className={styles.questions} role="group" aria-label={data.question}>
        {data.choices.map(option=><button key={option.label} type="button" disabled={disabled}
          data-home-intent-question={intent} onClick={()=>onAsk(option.prompt)}>
          <MessageCircle size={16} aria-hidden="true"/><span>{option.label}</span><ArrowRight size={15} aria-hidden="true"/>
        </button>)}
      </div>
    </div>
    <div className={styles.offers}>
      <h3>{data.offerHeading}</h3>
      <div className={styles.offerGrid}>
        {data.offers.map(offer=><Link key={offer.href} href={"/"+locale+offer.href}
          prefetch={false} data-home-intent-offer={intent} className={styles.offer}>
          <span><strong>{offer.label}</strong><small>{offer.detail}</small></span>
          <ArrowRight size={18} aria-hidden="true"/>
        </Link>)}
      </div>
    </div>
  </section>;
}
