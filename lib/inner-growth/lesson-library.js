import { SHARED_DAYS } from '../../data/inner-growth/shared-days.js'
import { COURSE_JOURNEY, COURSE_PHASES } from '../../data/inner-growth/course-journey.js'
import { WORKBOOK_DAYS, workbookDay } from '../../data/inner-growth/workbook-days.js'
import { DEEP_PRACTICE_DAYS, deepPracticeDay } from '../../data/inner-growth/deep-practice-v3.js'
import { COURSE_CONTENT_V3 } from './course-v3.js'
import { COURSE_CONTENT_V4 } from './course-v4.js'
import { COURSE_ANTISTRESS_OUTCOME_V3, antiStressDay, antiStressLessonValid } from './anti-stress-outcomes-v3.js'
import { COURSE_ANTISTRESS_SKILLS_V5, oporaSkillForDay, oporaSkillPassportValid } from './anti-stress-skills-v5.js'
import { COURSE_ANTISTRESS_SKILLS_V6, opora54Day, opora54BlueprintValid } from './anti-stress-skills-v6.js'
import { COURSE_ANTISTRESS_SKILLS_V7, opora55Day, opora55CurriculumValid } from './anti-stress-skills-v7.js'
import { SYMBOLIC_LAB_V4, symbolicLabDay } from '../../data/inner-growth/symbolic-lab-v4.js'
import { CALM_DAYS } from '../../data/inner-growth/calm-days.js'
import { SUPPORT_DAYS } from '../../data/inner-growth/support-days.js'
import { EMOTION_DAYS } from '../../data/inner-growth/emotion-days.js'
import { CLARITY_DAYS } from '../../data/inner-growth/clarity-days.js'
import { CONNECTION_DAYS } from '../../data/inner-growth/connection-days.js'
import { ENERGY_DAYS } from '../../data/inner-growth/energy-days.js'
import { GROWTH_GOALS } from './course-model.js'

export const COURSE_CONTENT_VERSION = 'hh-growth-r2-v1'
export { COURSE_CONTENT_V3 } from './course-v3.js'
export { COURSE_CONTENT_V4 } from './course-v4.js'
export { COURSE_ANTISTRESS_OUTCOME_V3, antiStressSkillCards } from './anti-stress-outcomes-v3.js'
export { COURSE_ANTISTRESS_SKILLS_V5, oporaSkillCards } from './anti-stress-skills-v5.js'
export { COURSE_ANTISTRESS_SKILLS_V6, opora54SkillCards } from './anti-stress-skills-v6.js'
export { COURSE_ANTISTRESS_SKILLS_V7, opora55SkillCards } from './anti-stress-skills-v7.js'
// Preserve existing lesson IDs/active cycle provenance; version the additive workbook separately.
export const COURSE_WORKBOOK_VERSION = 'hh-workbook-v2-20261013'
export const TRACKS = Object.freeze({
  calm_regulation: CALM_DAYS,
  inner_support: SUPPORT_DAYS,
  emotional_flexibility: EMOTION_DAYS,
  attention_clarity: CLARITY_DAYS,
  connection_boundaries: CONNECTION_DAYS,
  energy_agency: ENERGY_DAYS,
})
const languageIndex = (locale) => locale === 'ru' ? 1 : 0
const labels = Object.freeze({
  en: {
    introduction: 'Arrive as you are', focus: 'Understand the idea',
    exercise: 'Guided attention or gentle visualization', integration: 'Bring it into life',
    ending: 'Close at your own pace',
    arriveText: 'You may sit or stand comfortably and keep your eyes open. Notice one colour, one sound and the place where you are. Breathing can remain natural. Stop or skip any step that feels uncomfortable.',
    focusText: 'This is voluntary skills practice, not a test or an attempt to force a feeling away. Take about a minute to read the idea, with pauses if you need them.',
    practiceText: 'Move slowly through these words. Pause for a moment to notice whether the exercise fits you. It is fine if nothing changes; gently return attention to a neutral feature in your surroundings.',
    actionText: 'Choose whether to try the small action now, later or not today. It is an invitation, not an obligation. Notice what feels realistic and safe.',
    closeText: 'Look around the current room again. Name one ordinary object and one next practical step, which may simply be rest. You can leave this practice without any particular feeling.',
    shortText: 'For the quick version, stay with what you can see around you, try one small part of the guided exercise, then return to your day.',
    thought: 'Today’s reflection', ritual: 'A small everyday ritual',
  },
  ru: {
    introduction: 'Начните в своём состоянии', focus: 'Смысл практики',
    exercise: 'Направленное внимание или мягкая визуализация', integration: 'Применение в жизни',
    ending: 'Спокойное завершение',
    arriveText: 'Можно удобно сесть или стоять и держать глаза открытыми. Заметьте один цвет, один звук и место, где вы находитесь. Дыхание остаётся естественным. Любой некомфортный шаг можно пропустить или остановить.',
    focusText: 'Это добровольная тренировка навыков, а не экзамен или попытка силой убрать чувство. Уделите примерно минуту осмыслению идеи, делая паузы по необходимости.',
    practiceText: 'Постепенно пройдите слова упражнения. Сделайте паузу и заметьте, подходит ли оно вам. Ничего страшного, если ощущения не меняются; спокойно верните внимание к нейтральной детали вокруг.',
    actionText: 'Выберите: сделать небольшой шаг сейчас, позже или не сегодня. Это приглашение, а не обязанность. Оцените, что реалистично и безопасно.',
    closeText: 'Ещё раз оглядите комнату. Назовите обычный предмет и следующий практический шаг — возможно, просто отдых. Для завершения не требуется особого состояния.',
    shortText: 'Для короткой версии оставайтесь со зрительными деталями, попробуйте одну маленькую часть упражнения, затем вернитесь к своему дню.',
    thought: 'Размышление дня', ritual: 'Маленький повседневный ритуал',
  },
})

function ensureContent() {
  if (!antiStressLessonValid()) throw new Error('ANTISTRESS_V3_CONTENT_INCOMPLETE')
  if (!oporaSkillPassportValid()) throw new Error('ANTISTRESS_V5_CONTENT_INCOMPLETE')
  if (SHARED_DAYS.length !== 14 || COURSE_JOURNEY.length !== 14 || WORKBOOK_DAYS.length !== 14 || DEEP_PRACTICE_DAYS.length !== 14 || SYMBOLIC_LAB_V4.length !== 14 || Object.keys(TRACKS).length !== 6) throw new Error('GROWTH_CONTENT_INCOMPLETE')
  if (COURSE_JOURNEY.some((entry, index) => entry.day !== index + 1 || entry.phase !== SHARED_DAYS[index].phase)) throw new Error('GROWTH_CONTENT_INCOMPLETE')
  for (const [index, item] of WORKBOOK_DAYS.entries()) {
    if (item.day !== index + 1 || !item.key) throw new Error('GROWTH_WORKBOOK_INCOMPLETE')
    for (const name of ['method','skill','question','sentenceStarter','microPractice','workingPosition','takeaway']) {
      if (!item[name]?.en?.trim() || !item[name]?.ru?.trim()) throw new Error('GROWTH_WORKBOOK_INCOMPLETE')
    }
  }
  for (const [index, item] of DEEP_PRACTICE_DAYS.entries()) {
    if (item.day !== index + 1 || ['recall','microAction','review'].some(key =>
      !item[key]?.en?.trim() || !item[key]?.ru?.trim())) throw new Error('GROWTH_V3_CONTENT_INCOMPLETE')
  }
  const keys = new Set()
  for (const [index, entry] of SYMBOLIC_LAB_V4.entries()) {
    if (entry.day !== index + 1 || !entry.key || keys.has(entry.key)) throw new Error('GROWTH_V4_CONTENT_INCOMPLETE')
    keys.add(entry.key)
    for (const field of ['element','symbol','invitation','withoutImagery','artifact']) {
      for (const lang of ['en','ru']) {
        if (typeof entry[field]?.[lang] !== 'string' || entry[field][lang].trim().length < (field === 'symbol' ? 6 : 12)) {
          throw new Error('GROWTH_V4_CONTENT_INCOMPLETE')
        }
      }
    }
  }
  for (const entries of Object.values(TRACKS)) {
    if (entries.length !== 14) throw new Error('GROWTH_CONTENT_INCOMPLETE')
    for (const entry of entries) {
      for (const key of ['title','teaching','guide','action']) {
        if (!Array.isArray(entry[key]) || entry[key].length !== 2 ||
          entry[key].some((value) => typeof value !== 'string' || value.trim().length < (key==='title' ? 3 : 18))) throw new Error('GROWTH_CONTENT_INCOMPLETE')
      }
    }
  }
}
ensureContent()

export function lessonFor(domain, day, locale='en', length='standard', contentVersion=COURSE_CONTENT_VERSION) {
  const entries = TRACKS[domain]
  if (!entries || !Number.isInteger(day) || day < 1 || day > 14) return null
  const i = languageIndex(locale), lang = i===1 ? 'ru' : 'en', t=labels[lang],
    entry=entries[day-1], arc=SHARED_DAYS[day-1], journey=COURSE_JOURNEY[day-1], workbook=workbookDay(day,locale)
  const version = contentVersion === COURSE_ANTISTRESS_SKILLS_V7 ? COURSE_ANTISTRESS_SKILLS_V7
    : contentVersion === COURSE_ANTISTRESS_SKILLS_V6 ? COURSE_ANTISTRESS_SKILLS_V6
    : contentVersion === COURSE_ANTISTRESS_SKILLS_V5 ? COURSE_ANTISTRESS_SKILLS_V5
    : contentVersion === COURSE_ANTISTRESS_OUTCOME_V3 ? COURSE_ANTISTRESS_OUTCOME_V3
    : contentVersion === COURSE_CONTENT_V4 ? COURSE_CONTENT_V4
    : contentVersion === COURSE_CONTENT_V3 ? COURSE_CONTENT_V3 : COURSE_CONTENT_VERSION
  // A dedicated new-cycle version changes only educational text and records a
  // separate content ID. Never rewrite an existing V3/V4 user's lesson.
  const stress = version === COURSE_ANTISTRESS_SKILLS_V7 ? opora55Day(day,locale)
    : version === COURSE_ANTISTRESS_SKILLS_V6 ? opora54Day(day,locale)
    : version === COURSE_ANTISTRESS_SKILLS_V5 ? oporaSkillForDay(day,locale)
    : version === COURSE_ANTISTRESS_OUTCOME_V3 ? antiStressDay(day,locale,length) : null
  const sections = [
    {kind:'arrive',title:t.introduction,text:t.arriveText,seconds:stress?.slideModel?25:length==='quick'?15:35},
    {kind:'learn',title:t.focus,text:stress?.teaching || entry.teaching[i]+' '+t.focusText,seconds:stress?.slideModel?40:length==='quick'?20:55},
    {kind:'meditation',title:stress?.title || t.exercise,text:stress?.guide || entry.guide[i]+' '+t.practiceText,seconds:stress?.practiceSeconds|| (length==='quick'?55:150)},
    {kind:'ritual',title:t.integration,text:stress?.action || entry.action[i]+' '+t.actionText,seconds:stress?.slideModel?55:length==='quick'?20:75},
    {kind:'finish',title:t.ending,text:t.closeText,seconds:stress?.slideModel?30:length==='quick'?10:25},
  ]
  const activeWorkbook=stress ? {
    ...workbook, version:COURSE_WORKBOOK_VERSION, method:lang==='ru'?'Практика самоподдержки и посильный выбор':'Self-support and realistic choice',
    skill:stress.skill, question:stress.reflection, workingPosition:stress.action,
    microPractice:stress.transfer, sentenceStarter:lang==='ru'?'Если хочется, можно записать один свой вариант…':'If you wish, write one option of your own…',
    takeaway:stress.outcome,
  } : {...workbook,version:COURSE_WORKBOOK_VERSION}
  const priorV3=[COURSE_CONTENT_V3,COURSE_CONTENT_V4,COURSE_ANTISTRESS_OUTCOME_V3].includes(version)
  const practiceV3=priorV3 ? deepPracticeDay(day,locale) : null
  const practiceV4=[COURSE_CONTENT_V4,COURSE_ANTISTRESS_OUTCOME_V3].includes(version) ? symbolicLabDay(day,locale) : null
  return {
    id:'hh-growth-'+domain+'-'+String(day).padStart(2,'0')+'-'+version,
    version,domain,day,phase:arc.phase,
    title:stress?.title || entry.title[i],
    aphorism:stress?.quote || arc.quote[i],
    reflection:stress?.reflection || arc.reflection[i],
    ritual:stress?.action || entry.action[i],
    workbook:activeWorkbook,
    ...(priorV3 ? { practiceV3:stress ? {
      ...practiceV3, recall:lang==='ru'
        ? 'Вспомните один доступный ориентир из предыдущих уроков или пропустите это упражнение.'
        : 'Recall one available anchor from a previous lesson, or skip this optional recall.',
      microAction:stress.transfer, review:stress.reflection,
    } : practiceV3 } : {}),
    ...(practiceV4 ? { practiceV4:stress ? {
      ...practiceV4, symbol:stress.title,
      invitation:stress.action, withoutImagery:stress.neutral,
      artifact:stress.outcome,
    } : practiceV4 } : {}),
    ...([COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7].includes(version) ? {opora54:{screens:stress.screens,scenario:stress.scenario,exercises:stress.exercises,quote:stress.quote,neutralQuote:stress.neutralQuote,hint:stress.hint,...(version===COURSE_ANTISTRESS_SKILLS_V7?{hints:stress.hints,transferBackup:stress.transferBackup,lessonMethodVersion:'AS-5.5'}:{})}} : {}),
    ...(stress ? { antiStress:{
      skillId:stress.skillId, skill:stress.skill, outcomeAxes:stress.scales,
      ...(stress.slideModel?{slideModel:stress.slideModel,week:stress.week,practiceMode:stress.practiceMode}:{}),
      neutralText:stress.neutral, learningOutcome:stress.outcome,
      probe:stress.probe,
    }} : {}),
    journey:{
      heading:stress?.title || journey.heading[lang],
      purpose:stress?.teaching || journey.purpose[lang],
      outcome:stress?.outcome || journey.outcome[lang],
      phase:journey.phase,phaseTitle:COURSE_PHASES[journey.phase][lang],
    },
    source:stress ? (version===COURSE_ANTISTRESS_SKILLS_V7?'Holistic House OPORA 15-screen online skills · AS-5.5 / V7':version===COURSE_ANTISTRESS_SKILLS_V6?'Holistic House OPORA 15-screen online skills · AS-5.4 / V6':stress.slideModel?'Holistic House OPORA Anti-Stress seven skills · SKILLS-5.0':'Holistic House OPORA trauma-informed self-help education · AS-OUTCOME-3.0')
      : 'Holistic House original self-help education',
    durationSeconds:sections.reduce((sum,s)=>sum+s.seconds,0),
    length: length==='quick'?'quick':'standard',
    sections,
    accessibility:{eyesOpen:true,naturalBreathing:true,textVersion:true,stopAnytime:true},
    disclaimer:lang==='ru'
      ? 'Образовательная практика управления повседневным стрессом. Не лечение шоковой травмы или ПТСР и не замена медицинской или психотерапевтической помощи.'
      : 'Educational practice for everyday stress. Not shock-trauma or PTSD treatment or a substitute for medical or mental health care.',
  }
}
export function allLessonIds() {
  return Object.keys(TRACKS).flatMap(domain=>Array.from({length:14},(_,i)=>lessonFor(domain,i+1,'en')?.id))
}
export function isCompleteLibrary() {
  return allLessonIds().length===84 && new Set(allLessonIds()).size===84 &&
    Object.keys(TRACKS).every(domain=>Array.from({length:14},(_,i)=> {
      const en=lessonFor(domain,i+1,'en'),ru=lessonFor(domain,i+1,'ru')
      return en&&ru&&en.sections.length===5&&ru.sections.length===5&&
        en.aphorism&&ru.aphorism&&en.ritual&&ru.ritual&&
        en.workbook?.question&&ru.workbook?.question&&en.workbook?.sentenceStarter&&ru.workbook?.sentenceStarter
    }).every(Boolean))
}
