// A personal educational session receipt, never a diagnosis, clinical effect,
// assessment grade, or a claim that the exercise caused a state change.
import { antiStressLabChoiceLabel, antiStressLabFor } from './anti-stress-practice-lab.js'

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
const allowedScore=v=>Number.isInteger(v)&&v>=0&&v<=10

export function courseSingleLessonOutcome({
  locale='en',lesson={},day=0,beforeNow=null,afterNow=null,
  comfort=null,usefulness=null,flexibility=null,adaptationChoice=null,
  transferStage=null,practiceAttempt=null,practiceLab=null,dayOne=null,
}={}){
  const lang=locale==='ru'?'ru':'en',t=STRINGS[lang]
  const hasPair=allowedScore(beforeNow)&&allowedScore(afterNow)
  const reported=value=>value&&value!=='skip'&&t[value]?t[value]:t.unreported
  const did=practiceAttempt||dayOne?.practiceAttempt||practiceLab?.attempt||null
  const lab=lesson.antiStress && day>=2 ? antiStressLabFor(day,lang) : null
  const selected=lab ? antiStressLabChoiceLabel(day,'main',practiceLab?.main,lang)
    : ANCHOR[dayOne?.anchor]?.[lang]||null
  const second=lab ? antiStressLabChoiceLabel(day,'reflect',practiceLab?.reflect,lang):null
  return {
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
