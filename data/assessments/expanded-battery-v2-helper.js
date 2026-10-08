import { deepFreeze } from '../../lib/assessments/contracts.js'

export function buildFunDefinition(config, locale) {
  const questions = config[locale].map((text, index) => ({
    id: `${config.key}.${String(index + 1).padStart(2, '0')}`,
    text,
    required: true,
    direction: config.negative ? 'lower-reported-difficulty' : 'higher-reported-resource',
  }))
  const dimensionClass =
    config.axis === 'function' ? 'function' : config.axis === 'state' ? 'state' : 'resources'
  const timeframe = config.timeframe || (
    ['hh-sleep-reset','hh-evening-landing','hh-workload-weather','hh-money-pressure','hh-daily-rhythm'].includes(config.key)
      ? 'past-7-days'
      : 'right-now'
  )
  return {
    id: config.ids[locale],
    key: config.key,
    version: 'v1',
    instrumentLocale: locale,
    translationVersion: `hh-${locale}-v1`,
    timeframe,
    scoringKey: 'configured',
    scoringVersion: 'v1',
    resultVersion: 'v1',
    title: config.titles[locale],
    source: {
      title: `Holistic House — ${config.titles.en}`,
      status: 'original-playful-non-diagnostic-reflection',
      reviewedAt: config.reviewedAt || '2026-10-06',
    },
    answerScale: { min: 0, max: 4 },
    responseAnchors: locale === 'ru'
      ? ['Совсем нет','Немного','Отчасти','В значительной степени','Очень сильно']
      : ['Not at all','A little','Somewhat','Quite a lot','Very much'],
    scoring: { dimensions: [{
      key: `${dimensionClass}.${config.key.replace(/^hh-/, '').replaceAll('-', '_')}.overall`,
      method: 'mean',
      items: questions.map((question) => question.id),
      min: 0,
      max: 4,
      dimensionClass,
      sourceConstruct: config.titles[locale],
      direction: config.negative ? 'lower-reported-difficulty' : 'higher-reported-resource',
    }] },
    questions,
    optionalContext: [],
    suggestedRepeatDays: config.testLength === 'short' ? 7 : 14,
    contentHash: config.hashes[locale],
  }
}

export function buildFunDefinitions(configs) {
  return deepFreeze(configs.flatMap((config) => [
    buildFunDefinition(config, 'en'),
    buildFunDefinition(config, 'ru'),
  ]))
}
