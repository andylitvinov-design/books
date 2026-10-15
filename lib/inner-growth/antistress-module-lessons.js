import {fiveLevelLessonRow,fiveLevelContentComplete,OPORA_FIVE_LEVEL_CONTENT_VERSION} from './antistress-module-lessons-v2.js'
// NAV-1.3 legacy curricula remain pinned and readable. NAV-2.0 adds five stress-level paths.
// AS2 keeps the approved 14 x 15 OPORA sequence; new NAV-2.0 curricula live separately.
// No traumatic memory retrieval, exposure, diagnoses, or forced bodywork.
export const OPORA_MODULE_LESSON_VERSION='opora-module-lessons-1.0'
const items={
AS1:[
['Право остановиться','Permission to pause','В учебном примере нажмите «начать», «пауза» или «не сегодня». Можно сразу выбрать отдых.','In this learning example, choose to start, pause or rest. Not starting is a valid choice.'],
['Мой удобный темп','My comfortable pace','Выберите мысленно длительность десять секунд, минуту или только взгляд на предмет. Измените решение, если нужно.','Choose a ten-second, one-minute or look-only option. Change your mind whenever needed.'],
['Три обычных предмета','Three ordinary objects','Оглядитесь и назовите три нейтральных предмета, либо найдите их на фотографии.','Look around and name three ordinary objects, or find them in a photograph.'],
['Один знакомый ориентир','One familiar anchor','Выберите один спокойный цвет или форму. Через короткую паузу попробуйте вновь его найти.','Choose one neutral colour or shape; see whether you can find it again after a brief pause.'],
['Выбираю комфортные стимулы','Choosing comfortable input','Подумайте, подходит ли вам тишина, текст или спокойное изображение. Выберите только один вариант.','Consider whether silence, written words or one calm image fits best. Choose one.'],
['Я могу сменить формат','I can switch formats','Если аудио или образ не подходит, мысленно переключите его на письменную инструкцию или отдых.','If sound or imagery does not suit you, switch to written directions or rest.'],
['Мои реальные опоры','My real supports','Назовите доступный сейчас предмет, место или способ отдыха. Не нужно воображать то, чего у вас нет.','Identify an actually available object, place or way to rest. No imaginary support is required.'],
['Поверхность и пространство','Surface and surroundings','Если удобно, отметьте спинку стула или поверхность под ногами. Если нет, просто найдите вокруг прямую линию.','If comfortable, notice the chair or floor. Otherwise notice a straight line in the room.'],
['Ранний знак остановки','My early pause signal','В вымышленной бытовой ситуации выберите момент, когда человек мог бы сделать паузу.','In an everyday fictional scene, choose where a person might pause.'],
['Можно сделать меньше','Doing less is allowed','Выберите, как сократить обычную задачу: на один шаг, на минуту или отложить полностью.','Choose how to reduce a routine task: one step, one minute or postponing it.'],
['Спокойная фраза границы','A simple boundary phrase','Попробуйте мысленно фразу «Сейчас мне нужно время». Отправлять её кому-то необязательно.','Try the phrase “I need a moment”. There is no need to send it to anyone.'],
['Доступная помощь','Available help','Выберите тип помощи: отдых, безопасный человек или служба поддержки. Личные контакты не нужны.','Choose a kind of help: rest, a trusted person or a support service. No contact details needed.'],
['Я выбираю знакомую опору','Choosing my familiar support','Без подсказок выберите один уже опробованный способ — либо отметьте, что сейчас подходит только отдых.','Choose one familiar strategy without prompts, or choose rest.'],
['Карта моего безопасного начала','My gentle starting map','Составьте последовательность: нейтральный предмет → пауза → отдых или поддержка.','Make a small map: neutral object → pause → rest or support.']
],
AS3:[
['Называю эмоцию','Naming a feeling','Для вымышленного героя выберите одно-два возможных чувства. «Не знаю» тоже подходит.','Choose one or two possible feelings for a fictional character. “Not sure” is fine.'],
['Смешанные чувства','Mixed feelings','Заметьте, что один обычный эпизод может одновременно вызвать разные чувства. Назовите два варианта.','An everyday situation may bring two feelings at once. Try naming both.'],
['Громкость чувства','The volume of a feeling','Представьте регулятор силы чувства в вымышленной сцене от нуля до десяти; оценивать себя не обязательно.','Imagine a 0–10 dial for a fictional character’s feeling. No need to rate yourself.'],
['Близость и дистанция','Closeness and distance','В мысленном упражнении переключайтесь между названием чувства героя и нейтральным предметом вокруг.','Switch attention between a character’s feeling and an ordinary object nearby.'],
['Три ассоциации к картинке','Three image associations','Найдите в спокойной фотографии три слова-ассоциации. Не считайте их диагнозом или скрытым смыслом.','Choose three words associated with a calm photo; they are not a diagnosis or hidden truth.'],
['Пять простых качеств','Five ordinary qualities','На нейтральной фотографии выберите предмет и пять его внешних качеств, без оценок собственной личности.','Choose one object in a neutral photo and five visible qualities, not personality judgments.'],
['Чувство и возможная потребность','Feelings and needs','В вымышленном случае подберите к эмоции возможную потребность — отдых, ясность, пространство или помощь.','Match a fictional feeling to a possible need: rest, clarity, room or support.'],
['Мягкая помощь чувству','Kind response to feelings','Подберите для героя один реалистичный вариант поддержки, не заставляя его чувствовать иначе.','Offer a fictional character one realistic support without forcing their feelings to change.'],
['Чувство — не приказ','Feelings are not commands','Разделите в безопасном примере три карточки: чувство, мысль и возможное действие.','In a gentle example, separate a feeling, a thought and a possible action.'],
['Несколько реакций на один эпизод','Several ways to respond','Предложите герою два возможных ответа на одно неловкое бытовое событие.','Choose two possible responses for a character in one mildly awkward event.'],
['Граница, когда трудно','A boundary under stress','Попробуйте фразу «Мне нужно время, чтобы ответить» в вымышленном разговоре.','Try “I need time to answer” in a fictional conversation.'],
['Возвращение к окружающему','Back to the room','Сначала назовите одну эмоцию в учебном сюжете, затем найдите два обычных цвета вокруг себя.','Name a feeling in a story, then notice two ordinary colours around you.'],
['Я сам выбираю способ','Choosing my own response','Выберите знакомую практику для чувства героя без подсказки или откажитесь от упражнения.','Choose a familiar response for a fictional feeling without a hint, or skip.'],
['Моя карта чувств','My feelings map','Соберите карту: чувство → потребность → возможная граница → опора.','Build a map: feeling → need → possible boundary → support.']
],
AS4:[
['Замечаю привычный ответ','Noticing my usual response','В нейтральной сцене выделите событие и привычную реакцию персонажа.','Identify an everyday event and a fictional character’s habitual response.'],
['Другой возможный ответ','Another possible response','Для похожей безопасной ситуации назовите другой реалистичный ответ героя.','Find another realistic response for a similar everyday situation.'],
['Язык сигналов стресса','Words for stress signals','Сравните нейтральные описания: спешка, отстранение, замедление, просьба о паузе.','Compare neutral descriptions: rushing, withdrawing, slowing or requesting time.'],
['Разные способы справляться','Different ways to cope','Для вымышленного человека отметьте два разных способа реагировать на небольшую нагрузку.','Identify two ways a fictional person may react to a small everyday demand.'],
['Пауза в переписке','Pausing before replying','Представьте обычное сообщение и выберите вариант: ответить позже, попросить время или ничего не делать.','Imagine a routine message; reply later, request time or do nothing for now.'],
['Меняю скорость','Changing pace','В новом бытовом сюжете выберите остановиться, сократить задачу или спокойно продолжить.','In a new everyday scene, choose to pause, simplify or gently continue.'],
['Выбираю удобную нагрузку','Choosing a manageable load','Разделите учебную задачу на лёгкую, среднюю и чрезмерную версии, выберите подходящую.','Divide a task into light, moderate and too-much options; choose one.'],
['Переключаю внимание','Switching attention','После мысленной обычной задачи найдите вокруг один цвет и один предмет.','After thinking of a routine task, notice one colour and one object nearby.'],
['Факт и предположение','Fact and assumption','Разделите нейтральное сообщение на то, что известно, и то, что человек предполагает.','Separate what is known from what a person assumes about an ordinary message.'],
['Когда — могу','When–then choice','Составьте необязательную карточку: «Когда сообщений много, я могу сделать минутную паузу».','Make an optional card: “When messages pile up, I can take a short pause.”'],
['Граница в диалоге','A boundary in conversation','Выберите уважительную фразу остановки для вымышленного бытового разговора.','Choose a courteous pause phrase for a fictional everyday conversation.'],
['Мои альтернативы','My alternatives','В безопасной сцене выберите между отдыхом, уменьшением задачи и просьбой о помощи.','Choose between rest, reducing a task and asking for help in a safe scenario.'],
['Практика выбора','Practising a response','В новом нейтральном примере попробуйте отметить сигнал, паузу и возможное действие.','In a new neutral example, notice a signal, pause and possible next action.'],
['Карта стрессовой реакции','My stress-response map','Составьте личную карту: бытовой сигнал → обычный ответ → альтернатива → опора.','Build a map: everyday signal → usual response → alternative → support.']
],
AS5:[
['Я больше сегодняшнего состояния','More than how I feel today','Назовите одно нейтральное увлечение или роль, которые вам подходят сейчас. Можно пропустить.','Choose a role or interest beyond today’s feeling, or skip.'],
['Мои разные стороны','My different sides','Найдите в вымышленном герое два качества, не связанные с его текущим стрессом.','Name two qualities of a fictional person that are not defined by their stress.'],
['Поддерживающий голос','A supportive inner voice','Выберите правдоподобную фразу доброжелательности к себе без обещаний немедленного улучшения.','Choose a believable, kind phrase without expecting instant relief.'],
['От строгого к бережному','From harsh to kind','Вымышленному персонажу замените жёсткую фразу на уважительную, но не обязательно позитивную.','Rewrite a fictional harsh statement as respectful rather than falsely positive.'],
['Что мне действительно важно','What matters to me','Выберите из списка до трёх ценностей: здоровье, знания, отношения, творчество, отдых или другое.','Choose up to three values: health, learning, connection, creativity, rest or another.'],
['Ценность без давления','Values without pressure','Для одной выбранной ценности предложите очень маленький шаг или допустимый отдых.','For one chosen value, name a very small step or permission to rest.'],
['Доступные ресурсы','Resources I can use','Найдите одну реальную опору и один резервный способ помощи, не идеализируя ситуацию.','Identify one real support and one backup without idealising your situation.'],
['Образ или слово','An image or a word','Если приятно, выберите безопасный будущий образ. Равноценная альтернатива — слово или обычный предмет.','Choose an optional safe future image, or a word or ordinary object instead.'],
['Отношение к себе','Respect for myself','В нейтральном сюжете выберите вариант ответа, сохраняющий уважение к себе и другому.','Choose a response that respects both people in a neutral story.'],
['Право на «не сейчас»','Permission to say “not now”','Попробуйте три ответа на небольшую просьбу: да, нет или не сейчас.','Practise three responses to a small request: yes, no or not now.'],
['Мои освоенные навыки','Skills I have tried','Посмотрите на одну действительно опробованную практику и назовите, чем она была удобна или неудобна.','Review one practice you actually tried and what suited you or did not.'],
['Не нужно знать всё заранее','I do not need every answer','В неопределённой ситуации выберите «пока не знаю» и одну возможную опору.','Choose “I do not know yet” and one possible support in an uncertain situation.'],
['Доброта и действие','Kindness and action','Объедините одну поддерживающую фразу, ресурс и небольшой возможный шаг.','Combine one kind phrase, one resource and an optional small step.'],
['Мой внутренний компас','My inner compass','Соберите карту: ценность → самоподдержка → отдых/помощь → возможное действие.','Make a map: value → self-support → rest/help → possible action.']
],
AS6:[
['Что хочу вернуть','What I want to reclaim','Выберите одну доступную сферу: обычные дела, отдых, отношения или интересы.','Choose one area: daily tasks, rest, connection or interests.'],
['Самый маленький шаг','The smallest step','Разделите одну цель на настолько маленькую часть, что её можно выбрать или отложить.','Break one goal into a tiny part you may choose or postpone.'],
['Реальные ограничения','Real-world limits','Отметьте один доступный ресурс и одно внешнее препятствие без самообвинения.','Identify one available resource and one external obstacle without self-blame.'],
['Нагрузка по силам','A manageable amount','Выберите формат действия: очень короткий, обычный или отдых вместо действия.','Choose a short, standard or rest-first option.'],
['Небольшое приятное занятие','A pleasant small activity','Выберите безопасный приятный эпизод дня, который не требует обязательного выполнения.','Choose a safe, pleasant activity without promising to do it.'],
['План по желанию','A plan only if wanted','Составьте необязательную карточку «Когда будет удобно, я могу попробовать…».','Make an optional “When it feels possible, I could try…” card.'],
['Баланс и отдых','Balance and rest','Соберите мягкий ритм: задача → пауза → следующий выбор.','Create a gentle rhythm: a task → a pause → another choice.'],
['Пересматриваю план','Adjusting my plan','В вымышленном дне неожиданно появляется дополнительное дело. Выберите, что упростить.','When an imaginary day gets busier, choose what to simplify.'],
['Сообщение без отправки','Drafting a message without sending','Составьте короткую дружелюбную фразу контакта. Ничего отправлять не требуется.','Write a friendly greeting; do not send it unless you choose to.'],
['Контакт и граница','Contact and boundaries','Для бытовой просьбы выберите форму отказа или просьбы о помощи.','Choose a kind refusal or request for help in an everyday scenario.'],
['Что от меня зависит','What I can influence','Разделите задачи на то, что можно изменить, и реальные ограничения среды.','Sort possibilities into what you can influence and what the environment limits.'],
['План Б','My backup plan','Упростите один выбранный шаг или замените его восстановлением.','Simplify a planned step or replace it with recovery.'],
['Проба без отметки успеха','Trying without grading','Если было возможно, отметьте реальную попытку, план или отказ — все варианты допустимы.','If possible, note whether you tried, planned or skipped a step; all are valid.'],
['Мой маршрут к делам','My path into daily life','Соберите карту: цель → доступное действие → отдых → возможная помощь.','Build a map: goal → doable action → rest → available help.']
],
}
export const OPORA_MODULE_DAY_COUNT=14
export function moduleLesson(base,moduleId,day,locale='en',routerVersion='') {
  if(moduleId==='AS2'||!items[moduleId])return base
  if(!base||!Number.isInteger(day)||day<1||day>14)return base
  const isFiveLevel=routerVersion==='opora-nav-2.0-20261014' && moduleId!=='AS6'
  const row=(isFiveLevel?fiveLevelLessonRow(moduleId,day):null)||items[moduleId][day-1]
  if(!row)return base
  const ru=locale==='ru',title=row[ru?0:1],practice=row[ru?2:3]
  const notice=ru
    ?'Учебный опыт, а не психотерапия. Можно пропустить, выбрать нейтральный объект или завершить практику.'
    :'A learning exercise, not psychotherapy. You may skip, choose a neutral object or stop.'
  const action=ru
    ?'По желанию отметьте один реальный выбор: попробовать, упростить, отдохнуть или пропустить.'
    :'If you like, choose one response: try, simplify, rest or skip.'
  const close=ru
    ?'Посмотрите вокруг и назовите один обычный предмет. Ничего не требуется чувствовать иначе.'
    :'Look around and name one ordinary object. No particular emotional change is required.'
  // NAV-2.0 owns the content of EVERY screen, not only the meditation.
  // Legacy NAV-1.3 users retain their previously authored text and lesson IDs.
  const quote=isFiveLevel?(ru
    ?'Я могу исследовать тему «'+title+'» в своём темпе. Даже пауза — допустимый выбор.'
    :'I can explore “'+title+'” at my own pace. Choosing a pause is valid too.'):base.aphorism
  const opening=isFiveLevel?(ru
    ?'Сегодняшняя тема — «'+title+'». Выберите удобный формат. Никаких трудных воспоминаний, обязательных ощущений или правильных ответов.'
    :'Today’s theme is “'+title+'”. Choose a comfortable format. No difficult memories, required feelings or right answers.'):notice
  const arrival=isFiveLevel?(ru
    ?'Оглядитесь и отметьте один нейтральный предмет или цвет. Можно только прочитать инструкцию или сразу отдохнуть. Затем решите, подходит ли вам тема «'+title+'».'
    :'Look around and notice one ordinary object or colour. Reading or resting is enough. Then decide whether “'+title+'” feels suitable today.'):null
  const transfer=isFiveLevel?(ru
    ?'В обычной безопасной ситуации мне может пригодиться «'+title+'». Я могу попробовать один маленький шаг позже, упростить его или не планировать ничего.'
    :'In an ordinary safe situation, “'+title+'” might be useful. I may try one small step later, simplify it or make no plan.'):practice
  const reflection=isFiveLevel?(ru
    ?'Что из упражнения «'+title+'» мне было доступно? Можно ответить «ничего», выбрать отдых или оставить ответ пустым.'
    :'What, if anything, felt accessible about “'+title+'”? “Nothing”, rest or a blank answer are all valid.'):
    (ru?'Что из этой практики было для меня допустимо?':'What felt workable for me in this practice?')
  const previous=isFiveLevel&&day>1?fiveLevelLessonRow(moduleId,day-1):null
  const priorTitle=previous?.[ru?0:1]||''
  const recall=isFiveLevel?(day===1
    ?(ru?'В первый день выберите одну доступную цель или решите просто познакомиться с практикой.':'On day one, choose a small goal or simply get acquainted with the practice.')
    :(ru?'Из предыдущего урока «'+priorTitle+'» вспомните один допустимый способ, или выберите подсказку и отдых.'
       :'From the previous lesson “'+priorTitle+'”, recall one workable option, or choose a hint or rest.')):null
  const mainSections=(base.sections||[]).map(s=>
    s.kind==='arrive'&&arrival?{...s,text:arrival}:
    s.kind==='learn'?{...s,text:opening}:
    s.kind==='meditation'?{...s,title,text:practice}:
    s.kind==='ritual'?{...s,text:action}:
    s.kind==='finish'?{...s,text:close}:s)
  const id='hh-opora-'+moduleId.toLowerCase()+'-'+String(day).padStart(2,'0')+'-'+base.version+(isFiveLevel?'-'+OPORA_FIVE_LEVEL_CONTENT_VERSION:'')
  return {...base,id,title,source:'Holistic House OPORA educational modules · '+(isFiveLevel?OPORA_FIVE_LEVEL_CONTENT_VERSION:OPORA_MODULE_LESSON_VERSION),
    moduleId,moduleDay:day,sections:mainSections,ritual:action,
    ...(isFiveLevel?{
      aphorism:quote,reflection,
      oporaModule:{
        id:moduleId,day,version:routerVersion,theme:title,practice,
        learningOutcome:ru?'Замечаю доступный выбор и могу остановиться без оценки успеха.':
          'I notice an available choice and may stop without grading my progress.',
      },
    }:{}),
    reflection,
    workbook:{...base.workbook,skill:title,question:reflection,
      microPractice:transfer,workingPosition:isFiveLevel?quote:action,
      takeaway:isFiveLevel?(ru?'Мой итог — реальный посильный выбор, а не обещание улучшения.':
        'My result is one realistic choice, not a promise that my feelings improve.'):
        (ru?'Мой выбор сегодня может быть маленьким.':'A small choice is enough today.')},
    journey:{...base.journey,heading:title,purpose:practice,outcome:isFiveLevel?reflection:action},
    ...(base.practiceV3?{practiceV3:{...base.practiceV3,
      ...(isFiveLevel?{recall}:{}),
      microAction:transfer,review:reflection}}:{}),
    ...(base.practiceV4?{practiceV4:{...base.practiceV4,symbol:title,
      invitation:practice,withoutImagery:notice,artifact:action}}:{}),
    disclaimer:ru?'Самостоятельная образовательная антистресс-практика, не лечение ПТСР или иной травмы.':
      'Self-guided Anti-Stress education; not PTSD or trauma treatment.',
  }
}
export const moduleCurriculumComplete=()=>fiveLevelContentComplete() && Object.values(items).length===5 &&
  Object.values(items).every(days=>days.length===14&&days.every(row=>row.length===4&&row.every((t,i)=>typeof t==='string'&&t.length>(i<2?2:12))))

 // A summary for the chosen module; used on the personal 14-day map, not
 // for computing progress or scoring any psychological symptom.
 export function moduleDayMeta(moduleId,day,locale='en',routerVersion=''){
  if(moduleId==='AS2'||!items[moduleId]||!Number.isInteger(day)||day<1||day>14)return null
  const row=(routerVersion==='opora-nav-2.0-20261014'&&moduleId!=='AS6'
   ?fiveLevelLessonRow(moduleId,day):null)||items[moduleId][day-1]
  const ru=locale==='ru'
  return {title:row[ru?0:1],exercise:row[ru?2:3]}
 }

/** Read-only version-pinned lesson titles for legacy and current route previews. */
export function moduleDayOutline(moduleId,locale='en',routerVersion=null) {
 if(moduleId==='AS2'||!items[moduleId])return []
 return Array.from({length:14},(_,i)=>{
  const row=moduleDayMeta(moduleId,i+1,locale,routerVersion)
  return row?{day:i+1,title:row.title,practice:row.exercise}:null
 }).filter(Boolean)
}
