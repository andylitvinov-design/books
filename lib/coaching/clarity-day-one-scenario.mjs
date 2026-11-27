/** Owner-approved Clarity Day 1 v5, 26 Nov 2026.
 * Method policy, not proof of delivery, consent, durable save or time.
 * Existing archived protocol IDs and six-gate opening remain compatible.
 */
export const CLARITY_DAY_ONE_VERSION='hh-clarity-day-one-v5'
const L=(en,ru,es)=>Object.freeze({en,ru,es})
const F=(id,stage,question,alternative,capture,priority='optional')=>Object.freeze({id,stage,question,alternative,capture:Object.freeze(capture),priority})
const axes=Object.freeze({
 body_health:L('body and health','телом и здоровьем','tu cuerpo y salud'),
 emotional_wellbeing:L('emotional wellbeing','эмоциональным состоянием','tu bienestar emocional'),
 relationships:L('relationships','отношениями','tus relaciones'),
 career_business:L('career and business','работой и карьерой','tu carrera y trabajo'),
 finance:L('finances','финансовым положением','tus finanzas'),
 personal_growth:L('personal growth','личностным развитием','tu desarrollo personal'),
 lifestyle:L('lifestyle','образом жизни','tu estilo de vida'),
 meaning_purpose:L('meaning and purpose','смыслом и направлением жизни','el sentido y rumbo de tu vida')
})
export const CLARITY_DAY_ONE_AXES=Object.freeze(Object.keys(axes))
export const CLARITY_DAY_ONE_STAGES=Object.freeze([
 ['contact',L('Contact and continuity','Контакт и преемственность','Contacto y continuidad')],
 ['situation',L('Situation and state','Ситуация и состояние','Situación y estado')],
 ['balance',L('Life balance','Жизненный баланс','Equilibrio vital')],
 ['verification',L('Verification','Перепроверка','Verificación')],
 ['needs',L('Needs and priorities','Потребности','Necesidades')],
 ['support',L('Support','Опора','Apoyo')],
 ['integration',L('Integration','Итоги','Integración')]
].map(([id,label])=>Object.freeze({id,label})))
export const CLARITY_DAY_ONE_BUDGETS=Object.freeze({
 short:Object.freeze([3,4,1,5,3,3,1]),
 normal:Object.freeze([4,5,1,4,2,3,1]),
 long:Object.freeze([6,3,1,4,2,3,1])
})
export const CLARITY_DAY_ONE_FIELDS=Object.freeze([
 F('invitation','contact',L('Would you like to have a coaching conversation?','Хотите, мы посвятим немного времени вам и тому, что сейчас важно?','¿Te gustaría conversar sobre lo que te importa?'),L('Would coaching be useful today?','Хотите сегодня немного поработать с коучем?','¿Te serviría una sesión hoy?'),['sessionConsent'],'core'),
 F('name','contact',L('How may I address you?','Как мне лучше к вам обращаться?','¿Cómo prefieres que te llame?'),L('What name feels comfortable?','Какое обращение вам комфортно?','¿Qué nombre te resulta cómodo?'),['preferredName']),
 F('continuity','contact',L('May I check our saved sessions so we do not start over?','Могу я обратиться к данным предыдущих встреч, чтобы не начинать сначала?','¿Puedo consultar las sesiones guardadas para no empezar de cero?'),L('Would you like to continue or discuss something new?','Хотите продолжить с прошлого пункта или обсудить новое?','¿Quieres continuar o hablar de algo nuevo?'),['historyConsent','providerConsent','previousOrNew','lastVerifiedFieldId','pendingFieldId','oldAnswers','revision','remainingSeconds'],'core'),
 F('confirmation','contact',L('Shall we begin?','Можем начать?','¿Empezamos?'),L('Are you ready to begin?','Готовы начать нашу коучинговую сессию?','¿Quieres comenzar?'),['startConsent'],'core'),
 F('situation','situation',L('What is happening in your life that you would like to understand better?','Что сейчас происходит в вашей жизни, в чём хотелось бы разобраться?','¿Qué está pasando en tu vida que te gustaría comprender mejor?'),L('What is taking most of your attention?','Что сейчас занимает больше всего вашего внимания?','¿Qué ocupa más tu atención?'),['situation','request','direction'],'core'),
 F('feelings','situation',L('How do you feel about that?','Как вы себя чувствуете в связи с этим?','¿Cómo te sientes al respecto?'),L('What matters or worries you most about it?','Что особенно волнует вас в этом?','¿Qué te preocupa especialmente?'),['emotionalState','significantExperience']),
 F('impact','situation',L('How does this affect your everyday life?','Как это отражается на вашей повседневной жизни?','¿Cómo afecta a tu vida cotidiana?'),L('Could you share a recent example?','Можете привести недавний пример?','¿Puedes contar un ejemplo reciente?'),['difficulty','example','impact'],'core'),
 F('balance_consent','balance',L('Shall we look more broadly at your life and make a life balance map?','Предлагаю немного шире посмотреть на вашу жизнь и составить карту жизненного баланса. Хотите попробовать?','¿Te gustaría mirar tu vida más ampliamente y crear un mapa de equilibrio vital?'),L('Would a short life balance check-in be useful?','Хотите сделать короткий обзор жизненного баланса?','¿Te serviría una revisión breve de tu equilibrio vital?'),['methodConsent'],'core'),
 ...CLARITY_DAY_ONE_AXES.map(id=>F('outer_'+id,'balance',L('How satisfied are you with '+axes[id].en+' right now, from 0 to 10?','Насколько вы сейчас довольны '+axes[id].ru+' по шкале от 0 до 10?','¿Qué satisfacción tienes con '+axes[id].es+' del 0 al 10?'),L('What current rating would you give this area?','Какую текущую оценку вы бы поставили этой сфере?','¿Qué valoración actual darías a esta área?'),['axisId','current','source','observedAt','recorded','verified'],'profile')),
 F('balance_review','verification',L('Does this map reflect how you see your life?','Эта карта отражает ваше ощущение своей жизни или что-то стоит поправить?','¿Este mapa refleja cómo ves tu vida?'),L('Did I record this rating correctly?','Правильно ли я записал эту оценку?','¿Anoté correctamente esta valoración?'),['corrections','missingFields','verificationStatus'],'profile'),
 F('priority','needs',L('Which area would you like to give more attention to?','Какой сфере жизни сейчас особенно нужно внимание?','¿A qué área te gustaría prestar más atención?'),L('What stands out to you?','Что больше всего привлекает ваше внимание?','¿Qué llama más tu atención?'),['priorityId','explicitDefer','clientObservation'],'core'),
 F('needs','needs',L('What do you need more of in this area?','Чего вам здесь особенно не хватает?','¿Qué necesitas más en esta área?'),L('What would you like to be different?','Как вам хотелось бы, чтобы было?','¿Qué te gustaría que fuera diferente?'),['need_or_desired_change','desiredState','desiredRatingIfUseful'],'core'),
 F('why','needs',L('What would that change for you?','Что это изменило бы лично для вас?','¿Qué cambiaría eso para ti?'),L('What makes that important?','Почему это важно для вас?','¿Por qué te importa?'),['value','motivation','obstacle']),
 F('resources','support',L('Who or what could support you right now?','Что или кто мог бы вас сейчас поддержать?','¿Quién o qué podría apoyarte ahora?'),L('What already helps, even a little?','Что уже помогает хотя бы немного?','¿Qué ya te ayuda, aunque sea un poco?'),['resource','resourceSource','noResourceFound']),
 F('next','support',L('What small thing would you like to notice or try?','Что небольшое хотелось бы понаблюдать или попробовать до следующей встречи?','¿Qué pequeño paso te gustaría observar o probar?'),L('Would you prefer to leave this open?','Хотите пока оставить это открытым?','¿Prefieres dejarlo abierto?'),['voluntaryAction','observation']),
 F('learning','integration',L('What became a little clearer for you today?','Что вам сегодня стало немного яснее о себе?','¿Qué te ha quedado un poco más claro hoy?'),L('What was most useful for you?','Что оказалось для вас наиболее важным?','¿Qué fue lo más útil para ti?'),['clientInsight','stateAfter']),
 F('reviewed_summary','integration',L('Did I understand what matters to you correctly?','Правильно ли я понял то, что для вас важно?','¿Comprendí bien lo que te importa?'),L('What would you correct or add?','Что хотелось бы поправить или дополнить?','¿Qué corregirías o añadirías?'),['reviewed_summary','corrections','openFields'],'core'),
 F('homework_consent','integration',L('Would you like to explore the remaining questions in Daybook?','Хотите самостоятельно исследовать оставшиеся вопросы в Daybook?','¿Te gustaría explorar las preguntas pendientes en Daybook?'),L('Would you rather leave them for another session?','Предпочитаете оставить их для следующей встречи?','¿Prefieres dejarlas para otra sesión?'),['homeworkConsent','pendingFieldIds'])
])
const lang=l=>['en','ru','es'].includes(l)?l:'en'
export function clarityDayOneScenario(locale='en'){
 const k=lang(locale)
 return {version:CLARITY_DAY_ONE_VERSION,stages:CLARITY_DAY_ONE_STAGES.map(s=>({id:s.id,label:s.label[k]})),fields:CLARITY_DAY_ONE_FIELDS.map(f=>({...f,question:f.question[k],alternative:f.alternative[k]}))}
}
export function clarityDayOneTimebox(elapsedSeconds,pace='normal'){
 if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)return {stage:'contact',remaining:null,close:false,noNewTopic:false}
 const budget=CLARITY_DAY_ONE_BUDGETS[pace]||CLARITY_DAY_ONE_BUDGETS.normal
 let end=0,stage='ended',closeAt=0
 const ids=['situation','balance','verification','needs','support','integration','reserve']
 closeAt=budget.slice(0,5).reduce((a,b)=>a+b,0)*60
 for(let i=0;i<budget.length;i++){end+=budget[i]*60;if(elapsedSeconds<end){stage=ids[i];break}}
 return {stage,remaining:Math.max(0,1200-elapsedSeconds),close:elapsedSeconds>=closeAt,noNewTopic:elapsedSeconds>=1080}
}
const terminal=new Set(['confirmed','skipped_by_client'])
const core=['situation','impact','priority','needs','reviewed_summary']
// Accept only trusted server-projected rows in future ledger integration.
// History alone never establishes method consent for a new logical session.
export function clarityDayOneGapPlan({rows=[],elapsedSeconds=null,methodConsent='unknown',pace='normal',timedEnd=false}={}){
 const map=new Map((Array.isArray(rows)?rows:[]).filter(r=>r&&typeof r.id==='string').map(r=>[r.id,r]))
 const fields=CLARITY_DAY_ONE_FIELDS.filter(f=>f.stage!=='contact')
 const status=id=>map.get(id)?.status||'not_explored'
 const open=fields.filter(f=>!terminal.has(status(f.id)))
 const t=clarityDayOneTimebox(elapsedSeconds,pace)
 const consent=methodConsent==='accepted'&&status('balance_consent')==='confirmed'?'accepted':['declined','deferred'].includes(methodConsent)?methodConsent:'unknown'
 const allowed=f=>f.id!=='homework_consent'&&(f.stage==='verification'||f.id.startsWith('outer_')?consent==='accepted':true)&&(f.id==='balance_consent'?consent==='unknown':true)
 const choose=ids=>ids.map(id=>open.find(f=>f.id===id&&allowed(f))).find(Boolean)||null
 let next=null
 if(t.stage!=='contact'&&t.stage!=='ended'){
  if(t.close)next=choose(['learning','reviewed_summary'])
  else if(t.stage==='balance'&&consent==='unknown')next=choose(['balance_consent'])
  else if(t.stage==='verification')next=consent==='accepted'?(open.find(f=>f.id.startsWith('outer_')&&status(f.id)==='needs_confirmation')||choose(['balance_review'])):choose(['priority','needs'])
  else next=open.find(f=>f.stage===t.stage&&allowed(f))||null
  if(!next&&!t.close&&['balance','verification','needs','support'].includes(t.stage))next=choose(['priority','needs','resources'])
 }
 // No homework from an elapsed-time hint, pause or disconnected client.
 const homework=timedEnd===true?open.filter(f=>allowed(f)&&!['balance_consent','balance_review','reviewed_summary'].includes(f.id)).map(f=>f.id):[]
 return {version:CLARITY_DAY_ONE_VERSION,...t,nextFieldId:next?.id||null,confirmed:fields.filter(f=>status(f.id)==='confirmed').map(f=>f.id),unresolved:open.map(f=>f.id),coreMissing:core.filter(id=>status(id)!=='confirmed'),homeworkCandidates:homework}
}
export function clarityDayOneBalanceSummary(rows=[]){
 const known=CLARITY_DAY_ONE_AXES.flatMap(axis=>{
  const n=rows.find(r=>r.id==='outer_'+axis&&r.status==='confirmed')?.current
  return Number.isInteger(n)&&n>=0&&n<=10?[{axis,current:n}]:[]
 })
 const min=known.length?Math.min(...known.map(x=>x.current)):null,max=known.length?Math.max(...known.map(x=>x.current)):null
 return {coverage:known.length,total:8,known,lowest:known.filter(x=>x.current===min).map(x=>x.axis),highest:known.filter(x=>x.current===max).map(x=>x.axis),priority:null}
}
export const COACH_SHARED_SESSION_FLOW='Shared flow: consented continuity, intelligent missing-data interview, explicit permission before proposed method, method execution, verification of unclear or incomplete data, client-owned insight, available support, integration. Never repeat confirmed current facts, force every field, or treat prior memory, model answers, skipped fields or time as proof of completion. Use the selected course method. Pauses and disconnection are not completion.'
export function clarityDayOneModelGuidance(locale='en'){
 const p=clarityDayOneScenario(locale)
 return [
  'Clarity Day 1 v5.0 is an adaptive dialogue, not a questionnaire. Preserve authoritative opening gates; do not repeat their direction or feelings answers. New contact sequence: invitation, name, authorized continuity/preconsulting, explicit start; versioned opening adapter owns rollout. Never start the clock from AI speech.',
  'After readiness: 0–4 min situation and state; 4–9 consent and current life balance; 9–10 verify unclear/missing ratings; 10–14 priority and needs; 14–16 support; 16–19 integration; 19–20 reserve. Time hints are advisory. Ask one question at a time; accept skips.',
  'Before any balance questions, explicitly propose the optional wheel and wait for a clear yes in this session. No or later means bypass balance and verification and continue needs. Ask one current rating 0–10 per unknown area, not two ratings for all eight. Desired rating only for 1–2 chosen priorities when useful. Reuse authorized current values; never guess. Partial wheel is valid. Compare only known values; lowest is not automatically client priority. Do not use inner axes or a full goal plan on Day 1.',
  'Check only incomplete, ambiguous or inconsistent answers. At 16 min prioritize client-owned insight and reviewed summary; after 18 no new deep topic. Homework requires trusted normal timed end and separate consent. No invented save, stage advancement or completion.',
  'Scenario checkpoints and example questions (not mandatory to ask every field): '+p.fields.filter(f=>f.stage!=='contact'&&f.id!=='homework_consent').map(f=>f.id+' ['+f.stage+']: '+f.question+' (capture '+f.capture.join(', ')+')').join(' | ')
 ].join('\n')
}
export function clarityDayOneTimeGuidance(elapsedSeconds){
 const t=clarityDayOneTimebox(elapsedSeconds)
 if(t.stage==='contact')return ' Day 1: wait for explicit start; use the approved opening.'
 if(t.close)return ' Day 1: concise client-owned insight and reviewed summary. No new deep topic, forced completion or assumed homework. Time hint only.'
 if(t.stage==='balance')return ' Day 1: ask permission before the optional wheel; one current 0–10 per unknown area. Respect no/later; partial wheel is valid.'
 if(t.stage==='verification')return ' Day 1: verify only unclear or missing recorded ratings; never invent values or derive priority automatically.'
 if(t.stage==='needs')return ' Day 1: client-chosen priority and need or desired change. Ask only the missing relevant detail.'
 if(t.stage==='support')return ' Day 1: find one available source of support; a small step is optional.'
 return ' Day 1: current situation, impact and feelings only if missing. One question; no repeated intake.'
}
