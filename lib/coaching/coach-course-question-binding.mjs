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
 next:['What one concrete next step are you willing to choose?','Какой один конкретный следующий шаг вы готовы выбрать?','¿Qué paso siguiente concreto estás dispuesto a elegir?']
})
const index=lang=>lang==='ru'?1:lang==='es'?2:0
export function legacyCheckpointQuestion(label,lang){
 return ['What would you like to record about “'+label+'”?','Что вам важно зафиксировать по теме «'+label+'»?','¿Qué te gustaría registrar sobre «'+label+'»?'][index(lang)]
}
export function authoredCheckpointQuestion(row,lang){
 return Object.hasOwn(questions,row.id)?questions[row.id][index(lang)]:legacyCheckpointQuestion(row.label,lang)
}
export function checkpointClarification(row,lang){
 return ['Let me clarify the same question. ','Уточню тот же вопрос. ','Aclaremos la misma pregunta. '][index(lang)]+authoredCheckpointQuestion(row,lang)
}
export function checkpointQuestionMatches(row,lang,text){
 return [authoredCheckpointQuestion(row,lang),checkpointClarification(row,lang),legacyCheckpointQuestion(row.label,lang)].includes(text)
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
 if(typeof text!=='string')return false
 const s=text.trim().normalize('NFKC')
 if(/^(?:this is an answer to another question|not an answer to this question|это ответ на другой вопрос|это не ответ на этот вопрос|esta es la respuesta a otra pregunta|no es una respuesta a esta pregunta)(?:$|[\s:,.—])/iu.test(s))return true
 if(broad.has(fieldId)||!Object.hasOwn(questions,fieldId))return false
 const match=explicitHeadings.find(([,re])=>re.test(s))
 // A compound response may cover both fields; leave it for explicit review.
 if(!match||/[;\n]/u.test(s)||explicitHeadings.some(([id,re])=>id!==match[0]&&re.test(s.split(/[,;.\n]/u).at(-1)?.trim()||'')))return false
 return !compatible[match[0]].includes(fieldId)
}
