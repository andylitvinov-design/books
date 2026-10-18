import { filterExplorerEntries } from './test-explorer.js'
import { normalizeProblemsForTopics, relevanceForSelectedProblems } from './test-problems.js'
import { testCollectionAffinity } from './test-collection-membership.js'

// Editorial discovery presets, not clinical categories or automatic test plans.
// Only source-backed, rights-cleared questionnaires appear in each collection.
const collection = (id, focus, title, detail, tone) => Object.freeze({
  id, focus: Object.freeze(focus), title: Object.freeze(title),
  detail: Object.freeze(detail), tone,
})

export const TEST_TOPIC_COLLECTIONS = Object.freeze([
  collection('stress', ['stress', 'anxiety'],
    { en: 'Stress & anxiety', ru: 'Стресс и тревога', es: 'Estrés y ansiedad' },
    { en: 'Pressure, worry and calm', ru: 'Напряжение и спокойствие', es: 'Tensión y calma' }, 'sky'),
  collection('relationships', ['relationships', 'intimacy'],
    { en: 'Love & relationships', ru: 'Любовь и отношения', es: 'Amor y relaciones' },
    { en: 'Trust, closeness and dialogue', ru: 'Доверие, близость, общение', es: 'Confianza y cercanía' }, 'rose'),
  collection('tantra', ['tantra'],
    { en: 'Tantra & sensuality', ru: 'Тантра и чувственность', es: 'Tantra y sensualidad' },
    { en: 'Presence, embodiment and joy', ru: 'Присутствие, тело, радость', es: 'Presencia y sensaciones' }, 'violet'),
  collection('sexuality', ['sexuality'],
    { en: 'Sexuality & boundaries', ru: 'Сексуальность и границы', es: 'Sexualidad y límites' },
    { en: 'Self-acceptance and choice', ru: 'Принятие себя и выбор', es: 'Autoaceptación y elección' }, 'pink'),
  collection('sleep', ['sleep'],
    { en: 'Sleep & recovery', ru: 'Сон и восстановление', es: 'Sueño y descanso' },
    { en: 'Rest and daily rhythm', ru: 'Отдых и ритм жизни', es: 'Descanso y ritmo diario' }, 'indigo'),
  collection('resources', ['resources'],
    { en: 'Inner resources', ru: 'Внутренние ресурсы', es: 'Recursos interiores' },
    { en: 'Support and resilience', ru: 'Опора и устойчивость', es: 'Apoyo y resiliencia' }, 'mint'),
  collection('personality', ['personality'],
    { en: 'Personality & patterns', ru: 'Личность и паттерны', es: 'Personalidad y patrones' },
    { en: 'Traits and strengths', ru: 'Черты и сильные стороны', es: 'Rasgos y fortalezas' }, 'gold'),
  collection('mood', ['mood'],
    { en: 'Mood & emotions', ru: 'Настроение и эмоции', es: 'Ánimo y emociones' },
    { en: 'Feelings and self-awareness', ru: 'Чувства и самопонимание', es: 'Sentimientos y conciencia' }, 'peach'),
  collection('attention', ['attention', 'function'],
    { en: 'Focus & daily life', ru: 'Внимание и дела', es: 'Concentración y rutina' },
    { en: 'Attention and habits', ru: 'Концентрация и привычки', es: 'Atención y hábitos' }, 'sky'),
  collection('body', ['body'],
    { en: 'Body awareness', ru: 'Телесная осознанность', es: 'Conciencia corporal' },
    { en: 'Energy and body signals', ru: 'Энергия и сигналы тела', es: 'Energía y sensaciones' }, 'mint'),
  collection('meaning', ['meaning'],
    { en: 'Meaning & direction', ru: 'Смысл и направление', es: 'Sentido y dirección' },
    { en: 'Values and personal goals', ru: 'Ценности и личные цели', es: 'Valores y metas' }, 'gold'),
  collection('wellbeing', ['health'],
    { en: 'Everyday wellbeing', ru: 'Самочувствие и здоровье', es: 'Bienestar cotidiano' },
    { en: 'Daily energy and balance', ru: 'Энергия и баланс', es: 'Energía y equilibrio' }, 'peach'),
])

// Editorial collections react to prior choices, without pretending to diagnose.
export function availableTestCollections(entries, preferences = {}) {
  if (!Array.isArray(entries)) return []
  const focus = [...new Set(Array.isArray(preferences.focus) ? preferences.focus : [])]
  const problems = normalizeProblemsForTopics(preferences.problems, focus)
  const kinds = Array.isArray(preferences.kinds) ? preferences.kinds : []
  const maxMinutes = Number(preferences.maxMinutes) || 0
  const depth = ['quick', 'balanced', 'deep'].includes(preferences.depth) ? preferences.depth : 'balanced'
  return TEST_TOPIC_COLLECTIONS.map((preset, originalIndex) => {
    const available = filterExplorerEntries(entries, {
      availability: 'available', kinds, maxMinutes,
    }).filter((entry) => entry.selectable && testCollectionAffinity(entry, preset.id) > 0)
    const sharedTopics = preset.focus.filter((key) => focus.includes(key)).length
    const relatedTests = focus.length
      ? available.filter((entry) => filterExplorerEntries([entry], { availability: 'available', focus }).length > 0).length : 0
    const relatedConcerns = problems.length
      ? Math.max(0, ...available.map((entry) => relevanceForSelectedProblems(entry, problems))) : 0
    const depthFit = depth === 'balanced' ? 0 : available.filter((entry) => entry.depth === depth).length
    // Fresh visitors see editorial order; selected themes and concerns reorder it.
    const priority = sharedTopics * 100 + relatedConcerns * 45 +
      (available.length ? relatedTests / available.length * 25 + depthFit / available.length * 10 : 0)
    return { ...preset, count: available.length, priority, originalIndex }
  }).filter((preset) => preset.count > 0)
    .sort((a, b) => b.priority - a.priority || a.originalIndex - b.originalIndex)
    .map(({ priority, originalIndex, ...preset }) => preset)
}

 // A tantra collection is a deliberate, small selection of existing cleared
 // instruments, never a new composite score or an automatic enrolment.
 const tantraPath = (id, keys, title, detail, tone) => Object.freeze({
   id, keys: Object.freeze(keys), title: Object.freeze(title),
   detail: Object.freeze(detail), tone,
 })
 export const TANTRA_TEST_PATHS = Object.freeze([
   tantraPath('gentle-start', ['hh-tantra-presence'],
     {en:'Begin with presence',ru:'Начать с присутствия',es:'Empezar con presencia'},
     {en:'Express self-reflection without pressure',ru:'Быстрый тест на присутствие без давления',es:'Reflexión breve y tranquila'},'sky'),
   tantraPath('body-sensitivity', ['hh-tantric-energy-sensitivity','hh-sensual-joy'],
     {en:'Body & sensitivity',ru:'Тело и чувствительность',es:'Cuerpo y sensibilidad'},
     {en:'Breath, bodily signals and everyday enjoyment',ru:'Дыхание, ощущения и повседневная радость',es:'Respiración, sensaciones y bienestar'},'mint'),
   tantraPath('heart-connection', ['hh-tantric-intimacy-connection','hh-emotional-intimacy'],
     {en:'Heart & connection',ru:'Сердце и близость',es:'Corazón y conexión'},
     {en:'Presence, trust and an optional pace of closeness',ru:'Доверие, контакт и комфортный темп близости',es:'Confianza, presencia y cercanía'},'rose'),
   tantraPath('healthy-boundaries', ['hh-intimacy-consent','hh-trust-dialogue'],
     {en:'Choice & boundaries',ru:'Выбор и границы',es:'Elección y límites'},
     {en:'Dialogue, choice and mutual respect, never a consent rating',ru:'Диалог и уважение границ, не оценка согласия',es:'Diálogo y respeto, no una prueba de consentimiento'},'gold'),
   tantraPath('freedom-kindness', ['hh-sexual-freedom-inhibition','hh-sexual-self-kindness'],
     {en:'Freedom & self-acceptance',ru:'Свобода и принятие себя',es:'Libertad y autoaceptación'},
     {en:'Shame, comfort and freedom from performance pressure',ru:'Смущение, комфорт и свобода от давления',es:'Vergüenza, comodidad y elección'},'pink'),
   tantraPath('chakra-symbols', ['hh-chakra-kundalini-profile'],
     {en:'Seven symbolic chakras',ru:'Семь символических чакр',es:'Siete chakras simbólicos'},
     {en:'Seven self-reflection themes, not measured energy',ru:'Семь тем самонаблюдения, не измерение энергии',es:'Siete temas simbólicos, no energía medida'},'violet'),
   tantraPath('five-practice-themes', ['hh-tantra-development-levels'],
     {en:'Tantra L1–L5 themes',ru:'Темы практики L1–L5',es:'Temas de práctica L1–L5'},
     {en:'Safety, connection, freedom and integration; no ranks',ru:'Безопасность, близость, свобода и интеграция',es:'Seguridad, conexión y expresión'},'indigo'),
   tantraPath('aftercare-check-in', ['hh-weekly-pulse','hh-body-signals'],
     {en:'Integration & aftercare',ru:'Интеграция после практики',es:'Integración y cuidado posterior'},
     {en:'Observe weekly wellbeing and body signals; no cause-and-effect claim',
      ru:'Еженедельное самочувствие и ощущения без утверждений о причине изменений',
      es:'Bienestar semanal y sensaciones sin atribuir causas'},'mint'),
   tantraPath('deep-portrait', ['hh-tantric-personality-portrait'],
     {en:'Complete tantric portrait',ru:'Большой тантрический портрет',es:'Retrato tántrico completo'},
     {en:'64 questions and 8 independent descriptive dimensions',ru:'64 вопроса и 8 независимых описательных шкал',es:'64 preguntas y 8 escalas descriptivas'},'rose'),
 ])
 export function availableTantraTestPaths(entries) {
   if (!Array.isArray(entries)) return []
   const cleared = new Map(entries.filter(entry =>
     entry?.selectable === true && entry?.startable === true &&
     entry?.rightsStatus === 'cleared' && entry?.definition).map(entry => [entry.key, entry]))
   return TANTRA_TEST_PATHS.flatMap(preset => {
     const tests = preset.keys.map(key => cleared.get(key))
     if (tests.some(test => !test)) return [] // never silently substitute a test
     return [{
       ...preset, testCount: tests.length,
       questionCount: tests.reduce((sum,test) => sum + (test.questionCount || 0), 0),
       durationMinutes: tests.reduce((sum,test) => sum + (test.durationMinutes || 0), 0),
       scaleCount: tests.reduce((sum,test) => sum + (test.scaleGuide?.scales?.length || 0), 0),
     }]
   })
 }
