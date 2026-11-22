/**
 * Wave Coaching Mode 2.0: persona-specific speech-act cues for the *existing*
 * fictional My Coach identities. Editorial language, not a script or a diagnosis.
 * No user data, model request, persistence, or parallel persona engine.
 */
export const COACH_SPEECH_VARIANTS_VERSION='hh-coach-speech-variants-v2-20261116'
const P=(en,ru,es)=>Object.freeze({en,ru,es})
const speech={
 mira:{
  contact:[P('We can take this at a comfortable pace.','Можем двигаться в удобном вам темпе.','Podemos ir a tu ritmo.')],
  reflect:[P('There may be room to make this less demanding.','Возможно, здесь можно немного уменьшить давление.','Tal vez podamos quitar algo de presión.')],
  clarify:[P('I would rather understand one detail than guess.','Лучше уточнить одну деталь, чем додумывать.','Prefiero aclarar un detalle a suponer.')],
  repair:[P('I moved too quickly; we can return to your meaning.','Я поспешила; можем вернуться к тому, что вы имели в виду.','Me apresuré; podemos volver a lo que querías decir.')],
  transition:[P('We can look at one manageable part next.','Дальше можно посмотреть только на одну посильную часть.','Podemos mirar solo una parte manejable.')],
  pause:[P('It can stay open; there is no need to decide now.','Можно оставить это открытым; сейчас не обязательно решать.','Podemos dejarlo abierto; no hace falta decidir ahora.')],
  review:[P('I want the summary to sound like your words, not mine.','Мне важно, чтобы итог был вашим, а не моим.','Quiero que el resumen refleje tus palabras, no las mías.')],
  action:[P('Only a step that feels manageable to you is worth considering.','Стоит рассматривать только тот шаг, который вам по силам.','Solo vale considerar un paso que te resulte manejable.')]
 },
 max:{
  contact:[P('Okay, one knot at a time.','Окей, разберём один узел за раз.','Vale, un nudo a la vez.')],
  reflect:[P('We can separate what is happening from what we can test.','Отделим происходящее от того, что можно проверить.','Separemos lo que pasa de lo que podemos probar.')],
  clarify:[P('Let us name the core choice in plain language.','Назовём главный выбор простыми словами.','Digamos la decisión central con claridad.')],
  repair:[P('Agreed, that option was not your decision.','Принято, этот вариант не был вашим решением.','Entendido, esa opción no era tu decisión.')],
  transition:[P('Now there is something concrete to compare.','Теперь есть что сравнивать по существу.','Ahora tenemos algo concreto para comparar.')],
  pause:[P('No rush and no push; we can stop here.','Без спешки и нажима; можем остановиться.','Sin prisa ni presión; podemos parar.')],
  review:[P('A test is useful only if you choose it.','Проба имеет смысл, только если вы её выбираете.','Una prueba sirve solo si tú la eliges.')],
  action:[P('Small reversible experiments beat grand declarations.','Небольшая обратимая проба полезнее громких обещаний.','Una prueba pequeña y reversible vale más que grandes promesas.')]
 },
 sofia:{
  contact:[P('What matters to you deserves room here.','Тому, что для вас важно, здесь есть место.','Aquí hay espacio para lo que te importa.')],
  reflect:[P('We can hold your feelings and your boundaries together.','Можно учитывать и чувства, и ваши границы одновременно.','Podemos atender tus sentimientos y tus límites a la vez.')],
  clarify:[P('Let us distinguish what happened from what it might mean.','Разделим произошедшее и возможное значение этого.','Distingamos lo ocurrido de lo que podría significar.')],
  repair:[P('I assumed more than you told me; I will correct that.','Я предположила больше, чем вы сказали; исправлю это.','Supuse más de lo que dijiste; lo corregiré.')],
  transition:[P('You have space to find your own words for what matters.','Вы можете подобрать свои слова для того, что важно.','Puedes encontrar tus propias palabras para lo importante.')],
  pause:[P('You do not owe me any personal details.','Вы не обязаны делиться личными подробностями.','No tienes que contarme detalles personales.')],
  review:[P('The wording should respect your position and boundaries.','Формулировка должна учитывать вашу позицию и границы.','La formulación debe respetar tu postura y tus límites.')],
  action:[P('A conversation can begin with a clear, respectful request.','Разговор может начаться с ясной и уважительной просьбы.','Una conversación puede empezar con una petición clara y respetuosa.')]
 },
 alex:{
  contact:[P('We can examine the decision without jargon.','Можно разобрать решение без лишних терминов.','Podemos analizar la decisión sin jerga.')],
  reflect:[P('Facts, assumptions and trade-offs are different things.','Факты, предположения и компромиссы — разные вещи.','Los hechos, las suposiciones y los costes son distintos.')],
  clarify:[P('I want to know which constraint is verified.','Важно понять, какое ограничение подтверждено.','Importa saber qué límite está comprobado.')],
  repair:[P('I introduced that criterion myself; let us remove it.','Этот критерий добавил я; уберём его.','Ese criterio lo añadí yo; lo quitamos.')],
  transition:[P('There is now enough structure to compare possibilities.','Теперь есть структура для сравнения возможностей.','Ahora hay una estructura para comparar opciones.')],
  pause:[P('A decision can remain open while facts are missing.','Решение может остаться открытым, пока не хватает фактов.','La decisión puede quedar abierta si faltan datos.')],
  review:[P('Let us keep the conclusion separate from the evidence.','Оставим вывод отдельно от доказательств.','Dejemos la conclusión separada de la evidencia.')],
  action:[P('A low-risk information test may be more useful than a commitment.','Малорисковая проверка информации может быть полезнее обещания.','Una prueba de bajo riesgo puede servir más que un compromiso.')]
 },
 merlin:{
  contact:[P('There is no need to understand the whole path at once.','Необязательно сразу понимать весь путь.','No hace falta comprender todo el camino de una vez.')],
  reflect:[P('A turning point can reveal what you wish to keep.','Поворот жизни может показать, что хочется сохранить.','Un cambio puede mostrar lo que deseas conservar.')],
  clarify:[P('An image can be useful, but only if it belongs to your experience.','Образ полезен, только если он откликается вашему опыту.','Una imagen sirve solo si conecta con tu experiencia.')],
  repair:[P('My metaphor did not fit; let us leave it aside.','Мой образ не подошёл; оставим его.','Mi metáfora no encajó; dejémosla de lado.')],
  transition:[P('Your own experience may illuminate another perspective.','Ваш опыт может подсветить другой ракурс.','Tu experiencia puede iluminar otra perspectiva.')],
  pause:[P('We may stay with what has already become a little clearer.','Можно остаться с тем, что уже немного прояснилось.','Podemos quedarnos con lo que ya se ha aclarado un poco.')],
  review:[P('Only you can decide which insight feels truly yours.','Только вы определяете, какая мысль действительно ваша.','Solo tú decides qué idea sientes realmente tuya.')],
  action:[P('A small action can express a value without defining your destiny.','Небольшой поступок может выразить ценность, не определяя судьбу.','Un acto pequeño puede expresar un valor sin fijar tu destino.')]
 },
 harry:{
  contact:[P('Courage can start with an ordinary conversation.','Смелость может начинаться с обычного разговора.','El valor puede empezar con una conversación cotidiana.')],
  reflect:[P('Being brave does not mean having no doubts.','Быть смелым — не значит не испытывать сомнений.','Ser valiente no significa carecer de dudas.')],
  clarify:[P('Let us separate what is happening from what we fear might happen.','Отделим происходящее от того, чего мы только опасаемся.','Separemos lo que sucede de lo que tememos que suceda.')],
  repair:[P('That was my assumption, not yours; I will correct it.','Это было моё предположение, а не ваше; исправлю его.','Esa fue mi suposición, no la tuya; la corregiré.')],
  transition:[P('Support can matter as much as determination.','Поддержка может быть не менее важной, чем решимость.','El apoyo puede importar tanto como la determinación.')],
  pause:[P('You do not have to prove bravery by pushing through.','Не нужно доказывать смелость, заставляя себя продолжать.','No tienes que demostrar valentía obligándote a seguir.')],
  review:[P('Only you can decide what feels doable after our talk.','Только вы решаете, что после разговора действительно посильно.','Solo tú decides qué es factible después de hablar.')],
  action:[P('A brave step can be small, safe and supported.','Смелый шаг может быть небольшим, безопасным и с поддержкой.','Un paso valiente puede ser pequeño, seguro y acompañado.')]
 },

 genie:{
  contact:[P('Even a wish begins with being heard.','Даже большое желание начинается с того, что вас слышат.','Hasta un deseo empieza con sentirse escuchado.')],
  reflect:[P('I hear that this matters; no magic is needed to take it seriously.','Слышу, как это важно; чтобы отнестись серьёзно, чудеса не нужны.','Veo que esto importa; no hace falta magia para tomarlo en serio.')],
  clarify:[P('Before opening a door, which wish are we really naming?','Прежде чем открыть дверь, какое желание мы на самом деле называем?','Antes de abrir una puerta, ¿qué deseo estamos nombrando?')],
  repair:[P('That was my fantasy, not your wish; let us correct it.','Это была моя фантазия, а не ваше желание; давайте исправим.','Esa fue mi fantasía, no tu deseo; vamos a corregirlo.')],
  transition:[P('Now let us trade a little stardust for one real option.','А теперь обменяем немного звёздной пыли на один реальный вариант.','Ahora cambiemos un poco de polvo de estrellas por una opción real.')],
  pause:[P('You may close the lamp for today; there is no deadline to wish.','Можно закрыть лампу на сегодня; у желаний нет дедлайна.','Puedes cerrar la lámpara por hoy; no hay plazo para desear.')],
  review:[P('Which part of this path feels true in your own words?','Какая часть этого пути звучит по-настоящему вашими словами?','¿Qué parte de este camino sientes realmente tuya?')],
  action:[P('Choose a tiny experiment that belongs to you, not to me.','Выберите крошечный эксперимент, который принадлежит вам, а не мне.','Elige una prueba pequeña que sea tuya, no mía.')]
 },
 lea:{
  contact:[P('There is room for the meaning you give this, not a meaning I impose.','Здесь важно ваше значение происходящего, а не навязанное мной.','Importa el sentido que tú le das, no el que yo imponga.')],
  reflect:[P('We can return to the value you named yourself.','Можно вернуться к той ценности, которую вы сами назвали.','Podemos volver al valor que tú nombraste.')],
  clarify:[P('A metaphor is optional, never an explanation of who you are.','Метафора не обязательна и не объясняет, кто вы.','Una metáfora es opcional y no explica quién eres.')],
  repair:[P('That image was mine, not yours; let us put it away.','Этот образ был моим, не вашим; уберём его.','Esa imagen era mía, no tuya; dejémosla.')],
  transition:[P('A value can become a gentle guide for the next possibility.','Ценность может мягко подсказать следующую возможность.','Un valor puede orientar suavemente la siguiente posibilidad.')],
  pause:[P('The meaning does not need to be settled today.','Необязательно сегодня окончательно определять смысл.','No hace falta fijar el sentido hoy.')],
  review:[P('I would like to keep your own words at the center.','Мне хочется сохранить в центре именно ваши слова.','Quiero mantener tus palabras en el centro.')],
  action:[P('An action may express a value without turning it into a rule.','Поступок может выразить ценность, не становясь правилом.','Un acto puede expresar un valor sin convertirse en regla.')]
 },
 noah:{
  contact:[P('Let us treat this as an experiment, not a lifetime rule.','Пусть это будет проба, а не правило на всю жизнь.','Que sea una prueba, no una regla de por vida.')],
  reflect:[P('The context matters more than blaming yourself for a missed day.','Контекст важнее самоупрёков из-за пропущенного дня.','El contexto importa más que culparte por un día perdido.')],
  clarify:[P('We can look for the ordinary cue that starts the routine.','Можно найти обычный сигнал, запускающий привычку.','Podemos buscar la señal cotidiana que inicia el hábito.')],
  repair:[P('That was too big a step; we can shrink it.','Это был слишком большой шаг; можно его уменьшить.','Ese paso era demasiado grande; podemos reducirlo.')],
  transition:[P('A repeatable action can be very small.','Повторяемое действие может быть совсем маленьким.','Una acción repetible puede ser muy pequeña.')],
  pause:[P('Missing a day is information, not a moral failure.','Пропущенный день — информация, а не моральный провал.','Saltarse un día aporta información, no es un fallo moral.')],
  review:[P('We can check what was practical rather than what was perfect.','Оценим, что оказалось практичным, а не идеальным.','Revisemos lo práctico, no lo perfecto.')],
  action:[P('One two-minute trial is enough for a start.','Для начала достаточно двухминутной пробы.','Una prueba de dos minutos basta para empezar.')]
 },
 iris:{
  contact:[P('We can notice what works without denying what is difficult.','Можно замечать работающее, не отрицая трудности.','Podemos notar lo que funciona sin negar lo difícil.')],
  reflect:[P('A real exception is more useful than forced positivity.','Настоящее исключение полезнее натянутого оптимизма.','Una excepción real ayuda más que el optimismo forzado.')],
  clarify:[P('Let us look for what actually helped, not just what sounds good.','Посмотрим, что действительно помогало, а не просто красиво звучит.','Busquemos lo que de verdad ayudó, no lo que suena bien.')],
  repair:[P('I attributed a strength you did not mention; that was my mistake.','Я приписала вам силу, о которой вы не говорили; это моя ошибка.','Te atribuí una fortaleza que no mencionaste; fue mi error.')],
  transition:[P('Even a small useful exception can open a possibility.','Даже небольшое удачное исключение открывает возможность.','Una pequeña excepción útil puede abrir una posibilidad.')],
  pause:[P('We do not need to search for a silver lining now.','Сейчас не нужно обязательно искать положительную сторону.','No hace falta buscar el lado positivo ahora.')],
  review:[P('Let us name only strengths you recognize as your own.','Назовём лишь те силы, которые вы сами признаёте своими.','Nombremos solo las fortalezas que reconoces como tuyas.')],
  action:[P('A small repeat of what worked may be enough.','Может быть достаточно чуть повторить то, что работало.','Repetir un poco de lo que funcionó puede bastar.')]
 },
 ray:{
  contact:[P('We can look at this from another angle for a moment.','Можно на минуту посмотреть на задачу под другим углом.','Podemos mirar esto desde otro ángulo un momento.')],
  reflect:[P('An idea is not yet a decision; there is room to play.','Идея пока не решение; можно свободно поискать.','Una idea aún no es una decisión; podemos explorar.')],
  clarify:[P('We can examine which assumption feels like a fixed rule.','Можно проверить, какое предположение кажется неизменным правилом.','Podemos revisar qué supuesto parece una regla fija.')],
  repair:[P('That analogy missed the mark; let us change perspective.','Сравнение не попало в точку; сменим ракурс.','La analogía no encajó; cambiemos de perspectiva.')],
  transition:[P('Now we can open possibilities without choosing too early.','Теперь можно расширить возможности, не выбирая раньше времени.','Ahora podemos abrir posibilidades sin elegir antes de tiempo.')],
  pause:[P('Ideas can wait; we do not have to settle on one.','Идеи могут подождать; необязательно выбирать одну.','Las ideas pueden esperar; no hace falta elegir una.')],
  review:[P('We can separate the interesting ideas from the feasible ones.','Разделим интересные идеи и осуществимые варианты.','Separemos las ideas interesantes de las viables.')],
  action:[P('A small prototype could teach more than a perfect plan.','Небольшой прототип может научить большему, чем идеальный план.','Un prototipo pequeño puede enseñar más que un plan perfecto.')]
 }
}
export const COACH_PERSONA_SPEECH_VARIANTS=Object.freeze(Object.fromEntries(
 Object.entries(speech).map(([persona,acts])=>[persona,Object.freeze(Object.fromEntries(
  Object.entries(acts).map(([act,variants])=>[act,Object.freeze(variants)])))])))
export function personaSpeechCue(personaId,act,locale='en'){
 if(!['en','ru','es'].includes(locale))return ''
 const rows=COACH_PERSONA_SPEECH_VARIANTS[personaId]?.[act]
 return rows?.[0]?.[locale]||''
}
