import { filterExplorerEntries } from './test-explorer.js'

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

export function availableTestCollections(entries) {
  if (!Array.isArray(entries)) return []
  return TEST_TOPIC_COLLECTIONS.map((preset) => ({
    ...preset,
    count: filterExplorerEntries(entries, { availability: 'available', focus: preset.focus })
      .filter((entry) => entry.selectable).length,
  })).filter((preset) => preset.count > 0)
}
