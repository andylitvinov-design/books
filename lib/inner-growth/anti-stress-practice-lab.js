// ОПОРА 1.5 — guided, voluntary educational experiences for days 2–14.
// These are original prompts, not trauma processing, assessment results or treatment.
// Only bounded option IDs go into account-owned session signals. Creative words are
// local until the participant explicitly copies them into the encrypted journal.
import { antistressInteractiveDay } from './anti-stress-interactive-catalog.js'

const t=(ru,en)=>Object.freeze({ru,en})
const o=(id,ru,en)=>Object.freeze({id,label:t(ru,en)})
const lab=(method,title,instruction,step1,step2,options,format='choices')=>
  Object.freeze({method,title,instruction,steps:Object.freeze([step1,step2]),
    options:Object.freeze(options),format})

export const DAILY_PRACTICAL_LABS = Object.freeze({
  2:Object.freeze({
    main:lab('switch_attention',t('Две спокойные детали','Two ordinary details'),
      t('Выберите два безопасных предмета вокруг себя. Не нужно напрягать взгляд или добиваться концентрации.','Choose two neutral objects around you. There is no need to strain or force concentration.'),
      t('Мягко посмотрите на один предмет. Отметьте его цвет или контур.','Look gently at one item and notice its colour or outline.'),
      t('Если удобно, переведите внимание на другой. Можно возвращаться в своём темпе.','If comfortable, shift your attention to the other. Switch at your own pace.'),
      [o('switched','Перевёл(а) внимание','I switched attention'),o('one','Остался(ась) с одним предметом','I stayed with one'),o('rest','Предпочёл(ла) отдых','I chose rest'),o('skip','Не пробовал(а)','I did not try')]),
    reflect:lab('retrieval_try',t('Смогу ли повторить?','Could I try it again?'),
      t('Без проверки правильности выберите, что помогло бы вспомнить приём.','Without being graded, choose what might help you recall this option.'),
      t('Посмотрите на предмет рядом. Вспомните, как вы выбрали фокус.','Look at a nearby object. Recall how you chose your focus.'),
      t('Можно выбрать подсказку или признать, что сейчас не хочется.','You may choose a hint, or decide this is not the right moment.'),
      [o('independent','Попробовал(а) самостоятельно','I tried independently'),o('hint','С подсказкой','With a hint'),o('later','Позже','Maybe later'),o('skip','Пропустить','Skip')])
  }),
  3:Object.freeze({
    main:lab('signal_story',t('Один ранний сигнал','One early sign'),
      t('Представьте обычную ситуацию: пришло несколько уведомлений. Не вспоминайте неприятные личные события.','Imagine an ordinary situation: several messages arrive. You do not need to revisit a distressing memory.'),
      t('Прочитайте бытовой пример и заметьте, какой ранний сигнал в нём мог бы появиться.','Read the ordinary example and notice which early signal could appear in it.'),
      t('Выберите только один возможный признак. Ответ «не знаю» подходит.','Choose just one possible early sign. “Not sure” is a valid response.'),
      [o('thoughts','Мысли ускоряются','Thoughts speed up'),o('attention','Внимание сужается','Attention narrows'),o('tension','Появляется напряжение','Tension appears'),o('unsure','Пока не знаю','Not sure')]),
    reflect:lab('visual_scan',t('Вернуться в настоящее','Return to the present'),
      t('После примера можно выбрать простую внешнюю опору.','After the example, you may choose one external anchor.'),
      t('Осмотритесь с открытыми глазами.','Look around with your eyes open.'),
      t('Назовите про себя одну обычную деталь или просто отдохните.','Quietly name one ordinary detail, or simply rest.'),
      [o('colour','Цвет','A colour'),o('shape','Форма','A shape'),o('sound','Нейтральный звук','A neutral sound'),o('rest','Отдых','Rest')])
  }),
  4:Object.freeze({
    main:lab('stress_branch',t('Давление или усталость?','Pressure or tiredness?'),
      t('Два бытовых примера: в одном слишком много задач, в другом мало сил. Это не тест нервной системы.','Two everyday examples: in one there are too many tasks, in another little energy. This does not assess the nervous system.'),
      t('Представьте переполненный список дел. Что было бы мягче: одна пауза или уменьшение списка?','Imagine a crowded to-do list. Would a pause or reducing one demand be gentler?'),
      t('Теперь представьте усталость. Возможно, нужнее отдых. Выберите то, что ближе.','Now imagine tiredness. Rest may fit better. Choose what seems accessible.'),
      [o('pause','Пауза при перегрузке','A pause for overload'),o('reduce','Упростить требование','Reduce a demand'),o('rest','Отдых при усталости','Rest for tiredness'),o('unsure','Сложно выбрать','Not sure')]),
    reflect:lab('support_map',t('Какая помощь доступна?','What support is accessible?'),
      t('Опора может быть внешней — не только «силой воли».','Support can be external; it is not only willpower.'),
      t('Посмотрите, что реально есть рядом, без необходимости сообщать личные данные.','Notice what may actually be available without sharing private details.'),
      t('Выберите один вариант или признайте, что сейчас он недоступен.','Choose one option, or acknowledge that none feels available right now.'),
      [o('place','Спокойное место','A quieter place'),o('object','Нейтральный предмет','A neutral object'),o('human','Помощь человека','Help from a person'),o('none','Пока ничего','Nothing right now')])
  }),
  5:Object.freeze({
    main:lab('body_opt_in',t('Микродвижение или внешний ориентир','Tiny movement or an external anchor'),
      t('Можно попробовать одно безболезненное движение, но тело не нужно заставлять.','You may try a tiny pain-free movement; no need to force anything in your body.'),
      t('Если комфортно, мягко пошевелите пальцами или поверните голову на небольшой угол.','If comfortable, gently move your fingers or turn your head slightly.'),
      t('Остановитесь при неудобстве. Можно вместо этого просто посмотреть на обычный предмет.','Stop if uncomfortable. You may instead look at an ordinary object.'),
      [o('fingers','Пошевелить пальцами','Move my fingers'),o('head','Плавно повернуть голову','Turn my head slightly'),o('look','Посмотреть вокруг','Look around'),o('rest','Только отдых','Rest only')]),
    reflect:lab('gentle_transition',t('Закончить в своём ритме','Finish at your own pace'),
      t('Решение об окончании — тоже навык выбора.','Choosing when to stop is a skill too.'),
      t('Заметив удобный момент, верните внимание к окружению.','When it suits you, return your attention to the surroundings.'),
      t('Выберите доступное завершение без требования расслабиться.','Choose an accessible ending without needing to feel relaxed.'),
      [o('stop','Закончить','Finish'),o('short','Сократить в следующий раз','Try a shorter version next time'),o('neutral','Без движения','Without movement'),o('skip','Пропустить','Skip')])
  }),
  6:Object.freeze({
    main:lab('pace_picker',t('Уменьшить нагрузку — это выбор','Adjusting the effort is a choice'),
      t('Необязательно выдерживать «полную норму». Сравните короткую версию и отдых.','You do not have to complete a prescribed amount. Consider a short version and rest.'),
      t('Выберите, какое количество практики реально посильно сегодня.','Choose the amount of practice that genuinely feels available today.'),
      t('Разрешите себе прекратить без оценки результата.','Allow yourself to stop without grading the outcome.'),
      [o('short','Короткая пауза','A short pause'),o('standard','Обычный темп','My usual pace'),o('rest','Отдых вместо упражнения','Rest instead'),o('skip','Не выбирать','No choice today')]),
    reflect:lab('if_then_card',t('Подсказка на обычный день','A cue for an ordinary day'),
      t('Не нужно всё время наблюдать за тревогой. Подойдёт обычное событие.','No need to track anxiety all day. An ordinary event may be enough.'),
      t('Представьте, что закончили обычное дело.','Imagine you have just finished an everyday task.'),
      t('Выберите, какой маленький ответ мог бы быть доступен, без обязательства выполнить его.','Choose an optional small response without a commitment to do it.'),
      [o('look','Посмотреть на предмет','Look at an object'),o('pause','Короткая пауза','Take a short pause'),o('rest','Отдохнуть','Rest'),o('none','Не планировать','No plan')])
  }),
  7:Object.freeze({
    main:lab('support_map',t('Моя карта реальных опор','My map of accessible support'),
      t('Выберите то, что действительно может быть доступно вам, а не идеальную картину.','Choose what might really be accessible, not an ideal picture.'),
      t('Мысленно осмотрите обычные ресурсы вокруг себя.','Consider ordinary supports around you.'),
      t('Можно честно выбрать «пока ничего».','It is fine to say “nothing available right now”.'),
      [o('place','Место, где удобнее','A more comfortable place'),o('object','Нейтральный предмет','A neutral object'),o('person','Человек, к которому можно обратиться','A person I could ask'),o('none','Пока нет опоры','Nothing available')]),
    reflect:lab('comfort_adjust',t('Оставить, упростить или заменить','Keep, simplify or replace'),
      t('Рассмотрите один знакомый способ без экзамена на улучшение.','Review one familiar option without testing yourself for improvement.'),
      t('Вспомните, был ли он посильным.','Recall whether it was manageable for you.'),
      t('Выберите настройку лишь по желанию; окончательный выбор останется за вами.','Choose an adjustment only if you wish; it stays your decision.'),
      [o('keep','Оставить','Keep'),o('simplify','Упростить','Simplify'),o('neutral','Нейтральный вариант','A neutral option'),o('skip','Пока не решать','Not decide yet')])
  }),
  8:Object.freeze({
    main:lab('restorative_scene',t('Ресурсный образ или реальный предмет','A supportive image or a real object'),
      t('Представлять что-либо необязательно. Можно взять обычный предмет или слово.','Imagery is optional. An ordinary object or word is equally valid.'),
      t('Посмотрите на спокойную деталь вокруг или представьте доброжелательную нейтральную сцену, если хочется.','Look at a neutral detail around you or imagine a supportive ordinary scene if you wish.'),
      t('Выберите форму, которая вам удобнее, не заставляя себя почувствовать что-то особенное.','Choose the version that suits you, without forcing a special feeling.'),
      [o('object','Реальный предмет','A real object'),o('word','Одно слово','One word'),o('scene','Нейтральный образ','A neutral image'),o('rest','Отдых','Rest')]),
    reflect:lab('creative_words',t('Пять слов и пять качеств','Five words and five qualities'),
      t('Творческая практика ассоциаций. Она не оценивает личность и не расшифровывается системой.','A creative association exercise. It does not assess personality and will not be interpreted by the app.'),
      t('Если хочется, назовите пять обычных деталей изображения или окружающей комнаты.','If you wish, name five ordinary details in the image or room.'),
      t('К каждому слову добавьте одно нейтральное качество. Сохраняйте только по собственному выбору.','Add one neutral quality to each word. Save only if you explicitly choose to.'),
      [o('words','Попробовать ассоциации','Try the associations'),o('look','Только посмотреть вокруг','Only look around'),o('rest','Отдохнуть','Rest'),o('skip','Пропустить','Skip')],'associations')
  }),
  9:Object.freeze({
    main:lab('gentle_choice',t('Как обращаться с тревожной мыслью','How to relate to a worried thought'),
      t('Нейтральный пример: «Если я отвечу не сразу, произойдёт плохое». Это мысль, а не установленный факт.','Neutral example: “If I do not reply immediately, something bad will happen.” This is a thought, not an established fact.'),
      t('Назовите её именно мыслью, не споря и не соглашаясь автоматически.','Name it as a thought without needing to argue or agree.'),
      t('Выберите один мягкий путь обращения с ней.','Choose one gentle way of relating to it.'),
      [o('check','Проверить факты','Check the facts'),o('notice','Просто заметить мысль','Notice the thought'),o('ground','Найти внешний ориентир','Use an external anchor'),o('skip','Не разбирать','Not analyse it')]),
    reflect:lab('fact_guess',t('Факт или догадка?','Fact or assumption?'),
      t('Вымышленная ситуация: «Сообщение пришло в 9:00» и «От меня ждут ответа немедленно».','Fictional situation: “The message arrived at 9:00” and “I must reply immediately”.'),
      t('Заметьте: одно утверждение наблюдаемо, другое — предположение.','Notice that one statement is observable while the other is an assumption.'),
      t('Выберите, какое утверждение звучит как догадка. Можно запросить подсказку или пропустить.','Choose which one sounds like an assumption. You can ask for a hint or skip.'),
      [o('must','От меня ждут ответа немедленно','I must reply immediately'),o('time','Сообщение пришло в 9:00','The message arrived at 9:00'),o('unsure','Не уверен(а)','Not sure'),o('skip','Пропустить','Skip')])
  }),
  10:Object.freeze({
    main:lab('fact_guess',t('Заметить, что известно','Notice what is actually known'),
      t('Вымышленный пример: «Я не завершил задачу к 17:00» и «Значит, я ни на что не способен».','Fictional example: “I did not finish a task by 5pm” and “That means I am incapable of anything”.'),
      t('Назовите одно наблюдение, которое можно проверить.','Identify one observation that could be checked.'),
      t('Остальные мысли пока не обязательно оспаривать; при желании вернитесь к простой опоре.','You do not need to dispute other thoughts; return to a simple anchor if preferred.'),
      [o('fact','Задача пока не завершена','The task is not finished'),o('judgment','Я ни на что не способен','I am incapable'),o('ground','Предпочту опору','I prefer grounding'),o('skip','Пропустить','Skip')]),
    reflect:lab('if_then_card',t('Один необязательный следующий шаг','One optional next step'),
      t('Это только план, а не доказательство действия в реальном мире.','This is only a plan, not evidence of a real-world action.'),
      t('Подумайте о простом внешнем сигнале: например, окончание работы.','Consider a simple external cue, such as finishing work.'),
      t('Можно выбрать короткую опору или ничего не планировать.','Choose a short support or decide not to make a plan.'),
      [o('pause','Сделать паузу','Take a pause'),o('rest','Отдохнуть','Rest'),o('ask','Попросить помощи','Ask for help'),o('none','Без плана','No plan')])
  }),
  11:Object.freeze({
    main:lab('phrase_builder',t('Уважительная граница без конфликта','A respectful boundary without confrontation'),
      t('Представьте безопасную бытовую просьбу. Не нужно никому отвечать или отправлять сообщение.','Imagine a harmless everyday request. No need to respond to or message anyone.'),
      t('Попробуйте произнести про себя одну мягкую фразу.','Try saying one kind phrase to yourself.'),
      t('Выберите формулировку, которая звучит убедительно для вас.','Choose wording that sounds believable to you.'),
      [o('time','Мне нужно немного времени','I need a little time'),o('later','Отвечу позже','I will reply later'),o('no','Сегодня не смогу','I cannot today'),o('rest','Не произносить','I prefer not to say it')]),
    reflect:lab('retrieval_try',t('Какая фраза осталась со мной','Which phrase could I recall?'),
      t('Вспоминание можно попробовать с подсказкой или без. Это не экзамен.','Recall is optional, with or without a hint. This is not a test.'),
      t('На мгновение уберите взгляд от вариантов и вспомните одно выражение.','Look away from the options briefly and remember one expression.'),
      t('Если не получается, подсказка или отдых полностью подходят.','If nothing comes to mind, a hint or rest is acceptable.'),
      [o('own','Вспомнил(а) сам(а)','Recalled it myself'),o('hint','С подсказкой','With a hint'),o('rest','Отдохну','I will rest'),o('skip','Пропустить','Skip')])
  }),
  12:Object.freeze({
    main:lab('help_request',t('Небольшая просьба о поддержке','A small request for support'),
      t('Никого не нужно называть, находить или писать ему. Работаем только с типом просьбы.','No need to name, find or contact anyone. Choose only the kind of request.'),
      t('Представьте безобидную ситуацию, где помощь была бы полезна.','Imagine an ordinary situation where support might help.'),
      t('Попробуйте выбрать уважительную просьбу, если она доступна.','Try choosing a respectful request if one feels accessible.'),
      [o('clarity','Попросить объяснить понятнее','Ask for clearer instructions'),o('time','Попросить больше времени','Ask for more time'),o('company','Попросить побыть рядом','Ask someone to stay nearby'),o('none','Пока не могу просить','Not available right now')]),
    reflect:lab('support_map',t('Не только люди могут быть опорой','Support can come from more than people'),
      t('Если человеческая поддержка сейчас недоступна, это не личная неудача.','If human support is unavailable, that is not a personal failure.'),
      t('Заметьте один нейтральный источник удобства рядом.','Notice one ordinary source of comfort nearby.'),
      t('Выберите только то, что действительно есть; ничего придумывать не нужно.','Choose only what really exists; no need to invent resources.'),
      [o('place','Удобное место','A comfortable place'),o('object','Обычный предмет','An ordinary object'),o('rest','Отдых','Rest'),o('none','Сейчас ничего','Nothing right now')])
  }),
  13:Object.freeze({
    main:lab('situation_match',t('Подобрать опору к ситуации','Match support to a situation'),
      t('Бытовой пример: закончился трудный рабочий разговор, впереди ещё одно дело.','Ordinary example: a tiring conversation has ended, and another task awaits.'),
      t('Отметьте, какие способы поддержки уже знакомы вам из курса.','Recall supports that have already appeared in this course.'),
      t('Выберите приемлемый вариант. Подсказку всегда можно посмотреть.','Choose an acceptable option. A hint is always available.'),
      [o('pause','Короткая пауза','A short pause'),o('object','Предмет-ориентир','An object to look at'),o('phrase','Поддерживающая фраза','A supportive phrase'),o('rest','Отдых','Rest')]),
    reflect:lab('retrieval_try',t('Самостоятельно или с подсказкой','On my own or with a hint'),
      t('Самостоятельность — не требование. Человек может возвращаться к инструкции сколько нужно.','Independence is not a requirement. You may return to instructions as often as needed.'),
      t('Попробуйте мысленно назвать один прежний способ.','Try recalling one previously used support.'),
      t('При желании верните подсказку или закончите без ответа.','Restore the hint if you wish, or finish without answering.'),
      [o('own','Самостоятельно','On my own'),o('hint','С подсказкой','With a hint'),o('rest','Нужен отдых','Need rest'),o('skip','Пропустить','Skip')])
  }),
  14:Object.freeze({
    main:lab('toolkit_builder',t('Одна моя реальная опора','One support I can really use'),
      t('Выберите то, что действительно пробовали либо хотите сохранить. Не нужно составлять идеальный план.','Choose what you actually tried or want to keep. No need to create an ideal plan.'),
      t('Вспомните одну удобную практику из предыдущих занятий.','Recall one manageable practice from earlier lessons.'),
      t('Выберите первый ресурс. Можно оставить карточку незаполненной.','Choose your first resource. An empty card is also acceptable.'),
      [o('attention','Зрительная ориентировка','Visual orientation'),o('rest','Отдых','Rest'),o('phrase','Бережная фраза','A kind phrase'),o('support','Помощь человека','Human support'),o('none','Пока ничего','Nothing yet')]),
    reflect:lab('situation_match',t('Запасной путь','A backup option'),
      t('Если первый способ неудобен, можно выбрать более мягкий запасной.','If the first option does not fit, choose a gentler backup.'),
      t('Представьте простой день с небольшой усталостью.','Imagine an ordinary day with some tiredness.'),
      t('Выберите запасной ресурс — это не обязательство его использовать.','Choose a backup resource, not a commitment to use it.'),
      [o('pause','Небольшая пауза','A brief pause'),o('rest','Отдых','Rest'),o('object','Предмет-ориентир','A neutral object'),o('person','Обращение за помощью','Ask for help'),o('none','Без запасного','No backup')])
  }),
})

const lang=(locale)=>locale==='ru'?'ru':'en'
const read=(value,locale)=>value?.[lang(locale)]||''
const translateLab=(item,locale)=>item?{
  method:item.method,format:item.format,title:read(item.title,locale),
  instruction:read(item.instruction,locale),steps:item.steps.map(s=>read(s,locale)),
  options:item.options.map(opt=>({id:opt.id,label:read(opt.label,locale)})),
}:null

export function antiStressLabFor(day,locale='en'){
  const plan=DAILY_PRACTICAL_LABS[day],catalog=antistressInteractiveDay(day,locale)
  if(!plan||!catalog)return null
  return {day,skillId:catalog.skill,skillTitle:catalog.title,
    expectedResponse:catalog.expectedResponse,main:translateLab(plan.main,locale),
    reflect:translateLab(plan.reflect,locale)}
}
const attemptOptions=new Set(['tried','partly','stopped','skip'])
export function validateAntiStressLabAnswers(raw,day,routePlan=null){
  if(raw===undefined||raw===null)return null
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!(routePlan||DAILY_PRACTICAL_LABS[day]))
    throw new Error('INVALID_PRACTICE_LAB')
  const plan=routePlan||DAILY_PRACTICAL_LABS[day],out={}
  for(const [key,value] of Object.entries(raw)){
    if(!['main','reflect','attempt'].includes(key)||typeof value!=='string')
      throw new Error('INVALID_PRACTICE_LAB')
    const allowed=key==='attempt'?attemptOptions:
      new Set(plan[key].options.map(o=>o.id))
    if(!allowed.has(value))throw new Error('INVALID_PRACTICE_LAB')
    out[key]=value
  }
  return out
}
export function antiStressLabChoiceLabel(day,part,id,locale='en'){
  const card=antiStressLabFor(day,locale)?.[part]
  return card?.options.find(option=>option.id===id)?.label||null
}
