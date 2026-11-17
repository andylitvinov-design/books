/**
 * Wave / My Coach: original, localized question variants for *existing*
 * Director v4 method/step IDs. No second stage machine or DB question catalog.
 * These are bounded editorial choices, not clinical interventions or commands.
 */
export const COACH_QUESTION_VARIANTS_VERSION='hh-coach-question-variants-v2-20261116'
const Q=(target,en,ru,es,style='balanced')=>Object.freeze({
  target,style,text:Object.freeze({en,ru,es})
})
const bank={
 grow:{
  goal:[
   Q('goalRestated','What would make this conversation worthwhile for you?','Что сделало бы этот разговор полезным для вас?','¿Qué haría útil esta conversación para ti?','gentle'),
   Q('workingFocusEstablished','Can you recall one recent moment when this mattered?','Можете вспомнить недавний момент, когда это стало особенно важным?','¿Recuerdas un momento reciente en que esto fue importante?','reflective'),
   Q('goalRestated','If one thing felt clearer afterward, what would it be?','Если после беседы прояснится что-то одно, что именно?','Si algo quedara más claro después, ¿qué sería?','direct')],
  reality:[
   Q('keyFactsCaptured','What actually happened in the most recent example?','Что именно произошло в последнем таком случае?','¿Qué ocurrió exactamente la última vez?','analytic'),
   Q('constraintsReviewed','Which part is a confirmed limit, and which is still a guess?','Какое ограничение уже подтверждено, а какое пока предположение?','¿Qué límite es real y cuál es aún una suposición?','analytic'),
   Q('keyFactsCaptured','What did you notice yourself, before interpreting it?','Что вы заметили сами, прежде чем делать выводы?','¿Qué notaste tú antes de interpretarlo?','reflective')],
  options:[
   Q('optionsExplored','What two possibilities could be worth considering?','Какие два варианта стоило бы рассмотреть?','¿Qué dos posibilidades valdría la pena considerar?','direct'),
   Q('optionsExplored','Is there a lower-pressure way to approach this?','Есть ли способ подойти к этому с меньшим давлением?','¿Hay una manera de abordar esto con menos presión?','gentle'),
   Q('optionsExplored','What choice depends most on you rather than on others?','Какой вариант больше зависит от вас, а не от других?','¿Qué opción depende más de ti que de los demás?','analytic')],
  way_forward:[
   Q('clientActionApproved','Of these possibilities, which one would you choose to test, if any?','Какой из вариантов вы бы хотели попробовать, если вообще хотите?','¿Cuál de las opciones querrías probar, si alguna?','gentle'),
   Q('timingSpecified','What timing might be realistic for a small test?','Когда было бы реалистично проверить небольшой шаг?','¿Cuándo sería realista probar un paso pequeño?','direct'),
   Q('feasibilityChecked','Does this feel manageable as it stands, or should we make it smaller?','Это вам по силам в нынешнем виде или стоит уменьшить масштаб?','¿Es manejable así o conviene reducirlo?','gentle')],
  review:[
   Q('summaryReviewed','Which part of this summary matches your experience?','Какая часть этого итога точно соответствует вашему опыту?','¿Qué parte de este resumen refleja tu experiencia?','reflective'),
   Q('summaryReviewed','What should I correct before we finish?','Что мне стоит исправить в итогах разговора?','¿Qué debo corregir antes de terminar?','analytic'),
   Q('summaryReviewed','What would you like to leave unresolved for now?','Что вы хотели бы пока оставить открытым?','¿Qué preferirías dejar sin resolver por ahora?','gentle')]
 },
 tgrow:{
  topic:[
   Q('topicNamed','Which topic feels most important to name first?','Какую тему сейчас важнее всего назвать первой?','¿Qué tema es más importante nombrar primero?','direct'),
   Q('topicNamed','What part of this would you rather not explore today?','Какой части ситуации вы сегодня предпочли бы не касаться?','¿Qué parte prefieres no explorar hoy?','gentle'),
   Q('topicNamed','If we held one thread, which would it be?','Если оставить одну нить разговора, какую?','Si seguimos un solo hilo, ¿cuál sería?','reflective')],
  goal:[
   Q('goalRestated','What would you like to take away from this session?','Что вы хотели бы унести из этой сессии?','¿Qué te gustaría llevarte de esta sesión?','direct'),
   Q('workingFocusEstablished','Where does this goal show up in daily life?','В какой ситуации из повседневной жизни эта цель проявляется?','¿Dónde aparece esta meta en tu vida diaria?','analytic'),
   Q('goalRestated','What one change would help you recognize progress?','Какое одно изменение подсказало бы, что есть продвижение?','¿Qué cambio te indicaría un avance?','reflective')],
  reality:[
   Q('keyFactsCaptured','What have you tried so far in a real situation?','Что вы уже пробовали в реальной ситуации?','¿Qué has probado ya en una situación real?','analytic'),
   Q('constraintsReviewed','Which restrictions have you verified personally?','Какие ограничения вы проверили сами?','¿Qué límites has comprobado tú mismo?','direct'),
   Q('keyFactsCaptured','What happened the last time you attempted this?','Что случилось в последний раз, когда вы попытались?','¿Qué sucedió la última vez que lo intentaste?','reflective')],
  options:[
   Q('optionsExplored','What two workable routes could we compare?','Какие два осуществимых пути можно сравнить?','¿Qué dos caminos viables podemos comparar?','analytic'),
   Q('optionsExplored','Is there an option requiring less time or risk?','Есть ли вариант с меньшими затратами времени или риском?','¿Hay una opción que requiera menos tiempo o riesgo?','direct'),
   Q('optionsExplored','What would you try if the first option was unavailable?','Что можно было бы попробовать, если первый вариант недоступен?','¿Qué intentarías si la primera opción no fuera posible?','creative')],
  way_forward:[
   Q('clientActionApproved','Would you choose one option to explore further?','Хотите выбрать один вариант для дальнейшей проверки?','¿Quieres elegir una opción para explorarla más?','gentle'),
   Q('timingSpecified','When would a short, reversible trial fit?','Когда подошла бы короткая проба, которую можно отменить?','¿Cuándo encajaría una prueba breve y reversible?','direct'),
   Q('feasibilityChecked','Which part of the plan feels too large right now?','Какая часть замысла сейчас выглядит слишком большой?','¿Qué parte del plan parece demasiado grande ahora?','analytic')],
  review:[
   Q('summaryReviewed','What became clearer about your original topic?','Что стало яснее по первоначальной теме?','¿Qué quedó más claro sobre el tema inicial?','reflective'),
   Q('summaryReviewed','Which conclusion is yours, and which is only a possibility?','Какой вывод уже ваш, а что пока только возможность?','¿Qué conclusión es tuya y cuál es solo una posibilidad?','analytic'),
   Q('summaryReviewed','What would you change in our summary?','Что вы изменили бы в нашем итоговом описании?','¿Qué cambiarías en nuestro resumen?','gentle')]
 },
 woop:{
  wish:[
   Q('goalRestated','What one achievable wish matters most to you now?','Какое одно осуществимое желание сейчас важнее всего?','¿Qué deseo alcanzable importa más ahora?','direct'),
   Q('goalRestated','How do you know this wish is truly yours?','Как вы понимаете, что это именно ваше желание?','¿Cómo sabes que este deseo es realmente tuyo?','reflective'),
   Q('goalRestated','Which wish would you like to explore without promising to act?','Какое желание хотите исследовать, пока ничего не обещая?','¿Qué deseo quieres explorar sin comprometerte todavía?','gentle')],
  outcome:[
   Q('desiredOutcome','What would the best realistic outcome look like?','Каким был бы лучший реалистичный результат?','¿Cómo sería el mejor resultado realista?','reflective'),
   Q('desiredOutcome','What would you notice if this worked?','Что вы заметите, если это получится?','¿Qué notarías si esto funcionara?','direct'),
   Q('desiredOutcome','How would a small success change your day?','Что изменилось бы в вашем дне от небольшого успеха?','¿Cómo cambiaría tu día un pequeño éxito?','gentle')],
  internal_obstacle:[
   Q('internalObstacle','What usually happens inside when you move toward this wish?','Что обычно происходит внутри, когда вы двигаетесь к этому желанию?','¿Qué suele pasar dentro de ti al acercarte a ese deseo?','reflective'),
   Q('internalObstacle','Which familiar reaction gets in the way?','Какая привычная реакция становится препятствием?','¿Qué reacción habitual se interpone?','analytic'),
   Q('internalObstacle','Can you notice one moment when you hesitate or turn away?','Можете заметить момент, когда вы медлите или отступаете?','¿Reconoces el momento en que dudas o te apartas?','gentle')],
  if_then:[
   Q('ifThenPlan','If that obstacle appears, what response might you choose?','Если это препятствие возникнет, какой ответ вы хотели бы выбрать?','Si aparece ese obstáculo, ¿qué respuesta elegirías?','gentle'),
   Q('ifThenPlan','How would you phrase a simple “if ... then ...” in your own words?','Как вы сформулировали бы простое «если… то…» своими словами?','¿Cómo formularías un sencillo «si… entonces…»?','direct'),
   Q('ifThenPlan','What fallback would leave the decision in your hands?','Какой запасной вариант оставит выбор за вами?','¿Qué alternativa dejaría la decisión en tus manos?','reflective')],
  review:[
   Q('summaryReviewed','Does this wish and response still sound like your own?','Желание и способ ответа по-прежнему кажутся вашими?','¿Este deseo y esta respuesta siguen siendo tuyos?','reflective'),
   Q('summaryReviewed','Which part would you simplify before trying anything?','Что стоило бы упростить, прежде чем что-либо пробовать?','¿Qué simplificarías antes de probar algo?','gentle'),
   Q('summaryReviewed','Would you correct any part of our summary?','Хотите исправить какую-то часть нашего итога?','¿Corregirías alguna parte de nuestro resumen?','direct')]
 },
 oskar:{
  outcome:[
   Q('desiredOutcome','What would you like to be different instead?','Что вы хотели бы видеть вместо нынешней ситуации?','¿Qué preferirías que sucediera en su lugar?','gentle'),
   Q('desiredOutcome','What would count as a small sign of improvement?','Что стало бы небольшим признаком улучшения?','¿Qué sería una pequeña señal de mejora?','direct'),
   Q('desiredOutcome','How would tomorrow look if things moved a little forward?','Как выглядел бы завтрашний день, если бы стало чуть легче?','¿Cómo sería mañana si avanzaras un poco?','reflective')],
  scaling:[
   Q('clientScale','Where would you put things today on a 0–10 scale, if useful?','Где вы сейчас на шкале 0–10, если такая оценка вам подходит?','¿En qué punto del 0 al 10 estás hoy, si te sirve la escala?','gentle'),
   Q('clientScale','What number best describes the progress you see now?','Какое число лучше отражает тот прогресс, который вы замечаете?','¿Qué número refleja el avance que percibes ahora?','direct'),
   Q('clientScale','What keeps your situation from being one point lower?','Что помогает ситуации не быть на один балл хуже?','¿Qué evita que estés un punto más abajo?','reflective')],
  know_how:[
   Q('existingStrength','What already helps, even occasionally?','Что вам уже помогает хотя бы иногда?','¿Qué te ayuda ya, aunque sea de vez en cuando?','gentle'),
   Q('existingStrength','Which ability have you used successfully before?','Какую способность вы уже успешно применяли?','¿Qué capacidad has utilizado con éxito antes?','direct'),
   Q('existingStrength','Who or what supported you in an easier moment?','Кто или что поддержало вас в более лёгкий момент?','¿Quién o qué te apoyó en un momento más fácil?','reflective')],
  affirm_action:[
   Q('clientActionApproved','How could you use that strength in one small experiment?','Как можно использовать эту сильную сторону в небольшом эксперименте?','¿Cómo usarías esa fortaleza en un pequeño experimento?','direct'),
   Q('timingSpecified','When, if at all, would you like to test that?','Когда, если вообще хотите, можно было бы это проверить?','¿Cuándo, si quieres, te gustaría probarlo?','gentle'),
   Q('feasibilityChecked','Does the experiment feel manageable without extra pressure?','Такая проба вам по силам без дополнительного давления?','¿Esa prueba resulta manejable sin presión adicional?','reflective')],
  review:[
   Q('summaryReviewed','What did you discover about what already works?','Что вы заметили о том, что у вас уже получается?','¿Qué descubriste sobre lo que ya funciona?','reflective'),
   Q('summaryReviewed','Which point needs correction in my summary?','Что стоит исправить в моём кратком итоге?','¿Qué debo corregir en mi resumen?','analytic'),
   Q('summaryReviewed','What would be worth keeping for another conversation?','Что вы хотели бы сохранить для следующего разговора?','¿Qué valdría la pena conservar para otra conversación?','gentle')]
 },
 solution_focused:{
  preferred_future:[
   Q('desiredOutcome','What small sign would tell you things were improving?','Какой небольшой признак покажет, что ситуация улучшается?','¿Qué pequeña señal te indicaría que las cosas mejoran?','gentle'),
   Q('desiredOutcome','What would be different on an ordinary better day?','Что изменилось бы в обычный, но более удачный день?','¿Qué cambiaría en un día corriente un poco mejor?','reflective'),
   Q('desiredOutcome','What would you be doing differently if things eased?','Что вы делали бы иначе, если стало бы легче?','¿Qué harías de otro modo si fuera más fácil?','direct')],
  exceptions:[
   Q('pastException','When was this problem even a little less present?','Когда эта проблема ощущалась хоть немного слабее?','¿Cuándo estuvo este problema un poco menos presente?','gentle'),
   Q('pastException','What was different the last time things went more smoothly?','Что было иначе в последний раз, когда всё прошло лучше?','¿Qué fue distinto la última vez que salió mejor?','analytic'),
   Q('pastException','Can you remember a brief exception to the usual pattern?','Вспомните короткий момент, когда обычный сценарий не повторился?','¿Recuerdas una breve excepción al patrón habitual?','reflective')],
  strengths:[
   Q('existingStrength','What did you do that helped during that exception?','Что именно вы тогда сделали полезного?','¿Qué hiciste que ayudara en ese momento?','direct'),
   Q('existingStrength','Which support or personal quality was present?','Какая поддержка или ваша способность тогда была рядом?','¿Qué apoyo o cualidad personal estuvo presente?','reflective'),
   Q('existingStrength','Which part of what worked feels accessible now?','Что из сработавшего тогда доступно вам сейчас?','¿Qué parte de lo que funcionó tienes a mano ahora?','gentle')],
  experiment:[
   Q('clientActionApproved','What tiny part of that exception might you try again?','Какую небольшую часть того опыта вы хотели бы повторить?','¿Qué pequeña parte de esa excepción querrías repetir?','gentle'),
   Q('timingSpecified','When might a short trial fit naturally?','Когда короткая проба естественно вписалась бы в день?','¿Cuándo encajaría de forma natural una prueba breve?','direct'),
   Q('feasibilityChecked','How could we make that experiment easier to try?','Как можно сделать эту пробу ещё доступнее?','¿Cómo hacer más fácil ese experimento?','gentle')],
  review:[
   Q('summaryReviewed','What difference did you notice during our conversation?','Какое изменение вы сами заметили за время разговора?','¿Qué diferencia notaste durante la conversación?','reflective'),
   Q('summaryReviewed','Which strength would you name in your own words?','Как вы сами назвали бы свою сильную сторону?','¿Cómo llamarías tú a esa fortaleza?','gentle'),
   Q('summaryReviewed','What would you correct in the takeaway?','Что стоит исправить в итоговой мысли?','¿Qué corregirías en la conclusión?','analytic')]
 },
 appreciative_inquiry:{
  discover:[
   Q('positiveExperience','When did something like this go well for you?','Когда нечто похожее уже удачно складывалось для вас?','¿Cuándo te fue bien algo parecido?','reflective'),
   Q('positiveExperience','Can you recall one specific successful moment?','Можете вспомнить один конкретный удачный момент?','¿Recuerdas un momento concreto de éxito?','direct'),
   Q('positiveExperience','What made that positive experience possible?','Что помогло тому хорошему опыту состояться?','¿Qué hizo posible aquella experiencia positiva?','gentle')],
  dream:[
   Q('desiredOutcome','What would you like to experience more often?','Чего вам хотелось бы больше в своей жизни?','¿Qué te gustaría experimentar más a menudo?','reflective'),
   Q('desiredOutcome','Which quality of that experience matters most?','Какое качество того опыта для вас важнее всего?','¿Qué cualidad de esa experiencia importa más?','gentle'),
   Q('desiredOutcome','How would a future shaped by that strength look?','Каким могло бы быть будущее с опорой на эту силу?','¿Cómo sería un futuro apoyado en esa fortaleza?','creative')],
  design:[
   Q('optionsExplored','Which conditions might make that future more possible?','Какие условия могли бы приблизить такой вариант будущего?','¿Qué condiciones harían más posible ese futuro?','analytic'),
   Q('optionsExplored','What two ways of building on that experience can you imagine?','Какие два способа опереться на тот опыт вы видите?','¿Qué dos maneras imaginas de aprovechar esa experiencia?','creative'),
   Q('optionsExplored','Whose voluntary support might be useful?','Чья добровольная поддержка могла бы пригодиться?','¿De quién podría servirte el apoyo voluntario?','gentle')],
  deliver:[
   Q('clientActionApproved','What small experiment would express that possibility?','Какой небольшой эксперимент мог бы выразить эту возможность?','¿Qué pequeño experimento expresaría esa posibilidad?','creative'),
   Q('timingSpecified','When would trying it feel appropriate to you?','Когда вам было бы уместно это попробовать?','¿Cuándo te parecería adecuado intentarlo?','gentle'),
   Q('feasibilityChecked','What would make this experiment easy to revise or stop?','Что позволит легко изменить или остановить такую пробу?','¿Qué permitiría modificar o detener fácilmente esa prueba?','analytic')],
  review:[
   Q('summaryReviewed','Which discovery feels genuinely meaningful to you?','Какое открытие действительно имеет для вас значение?','¿Qué descubrimiento tiene verdadero sentido para ti?','reflective'),
   Q('summaryReviewed','What is still a possibility, not a decision?','Что пока остаётся возможностью, а не решением?','¿Qué sigue siendo una posibilidad y no una decisión?','analytic'),
   Q('summaryReviewed','What should I change in the summary to match your words?','Что исправить в итоге, чтобы он точнее отражал ваши слова?','¿Qué debo cambiar en el resumen para respetar tus palabras?','gentle')]
 }
}
export const COACH_METHOD_QUESTION_VARIANTS=Object.freeze(Object.fromEntries(
 Object.entries(bank).map(([method,stages])=>[method,Object.freeze(Object.fromEntries(
  Object.entries(stages).map(([stage,variants])=>[stage,Object.freeze(variants.map((row,index)=>
   Object.freeze({...row,id:method+':'+stage+':'+String(index+1).padStart(2,'0')})))])))])))
export function methodQuestionVariants(methodId,stepId,locale='en'){
 if(!['en','ru','es'].includes(locale))return []
 const rows=COACH_METHOD_QUESTION_VARIANTS[methodId]?.[stepId]||[]
 return rows.map(row=>Object.freeze({id:row.id,target:row.target,style:row.style,
   text:row.text[locale]}))
}
