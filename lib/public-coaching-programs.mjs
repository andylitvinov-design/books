import {STAGES} from './app/daybook-stages.mjs'
import {BUSINESS_SYLLABUS} from './app/business-daybook.mjs'

export const PUBLIC_PROGRAMS=Object.freeze(['clarity','goal','business'])
export const PROGRAM_LOCALES=Object.freeze(['en','ru','es'])
const copy={
 ru:{
  back:'Назад',tagline:'Терапия · Коучинг · Развитие',language:'Выбрать язык',sessions:'сессии',start:'Начать программу',outline:'Сессии программы',
  clarity:{title:'Clarity & Stress Relief',subtitle:'Ясность, спокойствие и внутренняя опора',intro:'Бесплатное знакомство + 3 основные сессии',count:'3 сессии',rows:[
   ['Прояснение ситуации','Экспресс-анализ жизненной ситуации и областей, где нужна поддержка.'],
   ['Поддержка состояния и энергии','Индивидуальная поддержка, направляемое воображение и гипнотерапия по согласованию.'],
   ['Анализ и выбор цели развития','Системная расстановка, прояснение цели и следующие шаги.']]},
  goal:{title:'Achieving My Goal',subtitle:'От мечты к реальному результату',count:'8 сессий',review:'Итоги и новые перспективы',reviewDetail:'Оценить результаты и выбрать направление следующего этапа.',progress:'Ускорить движение к цели'},
  business:{title:'Business Support',subtitle:'Стратегия и управляемый рост бизнеса',count:'4 стратегические сессии',organization:'Организационный анализ'}
 },
 en:{
  back:'Back',tagline:'Therapy · Coaching · Growth',language:'Choose language',sessions:'sessions',start:'Start program',outline:'Program sessions',
  clarity:{title:'Clarity & Stress Relief',subtitle:'Clarity, calm and inner support',intro:'Free introduction + 3 main sessions',count:'3 sessions',rows:[
   ['Clarify the situation','A brief review of your life situation and the areas that need support.'],
   ['Restore energy and support','Individual support, guided imagery and hypnotherapy by agreement.'],
   ['Choose your next goal','Systemic constellation, goal clarification and your next steps.']]},
  goal:{title:'Achieving My Goal',subtitle:'From a dream to real-world progress',count:'8 sessions',review:'Results & New Possibilities',reviewDetail:'Review your results and choose your next direction.',progress:'Build momentum toward your goal'},
  business:{title:'Business Support',subtitle:'Strategy and sustainable business growth',count:'4 strategic sessions',organization:'Organizational analysis'}
 },
 es:{
  back:'Volver',tagline:'Terapia · Coaching · Desarrollo',language:'Elegir idioma',sessions:'sesiones',start:'Empezar programa',outline:'Sesiones del programa',
  clarity:{title:'Claridad y alivio del estrés',subtitle:'Claridad, calma y apoyo interior',intro:'Introducción gratuita + 3 sesiones principales',count:'3 sesiones',rows:[
   ['Aclarar la situación','Revisión breve de tu situación vital y las áreas que necesitan apoyo.'],
   ['Recuperar energía y apoyo','Apoyo individual, imaginación guiada e hipnoterapia según acuerdo.'],
   ['Elegir tu próxima meta','Constelación sistémica, clarificación de la meta y próximos pasos.']]},
  goal:{title:'Alcanzar mi meta',subtitle:'Del sueño a resultados concretos',count:'8 sesiones',review:'Balance y nuevas perspectivas',reviewDetail:'Revisa tus resultados y elige tu próximo rumbo.',progress:'Acelera hacia tu meta'},
  business:{title:'Apoyo empresarial',subtitle:'Estrategia y crecimiento empresarial gestionable',count:'4 sesiones estratégicas',organization:'Análisis organizativo'}
 }
}
export function getProgramOverview(locale,id){
 if(!PROGRAM_LOCALES.includes(locale)||!PUBLIC_PROGRAMS.includes(id))return null
 const t=copy[locale],p=t[id]
 const rows=id==='clarity'?p.rows:id==='goal'?
  [...STAGES.map((s,i)=>[i===6?p.progress:s[locale][0],s[locale][1]]),[p.review,p.reviewDetail]]:
  BUSINESS_SYLLABUS[locale].map(([title,description],i)=>[i===1?p.organization:title,description])
 const root='/'+locale
 return {id,locale,title:p.title,subtitle:p.subtitle,count:p.count,intro:p.intro||null,rows,back:t.back,tagline:t.tagline,language:t.language,start:t.start,outline:t.outline,home:locale==='en'?'/':root,startHref:id==='clarity'?root+'/app/daybook?program=clarity':id==='goal'?root+'/app/daybook?start=vector':root+'/app/daybook/business'}
}
