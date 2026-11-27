// Versioned Clarity A/B/C registry. Method policy, not proof of delivery,
// provider time, durable storage, therapeutic effect or completion.
// Old review versions remain readable. All surfaces must select by course + version.
import {clarityDayOneScenario,clarityDayOneGateFields,clarityDayOneReviewOf,clarityDayOneModelGuidance,clarityDayOneTimeGuidance,CLARITY_DAY_ONE_VERSION,CLARITY_DAY_ONE_REVIEW_VERSION} from './clarity-day-one-scenario.mjs'
import {INNER_VECTOR_ITEMS} from '../profile/development-vectors.mjs'
const L=(en,ru,es)=>Object.freeze({en,ru,es})
const V=Object.freeze({
 clarity_day_1:Object.freeze([CLARITY_DAY_ONE_VERSION,CLARITY_DAY_ONE_REVIEW_VERSION]),
 clarity_day_2:Object.freeze(['hh-clarity-day-two-support-v1','hh-coach-course-review-day-two-support-v1']),
 clarity_day_3:Object.freeze(['hh-clarity-day-three-goal-v1','hh-coach-course-review-day-three-goal-v1'])
})
const lang=l=>['en','ru','es'].includes(l)?l:'en'
export const clarityScenarioVersion=id=>V[id]?.[0]||null
export const clarityScenarioReviewVersion=id=>V[id]?.[1]||null
export const clarityReviewVersionForScenario=(id,version)=>version&&version===clarityScenarioVersion(id)?clarityScenarioReviewVersion(id):null
const F=(id,stage,label,question,{priority='P1',kind='text',requiresConsent,homework=false,result=true,metric=false,separate=false}={})=>Object.freeze({id,stage,progressStage:stage,label,question,priority,kind,homework,result,metric,separate,...(requiresConsent?{requiresConsent}:{})})
const core={priority:'P0'},optional={priority:'P2'},safe={homework:true},control={kind:'consent',result:false},review={kind:'review',priority:'P0',result:false}
const contact=Object.freeze({id:'contact',label:L('Contact','Контакт','Contacto')})
const stage=(id,label)=>Object.freeze({id,label})
const stagesB=Object.freeze([contact,stage('situation',L('Situation','Ситуация','Situación')),stage('resources',L('Resources','Ресурсы','Recursos')),stage('practice',L('Practice','Практика','Práctica')),stage('transfer',L('Transfer','Перенос','Aplicación')),stage('integration',L('Integration','Итоги','Integración'))])
const stagesC=Object.freeze([contact,stage('review',L('Review','Обзор','Revisión')),stage('goal',L('Goal','Цель','Meta')),stage('reality',L('Reality','Реальность','Realidad')),stage('action',L('Action','Действия','Acción')),stage('integration',L('Integration','Итоги','Integración'))])
const homeworkConsent=F('homework_consent','integration',L('Homework permission','Согласие на домашнее задание','Permiso para la tarea'),L('Would you like to explore the remaining suitable questions in Daybook?','Хотите самостоятельно исследовать оставшиеся подходящие вопросы в Daybook?','¿Quieres explorar las preguntas pendientes adecuadas en Daybook?'),{...control,separate:true})
const B=Object.freeze([
 F('review_homework','situation',L('Practice since last session','Практика после прошлой встречи','Práctica desde la última sesión'),L('What did you actually try or notice after our last session?','Что вы действительно попробовали или заметили после прошлой встречи?','¿Qué probaste u observaste después de la última sesión?'),{...safe}),
 F('episode','situation',L('Specific difficult episode','Конкретная трудная ситуация','Situación difícil concreta'),L('Could you describe one recent situation where you needed support?','Можете описать один недавний момент, когда вам нужна была поддержка?','¿Puedes describir una situación reciente en la que necesitabas apoyo?'),core),
 F('feelings','situation',L('State in that situation','Состояние в этой ситуации','Estado en esa situación'),L('What did you notice in yourself then?','Что вы тогда заметили в себе?','¿Qué notaste en ti en ese momento?')),
 F('needs','situation',L('Need for support','Потребность в поддержке','Necesidad de apoyo'),L('What kind of support did you need most then?','Какой поддержки вам тогда особенно не хватало?','¿Qué tipo de apoyo necesitabas más entonces?'),{...core,...safe}),
 F('limits','situation',L('Comfort and limitations','Границы и ограничения','Límites y comodidad'),L('What should we respect so this does not become harder for you?','Что важно учесть, чтобы вам не стало тяжелее?','¿Qué debemos respetar para que esto no te resulte más difícil?')),
 F('support_scale_consent','situation',L('Optional support rating','Добровольная оценка доступности поддержки','Valoración opcional del apoyo'),L('Would you like to rate how available support feels, before and after our conversation?','Хотите оценить доступность поддержки до и после разговора?','¿Quieres valorar cuán disponible sientes el apoyo antes y después de conversar?'),{...control,...optional}),
 F('optional_scale_before','situation',L('Support available before','Доступность поддержки до','Apoyo disponible antes'),L('Before our practice, how available does support feel from 0 (not at all) to 10 (fully available)?','До практики: насколько доступной кажется поддержка от 0 (совсем нет) до 10 (полностью доступна)?','Antes de la práctica, ¿cuán disponible sientes el apoyo de 0 (nada) a 10 (totalmente)?'),{...optional,requiresConsent:'support_scale_consent',metric:true}),
 F('exception_example','resources',L('A time it was easier','Когда справляться было легче','Un momento en que fue más fácil'),L('Was there a similar moment when things were a little easier? If so, what was different?','Был ли похожий момент, когда справляться было немного легче? Если да, что было иначе?','¿Hubo un momento similar en que fue un poco más fácil? Si fue así, ¿qué fue distinto?')),
 F('resources','resources',L('Available resources','Доступные ресурсы','Recursos disponibles'),L('What or who actually helped, or could realistically support you now?','Что или кто действительно помогал или может реально поддержать вас сейчас?','¿Qué o quién te ayudó de verdad o podría apoyarte ahora?'),{...core,...safe}),
 F('strengths','resources',L('Personal strength','Личная сильная сторона','Fortaleza personal'),L('What personal strength could you draw on?','На какую свою способность вы могли бы опереться?','¿En qué fortaleza personal podrías apoyarte?'),{...optional,...safe}),
 F('selected_support','practice',L('Chosen support','Выбранная опора','Apoyo elegido'),L('Which available support, if any, would you choose?','Какую доступную опору вы выбираете, если она есть?','¿Qué apoyo disponible elegirías, si hay alguno?'),{...core,...safe}),
 F('practice_consent','practice',L('Permission to try','Согласие на пробу','Permiso para probar'),L('Would you like to try one gentle, safe step here, if it is comfortable for you?','Хотите попробовать здесь один бережный и безопасный шаг, если вам комфортно?','¿Quieres probar aquí un paso suave y seguro, si te resulta cómodo?'),{...control,priority:'P0',result:true}),
 F('test_status','practice',L('What was actually tried or planned','Что реально сделано или только запланировано','Qué se probó o solo se planificó'),L('Which actually happened: tried, planned for later, stopped, declined, or just talked? You may add details after that.','Что действительно произошло: попробовал(а), запланировал(а) на потом, остановил(а), отказался(ась) или только разговор? Можно добавить детали после этого.','¿Qué ocurrió realmente: lo probaste, lo planificaste, lo interrumpiste, lo rechazaste o solo conversamos? Puedes añadir detalles después.'),{...core,requiresConsent:'practice_consent'}),
 F('test_observation','practice',L('Observed effect, if tried','Наблюдение, если была проба','Efecto observado, si hubo prueba'),L('If you tried the step, what did you notice: helpful, unchanged, or less comfortable? Otherwise you can skip.','Если вы попробовали шаг, что заметили: помогло, без изменений или стало менее комфортно? Если пробы не было, можно пропустить.','Si probaste el paso, ¿qué notaste: ayuda, ningún cambio o menos comodidad? Si no lo probaste, puedes omitirlo.'),{...core,requiresConsent:'practice_consent'}),
 F('optional_scale_after','practice',L('Support available after','Доступность поддержки после','Apoyo disponible después'),L('After our conversation, how available does support feel on the same scale from 0 (not at all) to 10 (fully available)?','После разговора: насколько доступной кажется поддержка по той же шкале от 0 (совсем нет) до 10 (полностью доступна)?','Después de conversar, ¿cuán disponible sientes el apoyo en la misma escala de 0 (nada) a 10 (totalmente)?'),{...optional,requiresConsent:'support_scale_consent',metric:true}),
 F('transfer_action','transfer',L('One support action','Одно действие поддержки','Una acción de apoyo'),L('What one realistic action could you use outside this conversation, if you choose?','Какое одно реальное действие поддержки вы могли бы применить вне разговора, если хотите?','¿Qué acción de apoyo realista podrías usar fuera de la conversación, si quieres?'),{...core,...safe}),
 F('timing_or_condition','transfer',L('When to use it','Когда применить','Cuándo aplicarlo'),L('When or in what situation would you try this action?','Когда или в какой ситуации вы попробуете это действие?','¿Cuándo o en qué situación probarías esta acción?'),{...core,...safe}),
 F('helpfulness_indicator','transfer',L('Sign of usefulness','Признак полезности','Señal de utilidad'),L('What would tell you whether the action is helpful?','По какому признаку вы поймёте, помогает ли это действие?','¿Qué te indicaría si la acción te ayuda?'),{...core,...safe}),
 F('stop_or_fallback','transfer',L('Stop or alternative','Остановка или альтернатива','Pausa o alternativa'),L('What could you do instead, or when would you stop if this is not helpful?','Когда стоит остановиться или что можно сделать вместо этого, если не помогает?','¿Cuándo pararías o qué harías en su lugar si no ayuda?'),{...safe}),
 // Optional extension goes after core so it cannot replace support work.
 F('inner_consent','resources',L('Optional meaning axes','Добровольные оси смысла','Ejes de sentido opcionales'),L('Only if you wish and there is time, would you like to explore the inner meaning axes?','Только если хотите и есть время: хотите исследовать внутренние оси смысла?','Solo si quieres y hay tiempo, ¿te gustaría explorar los ejes internos de sentido?'),{...control,...optional}),
 ...INNER_VECTOR_ITEMS.map(axis=>F('inner_'+axis.id,'resources',axis.name,L('For '+axis.name.en+', what are your current and desired ratings from 0 to 10?',''+axis.name.ru+': какие оценки от 0 до 10 сейчас и какие желаемые?','Para '+axis.name.es+', ¿qué valoraciones actual y deseada das del 0 al 10?'),{...optional,requiresConsent:'inner_consent',homework:true,result:false})),
 F('reviewed_summary','integration',L('Review of support plan','Сверка плана поддержки','Revisión del plan de apoyo'),L('Does this accurately reflect your support needs and choice?','Это точно отражает вашу потребность в поддержке и ваш выбор?','¿Esto refleja correctamente tu necesidad de apoyo y tu elección?'),review),
 homeworkConsent
])
const C=Object.freeze([
 F('changes','review',L('Observed changes','Наблюдаемые изменения','Cambios observados'),L('What actually helped or did not help since the previous session?','Что действительно помогло или не сработало после предыдущей встречи?','¿Qué ayudó o no funcionó desde la sesión anterior?'),{...safe}),
 F('review_homework','review',L('Practice since last session','Практика после прошлой встречи','Práctica desde la última sesión'),L('What did you actually try between sessions, if anything?','Что вы действительно попробовали между встречами, если пробовали?','¿Qué probaste de verdad entre sesiones, si probaste algo?'),{...safe}),
 F('priority','review',L('Chosen life priority','Выбранный жизненный приоритет','Prioridad vital elegida'),L('Which area matters most to you now?','Какая сфера сейчас для вас важнее всего?','¿Qué área es más importante para ti ahora?'),{...core,...safe}),
 F('goal_status','goal',L('Readiness to choose a goal','Готовность выбрать цель','Disposición para elegir una meta'),L('Would you like to choose a concrete goal now? You can say no or later.','Хотите сейчас выбрать конкретную цель? Можно ответить нет или позже.','¿Quieres elegir una meta concreta ahora? Puedes decir no o más tarde.'),{...control,priority:'P0',result:true}),
 F('goal','goal',L('Personal goal','Личная цель','Meta personal'),L('What specific outcome would you like to achieve?','Какого конкретного результата вы хотите достичь?','¿Qué resultado concreto quieres lograr?'),{...core,...safe,requiresConsent:'goal_status'}),
 F('why','goal',L('Personal motivation','Личная мотивация','Motivación personal'),L('Why does this outcome matter to you personally?','Почему этот результат важен лично для вас?','¿Por qué te importa personalmente este resultado?'),{...core,...safe,requiresConsent:'goal_status'}),
 F('controllable_scope','goal',L('Within your control','Что зависит от вас','Lo que depende de ti'),L('Which part of this goal is within your control?','Какая часть этой цели зависит от вас?','¿Qué parte de esta meta está bajo tu control?'),{...safe,requiresConsent:'goal_status'}),
 F('baseline','reality',L('Starting point','Исходная точка','Punto de partida'),L('What is your actual starting point today?','Какова ваша реальная исходная точка сегодня?','¿Cuál es tu punto de partida real hoy?'),{...core,...safe,requiresConsent:'goal_status'}),
 F('success','reality',L('Observable criterion','Наблюдаемый критерий','Criterio observable'),L('What observable sign would tell you that you have made progress?','По какому наблюдаемому признаку вы поймёте, что продвинулись?','¿Qué señal observable te indicaría que has avanzado?'),{...core,...safe,requiresConsent:'goal_status'}),
 F('horizon','reality',L('Realistic horizon','Реалистичный горизонт','Horizonte realista'),L('What time horizon seems realistic to you?','Какой срок или горизонт кажется вам реалистичным?','¿Qué horizonte de tiempo te parece realista?'),{...core,...safe,requiresConsent:'goal_status'}),
 F('options','action',L('Available options','Доступные варианты','Opciones disponibles'),L('What one or two first actions or ways to explore this are available?','Какие один-два первых действия или способа исследования доступны?','¿Qué una o dos primeras acciones o formas de explorarlo tienes a tu alcance?'),{...safe}),
 F('next','action',L('Your voluntary first step','Ваш добровольный первый шаг','Tu primer paso voluntario'),L('What one step, if any, would you choose for yourself?','Какой один шаг вы выбираете для себя, если готовы?','¿Qué paso elegirías para ti, si quieres elegir alguno?'),{...core,...safe}),
 F('timing','action',L('Time or condition','Срок или условие','Tiempo o condición'),L('When or under what condition would you take this step?','Когда или при каком условии вы сделаете этот шаг?','¿Cuándo o en qué condición darías este paso?'),{...core,...safe}),
 F('confidence','action',L('Confidence in the step','Уверенность в шаге','Confianza en el paso'),L('If you wish, how feasible does this step feel, from 0 to 10?','Если хотите: насколько выполним этот шаг по шкале от 0 до 10?','Si quieres, ¿cuán viable te parece este paso de 0 a 10?'),{...optional,metric:true}),
 F('obstacle','action',L('Likely obstacle','Возможное препятствие','Obstáculo probable'),L('What one obstacle might make this step difficult?','Какое одно препятствие может затруднить этот шаг?','¿Qué obstáculo podría dificultar este paso?'),{...safe}),
 F('if_then','action',L('If–then alternative','Запасной план если — то','Alternativa si–entonces'),L('If that obstacle occurs, what realistic alternative could you choose?','Если это препятствие возникнет, какой реальный запасной вариант вы выберете?','Si aparece ese obstáculo, ¿qué alternativa realista podrías elegir?'),{...safe}),
 F('dream_image','goal',L('Optional inspiring dream','Добровольный образ мечты','Sueño inspirador opcional'),L('If you wish, what image of the future inspires you, without making it an obligation?','Если хотите, какой образ будущего вас вдохновляет без обязательства его осуществить?','Si quieres, ¿qué imagen de futuro te inspira, sin convertirla en una obligación?'),{...optional,...safe,result:false}),
 F('route_choice','integration',L('Next direction','Дальнейший маршрут','Siguiente rumbo'),L('What direction, if any, feels right after this course?','Какой дальнейший маршрут, если он нужен, вам подходит?','¿Qué rumbo, si alguno, te parece adecuado después de este curso?')),
 F('reviewed_summary','integration',L('Review of goal and first step','Сверка цели и первого шага','Revisión de la meta y el primer paso'),L('Does this reflect your own goal or decision to defer, and the step you chose?','Это отражает вашу собственную цель или решение отложить выбор и выбранный вами шаг?','¿Esto refleja tu propia meta o decisión de aplazarla, y el paso que elegiste?'),review),
 F('separate_plan_consent','integration',L('Save to My Coaching Plan','Согласие на My Coaching Plan','Permiso para My Coaching Plan'),L('Would you like to add your chosen goal and action to My Coaching Plan?','Хотите добавить выбранную цель и действие в My Coaching Plan?','¿Quieres añadir la meta y acción elegidas a My Coaching Plan?'),{...control,separate:true}),
 homeworkConsent
])
const definitions=Object.freeze({clarity_day_2:{stages:stagesB,fields:B,windows:[['situation',240],['resources',480],['practice',840],['transfer',1020],['integration',1140],['reserve',1200]]},clarity_day_3:{stages:stagesC,fields:C,windows:[['review',180],['goal',420],['reality',660],['action',1020],['integration',1140],['reserve',1200]]}})
export function clarityVersionedScenario(id,locale='en'){
 if(id==='clarity_day_1')return clarityDayOneScenario(locale)
 const d=definitions[id];if(!d)return null
 const l=lang(locale)
 return {version:clarityScenarioVersion(id),stages:d.stages.map(s=>({id:s.id,label:s.label[l]})),fields:d.fields.map(f=>({...f,label:f.label[l],question:f.question[l]}))}
}
export function clarityScenarioGateFields(id){
 if(id==='clarity_day_1')return clarityDayOneGateFields()
 const d=definitions[id];if(!d)return []
 const fields=d.fields.filter(f=>!f.separate)
 return fields.map(f=>({id:f.id,kind:f.kind,...(f.requiresConsent?{requiresConsent:f.requiresConsent}:{}),...(f.kind==='review'?{reviewOf:fields.slice(0,fields.indexOf(f)).filter(x=>x.kind!=='review').map(x=>x.id)}:{})}))
}
export function clarityScenarioReviewOf(id,fieldId){
 return id==='clarity_day_1'?clarityDayOneReviewOf(fieldId):clarityScenarioGateFields(id).find(f=>f.id===fieldId)?.reviewOf||[]
}
export function clarityScenarioField(id,fieldId,locale='en'){
 return clarityVersionedScenario(id,locale)?.fields.find(f=>f.id===fieldId)||null
}
export function clarityScenarioTimeGuidance(id,seconds){
 if(id==='clarity_day_1')return clarityDayOneTimeGuidance(seconds)
 const d=definitions[id];if(!d)return ''
 if(!Number.isFinite(seconds)||seconds<0)return ' Wait for explicit consent before active time starts.'
 if(seconds>=1200)return ' Time limit reached: do not start another question; use trusted server closing.'
 const index=d.windows.findIndex(([,end])=>seconds<end)
 const [stage,end]=d.windows[index]
 const start=index===0?0:d.windows[index-1][1]
 if(seconds>=1020)return ' Integrate ('+(start/60)+'–'+(end/60)+' min, '+stage+'): verify only actual client facts and reviewed_summary if needed; do not start a deep topic. Preserve open fields. Time hint only.'
 const fields=d.fields.filter(f=>f.stage===stage&&!f.separate&&f.priority!=='P2')
 const core=fields.filter(f=>f.priority==='P0')
 const candidates=(core.length?core:fields).map(f=>f.id+(f.requiresConsent?' (after '+f.requiresConsent+' accepted)':''))
 const next=d.windows[index+1]?.[0]
 return ' Active phase: '+stage+' ('+(start/60)+'–'+(end/60)+' min; '+Math.ceil(end-seconds)+' sec to next window). Current checkpoint candidates, core first: '+candidates.join('; ')+'. Respond first; choose one relevant unanswered eligible checkpoint. Respect consent and safety. If ahead, bridge to '+next+'; if behind, defer optional detail. Time hint only.'
}
export function clarityScenarioGuidance(id,locale='en'){
 if(id==='clarity_day_1')return clarityDayOneModelGuidance(locale)
 const d=clarityVersionedScenario(id,locale);if(!d)return ''
 const extra=id==='clarity_day_2'?'One specific episode, need, available resource, own choice, safe optional trial or honest plan, observation, transfer. Never say a practice happened or helped unless the client reports it. If no resource is available, record that honestly and explore one realistic option without inventing support. If the client declines a trial, continue the conversation with a possible support action or listening-only outcome; do not propose ending the session. Before closing, verify the client’s own support choice, timing and sign of usefulness if available. Daybook follow-through: energy battery (episode/need), resource collection (available/chosen resource and actual trial or plan), moment of calm (optional practice and observation); independent reflections are not confirmed dialogue evidence. Comfort ratings are not the optional support-availability scale. Inner axes optional only after explicit permission and core work; do not replace the support plan. No medical or intensive trauma practice.':'Review actual observations; goal readiness is not an accepted goal. No/later means exploring/deferred, not failure. Never force goal selection or create a plan automatically. Dream is optional, not a goal. Confirm the client-owned goal, baseline, criterion, horizon, first action and timing.'
 return [d.version+'; '+extra,'Contact and consent before active time; close from minute 17; reserve 19–20. Active-time windows: '+definitions[id].windows.map(([stage,end],i)=>stage+' '+(i?definitions[id].windows[i-1][1]/60:0)+'–'+end/60+' min').join('; ')+'. Ask one relevant question, reuse consented facts, skip optional items if time is limited. Do not invent answers, saves, proof or completed stages. Homework requires trusted timed end and separate consent.',
  d.fields.filter(f=>!f.separate).map(f=>f.id+' ['+f.stage+'/'+f.priority+(f.requiresConsent?'; only if '+f.requiresConsent+' accepted':'')+']: '+f.question).join(' | ')].join('\n')
}
export function clarityMetricScore(id,text){
 if(!['optional_scale_before','optional_scale_after','confidence'].includes(id)||typeof text!=='string')return null
 const value=text.trim().replace(/[.!]+$/u,'')
 return /^(?:[0-9]|10)$/u.test(value)?Number(value):null
}
export function clarityIsMetric(id){return ['optional_scale_before','optional_scale_after','confidence'].includes(id)}

// Normalize only the client's explicit status word/phrase, never guess
// the practice outcome from a coach proposal, elapsed time or emotions.
export function clarityPracticeStatus(value){
 if(typeof value!=='string')return null
 const s=value.trim().normalize('NFKC').toLowerCase().replace(/[.!]+$/u,'')
 const rules=[
 ['attempted',/^(?:tried|attempted|i tried it|попробовал(?:а)?|попробовал\(а\)|пробовал(?:а)?|lo probé|probé|intenté)(?:$|\s*[:—;,]\s*)/u],
 ['planned',/^(?:planned|planned for later|only planned|запланировал(?:а)?|запланировал\(а\)|только план|только запланировал(?:а)?|lo planifiqué|planifiqué|solo planificado)(?:$|\s*[:—;,]\s*)/u],
 ['stopped',/^(?:stopped|i stopped|остановил(?:а)?|остановил\(а\)|остановил(?:ся|ась)|lo interrumpí|interrumpí|paré)(?:$|\s*[:—;,]\s*)/u],
 ['declined',/^(?:declined|i declined|отказал(?:ся|ась)|отказался\(ась\)|lo rechacé|rechacé)(?:$|\s*[:—;,]\s*)/u],
 ['listening_only',/^(?:just talked|listening only|only talked|только разговор|просто поговорили|только выслушали|solo conversamos|solo escuchamos)(?:$|\s*[:—;,]\s*)/u]
 ]
 return rules.find(([,re])=>re.test(s))?.[0]||null
}

// A practice observation requires a separate, confirmed report of an actual
// attempt. Consent to try, a future plan and conversation alone are not it.
// The same rule is used by the Director, review ledger and result projection.
export function clarityScenarioEvidenceSource(courseId,fieldId){
 return courseId==='clarity_day_2'&&fieldId==='test_observation'?'test_status':null
}
export function clarityScenarioEvidenceAllowed(courseId,fieldId,lookup){
 const source=clarityScenarioEvidenceSource(courseId,fieldId)
 if(!source)return true
 const row=lookup(source)
 return row?.status==='confirmed'&&['attempted','stopped'].includes(clarityPracticeStatus(row.quote))
}
