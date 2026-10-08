// Private, on-device navigation hints from already loaded, account-scoped cabinet data.
// The guide does not call an external model, analyze answers, or store personal information.
const TEXT = {
  en: {
    firstTitle: 'Start with how you feel',
    firstBody: 'A short check-in can give you a first saved reference point. Choose a test that feels relevant to you.',
    firstAction: 'Explore tests',
    continueTitle: 'You have a test in progress',
    continueBody: 'Your unfinished test is saved. You can continue where you left off whenever you wish.',
    continueAction: 'Resume test',
    planTitle: 'Continue your selected test set',
    planBody: 'There are still questionnaires in your active set. Open it to review what is complete and what comes next.',
    planAction: 'Open my test set',
    reviewTitle: 'Take a look at your results',
    reviewBody: 'Your completed self-reports are saved with their original dates. See what each test measured.',
    reviewAction: 'View results',
    resultTitle: 'Explore this result',
    resultBody: 'Read the measurements and their explanations. They describe your responses, not a medical diagnosis.',
    resultAction: 'Open result',
    chooseTitle: 'Choose what matters to you',
    chooseBody: 'Use themes and filters to find tests that fit the questions you want to explore. You decide what to take.',
    chooseAction: 'Find matching tests',
    compareTitle: 'Notice changes over time',
    compareBody: 'Past results can be reviewed by date. Only compatible repeated measurements can be compared.',
    compareAction: 'Open history',
    portraitTitle: 'Explore your personal portrait',
    portraitBody: 'Your portrait grows only from completed measurements. Unmeasured areas remain unfilled.',
    portraitAction: 'My portrait',
    supportTitle: 'Would talking help?',
    supportBody: 'If you want personal support, you can view the consultation options. A test is not a substitute for professional care.',
    supportAction: 'Consultations',
  },
  ru: {
    firstTitle: 'Начните с самочувствия',
    firstBody: 'Короткий тест поможет сохранить первую точку отсчёта. Выберите то, что сейчас вам действительно важно.',
    firstAction: 'Подобрать тесты',
    continueTitle: 'У вас есть незаконченный тест',
    continueBody: 'Черновик сохранён. Вы можете продолжить с того места, где остановились.',
    continueAction: 'Продолжить тест',
    planTitle: 'Продолжите выбранный набор тестов',
    planBody: 'В вашем наборе ещё есть вопросы. Откройте его, чтобы увидеть завершённые тесты и следующий шаг.',
    planAction: 'Открыть набор',
    reviewTitle: 'Посмотрите свои результаты',
    reviewBody: 'Пройденные тесты сохранены вместе с датами. Посмотрите, что именно измерял каждый тест.',
    reviewAction: 'Мои результаты',
    resultTitle: 'Изучите этот результат',
    resultBody: 'Посмотрите шкалы и пояснения к ним. Это описание ваших ответов, а не медицинский диагноз.',
    resultAction: 'Открыть результат',
    chooseTitle: 'Выберите важную для себя тему',
    chooseBody: 'Темы и фильтры помогут найти подходящие тесты. Вы сами решаете, какие из них проходить.',
    chooseAction: 'Подобрать тесты',
    compareTitle: 'Проследите изменения',
    compareBody: 'Результаты можно смотреть по датам. Сравниваются только совместимые повторные измерения.',
    compareAction: 'Открыть историю',
    portraitTitle: 'Посмотрите свой психопортрет',
    portraitBody: 'Портрет пополняется только по пройденным тестам. Неизмеренные области не дорисовываются.',
    portraitAction: 'Мой портрет',
    supportTitle: 'Нужна личная поддержка?',
    supportBody: 'Вы можете посмотреть варианты личной консультации. Тестирование не заменяет помощь специалиста.',
    supportAction: 'Консультации',
  },
}

export function buildCabinetGuideSteps(data = {}, { locale = 'en', page = 'portrait', recordId } = {}) {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const c = TEXT[lang]
  const root = '/' + lang + '/app'
  const runs = Array.isArray(data.runs) ? data.runs : []
  const results = Array.isArray(data.results) ? data.results : []
  const pending = runs.find((run) =>
    run && typeof run.id === 'string' && ['draft', 'in_progress'].includes(run.status))
  const plan = data.activeTestPlan
  const hasPendingPlan = plan?.status === 'active'
    && Array.isArray(plan.definitionIds) && plan.definitionIds.length > 0
    && (plan.completedRunIds?.length || 0) < plan.definitionIds.length
  const currentResult = results.find((entry) => entry && entry.id === recordId)
  const step = (key, href) => ({
    key,
    title: c[key + 'Title'],
    body: c[key + 'Body'],
    action: c[key + 'Action'],
    href: root + href,
  })
  const suggestions = []
  if (pending) suggestions.push(step('continue', '/runs/' + encodeURIComponent(pending.id)))
  else if (hasPendingPlan) suggestions.push(step('plan', '/tests'))

  if (page === 'tests') {
    suggestions.push(step('choose', '/tests'))
  } else if (page === 'results' && currentResult) {
    suggestions.push(step('result', '/results/' + encodeURIComponent(currentResult.id)))
  } else if (page === 'portfolio') {
    suggestions.push(step('portrait', '/portfolio'))
  } else if (page === 'history' && results.length) {
    suggestions.push(step('compare', '/history'))
  }

  if (results.length) {
    suggestions.push(step('review', '/history'))
    if (page !== 'portfolio') suggestions.push(step('portrait', '/portfolio'))
    suggestions.push(step('choose', '/tests'))
  } else {
    suggestions.push(step('first', '/tests'))
    suggestions.push(step('portrait', '/portfolio'))
  }
  suggestions.push(step('support', '/consultations'))

  // Stable order; no inferred condition, diagnostic score or synthetic percentage.
  return suggestions.filter((suggestion, index, all) =>
    all.findIndex((item) => item.key === suggestion.key) === index).slice(0, 4)
}
