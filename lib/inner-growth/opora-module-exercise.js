// OPORA NAV-2.0: one varied, optional interaction on each of 14 days.
// Authorial educational activities. No PTSD exposure, clinical scoring or diagnoses.
// Text input, when volunteered, belongs only in the account-encrypted reflection.
import {fiveLevelLessonRow} from './antistress-module-lessons-v2.js'
import {moduleDayMeta} from './antistress-module-lessons.js'

const tr=(ru,en)=>({ru,en})
const choice=(id,ru,en)=>({id,label:tr(ru,en)})
const activity=(kind,question,options)=>({kind,question,options})
export const OPORA_MODULE_ACTIVITY_PLAN=Object.freeze([
  activity('photo',tr('Как начать знакомство с темой?','How would you like to begin?'),[
    choice('object','Найти на фото обычный предмет','Find an ordinary object in the photo'),
    choice('colour','Отметить спокойный цвет','Notice a neutral colour'),
    choice('text','Только прочитать','Read only'),choice('skip','Не сегодня','Not today')]),
  activity('pace',tr('Сколько внимания вы готовы уделить практике?','What amount of attention feels workable?'),[
    choice('brief','Одно короткое наблюдение','One brief observation'),
    choice('slow','Не спешить','Go slowly'),choice('read','Прочитать без выполнения','Read without trying'),
    choice('skip','Отдых','Rest')]),
  activity('early-signal',tr('В обычном учебном примере что можно заметить первым?','In a fictional daily situation, what might be noticed first?'),[
    choice('hurry','Спешка','Rushing'),choice('tired','Усталость','Tiredness'),
    choice('attention','Рассеянное внимание','Scattered attention'),choice('skip','Не знаю','Not sure')]),
  activity('load-branch',tr('Какой безопасный выбор уменьшит требования?','Which safe choice could reduce demands?'),[
    choice('simplify','Упростить одну задачу','Simplify a task'),
    choice('pause','Остановиться на минуту','Pause for a moment'),
    choice('help','Найти доступную помощь','Look for available help'),choice('skip','Не выбирать','No choice yet')]),
  activity('sensory',tr('Какой вид мягкой ориентировки вам подходит?','Which gentle orientation would you prefer?'),[
    choice('visual','Посмотреть на два цвета','Notice two colours'),
    choice('surface','Если удобно, почувствовать опору','Feel the chair or floor if comfortable'),
    choice('still','Оставаться неподвижно','Stay still'),choice('skip','Пропустить','Skip')]),
  activity('duration',tr('Как вы можете управлять интенсивностью?','How might you control intensity?'),[
    choice('ten','Десять секунд','Ten seconds'),choice('thirty','Тридцать секунд','Thirty seconds'),
    choice('free','Без таймера','No timer'),choice('skip','Пауза вместо практики','Rest instead')]),
  activity('resource-map',tr('Какую реальную опору можно назвать?','What kind of real support is available?'),[
    choice('place','Предмет или место','An object or place'),
    choice('human','Безопасный человек','A safe person'),choice('rest','Отдых','Rest'),
    choice('skip','Пока ничего подходящего','Nothing suitable yet')]),
  activity('associations',tr('Какая форма творческого упражнения безопаснее?','Which creative option feels safest?'),[
    choice('words','До пяти ассоциаций к фото','Up to five photo associations'),
    choice('qualities','Замечать качества предметов','Notice visible qualities'),
    choice('look','Только рассматривать','Just look'),choice('skip','Без творческого задания','Skip creative work')]),
  activity('reactions',tr('С какой частью привычной реакции начнём?','Which part of an ordinary reaction could you notice?'),[
    choice('event','Что случилось в примере','What happened in the scenario'),
    choice('thought','Какая появилась мысль','The thought that arose'),
    choice('choice','Какой появился выбор','The available choice'),choice('skip','Пауза','Pause')]),
  activity('facts',tr('Что поможет не делать поспешных выводов?','What helps avoid a rushed conclusion?'),[
    choice('fact','Назвать известный факт','Name a known fact'),
    choice('guess','Отметить предположение','Notice an assumption'),
    choice('anchor','Вернуться к нейтральному предмету','Return to an ordinary object'),choice('skip','Пропустить','Skip')]),
  activity('boundary',tr('Какую фразу границы можно просто обдумать?','Which boundary phrase could you consider?'),[
    choice('time','Мне нужно время','I need some time'),
    choice('later','Я отвечу позже','I can reply later'),
    choice('no','Сегодня я не могу','Not today'),
    choice('skip','Без фразы','No phrase')]),
  activity('support',tr('Как можно попросить о поддержке без раскрытия личных данных?','What is one way to seek support without sharing private details here?'),[
    choice('talk','Поговорить с безопасным человеком','Speak to a safe person'),
    choice('task','Попросить помощи с делом','Ask for help with a task'),
    choice('specialist','Рассмотреть помощь специалиста','Consider qualified support'),
    choice('skip','Сейчас ничего не подходит','Nothing fits right now')]),
  activity('rehearsal',tr('Как закрепить навык без оценки успеха?','How can you revisit a skill without grading yourself?'),[
    choice('replay','Вспомнить один способ','Recall one option'),
    choice('adapt','Упростить знакомое упражнение','Simplify a familiar exercise'),
    choice('backup','Добавить запасной вариант','Choose a backup'),choice('skip','Отложить','Try later')]),
  activity('plan',tr('Что включить в личную карту завершения?','What belongs in your personal takeaway card?'),[
    choice('signal','Ранний сигнал','An early sign'),
    choice('anchor','Доступная опора','An available anchor'),
    choice('choice','Посильный следующий шаг','A doable next step'),
    choice('skip','Оставить план открытым','Leave the plan open')]),
])

const legacyIds=Object.freeze(['AS1','AS3','AS4','AS5'])
const phaseIds=Object.freeze(['AS1','AS3','AS5','AS6'])
export function oporaModuleActivity(moduleId,day,locale='en',routerVersion=''){
  const legacy=routerVersion==='opora-nav-2.0-20261014'&&legacyIds.includes(moduleId)
  const phase=routerVersion==='opora-trauma-1.3-20261015'&&phaseIds.includes(moduleId)
  if(!legacy&&!phase)return null
  if(!Number.isInteger(day)||day<1||day>14)return null
  const template=OPORA_MODULE_ACTIVITY_PLAN[day-1]
  const lang=locale==='ru'?'ru':'en'
  const row=legacy?fiveLevelLessonRow(moduleId,day):null
  const authored=phase?moduleDayMeta(moduleId,day,lang,routerVersion):null
  if((legacy&&!row)||(phase&&!authored)||!template)return null
  const ix=lang==='ru'?0:1
  return {day,moduleId,kind:template.kind,
    title:legacy?row[ix]:authored.title,practice:legacy?row[ix+2]:authored.exercise,
    prompt:template.question[lang],options:template.options.map(x=>({id:x.id,label:x.label[lang]}))}
}
export function validateOporaModuleActivityChoice(moduleId,day,value,routerVersion=''){
  if(value===undefined||value===null||value==='')return null
  if(typeof value!=='string'||value.length>25)throw new Error('INVALID_OPORA_MODULE_ACTIVITY')
  const options=oporaModuleActivity(moduleId,day,'en',routerVersion)?.options
  if(!options?.some(x=>x.id===value))throw new Error('INVALID_OPORA_MODULE_ACTIVITY')
  return value
}
export function oporaModuleActivityComplete(){
  return OPORA_MODULE_ACTIVITY_PLAN.length===14&&
    OPORA_MODULE_ACTIVITY_PLAN.every((x,i)=>x.kind&&x.question.en&&x.question.ru&&
      x.options.length===4&&new Set(x.options.map(y=>y.id)).size===4&&
      legacyIds.every(id=>Boolean(oporaModuleActivity(id,i+1,'ru','opora-nav-2.0-20261014')))&&
      phaseIds.every(id=>Boolean(oporaModuleActivity(id,i+1,'ru','opora-trauma-1.3-20261015'))))
}
