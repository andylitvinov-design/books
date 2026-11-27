import {ANTI_STRESS_PROGRAM_ID,ANTI_STRESS_SESSION_IDS,coachProgramSettings,coachProgramModeInstruction} from './coach-program-mode.mjs'
const L=(en,ru,es)=>Object.freeze({en,ru,es})
const local=(v,locale)=>v[locale]||v.en
export const ANTI_STRESS_VERSION='hh-anti-stress-v1'
export const ANTI_STRESS_SESSION_SECONDS=900
export const ANTI_STRESS_PROGRAM_SECONDS=2700
const F=(id,stage,kind,label,question,choices)=>Object.freeze({id,stage,kind,label,question,...(choices?{choices:Object.freeze(choices)}:{})})
const rating=(id,stage,label,question)=>F(id,stage,'rating',label,question)
const status=F('practice_status','practice','choice',L('Practice status','Статус практики','Estado de práctica'),L('Did you try, adapt, stop or decline the practice?','Вы попробовали, изменили, остановили или решили не делать практику?','¿Probaste, adaptaste, detuviste o rechazaste la práctica?'),['attempted','adapted','stopped','declined','not_attempted'])
const consent=F('practice_consent','prepare','choice',L('Practice permission','Согласие на практику','Permiso para practicar'),L('Would you like to try this, adapt it, or skip it?','Хотите попробовать эту практику, изменить её или пропустить?','¿Quieres probar esta práctica, adaptarla u omitirla?'),['accepted','declined'])
const before=rating('stress_before','checkin',L('Tension before','Напряжение до','Tensión inicial'),L('If you want, how much tension do you feel right now, from 0 to 10?','Если хотите, сколько напряжения сейчас по шкале от 0 до 10?','Si quieres, ¿cuánta tensión sientes ahora, de 0 a 10?'))
const after=rating('stress_after','reflect',L('Tension after','Напряжение после','Tensión final'),L('If you want, what is your tension now on the same 0–10 scale?','Если хотите, сколько напряжения сейчас по той же шкале от 0 до 10?','Si quieres, ¿cuánta tensión sientes ahora en la misma escala de 0 a 10?'))
const confidence=rating('skill_confidence','transfer',L('Confidence using the skill','Уверенность в применении навыка','Confianza para usar la habilidad'),L('How confident do you feel trying this on your own, from 0 to 10?','Насколько уверенно вы сможете попробовать это самостоятельно, от 0 до 10?','¿Cuánta confianza tienes para probarlo por tu cuenta, de 0 a 10?'))
const stages=Object.freeze([
 ['contact',0,120,L('Contact','Контакт','Contacto')],
 ['checkin',120,240,L('Check-in','Самонаблюдение','Observación')],
 ['prepare',240,360,L('Preparation','Подготовка','Preparación')],
 ['practice',360,660,L('Practice','Практика','Práctica')],
 ['reflect',660,780,L('Reflection','Обратная связь','Reflexión')],
 ['transfer',780,900,L('Integration','Интеграция','Integración')]
].map(([id,from,to,label])=>Object.freeze({id,from,to,label})))
const lessons=Object.freeze([
 {title:L('My Ground','Моя опора','Mi apoyo'),skill:L('Orient to the present','Ориентация в настоящем','Orientación al presente'),
  practice:L('Offer a supported position, eyes open. Invite the client to notice one neutral object, one sound, and the contact with the floor or chair, one at a time. Allow 10–20 seconds of silence or longer if requested. Repeat the one cue the client chooses, without requiring relaxation. External attention alone is fine.',
   'Предложите удобную опору, глаза открыты. По одному предложите заметить нейтральный предмет, звук и контакт стоп с полом или тела со стулом. Дайте 10–20 секунд тишины или больше по просьбе. Повторите только выбранную клиентом опору; расслабление не обязательно. Можно ограничиться внешним вниманием.',
   'Ofrece una postura con apoyo y ojos abiertos. Invita a notar un objeto neutro, un sonido y el contacto con el suelo o la silla, uno a la vez. Permite 10–20 segundos de silencio o más si lo pide. Repite solo la señal elegida; no exijas relajación. Basta la atención externa.'),
  specific:[
   F('early_signal','checkin','text',L('Early stress signal','Ранний сигнал стресса','Señal temprana'),L('What lets you notice tension beginning, if anything?','По чему вы замечаете начало напряжения, если замечаете?','¿Qué te permite notar el inicio de la tensión, si algo?')),
   F('ground_anchor','prepare','text',L('Chosen anchor','Выбранная опора','Apoyo elegido'),L('Which neutral thing feels okay to notice: the chair, floor, or something around you?','Что вам комфортно замечать: стул, пол или что-то вокруг?','¿Qué te resulta cómodo notar: la silla, el suelo o algo alrededor?')),
   F('ground_observation','reflect','text',L('What I noticed','Что я заметил','Lo que noté'),L('What, if anything, did you notice during the practice?','Что, если что-то, вы заметили во время практики?','¿Qué notaste durante la práctica, si algo?')),
   F('ground_when','transfer','text',L('When to use the anchor','Когда применять опору','Cuándo usar el apoyo'),L('When might you choose to notice this anchor again?','Когда вы могли бы снова заметить эту опору?','¿Cuándo podrías volver a notar este apoyo?'))
  ]},
 {title:L('My Calm','Моё спокойствие','Mi calma'),skill:L('Notice and regulate gently','Мягкая саморегуляция','Regulación suave'),
  practice:L('Recall the chosen grounding cue only with permission. Offer a choice: notice an ordinary unforced breath, gently loosen shoulders if comfortable, or stay with a neutral external cue. Guide one short round, then wait and ask whether to repeat or stop. No breath holds, forced breathing, body scanning when uncomfortable, or intense memories.',
   'С разрешения напомните прежнюю опору. Предложите выбор: замечать обычное дыхание без усилия, мягко отпустить плечи, если комфортно, или остаться с внешним нейтральным ориентиром. Один короткий круг, пауза, затем спросите, повторить ли или остановиться. Без задержек и форсирования дыхания, сканирования тела при дискомфорте и тяжёлых воспоминаний.',
   'Con permiso, recuerda el apoyo anterior. Ofrece elegir: notar la respiración natural sin esfuerzo, aflojar suavemente los hombros si es cómodo o mantener una referencia externa neutra. Una ronda breve, pausa y pregunta si quiere repetir o parar. Sin retenciones, respiración forzada, exploración corporal incómoda ni recuerdos intensos.'),
  specific:[
   F('calm_signal','checkin','text',L('Current signal','Текущий сигнал','Señal actual'),L('What signal feels manageable to notice right now?','Какой сигнал сейчас можно заметить без лишнего напряжения?','¿Qué señal te resulta manejable notar ahora?')),
   F('calm_variant','prepare','text',L('Chosen regulation option','Выбранный способ регуляции','Opción de regulación elegida'),L('Would you prefer natural breathing, a gentle shoulder release, or an external anchor?','Что комфортнее: обычное дыхание, мягкое отпускание плеч или внешний ориентир?','¿Prefieres respiración natural, aflojar los hombros o un apoyo externo?')),
   F('calm_observation','reflect','text',L('Response to practice','Реакция на практику','Respuesta a la práctica'),L('What changed, stayed the same, or became uncomfortable?','Что изменилось, осталось как было или стало некомфортно?','¿Qué cambió, siguió igual o resultó incómodo?')),
   F('calm_when','transfer','text',L('Personal regulation cue','Личная подсказка','Señal personal'),L('In what everyday moment might this option be useful to try?','В какой повседневный момент вы могли бы попробовать этот способ?','¿En qué momento cotidiano podrías probar esta opción?'))
  ]},
 {title:L('My Resource','Мой ресурс','Mi recurso'),skill:L('Choose and use accessible support','Выбор доступной поддержки','Elegir y usar apoyo accesible'),
  practice:L('Choose an accessible present-day resource: a neutral object, supportive phrase in the client’s own words, a short rest or a trusted person. With permission rehearse one small if–then sequence in a mild ordinary situation, without reliving it. Use the earlier grounding cue only if desired. Offer a fallback and stop if distress rises.',
   'Выберите доступный ресурс в настоящем: нейтральный предмет, поддерживающую фразу клиента, короткий отдых или доверенного человека. С согласия отрепетируйте один маленький сценарий «если — то» в лёгкой бытовой ситуации без её повторного проживания. Прежнюю опору используйте только по желанию. Предложите запасной вариант; при усилении дистресса остановитесь.',
   'Elige un recurso disponible hoy: un objeto neutro, una frase propia de apoyo, un descanso breve o una persona de confianza. Con permiso ensaya una pequeña secuencia si–entonces en una situación cotidiana leve, sin revivirla. Usa el apoyo anterior solo si quiere. Ofrece una alternativa y para si aumenta el malestar.'),
  specific:[
   F('resource_need','checkin','text',L('Support need','Потребность в поддержке','Necesidad de apoyo'),L('What kind of support would feel useful today?','Какая поддержка сегодня была бы полезна?','¿Qué tipo de apoyo te resultaría útil hoy?')),
   F('chosen_resource','prepare','text',L('Chosen resource','Выбранный ресурс','Recurso elegido'),L('Which available resource would you like to try?','Какой доступный ресурс вы хотели бы попробовать?','¿Qué recurso disponible te gustaría probar?')),
   F('resource_observation','reflect','text',L('Response to resource','Отклик на ресурс','Respuesta al recurso'),L('What was your experience of trying or considering this resource?','Что вы заметили, пробуя или рассматривая этот ресурс?','¿Qué notaste al probar o considerar este recurso?')),
   F('resource_plan','transfer','text',L('My if–then reminder','Моя подсказка если — то','Mi recordatorio si–entonces'),L('If you notice an early stress signal, what small supportive step might you choose?','Если заметите ранний сигнал стресса, какой небольшой шаг поддержки могли бы выбрать?','Si notas una señal temprana de estrés, ¿qué pequeño paso de apoyo podrías elegir?'))
  ]}
].map(Object.freeze))
const localeOf=l=>['en','ru','es'].includes(l)?l:'en'
export function antiStressScenario(sessionId,locale='en'){
 const n=ANTI_STRESS_SESSION_IDS.indexOf(sessionId);if(n<0)return null
 const l=localeOf(locale),d=lessons[n]
 const fields=[before,...d.specific.filter(f=>f.stage==='checkin'),...d.specific.filter(f=>f.stage==='prepare'),consent,status,after,...d.specific.filter(f=>f.stage==='reflect'),confidence,...d.specific.filter(f=>f.stage==='transfer')]
 return {version:ANTI_STRESS_VERSION+'-s'+(n+1),programId:ANTI_STRESS_PROGRAM_ID,programType:coachProgramSettings(ANTI_STRESS_PROGRAM_ID).type,sessionId,number:n+1,title:local(d.title,l),skill:local(d.skill,l),durationSeconds:ANTI_STRESS_SESSION_SECONDS,minuteDots:15,
 stages:stages.map(s=>({...s,label:local(s.label,l)})),practice:local(d.practice,l),fields:fields.map(f=>({...f,label:local(f.label,l),question:local(f.question,l)}))}
}
export const ANTI_STRESS_COURSE=Object.freeze({id:ANTI_STRESS_PROGRAM_ID,type:'therapy',title:L('Anti-Stress · Inner Balance','Антистресс · Внутренняя опора','Antiestrés · Equilibrio interior'),durationSeconds:ANTI_STRESS_PROGRAM_SECONDS,sessionSeconds:ANTI_STRESS_SESSION_SECONDS,sessions:Object.freeze(ANTI_STRESS_SESSION_IDS.map((id,i)=>Object.freeze({id,programId:ANTI_STRESS_PROGRAM_ID,number:i+1,title:lessons[i].title,description:lessons[i].skill})))})
// Advisory only. Does not start the clock, advance a stage or authorize practice.
export function antiStressTimeGuidance(sessionId,seconds,locale='en'){
 const s=antiStressScenario(sessionId,locale)
 if(!s||!Number.isFinite(seconds)||seconds<0)return ''
 if(seconds>=900)return 'End the practice gently. No new questions or tasks; do not claim a trusted timed end or mastery.'
 const stage=s.stages.find(x=>seconds>=x.from&&seconds<x.to)
 if(stage.id==='contact')return 'Reconnect using verified preferred name and previous protocol; ask whether the client wants to begin. Explicit consent is required before active time. Never rush.'
 if(stage.id==='practice')return 'Only after recorded explicit practice consent: '+s.practice+' Stop or adapt when asked; skip if consent absent. Do not rush to fill fields.'
 if(stage.id==='transfer')return 'Close gently, one optional carryover or confidence rating. No new intervention. No forced homework.'
 return stage.label+': '+s.fields.filter(f=>f.stage===stage.id).map(f=>f.question).join(' / ')+' Ask at most one at a time, not a checklist. Skip any unwanted question.'
}
export function antiStressLiveInstruction(sessionId,locale='en'){
 const s=antiStressScenario(sessionId,locale);if(!s)throw Error('ANTI_STRESS_SESSION_INVALID')
 return [coachProgramModeInstruction(ANTI_STRESS_PROGRAM_ID),'15 active minutes maximum; six advisory stages, not proof of completion. Session '+s.number+': '+s.skill+'.',
  'Before the clock: load owner-authorized prior protocol and verified preferred name, invite explicit session start/resume. Then: contact 0–2, check-in 2–4, preparation 4–6, practice 6–11, reflection 11–13, integration 13–15. Safety overrides the schedule.',
  'Practice: '+s.practice,'Protocol fields (ask only when relevant, one at a time, never invent answers): '+s.fields.map(f=>f.id+': '+f.question).join('; '),
  'Practice refusal is a valid choice; do not call it mastery or pressure a different exercise. No automatic homework, medical interpretation or guarantee of stress reduction. Pause/disconnect is not completion.'].join('\n')
}
// This projection consumes ONLY an authenticated server-reviewed field ledger;
// it is not an endpoint, extractor, consent validator or storage writer.
// Missing/ambiguous/duplicate/unverified rows are never turned into results.
const validValue=(f,v)=>f.kind==='rating'?Number.isInteger(v)&&v>=0&&v<=10:f.kind==='choice'?f.choices.includes(v):typeof v==='string'&&v.trim().length>0&&v.length<=2000
export function antiStressProtocolRows(sessionId,ledger=[],locale='en'){
 const s=antiStressScenario(sessionId,locale);if(!s)throw Error('ANTI_STRESS_SESSION_INVALID')
 const rows=Array.isArray(ledger)?ledger:[]
 const projected=s.fields.map(f=>{
  const candidates=rows.filter(r=>r?.fieldId===f.id)
  const r=candidates.length===1?candidates[0]:null
  const base={fieldId:f.id,stage:f.stage,label:f.label,question:f.question}
  if(!r||r.scenarioVersion!==s.version||r.reviewed!==true||typeof r.evidenceId!=='string'||!r.evidenceId.trim())return {...base,status:'not_explored',value:null}
  if(r.status==='skipped')return {...base,status:'skipped',value:null,evidenceId:r.evidenceId}
  if(r.status!=='confirmed'||!validValue(f,r.value))return {...base,status:'needs_confirmation',value:null}
  return {...base,status:'confirmed',value:r.value,evidenceId:r.evidenceId}
 })
 const consentRow=projected.find(r=>r.fieldId==='practice_consent')
 // A reported attempt is never attributed to this guided practice if no
 // recorded consent exists. A separately reported refusal remains readable.
 return projected.map(r=>r.fieldId==='practice_status'&&['attempted','adapted','stopped'].includes(r.value)&&consentRow?.value!=='accepted'?{...r,status:'needs_confirmation',value:null,evidenceId:undefined}:r)
}
export function antiStressResult(sessionId,ledger=[],locale='en'){
 const s=antiStressScenario(sessionId,locale);if(!s)throw Error('ANTI_STRESS_SESSION_INVALID')
 const rows=antiStressProtocolRows(sessionId,ledger,locale),get=id=>rows.find(r=>r.fieldId===id&&r.status==='confirmed')?.value??null
 const before=get('stress_before'),after=get('stress_after')
 const ids=[['early_signal','ground_anchor','ground_observation','ground_when'],['calm_signal','calm_variant','calm_observation','calm_when'],['resource_need','chosen_resource','resource_observation','resource_plan']][s.number-1]
 return {version:s.version,sessionId,programType:'therapy',skill:s.skill,stress:{before,after,change:before!==null&&after!==null?after-before:null,scale:[0,10],selfReported:true},
  signalOrNeed:get(ids[0]),chosenResource:get(ids[1]),observation:get(ids[2]),carryover:get(ids[3]),practiceStatus:get('practice_status'),practiceConsent:get('practice_consent'),confidence:get('skill_confidence'),
  partial:rows.some(r=>r.status!=='confirmed'),unresolved:rows.filter(r=>!['confirmed','skipped'].includes(r.status)).map(r=>r.fieldId)}
}
