import {CLARITY_COURSE_GROUP,clarityCourseDay} from './clarity-course.mjs'
/**
 * Fixed Holistic House eight-session navigation.
 * Session topics are optional, user-selected coaching directions, never
 * evidence of consent, a completed stage, a diagnosis or stored progress.
 */
import {COACH_PROGRAM_GROUPS,COACH_PROGRAM_SESSIONS,INTRODUCTORY_COACH_SESSION} from './coach-program-topics.mjs'
import {coachCourseProtocolGuidance} from './coach-course-protocol-schema.mjs'
export {COACH_PROGRAM_GROUPS,COACH_PROGRAM_SESSIONS,INTRODUCTORY_COACH_SESSION_ID} from './coach-program-topics.mjs'
export const DEFAULT_COACH_COURSE_SESSION_ID='life_direction'
const sessionData=[
 {id:'life_direction',title:{en:'Life Direction',ru:'Направление жизни',es:'Dirección vital'},
  description:{en:'Explore your life and goals.',ru:'Исследуйте свои жизненные ориентиры и цели.',es:'Explora tu vida y tus metas.'}},
 {id:'inner_compass',title:{en:'Inner Compass',ru:'Внутренний компас',es:'Brújula interior'},
  description:{en:'Notice what matters most to you.',ru:'Разберитесь, что для вас действительно важно.',es:'Descubre lo que realmente te importa.'}},
 {id:'main_vector',title:{en:'Main Vector',ru:'Главный вектор',es:'Vector principal'},
  description:{en:'Choose the direction you want to develop.',ru:'Выберите основное направление своего развития.',es:'Elige la dirección en la que quieres crecer.'}},
 {id:'strengths_resources',title:{en:'Strengths & Resources',ru:'Силы и ресурсы',es:'Fortalezas y recursos'},
  description:{en:'Recognize the strengths already available to you.',ru:'Увидьте сильные стороны и доступные ресурсы.',es:'Reconoce tus fortalezas y recursos actuales.'}},
 {id:'obstacles_patterns',title:{en:'Obstacles & Patterns',ru:'Препятствия и привычки',es:'Obstáculos y patrones'},
  description:{en:'Understand what gets in the way, without judgment.',ru:'Исследуйте то, что мешает двигаться вперёд.',es:'Explora qué te frena, sin juzgarte.'}},
 {id:'new_possibilities',title:{en:'New Possibilities',ru:'Новые возможности',es:'Nuevas posibilidades'},
  description:{en:'Look for fresh choices and perspectives.',ru:'Откройте другие варианты и новые взгляды.',es:'Considera opciones y perspectivas nuevas.'}},
 {id:'actions_steps',title:{en:'Action & Steps',ru:'Действия и шаги',es:'Acción y pasos'},
  description:{en:'Choose one small step that fits your life.',ru:'Выберите посильный следующий шаг.',es:'Elige un paso pequeño y realista.'}},
 {id:'integration',title:{en:'Integration & Growth',ru:'Интеграция и рост',es:'Integración y crecimiento'},
  description:{en:'Reflect on what you learned and what comes next.',ru:'Подведите итоги и наметьте дальнейшее развитие.',es:'Integra lo aprendido y mira hacia adelante.'}}
]
export const COACH_COURSE_SESSIONS=Object.freeze(sessionData.map(item=>Object.freeze({
 ...item,title:Object.freeze(item.title),description:Object.freeze(item.description)
})))
// Reserve the distinct archive ID without exposing an unconnected picker.
// The existing Director and picker will enable the track together.
const MEANING_AXES_ARCHIVE_SESSION=Object.freeze({
 id:'meaning_axes_inner_growth',
 title:Object.freeze({en:'Meaning Axes: Inner Growth',ru:'Оси Смысла: Внутренний рост',es:'Ejes de sentido: Crecimiento interior'}),
 description:Object.freeze({en:'Explore the eight inner axes.',ru:'Исследуйте восемь внутренних осей.',es:'Explora los ocho ejes interiores.'})
})
const byId=new Map([...COACH_COURSE_SESSIONS,...COACH_PROGRAM_SESSIONS,...CLARITY_COURSE_GROUP.sessions,INTRODUCTORY_COACH_SESSION,MEANING_AXES_ARCHIVE_SESSION].map(item=>[item.id,item]))
export function normalizeCoachCourseSessionId(value){
 if(value===undefined||value===null)return DEFAULT_COACH_COURSE_SESSION_ID
 if(typeof value!=='string'||!byId.has(value))throw Error('COACH_COURSE_SESSION_INVALID')
 return value
}
export function coachCourseById(id){
 return byId.get(normalizeCoachCourseSessionId(id))
}
export function coachCourseLocal(value,locale='en'){
 return value?.[['en','ru','es'].includes(locale)?locale:'en']||value?.en||''
}
export function coachCourseFocusLabel(id,locale='en'){
 return coachCourseLocal(coachCourseById(id).title,locale)
}
export function coachCourseLiveInstruction(id,locale='en'){
 const item=coachCourseById(id)
 const label=coachCourseLocal(item.title,locale)
 const description=coachCourseLocal(item.description,locale)
 const index=COACH_COURSE_SESSIONS.indexOf(item)+1
 const group=clarityCourseDay(item.id)?CLARITY_COURSE_GROUP:COACH_PROGRAM_GROUPS.find(g=>g.id===item.programId)
 if(item===INTRODUCTORY_COACH_SESSION)return [
   'CLIENT-SELECTED INTRODUCTORY COACHING SESSION: '+label+'.',
   'Preserve the mandatory introduction, invitation, name, continuity and focus steps. This selection is NOT spoken client consent or permission to access private data.',
   'After the client confirms, gently clarify the current request and offer an optional personal profile check-in or current-versus-desired exploration; no preset goal or required test. Use the existing consent and evidence gates for profile review and never infer missing answers.'
 ].join(' ')
 const direction=group?coachCourseLocal(group.title,locale)+' · '+item.number+'/'+group.sessions.length:index+'/8'
 return [
   'CLIENT-SELECTED COACHING COURSE DIRECTION (approved fixed app catalogue): '+direction+' — '+label+'.',
   'Topic description: '+description,
   coachCourseProtocolGuidance(item.id,locale),
   ...(clarityCourseDay(item.id)?['Clarity course: a bounded twenty-minute meeting. First clarify the request and invite explicit consent; then address this day’s checkpoints one question at a time. At normal close offer a concise result and voluntary next practice. Never invent missing scores or medical findings. Unexplored topics may become optional homework after client review. A network interruption is not a completed session.']:[]),
   'A selection is a preference, NOT spoken client consent, evidence of progress, completed stages, or permission to access client data.',
   'Preserve the mandatory introduction, invitation, name and client-directed focus steps. First ask for an explicit yes to the session; let the client confirm or change the topic.',
   'Once the client confirms this focus, use the chosen direction to shape open, non-leading questions within the existing server-owned coaching method and stage ceilings.',
   'If the client prefers a different goal, a personal profile, or a problem, honor that choice immediately. Never force the course topic, imply the client has finished other sessions, or fabricate course completion.'
 ].join(' ')
}
