export const CURRENT_STATE_V1 = Object.freeze({
  key: 'hh-current-state',
  version: 'v1',
  instrumentLocale: 'en-ru',
  translationVersion: 'v1',
  timeframe: 'right-now',
  source: Object.freeze({
    title: 'Holistic House Current State self-observation check-in',
    status: 'non-diagnostic-not-validated-clinical-scale',
    reviewedAt: '2026-10-02'
  }),
  questions: Object.freeze([
    {id: 'state.problem_intensity', type: 'integer', min: 0, max: 10, required: true, direction: 'lower-reported-difficulty', en: 'How strong is your main difficulty right now?', ru: 'Насколько сильно сейчас ощущается ваша основная трудность?'},
    {id: 'state.resource', type: 'integer', min: 0, max: 10, required: true, direction: 'higher-reported-resource', en: 'How much energy and inner support do you feel right now?', ru: 'Сколько сил и внутренней опоры вы сейчас ощущаете?'},
    {id: 'state.tension', type: 'integer', min: 0, max: 10, required: true, direction: 'lower-reported-tension', en: 'How much inner tension do you feel right now?', ru: 'Насколько сильное внутреннее напряжение вы сейчас ощущаете?'},
    {id: 'state.fatigue', type: 'integer', min: 0, max: 10, required: true, direction: 'lower-reported-fatigue', en: 'How tired do you feel right now?', ru: 'Насколько сильную усталость вы сейчас ощущаете?'},
    {id: 'state.life_impact', type: 'integer', min: 0, max: 10, required: true, direction: 'lower-reported-interference', en: 'How much is your current difficulty interfering with what you want to do?', ru: 'Насколько текущая трудность мешает вам делать то, что вы хотите?'}
  ]),
  optionalContext: Object.freeze([
    {id: 'context.current_focus', maxLength: 1000},
    {id: 'context.what_helps', maxLength: 1000},
    {id: 'context.note', maxLength: 1000}
  ])
})
