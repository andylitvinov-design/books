// Holistic House original coaching intake — adapted from the author's public questionnaire.
// Source: https://docs.google.com/forms/d/e/1FAIpQLSeqk1zGYGxiOYOh9bwRCPN-6blFfeOFFv7bp8za4VeoVHaIrw/viewform
// Reflection prompts, NOT scored psychometric assessments or medical diagnoses.
export const COACHING_INTAKE_VERSION = 'hh-author-coaching-intake-v1-20261023'

export const COACHING_TOPICS = [
  { id: 'personal', label: { en: 'My personal situation', ru: 'Личная ситуация', es: 'Mi situación personal' } },
  { id: 'relationships', label: { en: 'Stress & relationships', ru: 'Стресс и отношения', es: 'Estrés y relaciones' } },
  { id: 'career', label: { en: 'Work & career', ru: 'Работа и карьера', es: 'Trabajo y carrera' } },
  { id: 'business', label: { en: 'Money & business', ru: 'Деньги и бизнес', es: 'Dinero y negocios' } },
  { id: 'goal', label: { en: 'A goal or decision', ru: 'Цель или решение', es: 'Meta o decisión' } },
  { id: 'other', label: { en: 'Something else', ru: 'Другая тема', es: 'Otro tema' } },
]

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

export const COACHING_FIELDS = [
  { id: 'request', group: 'focus', required: true, max: 1600, label: {
    en: 'What is the main question or situation you want to explore?',
    ru: 'В чём суть вашего вопроса или ситуации?',
    es: '¿Cuál es la pregunta o situación principal que quieres explorar?' } },
  { id: 'occupation', group: 'focus', required: false, max: 800, label: {
    en: 'What are you currently doing in life or work?',
    ru: 'Чем вы сейчас занимаетесь?',
    es: '¿A qué te dedicas actualmente?' } },
  { id: 'concern', group: 'focus', required: false, max: 1400, label: {
    en: 'What concerns you, and how long has this been happening?',
    ru: 'Что беспокоит? Как давно это продолжается?',
    es: '¿Qué te preocupa y desde cuándo?' } },
  { id: 'attempts', group: 'reality', required: false, max: 1400, label: {
    en: 'What have you already tried, and what happened?',
    ru: 'Что уже пробовали сделать и каков был результат?',
    es: '¿Qué has intentado ya y cuál fue el resultado?' } },
  { id: 'biggestDifficulty', group: 'reality', required: false, max: 1400, label: {
    en: 'What is the biggest difficulty in this situation?',
    ru: 'Что сейчас самое сложное в этой ситуации?',
    es: '¿Cuál es la mayor dificultad en esta situación?' } },
  { id: 'alreadyDone', group: 'reality', required: false, max: 1400, label: {
    en: 'What progress or useful results do you already have?',
    ru: 'Что уже сделано на пути к цели? Какие результаты есть?',
    es: '¿Qué has hecho para acercarte a la meta? ¿Qué resultados tienes?' } },
  { id: 'idealOutcome', group: 'possibilities', required: true, max: 1400, label: {
    en: 'What would you like to achieve? What is your ideal outcome?',
    ru: 'Чего бы хотелось достичь? Как выглядит идеальный результат?',
    es: '¿Qué te gustaría conseguir? ¿Cómo sería el resultado ideal?' } },
  { id: 'importance', group: 'possibilities', required: false, max: 1200, label: {
    en: 'Why does this matter to you? What changes when you reach it?',
    ru: 'Зачем вам это нужно? Что изменится, когда достигнете цели?',
    es: '¿Por qué es importante? ¿Qué cambiará al lograrlo?' } },
  { id: 'resources', group: 'possibilities', required: false, max: 1400, label: {
    en: 'What strengths, skills, experience or support do you already have?',
    ru: 'Какие ресурсы, навыки, опыт и поддержка у вас уже есть?',
    es: '¿Qué recursos, habilidades, experiencia o apoyo tienes ya?' } },
  { id: 'paths', group: 'possibilities', required: false, max: 1400, label: {
    en: 'Which possible paths or people could help?',
    ru: 'Какие пути решения возможны? Кто может помочь?',
    es: '¿Qué caminos posibles o personas podrían ayudarte?' } },
  { id: 'sessionOutcome', group: 'session', required: false, max: 1200, label: {
    en: 'What would make our work together useful for you?',
    ru: 'Какой результат нашей совместной работы был бы для вас хорошим?',
    es: '¿Qué resultado haría útil nuestro trabajo conjunto?' } },
  { id: 'successEvidence', group: 'session', required: false, max: 1000, label: {
    en: 'How will you recognise progress (signals, numbers or dates)?',
    ru: 'По каким признакам, цифрам или срокам вы поймёте, что продвинулись?',
    es: '¿Cómo reconocerás el progreso (señales, cifras o fechas)?' } },
  { id: 'priorityQuestion', group: 'session', required: true, max: 900, label: {
    en: 'What is the ONE question you most want to explore in a session?',
    ru: 'Какой ОДИН вопрос вы хотите исследовать глубже всего?',
    es: '¿Cuál es la ÚNICA pregunta que más quieres explorar en la sesión?' } },
  { id: 'extraContext', group: 'session', required: false, max: 1600, label: {
    en: 'Anything else that could be useful? (optional)',
    ru: 'Что ещё важно добавить? (необязательно)',
    es: '¿Algo más que quieras añadir? (opcional)' } },
]

export const COACHING_FIELD_IDS = Object.freeze(COACHING_FIELDS.map(item => item.id))
