// Shared authored stage layout for registered thematic sessions. No clock or review authority.
import {goalSessionScenario} from './goal-session-scenarios.mjs'
import {clarityVersionedScenario} from './clarity-course-scenarios.mjs'
export const SESSION_BLUEPRINT_VERSION='hh-session-blueprint-v1-20261128'
const ids=['contact','situation','method','insight','support','integration']
const contact=['Contact','Контакт','Contacto']
const L=(en,ru,es)=>[en,ru,es]
const goalLabels={
 goal_result:[L('Starting point','Точка старта','Punto de partida'),L('My goal','Моя цель','Mi meta'),L('Success criteria','Критерии успеха','Criterios de éxito'),L('First action','Первое действие','Primera acción'),L('Action timing','Условия и время действия','Tiempo y condiciones de acción')],
 goal_motivation:[L('Future vision','Образ будущего','Visión de futuro'),L('Personal meaning','Личный смысл','Sentido personal'),L('Values and boundaries','Ценности и границы','Valores y límites'),L('Motivated action','Действие с мотивацией','Acción motivada'),L('Action timing','Условия и время действия','Tiempo y condiciones de acción')],
 goal_plan:[L('Action sequence','Последовательность действий','Secuencia de acciones'),L('Timing','Сроки','Calendario'),L('Realistic criteria','Реалистичные критерии','Criterios realistas'),L('Alternatives and step','Альтернативы и шаг','Alternativas y paso'),L('Plan review','Сверка плана','Revisión del plan')],
 goal_resources:[L('Strengths','Сильные стороны','Fortalezas'),L('Available resources','Доступные ресурсы','Recursos disponibles'),L('Limits','Ограничения','Límites'),L('Resource practice','Практика ресурса','Práctica de recursos'),L('Trial observation','Наблюдение после пробы','Observación de la prueba')],
 goal_obstacles:[L('Obstacle','Препятствие','Obstáculo'),L('Trigger','Триггер','Desencadenante'),L('Facts and limits','Факты и ограничения','Hechos y límites'),L('Safer alternatives','Бережные альтернативы','Alternativas seguras'),L('Experiment','Эксперимент','Experimento')],
 goal_possibilities:[L('Options','Варианты','Opciones'),L('Trade-offs','Плюсы и минусы','Ventajas y costes'),L('Experiment','Эксперимент','Experimento'),L('Review and stop rule','Сверка и условие остановки','Revisión y regla de parada'),L('Decision criteria','Критерии решения','Criterios de decisión')],
 goal_acceleration:[L('Progress evidence','Факты прогресса','Evidencia del progreso'),L('Adjustment and learning','Коррекция и выводы','Ajuste y aprendizaje'),L('Next action','Следующий шаг','Próximo paso'),L('Sustainable pace','Устойчивый темп','Ritmo sostenible'),L('Next review','Следующая сверка','Próxima revisión')],
 goal_integration:[L('Actual outcomes','Фактические результаты','Resultados reales'),L('Learning and resources','Выводы и ресурсы','Aprendizaje y recursos'),L('New direction','Новое направление','Nueva dirección'),L('Next action','Следующий шаг','Próximo paso'),L('Next review','Следующая сверка','Próxima revisión')]
}
// Keep the historical field IDs and ordered rubric. Empty editorial stages
// stay unverified until an authored, versioned evidence field is introduced.
const thematic={
 business_strategy:[[L('Business reality','Реальность бизнеса','Realidad empresarial'),['business_reality']],[L('Growth options','Варианты роста','Opciones de crecimiento'),['strategic_options']],[L('Trade-offs','Компромиссы','Compromisos'),[]],[L('Resources','Ресурсы','Recursos'),[]],[L('Success target','Целевой результат','Meta de éxito'),['goal_success']]],
 business_design:[[L('Function map','Карта функций','Mapa de funciones'),['function_map']],[L('Target structure','Целевая структура','Estructura objetivo'),['target_structure']],[L('Responsibilities','Ответственность','Responsabilidades'),[]],[L('Implementation support','Опора внедрения','Apoyo a la implementación'),[]],[L('Leadership validation','Сверка с руководством','Validación directiva'),['leadership_validation']]],
 business_transformation:[[L('Feedback evidence','Факты обратной связи','Evidencia de comentarios'),['feedback_evidence']],[L('Change priorities','Приоритеты изменений','Prioridades de cambio'),['change_portfolio']],[L('Risks','Риски','Riesgos'),[]],[L('Transition support','Опора перехода','Apoyo a la transición'),[]],[L('Transition milestone','Этап перехода','Hito de transición'),['transition_plan']]],
 business_execution:[[L('Accountability','Ответственность','Responsabilidad'),['accountability_people']],[L('Metrics','Показатели','Indicadores'),['controls_metrics']],[L('Barriers','Барьеры','Barreras'),[]],[L('Execution support','Опора реализации','Apoyo a la ejecución'),[]],[L('Launch review','Сверка запуска','Revisión del lanzamiento'),['launch_review']]],
 clarity_discover:[[L('Current situation','Текущая ситуация','Situación actual'),['situation']],[L('Wishes','Желания','Deseos'),['wishes']],[L('Needs','Потребности','Necesidades'),['needs']],[L('Support','Опора','Apoyo'),[]],[L('Reflection','Итоги','Reflexión'),[]]],
 clarity_understand:[[L('Facts','Факты','Hechos'),['facts']],[L('Feelings','Чувства','Emociones'),['feelings']],[L('Needs','Потребности','Necesidades'),['needs']],[L('Support','Поддержка','Apoyo'),['support']],[L('Reflection','Итоги','Reflexión'),[]]],
 clarity_support:[[L('Wellbeing','Самочувствие','Bienestar'),['wellbeing']],[L('Practice','Практика','Práctica'),['practices']],[L('Resources','Ресурсы','Recursos'),['resources']],[L('Application','Применение','Aplicación'),[]],[L('Reflection','Итоги','Reflexión'),[]]],
 clarity_direction:[[L('Changes','Изменения','Cambios'),['changes']],[L('Direction','Направление','Dirección'),['direction']],[L('Options','Варианты','Opciones'),[]],[L('Support','Опора','Apoyo'),[]],[L('Next step','Следующий шаг','Próximo paso'),['next']]],
 life_direction:[[L('Situation','Ситуация','Situación'),['situation']],[L('Wishes','Желания','Deseos'),['wishes']],[L('Direction','Направление','Dirección'),['direction']],[L('Support','Опора','Apoyo'),[]],[L('Goal','Цель','Meta'),['goal']]],
 inner_compass:[[L('Personal meaning','Личный смысл','Sentido personal'),['why']],[L('Boundaries','Границы','Límites'),['boundaries']],[L('Needs','Потребности','Necesidades'),['needs']],[L('Support','Опора','Apoyo'),[]],[L('Reflection','Итоги','Reflexión'),[]]],
 main_vector:[[L('Direction','Направление','Dirección'),['direction']],[L('Goal','Цель','Meta'),['goal']],[L('Success criteria','Критерии успеха','Criterios de éxito'),['success']],[L('Support','Опора','Apoyo'),[]],[L('Reflection','Итоги','Reflexión'),[]]],
 strengths_resources:[[L('Strengths','Сильные стороны','Fortalezas'),['strengths']],[L('Resources','Ресурсы','Recursos'),['resources']],[L('Limits','Ограничения','Límites'),['limits']],[L('Application','Применение','Aplicación'),[]],[L('Reflection','Итоги','Reflexión'),[]]],
 obstacles_patterns:[[L('Obstacle','Препятствие','Obstáculo'),['obstacle']],[L('Trigger','Триггер','Desencadenante'),['trigger']],[L('Understanding','Понимание','Comprensión'),[]],[L('Alternative','Альтернатива','Alternativa'),['contingency']],[L('Reflection','Итоги','Reflexión'),[]]],
 new_possibilities:[[L('Options','Варианты','Opciones'),['options']],[L('Trade-offs','Плюсы и минусы','Ventajas y costes'),['tradeoffs']],[L('Decision','Решение','Decisión'),[]],[L('Experiment','Эксперимент','Experimento'),['experiment']],[L('Reflection','Итоги','Reflexión'),[]]],
 actions_steps:[[L('Action plan','План действий','Plan de acción'),['plan']],[L('Timing','Сроки','Calendario'),['timing']],[L('Minimum action','Минимальное действие','Acción mínima'),['levels']],[L('Support','Опора','Apoyo'),[]],[L('Next step','Следующий шаг','Próximo paso'),['next']]],
 integration:[[L('Progress','Прогресс','Progreso'),['progress']],[L('Learning','Выводы','Aprendizaje'),['learning']],[L('Direction','Направление','Dirección'),['direction']],[L('Support','Опора','Apoyo'),[]],[L('Next step','Следующий шаг','Próximo paso'),['next']]]
}
const legacyClarity={
 clarity_day_2:[[L('Review','Обзор','Revisión'),['changes','review_homework']],[L('Inner axes','Внутренние оси','Ejes interiores'),[]],[L('Strengths','Сильные стороны','Fortalezas'),['strengths']],[L('Resources','Ресурсы','Recursos'),['resources']],[L('Practice','Практика','Práctica'),['practices']]],
 clarity_day_3:[[L('Review','Обзор','Revisión'),['changes','review_homework']],[L('Dream and goal','Мечта и цель','Sueño y meta'),['dream_image','goal']],[L('Meaning','Смысл','Sentido'),['why']],[L('Success and action','Успех и действие','Éxito y acción'),['success','next']],[L('Timing','Сроки','Calendario'),['timing']]]
}
export function sessionBlueprint(id,locale='en',{legacy=false}={}){
 const lang=locale==='ru'?1:locale==='es'?2:0
 const clarity=clarityVersionedScenario(id,locale)
 if(clarity&&!legacy)return {id,version:clarity.version,durationSeconds:1200,mode:'coaching',stages:clarity.stages.map(s=>({id:s.id,label:s.label,fields:clarity.fields.filter(f=>f.progressStage===s.id&&s.id!=='contact').map(f=>f.id)}))}
 const goal=goalSessionScenario(id)
 if(goal)return {id,version:SESSION_BLUEPRINT_VERSION,durationSeconds:1200,mode:'coaching',stages:goal.stages.map((s,i)=>({...s,label:(i===0?contact:goalLabels[id][i-1])[lang]}))}
 const plan=legacy&&Object.hasOwn(legacyClarity,id)?legacyClarity[id]:Object.hasOwn(thematic,id)?thematic[id]:null
 if(!plan)return null
 return {id,version:SESSION_BLUEPRINT_VERSION,durationSeconds:1200,mode:'coaching',stages:[[contact,[]],...plan].map(([label,fields],i)=>({id:ids[i],label:label[lang],fields:[...fields],start:[0,2,5,9,13,17][i],end:[2,5,9,13,17,20][i]}))}
}
export function sessionBlueprintStage(id,fieldId,options){
 return sessionBlueprint(id,'en',options)?.stages.find(s=>s.fields.includes(fieldId))?.id||null
}
export function sessionBlueprintGuidance(id,locale='en'){
 const b=sessionBlueprint(id,locale);if(!b)return ''
 return 'Session stage order (advisory, never evidence of completion): '+b.stages.map(s=>s.label+(s.fields.length?' ['+s.fields.join(', ')+']':'')).join(' → ')+'.'
}
