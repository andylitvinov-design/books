import { AppError, onlyKeys } from '../assessments/contracts.js'
import {
  ENERGYWORK_KEY, ENERGYWORK_VERSION, ENERGYWORK_LESSON_STARTS,
} from '../../data/academy/energywork-ai-schema.js'

export const LEARNING_PATH_SCHEMA = '1.0'
export const LEARNING_PATH_COURSE = ENERGYWORK_KEY
export const LEARNING_PATH_COURSE_VERSION = ENERGYWORK_VERSION
export const LEARNING_PATH_LOCALES = Object.freeze(['en', 'ru', 'es'])
const BASELINES = ['beginner', 'intermediate', 'advanced']
const FORMATS = ['read', 'watch', 'listen', 'practice', 'mixed']
const MENTORS = ['self_guided', 'optional_human']
const OBSTACLES = ['time', 'attention', 'pace', 'other']

// IDs are checked against the published, versioned course schema at import time.
// The last learning step is *information about requesting* a human initiation,
// never an automatically granted initiation or certification.
const canonicalIds = ['flight-01', 'tan-01', 'kun-01', 'ygg-01', 'paths-01']
if (canonicalIds.some((id, i) => ENERGYWORK_LESSON_STARTS[i] !== id)) {
  throw new Error('LEARNING_PATH_REIKI_SOURCE_VERSION_MISMATCH')
}
export const LEARNING_PATH_LESSONS = Object.freeze(canonicalIds.map((id, index) =>
  Object.freeze({ id, order: index + 1, minutes: 25 })
))
const LABELS = Object.freeze({
  en: ['Flight to the Sun', 'Tantra Reiki', 'Kundalini Reiki', 'Reiki Yggdrasil', 'Personal initiation: how to request it', 'Review your learning'],
  ru: ['Полёт к Солнцу', 'Тантра Рейки', 'Кундалини Рейки', 'Рейки Иггдрасиль', 'Личная инициация: как обратиться к мастеру', 'Повторение изученного'],
  es: ['Vuelo hacia el Sol', 'Tantra Reiki', 'Kundalini Reiki', 'Reiki Yggdrasil', 'Iniciación personal: cómo solicitarla', 'Repaso de lo aprendido'],
})
const REVIEW = Object.freeze({
  en: 'Review what you learned and identify one next practice.',
  ru: 'Повторите изученное и выберите одну практику для продолжения.',
  es: 'Repasa lo aprendido y elige una práctica para continuar.',
})

function string(value, min, max) {
  if (typeof value !== 'string' || value.trim().length < min ||
      [...value].length > max || /[\u0000-\u001f]/u.test(value)) {
    throw new AppError('INVALID_LEARNING_INTERVIEW', 400)
  }
  return value.trim()
}

export function validateLearningInterview(raw) {
  onlyKeys(raw, [
    'locale', 'goal', 'baseline', 'experience', 'outcome',
    'minutesPerWeek', 'weeks', 'format', 'obstacles', 'mentorPreference',
  ])
  const locale = raw.locale
  if (!LEARNING_PATH_LOCALES.includes(locale) ||
      !BASELINES.includes(raw.baseline) ||
      !FORMATS.includes(raw.format) ||
      !MENTORS.includes(raw.mentorPreference) ||
      !Number.isInteger(raw.weeks) || raw.weeks < 4 || raw.weeks > 6 ||
      !Number.isInteger(raw.minutesPerWeek) ||
      raw.minutesPerWeek < 30 || raw.minutesPerWeek > 600 ||
      !Array.isArray(raw.obstacles) || raw.obstacles.length > 4 ||
      new Set(raw.obstacles).size !== raw.obstacles.length ||
      raw.obstacles.some(value => !OBSTACLES.includes(value))) {
    throw new AppError('INVALID_LEARNING_INTERVIEW', 400)
  }
  return {
    locale,
    goal: string(raw.goal, 10, 400),
    baseline: raw.baseline,
    experience: string(raw.experience, 0, 500),
    outcome: string(raw.outcome, 5, 300),
    minutesPerWeek: raw.minutesPerWeek,
    weeks: raw.weeks,
    format: raw.format,
    obstacles: [...raw.obstacles],
    mentorPreference: raw.mentorPreference,
  }
}

export function makeLearningPlan(interview) {
  const input = validateLearningInterview(interview)
  const sourceLocale = input.locale === 'es' ? 'en' : input.locale
  const weeks = Array.from({ length: input.weeks }, (_, index) => ({
    index: index + 1, plannedMinutes: 0, steps: [],
  }))
  for (const lesson of LEARNING_PATH_LESSONS) {
    const weekIndex = input.weeks === 4
      ? Math.min(3, lesson.order - 1)
      : lesson.order - 1
    const step = {
      key: lesson.id,
      kind: 'academy_lesson',
      title: LABELS[input.locale][lesson.order - 1],
      minutesEstimated: lesson.minutes,
      sourceId: lesson.id,
      sourceCourseId: LEARNING_PATH_COURSE,
      sourceVersion: LEARNING_PATH_COURSE_VERSION,
      sourceLocale,
      href: '/' + sourceLocale + '/academy/principles-of-energywork/learn',
      completionRule: 'self_reported',
      teacherApproval: false,
    }
    weeks[weekIndex].steps.push(step)
    weeks[weekIndex].plannedMinutes += step.minutesEstimated
  }
  if (input.weeks === 6) {
    weeks[5].steps.push({
      key: 'review-6', kind: 'reflection', title: LABELS[input.locale][5],
      description: REVIEW[input.locale],
      minutesEstimated: 15, sourceId: null,
      completionRule: 'self_reported', teacherApproval: false,
    })
    weeks[5].plannedMinutes = 15
  }
  if (weeks.some(week => week.plannedMinutes > input.minutesPerWeek)) {
    throw new AppError('PLAN_UNFEASIBLE', 409)
  }
  return {
    schemaVersion: LEARNING_PATH_SCHEMA, locale: input.locale,
    sourceCourseId: LEARNING_PATH_COURSE, sourceVersion: LEARNING_PATH_COURSE_VERSION,
    horizonWeeks: input.weeks, minutesPerWeek: input.minutesPerWeek,
    weeks, totalMinutes: weeks.reduce((sum, week) => sum + week.plannedMinutes, 0),
    budgetVerified: true, mode: 'rules', certificationGranted: false,
  }
}
export function validLearningStep(plan, stepKey) {
  return typeof stepKey === 'string' && plan?.weeks?.some(
    week => week.steps?.some(step => step.key === stepKey),
  ) === true
}

const TUTOR_COPY = {
  ru: {
    explain: 'Откройте материал урока и начните с одной небольшой практики. После неё своими словами сформулируйте, что удалось заметить. Это учебное сопровождение по программе Академии, не оценка здоровья.',
    hint: 'Подсказка: сначала назовите одну мысль из материала, затем приведите свой пример. Можно остановиться и вернуться к заданию позднее.',
    example: 'Пример записи: «Я изучил(а) тему и попробовал(а) упражнение. Я заметил(а) … . Следующий небольшой шаг — …».',
    review: 'Сравните своё объяснение с материалом урока. Я не могу автоматически подтвердить освоение навыка: отметку выполнения вы ставите самостоятельно, а квалификацию подтверждает только мастер.',
  },
  en: {
    explain: 'Open the lesson and start with one small practice. Afterward, describe in your own words what you noticed. This is educational support, not a health assessment.',
    hint: 'Hint: name one idea from the material, then give your own example. You may pause and return later.',
    example: 'Example reflection: “I studied the topic and tried the exercise. I noticed … . My next small step is … .”',
    review: 'Compare your explanation with the source lesson. I cannot automatically verify mastery; your progress mark is self-reported, and a practitioner alone decides professional approval.',
  },
  es: {
    explain: 'Abre la lección y empieza con una práctica pequeña. Después describe con tus palabras lo que observaste. Es apoyo educativo, no una evaluación de salud.',
    hint: 'Pista: nombra una idea del material y aporta un ejemplo propio. Puedes hacer una pausa y volver después.',
    example: 'Ejemplo de reflexión: «Estudié el tema y probé el ejercicio. Noté … . Mi siguiente paso pequeño será …».',
    review: 'Compara tu explicación con la lección. No puedo verificar automáticamente el dominio de la habilidad: tu marca es una autoevaluación, y solo un maestro puede aprobar la acreditación.',
  },
}
export function learningTutorFallback({ locale, action, stepKey, question = '' }) {
  if (!LEARNING_PATH_LOCALES.includes(locale) ||
      !['explain', 'hint', 'example', 'review'].includes(action) ||
      (stepKey !== 'review-6' && !canonicalIds.includes(stepKey)) ||
      typeof question !== 'string' || question.length > 1200) {
    throw new AppError('INVALID_TUTOR_TURN', 400)
  }
  const title = LABELS[locale][canonicalIds.indexOf(stepKey)] || LABELS[locale][5]
  return {
    mode: 'rules',
    verifiedLearning: false,
    stepKey,
    title,
    answer: TUTOR_COPY[locale][action],
    sourceId: stepKey === 'review-6' ? null : stepKey,
    providerCalled: false,
  }
}
