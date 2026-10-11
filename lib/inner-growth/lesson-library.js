import { SHARED_DAYS } from '../../data/inner-growth/shared-days.js'
import { CALM_DAYS } from '../../data/inner-growth/calm-days.js'
import { SUPPORT_DAYS } from '../../data/inner-growth/support-days.js'
import { EMOTION_DAYS } from '../../data/inner-growth/emotion-days.js'
import { CLARITY_DAYS } from '../../data/inner-growth/clarity-days.js'
import { CONNECTION_DAYS } from '../../data/inner-growth/connection-days.js'
import { ENERGY_DAYS } from '../../data/inner-growth/energy-days.js'
import { GROWTH_GOALS } from './course-model.js'

export const COURSE_CONTENT_VERSION = 'hh-growth-r2-v1'
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
  if (SHARED_DAYS.length !== 14 || Object.keys(TRACKS).length !== 6) throw new Error('GROWTH_CONTENT_INCOMPLETE')
  for (const entries of Object.values(TRACKS)) {
    if (entries.length !== 14) throw new Error('GROWTH_CONTENT_INCOMPLETE')
    for (const entry of entries) {
      for (const key of ['title','teaching','guide','action']) {
        if (!Array.isArray(entry[key]) || entry[key].length !== 2 ||
          entry[key].some((value) => typeof value !== 'string' || value.trim().length < 18)) throw new Error('GROWTH_CONTENT_INCOMPLETE')
      }
    }
  }
}
ensureContent()

export function lessonFor(domain, day, locale='en', length='standard') {
  const entries = TRACKS[domain]
  if (!entries || !Number.isInteger(day) || day < 1 || day > 14) return null
  const i = languageIndex(locale), lang = i===1 ? 'ru' : 'en', t=labels[lang],
    entry=entries[day-1], arc=SHARED_DAYS[day-1]
  const sections = [
    {kind:'arrive',title:t.introduction,text:t.arriveText,seconds:length==='quick'?15:35},
    {kind:'learn',title:t.focus,text:entry.teaching[i]+' '+t.focusText,seconds:length==='quick'?20:55},
    {kind:'meditation',title:t.exercise,text:entry.guide[i]+' '+t.practiceText,seconds:length==='quick'?55:150},
    {kind:'ritual',title:t.integration,text:entry.action[i]+' '+t.actionText,seconds:length==='quick'?20:75},
    {kind:'finish',title:t.ending,text:t.closeText,seconds:length==='quick'?10:25},
  ]
  return {
    id:'hh-growth-'+domain+'-'+String(day).padStart(2,'0')+'-'+COURSE_CONTENT_VERSION,
    version:COURSE_CONTENT_VERSION,domain,day,phase:arc.phase,
    title:entry.title[i],aphorism:arc.quote[i],
    reflection:arc.reflection[i],ritual:entry.action[i],
    source:'Holistic House original self-help education',
    durationSeconds:sections.reduce((sum,s)=>sum+s.seconds,0),
    length: length==='quick'?'quick':'standard',
    sections,
    accessibility:{eyesOpen:true,naturalBreathing:true,textVersion:true,stopAnytime:true},
    disclaimer:lang==='ru'?'Практика самопомощи не заменяет психологическую или медицинскую помощь.':'This self-help practice does not replace professional psychological or medical support.',
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
        en.aphorism&&ru.aphorism&&en.ritual&&ru.ritual
    }).every(Boolean))
}
