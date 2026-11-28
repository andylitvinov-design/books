/**
 * Wave Coaching Mode 2.1 — editorial response variants bound to the existing
 * Director v4 stage IDs. Not a stage engine, not a diagnostic interpretation.
 * Each stage contains three original RU/EN/ES statements: frame, clarify,
 * integrate. Never assert unconfirmed facts or create client commitments.
 */
import {coachMethodStagePlan} from './method-protocol-v4.mjs'
export const COACH_STAGE_RESPONSES_VERSION='hh-coach-stage-responses-v2-20261120'
const U=(en,ru,es)=>Object.freeze({en,ru,es})
const bank={
 grow:{
  goal:[
   U('We can first make the purpose of this conversation clear.','Сначала можно прояснить, ради чего нужен этот разговор.','Primero podemos aclarar para qué servirá esta conversación.'),
   U('A useful goal is one you would recognize in your own words.','Полезная цель должна звучать вашими, а не моими словами.','Una meta útil debe expresarse con tus palabras, no las mías.'),
   U('We can give that aim a modest scope without rushing a decision.','Можно немного сузить фокус, не торопясь принимать решение.','Podemos acotar el objetivo sin apresurar una decisión.')],
  reality:[
   U('Here we can distinguish events from possible explanations.','Здесь можно отделить события от возможных объяснений.','Aquí podemos separar los hechos de sus posibles explicaciones.'),
   U('A specific situation can be more useful than a broad label.','Конкретная ситуация полезнее слишком общего названия проблемы.','Una situación concreta ayuda más que una etiqueta general.'),
   U('We can also notice which limitations are verified and which are uncertain.','Уточним, какие ограничения подтверждены, а какие пока неизвестны.','También podemos ver qué límites están comprobados y cuáles no.')],
  options:[
   U('At this point, possibilities are not commitments.','На этом этапе варианты ещё не превращаются в обязательства.','En esta etapa, las opciones no son compromisos.'),
   U('Different options can be compared without choosing immediately.','Разные варианты можно сравнить, не выбирая сразу.','Podemos comparar opciones sin decidir de inmediato.'),
   U('The most useful option may be the one that leaves you choice.','Полезный вариант оставляет за вами право выбора.','Una opción útil preserva tu libertad de elegir.')],
  way_forward:[
   U('A next step remains optional until you choose it yourself.','Следующий шаг остаётся возможностью, пока вы сами его не выбрали.','El siguiente paso sigue siendo opcional hasta que tú lo elijas.'),
   U('Feasibility matters more than a big promise.','Реалистичность важнее большого обещания.','La viabilidad importa más que una gran promesa.'),
   U('We can leave timing open if making a plan feels premature.','Срок можно оставить открытым, если планировать пока рано.','Podemos dejar el plazo abierto si aún es pronto para planificar.')],
  review:[
   U('I would like the summary to reflect your own understanding.','Важно, чтобы итог отражал именно ваше понимание.','Me importa que el resumen refleje tu propia comprensión.'),
   U('We can separate what is clear from what remains uncertain.','Отделим то, что прояснилось, от того, что пока открыто.','Separemos lo claro de lo que sigue abierto.'),
   U('You can correct or discard any part of this summary.','Вы можете исправить или убрать любую часть итога.','Puedes corregir o descartar cualquier parte del resumen.')]
 },
 tgrow:{
  topic:[
   U('One topic is enough to start, even if other issues are related.','Для начала достаточно одной темы, даже если с ней связаны другие.','Un solo tema basta para comenzar, aunque existan otros relacionados.'),
   U('You can decide what belongs in this conversation.','Вы определяете, что относится к этой беседе.','Tú decides qué pertenece a esta conversación.'),
   U('We do not have to explore every detail today.','Сегодня необязательно исследовать каждую подробность.','No necesitamos explorar todos los detalles hoy.')],
  goal:[
   U('Now we can clarify the result you would value from this topic.','Теперь можно уточнить, какой результат по этой теме важен вам.','Ahora podemos aclarar qué resultado de este tema valorarías.'),
   U('The goal can be specific without becoming a demand.','Цель может быть конкретной, не превращаясь в требование.','La meta puede ser concreta sin convertirse en una exigencia.'),
   U('A small sign of progress may be enough to orient us.','Небольшого признака продвижения может быть достаточно для ориентира.','Una señal pequeña de avance puede bastar para orientarnos.')],
  reality:[
   U('Let us use what is already known rather than guess.','Будем опираться на известное, не додумывая остальное.','Usemos lo que ya sabemos en vez de adivinar.'),
   U('One recent example can reveal practical constraints.','Один недавний пример может показать реальные ограничения.','Un ejemplo reciente puede mostrar límites prácticos.'),
   U('We can keep facts and expectations in separate places.','Факты и ожидания лучше пока рассматривать отдельно.','Podemos mantener separados los hechos y las expectativas.')],
  options:[
   U('We can examine possibilities without deciding for you.','Можно рассмотреть возможности, не решая за вас.','Podemos examinar posibilidades sin decidir por ti.'),
   U('Each option may have a different cost or benefit.','У каждого варианта могут быть свои преимущества и ограничения.','Cada opción puede tener ventajas y límites distintos.'),
   U('No alternative needs to become a commitment today.','Ни один вариант не обязан сегодня стать обязательством.','Ninguna alternativa tiene que convertirse hoy en compromiso.')],
  way_forward:[
   U('A choice becomes useful when it is yours and feasible.','Выбор становится полезным, когда он ваш и осуществим.','Una elección ayuda cuando es tuya y es viable.'),
   U('We can test the size of a step before setting any deadline.','Можно оценить посильность шага до обсуждения сроков.','Podemos comprobar el tamaño del paso antes de fijar fechas.'),
   U('A reversible trial is one possibility, not a requirement.','Обратимая проба — лишь один из вариантов, не требование.','Una prueba reversible es una opción, no una obligación.')],
  review:[
   U('Let us return briefly to the topic you chose.','Кратко вернёмся к теме, которую вы выбрали.','Volvamos brevemente al tema que elegiste.'),
   U('An accurate summary can include unresolved questions.','Точный итог может включать и нерешённые вопросы.','Un resumen fiel puede incluir preguntas abiertas.'),
   U('You are free to revise the conclusion before we finish.','До завершения вы можете изменить любой вывод.','Puedes revisar cualquier conclusión antes de terminar.')]
 },
 woop:{
  wish:[
   U('We can name a wish without turning it into an obligation.','Можно назвать желание, не превращая его в обязательство.','Podemos nombrar un deseo sin convertirlo en obligación.'),
   U('It matters that this wish is meaningful to you.','Важно, чтобы это желание действительно имело значение для вас.','Importa que este deseo tenga sentido para ti.'),
   U('One realistic wish is enough to explore.','Для исследования достаточно одного реалистичного желания.','Basta un deseo realista para explorar.')],
  outcome:[
   U('Here we can picture what improvement might look like.','Здесь можно представить, как выглядело бы улучшение.','Aquí podemos imaginar cómo sería una mejora.'),
   U('The desired outcome is a possibility, not a prediction.','Желаемый результат — возможность, а не предсказание.','El resultado deseado es una posibilidad, no una predicción.'),
   U('We can notice what would make that result personally valuable.','Можно уточнить, чем такой результат был бы ценен именно вам.','Podemos aclarar por qué ese resultado te importaría.')],
  internal_obstacle:[
   U('WOOP now explores your own recurring response, without blame.','Теперь WOOP исследует вашу привычную реакцию без обвинений.','WOOP explora ahora tu reacción habitual, sin culpas.'),
   U('An internal obstacle is not a diagnosis or a fixed trait.','Внутреннее препятствие — не диагноз и не неизменная черта.','Un obstáculo interno no es un diagnóstico ni un rasgo fijo.'),
   U('We can explore one familiar moment without forcing disclosure.','Можно рассмотреть знакомый момент без обязательных подробностей.','Podemos explorar un momento conocido sin exigir detalles.')],
  if_then:[
   U('An if–then response is a choice you can change.','Ответ «если — то» остаётся вашим изменяемым выбором.','Una respuesta «si–entonces» es una elección que puedes cambiar.'),
   U('The plan needs to fit the obstacle you actually recognized.','План должен соответствовать препятствию, которое вы сами заметили.','El plan debe encajar con el obstáculo que tú reconociste.'),
   U('We can keep the response very small and voluntary.','Ответ может быть совсем небольшим и добровольным.','La respuesta puede ser muy pequeña y voluntaria.')],
  review:[
   U('Let us check whether the wish and response still feel yours.','Проверим, остаются ли желание и способ ответа именно вашими.','Comprobemos si el deseo y la respuesta siguen siendo tuyos.'),
   U('The plan can be simplified or left open.','План можно упростить или оставить открытым.','El plan puede simplificarse o quedar abierto.'),
   U('You can correct what does not fit your experience.','Вы можете исправить всё, что не соответствует вашему опыту.','Puedes corregir lo que no encaje con tu experiencia.')]
 },
 oskar:{
  outcome:[
   U('We can begin with what you would prefer instead.','Начнём с того, что вы хотели бы видеть вместо нынешнего положения.','Empecemos por lo que preferirías en su lugar.'),
   U('Even a slight improvement is worth describing.','Даже небольшое улучшение можно описать конкретно.','Incluso una pequeña mejora merece describirse.'),
   U('The desired direction belongs to you.','Желаемое направление определяете вы.','Tú decides la dirección deseada.')],
  scaling:[
   U('A scale can be a helpful reference, not a judgment.','Шкала может служить ориентиром, а не оценкой личности.','Una escala puede orientar, no juzgarte.'),
   U('Your number is subjective and may change.','Ваша оценка субъективна и может меняться.','Tu puntuación es subjetiva y puede cambiar.'),
   U('You may skip numbers and describe the situation in words.','Можно обойтись без цифр и описать положение словами.','Puedes omitir los números y describir la situación con palabras.')],
  know_how:[
   U('We can look for abilities you have already used.','Поищем способности, которыми вы уже пользовались.','Podemos buscar capacidades que ya hayas usado.'),
   U('Resources can be small, practical, or shared with others.','Ресурсы бывают небольшими, практическими или совместными.','Los recursos pueden ser pequeños, prácticos o compartidos.'),
   U('We need not invent strengths you have not recognized.','Не будем приписывать вам сильные стороны, которых вы не называли.','No hace falta atribuirte fortalezas que no reconoces.')],
  affirm_action:[
   U('A next action is useful only if it fits your resources.','Следующее действие полезно, только если оно соответствует ресурсам.','La siguiente acción ayuda solo si encaja con tus recursos.'),
   U('Affirming an ability does not require pretending everything is easy.','Признать способность — не значит делать вид, что всё легко.','Reconocer una capacidad no exige fingir que todo es fácil.'),
   U('We can explore a small experiment without forcing a decision.','Можно рассмотреть небольшую пробу, не навязывая решения.','Podemos explorar una prueba pequeña sin forzar una decisión.')],
  review:[
   U('We can revisit progress without exaggerating it.','Можно вернуться к продвижению, не преувеличивая его.','Podemos revisar el avance sin exagerarlo.'),
   U('Only the changes you notice deserve to appear as outcomes.','В итогах стоит оставить только изменения, которые заметили вы.','Solo los cambios que tú notes deben figurar como resultados.'),
   U('Any conclusion can stay tentative until you confirm it.','Любой вывод остаётся предварительным до вашего подтверждения.','Toda conclusión es provisional hasta que la confirmes.')]
 },
 solution_focused:{
  preferred_future:[
   U('We can explore a preferred future without promising it.','Можно исследовать желаемое будущее, ничего не обещая.','Podemos explorar un futuro preferido sin prometerlo.'),
   U('A small everyday sign often makes a direction clearer.','Небольшой повседневный признак помогает увидеть направление.','Una señal cotidiana pequeña suele aclarar la dirección.'),
   U('What you prefer matters more than my idea of success.','Ваше представление о лучшем важнее моего определения успеха.','Lo que tú prefieres importa más que mi idea de éxito.')],
  exceptions:[
   U('An exception may be brief and still be informative.','Исключение может быть коротким, но полезным для понимания.','Una excepción puede ser breve y aun así aportar información.'),
   U('We can search for a concrete easier moment, not forced optimism.','Ищем конкретный момент облегчения, а не обязательный оптимизм.','Buscamos un momento realmente más fácil, no optimismo forzado.'),
   U('It is fine if no exception comes to mind yet.','Ничего страшного, если исключение пока не вспоминается.','Está bien si todavía no recuerdas una excepción.')],
  strengths:[
   U('We can look for what you actually did or received as support.','Посмотрим, что вы действительно сделали или получили как поддержку.','Podemos ver qué hiciste o qué apoyo recibiste realmente.'),
   U('Strengths need evidence, not flattering guesses.','Сильные стороны лучше опирать на примеры, а не на догадки.','Las fortalezas necesitan ejemplos, no halagos inventados.'),
   U('Even a small available resource can be worth noticing.','Даже небольшой доступный ресурс заслуживает внимания.','Incluso un recurso pequeño merece atención.')],
  experiment:[
   U('One tiny experiment can be an option, not a prescription.','Небольшой эксперимент — возможность, а не предписание.','Un experimento pequeño es una opción, no una receta.'),
   U('A useful experiment can be safe and reversible.','Полезная проба может быть безопасной и обратимой.','Una prueba útil puede ser segura y reversible.'),
   U('You may decide not to test anything today.','Вы можете ничего не проверять сегодня.','Puedes decidir no probar nada hoy.')],
  review:[
   U('Let us name the difference you actually noticed.','Назовём разницу, которую вы действительно заметили.','Nombremos la diferencia que realmente notaste.'),
   U('There is no need to claim progress that has not occurred.','Не нужно утверждать, что прогресс был, если его не было.','No hace falta afirmar avances que aún no han ocurrido.'),
   U('We can keep an accurate, editable summary.','Итог можно оставить точным и доступным для исправлений.','Podemos dejar un resumen fiel y corregible.')]
 },
 appreciative_inquiry:{
  discover:[
   U('We begin with a real example of what has worked.','Начнём с реального примера того, что уже получалось.','Empezamos con un ejemplo real de lo que funcionó.'),
   U('A successful moment need not be impressive to be useful.','Удачный момент необязательно должен быть большим.','Un buen momento no tiene que ser extraordinario para servir.'),
   U('We can notice the conditions that supported that experience.','Можно заметить условия, которые помогли тому опыту.','Podemos notar las condiciones que apoyaron esa experiencia.')],
  dream:[
   U('We can imagine more of what you value, without predicting the future.','Представим больше ценного для вас, не предсказывая будущее.','Podemos imaginar más de lo valioso sin predecir el futuro.'),
   U('A dream here is an invitation, not a promise.','Мечта здесь — приглашение исследовать, а не обещание.','Aquí un sueño invita a explorar, no promete resultados.'),
   U('We can keep the future picture open to revision.','Образ будущего можно оставить открытым для изменений.','La imagen del futuro puede seguir abierta a cambios.')],
  design:[
   U('Now we can consider the conditions that might support that vision.','Теперь можно рассмотреть условия для такого видения.','Ahora podemos considerar las condiciones que apoyarían esa visión.'),
   U('Different designs can coexist before a choice is made.','Несколько вариантов устройства могут существовать до выбора.','Pueden coexistir varias opciones antes de decidir.'),
   U('A useful design respects practical limits and your values.','Подходящий вариант учитывает реальные ограничения и ваши ценности.','Un diseño útil respeta los límites prácticos y tus valores.')],
  deliver:[
   U('Turning an idea into action can begin very modestly.','Перевести идею в действие можно с очень небольшого шага.','Llevar una idea a la práctica puede empezar en pequeño.'),
   U('You remain free to modify or decline any experiment.','Вы можете изменить любую пробу или отказаться от неё.','Puedes cambiar o rechazar cualquier experimento.'),
   U('An action should express your values, not prove your worth.','Действие должно выражать ценности, а не доказывать вашу ценность.','Una acción expresa valores; no tiene que demostrar tu valor.')],
  review:[
   U('We can identify what truly mattered in this conversation.','Можно выделить то, что действительно имело значение.','Podemos identificar lo que realmente importó en esta conversación.'),
   U('A hopeful idea can remain a possibility rather than a decision.','Обнадёживающая идея может остаться возможностью, а не решением.','Una idea esperanzadora puede seguir siendo posibilidad, no decisión.'),
   U('Please keep only the meanings that feel authentic to you.','Оставьте в итоге только те смыслы, которые действительно ваши.','Conserva solo los sentidos que te resulten auténticos.')]
 }
}
export const COACH_METHOD_STAGE_REPLIES=Object.freeze(Object.fromEntries(
 Object.entries(bank).map(([method,stages])=>[method,Object.freeze(Object.fromEntries(
  Object.entries(stages).map(([step,variants])=>[step,Object.freeze(variants.map((text,index)=>
   Object.freeze({id:method+':'+step+':line:'+String(index+1).padStart(2,'0'),text}))) ])))])))
export function methodStageReplyVariants(methodId,stepId,locale='en'){
 if(!['ru','en','es'].includes(locale)||
   !coachMethodStagePlan(methodId,stepId))return []
 const data=COACH_METHOD_STAGE_REPLIES[methodId]?.[stepId]||[]
 return data.map(x=>Object.freeze({id:x.id,text:x.text[locale]}))
}
/** Choose one non-assertive step-specific reply in addition to the persona voice.
 * Never require the model to say it, and never repeat one already spoken.
 */
export function chooseMethodStageReply(methodId,stepId,locale='en',speechAct='reflect',assistantTurns=[]){
 if(['pause','contact','repair'].includes(speechAct))return null
 const variants=methodStageReplyVariants(methodId,stepId,locale)
 if(!variants.length)return null
 const order=speechAct==='transition'?[2,1,0]:
  speechAct==='clarify'?[0,1,2]:[1,0,2]
 const recent=Array.isArray(assistantTurns)?assistantTurns.slice(-6)
  .filter(t=>t?.role==='assistant'&&typeof t.content==='string')
  .map(t=>t.content.toLocaleLowerCase(locale)):[]
 const candidate=order.map(i=>variants[i])
  .find(v=>v&&!recent.some(text=>text.includes(v.text.toLocaleLowerCase(locale))))
 return candidate?Object.freeze(candidate):null
}
