// Reviewed entry-point positioning for the existing 14-day My Course engine.
// A programme is a topic emphasis + deterministic starter tests, NOT a new
// medical treatment, duplicated assessment runner, or fabricated test result.
export const COURSE_PROGRAMS = Object.freeze([
  Object.freeze({
    id: 'stress',
    focusTags: Object.freeze(['stress', 'mood', 'energy']),
    primaryGoals: Object.freeze(['calm_regulation', 'emotional_flexibility', 'energy_agency']),
    starterKeys: Object.freeze(['hh-weekly-pulse', 'hh-current-state', 'hh-resource-pulse']),
    title: Object.freeze({ en: 'Stress Relief', ru: 'Антистресс' }),
    pain: Object.freeze({ en: 'My mind never switches off', ru: 'Не получается расслабиться' }),
    promise: Object.freeze({ en: 'Learn small ways to find calm under pressure.', ru: 'Научитесь делать паузу и находить опору в напряжённые моменты.' }),
    outcome: Object.freeze({ en: 'Calm · steadiness · recovery', ru: 'Спокойствие · устойчивость · восстановление' }),
  }),
  Object.freeze({
    id: 'confidence',
    focusTags: Object.freeze(['resources', 'relationships', 'mood']),
    primaryGoals: Object.freeze(['inner_support', 'connection_boundaries', 'emotional_flexibility']),
    starterKeys: Object.freeze(['hh-resource-pulse', 'hh-weekly-pulse', 'hh-current-state']),
    title: Object.freeze({ en: 'Inner Confidence', ru: 'Внутренняя уверенность' }),
    pain: Object.freeze({ en: 'I second-guess myself', ru: 'Постоянно сомневаюсь в себе' }),
    promise: Object.freeze({ en: 'Practise kinder self-talk, choices and boundaries.', ru: 'Практикуйте внутреннюю поддержку, выбор и личные границы.' }),
    outcome: Object.freeze({ en: 'Self-support · voice · boundaries', ru: 'Опора · свой голос · границы' }),
  }),
  Object.freeze({
    id: 'focus',
    focusTags: Object.freeze(['attention', 'energy', 'stress']),
    primaryGoals: Object.freeze(['attention_clarity', 'energy_agency', 'calm_regulation']),
    starterKeys: Object.freeze(['hh-current-state', 'hh-weekly-pulse', 'hh-resource-pulse']),
    title: Object.freeze({ en: 'Focus & Energy', ru: 'Фокус и энергия' }),
    pain: Object.freeze({ en: 'I feel scattered and stuck', ru: 'Трудно собраться и начать действовать' }),
    promise: Object.freeze({ en: 'Build gentle focus and small sustainable actions.', ru: 'Освойте мягкую концентрацию и посильные ежедневные действия.' }),
    outcome: Object.freeze({ en: 'Clarity · action · sustainable pace', ru: 'Ясность · действие · свой темп' }),
  }),
])

export function getCourseProgram(id) {
  return COURSE_PROGRAMS.find(program => program.id === id) || null
}

// Read an approved topic pack from the EXISTING owner-scoped intake. This
// avoids a database migration or persisting a new unsanctioned identifier.
export function courseProgramFromTopics(focusTags) {
  if (!Array.isArray(focusTags) || !focusTags.every(tag => typeof tag === 'string')) return null
  const unique = [...new Set(focusTags)]
  return COURSE_PROGRAMS.find(program => unique.length === program.focusTags.length &&
    program.focusTags.every(tag => unique.includes(tag))) || null
}

// Only reorder already selectable, rights-cleared, scale-guided tests returned
// by courseRecommendedTests. No catalog bypass, invented test or auto-consent.
export function orderCourseProgramTests(recommendedTests, programId, count = 5) {
  const tests = Array.isArray(recommendedTests) ? recommendedTests : []
  const program = getCourseProgram(programId)
  if (!program) return tests
  const ordered = [
    ...program.starterKeys.flatMap(key => tests.find(test => test.key === key) || []),
    ...tests.filter(test => !program.starterKeys.includes(test.key)),
  ].filter((test, index, all) => all.findIndex(item => item.key === test.key) === index)
  return ordered.map((test, index) => ({ ...test, recommended: index < count }))
}

// Priority is a *user-selected learning theme*, not a diagnosis or psychometric
// severity claim. Every returned scale comes from real compatible user results.
export function suggestCourseProgramScales(profile, programId, count = 3) {
  const eligible = Array.isArray(profile?.eligible)
    ? profile.eligible.filter(scale => scale?.eligible === true && typeof scale.id === 'string' &&
      Number.isFinite(scale.score) && Number.isFinite(scale.priorityPercent)) : []
  const program = getCourseProgram(programId)
  const sorted = [...eligible].sort((a,b) => b.priorityPercent - a.priorityPercent || a.id.localeCompare(b.id))
  if (!program) return sorted.slice(0, count)
  const ranks = program.primaryGoals
  return [...sorted].sort((a,b) => {
    const first = ranks.indexOf(a.goal), second = ranks.indexOf(b.goal)
    const aRank = first < 0 ? ranks.length : first, bRank = second < 0 ? ranks.length : second
    return aRank - bRank || b.priorityPercent - a.priorityPercent || a.id.localeCompare(b.id)
  }).slice(0, count)
}


// Editorial 14-day accents for each flagship programme. These are voluntary
// micro-prompts layered over the EXISTING V4 reviewed practice/workbook sequence.
// They never change lesson IDs, clinical assessment data or day completion.
export const COURSE_PROGRAM_ARCS = Object.freeze({
  stress: Object.freeze([
    Object.freeze({ day: 1, title: Object.freeze({ en: "Notice your stress pattern", ru: "Замечаем свой стресс" }), prompt: Object.freeze({ en: "Name one everyday situation where tension shows up.", ru: "Назовите обычную ситуацию, в которой появляется напряжение." }) }),
    Object.freeze({ day: 2, title: Object.freeze({ en: "Recognize early signals", ru: "Замечаем первые сигналы" }), prompt: Object.freeze({ en: "Notice one early sign without trying to change it.", ru: "Заметьте один ранний сигнал, не пытаясь его исправить." }) }),
    Object.freeze({ day: 3, title: Object.freeze({ en: "Unhook from pressure", ru: "Не сливаться с давлением" }), prompt: Object.freeze({ en: "Give a recurring stressful thought a simple name.", ru: "Дайте повторяющейся тревожной мысли простое название." }) }),
    Object.freeze({ day: 4, title: Object.freeze({ en: "Find your grounding cue", ru: "Находим точку опоры" }), prompt: Object.freeze({ en: "Look around and find three neutral objects.", ru: "Осмотритесь и найдите три нейтральных предмета." }) }),
    Object.freeze({ day: 5, title: Object.freeze({ en: "Make room for a pause", ru: "Разрешаем себе паузу" }), prompt: Object.freeze({ en: "Try one short pause before an ordinary response.", ru: "Попробуйте короткую паузу перед привычной реакцией." }) }),
    Object.freeze({ day: 6, title: Object.freeze({ en: "Speak to yourself gently", ru: "Мягкая внутренняя поддержка" }), prompt: Object.freeze({ en: "Find a phrase that feels supportive and believable.", ru: "Подберите доброжелательную и правдоподобную фразу для себя." }) }),
    Object.freeze({ day: 7, title: Object.freeze({ en: "Review what fits", ru: "Смотрим, что помогает" }), prompt: Object.freeze({ en: "Keep one helpful practice; change anything uncomfortable.", ru: "Оставьте одну полезную практику, поменяйте то, что не подошло." }) }),
    Object.freeze({ day: 8, title: Object.freeze({ en: "Choose a flexible response", ru: "Выбираем новую реакцию" }), prompt: Object.freeze({ en: "Notice one choice available when you feel under pressure.", ru: "Заметьте один доступный выбор в момент давления." }) }),
    Object.freeze({ day: 9, title: Object.freeze({ en: "Make an if–then plan", ru: "Составляем план «если — то»" }), prompt: Object.freeze({ en: "If tension rises, then try your familiar grounding cue.", ru: "Если растёт напряжение, попробуйте знакомую точку опоры." }) }),
    Object.freeze({ day: 10, title: Object.freeze({ en: "Try it in real life", ru: "Пробуем в обычном дне" }), prompt: Object.freeze({ en: "Use the small pause in one low-pressure situation.", ru: "Используйте короткую паузу в одной простой ситуации." }) }),
    Object.freeze({ day: 11, title: Object.freeze({ en: "Protect a recovery window", ru: "Выделяем время на восстановление" }), prompt: Object.freeze({ en: "Make room for one realistic break today.", ru: "Найдите время для одной реальной паузы сегодня." }) }),
    Object.freeze({ day: 12, title: Object.freeze({ en: "Accept available support", ru: "Принимаем доступную помощь" }), prompt: Object.freeze({ en: "Identify one person or place where support is available.", ru: "Отметьте человека или место, где доступна поддержка." }) }),
    Object.freeze({ day: 13, title: Object.freeze({ en: "Build your calm toolkit", ru: "Собираем набор спокойствия" }), prompt: Object.freeze({ en: "Choose two gentle actions you can use again.", ru: "Выберите два мягких действия, которые можете повторять." }) }),
    Object.freeze({ day: 14, title: Object.freeze({ en: "Review and continue", ru: "Подводим итоги и продолжаем" }), prompt: Object.freeze({ en: "Notice what changed or stayed the same; plan your next step.", ru: "Отметьте, что изменилось или осталось прежним, и выберите следующий шаг." }) }),
  ]),
  confidence: Object.freeze([
    Object.freeze({ day: 1, title: Object.freeze({ en: "Choose a real-life goal", ru: "Выбираем жизненную цель" }), prompt: Object.freeze({ en: "Identify one situation where you want more choice.", ru: "Назовите ситуацию, где хотите больше свободы выбора." }) }),
    Object.freeze({ day: 2, title: Object.freeze({ en: "Spot your inner critic", ru: "Замечаем внутреннего критика" }), prompt: Object.freeze({ en: "Notice one self-critical phrase without treating it as a fact.", ru: "Заметьте одну самокритичную мысль, не считая её фактом." }) }),
    Object.freeze({ day: 3, title: Object.freeze({ en: "Separate fact from judgment", ru: "Отделяем факт от оценки" }), prompt: Object.freeze({ en: "Write one observation without adding a harsh label.", ru: "Запишите одно наблюдение без жёсткой оценки себя." }) }),
    Object.freeze({ day: 4, title: Object.freeze({ en: "Find inner support", ru: "Находим внутреннюю опору" }), prompt: Object.freeze({ en: "Identify one quality or person that helps you feel supported.", ru: "Назовите качество или человека, помогающего чувствовать опору." }) }),
    Object.freeze({ day: 5, title: Object.freeze({ en: "Try a kinder alternative", ru: "Ищем мягкую альтернативу" }), prompt: Object.freeze({ en: "Replace one rigid “must” with a believable “could”.", ru: "Замените одно жёсткое «должен» на реалистичное «могу»." }) }),
    Object.freeze({ day: 6, title: Object.freeze({ en: "Express a small preference", ru: "Говорим о своём выборе" }), prompt: Object.freeze({ en: "Try saying one ordinary preference respectfully.", ru: "Попробуйте уважительно озвучить одно простое предпочтение." }) }),
    Object.freeze({ day: 7, title: Object.freeze({ en: "Review without grading", ru: "Подводим итоги без оценок" }), prompt: Object.freeze({ en: "Keep what helped; skip what felt too hard.", ru: "Оставьте то, что помогло, и пропустите слишком трудное." }) }),
    Object.freeze({ day: 8, title: Object.freeze({ en: "Act from what matters", ru: "Действуем из ценностей" }), prompt: Object.freeze({ en: "Choose one tiny action that reflects a personal value.", ru: "Выберите маленькое действие, которое отражает вашу ценность." }) }),
    Object.freeze({ day: 9, title: Object.freeze({ en: "Practise a gentle boundary", ru: "Практикуем мягкую границу" }), prompt: Object.freeze({ en: "Rehearse “I need a moment” in a safe context.", ru: "В безопасной ситуации потренируйте «Мне нужна минута»." }) }),
    Object.freeze({ day: 10, title: Object.freeze({ en: "Notice courage in action", ru: "Замечаем смелость в действии" }), prompt: Object.freeze({ en: "Observe one small choice despite ordinary doubt.", ru: "Отметьте один небольшой выбор несмотря на обычные сомнения." }) }),
    Object.freeze({ day: 11, title: Object.freeze({ en: "Ask for practical support", ru: "Просим о поддержке" }), prompt: Object.freeze({ en: "Make one small, optional request to a safe person.", ru: "Попробуйте небольшую просьбу к человеку, которому доверяете." }) }),
    Object.freeze({ day: 12, title: Object.freeze({ en: "Build a self-support toolkit", ru: "Собираем инструменты опоры" }), prompt: Object.freeze({ en: "Write down two phrases or actions that feel yours.", ru: "Запишите две фразы или действия, которые вам подходят." }) }),
    Object.freeze({ day: 13, title: Object.freeze({ en: "Choose without perfection", ru: "Выбираем без идеальности" }), prompt: Object.freeze({ en: "Use a realistic “good enough” decision rule.", ru: "Используйте реалистичное правило «достаточно хорошо»." }) }),
    Object.freeze({ day: 14, title: Object.freeze({ en: "Review your own voice", ru: "Замечаем свой голос" }), prompt: Object.freeze({ en: "Name one choice that felt more like your own.", ru: "Назовите одно решение, которое ощущалось по-настоящему вашим." }) }),
  ]),
  focus: Object.freeze([
    Object.freeze({ day: 1, title: Object.freeze({ en: "Notice your attention", ru: "Наблюдаем внимание" }), prompt: Object.freeze({ en: "Choose one everyday task where focus matters.", ru: "Выберите обычное дело, где важно сосредоточиться." }) }),
    Object.freeze({ day: 2, title: Object.freeze({ en: "Map your distractions", ru: "Замечаем отвлечения" }), prompt: Object.freeze({ en: "Notice one common distraction without blaming yourself.", ru: "Отметьте одно частое отвлечение без самокритики." }) }),
    Object.freeze({ day: 3, title: Object.freeze({ en: "Match your energy", ru: "Учитываем свои силы" }), prompt: Object.freeze({ en: "Identify a time of day when small actions feel easier.", ru: "Найдите время дня, когда небольшие действия даются легче." }) }),
    Object.freeze({ day: 4, title: Object.freeze({ en: "Choose one priority", ru: "Выбираем один приоритет" }), prompt: Object.freeze({ en: "Write a single realistic priority for today.", ru: "Запишите один реалистичный приоритет дня." }) }),
    Object.freeze({ day: 5, title: Object.freeze({ en: "Start for two minutes", ru: "Начинаем с двух минут" }), prompt: Object.freeze({ en: "Try a very short first step instead of a perfect plan.", ru: "Попробуйте очень короткий первый шаг вместо идеального плана." }) }),
    Object.freeze({ day: 6, title: Object.freeze({ en: "Design a simple cue", ru: "Создаём подсказку" }), prompt: Object.freeze({ en: "Place one gentle reminder near your task.", ru: "Добавьте одну ненавязчивую подсказку рядом с делом." }) }),
    Object.freeze({ day: 7, title: Object.freeze({ en: "Review your energy", ru: "Смотрим на свою энергию" }), prompt: Object.freeze({ en: "Keep what worked and permit a slower pace.", ru: "Оставьте полезное и разрешите себе более медленный темп." }) }),
    Object.freeze({ day: 8, title: Object.freeze({ en: "Link focus to a value", ru: "Связываем фокус с ценностью" }), prompt: Object.freeze({ en: "Choose a tiny task connected to what matters to you.", ru: "Выберите небольшую задачу, связанную с важным для вас." }) }),
    Object.freeze({ day: 9, title: Object.freeze({ en: "Make an if–then plan", ru: "Планируем «если — то»" }), prompt: Object.freeze({ en: "If you notice distraction, then return to one next step.", ru: "Если заметили отвлечение, вернитесь к одному следующему шагу." }) }),
    Object.freeze({ day: 10, title: Object.freeze({ en: "Try one focus block", ru: "Пробуем один блок фокуса" }), prompt: Object.freeze({ en: "Complete an optional short single-task interval.", ru: "Попробуйте короткий отрезок работы над одним делом." }) }),
    Object.freeze({ day: 11, title: Object.freeze({ en: "Recover between efforts", ru: "Восстанавливаемся между делами" }), prompt: Object.freeze({ en: "Try a brief screen-free pause after effort.", ru: "Попробуйте короткую паузу без экрана после нагрузки." }) }),
    Object.freeze({ day: 12, title: Object.freeze({ en: "Choose a sustainable pace", ru: "Выбираем устойчивый темп" }), prompt: Object.freeze({ en: "Alternate doable actions and permitted recovery.", ru: "Чередуйте посильные действия и разрешённый отдых." }) }),
    Object.freeze({ day: 13, title: Object.freeze({ en: "Create a Plan B", ru: "Создаём запасной план" }), prompt: Object.freeze({ en: "Decide your smallest next step for low-energy days.", ru: "Выберите самый маленький шаг на день с низкой энергией." }) }),
    Object.freeze({ day: 14, title: Object.freeze({ en: "Review and adjust", ru: "Подводим итоги и корректируем" }), prompt: Object.freeze({ en: "Notice what fits your life, without promising perfect focus.", ru: "Отметьте, что подходит вашей жизни, не требуя идеального фокуса." }) }),
  ]),
})

export function courseProgramDay(programId, day, locale = 'en') {
  const programme = getCourseProgram(programId)
  if (!programme || !Number.isInteger(day) || day < 1 || day > 14) return null
  const item = COURSE_PROGRAM_ARCS[programme.id]?.[day - 1]
  if (!item) return null
  const lang = locale === 'ru' ? 'ru' : 'en'
  return { day: item.day, title: item.title[lang], prompt: item.prompt[lang] }
}
