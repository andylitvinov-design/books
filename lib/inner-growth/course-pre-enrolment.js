// Static, anonymous preview of the authored 14-day learning arc.
// Uses the same day headings as the real course library, without exposing
// any signed-in measurements, test choices or confidential information.
import { COURSE_JOURNEY } from '../../data/inner-growth/course-journey.js'

export const COURSE_PRE_ENROLMENT_PHASES = Object.freeze([
  Object.freeze({
    id: 'understanding', start: 1, end: 3,
    title: Object.freeze({ en: 'Understand your patterns', ru: 'Понять свои реакции' }),
    summary: Object.freeze({
      en: 'Choose a goal, notice your reactions and recognise familiar inner rules.',
      ru: 'Выбрать цель, заметить привычные реакции и внутренние правила.',
    }),
  }),
  Object.freeze({
    id: 'support', start: 4, end: 7,
    title: Object.freeze({ en: 'Find support and flexibility', ru: 'Найти опору и гибкость' }),
    summary: Object.freeze({
      en: 'Practise a safe pause, try gentle alternatives and reflect on week one.',
      ru: 'Освоить паузу, попробовать мягкие альтернативы и подвести итоги недели.',
    }),
  }),
  Object.freeze({
    id: 'action', start: 8, end: 11,
    title: Object.freeze({ en: 'Bring skills into daily life', ru: 'Применить навыки в жизни' }),
    summary: Object.freeze({
      en: 'Turn personal values into small actions, practical cues and supportive choices.',
      ru: 'Связать ценности с небольшими действиями, подсказками и доступной поддержкой.',
    }),
  }),
  Object.freeze({
    id: 'integration', start: 12, end: 14,
    title: Object.freeze({ en: 'Make the skills your own', ru: 'Закрепить и продолжить' }),
    summary: Object.freeze({
      en: 'Build your toolkit, choose what fits and plan a gentle way forward.',
      ru: 'Собрать личный набор навыков, выбрать подходящее и наметить продолжение.',
    }),
  }),
])

export function coursePreEnrolmentPlan(locale = 'en') {
  const lang = locale === 'ru' ? 'ru' : 'en'
  return COURSE_PRE_ENROLMENT_PHASES.map(phase => ({
    id: phase.id,
    start: phase.start,
    end: phase.end,
    title: phase.title[lang],
    summary: phase.summary[lang],
    days: COURSE_JOURNEY.slice(phase.start - 1, phase.end)
      .map(day => ({
        day: day.day,
        title: day.heading[lang],
      })),
  }))
}
