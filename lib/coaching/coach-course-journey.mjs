/**
 * Fixed Holistic House eight-session navigation.
 * Session topics are optional, user-selected coaching directions, never
 * evidence of consent, a completed stage, a diagnosis or stored progress.
 */
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
const byId=new Map(COACH_COURSE_SESSIONS.map(item=>[item.id,item]))
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
 return [
   'CLIENT-SELECTED COACHING COURSE DIRECTION (approved fixed app catalogue): '+index+'/8 — '+label+'.',
   'Topic description: '+description,
   'A selection is a preference, NOT spoken client consent, evidence of progress, completed stages, or permission to access client data.',
   'Preserve the mandatory introduction, invitation, name and client-directed focus steps. First ask for an explicit yes to the session; let the client confirm or change the topic.',
   'Once the client confirms this focus, use the chosen direction to shape open, non-leading questions within the existing server-owned coaching method and stage ceilings.',
   'If the client prefers a different goal, a personal profile, or a problem, honor that choice immediately. Never force the course topic, imply the client has finished other sessions, or fabricate course completion.'
 ].join(' ')
}
