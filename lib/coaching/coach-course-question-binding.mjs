import {clarityRatingDefinition,clarityRatingPair,claritySpecialField} from './clarity-session-fields.mjs'
// Authored questions and conservative cross-field checks. No provider calls.
const questions=Object.freeze({
 situation:['What is happening in your life right now that you want to understand?','Что сейчас происходит в вашей жизни, в чём вы хотите разобраться?','¿Qué está pasando ahora en tu vida que quieres comprender?'],
 request:['What would you like help with in this session?','С чем именно вы хотите получить помощь на этой сессии?','¿Con qué te gustaría recibir ayuda en esta sesión?'],
 wishes:['What do you want to be different in this situation?','Что вы хотели бы изменить в этой ситуации?','¿Qué te gustaría que fuera diferente en esta situación?'],
 facts:['What specific event or example illustrates the situation?','Какой конкретный случай показывает, в чём состоит эта ситуация?','¿Qué hecho o ejemplo concreto ilustra esta situación?'],
 feelings:['What feeling do you notice in yourself when you think about this?','Какое чувство вы замечаете в себе, когда думаете об этом?','¿Qué emoción notas en ti al pensar en esto?'],
 needs:['What do you need most in this situation?','В чём вы сейчас больше всего нуждаетесь в этой ситуации?','¿Qué necesitas más en esta situación?'],
 support:['Who or what could support you right now?','Кто или что может поддержать вас сейчас?','¿Quién o qué podría apoyarte ahora?'],
 wellbeing:['How would you describe your current physical and emotional wellbeing?','Как бы вы описали своё физическое и эмоциональное самочувствие сейчас?','¿Cómo describirías tu bienestar físico y emocional ahora?'],
 practices:['What gentle practice would you freely choose to try?','Какую бережную практику вы сами хотели бы попробовать?','¿Qué práctica suave elegirías probar libremente?'],
 resources:['What resources do you already have that could help?','Какие ресурсы у вас уже есть, которые могут помочь?','¿Con qué recursos cuentas ya que podrían ayudarte?'],
 changes:['What concrete change have you noticed since the last session?','Какое конкретное изменение вы заметили после прошлой сессии?','¿Qué cambio concreto has notado desde la sesión anterior?'],
 direction:['In which direction would you like to move from here?','В каком направлении вы хотите двигаться дальше?','¿En qué dirección te gustaría avanzar desde aquí?'],
 goal:['What specific outcome would you like to achieve?','Какого конкретного результата вы хотите достичь?','¿Qué resultado concreto quieres conseguir?'],
 why:['Why does achieving this outcome matter to you personally?','Почему достижение этого результата важно лично для вас?','¿Por qué te importa personalmente conseguir este resultado?'],
 success:['How will you know that you have achieved the outcome?','По каким признакам вы поймёте, что достигли результата?','¿Cómo sabrás que has alcanzado el resultado?'],
 boundaries:['What value or boundary must you respect while pursuing this outcome?','Какую ценность или границу вам важно сохранить на пути к этому результату?','¿Qué valor o límite necesitas respetar al buscar este resultado?'],
 horizon:['By when would you like to achieve this outcome?','К какому сроку вы хотели бы достичь этого результата?','¿Para cuándo te gustaría conseguir este resultado?'],
 baseline:['Where are you now in relation to your desired outcome?','Где вы сейчас находитесь по отношению к желаемому результату?','¿En qué punto estás ahora respecto al resultado que deseas?'],
 plan:['What sequence of actions would bring you closer to the outcome?','Какая последовательность действий приблизит вас к результату?','¿Qué secuencia de acciones te acercaría al resultado?'],
 levels:['What is the smallest version of the action you could take on a difficult day?','Какой минимальный вариант действия вы сможете выполнить даже в трудный день?','¿Cuál es la versión mínima de la acción que podrías hacer en un día difícil?'],
 timing:['When and under what conditions will you take the chosen action?','Когда и при каких условиях вы сможете выполнить выбранное действие?','¿Cuándo y en qué condiciones realizarás la acción elegida?'],
 contingency:['If the plan becomes difficult, what alternative could you use?','Если план окажется трудным, какой запасной вариант вы выберете?','Si el plan se complica, ¿qué alternativa podrías utilizar?'],
 strengths:['What personal strength or previous success could help you here?','Какая ваша сильная сторона или прошлый успех могут помочь вам здесь?','¿Qué fortaleza personal o éxito anterior podría ayudarte aquí?'],
 limits:['What real limitation do you need to account for?','Какое реальное ограничение вам нужно учесть?','¿Qué limitación real necesitas tener en cuenta?'],
 obstacle:['What is the main obstacle you encounter when trying to move forward?','Что прежде всего мешает вам двигаться вперёд?','¿Cuál es el principal obstáculo que encuentras al intentar avanzar?'],
 trigger:['In what specific situation does this obstacle or pattern usually arise?','В какой конкретной ситуации обычно возникает это препятствие или паттерн?','¿En qué situación concreta suele surgir este obstáculo o patrón?'],
 options:['What other ways forward can you see?','Какие другие варианты дальнейших действий вы видите?','¿Qué otras formas de avanzar ves?'],
 tradeoffs:['What benefit and cost would the option you are considering have?','Какую пользу и какую цену имеет рассматриваемый вами вариант?','¿Qué beneficio y qué coste tendría la opción que estás considerando?'],
 experiment:['What small experiment would you choose to test your idea?','Какой небольшой эксперимент вы выберете, чтобы проверить свою идею?','¿Qué pequeño experimento elegirías para poner a prueba tu idea?'],
 progress:['What observable evidence shows your progress so far?','Какие наблюдаемые факты показывают ваш прогресс?','¿Qué evidencia observable muestra tu progreso hasta ahora?'],
 adjust:['What part of your plan would you change based on what happened?','Какую часть плана вы бы изменили с учётом произошедшего?','¿Qué parte de tu plan cambiarías según lo que ocurrió?'],
 learning:['What have you learned about yourself or the situation?','Что вы поняли о себе или о своей ситуации?','¿Qué has aprendido sobre ti o sobre la situación?'],
 review:['When and how would you like to check the result again?','Когда и каким способом вы хотите снова проверить результат?','¿Cuándo y cómo te gustaría revisar de nuevo el resultado?'],
 next:['What one concrete next step are you willing to choose?','Какой один конкретный следующий шаг вы готовы выбрать?','¿Qué paso siguiente concreto estás dispuesto a elegir?'],
 life_balance:['Which life area would you like to rate, and what are its current and desired ratings from 0 to 10?','Какую сферу жизни вы хотите оценить и каковы её текущая и желаемая оценки от 0 до 10?','¿Qué área de tu vida quieres valorar y cuáles son sus valoraciones actual y deseada del 0 al 10?'],
 meaning_axes:['Which value or source of meaning is most important to you right now?','Какая ценность или источник смысла наиболее важны для вас сейчас?','¿Qué valor o fuente de sentido es más importante para ti ahora?'],
 symptoms:['What difficulty or symptom are you experiencing, and how does it affect your daily life?','Какую трудность или симптом вы замечаете и как это влияет на вашу повседневную жизнь?','¿Qué dificultad o síntoma experimentas y cómo afecta a tu vida cotidiana?'],
 business_reality:['What is the current business model and key indicator that best describes its starting point?','Какая у бизнеса сейчас модель и какой ключевой показатель лучше всего описывает исходную точку?','¿Cuál es el modelo de negocio actual y qué indicador describe mejor su punto de partida?'],
 strategic_options:['Which growth option is your priority after comparing impact, risk and resources?','Какой вариант роста для вас приоритетен после сравнения эффекта, риска и ресурсов?','¿Qué opción de crecimiento priorizas al comparar impacto, riesgo y recursos?'],
 goal_success:['What measurable business outcome, baseline, target and deadline would you commit to reviewing?','Какой измеримый бизнес-результат, исходное и целевое значение и срок вы готовы проверять?','¿Qué resultado empresarial medible, valor inicial, objetivo y plazo revisarías?'],
 function_map:['Which business functions are missing or duplicated in your growth strategy?','Каких бизнес-функций не хватает или какие дублируются для вашей стратегии роста?','¿Qué funciones empresariales faltan o se duplican en tu estrategia de crecimiento?'],
 target_structure:['What target responsibility and KPI should each key function have?','Какая целевая ответственность и KPI должны быть у каждой ключевой функции?','¿Qué responsabilidad e indicador debería tener cada función clave?'],
 leadership_validation:['What question should you validate with leaders before treating an assumption as a fact?','Какой вопрос нужно проверить с руководителями, прежде чем считать предположение фактом?','¿Qué pregunta debes validar con los líderes antes de tratar una hipótesis como un hecho?'],
 feedback_evidence:['What concrete feedback or evidence supports the proposed change?','Какая конкретная обратная связь или факт подтверждают предлагаемое изменение?','¿Qué comentario o evidencia concreta respalda el cambio propuesto?'],
 change_portfolio:['Which change in structure, processes or roles has priority and what result is expected?','Какое изменение структуры, процессов или ролей приоритетно и какой результат ожидается?','¿Qué cambio de estructura, procesos o roles es prioritario y qué resultado se espera?'],
 transition_plan:['What is the next milestone of the transition, and who owns it?','Какой ближайший контрольный этап перехода и кто за него отвечает?','¿Cuál es el próximo hito de la transición y quién es responsable?'],
 accountability_people:['Which result needs a responsible owner or a new capability?','Какому результату нужен ответственный или дополнительная компетенция?','¿Qué resultado requiere un responsable o una nueva capacidad?'],
 controls_metrics:['Which KPI, baseline and review cadence will show whether execution is working?','Какой KPI, исходное значение и периодичность проверки покажут, работает ли реализация?','¿Qué indicador, valor inicial y frecuencia de revisión mostrarán si funciona la ejecución?'],
 launch_review:['When will the first execution cycle be reviewed and by what adjustment criterion?','Когда будет проверен первый цикл реализации и по какому критерию будут внесены изменения?','¿Cuándo se revisará el primer ciclo de ejecución y con qué criterio se harán ajustes?']
})
const index=lang=>lang==='ru'?1:lang==='es'?2:0
export function legacyCheckpointQuestion(label,lang){
 return ['What would you like to record about “'+label+'”?','Что вам важно зафиксировать по теме «'+label+'»?','¿Qué te gustaría registrar sobre «'+label+'»?'][index(lang)]
}
export function authoredCheckpointQuestion(row,lang){
 return claritySpecialField(row.id,lang)?.question||(Object.hasOwn(questions,row.id)?questions[row.id][index(lang)]:legacyCheckpointQuestion(row.label,lang))
}
export function checkpointClarification(row,lang){
 return ['Let me clarify the same question. ','Уточню тот же вопрос. ','Aclaremos la misma pregunta. '][index(lang)]+authoredCheckpointQuestion(row,lang)
}
function legacyCheckpointClarification(label,lang){
 return ['Could you clarify what you want recorded for “'+label+'”?','Что именно вы хотите зафиксировать по теме «'+label+'»?','¿Qué quieres registrar exactamente sobre «'+label+'»?'][index(lang)]
}
export function checkpointQuestionMatches(row,lang,text){
 return [authoredCheckpointQuestion(row,lang),checkpointClarification(row,lang),legacyCheckpointQuestion(row.label,lang),legacyCheckpointClarification(row.label,lang)].includes(text)
}
export function checkpointConfirmationMatches(row,question,quote,lang,text){
 // A pre-upgrade pending draft already displayed the exact legacy echo.
 const legacy=['For “'+row.label+'”, I have recorded provisionally: “'+quote+'”. Is that what you want recorded?',
 'По теме «'+row.label+'» я предварительно записал: «'+quote+'». Это верно?',
 'Sobre «'+row.label+'», anoté provisionalmente: «'+quote+'». ¿Es correcto?'][index(lang)]
 return text===checkpointConfirmation(question,quote,lang)||text===legacy
}
export function checkpointConfirmation(question,quote,lang){
 return ['For the question “'+question+'”, your proposed answer is “'+quote+'”. Is this your answer to that question?',
 'На вопрос «'+question+'» ваш предварительный ответ: «'+quote+'». Это верный ответ именно на этот вопрос?',
 'Para la pregunta «'+question+'», tu respuesta provisional es «'+quote+'». ¿Es tu respuesta a esa pregunta?'][index(lang)]
}
// Reject only clearly marked unrelated answers or explicit headings belonging
// to an incompatible checkpoint. Unknown free speech is NOT a verified match;
// a question-bound client confirmation is still required. Do not infer facts.
const explicitHeadings=[
 ['goal',/^(?:my goal|desired outcome|моя цель|желаемый результат|mi meta|mi objetivo|resultado deseado)\s*[:—–]/iu],
 ['feelings',/^(?:my feelings?|emotion|мои чувства|моё чувство|чувство|эмоция|mis emociones|mi emoción|sentimiento)\s*[:—–]/iu],
 ['obstacle',/^(?:my obstacle|main obstacle|препятствие|моё препятствие|главное препятствие|mi obstáculo|obstáculo principal)\s*[:—–]/iu],
 ['timing',/^(?:deadline|time horizon|срок|дедлайн|plazo|fecha límite)\s*[:—–]/iu],
 ['resources',/^(?:my resources|available resources|мои ресурсы|доступные ресурсы|mis recursos|recursos disponibles)\s*[:—–]/iu],
 ['needs',/^(?:my needs?|мои потребности|моя потребность|mis necesidades|mi necesidad)\s*[:—–]/iu],
 ['plan',/^(?:my plan|action plan|мой план|план действий|mi plan|plan de acción)\s*[:—–]/iu]
]
const compatible=Object.freeze({
 goal:['goal','direction','wishes','request','success','why','boundaries','horizon'],
 feelings:['feelings','wellbeing','needs','why','boundaries','trigger'],
 obstacle:['obstacle','limits','trigger','contingency','baseline','adjust'],
 timing:['horizon','timing','plan','next','review','experiment','levels'],
 resources:['resources','support','strengths','limits','plan','contingency','practices'],
 needs:['needs','wishes','request','feelings','why','wellbeing','boundaries'],
 plan:['plan','next','timing','levels','contingency','experiment','options','adjust','direction','practices']
})
const broad=new Set(['situation','facts','learning','changes','progress','tradeoffs'])
export function checkpointAnswerMismatch(fieldId,text){
 if(clarityRatingDefinition(fieldId))return !clarityRatingPair(fieldId,text)
 if(typeof text!=='string')return false
 const s=text.trim().normalize('NFKC')
 if(/^(?:this is an answer to another question|not an answer to this question|это ответ на другой вопрос|это не ответ на этот вопрос|esta es la respuesta a otra pregunta|no es una respuesta a esta pregunta)(?:$|[\s:,.—])/iu.test(s))return true
 if(broad.has(fieldId)||!Object.hasOwn(questions,fieldId))return false
 const match=explicitHeadings.find(([,re])=>re.test(s))
 // A compound response may cover both fields; leave it for explicit review.
 if(!match||/[;\n]/u.test(s)||explicitHeadings.some(([id,re])=>id!==match[0]&&re.test(s.split(/[,;.\n]/u).at(-1)?.trim()||'')))return false
 return !compatible[match[0]].includes(fieldId)
}

// Live-only cues: never tighten the persisted archive validation retroactively.
// An explicit cue is not a verified fact. Compound explanations remain open.
const naturalCues=[
 ['goal',/^(?:my (?:main )?goal is|my objective is|моя (?:главная )?цель(?:\s*[—–]|\s+состоит в|\s+это|\s+(?:сменить|найти|достичь|создать|построить|улучшить))|mi (?:meta|objetivo) (?:es|consiste en))(?:$|[\s,.:—–])/iu],
 ['feelings',/^(?:i (?:am feeling|feel) (?:anxious|sad|happy|angry|afraid|ashamed|calm|lonely|overwhelmed|frustrated)|i'm (?:anxious|sad|happy|angry|afraid|ashamed|calm|lonely)|я чувствую (?:тревогу|страх|стыд|грусть|радость|злость|одиночество|спокойствие|раздражение)|мне (?:тревожно|страшно|грустно|радостно|стыдно|спокойно)|me siento (?:ansios[oa]|triste|feliz|enojad[oa]|asustad[oa]|avergonzad[oa]|tranquil[oa]|sol[oa]))(?:$|[\s,.!])/iu],
 ['obstacle',/^(?:my (?:main|biggest) obstacle is|what stops me is|главное препятствие(?:\s*[—–]|\s+это|\s+для меня)|мне мешает|mi (?:principal|mayor) obstáculo es|lo que me impide avanzar es)(?:$|[\s,.:—–])/iu],
 ['timing',/^(?:my deadline is|the deadline is|my target date is|мой крайний срок(?:\s*[—–]|\s+это)|мой дедлайн(?:\s*[—–]|\s+это)|mi fecha límite es|mi plazo es)(?:$|[\s,.:—–])/iu],
 ['resources',/^(?:my available resources are|the resources i have are|мои доступные ресурсы(?:\s*[—–]|\s+это)|mis recursos disponibles son)(?:$|[\s,.:—–])/iu],
 ['needs',/^(?:my main need is|what i need most is|моя главная потребность(?:\s*[—–]|\s+это)|больше всего мне нужно|mi necesidad principal es|lo que más necesito es)(?:$|[\s,.:—–])/iu],
 ['plan',/^(?:my (?:action )?plan is|мой план(?:\s*[—–]|\s+это|\s+состоит в)|mi plan (?:es|consiste en))(?:$|[\s,.:—–])/iu]
]
export function checkpointLiveAnswerMismatch(fieldId,text){
 if(checkpointAnswerMismatch(fieldId,text))return true
 if(typeof text!=='string'||broad.has(fieldId)||!Object.hasOwn(questions,fieldId))return false
 const value=text.trim().normalize('NFKC')
 if(/[;:\n]|\b(?:because|and|but|so that|porque|pero|para que)\b|(?:^|\s)(?:потому что|поэтому|и|но|чтобы|так как)(?:\s|$)/iu.test(value))return false
 const match=naturalCues.find(([,re])=>re.test(value))
 if(!match)return false
 if(match[0]==='feelings'&&!['horizon','timing','review','controls_metrics','target_structure','function_map','launch_review'].includes(fieldId))return false
 return !compatible[match[0]].includes(fieldId)
}
