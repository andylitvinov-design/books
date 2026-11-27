import {COACH_COMPARISON_IDS,COACH_COMPARISON_LOCALES,getCoachProgramComparison} from './coach-program-comparison.mjs'
import {PUBLIC_COACH_PERSONA_IDS} from './coaching/persona-registry.mjs'

const COPY={
 en:{back:'My Coach',meet:'Meet Your Coach',choose:'Choose another coach',all:'All Coaches',fewer:'Show carousel',start:'Start Your Course with {name}',details:'About this course',plan:'Session plan',unavailable:'Enrollment is not open yet',mira:'Gentle clarity and support for your next step.',clarity:'3 sessions to gain clarity, see your situation from a new perspective, and set your goal.'},
 ru:{back:'Мой коуч',meet:'Познакомьтесь с коучем',choose:'Выберите другого коуча',all:'Все коучи',fewer:'Свернуть список',start:'Начать курс · {name}',details:'О курсе',plan:'План сессий',unavailable:'Запись пока не открыта',mira:'Мягкая поддержка и ясность для вашего следующего шага.',clarity:'3 сессии, чтобы прояснить ситуацию, лучше понять себя и определить цель.'},
 es:{back:'Mi coach',meet:'Conoce a tu coach',choose:'Elige otro coach',all:'Todos los coaches',fewer:'Ver carrusel',start:'Empieza tu curso con {name}',details:'Sobre este curso',plan:'Plan de sesiones',unavailable:'La inscripción aún no está abierta',mira:'Claridad y apoyo para tu próximo paso.',clarity:'3 sesiones para ganar claridad, comprender tu situación y definir tu meta.'}
}
export const normalizeLaunchCoach=id=>typeof id==='string'&&PUBLIC_COACH_PERSONA_IDS.includes(id)?id:'mira'
export function coachCourseLaunchHref(locale,program,coach){
 if(!COACH_COMPARISON_LOCALES.includes(locale)||!COACH_COMPARISON_IDS.includes(program))return null
 const path='/'+locale+'/my-coach/programs/'+program
 return typeof coach==='string'&&PUBLIC_COACH_PERSONA_IDS.includes(coach)?path+'?coach='+encodeURIComponent(coach):path
}
export function getCoachCourseLaunch(locale,program){
 if(!COACH_COMPARISON_LOCALES.includes(locale)||!COACH_COMPARISON_IDS.includes(program))return null
 const {lang,copy,programs}=getCoachProgramComparison(locale)
 const course=programs.find(p=>p.id===program)
 return {lang,course,copy:{...COPY[lang],language:copy.language,terms:copy.terms,preview:copy.preview,draft:copy.draft,healthNote:copy.healthNote,priceNote:copy.priceNote,sessions:copy.sessions},
  intro:program==='clarity'?COPY[lang].clarity:course.count+' '+copy.sessions+' · '+course.description}
}
