import {ANTI_STRESS_PROGRAM_ID,ANTI_STRESS_SESSION_IDS,coachProgramSettings,coachProgramModeInstruction} from './coach-program-mode.mjs'
const L=(en,ru,es)=>Object.freeze({en,ru,es})
const local=(v,locale)=>v[locale]||v.en
export const ANTI_STRESS_VERSION='hh-anti-stress-v2'
export const ANTI_STRESS_SESSION_SECONDS=900
export const ANTI_STRESS_PROGRAM_SECONDS=2700
const F=(id,stage,kind,label,question,choices)=>Object.freeze({id,stage,kind,label,question,...(choices?{choices:Object.freeze(choices)}:{})})
const rating=(id,stage,label,question)=>F(id,stage,'rating',label,question)
const textField=(id,stage,en,ru,es,qen,qru,qes)=>F(id,stage,'text',L(en,ru,es),L(qen,qru,qes))
const reuseConsent=F('meditation_consent','reflect','choice',L('Permission for personalized meditation','Согласие на персональную медитацию','Permiso para meditación personal'),L('May the confirmed resource and its confirmed details, quality and phrase be used in your personal meditation text?','Можно ли использовать подтверждённый ресурс, его согласованные детали, качество и фразу в вашей медитации?','¿Podemos usar el recurso confirmado y sus detalles, cualidad y frase acordados en tu meditación?'),['accepted','declined'])
const resourceResponse=F('resource_response','reflect','choice',L('Resource response','Отклик на ресурс','Respuesta al recurso'),L('Was this resource comfortable, neutral, uncomfortable, or not tried?','Этот ресурс был комфортным, нейтральным, некомфортным или не был опробован?','¿El recurso fue cómodo, neutro, incómodo o no probado?'),['comfortable','neutral','uncomfortable','not_tried'])
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
 {title:L('My Ground','Моя опора','Mi apoyo'),skill:L('Discover personal resource imagery','Открытие личного ресурсного образа','Descubrir imágenes personales de apoyo'),
  practice:L('With explicit permission, invite one client-originated supportive image or nonvisual anchor, without suggesting a scene. Ask one sensory detail or quality at a time, only if comfortable. Try 30–90 seconds with natural breathing and eyes open if preferred; stay at a comfortable distance, then return attention to the room. If distress increases, stop and offer external orientation. No forced imagery or memory exploration.',
   'С явного согласия предложите заметить собственный поддерживающий образ или невизуальную опору клиента, не подсказывая сюжет. Уточняйте по одной детали или качеству, только если комфортно. Короткая проба 30–90 секунд, естественное дыхание, глаза можно оставить открытыми; комфортная дистанция, затем возвращение к комнате. При ухудшении прекратить и предложить внешнюю ориентацию. Без форсирования образов и исследования воспоминаний.',
   'Con permiso explícito, invita a notar una imagen de apoyo propia o un anclaje no visual, sin sugerir escenas. Pregunta por un detalle o cualidad a la vez, si resulta cómodo. Prueba breve de 30–90 segundos, respiración natural, ojos abiertos si prefiere; distancia cómoda y vuelta a la habitación. Si aumenta el malestar, parar y orientar al presente. Sin forzar imágenes ni explorar recuerdos.'),
  specific:[
   F('early_signal','checkin','text',L('Early stress signal','Ранний сигнал стресса','Señal temprana'),L('What lets you notice tension beginning, if anything?','По чему вы замечаете начало напряжения, если замечаете?','¿Qué te permite notar el inicio de la tensión, si algo?')),
   F('ground_anchor','prepare','text',L('Chosen anchor','Выбранная опора','Apoyo elegido'),L('Which neutral thing feels okay to notice: the chair, floor, or something around you?','Что вам комфортно замечать: стул, пол или что-то вокруг?','¿Qué te resulta cómodo notar: la silla, el suelo o algo alrededor?')),
   textField('support_need','checkin','Desired quality','Желаемое качество','Cualidad deseada','What kind of support would you like right now?','Какой поддержки сейчас хотелось бы?','¿Qué apoyo te gustaría ahora?'),
   textField('resource_images','prepare','Client-originated images','Ресурсные образы клиента','Imágenes propias','What image or nonvisual resource comes from you, if any?','Какой ваш собственный образ или невизуальный ресурс возникает, если возникает?','¿Qué imagen propia o recurso no visual aparece, si aparece?'),
   F('resource_kind','prepare','choice',L('Resource type','Тип ресурса','Tipo de recurso'),L('Is your chosen resource an image or a nonvisual anchor?','Выбранный ресурс — образ или невизуальная опора?','¿El recurso elegido es una imagen o un anclaje no visual?'),['imagery','nonvisual']),
   textField('resource_selected','reflect','Confirmed chosen resource','Подтверждённый выбранный ресурс','Recurso elegido confirmado','Which exact resource would you keep, if any?','Какой именно ресурс вы хотели бы сохранить?','¿Qué recurso exacto conservarías, si alguno?'),
   textField('resource_details','reflect','Confirmed sensory details','Подтверждённые детали','Detalles confirmados','Which details are comfortable and may be kept?','Какие детали комфортны и их можно сохранить?','¿Qué detalles son cómodos y se pueden conservar?'),
   textField('resource_quality','reflect','Supportive quality','Поддерживающее качество','Cualidad de apoyo','What quality do you associate with it?','Какое качество вы связываете с ним?','¿Qué cualidad asocias con ello?'),
   textField('resource_phrase','reflect','Own supportive phrase','Своя поддерживающая фраза','Frase propia','Is there a phrase of your own you would like to retain?','Есть ли ваша фраза, которую хотелось бы сохранить?','¿Hay una frase propia que quieras conservar?'),
   resourceResponse,reuseConsent,
   F('ground_observation','reflect','text',L('What I noticed','Что я заметил','Lo que noté'),L('What, if anything, did you notice during the practice?','Что, если что-то, вы заметили во время практики?','¿Qué notaste durante la práctica, si algo?')),
   F('ground_when','transfer','text',L('When to use the anchor','Когда применять опору','Cuándo usar el apoyo'),L('When might you choose to notice this anchor again?','Когда вы могли бы снова заметить эту опору?','¿Cuándo podrías volver a notar este apoyo?'))
  ]},
 {title:L('My Calm','Моё спокойствие','Mi calma'),skill:L('Notice and regulate gently','Мягкая саморегуляция','Regulación suave'),
  practice:L('Recall the chosen grounding cue only with permission. Offer a choice: notice an ordinary unforced breath, gently loosen shoulders if comfortable, or stay with a neutral external cue. Guide one short round, then wait and ask whether to repeat or stop. No breath holds, forced breathing, body scanning when uncomfortable, or intense memories.',
   'С разрешения напомните прежнюю опору. Предложите выбор: замечать обычное дыхание без усилия, мягко отпустить плечи, если комфортно, или остаться с внешним нейтральным ориентиром. Один короткий круг, пауза, затем спросите, повторить ли или остановиться. Без задержек и форсирования дыхания, сканирования тела при дискомфорте и тяжёлых воспоминаний.',
   'Con permiso, recuerda el apoyo anterior. Ofrece elegir: notar la respiración natural sin esfuerzo, aflojar suavemente los hombros si es cómodo o mantener una referencia externa neutra. Una ronda breve, pausa y pregunta si quiere repetir o parar. Sin retenciones, respiración forzada, exploración corporal incómoda ni recuerdos intensos.'),
  specific:[
   textField('meditation_feedback','checkin','Meditation experience','Опыт медитации','Experiencia de meditación','If you tried your meditation, what suited you or did not?','Если пробовали медитацию, что подошло или не подошло?','Si probaste tu meditación, ¿qué te sirvió o no?'),
   textField('calm_context','checkin','Mild everyday context','Обычная ситуация','Contexto cotidiano','In which ordinary manageable situation do you notice tension?','В какой обычной посильной ситуации замечаете напряжение?','¿En qué situación cotidiana manejable notas tensión?'),
   textField('calm_steps','transfer','Personal sequence','Личная последовательность','Secuencia personal','Which small sequence would you choose after noticing the signal?','Какую короткую последовательность выберете при появлении сигнала?','¿Qué secuencia breve elegirías al notar la señal?'),
   textField('calm_fallback','transfer','Alternative or stop rule','Запасной вариант или остановка','Alternativa o parada','When would you stop or choose another option?','Когда остановитесь или выберете другой вариант?','¿Cuándo pararías o elegirías otra opción?'),
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
   textField('previous_practice_feedback','checkin','Experience of prior practices','Опыт предыдущих практик','Experiencia previa','Which previous practices, if any, were useful?','Что из предыдущих практик оказалось полезным, если что-то?','¿Qué prácticas anteriores te sirvieron, si alguna?'),
   textField('available_resources','checkin','Available personal resources','Доступные личные ресурсы','Recursos disponibles','What people, places or actions are actually available to you?','Какие люди, места или действия реально доступны вам?','¿Qué personas, lugares o acciones tienes realmente disponibles?'),
   textField('routine_cue','transfer','Daily moment','Момент дня','Momento del día','When could you choose a small daily practice?','Когда могли бы выбрать маленькую ежедневную практику?','¿Cuándo podrías elegir una práctica diaria breve?'),
   textField('low_energy_option','transfer','Smallest fallback','Минимальный запасной вариант','Alternativa mínima','What would be manageable with little time or energy?','Что посильно, если мало времени или сил?','¿Qué sería manejable con poco tiempo o energía?'),
   textField('support_threshold','transfer','When to seek support','Когда обратиться за поддержкой','Cuándo buscar apoyo','When would you prefer support from a person or professional?','Когда предпочли бы поддержку человека или специалиста?','¿Cuándo preferirías apoyo de una persona o profesional?'),
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
 if(stage.id==='transfer')return 'Close gently, no new intervention or forced homework. Only if useful, confirm a small carryover or an already discussed plan. '+s.fields.filter(f=>f.stage===stage.id).map(f=>f.question).join(' / ')+' Ask at most one, skip any unwanted question.'
 return stage.label+': '+s.fields.filter(f=>f.stage===stage.id).map(f=>f.question).join(' / ')+' Ask at most one at a time, not a checklist. Skip any unwanted question.'
}
export function antiStressLiveInstruction(sessionId,locale='en'){
 const s=antiStressScenario(sessionId,locale);if(!s)throw Error('ANTI_STRESS_SESSION_INVALID')
 return [coachProgramModeInstruction(ANTI_STRESS_PROGRAM_ID),'15 active minutes maximum; six advisory stages, not proof of completion. Session '+s.number+': '+s.skill+'.',
  'Before the clock: load owner-authorized prior protocol and verified preferred name, invite explicit session start/resume. Then: contact 0–2, check-in 2–4, preparation 4–6, practice 6–11, reflection 11–13, integration 13–15. Safety overrides the schedule.',
  'Practice: '+s.practice, 'Session 1: confirm resource wording, comfort and explicit permission; do not invent images, details or effects. Only a confirmed comfortable or neutral tried resource can enter a personal meditation. No imagery is required. Session 2: use previous meditation only with fresh permission; session 3: review actual experience and agree a realistic optional routine.','Protocol fields (ask only when relevant, one at a time, never invent answers): '+s.fields.map(f=>f.id+': '+f.question).join('; '),
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
// Deterministic text draft: no model call, no invented imagery and no automatic audio.
// Only exact reviewed rows, explicitly accepted reuse, and a tried comfortable
// or neutral resource. Omit optional details until individually approved.
// A decline, stopped practice or adverse response never produces a meditation.
function antiStressMeditation(rows,locale='en'){
 const get=id=>rows.find(r=>r.fieldId===id&&r.status==='confirmed')?.value??null
 const kind=get('resource_kind'),selected=get('resource_selected'),response=get('resource_response')
 if(get('meditation_consent')==='declined')return {status:'declined',body:null}
 if(get('practice_consent')!=='accepted'||!['attempted','adapted'].includes(get('practice_status'))||!['comfortable','neutral'].includes(response)||get('meditation_consent')!=='accepted'||!['imagery','nonvisual'].includes(kind)||!selected)return {status:'needs_input',body:null}
 const l=localeOf(locale)
 const t={
 en:{title:'My Personal Meditation',intro:'If comfortable, notice the surface supporting you. Keep your eyes open if you wish. Let your breathing remain natural.',image:'If you wish, recall your own chosen image: ',anchor:'If you wish, notice your chosen nonvisual support: ',middle:'Stay at a comfortable distance. There is no need to change how you feel. You may leave the resource at any moment.',end:'When ready, notice the room and the surface beneath you again. If discomfort increases, stop. Do not practice while driving.'},
 ru:{title:'Моя персональная медитация',intro:'Если комфортно, почувствуйте поверхность под собой. Можно оставить глаза открытыми. Пусть дыхание остаётся естественным.',image:'Если хочется, вспомните ваш собственный выбранный образ: ',anchor:'Если хочется, обратите внимание на выбранную невизуальную опору: ',middle:'Оставайтесь на комфортном расстоянии. Не нужно менять своё состояние. Можно оставить ресурс в любой момент.',end:'Когда будете готовы, снова обратите внимание на комнату и поверхность под собой. При усилении дискомфорта остановитесь. Не практикуйте за рулём.'},
 es:{title:'Mi meditación personal',intro:'Si te resulta cómodo, nota la superficie que te sostiene. Puedes dejar los ojos abiertos. Mantén la respiración natural.',image:'Si quieres, recuerda tu propia imagen elegida: ',anchor:'Si quieres, nota tu apoyo no visual elegido: ',middle:'Mantén una distancia cómoda. No necesitas cambiar cómo te sientes. Puedes dejar el recurso en cualquier momento.',end:'Cuando quieras, vuelve a notar la habitación y la superficie que te sostiene. Si aumenta el malestar, detente. No practiques al conducir.'}
 }[l]
 const labels={
 en:{resource_details:'If it still feels comfortable, notice the detail you described: ',resource_quality:'You named this quality: ',resource_phrase:'If you wish, recall your own words: '},
 ru:{resource_details:'Если по-прежнему комфортно, обратите внимание на описанные вами детали: ',resource_quality:'Вы назвали такое качество: ',resource_phrase:'Если хочется, вспомните свои слова: '},
 es:{resource_details:'Si sigue siendo cómodo, nota el detalle que describiste: ',resource_quality:'Nombraste esta cualidad: ',resource_phrase:'Si quieres, recuerda tus propias palabras: '}
 }[l]
 const fields=['resource_selected',...Object.keys(labels).filter(id=>get(id)!==null)]
 const detailParagraphs=fields.slice(1).map(id=>labels[id]+'«'+get(id)+'».')
 const sources=fields.map(id=>rows.find(r=>r.fieldId===id&&r.status==='confirmed'))
 // Include all gates, not only the words included in the text. A changed
 // resource type, practice outcome or consent invalidates the old artifact.
 const gateFields=['practice_consent','practice_status','resource_kind','resource_response','meditation_consent']
 const gateEvidenceIds=gateFields.map(id=>rows.find(r=>r.fieldId===id&&r.status==='confirmed').evidenceId)
 const sourceEvidenceIds=sources.map(r=>r.evidenceId)
 if(new Set([...sourceEvidenceIds,...gateEvidenceIds]).size!==sourceEvidenceIds.length+gateEvidenceIds.length)return {status:'needs_input',body:null}
 return {status:'draft',language:l,title:t.title,body:[t.intro,(kind==='imagery'?t.image:t.anchor)+'«'+selected+'».',t.middle,...detailParagraphs,t.end].join('\n\n'),sourceEvidenceIds,sourceFieldIds:fields,gateEvidenceIds}
}
export function antiStressResult(sessionId,ledger=[],locale='en'){
 const s=antiStressScenario(sessionId,locale);if(!s)throw Error('ANTI_STRESS_SESSION_INVALID')
 const rows=antiStressProtocolRows(sessionId,ledger,locale),get=id=>rows.find(r=>r.fieldId===id&&r.status==='confirmed')?.value??null
 const before=get('stress_before'),after=get('stress_after')
 const ids=[['early_signal','ground_anchor','ground_observation','ground_when'],['calm_signal','calm_variant','calm_observation','calm_when'],['resource_need','chosen_resource','resource_observation','resource_plan']][s.number-1]
 return {version:s.version,sessionId,programType:'therapy',skill:s.skill,stress:{before,after,change:before!==null&&after!==null?after-before:null,scale:[0,10],selfReported:true},
  signalOrNeed:get(ids[0]),chosenResource:get(ids[1]),observation:get(ids[2]),carryover:get(ids[3]),practiceStatus:get('practice_status'),practiceConsent:get('practice_consent'),confidence:get('skill_confidence'),
  ...(s.number===1?{meditation:antiStressMeditation(rows,locale),resources:{images:get('resource_images'),kind:get('resource_kind'),selected:get('resource_selected'),details:get('resource_details'),quality:get('resource_quality'),phrase:get('resource_phrase'),response:get('resource_response')}}:s.number===2?{calmPlan:{meditationFeedback:get('meditation_feedback'),context:get('calm_context'),steps:get('calm_steps'),fallback:get('calm_fallback')}}:{resourcePlan:{previousFeedback:get('previous_practice_feedback'),availableResources:get('available_resources'),dailyCue:get('routine_cue'),fallback:get('low_energy_option'),supportThreshold:get('support_threshold')}}),
  partial:rows.some(r=>r.status!=='confirmed'),unresolved:rows.filter(r=>!['confirmed','skipped'].includes(r.status)).map(r=>r.fieldId)}
}

// Server Director seam for future authenticated runner. Inputs must come from
// the owner-scoped consent/clock ledger and safety classifier, not the model,
// a query parameter or the browser. This function does not persist or advance.
export function antiStressDirective(sessionId,context={},locale='en'){
 const scenario=antiStressScenario(sessionId,locale);if(!scenario)throw Error('ANTI_STRESS_SESSION_INVALID')
 const {safetyState,sessionConsent,practiceConsent,practiceStatus,elapsedSeconds,paused,connected,clientRequest,distressIncreased}=context
 const base={programType:'therapy',scenarioVersion:scenario.version,pace:'slow',maxQuestions:1,allowSilence:true}
 // Only the bound server-reviewed ledger supplies resolved field IDs. A
 // resolved field is not necessarily a successful or completed practice.
 const resolved=new Set(Array.isArray(context.resolvedFieldIds)?context.resolvedFieldIds:[])
 const openQuestions=stage=>scenario.fields.filter(f=>f.stage===stage&&!resolved.has(f.id)).map(f=>f.question)
 const reflection=()=>{const questions=openQuestions('reflect');return {...base,stage:'reflect',action:'listen-and-reflect',maxQuestions:questions.length?1:0,instruction:'The practice is already reported as tried or adapted. Do not repeat it merely to fill the time window. Listen first; invite at most one still-open reflection if welcome. '+questions.join(' / ')}}
 if(safetyState==='urgent'||safetyState==='crisis')return {...base,action:'existing-safety-path',maxQuestions:0}
 if(safetyState!=='clear')return {...base,action:'assess-safety',maxQuestions:1}
 if(clientRequest==='stop'||sessionConsent==='declined')return {...base,action:'stop-with-support',maxQuestions:0}
 if(paused===true||connected!==true||clientRequest==='pause')return {...base,action:'hold',maxQuestions:0}
 if(sessionConsent!=='accepted')return {...base,action:'invite-explicit-start',maxQuestions:1}
 if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)return {...base,action:'hold',maxQuestions:0}
 if(distressIncreased===true)return {...base,action:'stop-practice-and-offer-support',maxQuestions:1}
 if(elapsedSeconds>=900)return {...base,action:'gentle-close',maxQuestions:0}
 const stage=scenario.stages.find(s=>elapsedSeconds>=s.from&&elapsedSeconds<s.to).id
 if(clientRequest==='slow')return {...base,stage,action:'reflect-and-wait',maxQuestions:0}
 if(stage==='practice'){
  if(practiceConsent==='declined'||clientRequest==='skip')return {...base,stage,action:'respect-skip',maxQuestions:0}
  if(practiceStatus==='stopped'||practiceStatus==='declined'||practiceStatus==='not_attempted'||resolved.has('practice_status')&&!practiceStatus)return {...base,stage,action:'respect-skip',maxQuestions:0}
  if(practiceConsent!=='accepted')return resolved.has('practice_consent')?{...base,stage,action:'respect-skip',maxQuestions:0}:{...base,stage,action:'invite-practice-consent',maxQuestions:1}
  if(practiceStatus==='attempted'||practiceStatus==='adapted')return reflection()
  return {...base,stage,action:'guide-one-cue-and-wait',instruction:scenario.practice,maxQuestions:0}
 }
 const questions=openQuestions(stage)
 if(stage==='reflect'||stage==='transfer'||stage==='checkin'||stage==='prepare')return {...base,stage,action:stage==='transfer'?'gentle-integration':'listen-and-reflect',maxQuestions:questions.length?1:0,instruction:(stage==='transfer'?'Close gently; no new intervention or forced homework. ':'Respond to the client first. ')+(questions.length?'One still-open question only if welcome: '+questions.join(' / '):'All listed questions have been answered or skipped; do not repeat them. Reflect or allow silence.')}
 return {...base,stage,action:'listen-and-reflect',instruction:antiStressTimeGuidance(sessionId,elapsedSeconds,locale)}
}
// Course report keeps each session distinct; no averaging, interpolation or
// automatic clinical conclusion. Caller must already scope one exact courseRun.
export function antiStressCourseResult(ledgersBySession={},locale='en'){
 return {programId:ANTI_STRESS_PROGRAM_ID,programType:'therapy',version:ANTI_STRESS_VERSION,
  sessions:ANTI_STRESS_SESSION_IDS.map(id=>antiStressResult(id,ledgersBySession[id]??[],locale))}
}
