// Course-level checkpoints are distinct from persona method evidence.
 // Sources: coach-program-topics.mjs, clarity-program.mjs, business-daybook.mjs,
 // SEVEN_STEPS_TO_DREAM_V2_20261123.md and my-coach-zero-session-profile.md.
 // These are editorial report slots, not evidence of question delivery or completion.
import {BUSINESS_SYLLABUS} from '../app/business-daybook.mjs'
export const COACH_COURSE_PROTOCOL_SCHEMA_VERSION='hh-coach-course-report-v1'
const langs=['en','ru','es']
const f=(id,en,ru,es)=>Object.freeze({id,label:Object.freeze({en,ru,es})})
const field=Object.freeze({
 situation:f('situation','Current situation','Текущая ситуация','Situación actual'),
 request:f('request','Client request','Запрос клиента','Petición del cliente'),
 wishes:f('wishes','Wishes and needs','Желания и потребности','Deseos y necesidades'),
 facts:f('facts','Facts and examples','Факты и примеры','Hechos y ejemplos'),
 feelings:f('feelings','Feelings','Чувства','Emociones'),
 needs:f('needs','Needs','Потребности','Necesidades'),
 support:f('support','Available support','Доступная поддержка','Apoyo disponible'),
 wellbeing:f('wellbeing','Current wellbeing (self-report)','Текущее самочувствие (самооценка)','Bienestar actual (autoinforme)'),
 practices:f('practices','Chosen gentle practices','Выбранные бережные практики','Prácticas suaves elegidas'),
 resources:f('resources','Personal and external resources','Личные и внешние ресурсы','Recursos personales y externos'),
 changes:f('changes','Observed changes','Наблюдаемые изменения','Cambios observados'),
 direction:f('direction','Chosen direction','Выбранное направление','Dirección elegida'),
 goal:f('goal','Desired result / goal','Желаемый результат / цель','Resultado deseado / meta'),
 why:f('why','Personal meaning and motivation','Личный смысл и мотивация','Sentido personal y motivación'),
 success:f('success','Success criteria','Критерии успеха','Criterios de éxito'),
 boundaries:f('boundaries','Values and boundaries','Ценности и границы','Valores y límites'),
 horizon:f('horizon','Time horizon','Горизонт времени','Horizonte temporal'),
 baseline:f('baseline','Starting point','Исходная точка','Punto de partida'),
 plan:f('plan','Action plan','План действий','Plan de acción'),
 levels:f('levels','Minimum / working / extended action','Минимум / рабочий / расширенный шаг','Acción mínima / habitual / ampliada'),
 timing:f('timing','Timing and conditions','Сроки и условия','Tiempo y condiciones'),
 contingency:f('contingency','Alternative / if–then plan','Запасной план / если — то','Alternativa / plan si–entonces'),
 strengths:f('strengths','Strengths and prior successes','Сильные стороны и успешный опыт','Fortalezas y logros previos'),
 limits:f('limits','Real limitations','Реальные ограничения','Limitaciones reales'),
 obstacle:f('obstacle','Obstacle in client words','Препятствие словами клиента','Obstáculo en palabras del cliente'),
 trigger:f('trigger','Trigger or pattern','Триггер или привычный паттерн','Desencadenante o patrón'),
 options:f('options','Alternative possibilities','Альтернативные возможности','Posibilidades alternativas'),
 tradeoffs:f('tradeoffs','Benefits, costs and risks','Польза, цена и риски','Beneficios, costes y riesgos'),
 experiment:f('experiment','Chosen experiment and check criteria','Выбранный эксперимент и критерии проверки','Experimento elegido y criterios de revisión'),
 progress:f('progress','Evidence of progress','Подтверждения прогресса','Evidencia de progreso'),
 adjust:f('adjust','Plan adjustments','Корректировка плана','Ajustes del plan'),
 learning:f('learning','Learning and reflection','Осознания и выводы','Aprendizaje y reflexión'),
 review:f('review','Next review','Следующая сверка','Próxima revisión'),
 next:f('next','Voluntary next step','Добровольный следующий шаг','Próximo paso voluntario')
})
const byCourse=Object.freeze({
 clarity_discover:['situation','wishes','needs'],
 clarity_understand:['facts','feelings','needs','support'],
 clarity_support:['wellbeing','practices','resources'],
 clarity_direction:['changes','direction','next'],
 goal_result:['baseline','goal','success','horizon','boundaries'],
 goal_motivation:['goal','why','boundaries'],
 goal_plan:['plan','timing','levels','contingency','next'],
 goal_resources:['strengths','resources','limits','next'],
 goal_obstacles:['obstacle','trigger','limits','contingency','experiment'],
 goal_possibilities:['options','tradeoffs','experiment','review'],
 goal_acceleration:['progress','adjust','next','review'],
 goal_integration:['progress','learning','direction','next'],
 life_direction:['situation','wishes','direction','goal'],
 inner_compass:['why','boundaries','needs'],
 main_vector:['direction','goal','success'],
 strengths_resources:['strengths','resources','limits'],
 obstacles_patterns:['obstacle','trigger','contingency'],
 new_possibilities:['options','tradeoffs','experiment'],
 actions_steps:['plan','timing','levels','next'],
 integration:['progress','learning','direction','next']
})
const businessIds=Object.freeze({
 business_strategy:['business_reality','strategic_options','goal_success'],
 business_design:['function_map','target_structure','leadership_validation'],
 business_transformation:['feedback_evidence','change_portfolio','transition_plan'],
 business_execution:['accountability_people','controls_metrics','launch_review']
})
export function coachCourseProtocolSchema(courseSessionId,locale='en'){
 if(typeof courseSessionId!=='string')return null
 const lang=langs.includes(locale)?locale:'en'
 let checkpoints,source
 if(Object.hasOwn(businessIds,courseSessionId)){
   const index=Object.keys(businessIds).indexOf(courseSessionId)
   checkpoints=BUSINESS_SYLLABUS[lang][index][2].map(([label,instruction],i)=>({id:businessIds[courseSessionId][i],label,instruction}))
   source='business-daybook'
 }else if(Object.hasOwn(byCourse,courseSessionId)){
   checkpoints=byCourse[courseSessionId].map(key=>({id:field[key].id,label:field[key].label[lang]}))
   source=courseSessionId.startsWith('clarity_')?'clarity-syllabus':courseSessionId.startsWith('goal_')?'seven-steps-and-goal-catalogue':'eight-session-catalogue'
 }else return null // Session 0 and meaning-axis profile use their own versioned schemas.
 return Object.freeze({version:COACH_COURSE_PROTOCOL_SCHEMA_VERSION,courseSessionId,source,
   checkpoints:Object.freeze(checkpoints.map(row=>Object.freeze(row)))})
}
export function coachCourseProtocolGuidance(courseSessionId,locale){
 const schema=coachCourseProtocolSchema(courseSessionId,locale)
 if(!schema)return ''
 return 'After the client confirms this exact session focus, use the following topic-specific report checkpoints within the existing Director-authorized move and safety gates: '+
   schema.checkpoints.map(row=>row.label+(row.instruction?' — '+row.instruction:'')).join('; ')+
   '. Ask at most one relevant question, and never interrogate every field. Do not claim a checkpoint was verified, or a commitment made, because of the selected topic, model suggestion or conversation length. Unclear or missing evidence stays open.'
}
export function coachCourseProtocolOverview(courseSessionId,title,locale='en'){
 const schema=coachCourseProtocolSchema(courseSessionId,locale)
 if(!schema)return ''
 const lang=langs.includes(locale)?locale:'en'
 const copy={
  en:['Session checkpoints','No question-bound answer verified in this record'],
  ru:['Контрольные пункты сессии','В этой записи нет проверенного ответа на данный вопрос'],
  es:['Puntos de la sesión','No hay una respuesta vinculada a esta pregunta y verificada en el registro']
 }[lang]
 return [copy[0]+' · '+title,...schema.checkpoints.map(row=>row.label+': '+copy[1])].join('\n')
}
