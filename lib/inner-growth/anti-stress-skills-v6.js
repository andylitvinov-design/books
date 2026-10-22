// Holistic House OPORA AS-5.4 live curriculum, independently versioned from AS-5.0.
// New cycles only. Author-owned RU microcopy for 14 × 15 screens; EN screens are
// assembled from previously authored bilingual V5 steps and 14 reviewed scenarios.
// No remote model, therapy, automatic diagnosis or free-text PII in these scripts.
import { oporaSkillForDay, oporaSkillCards } from './anti-stress-skills-v5.js'
import {oporaCompactDay,oporaCompactPassportValid} from './opora-compact-copy-v6.js'
import {oporaNoticeActivity,oporaNoticeCatalogValid} from './opora-v6-exercise-cards.js'

export const COURSE_ANTISTRESS_SKILLS_V6='hh-antistress-skills-v6-20261017'
export const OPORA54_SLIDE_MODEL='opora-fifteen-screens-v1'
export const OPORA54_PRE_SAVE_KEYS=Object.freeze([
  'welcome','baseline','pace','focus','aphorism','demo','prepare',
  'notice','act','rehearse','scenario','transfer','reflection','save',
])
export const OPORA54_RECEIPT_KEY='receipt'
export const OPORA54_LESSON_MINUTES=Object.freeze({target:[8,12],practice:[5,7]})
const QUOTES=Object.freeze([{"ru":"Когда я замечаю спешку раньше, у меня появляется возможность выбрать паузу.","en":"Noticing my hurry early can give me a chance to pause.","ruNeutral":"Мне не обязательно замечать всё сразу. Я могу начать с одного сигнала.","enNeutral":"I do not need to notice everything. One signal is enough to begin."},{"ru":"Мне достаточно одной реальной детали вокруг, чтобы попробовать вернуться в настоящее.","en":"One ordinary detail around me can help me return my attention to the present.","ruNeutral":"Я могу просто посмотреть вокруг и ничего не менять в своём состоянии.","enNeutral":"I can simply look around without trying to change how I feel."},{"ru":"Я могу уменьшить усилие и выбрать тот способ паузы, который мне подходит.","en":"I can ease my effort and choose the kind of pause that suits me.","ruNeutral":"Даже без движения я могу сделать паузу и посмотреть на нейтральный предмет.","enNeutral":"I can take a pause without moving, simply by looking at an ordinary object."},{"ru":"Я могу назвать чувство и всё равно выбирать, что делать дальше.","en":"I can name a feeling and still choose what I do next.","ruNeutral":"Мне не нужно переживать сильные чувства ради упражнения.","enNeutral":"I do not need to experience intense feelings to try this exercise."},{"ru":"Не каждой тревожной мысли нужно верить или сразу следовать.","en":"I do not have to believe or follow every worrying thought.","ruNeutral":"Я могу просто заметить: «Это мысль». Мне не нужно себя переубеждать.","enNeutral":"I can simply notice: “This is a thought.” I do not have to argue with it."},{"ru":"Я могу уважать другого человека и при этом беречь своё время и силы.","en":"I can respect others while making room for my time and energy.","ruNeutral":"Я могу только подготовить фразу; реальный разговор необязателен.","enNeutral":"I can prepare a phrase without having to say it to anyone."},{"ru":"Мне достаточно одного маленького доступного шага, чтобы начать поддерживать себя.","en":"One realistic small step can be enough to begin supporting myself.","ruNeutral":"Мой план может быть совсем коротким, а отдых — подходящим вариантом.","enNeutral":"My plan can be short, and rest can be a suitable option."},{"ru":"Чем раньше я замечаю свою спешку, тем больше возможных маленьких решений.","en":"Noticing my hurry sooner may leave me more small choices.","ruNeutral":"Мне достаточно попробовать заметить одно изменение, с подсказкой или без.","enNeutral":"I can try to notice one change, with a hint or without."},{"ru":"Я могу возвращать внимание к реальной детали, даже если мысли продолжают приходить.","en":"I can return my attention to something real even when thoughts keep coming.","ruNeutral":"Мне не нужно побеждать отвлечение. Можно заметить один предмет.","enNeutral":"I do not need to defeat distraction. I can notice one object."},{"ru":"Разным дням нужна разная поддержка: иногда пауза, иногда уменьшение требований.","en":"Different days may call for different support: sometimes rest, sometimes fewer demands.","ruNeutral":"Если непонятно, что мне нужно, можно выбрать нейтральную паузу.","enNeutral":"If I am unsure what I need, I can choose a neutral pause."},{"ru":"Чувство может быть рядом со мной, но оно не обязано управлять каждым моим шагом.","en":"A feeling can be present without deciding every step I take.","ruNeutral":"Можно назвать чувство персонажа или просто посмотреть на предмет.","enNeutral":"I can name a character's feeling or simply look at an object."},{"ru":"Я могу заметить тревожную мысль и всё-таки сделать небольшой выбор по своим ценностям.","en":"I can notice a worrying thought and still take a small values-based step.","ruNeutral":"Даже если мысль не исчезла, можно отложить решение или сделать паузу.","enNeutral":"Even if the thought stays, I can postpone a decision or pause."},{"ru":"Я могу повторить свою границу спокойно, даже если меня попросили ещё раз.","en":"I can restate a boundary calmly if someone asks again.","ruNeutral":"Можно мысленно прочитать фразу, не вступая в реальный разговор.","enNeutral":"I can read the phrase silently without having a real conversation."},{"ru":"Мне не нужно применять всё сразу: один подходящий шаг и запасной вариант уже полезны.","en":"I do not need to use every skill at once; one suitable step and a backup may be enough.","ruNeutral":"Мой план может быть простым, а неизвестное можно оставить неизвестным.","enNeutral":"My plan can stay simple; I can leave some things undecided."}])
// Feedback explains WHY a learner's safe scenario choice fits the day's skill.
// A learner may choose different appropriate supports; there is no clinical grade.
const SCENARIO_FEEDBACK=Object.freeze({
  ru:[
    'В этом примере важно отличить ранний сигнал от самого события. Возможное действие — небольшая пауза или изменение нагрузки.',
    'Обычная видимая форма или цвет может быть внешней опорой. Немедленное расслабление не требуется.',
    'Выбор зависит от доступной нагрузки. Микродвижение, внешний предмет и отдых могут быть равноправными вариантами.',
    'Мягкое чувство можно назвать, не заставляя его исчезнуть. Для поддержки подойдёт обычная пауза.',
    'Замечайте, что действительно известно, а что остаётся предположением. Для действия не нужно силой менять мысль.',
    'Короткая уважительная фраза может обозначить границу. Упражнение остаётся мысленной репетицией, не настоящей конфронтацией.',
    'Достаточно одной подходящей опоры и доступного запасного варианта. Не обязательно использовать все семь навыков.',
  ],
  en:[
    'The useful distinction is between the event and an early change in pace or attention. A small pause is one possible response.',
    'A visible ordinary shape or colour can be an external anchor. Immediate relaxation is not required.',
    'Choose according to what is accessible. A tiny movement, a visible object or rest may each be appropriate.',
    'A mild feeling may be named without forcing it to disappear. A simple pause is one kind response.',
    'Notice what is actually known and what is only an interpretation. You need not force yourself to change a thought.',
    'A short, respectful phrase can communicate a limit. This is a rehearsal, not a demand for real confrontation.',
    'One realistic support and a backup are enough. You do not need to practise all seven skills at once.',
  ],
})
const RU_LABELS=Object.freeze(['Начинаем','Мой настрой сейчас','Выбираю темп','Фокус дня','Мысль дня','Один понятный пример','Как мне удобнее','Учусь замечать','Пробую сделать','Повторяю по желанию','Новая ситуация','Мой маленький план','Что мне подошло','Сохранить мой опыт'])
const EN_LABELS=Object.freeze(['Let’s begin','My state right now','Choose your pace','Today’s focus','One thought for today','A simple example','Prepare gently','Notice one detail','Try one small step','Repeat if you wish','A new everyday example','My small plan','What suited me?','Save my experience'])

const permitted=Object.freeze({
 welcome:['steady','tense','low','unsure'],
 baseline:[],
 pace:['standard','quick','read'],
 focus:['fits','general','unsure'],
 aphorism:['agree','unsure','disagree','reflect'],supportResponse:['agree','unsure','disagree','reflect'],
 demo:['clear','example','difficult'],
 prepare:['try','simple','read'],
 notice:['tried','partly','not_yet','not_attempted','uncomfortable'],
 act:['tried','partly','not_yet','not_attempted','uncomfortable'],
 rehearse:['independent','guided','partly','not_yet','not_attempted','uncomfortable'],
 noticeChoice:['one','two','three'],actChoice:['one','two','three'],transferChoice:['one','two','three'],
 scenario:['one','two','three'],
 transfer:['planned','imagined','not_planning'],
 reflection:['useful','partly','unchanged','uncomfortable'],
 lessonConfidence:['confident','some','practice_more','explored'],
 save:[],
})
export const OPORA54_ANSWER_OPTIONS=permitted
export const OPORA54_HINT_KEYS=Object.freeze(['demo','notice','act','rehearse','scenario'])
const HINT_SET=new Set(OPORA54_HINT_KEYS)

export function opora54Day(day,locale='en'){
  if(!Number.isInteger(day)||day<1||day>14)return null
  const index=day-1,ru=locale==='ru'
  const source=oporaSkillForDay(day,ru?'ru':'en')
  const quote=QUOTES[index],copy=oporaCompactDay(day,locale)
  if(!source||!copy||!quote)return null
  // One short action at a time, rather than copying the 210-screen methodological
  // passport verbatim into an inaccessible long mobile slide.
  const wording=ru?[
    `День ${day}/14. Сегодня потренируемся: ${copy.goal} Начнём с маленького шага.`,
    `${copy.moment} Если удобно, отметьте 0–10. Можно просто нажать «Далее».`,
    'Какой темп вам подходит: обычный, короткий или только чтение? Остановиться можно в любой момент.',
    `Сегодняшний фокус: ${copy.focus}`,
    'Прочитайте мысль дня и выберите: откликается, сомневаюсь или не согласен(на). Убеждать себя не нужно.',
    copy.demo,copy.prepare,copy.notice,copy.act,copy.rehearse,copy.scenario,copy.transfer,
    `${copy.reflection} ${copy.moment} Оценка 0–10 — только по желанию.`,
    `${copy.artifact} Сохраним только те ответы, которые вы действительно выбрали.`,
  ]:[
    `Day ${day}/14. Today we will practise: ${copy.goal} A small step is enough.`,
    `${copy.moment} You may choose 0–10, or simply continue without a rating.`,
    'Choose a pace: usual, short or read-only. You can stop whenever you need.',
    `Today's focus: ${copy.focus}`,
    'Read today’s thought. You may agree, feel unsure or disagree. No belief is required.',
    copy.demo,copy.prepare,copy.notice,copy.act,copy.rehearse,copy.scenario,copy.transfer,
    `${copy.reflection} ${copy.moment} The 0–10 rating is optional.`,
    `${copy.artifact} We save only the answers you actually chose.`,
  ]
  const screens=wording.map((text,i)=>Object.freeze({
    key:OPORA54_PRE_SAVE_KEYS[i],kind:OPORA54_PRE_SAVE_KEYS[i],
    title:(ru?RU_LABELS:EN_LABELS)[i],text,
  }))
  return Object.freeze({
    day,week:day>7?2:1,skillId:source.skillId,skill:source.skill,
    title:source.title,teaching:source.teaching,guide:source.guide,
    outcome:copy.artifact,quote:ru?quote.ru:quote.en,
    neutralQuote:ru?quote.ruNeutral:quote.enNeutral,
    neutral:source.neutral,reflection:copy.reflection,transfer:copy.transfer,
    practiceSeconds:350,durationSeconds:650,practiceMode:source.practiceMode,
    slideModel:OPORA54_SLIDE_MODEL,scales:source.scales,
    hint:copy.hint,
    exercises:Object.freeze({
      notice:Object.freeze(oporaNoticeActivity(day,locale)),
      act:Object.freeze({choices:copy.choices}),
      transfer:Object.freeze({choices:copy.choices}),
    }),
    scenario:Object.freeze({prompt:copy.scenario,choices:copy.choices,
      explanation:SCENARIO_FEEDBACK[ru?'ru':'en'][index%7]}),
    screens:Object.freeze(screens),
  })
}

export function opora54SkillCards(locale='en'){return oporaSkillCards(locale)}
// Save only bounded enums. Missing answers are null/not submitted, never 'skip'.
export function validateOpora54Signals(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('INVALID_OPORA54_SIGNALS')
  if(Object.keys(input).some(k=>!['answers','hints','ease'].includes(k)))throw new Error('INVALID_OPORA54_SIGNAL_FIELD')
  const answers=input.answers??{}
  if(!answers||typeof answers!=='object'||Array.isArray(answers))throw new Error('INVALID_OPORA54_ANSWERS')
  const keys=Object.keys(answers)
  if(keys.length>Object.keys(permitted).length)throw new Error('INVALID_OPORA54_ANSWERS')
  const result={}
  for(const key of keys){
    if(!Object.hasOwn(permitted,key)||!permitted[key].includes(answers[key]))
      throw new Error('INVALID_OPORA54_ANSWER')
    result[key]=answers[key]
  }
  // A learning attempt and a real plan require a distinct learner-selected
  // micro-action. Simply visiting the slide must never forge an attempt.
  if(['tried','partly'].includes(result.notice)&&!result.noticeChoice)throw new Error('INVALID_OPORA54_ATTEMPT')
  if(['tried','partly'].includes(result.act)&&!result.actChoice)throw new Error('INVALID_OPORA54_ATTEMPT')
  if(['planned','imagined'].includes(result.transfer)&&!result.transferChoice)
    throw new Error('INVALID_OPORA54_TRANSFER')
  const hints=input.hints??[]
  if(!Array.isArray(hints)||hints.length>OPORA54_HINT_KEYS.length||
    hints.some(s=>typeof s!=='string'||!HINT_SET.has(s))||new Set(hints).size!==hints.length)
    throw new Error('INVALID_OPORA54_HINTS')
  if(hints.includes('rehearse')&&result.rehearse==='independent')
    throw new Error('INVALID_OPORA54_INDEPENDENCE')
  const ease=input.ease??null
  if(ease!==null&&(!Number.isInteger(ease)||ease<0||ease>3||!['tried','partly'].includes(result.act)))throw new Error('INVALID_OPORA54_EASE')
  return {answers:result,hints:[...hints],ease}
}
export function opora54BlueprintValid(){
  return oporaCompactPassportValid()&&oporaNoticeCatalogValid()&&QUOTES.length===14&&
    Array.from({length:14},(_,i)=>i+1).every(day=>['ru','en'].every(lang=>{
      const v=opora54Day(day,lang)
      return v?.screens.length===14&&v.screens.every((x,i)=>x.key===OPORA54_PRE_SAVE_KEYS[i]&&x.text.length>35)&&
        v.quote.length>20&&v.scenario.choices.length===3&&
        Array.isArray(v.exercises?.notice?.a)&&v.exercises.notice.a.length===3&&
        Array.isArray(v.exercises?.notice?.f)&&v.exercises.notice.f.length===3&&
        Array.isArray(v.exercises?.act?.choices)&&v.exercises.act.choices.length===3&&
        Array.isArray(v.exercises?.transfer?.choices)&&v.exercises.transfer.choices.length===3
    }))
}
