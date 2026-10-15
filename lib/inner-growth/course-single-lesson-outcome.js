// A personal educational session receipt, never a diagnosis, clinical effect,
// assessment grade, or a claim that the exercise caused a state change.
import { oporaModuleActivity } from './opora-module-exercise.js'
import { antiStressLabChoiceLabel, antiStressLabFor } from './anti-stress-practice-lab.js'
import {oporaStateJourneySummary} from './opora-state-journey.js'

const STRINGS=Object.freeze({
  en:{
    unreported:'Not reported',noRating:'Not rated',tried:'Tried',partly:'Tried partly',
    stopped:'Stopped',simplified:'Used a shorter version',skip:'Not tried',rest:'Chose rest',comfortable:'Comfortable',
    neutral:'Neutral or manageable',uncomfortable:'Uncomfortable',useful:'Subjectively helpful',
    unchanged:'No clear benefit noticed',unsure:'Not sure',more_choice:'A little more freedom of choice',
    same:'About the same',keep:'Keep this approach',simplify:'Try a shorter version',
    neutralNext:'Choose neutral support',plan:'Made a plan',imagined:'Imagined a safe step',
    phrase:'Prepared a phrase',real:'Tried a real-world step (self-reported)',
    none:'No option selected',one:'Selected support',
  },
  ru:{
    unreported:'Не отмечено',noRating:'Нет замера',tried:'Попробовал(а)',partly:'Попробовал(а) частично',
    stopped:'Остановил(а)',simplified:'Сократил(а) практику',skip:'Не пробовал(а)',rest:'Выбрал(а) отдых',comfortable:'Комфортно',
    neutral:'Нейтрально или терпимо',uncomfortable:'Некомфортно',useful:'Субъективно было полезно',
    unchanged:'Явной пользы не заметил(а)',unsure:'Не уверен(а)',more_choice:'Немного больше свободы выбора',
    same:'Примерно так же',keep:'Оставить текущий вариант',simplify:'Попробовать короткую версию',
    neutralNext:'Перейти к нейтральной опоре',plan:'Составил(а) план',imagined:'Представил(а) безопасный шаг',
    phrase:'Подготовил(а) фразу',real:'Попробовал(а) в жизни (со слов участника)',
    none:'Ничего не выбрано',one:'Выбранная опора',
  },
})
const ANCHOR={
  colour:{ru:'Цвет',en:'A colour'},shape:{ru:'Форма',en:'A shape'},
  object:{ru:'Предмет',en:'An object'},word:{ru:'Слово',en:'A word'},
}
const INNER_SIGNALS=Object.freeze({
  tension:{ru:'Напряжение',en:'Tension'},rushing:{ru:'Внутренняя спешка',en:'Inner rushing'},
  fatigue:{ru:'Усталость',en:'Tiredness'},steady:{ru:'Ровное состояние',en:'Steady state'},
  unclear:{ru:'Пока неясно',en:'Not clear yet'},
})
const INNER_NEEDS=Object.freeze({
  space:{ru:'Немного пространства',en:'A little more space'},rest:{ru:'Отдых',en:'Rest'},
  support:{ru:'Поддержка',en:'Support'},clarity:{ru:'Ясность',en:'Clarity'},
  none:{ru:'Пока не знаю',en:'Not sure yet'},
})
const INNER_ACTIONS=Object.freeze({
  orient:{ru:'Внешний ориентир',en:'An ordinary anchor'},
  pause:{ru:'Пауза',en:'A pause'},rest:{ru:'Отдых',en:'Rest'},
  ask:{ru:'Возможность попросить помощи',en:'Considering asking for help'},
  none:{ru:'Не предпринимать действий',en:'Take no action for now'},
})
const INNER_EXPERIENCE=Object.freeze({
  clearer:{ru:'Стало яснее, что я чувствую',en:'Clearer awareness of my state'},
  more_choice:{ru:'Доступнее следующий выбор',en:'More choice about what comes next'},
  easier:{ru:'Сообщил(а) о некотором облегчении',en:'Reported some relief'},
  unchanged:{ru:'Заметных изменений нет',en:'No noticeable change'},
  unsure:{ru:'Пока неясно',en:'Not sure yet'},
  uncomfortable:{ru:'Стало некомфортно',en:'Felt uncomfortable'},
})
const allowedScore=v=>Number.isInteger(v)&&v>=0&&v<=10

export function courseSingleLessonOutcome({
  locale='en',lesson={},day=0,beforeNow=null,afterNow=null,
  comfort=null,usefulness=null,flexibility=null,adaptationChoice=null,
  transferStage=null,practiceAttempt=null,practiceLab=null,dayOne=null,moduleActivityChoice=null,
  stateJourney=null,welcomeFeeling=null,
}={}){
  const lang=locale==='ru'?'ru':'en',t=STRINGS[lang]
  const hasPair=allowedScore(beforeNow)&&allowedScore(afterNow)
  const reported=value=>value&&value!=='skip'&&t[value]?t[value]:t.unreported
  const did=practiceAttempt||dayOne?.practiceAttempt||practiceLab?.attempt||null
  const routeLab=lesson.antiStress?.routePlan?.practiceLab
  const lab=routeLab||(lesson.antiStress && day>=2 ? antiStressLabFor(day,lang) : null)
  const selected=routeLab ? routeLab.main.options.find(item=>item.id===practiceLab?.main)?.label||null
    : lab ? antiStressLabChoiceLabel(day,'main',practiceLab?.main,lang)
    : ANCHOR[dayOne?.anchor]?.[lang]||null
  const second=routeLab ? routeLab.reflect.options.find(item=>item.id===practiceLab?.reflect)?.label||null
    : lab ? antiStressLabChoiceLabel(day,'reflect',practiceLab?.reflect,lang):null
  const legacyModule=lesson.oporaModule ? oporaModuleActivity(lesson.oporaModule.id,day,lang,lesson.oporaModule.version):null
  const savedActivity=legacyModule?.options.find(item=>item.id===moduleActivityChoice)?.label||null
  const innerObservation=day===1&&dayOne ? {
    signal:INNER_SIGNALS[dayOne.innerSignal]?.[lang]||null,
    need:INNER_NEEDS[dayOne.innerNeed]?.[lang]||null,
    selectedAction:INNER_ACTIONS[dayOne.innerAction]?.[lang]||null,
    experience:INNER_EXPERIENCE[dayOne.experience]?.[lang]||null,
  } : null
  const actualInnerObservation=innerObservation&&Object.values(innerObservation).some(Boolean)
    ?innerObservation:null
  return {
    savedActivity,
    innerObservation:actualInnerObservation,
    stateJourney:oporaStateJourneySummary(stateJourney,welcomeFeeling,lang),
    skill:lesson.antiStress?.skill||lesson.workbook?.skill||lesson.journey?.heading||lesson.title||null,
    mainPractice:lab?.main?.title||null,
    attempt:did&&t[did]||t.unreported,
    anchor:selected,
    anotherChoice:second,
    state:hasPair?{before:beforeNow,after:afterNow,delta:afterNow-beforeNow}:null,
    comfort:reported(comfort),
    usefulness:reported(usefulness),
    flexibility:reported(flexibility),
    transfer:transferStage&&t[transferStage]||t.unreported,
    adaptation:adaptationChoice==='neutral'?t.neutralNext:
      adaptationChoice&&adaptationChoice!=='skip'&&t[adaptationChoice]||null,
  }
}
