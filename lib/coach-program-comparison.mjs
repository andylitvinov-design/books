import {STAGES} from './app/daybook-stages.mjs'
import {CLARITY_DAY_COUNT,CLARITY_SYLLABUS} from './app/clarity-program.mjs'
import {BUSINESS_SESSION_COUNT,BUSINESS_SYLLABUS} from './app/business-daybook.mjs'

// The owner-approved offer comparison. Paid prices are planned course prices,
// not payment SKUs, entitlement grants, previous selling prices or checkout.
export const COACH_PROGRAM_PREVIEW_PRICE_EUR=19.90
export const COACH_COMPARISON_IDS=Object.freeze(['clarity','business','love','health'])
export const COACH_COMPARISON_LOCALES=Object.freeze(['en','ru','es'])
const COPY={
 en:{
  title:'Programs & details',subtitle:'Compare coaching paths and choose the best fit.',back:'Back to My Coach',language:'Interface language',startHere:'Start here',free:'Free',start:'Start Free Program',sessions:'sessions',
  terms:'Three free workbook days with planned AI coaching sessions of up to 20 minutes. Session access and the daily limit remain governed by My Coach.',
  priceNote:'Prices shown are planned total course prices. Paid enrollment is not open yet.',preview:'Program preview · enrollment not yet open',draft:'Proposed session outline · enrollment not yet open',
  clarity:['Free AI Coaching','Clarify your situation, define your goal and choose your next step.'],
  business:['Business Coaching','Business strategy and growth for your next level.'],
  love:['Love Coaching','Relationships and emotional clarity.'],
  health:['Health Coaching','Energy, balance and everyday wellbeing.'],
  loveRows:['Relationship goals','Needs and values','Emotional awareness','Personal boundaries','Communication and listening','Recurring relationship patterns','Connection and intimacy','Integration and next steps'],
  healthRows:['Wellbeing goals','Life balance and energy','Daily routines','Stress and relaxation','Rest and sleep habits','Supportive resources','Sustainable actions','Review and next steps'],
  healthNote:'Coaching supports everyday habits and reflection; it is not medical advice or treatment.'
 },
 ru:{
  title:'Программы и подробности',subtitle:'Сравните программы коучинга и выберите свою.',back:'Назад в My Coach',language:'Язык интерфейса',startHere:'Начните здесь',free:'Бесплатно',start:'Начать бесплатную программу',sessions:'сессий',
  terms:'Три бесплатных дня практики и плановые AI-сессии до 20 минут. Доступ и дневной лимит определяются правилами My Coach.',
  priceNote:'Указана плановая стоимость всего курса. Запись на платные программы пока не открыта.',preview:'Программа · запись пока не открыта',draft:'Предварительный план сессий · запись пока не открыта',
  clarity:['Бесплатный AI-коучинг','Проясните ситуацию, определите цель и следующий шаг.'],
  business:['Бизнес-коучинг','Стратегия и развитие вашего бизнеса.'],
  love:['Коучинг любви','Отношения и эмоциональная ясность.'],
  health:['Коучинг здоровья','Энергия, баланс и повседневное благополучие.'],
  loveRows:['Цели в отношениях','Потребности и ценности','Осознание эмоций','Личные границы','Общение и умение слушать','Повторяющиеся сценарии','Близость и контакт','Интеграция и следующие шаги'],
  healthRows:['Цели благополучия','Баланс жизни и энергия','Повседневные привычки','Стресс и расслабление','Отдых и привычки сна','Ресурсы поддержки','Устойчивые действия','Итоги и следующие шаги'],
  healthNote:'Коучинг помогает осмыслять привычки и состояние; не заменяет медицинскую помощь.'
 },
 es:{
  title:'Programas y detalles',subtitle:'Compara los programas y elige el adecuado para ti.',back:'Volver a My Coach',language:'Idioma de la interfaz',startHere:'Empieza aquí',free:'Gratis',start:'Empezar programa gratis',sessions:'sesiones',
  terms:'Tres días gratuitos de práctica y sesiones de coaching IA previstas de hasta 20 minutos. El acceso y el límite diario se rigen por My Coach.',
  priceNote:'Los precios son importes previstos para el curso completo. La inscripción de pago aún no está abierta.',preview:'Vista del programa · inscripción aún no disponible',draft:'Plan provisional de sesiones · inscripción aún no disponible',
  clarity:['Coaching IA gratis','Aclara tu situación, define tu meta y elige el siguiente paso.'],
  business:['Coaching empresarial','Estrategia y crecimiento empresarial.'],
  love:['Coaching de amor','Relaciones y claridad emocional.'],
  health:['Coaching de salud','Energía, equilibrio y bienestar cotidiano.'],
  loveRows:['Metas en las relaciones','Necesidades y valores','Conciencia emocional','Límites personales','Comunicación y escucha','Patrones recurrentes','Conexión e intimidad','Integración y próximos pasos'],
  healthRows:['Metas de bienestar','Equilibrio vital y energía','Rutinas diarias','Estrés y relajación','Descanso y hábitos de sueño','Recursos de apoyo','Acciones sostenibles','Balance y próximos pasos'],
  healthNote:'El coaching apoya los hábitos cotidianos y la reflexión; no sustituye la atención médica.'
 }
}
export function getCoachProgramComparison(locale='en'){
 const lang=COACH_COMPARISON_LOCALES.includes(locale)?locale:'en'
 const copy=COPY[lang]
 const price=new Intl.NumberFormat(lang==='en'?'en-IE':lang==='es'?'es-ES':'ru-RU',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(COACH_PROGRAM_PREVIEW_PRICE_EUR)
 const data={
  clarity:{count:CLARITY_DAY_COUNT,rows:CLARITY_SYLLABUS[lang].map(([title,description])=>({title,description})),price:copy.free,available:true},
  business:{count:BUSINESS_SESSION_COUNT,rows:BUSINESS_SYLLABUS[lang].map(([title,description])=>({title,description})),price,available:false},
  love:{count:8,rows:copy.loveRows.map(title=>({title})),price,available:false,draft:true},
  health:{count:8,rows:copy.healthRows.map(title=>({title})),price,available:false,draft:true},
 }
 return {lang,copy,programs:COACH_COMPARISON_IDS.map(id=>({id,title:copy[id][0],description:copy[id][1],...data[id]}))}
}

// The visible comparison is deliberately narrower than the legacy deep-link catalog.
// Paid display prices are not payment or entitlement authority.
export const COACH_VISIBLE_PROGRAM_IDS=Object.freeze(['clarity','anti-stress','goal'])
export const COACH_LAUNCH_IDS=Object.freeze([...COACH_COMPARISON_IDS,'anti-stress','goal'])
const VISIBLE={
 en:{subtitle:'Choose a program and start your journey to clarity, balance and real progress.',tag:'Free AI Coaching',start:'Start',clarity:'Find My Goal',stress:['Anti-Stress Course','Practical skills to relax, restore balance and build inner resilience.'],goal:['Achieve My Goal','Turn your goal into clear steps and real progress.'],stressRows:['My Ground','My Calm','My Resource'],review:'Review and next steps'},
 ru:{subtitle:'Выберите программу для ясности, баланса и движения к цели.',tag:'Бесплатный AI-коучинг',start:'Начать',clarity:'Найти свою цель',stress:['Антистресс','Практические навыки для спокойствия, баланса и внутренней опоры.'],goal:['Достичь своей цели','Превратите цель в ясные шаги и реальный прогресс.'],stressRows:['Моя опора','Моё спокойствие','Мой ресурс'],review:'Итоги и следующие шаги'},
 es:{subtitle:'Elige un programa para encontrar claridad, equilibrio y avanzar hacia tu meta.',tag:'Coaching IA gratis',start:'Empezar',clarity:'Encuentra mi meta',stress:['Antiestrés','Habilidades para relajarte, recuperar el equilibrio y encontrar apoyo interior.'],goal:['Alcanza mi meta','Convierte tu meta en pasos claros y avances reales.'],stressRows:['Mi apoyo','Mi calma','Mi recurso'],review:'Balance y próximos pasos'}
}
export function getVisibleCoachPrograms(locale='en'){
 const {lang,copy,programs}=getCoachProgramComparison(locale)
 const t=VISIBLE[lang]
 const money=value=>new Intl.NumberFormat(lang==='en'?'en-IE':lang==='es'?'es-ES':'ru-RU',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(value)
 const clarity={...programs[0],title:t.clarity,tag:t.tag}
 const paid=(id,labels,count,value,rows)=>({id,title:labels[0],description:labels[1],count,price:money(value),rows,available:false})
 return {lang,copy:{...copy,subtitle:t.subtitle,start:t.start},programs:[clarity,
  paid('anti-stress',t.stress,3,4.99,t.stressRows.map(title=>({title}))),
  paid('goal',t.goal,8,19.99,[...STAGES.map(stage=>({title:stage[lang][0],description:stage[lang][1]})),{title:t.review}])]}
}
