// Original Holistic House self-reflection content. No automated diagnosis or clinical cutoffs.
import { interpretConcern } from '../assessments/personal-guidance.js'

// This module is deliberately pure; client and server use the same reviewed mappings.
export const GROWTH_GOALS = Object.freeze({
  calm_regulation: {
    title: { en: 'Calm & grounding', ru: 'Спокойствие и заземление' },
    description: { en: 'Practise noticing tension and finding a manageable point of steadiness.', ru: 'Учиться замечать напряжение и находить доступную точку устойчивости.' },
    grounding: { en: 'Feel the contact of your feet with the floor. Look around and name three objects. Let your breathing find its own comfortable rhythm.', ru: 'Ощутите контакт стоп с полом. Осмотритесь и назовите три предмета. Позвольте дыханию идти в удобном для вас ритме.' },
    ritual: { en: 'Draw a small circle around one thing that helps you feel grounded today.', ru: 'Обведите кружком одну вещь, которая сегодня помогает вам почувствовать опору.' },
  },
  inner_support: {
    title: { en: 'Inner support', ru: 'Внутренняя опора' },
    description: { en: 'Develop a kinder inner voice and everyday self-support.', ru: 'Развивать доброжелательный внутренний диалог и поддержку себя.' },
    grounding: { en: 'Notice where your body is comfortably supported. Imagine speaking to yourself as to a friend you respect.', ru: 'Заметьте, где тело ощущает комфортную опору. Представьте, что обращаетесь к себе как к другу, которого уважаете.' },
    ritual: { en: 'Write one supportive phrase you would like to hear and keep it nearby.', ru: 'Запишите одну поддерживающую фразу, которую хотели бы услышать, и сохраните рядом.' },
  },
  emotional_flexibility: {
    title: { en: 'Emotional balance', ru: 'Эмоциональный баланс' },
    description: { en: 'Learn to name feelings and choose a response without judging them.', ru: 'Учиться распознавать чувства и выбирать реакцию без осуждения себя.' },
    grounding: { en: 'Notice any feeling present. Give it a simple name and imagine allowing a little space around it, without forcing it away.', ru: 'Заметьте присутствующее чувство. Назовите его простым словом и представьте немного пространства вокруг, не пытаясь прогнать его.' },
    ritual: { en: 'Write “I noticed…” and finish the phrase with one feeling and one need.', ru: 'Напишите «Я заметил(а)…» и дополните одной эмоцией и одной потребностью.' },
  },
  attention_clarity: {
    title: { en: 'Clarity & attention', ru: 'Ясность и внимание' },
    description: { en: 'Strengthen gentle focus and awareness of what matters now.', ru: 'Развивать мягкую сосредоточенность и осознание того, что сейчас важно.' },
    grounding: { en: 'Choose one neutral object. Notice its shape, texture and colour for a few comfortable moments, then gently widen attention again.', ru: 'Выберите нейтральный предмет. Несколько мгновений замечайте его форму, поверхность и цвет, затем мягко расширьте внимание.' },
    ritual: { en: 'Write down one small priority for today and a first possible step.', ru: 'Запишите один небольшой приоритет на сегодня и первый посильный шаг.' },
  },
  connection_boundaries: {
    title: { en: 'Connection & boundaries', ru: 'Контакт и границы' },
    description: { en: 'Practise recognizing your needs and communicating choices respectfully.', ru: 'Учиться распознавать свои потребности и уважительно обозначать выбор.' },
    grounding: { en: 'Imagine an ordinary conversation in which you feel safe to say “I need a moment” or “I prefer this”. You may keep your eyes open.', ru: 'Представьте обычный разговор, в котором вам безопасно сказать «Мне нужна пауза» или «Мне подходит другой вариант». Глаза можно держать открытыми.' },
    ritual: { en: 'Practise one simple respectful sentence that expresses a preference.', ru: 'Потренируйте одну простую и уважительную фразу о своём предпочтении.' },
  },
  energy_agency: {
    title: { en: 'Energy & agency', ru: 'Энергия и действие' },
    description: { en: 'Notice recovery needs and take small realistic steps toward chosen goals.', ru: 'Замечать потребность в восстановлении и делать небольшие реальные шаги к целям.' },
    grounding: { en: 'Notice your present energy without comparing it to yesterday. Picture one doable action and one permitted pause.', ru: 'Заметьте свою сегодняшнюю энергию без сравнения со вчерашней. Представьте одно посильное действие и одну разрешённую себе паузу.' },
    ritual: { en: 'Choose a two-minute task or a restorative pause; both count as an intentional choice.', ru: 'Выберите двухминутное дело или восстановительную паузу — оба варианта являются осознанным выбором.' },
  },
})

export const COURSE_TOPICS = Object.freeze([
  { id: 'stress', title: { en: 'Stress & tension', ru: 'Стресс и напряжение' } },
  { id: 'mood', title: { en: 'Emotions & mood', ru: 'Эмоции и настроение' } },
  { id: 'energy', title: { en: 'Energy & recovery', ru: 'Энергия и восстановление' } },
  { id: 'attention', title: { en: 'Focus & clarity', ru: 'Внимание и ясность' } },
  { id: 'relationships', title: { en: 'Relationships & boundaries', ru: 'Отношения и границы' } },
  { id: 'resources', title: { en: 'Confidence & inner support', ru: 'Уверенность и опора' } },
])

// A voluntary client-side keyword suggestion only. It does not diagnose, save or
// transmit free text. The client must confirm suggested topics before saving.
export function suggestedCourseTopics(concerns) {
  const interpreted = interpretConcern(concerns)
  const mapping = {
    anxiety: 'stress', stress: 'stress', mood: 'mood', sleep: 'energy',
    body: 'energy', clarity: 'attention', attention: 'attention',
    relationships: 'relationships', resources: 'resources',
    function: 'energy', meaning: 'resources',
  }
  return {
    urgent: interpreted.urgent,
    topics: [...new Set(interpreted.focus.map((key) => mapping[key]).filter(Boolean))].slice(0, 6),
  }
}

export const COURSE_STEPS = Object.freeze([
  { en: 'Start free', ru: 'Начать бесплатно', detail: { en: 'Agree to your personal course.', ru: 'Согласитесь начать личный курс.' } },
  { en: 'Select your areas', ru: 'Выбрать проблемные зоны', detail: { en: 'Choose topics and optionally describe a concern.', ru: 'Отметьте темы, описание по желанию.' } },
  { en: 'Confirm five tests', ru: 'Подтвердить пять тестов', detail: { en: 'See match percentages and past completion; edit the list.', ru: 'Проценты соответствия и уже пройденные тесты.' } },
  { en: 'Take missing tests', ru: 'Пройти недостающие тесты', detail: { en: 'Continue only tests you have not completed.', ru: 'Пройдите только те, которых ещё нет.' } },
  { en: 'Choose 3–5 scales', ru: 'Выбрать 3–5 шкал', detail: { en: 'Review your real scores and select focus areas.', ru: 'Посмотрите реальные шкалы и выберите приоритеты.' } },
  { en: 'Daily personal lessons', ru: 'Ежедневные практики', detail: { en: 'Gentle exercises, reflections and aphorisms.', ru: 'Медитации, упражнения и афоризмы.' } },
])

// These are reflection prompts from an ORIGINAL non-diagnostic HH weekly 0–10 check.
// The numeric bands are product ranking heuristics, never clinical norms or diagnoses.
const SCALE_SKILLS = Object.freeze([
  ['weekly.tension', 'calm_regulation', 'lower-reported-tension', 'high'],
  ['weekly.load', 'calm_regulation', 'lower-reported-load', 'high'],
  ['weekly.recovery', 'energy_agency', 'higher-reported-recovery', 'low'],
  ['weekly.energy', 'energy_agency', 'higher-reported-energy', 'low'],
  ['weekly.clarity', 'attention_clarity', 'higher-reported-clarity', 'low'],
  ['weekly.connection', 'connection_boundaries', 'higher-reported-support', 'low'],
  ['weekly.mood', 'emotional_flexibility', 'higher-reported-wellbeing', 'low'],
  ['weekly.functioning', 'energy_agency', 'higher-reported-functioning', 'low'],
])

export function growthSuggestions(results = [], locale = 'en') {
  const accepted = (Array.isArray(results) ? results : [])
    .filter((r) => r.definitionKey === 'hh-weekly-pulse' &&
      r.definitionVersion === 'v1' && r.scoringKey === 'raw-dimensions' &&
      r.scoringVersion === 'v1' && Array.isArray(r.dimensions) &&
      Number.isFinite(Date.parse(r.measurementAt)))
    .sort((a, b) => Date.parse(b.measurementAt) - Date.parse(a.measurementAt))
  const newest = accepted[0]
  if (!newest || Date.now() - Date.parse(newest.measurementAt) > 90 * 86400000) return []
  const found = new Map()
  for (const [key, goal, direction, band] of SCALE_SKILLS) {
    const d = newest.dimensions.find((dim) => dim.key === key && dim.direction === direction &&
      dim.min === 0 && dim.max === 10 && Number.isInteger(dim.value))
    if (!d || (band === 'high' ? d.value < 6 : d.value > 4)) continue
    if (found.has(goal)) continue
    found.set(goal, {
      goal, testKey: newest.definitionKey, resultId: newest.id,
      measuredAt: newest.measurementAt, scaleKey: key, response: d.value,
      reason: locale === 'ru'
        ? `По вашему ответу на шкалу «${key}» в недельном самоотчёте (${d.value}/10). Это возможное направление практики, не диагноз.`
        : `Your weekly self-report on “${key}” was ${d.value}/10. This suggests a possible practice focus, not a diagnosis.`,
    })
  }
  return [...found.values()].slice(0, 3)
}

const DAILY = Object.freeze([
  { quote: ['Не обязательно менять всё сразу. Достаточно начать замечать.', 'You do not need to change everything; noticing is a beginning.'], focus: ['Заметьте, что происходит прямо сейчас, без оценки.', 'Notice what is present right now without judging it.'], task: ['Запишите одно наблюдение о себе.', 'Write down one observation about yourself.'] },
  { quote: ['Опора может начинаться с маленькой паузы.', 'Support can begin with a small pause.'], focus: ['Почувствуйте контакт тела с поверхностью, на которой сидите.', 'Notice the support of the surface beneath you.'], task: ['Найдите одно место, где вам удобно сделать паузу.', 'Find one comfortable place to pause.'] },
  { quote: ['Чувствам можно дать имя, не отдавая им управление.', 'A feeling can be named without taking control.'], focus: ['Если удобно, назовите одну эмоцию и одно телесное ощущение.', 'If comfortable, name one emotion and one physical sensation.'], task: ['Отметьте, что помогло вам справиться с моментом.', 'Record one thing that helped in the moment.'] },
  { quote: ['Маленький выбор тоже укрепляет самостоятельность.', 'A small choice is still an act of agency.'], focus: ['Вспомните один безопасный выбор, который можете сделать сегодня.', 'Recall one safe choice you can make today.'], task: ['Сделайте одно маленькое действие в рамках своих возможностей.', 'Take one small action within your energy today.'] },
  { quote: ['Отдых — часть пути, а не его отсутствие.', 'Rest is part of progress, not the absence of it.'], focus: ['Дайте себе короткую паузу; ничего специального чувствовать не нужно.', 'Allow a pause; there is no particular feeling you need to achieve.'], task: ['Запланируйте короткое восстановление.', 'Schedule one small recovery break.'] },
  { quote: ['Бережное отношение к себе делает выбор свободнее.', 'Kindness toward yourself creates more room to choose.'], focus: ['Обратите внимание, как меняется внутренний диалог при мягком тоне.', 'Notice the tone of your inner voice, and try making it gentler.'], task: ['Напишите себе одно доброжелательное предложение.', 'Write one kind sentence to yourself.'] },
  { quote: ['Замечать изменения — не значит требовать их.', 'Observing change is not the same as demanding it.'], focus: ['Вспомните один момент недели, который был чуть легче или труднее.', 'Recall one moment this week that felt easier or harder.'], task: ['Подведите итог недели одним предложением.', 'Summarize the week in one sentence.'] },
  { quote: ['Знакомый навык можно применить по-новому.', 'A familiar skill can be used in a new way.'], focus: ['Вспомните практику, которая была приемлемой на прошлой неделе.', 'Recall a practice that felt acceptable last week.'], task: ['Попробуйте её в другой простой ситуации.', 'Try it in another low-pressure situation.'] },
  { quote: ['Устойчивость развивается через мягкую повторяемость.', 'Steadiness grows through gentle repetition.'], focus: ['Найдите одну знакомую точку опоры.', 'Find one familiar source of support.'], task: ['Свяжите практику с обычным делом дня.', 'Connect your practice with an ordinary daily activity.'] },
  { quote: ['Даже несколько секунд осознанности имеют смысл.', 'A few moments of awareness still matter.'], focus: ['Обратите внимание на звуки вокруг, не меняя дыхания.', 'Notice sounds around you without changing your breathing.'], task: ['Попробуйте короткую паузу между делами.', 'Try a short pause between activities.'] },
  { quote: ['Я могу учитывать свои потребности.', 'My needs deserve a place in my decisions.'], focus: ['Заметьте, что вам сейчас необходимо для комфорта.', 'Notice what you need for a little more comfort.'], task: ['Обозначьте одно небольшое предпочтение.', 'Express one small preference.'] },
  { quote: ['Сравнение с собой вчерашним не всегда нужно.', 'You do not always need to compare yourself to yesterday.'], focus: ['Отметьте сегодняшний уровень сил как факт, без оценки.', 'Notice today’s energy level as information, without judgment.'], task: ['Выберите реалистичный темп на остаток дня.', 'Choose a realistic pace for the rest of the day.'] },
  { quote: ['Развитие может быть спокойным и незаметным.', 'Growth can be quiet and subtle.'], focus: ['Заметьте один маленький способ поддержать себя.', 'Notice one small way to support yourself.'], task: ['Запишите навык, который хочется сохранить.', 'Write down one skill you want to keep.'] },
  { quote: ['Я могу продолжать путь в собственном темпе.', 'I can continue at my own pace.'], focus: ['Ненадолго вспомните, что нового узнали о себе.', 'Briefly recall something you learned about yourself.'], task: ['Сформулируйте один возможный следующий шаг.', 'Name one possible next step.'] },
])

export function courseDay(startedAt, durationDays = 14, now = Date.now()) {
  const timestamp = Date.parse(startedAt || '')
  if (!Number.isFinite(timestamp)) return 1
  const elapsed = Math.max(0, Number(now) - timestamp)
  return Math.min(durationDays === 28 ? 28 : 14, Math.floor(elapsed / 86400000) + 1)
}

export function courseLesson(goal, day, locale = 'en') {
  const domain = GROWTH_GOALS[goal] || GROWTH_GOALS.calm_regulation
  const index = Math.max(0, Math.floor(Number(day || 1) - 1)) % DAILY.length
  const step = DAILY[index]
  const language = locale === 'ru' ? 'ru' : 'en'
  const translated = (p) => p[language === 'ru' ? 0 : 1]
  return {
    day: Math.max(1, Number(day) || 1),
    title: domain.title[language],
    aphorism: translated(step.quote),
    teaching: translated(step.focus) + (day > 14
      ? (language === 'ru' ? ' Попробуйте применить знакомый навык в обычной ситуации.' : ' Try applying this familiar skill in an ordinary situation.')
      : ''),
    meditation: domain.grounding[language],
    ritual: domain.ritual[language] + ' ' + translated(step.task) + (day > 14
      ? (language === 'ru' ? ' Если удобно, повторите шаг в другой обстановке.' : ' If comfortable, repeat the step in another setting.')
      : ''),
    reflection: language === 'ru' ? 'Что было полезно, нейтрально или некомфортно? Вы можете пропустить ответ.' : 'What felt helpful, neutral, or uncomfortable? You may skip answering.',
    durationMinutes: 6,
    isIntegration: day > 14,
  }
}
