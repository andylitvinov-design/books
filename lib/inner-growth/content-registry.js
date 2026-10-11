// Original, version-pinned Holistic House bilingual self-help content.
// All 6 x 14 chapters have distinct authored objectives, guided scripts, and real-life practices.
import { CALM_DAYS } from '../../data/inner-growth/calm-days.js'
import { SUPPORT_DAYS } from '../../data/inner-growth/support-days.js'
import { EMOTION_DAYS } from '../../data/inner-growth/emotion-days.js'
import { CLARITY_DAYS } from '../../data/inner-growth/clarity-days.js'
import { RELATIONSHIP_DAYS } from '../../data/inner-growth/relationship-days.js'
import { ENERGY_DAYS } from '../../data/inner-growth/energy-days.js'
import { SHARED_DAYS } from '../../data/inner-growth/shared-days.js'
import { GROWTH_GOALS } from './course-model.js'

export const COURSE_CONTENT_VERSION = 'hh-inner-growth-14-v1'
export const COURSE_TRACKS = Object.freeze({
  calm_regulation: CALM_DAYS,
  inner_support: SUPPORT_DAYS,
  emotional_flexibility: EMOTION_DAYS,
  attention_clarity: CLARITY_DAYS,
  connection_boundaries: RELATIONSHIP_DAYS,
  energy_agency: ENERGY_DAYS,
})
export const COURSE_COUNT = Object.values(COURSE_TRACKS).reduce((n,days) => n+days.length,0)
const T = (value,locale) => value?.[locale === 'ru' ? 1 : 0] || ''
const OPTIONAL_SHORT = {
  en: 'If you prefer a shorter version, remain in the room, look at two objects, read the one-sentence lesson, and do only the first small step. You may stop at any point.',
  ru: 'Если хочется короткий вариант, оставайтесь в комнате, посмотрите на два предмета, прочитайте главную мысль и выполните только первый маленький шаг. Остановиться можно в любой момент.',
}

export function reviewedCourseCard(goal,day,locale='en') {
  if (!Number.isInteger(day) || day<1 || day>14) return null
  const track=COURSE_TRACKS[goal], item=track?.[day-1], shared=SHARED_DAYS[day-1]
  if(!item || !shared) return null
  const language=locale==='ru'?'ru':'en'
  return {
    id:`${COURSE_CONTENT_VERSION}:${goal}:${day}`,version:COURSE_CONTENT_VERSION,
    goal,day,phase:shared.phase,source:'Holistic House · original reviewed self-help script',
    title:T(item.title,language),goalTitle:GROWTH_GOALS[goal].title[language],
    aphorism:T(shared.quote,language),teaching:T(item.teaching,language),
    practice:T(item.guide,language),ritual:T(item.action,language),
    reflection:T(shared.reflection,language),quick:OPTIONAL_SHORT[language],
    durationMinutes:6,quickMinutes:2,
    // The participant-led reading/imagery/pause makes a ~6 minute practice.
    // No claim of six minutes of spoken audio, which does not exist yet.
    phases: language==='ru'
      ? [
        {title:'Ориентация',seconds:45,body:'Посмотрите вокруг. Можно держать глаза открытыми и дышать естественно.'},
        {title:'Направленная практика',seconds:145,body:T(item.guide,language)},
        {title:'Спокойная пауза',seconds:65,body:'Побудьте с комфортной частью упражнения. Ничего особенного не нужно достигать.'},
        {title:'Завершение',seconds:40,body:'Отметьте своё окружение, вернитесь к обычной активности. При желании остановитесь раньше.'},
      ]
      : [
        {title:'Orientation',seconds:45,body:'Look around. Eyes may stay open and your breath can remain natural.'},
        {title:'Guided practice',seconds:145,body:T(item.guide,language)},
        {title:'Comfortable pause',seconds:65,body:'Stay with any acceptable part of the exercise. There is no required feeling or outcome.'},
        {title:'Integration',seconds:40,body:'Notice your surroundings again and return to ordinary activity. Stopping early is always welcome.'},
      ],
  }
}
