import {COACH_COMPARISON_IDS,COACH_LAUNCH_IDS,COACH_COMPARISON_LOCALES,getCoachProgramComparison,getVisibleCoachPrograms} from './coach-program-comparison.mjs'
import {PUBLIC_COACH_PERSONA_IDS} from './coaching/persona-registry.mjs'
import {CLARITY_TASKS} from './app/clarity-program.mjs'
import {daybookGames} from './app/daybook-games.mjs'

const COPY={
 en:{back:'My Coach',daybook:'My Daybook',meet:'Meet Your Coach',choose:'Choose another coach',all:'All Coaches',fewer:'Show carousel',start:'Start Your Course with {name}',details:'About this course',plan:'Session plan',unavailable:'Enrollment is not open yet',mira:'Gentle clarity and support for your next step.',clarity:'3 sessions to gain clarity, see your situation from a new perspective, and set your goal.'},
 ru:{back:'Мой коуч',daybook:'Мой дневник',meet:'Познакомьтесь с коучем',choose:'Выберите другого коуча',all:'Все коучи',fewer:'Свернуть список',start:'Начать курс · {name}',details:'О курсе',plan:'План сессий',unavailable:'Запись пока не открыта',mira:'Мягкая поддержка и ясность для вашего следующего шага.',clarity:'3 сессии, чтобы прояснить ситуацию, лучше понять себя и определить цель.'},
 es:{back:'Mi coach',daybook:'Mi diario',meet:'Conoce a tu coach',choose:'Elige otro coach',all:'Todos los coaches',fewer:'Ver carrusel',start:'Empieza tu curso con {name}',details:'Sobre este curso',plan:'Plan de sesiones',unavailable:'La inscripción aún no está abierta',mira:'Claridad y apoyo para tu próximo paso.',clarity:'3 sesiones para ganar claridad, comprender tu situación y definir tu meta.'}
}
export const normalizeLaunchCoach=id=>typeof id==='string'&&PUBLIC_COACH_PERSONA_IDS.includes(id)?id:'mira'
export function coachCourseLaunchHref(locale,program,coach){
 if(!COACH_COMPARISON_LOCALES.includes(locale)||!COACH_LAUNCH_IDS.includes(program))return null
 const path='/'+locale+'/my-coach/programs/'+program
 return typeof coach==='string'&&PUBLIC_COACH_PERSONA_IDS.includes(coach)?path+'?coach='+encodeURIComponent(coach):path
}
export function getCoachCourseLaunch(locale,program){
 if(!COACH_COMPARISON_LOCALES.includes(locale)||!COACH_LAUNCH_IDS.includes(program))return null
 const {lang,copy,programs}=getCoachProgramComparison(locale)
 const course=getVisibleCoachPrograms(locale).programs.find(p=>p.id===program)||programs.find(p=>p.id===program)
 return {lang,course,copy:{...COPY[lang],language:copy.language,terms:copy.terms,preview:copy.preview,draft:copy.draft,healthNote:copy.healthNote,priceNote:copy.priceNote,sessions:copy.sessions},
  intro:program==='clarity'?COPY[lang].clarity:course.count+' '+copy.sessions+' · '+course.description}
}

export function courseLaunchNeighbor(id,direction){
 const index=COACH_COMPARISON_IDS.indexOf(id)
 if(index<0||![-1,1].includes(direction))return null
 return COACH_COMPARISON_IDS[(index+direction+COACH_COMPARISON_IDS.length)%COACH_COMPARISON_IDS.length]
}
export function courseLaunchPresentation(lang,course){
 const title=course.id==='clarity'?({en:'Clarity in your desires',ru:'Ясность в своих желаниях',es:'Claridad en tus deseos'})[lang]:course.title
 const clarity=course.id==='clarity'
 const duration=clarity?({en:course.count+' sessions of 20 minutes',ru:course.count+' сессии по 20 минут',es:course.count+' sesiones de 20 minutos'})[lang]:({en:course.count+' sessions',ru:course.count+' сессий',es:course.count+' sesiones'})[lang]
 const count=clarity?CLARITY_TASKS[lang].reduce((n,tasks,i)=>n+tasks.length+daybookGames(lang,i+1).length,0):0
 const bonus=clarity?'+ Bonus: '+count+' Practices in Daybook.':null
 return {title,duration,price:course.price,bonus}
}
