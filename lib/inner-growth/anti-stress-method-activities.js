// OPORA Anti-Stress · educational interactive activity for days 2–14.
// All choices are original, neutral, bounded strings. No trauma exposure,
// automated diagnosis, user free text or claims that clicking = skill mastery.
import { antiStressDay } from './anti-stress-outcomes-v3.js'
import { antistressInteractiveDay } from './anti-stress-interactive-catalog.js'

const tr=(en,ru)=>Object.freeze({en,ru})
const option=(value,en,ru)=>Object.freeze({value,label:tr(en,ru)})
export const ANTI_STRESS_METHOD_ACTIVITIES=Object.freeze([
  {day:2,kind:'switch_attention',prompt:tr('Look at a neutral detail. Which gentle shift of attention would you like to try?','Посмотрите на нейтральную деталь. Как вам удобно переключить внимание?'),
    choices:[option('first','Stay with the first detail','Остаться с первой деталью'),option('second','Notice a different ordinary detail','Заметить другую обычную деталь'),option('back','Return to the first one','Вернуться к первой'),option('rest','Rest or stop','Отдохнуть или остановиться')]},
  {day:3,kind:'signal_story',prompt:tr('In a fictional busy day with several incoming messages, what might be an early sign of overload?','В вымышленном дне пришло сразу несколько сообщений. Что может быть ранним сигналом перегрузки?'),
    choices:[option('rushing','Thoughts speed up','Мысли ускоряются'),option('scattered','Attention scatters','Внимание рассеивается'),option('tired','Tiredness appears','Появляется усталость'),option('unsure','Not sure / no sign','Не знаю / ничего')]},
  {day:4,kind:'stress_branch',prompt:tr('Imagine a busy day, or a day with very little energy. Which support would fit best?','Представьте день с множеством дел или день без сил. Какой вид поддержки сейчас ближе?'),
    choices:[option('simplify','Reduce one manageable demand','Сократить одно необязательное требование'),option('rest','Pause and rest','Сделать паузу и отдохнуть'),option('help','Ask for practical help','Попросить практической помощи'),option('unsure','No choice yet','Пока не выбирать')]},
  {day:5,kind:'body_opt_in',prompt:tr('Choose a gentle, optional micro-practice. No forced breathing or movement.','Выберите одну небольшую необязательную практику. Без изменения дыхания и обязательных движений.'),
    choices:[option('object','Notice a visible object','Посмотреть на видимый предмет'),option('posture','Adjust posture only if comfortable','Немного изменить положение, если удобно'),option('surface','Notice your support surface','При желании заметить опорную поверхность'),option('rest','Remain still or rest','Остаться неподвижно или отдохнуть')]},
  {day:6,kind:'pace_picker',prompt:tr('Which duration or amount of support feels manageable? A timer is never compulsory.','Какая длительность или поддержка сейчас посильна? Таймер необязателен.'),
    choices:[option('short','A very short pause','Совсем короткая пауза'),option('minute','About a minute','Около минуты'),option('longer','A little longer if it fits','Чуть дольше, если подходит'),option('stop','Stop or rest now','Остановиться или отдохнуть')]},
  {day:7,kind:'support_map',prompt:tr('Which real source of support is available to you, if any?','Что из реальной поддержки вам действительно доступно, если что-то есть?'),
    choices:[option('place','A familiar place or object','Знакомое место или предмет'),option('rest','An opportunity to rest','Возможность отдохнуть'),option('human','A safe person or service','Безопасный человек или служба'),option('none','Nothing suitable right now','Пока ничего доступного')]},
  {day:8,kind:'restorative_scene',prompt:tr('How would you prefer to explore a resource, without using painful memories?','Как вам удобнее исследовать ресурс без обращения к болезненным воспоминаниям?'),
    choices:[option('scene','An ordinary future rest scene','Обычная будущая сцена отдыха'),option('picture','Observe details of a photo','Рассмотреть детали фотографии'),option('words','Use a simple word','Использовать простое слово'),option('rest','No imagery, just rest','Без образов, просто отдых')]},
  {day:9,kind:'gentle_choice',prompt:tr('A fictional unanswered message brings a worrying prediction. What could you choose?','В вымышленном сюжете нет ответа на сообщение, появилась тревожная догадка. Что можно выбрать?'),
    choices:[option('notice','Notice “I am having a thought”','Заметить «У меня появилась мысль»'),option('fact','Name what is actually known','Назвать действительно известный факт'),option('object','Look at a neutral object','Посмотреть на нейтральный предмет'),option('skip','No thought exercise now','Пока без работы с мыслями')]},
  {day:10,kind:'fact_guess',prompt:tr('A reply has not arrived. What is definitely known in this fictional example?','Ответ на сообщение не пришёл. Что точно известно в этом вымышленном примере?'),
    choices:[option('fact','There has not been a reply yet','Ответ пока не получен'),option('assumption','Something bad must have happened','Наверняка случилось плохое'),option('unknown','We know the reason for the delay','Причина задержки нам известна'),option('neutral','I prefer a neutral anchor','Предпочитаю нейтральную опору')]},
  {day:11,kind:'phrase_builder',prompt:tr('In an ordinary safe situation, which respectful phrase might you rehearse?','В обычной безопасной ситуации какую уважительную фразу можно попробовать?'),
    choices:[option('time','I need a moment to think','Мне нужно немного времени подумать'),option('later','I will respond later','Я отвечу позже'),option('limit','I cannot take this on right now','Сейчас я не могу это взять на себя'),option('rest','No phrase, just rest','Без фразы, просто отдых')]},
  {day:12,kind:'help_request',prompt:tr('Which kind of support or small request might be realistic, without sharing names?','Какой вид помощи или просьбы может быть реалистичным, без указания имён и контактов?'),
    choices:[option('talk','Ask someone safe for a short conversation','Попросить безопасного человека о коротком разговоре'),option('task','Ask for help with one task','Попросить помочь с одним делом'),option('professional','Look for qualified local support','Обратиться к квалифицированной помощи'),option('none','No safe support is available now','Сейчас доступной помощи нет')]},
  {day:13,kind:'situation_match',prompt:tr('After a full day with little energy, which familiar support might fit?','После насыщенного дня с небольшим запасом сил какая знакомая опора может подойти?'),
    choices:[option('rest','A brief rest','Короткий отдых'),option('simplify','Simplify one nonessential task','Упростить необязательное дело'),option('object','Look at a neutral detail','Посмотреть на нейтральную деталь'),option('hint','I prefer a hint or no choice','Нужна подсказка или не хочу выбирать')]},
  {day:14,kind:'toolkit_builder',prompt:tr('Which familiar option would you put first on your personal support card?','Какой знакомый способ вы бы поставили первым в свою карту опоры?'),
    choices:[option('anchor','A neutral visible anchor','Нейтральный внешний ориентир'),option('pause','A comfortable pause','Комфортная пауза'),option('help','A safe person or practical support','Безопасный человек или практическая помощь'),option('none','No option feels right yet','Пока ни один вариант не подходит')]},
].map(item=>Object.freeze({...item,choices:Object.freeze(item.choices)})))

export function antiStressMethodActivity(day,locale='en'){
  const source=ANTI_STRESS_METHOD_ACTIVITIES.find(item=>item.day===day)
  if(!source)return null
  const lang=locale==='ru'?'ru':'en'
  const editorial=antistressInteractiveDay(day,lang)
  const canonical=antiStressDay(day,lang)
  return {
    day:source.day,kind:source.kind,skillId:canonical.skillId,skill:canonical.skill,
    title:canonical.title,prompt:source.prompt[lang],
    choices:source.choices.map(c=>({value:c.value,label:c.label[lang]})),
    expected:editorial?.expectedResponse||'',
    safeText:canonical.neutral,
    actionText:canonical.action
  }
}
export function validateAntiStressMethodChoice(day,value,routeActivity=null){
  if(value===undefined||value===null||value==='')return null
  if(typeof value!=='string'||value.length>30)throw new Error('INVALID_OPORA_METHOD_CHOICE')
  const source=routeActivity||ANTI_STRESS_METHOD_ACTIVITIES.find(item=>item.day===day)
  if(!source||!source.choices.some(c=>c.value===value))throw new Error('INVALID_OPORA_METHOD_CHOICE')
  return value
}
