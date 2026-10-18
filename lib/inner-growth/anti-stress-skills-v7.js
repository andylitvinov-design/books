// AS-5.5: methodical revision for NEW course cycles only.
// Reuses the tested fifteen-screen V6 contract while providing independent
// everyday transfer cases and distinct if/then plans; V6 lessons remain frozen.
import {opora54Day,OPORA54_SLIDE_MODEL,OPORA54_PRE_SAVE_KEYS,opora54SkillCards} from './anti-stress-skills-v6.js'
import {opora55Case,opora55CasesValid} from './opora-as55-learning-cases.js'

export const COURSE_ANTISTRESS_SKILLS_V7='hh-antistress-skills-v7-20261018'
export const OPORA55_SLIDE_MODEL=OPORA54_SLIDE_MODEL
export {OPORA54_PRE_SAVE_KEYS}
export const opora55SkillCards=opora54SkillCards

export function opora55Day(day,locale='en'){
  const current=opora54Day(day,locale)
  const revision=opora55Case(day,locale)
  if(!current||!revision)return null
  const ru=locale==='ru'
  const screens=current.screens.map(screen=>{
    if(screen.key==='scenario')return Object.freeze({...screen,text:revision.prompt})
    if(screen.key==='transfer')return Object.freeze({...screen,
      text:ru?'Выберите посильное правило «если → то». Запасной вариант — отдых или помощь; делать ничего сейчас не нужно.':
        'Choose a workable if–then rule. Rest or asking for help can be your backup; no action is required now.'})
    if(screen.key==='act')return Object.freeze({...screen,
      text:screen.text+' '+(ru?'Если захотите, попробуйте этот шаг в учебном примере. Просто выбрать карточку — ещё не выполнить упражнение.':
        'If you wish, actually rehearse this step in the example. Choosing a card is not the same as trying the exercise.')})
    if(screen.key==='rehearse')return Object.freeze({...screen,
      text:screen.text+' '+(ru?'Попробуйте ещё раз с меньшей подсказкой — только если удобно.':
        'Try once more with less guidance only if it feels comfortable.')})
    return screen
  })
  return Object.freeze({...current,
    durationSeconds:current.durationSeconds,
    screens:Object.freeze(screens),
    scenario:Object.freeze({prompt:revision.prompt,choices:Object.freeze([...revision.choices]),
      feedback:Object.freeze([...revision.feedback]),hint:revision.hint}),
    exercises:Object.freeze({...current.exercises,
      transfer:Object.freeze({choices:Object.freeze([...revision.transfer])})}),
    transferBackup:ru?'Если план не подходит, можно отдохнуть, изменить его или обратиться за поддержкой.':
      'If the plan does not suit you, you can rest, adjust it or seek support.',
    hints:Object.freeze({
      demo:revision.hint,
      notice:current.hint,
      act:revision.actHint,
      rehearse:revision.rehearseHint,
      scenario:revision.hint,
    }),
    lessonMethodVersion:'AS-5.5',
  })
}
export function opora55CurriculumValid(){
  return opora55CasesValid()&&Array.from({length:14},(_,i)=>i+1).every(day=>
    ['ru','en'].every(lang=>{
      const current=opora54Day(day,lang),revised=opora55Day(day,lang)
      return revised?.screens.length===14&&revised.screens.every((screen,i)=>screen.key===OPORA54_PRE_SAVE_KEYS[i])&&
        revised.scenario.choices.length===3&&revised.scenario.feedback.length===3&&
        revised.exercises.transfer.choices.length===3&&
        revised.scenario.prompt!==current.scenario.prompt&&
        revised.exercises.transfer.choices.every(choice=>!current.exercises.act.choices.includes(choice))
    }))
}
