// Holistic House original coaching intake — adapted from the author's public questionnaire.
// Source: https://docs.google.com/forms/d/e/1FAIpQLSeqk1zGYGxiOYOh9bwRCPN-6blFfeOFFv7bp8za4VeoVHaIrw/viewform
// Reflection prompts, NOT scored psychometric assessments or medical diagnoses.
export const COACHING_INTAKE_VERSION = 'hh-author-coaching-intake-v1-20261023'

export const COACHING_TOPICS = [
  { id: 'personal', label: { en: 'My personal situation', ru: 'Личная ситуация', es: 'Mi situación personal' } },
  { id: 'wellbeing', label: { en: 'Wellbeing and energy', ru: 'Самочувствие и ресурс', es: 'Bienestar y energía' } },
  { id: 'relationships', label: { en: 'Stress & relationships', ru: 'Стресс и отношения', es: 'Estrés y relaciones' } },
  { id: 'career', label: { en: 'Work & career', ru: 'Работа и карьера', es: 'Trabajo y carrera' } },
  { id: 'business', label: { en: 'Money & business', ru: 'Деньги и бизнес', es: 'Dinero y negocios' } },
  { id: 'goal', label: { en: 'A goal or decision', ru: 'Цель или решение', es: 'Meta o decisión' } },
  { id: 'other', label: { en: 'Something else', ru: 'Другая тема', es: 'Otro tema' } },
]

// Only a public category may cross the entry link; never copy arbitrary query data.
export function coachingIntakeEntryTopic(search) {
  const topic = new URLSearchParams(search).get('topic')
  return topic && COACHING_TOPICS.some(item => item.id === topic) ? topic : 'personal'
}

export const COACHING_GROUPS = [
  { id: 'focus',
    title: { en: 'Your starting point', ru: 'С чего начинаем', es: 'Tu punto de partida' },
    hint: { en: 'Bring one situation that matters right now.', ru: 'Выберите одну ситуацию, важную сейчас.', es: 'Elige una situación importante en este momento.' } },
  { id: 'reality',
    title: { en: 'What is happening now', ru: 'Что происходит сейчас', es: 'Qué está pasando ahora' },
    hint: { en: 'Your experience matters more than a perfect answer.', ru: 'Важен ваш опыт, а не идеальные ответы.', es: 'Tu experiencia importa más que una respuesta perfecta.' } },
  { id: 'possibilities',
    title: { en: 'Goal, meaning & resources', ru: 'Цель, смысл и ресурсы', es: 'Meta, sentido y recursos' },
    hint: { en: 'Notice what you already have and what could help.', ru: 'Посмотрите, что у вас уже есть и что может помочь.', es: 'Observa con qué cuentas y qué puede ayudarte.' } },
  { id: 'session',
    title: { en: 'Your session, your questions', ru: 'Ваша сессия, ваши вопросы', es: 'Tu sesión, tus preguntas' },
    hint: { en: 'Make a practical outcome and one main question visible.', ru: 'Уточните результат и один главный вопрос.', es: 'Define un resultado práctico y una pregunta principal.' } },
]

// Keep existing field IDs stable: old encrypted v1 drafts remain readable without data migration.
// Split-out answers use additive IDs; never guess or split a person's older free-text answer.
export const COACHING_FIELDS = [
  { id: 'request', group: 'focus', required: true, max: 1600, label: {
    en: 'What would you like to explore?',
    ru: 'Какой вопрос вы хотите прояснить?',
    es: '¿Qué te gustaría explorar?' } },
  { id: 'occupation', group: 'focus', required: false, max: 800, label: {
    en: 'What are you doing at the moment?',
    ru: 'Чем вы сейчас занимаетесь?',
    es: '¿A qué te dedicas actualmente?' } },
  { id: 'concern', group: 'focus', required: false, max: 1400, label: {
    en: 'What worries you most right now?',
    ru: 'Что вас сейчас беспокоит?',
    es: '¿Qué te preocupa ahora?' } },
  { id: 'concernDuration', group: 'focus', required: false, max: 800, label: {
    en: 'How long has this been going on?',
    ru: 'Как давно это продолжается?',
    es: '¿Desde cuándo te ocurre?' } },
  { id: 'attempts', group: 'reality', required: false, max: 1400, label: {
    en: 'What have you already tried?',
    ru: 'Что вы уже пробовали сделать?',
    es: '¿Qué has intentado ya?' } },
  { id: 'attemptsResult', group: 'reality', required: false, max: 1400, label: {
    en: 'What was the result of those attempts?',
    ru: 'Каким был результат ваших попыток?',
    es: '¿Qué resultado tuvieron tus intentos?' } },
  { id: 'biggestDifficulty', group: 'reality', required: false, max: 1400, label: {
    en: 'What is the hardest part of this situation?',
    ru: 'Что сейчас самое сложное в этой ситуации?',
    es: '¿Qué es lo más difícil de esta situación?' } },
  { id: 'alreadyDone', group: 'reality', required: false, max: 1400, label: {
    en: 'What steps have you already taken toward your goal?',
    ru: 'Какие шаги к цели вы уже сделали?',
    es: '¿Qué pasos has dado hacia tu meta?' } },
  { id: 'currentResults', group: 'reality', required: false, max: 1400, label: {
    en: 'What has already worked?',
    ru: 'Что уже получилось?',
    es: '¿Qué ha funcionado hasta ahora?' } },
  { id: 'idealOutcome', group: 'possibilities', required: true, max: 1400, label: {
    en: 'What result would you like to achieve?',
    ru: 'Какого результата вы хотите достичь?',
    es: '¿Qué resultado deseas conseguir?' } },
  { id: 'importance', group: 'possibilities', required: false, max: 1200, label: {
    en: 'Why is this goal important to you?',
    ru: 'Почему эта цель важна для вас?',
    es: '¿Por qué es importante esta meta para ti?' } },
  { id: 'expectedChange', group: 'possibilities', required: false, max: 1200, label: {
    en: 'What will change when you reach this goal?',
    ru: 'Что изменится, когда вы достигнете этой цели?',
    es: '¿Qué cambiará cuando alcances esta meta?' } },
  { id: 'resources', group: 'possibilities', required: false, max: 1400, label: {
    en: 'Which personal strengths can you rely on?',
    ru: 'На какие свои сильные стороны вы можете опереться?',
    es: '¿En qué fortalezas personales puedes apoyarte?' } },
  { id: 'existingSupport', group: 'possibilities', required: false, max: 1000, label: {
    en: 'What support do you already have?',
    ru: 'Какая поддержка у вас уже есть?',
    es: '¿Con qué apoyo cuentas ya?' } },
  { id: 'paths', group: 'possibilities', required: false, max: 1400, label: {
    en: 'What next step seems possible?',
    ru: 'Какой следующий шаг вам кажется возможным?',
    es: '¿Qué próximo paso te parece posible?' } },
  { id: 'helpers', group: 'possibilities', required: false, max: 1000, label: {
    en: 'Who could help you?',
    ru: 'Кто мог бы вам помочь?',
    es: '¿Quién podría ayudarte?' } },
  { id: 'sessionOutcome', group: 'session', required: false, max: 1200, label: {
    en: 'What would make a coaching session useful to you?',
    ru: 'Какой результат коуч-сессии был бы вам полезен?',
    es: '¿Qué haría útil una sesión de coaching para ti?' } },
  { id: 'successEvidence', group: 'session', required: false, max: 1000, label: {
    en: 'How will you recognise progress?',
    ru: 'По каким признакам вы поймёте, что продвигаетесь?',
    es: '¿Cómo reconocerás tu progreso?' } },
  { id: 'priorityQuestion', group: 'session', required: true, max: 900, label: {
    en: 'What is your main question for the session?',
    ru: 'Какой главный вопрос вы хотите обсудить на сессии?',
    es: '¿Cuál es tu pregunta principal para la sesión?' } },
  { id: 'extraContext', group: 'session', required: false, max: 1600, label: {
    en: 'What else should the coach know?',
    ru: 'Что ещё важно знать коучу?',
    es: '¿Qué más debería saber el coach?' } },
]

export const COACHING_FIELD_IDS = Object.freeze(COACHING_FIELDS.map(item => item.id))
