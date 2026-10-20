import { buildPsychPortrait } from '../assessments/psych-portrait.js'
import { verifiedHistoryView } from '../assessments/verified-history.js'
import { TEST_EXPLORER_AXIS_LABELS } from '../assessments/test-explorer.js'

// Only source-verified, recent observations may be displayed. Unlike old
// 60/45 thresholds, no arbitrary score split is called a strength or weakness.

const REFLECTIONS = Object.freeze({
  stress: { en: 'Notice situations that raise pressure and what helps you recover.', ru: 'Отмечайте, что усиливает нагрузку и что помогает восстанавливаться.' },
  anxiety: { en: 'Notice moments of worry and the support that helps you feel steadier.', ru: 'Замечайте, когда возникает тревога и что помогает ощутить опору.' },
  mood: { en: 'Notice experiences and connections that support your mood.', ru: 'Отмечайте занятия и контакты, которые поддерживают настроение.' },
  sleep: { en: 'Reflect on your sleep routine and how rested you feel.', ru: 'Наблюдайте за ритмом сна и качеством восстановления.' },
  energy: { en: 'Notice how activity and rest relate to your energy.', ru: 'Отмечайте связь нагрузки, отдыха и уровня энергии.' },
  clarity: { en: 'Notice the conditions in which thinking feels clearer.', ru: 'Замечайте условия, в которых легче ясно мыслить.' },
  focus: { en: 'Explore when it is easier to stay focused.', ru: 'Отмечайте, когда вам легче сохранять сосредоточенность.' },
  emotional_regulation: { en: 'Notice how you respond to strong emotions.', ru: 'Замечайте свои способы обходиться с сильными эмоциями.' },
  relationships: { en: 'Notice the relationships that feel supportive.', ru: 'Обращайте внимание на поддерживающие отношения.' },
  intimacy: { en: 'Reflect on the closeness and safety you experience in connection.', ru: 'Отмечайте, когда в близости достаточно контакта и безопасности.' },
  boundaries: { en: 'Reflect on situations when your boundaries feel clear.', ru: 'Замечайте, когда ваши личные границы ясны и устойчивы.' },
  sexual_wellbeing: { en: 'Reflect on comfort, choice and consent.', ru: 'Отмечайте комфорт, свободу выбора и согласие.' },
  embodiment: { en: 'Notice moments when you feel more present in your body.', ru: 'Замечайте моменты лучшего контакта с телом.' },
  resource: { en: 'Notice which supports help you regain balance.', ru: 'Отмечайте ресурсы, которые помогают вернуть равновесие.' },
  self_support: { en: 'Notice ways you support yourself under pressure.', ru: 'Замечайте свои способы внутренней поддержки в напряжении.' },
  functioning: { en: 'Reflect on which everyday activities feel manageable.', ru: 'Отмечайте, какие повседневные задачи даются легче.' },
  meaning: { en: 'Reflect on the activities and goals that feel meaningful.', ru: 'Отмечайте занятия и цели, которые дают ощущение смысла.' },
})

export function buildPortraitRecommendations(results = [], locale = 'en') {
  // Only authenticated caller-provided and source-verified saved results.
  // A rejected latest attempt must never let an older attempt pose as current.
  const history = verifiedHistoryView(results)
  const portrait = buildPsychPortrait(history.current)
  const language = ['ru','es'].includes(locale) ? locale : 'en'
  const measured = Object.entries(portrait.axes)
    .filter(([axis, value]) => axis !== 'personality' && value &&
      typeof value.resultId === 'string' && Number.isFinite(value.rawValue))
    .map(([axis, value]) => ({
      key: axis,
      label: TEST_EXPLORER_AXIS_LABELS[axis]?.[language] || TEST_EXPLORER_AXIS_LABELS[axis]?.en || axis,
      rawValue: value.rawValue, min: value.min, max: value.max,
      mode: value.mode, position: value.mode === 'directional' ? value.percent : null,
      resultId: value.resultId, dimensionKey: value.dimensionKey,
      measuredAt: value.measuredAt, sourceTitle: value.sourceTitle,
      reflection: REFLECTIONS[axis]?.[language] || (language === 'ru'
        ? 'Выберите сами, насколько эта тема важна именно сейчас.'
        : 'You can choose whether this topic matters to you right now.'),
    }))
    .sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt) ||
      a.key.localeCompare(b.key))
  return {
    measuredCount:measured.length,
    rejectedCount:history.rejected.length,
    latestAt:portrait.latestAt,
    measurements:measured,
    // No cross-questionnaire ranking or arbitrary clinical/psychological levels.
    strengths:[], growth:[],
  }
}
