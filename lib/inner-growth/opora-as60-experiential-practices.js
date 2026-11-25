// OPORA AS-6.0: voluntary, experiential micro-experiments.
// Overlay AS-5.9, never rewrite historically saved AS-5.9 or AS-5.8 wording.
// Each exercise has one visible micro-step at a time. No diagnostic inference,
// forced breathing, exposure, compelled recollection or automatic completion.
import {oporaAs59Day,oporaAs59Skills} from './opora-as59-seven-skills.js'

export const OPORA_EXPERIENTIAL_EDITION='as-6.0-experiments-v1'
const l=(ru,en,es)=>Object.freeze({ru,en,es})
const q=(id,ru,en,es)=>Object.freeze({id,label:l(ru,en,es)})
const part=(lead,steps,result,transfer)=>Object.freeze({lead,steps:Object.freeze(steps),result,transfer})
const SKILLS=Object.freeze([
  {
    id:'S1',
    name:l('Мой знак опоры','My personal anchor','Mi señal de apoyo'),
    purpose:l(
      'Простой взгляд вокруг — только начало. Сегодня мы находим маленький личный символ устойчивости и связываем его с доступным действием, без требования успокоиться.',
      'Looking around is only the beginning. Find a small personal sign of steadiness and connect it with an action you can actually choose. Calm is not a requirement.',
      'Mirar alrededor es solo el comienzo. Busca una pequeña señal personal de estabilidad y únela a una acción posible, sin tener que calmarte.'),
    prompt:l('Какое качество вам сейчас ближе?','Which quality feels most useful now?','¿Qué cualidad te ayudaría ahora?'),
    choices:Object.freeze([
      q('steady','Устойчивость','Steadiness','Estabilidad'),
      q('warm','Тепло','Warmth','Calidez'),
      q('space','Простор','Space','Espacio'),
    ]),
    first:part(
      l('Ищем личный знак опоры — не просто считаем предметы.',
        'Find a personal anchor instead of merely counting objects.',
        'Busca una señal de apoyo, no solo cuentes objetos.'),
      [
        l('Выберите безопасный предмет, цвет или слово. Спросите: какое качество он для меня означает?',
          'Choose an ordinary object, colour or word. What helpful quality does it suggest to you?',
          'Elige un objeto, color o palabra cotidiana. ¿Qué cualidad útil te sugiere?'),
        l('Представьте это качество рядом с собой, без необходимости что-либо чувствовать.',
          'Let that quality be a simple reminder. You do not need to feel anything special.',
          'Deja que esa cualidad sea un recordatorio; no necesitas sentir nada especial.'),
        l('Выберите реальное действие на 20 секунд: опереться, отдохнуть или замедлить одно дело. Заметьте, подходит ли оно.',
          'Try one available 20-second response: lean on support, rest, or slow a small task. Notice whether it fits.',
          'Prueba 20 segundos: apoyarte, descansar o ir más despacio. Observa si te sirve.'),
      ],
      l('Одна собственная ассоциация и один возможный шаг поддержки','One personal association and a possible support step','Una asociación personal y un paso de apoyo posible'),
      l('Сегодня дважды вспомните свой знак и, если удобно, выберите маленькую паузу или отдых.',
        'Recall your anchor twice today; if it suits you, choose a brief pause or rest.',
        'Recuerda tu señal dos veces hoy y, si te ayuda, elige una pausa o descanso.')),
    repeat:part(
      l('Проверяем, работает ли ваша опора в обычном моменте спешки.',
        'Test whether your chosen anchor fits a mildly rushed moment.',
        'Comprueba si tu señal sirve en un momento cotidiano de prisa.'),
      [
        l('Возьмите вымышленный пример: пришли три сообщения подряд. Не нужно вспоминать трудное событие.',
          'Use a fictional example: three messages arrive at once. No difficult memory is needed.',
          'Usa un ejemplo ficticio: llegan tres mensajes. No hace falta recordar algo difícil.'),
        l('Вспомните знак и качество дня 1 либо выберите новый, если старый не подходит.',
          'Recall your day-one sign and its quality, or choose a new one if it no longer fits.',
          'Recuerda tu señal del día 1 o elige otra si ya no te sirve.'),
        l('Порепетируйте 20 секунд: знак → качество → короткая пауза перед ответом. Можно только вообразить.',
          'Rehearse for 20 seconds: sign → quality → short pause before replying. Imagining is enough.',
          'Ensaya 20 segundos: señal → cualidad → pausa antes de responder. Imaginarlo basta.'),
      ],
      l('Проверенный или заменённый личный ориентир','A personal anchor tested or changed','Una señal personal probada o cambiada'),
      l('Перед одним несрочным сообщением вспомните знак; действовать необязательно.',
        'Before one non-urgent reply, recall your sign; acting on it is optional.',
        'Antes de un mensaje no urgente recuerda tu señal, sin obligación de actuar.')),
  },
  {
    id:'S2',
    prompt:l('Где сейчас легче найти поддержку?','Where is support easiest to notice?','¿Dónde es más fácil notar apoyo?'),
    choices:Object.freeze([
      q('feet','Стопы','Feet','Pies'),q('seat','Сиденье','Seat','Asiento'),q('hands','Ладони','Hands','Manos'),
    ]),
    first:part(
      l('Мини-эксперимент «Три точки опоры»: ищем удобную, а не правильную.',
        'Try the three-support-point experiment and choose comfort over correctness.',
        'Prueba tres puntos de apoyo: importa la comodidad, no acertar.'),
      [
        l('Если приятно, отметьте контакт стоп с полом. Можно просто посмотреть на пол.',
          'If comfortable, notice your feet on the floor. Looking at the floor also counts.',
          'Si te resulta cómodo, nota los pies en el suelo o simplemente míralo.'),
        l('Заметьте сиденье или поверхность под ладонями. Не нужно усиливать давление.',
          'Notice your seat or the surface beneath your hands. There is no need to press.',
          'Nota el asiento o la superficie bajo tus manos, sin presionar.'),
        l('Выберите самую удобную точку на 15 секунд. Можно сменить её или остановиться.',
          'Choose the most comfortable point for 15 seconds. You may switch or stop.',
          'Elige el punto más cómodo durante 15 segundos. Puedes cambiar o parar.'),
      ],
      l('Выбранная комфортная физическая опора или отказ','A comfortable support point or a decision to stop','Un punto cómodo de apoyo o la decisión de parar'),
      l('Один раз при отдыхе вспомните выбранную точку опоры, если это приятно.',
        'Once while resting, revisit the support point if that feels good.',
        'Al descansar, recuerda una vez ese punto de apoyo si te sienta bien.')),
    repeat:part(
      l('Проверяем переход между двумя удобными опорами без усилия.',
        'Try moving attention between two comfortable supports without strain.',
        'Prueba cambiar la atención entre dos apoyos cómodos sin esfuerzo.'),
      [
        l('Выберите две нейтральные точки: например, ладони и спинку стула.',
          'Choose two neutral points, such as your hands and the back of a chair.',
          'Elige dos puntos neutros, como las manos y el respaldo de una silla.'),
        l('Мягко переведите внимание с одной точки на другую, без давления и контроля дыхания.',
          'Shift attention gently between them without pressing or controlling your breath.',
          'Cambia suavemente la atención entre ellas sin presionar ni controlar la respiración.'),
        l('Выберите ту, что приятнее; при дискомфорте оставьте внимание на предмете в комнате.',
          'Keep whichever is easier; if uncomfortable, notice an ordinary object instead.',
          'Quédate con la más cómoda; si molesta, mira un objeto cotidiano.'),
      ],
      l('Опробован способ переключаться между опорами','An option to switch support points rehearsed','Una forma de cambiar entre apoyos probada'),
      l('При следующей спокойной паузе выберите одну удобную опору или нейтральный предмет.',
        'At your next restful pause choose a support point or a neutral object.',
        'En la próxima pausa elige un punto de apoyo o un objeto neutro.')),
  },
  {
    id:'S3',
    prompt:l('Какой безопасный вариант вы выберете?','Which gentle option fits you?','¿Qué opción suave prefieres?'),
    choices:Object.freeze([q('hand','Кисть','Hand','Mano'),q('shoulder','Плечо','Shoulder','Hombro'),q('rest','Отдых','Rest','Descanso')]),
    first:part(
      l('Эксперимент «На 10% мягче»: сравним два удобных положения без боли.',
        'Experiment with 10% less effort, comparing two comfortable positions.',
        'Prueba un 10 % menos de esfuerzo comparando dos posturas cómodas.'),
      [
        l('Заметьте, как рука лежит на столе или коленях. Не нужно искать напряжение.',
          'Notice how one hand rests on a table or your lap. No need to hunt for tension.',
          'Nota cómo descansa una mano. No hace falta buscar tensión.'),
        l('Если удобно, на секунду чуть ослабьте хват или отпустите плечо. Не тяните и не напрягайте.',
          'If comfortable, loosen your grip or shoulder slightly. Do not stretch or strain.',
          'Si es cómodo, afloja un poco la mano o el hombro sin forzar.'),
        l('Сравните: первое положение или второе удобнее? Можно выбрать прежнее или отдых.',
          'Which position feels easier? Keeping the original or resting is a valid choice.',
          '¿Cuál postura resulta más cómoda? Quedarte como antes o descansar también vale.'),
      ],
      l('Найдено удобное движение, прежнее положение или отдых','A comfortable adjustment, original position or rest','Un ajuste cómodo, la postura original o descanso'),
      l('При работе с телефоном проверьте, не хочется ли чуть ослабить пальцы.',
        'When using your phone, see if loosening your fingers feels useful.',
        'Al usar el móvil, comprueba si aflojar los dedos te ayuda.')),
    repeat:part(
      l('Переносим мягкость из кисти в одно бытовое действие.',
        'Bring a lighter touch to one everyday action.',
        'Lleva un gesto más suave a una tarea cotidiana.'),
      [
        l('Выберите простое безопасное действие: взять чашку или пролистать страницу.',
          'Choose a simple safe action, like holding a cup or scrolling a page.',
          'Elige una acción sencilla, como coger una taza o pasar una página.'),
        l('Повторите мысленно или реально с чуть меньшим усилием. Не нужно добиваться расслабления.',
          'Rehearse it mentally or physically with a little less force. Relaxation is not required.',
          'Repítela mentalmente o de verdad con algo menos de fuerza, sin forzar la relajación.'),
        l('Сравните два варианта и оставьте тот, который подходит вашему телу сейчас.',
          'Compare both options and keep whichever feels appropriate now.',
          'Compara ambas opciones y conserva la que mejor se adapte ahora.'),
      ],
      l('Осознанно выбрана степень усилия','An effort level chosen with awareness','Un nivel de esfuerzo elegido conscientemente'),
      l('При одном несрочном деле опробуйте комфортное усилие или паузу.',
        'During a non-urgent task choose comfortable effort or a pause.',
        'En una tarea no urgente elige un esfuerzo cómodo o una pausa.')),
  },
  {
    id:'S4',
    prompt:l('Какая «погода» подходит учебному примеру?','Which emotional weather fits the example?','¿Qué tiempo emocional describe el ejemplo?'),
    choices:Object.freeze([q('cloud','Облачно','Cloudy','Nublado'),q('wind','Ветрено','Windy','Con viento'),q('clear','Ясно','Clear','Despejado')]),
    first:part(
      l('«Погода внутри»: назовём несильное чувство и подберём бережный ответ.',
        'Try an emotional weather report, followed by one caring response.',
        'Haz un parte del tiempo emocional y elige una respuesta amable.'),
      [
        l('Возьмите лёгкое чувство или вымышленного героя; серьёзные воспоминания не нужны.',
          'Choose a mild feeling or a fictional character; no intense memories are needed.',
          'Elige una emoción leve o un personaje ficticio, sin recuerdos intensos.'),
        l('Представьте погоду этого чувства: облако, ветер или ясное небо. Никакой трактовки.',
          'Describe it as weather: cloud, wind or clear sky. It has no hidden interpretation.',
          'Descríbelo como nubes, viento o cielo despejado, sin interpretaciones ocultas.'),
        l('Скажите по-доброму: «Сейчас так; что могло бы помочь?» Можно выбрать отдых или не отвечать.',
          'Try a kind phrase: “This is how it is now; what might help?” Rest or no answer is fine.',
          'Di con amabilidad: «Ahora es así; ¿qué ayudaría?» Descansar o callar está bien.'),
      ],
      l('Названное чувство или учебный образ и бережный ответ','A named feeling or fictional example and a kind response','Una emoción o ejemplo nombrado con amabilidad'),
      l('Если встретится небольшое чувство, попробуйте назвать его без оценки.',
        'If a mild feeling appears today, try naming it without judgment.',
        'Si aparece una emoción leve, intenta nombrarla sin juzgarte.')),
    repeat:part(
      l('Проверяем, можно ли оставаться добрым к себе, даже если чувство не исчезло.',
        'Practise kindness even when a mild feeling does not disappear.',
        'Practica la amabilidad aunque una emoción leve no desaparezca.'),
      [
        l('Представьте знакомую бытовую заминку или только вымышленный пример.',
          'Imagine a small everyday inconvenience, or only a fictional one.',
          'Imagina un contratiempo leve o solo una situación ficticia.'),
        l('Назовите погоду чувства без попытки изменить её.',
          'Name its emotional weather without trying to change it.',
          'Pon nombre al tiempo emocional sin intentar cambiarlo.'),
        l('Добавьте фразу: «Я могу отнестись к себе мягче и выбрать один удобный ответ».',
          'Add: “I can respond kindly and choose one manageable step.”',
          'Añade: «Puedo tratarme con amabilidad y elegir un paso posible».'),
      ],
      l('Бережная фраза на фоне сохраняющегося чувства','A kind phrase while a feeling may remain','Una frase amable aunque la emoción permanezca'),
      l('Во время бытовой задержки попробуйте одну добрую фразу — только по желанию.',
        'During a small delay, try one kind phrase if you want.',
        'Ante una pequeña demora, prueba una frase amable si quieres.')),
  },
  {
    id:'S5',
    prompt:l('Как обращаться с тревожной мыслью?','How might you respond to a worry thought?','¿Cómo responder a una preocupación?'),
    choices:Object.freeze([q('label','Назвать мыслью','Name it as a thought','Nombrarla pensamiento'),q('fact','Проверить факт','Check a fact','Comprobar un hecho'),q('pause','Отложить','Set aside','Dejarla pasar')]),
    first:part(
      l('«Радио мыслей»: замечаем внутренний комментарий, не принимая его за приказ.',
        'Try thought radio: notice an inner commentary without treating it as an order.',
        'Prueba la radio mental: observa un comentario sin convertirlo en orden.'),
      [
        l('Возьмите нейтральный пример: «Мне надо ответить на всё прямо сейчас».',
          'Use a mild fictional thought: “I must answer everything right now.”',
          'Usa una idea ficticia leve: «Debo contestar todo ahora».'),
        l('Добавьте перед ней: «Я замечаю мысль, что…». Не нужно спорить с ней.',
          'Place “I notice I am having the thought that…” before it. No arguing required.',
          'Anteponle «Noto que tengo el pensamiento de que…», sin discutir.'),
        l('Спросите, нужен ли маленький шаг сейчас или мысль может немного подождать.',
          'Ask whether a small action is useful now or the thought can wait.',
          'Pregunta si hace falta un paso pequeño ahora o si la idea puede esperar.'),
      ],
      l('Один способ заметить мысль и выбрать ответ','One way to notice a thought and choose a response','Una forma de observar un pensamiento y elegir respuesta'),
      l('При несрочной тревожной мысли попробуйте добавить «Я замечаю мысль…».',
        'For one low-stakes worry, try the prefix “I notice a thought…”',
        'Ante una preocupación leve, prueba «Noto que pienso…».')),
    repeat:part(
      l('Учимся отличать факт от тревожного прогноза без искусственного оптимизма.',
        'Separate a fact from a worrying forecast without forced optimism.',
        'Distingue un hecho de una predicción ansiosa sin optimismo forzado.'),
      [
        l('Пример: «Мне не ответили 10 минут, значит, я всем надоел».',
          'Example: “No reply for ten minutes means everyone is tired of me.”',
          'Ejemplo: «No responden en diez minutos; seguro que les molesto».'),
        l('Факт: ответа пока нет. Прогноз: «я надоел». Их можно держать раздельно.',
          'Fact: no reply yet. Prediction: “I annoy people.” Keep them separate.',
          'Hecho: aún no hay respuesta. Pronóstico: «molesto». Sepáralos.'),
        l('Выберите ответ: подождать, заняться делом или проверить позже. Можно просто прочитать.',
          'Choose an option: wait, do another task, or check later. Reading is enough.',
          'Elige: esperar, seguir con otra tarea o revisar luego. Leer también vale.'),
      ],
      l('Отделены бытовой факт и предположение','An ordinary fact distinguished from a prediction','Un hecho cotidiano separado de una suposición'),
      l('При одном несрочном сообщении отделите факт от предположения, если хочется.',
        'For one non-urgent message, optionally distinguish fact from prediction.',
        'Ante un mensaje no urgente, separa hecho de suposición si quieres.')),
  },
  {
    id:'S6',
    prompt:l('Какую фразу безопаснее репетировать?','Which phrase feels safe to rehearse?','¿Qué frase te resulta segura?'),
    choices:Object.freeze([q('pause','Нужна пауза','I need a pause','Necesito una pausa'),q('later','Отвечу позже','I will reply later','Responderé después'),q('help','Прошу помощи','I can ask for help','Puedo pedir ayuda')]),
    first:part(
      l('«Голос опоры»: подбираем короткую фразу границы без реальной отправки.',
        'Try a support phrase: rehearse a respectful boundary without sending anything.',
        'Ensaya una frase de apoyo y un límite respetuoso, sin enviarlo.'),
      [
        l('Возьмите безопасную вымышленную просьбу: «Можешь сделать ещё одно дело?»',
          'Imagine a safe fictional request: “Can you do one more thing?”',
          'Imagina una petición ficticia: «¿Puedes hacer una cosa más?»'),
        l('Выберите фразу: «Мне нужна пауза», «Отвечу позже» или «Помоги мне с этим».',
          'Choose: “I need a pause”, “I will reply later”, or “Could you help?”',
          'Elige: «Necesito una pausa», «Responderé después» o «¿Me ayudas?».'),
        l('Произнесите мысленно или вслух, если безопасно. Сохранять или отправлять её не нужно.',
          'Say it silently or aloud if safe. You do not have to send it.',
          'Dila mentalmente o en voz alta si es seguro, sin tener que enviarla.'),
      ],
      l('Подходящая личная фраза или право отложить','A suitable phrase or permission to defer','Una frase posible o el derecho de aplazar'),
      l('В одном обычном разговоре вспомните свою фразу — произносить необязательно.',
        'Recall your phrase during an ordinary conversation; saying it is optional.',
        'Recuerda tu frase en una charla cotidiana; no hace falta decirla.')),
    repeat:part(
      l('Репетиция уважительной просьбы с правом передумать.',
        'Rehearse a respectful request, with permission to change your mind.',
        'Ensaya una petición respetuosa con permiso para cambiar de idea.'),
      [
        l('Выберите человека или вымышленный диалог, который не вызывает страха.',
          'Choose a safe person or a fictional conversation that does not feel threatening.',
          'Elige una persona segura o un diálogo ficticio que no asuste.'),
        l('Представьте короткую фразу: «Мне нужно немного времени, отвечу позже».',
          'Try: “I need a little time; I will reply later.”',
          'Prueba: «Necesito algo de tiempo; responderé después».'),
        l('Посмотрите, насколько естественно она звучит; замените слова на свои либо не продолжайте.',
          'Notice how it sounds; change the wording to your own or stop.',
          'Comprueba si suena natural; cambia las palabras o detente.'),
      ],
      l('Составлена или отклонена уважительная фраза границы','A respectful boundary phrase drafted or declined','Una frase de límite preparada o descartada'),
      l('При спокойном общении при желании используйте короткую просьбу о времени.',
        'In a calm exchange, optionally ask for more time.',
        'En una conversación tranquila, pide tiempo solo si lo deseas.')),
  },
  {
    id:'S7',
    prompt:l('Какой запасной вариант вам доступен?','Which fallback is genuinely available?','¿Qué alternativa tienes disponible?'),
    choices:Object.freeze([q('rest','Отдохнуть','Rest','Descansar'),q('neutral','Нейтральный предмет','Neutral object','Objeto neutro'),q('person','Найти помощь','Seek support','Buscar ayuda')]),
    first:part(
      l('Собираем «ОПОРА 2+1»: два приёма на выбор и один запасной вариант.',
        'Build your 2+1 support kit: two personal options and one fallback.',
        'Crea tu kit de apoyo 2+1: dos opciones y una alternativa.'),
      [
        l('Вспомните два занятия из предыдущих шести, которые показались уместными. Можно выбрать только один.',
          'Recall two skills from previous days that felt suitable. Just one is enough.',
          'Recuerda dos prácticas anteriores que te sirvieron; una sola basta.'),
        l('Для вымышленного трудного дня решите, с какого приёма безопаснее начать.',
          'For a fictional busy day, decide which skill would be safe to try first.',
          'Para un día ficticio de mucho trabajo, elige por dónde empezar.'),
        l('Выберите запасной путь: отдых, нейтральный предмет или поддержку человека. Ничего доказывать не нужно.',
          'Choose a fallback: rest, a neutral object or human support. No need to prove success.',
          'Elige alternativa: descanso, objeto neutro o ayuda humana, sin demostrar nada.'),
      ],
      l('Личная комбинация 2+1 или честно выбранный минимум','A personal 2+1 combination or a minimal honest option','Una combinación 2+1 o una opción mínima realista'),
      l('Держите в памяти удобную комбинацию; пробовать её нужно только по желанию.',
        'Keep your chosen combination in mind; real-world practice is optional.',
        'Ten presente tu combinación; practicarla en la vida real es opcional.')),
    repeat:part(
      l('Мини-репетиция личного маршрута на обычный день — с правом менять план.',
        'Rehearse your personal route for an ordinary day, with permission to adapt it.',
        'Ensaya tu ruta para un día cotidiano, con libertad para cambiarla.'),
      [
        l('Представьте небольшой бытовой стресс, например, внезапно изменился план.',
          'Imagine a small everyday stressor, such as a changed plan.',
          'Imagina una pequeña dificultad, como un cambio de planes.'),
        l('Выберите одну любимую опору и коротко отрепетируйте её. Можно только прочитать.',
          'Choose one favourite support skill and rehearse it briefly, or simply read.',
          'Elige tu recurso favorito y ensáyalo un momento, o simplemente lee.'),
        l('Если она не подходит, переключитесь на запасной вариант. Это не экзамен на спокойствие.',
          'If it does not fit, switch to your fallback. This is not a calmness exam.',
          'Si no te sirve, cambia a la alternativa; no es un examen de calma.'),
      ],
      l('Репетиция собственной последовательности и запасного пути','A personal sequence and fallback rehearsed','Una secuencia personal y alternativa ensayadas'),
      l('Возьмите одну удачную опору в обычный день; при необходимости замените её отдыхом.',
        'Use one suitable support in daily life, or replace it with rest.',
        'Usa un recurso adecuado en la vida diaria o sustitúyelo por descanso.')),
  },
])
const LANGS=Object.freeze(['en','ru','es'])
const chooseLang=locale=>LANGS.includes(locale)?locale:'en'
export function oporaAs60Day(day,locale='en'){
  const previous=oporaAs59Day(day,locale)
  if(!previous)return null
  const lang=chooseLang(locale),skill=SKILLS[(day-1)%7]
  const level=day<=7?skill.first:skill.repeat
  return Object.freeze({
    ...previous,
    skill:skill.name?.[lang]||previous.skill,
    purposeTitle:skill.name?.[lang]||previous.purposeTitle,
    purpose:skill.purpose?.[lang]||previous.purpose,
    title:day===1?l('Мой знак опоры','My personal anchor','Mi señal de apoyo')[lang]:
      day===8?l('Опора во время спешки','Anchor when rushed','Apoyo al tener prisa')[lang]:previous.title,
    practice:level.lead[lang],result:level.result[lang],
    transfer:level.transfer[lang],
    experiment:Object.freeze({
      steps:Object.freeze(level.steps.map(text=>text[lang])),
      prompt:skill.prompt[lang],
      choices:Object.freeze(skill.choices.map(c=>Object.freeze({id:c.id,label:c.label[lang]}))),
    }),
  })
}
export function oporaAs60Skills(locale='en'){
  const lang=chooseLang(locale)
  return oporaAs59Skills(lang).map((base,index)=>Object.freeze({
    ...base,
    title:SKILLS[index].name?.[lang]||base.title,
    description:SKILLS[index].purpose?.[lang]||base.description,
    outcome:SKILLS[index].repeat.result[lang],
  }))
}
export function oporaAs60Valid(){
  if(SKILLS.length!==7||new Set(SKILLS.map(x=>x.id)).size!==7)return false
  const seen=new Set()
  for(let day=1;day<=14;day++)for(const lang of LANGS){
    const entry=oporaAs60Day(day,lang)
    if(!entry||entry.skillId!=='S'+((day-1)%7+1))return false
    if(typeof entry.practice!=='string'||entry.practice.length<25||entry.practice.length>190)return false
    if(entry.transfer.length>190||entry.result.length>190)return false
    if(entry.experiment.steps.length!==3||entry.experiment.steps.some(x=>x.length<24||x.length>170))return false
    if(entry.experiment.choices.length!==3||new Set(entry.experiment.choices.map(x=>x.id)).size!==3)return false
    if(entry.experiment.choices.some(x=>x.label.length<3||x.label.length>48))return false
    if(entry.experiment.prompt.length<12||entry.experiment.prompt.length>95)return false
    seen.add(lang+':'+entry.practice)
  }
  return seen.size===42
}
