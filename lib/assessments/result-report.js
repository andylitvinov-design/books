import { monitoringCatalogItem } from '../../data/assessments/catalog.js'

// Only the versioned, persisted score and its declared direction are used here.
// Never turn an unvalidated Holistic House reflection scale into clinical cutoffs.
const ADVICE = {
  burnout: {
    title: ['Exhaustion & burnout', 'Истощение и выгорание'],
    try: [
      ['For 7 days, note when exhaustion is strongest (before work, after work, or after social contact). Record sleep and recovery time alongside it.', 'В течение 7 дней отмечайте, когда истощение сильнее (до работы, после работы, после общения). Рядом записывайте сон и время восстановления.'],
      ['Choose one manageable load reduction this week and protect two short recovery breaks on demanding days.', 'Выберите одну посильную меру снижения нагрузки на неделю и запланируйте две короткие паузы восстановления в напряжённые дни.'],
    ],
    extra: ['If persistent exhaustion or physical weakness affects daily life, consider discussing it with a healthcare professional rather than assuming the cause is burnout.', 'Если постоянное истощение или физическая слабость мешают повседневной жизни, обсудите это с врачом, не приписывая автоматически всё выгоранию.'],
  },
  sleep: {
    title: ['Sleep & recovery', 'Сон и восстановление'],
    try: [
      ['Keep a consistent waking time for a week and note sleep duration and how rested you feel in the morning.', 'Неделю придерживайтесь примерно одного времени подъёма и отмечайте продолжительность сна и утреннее самочувствие.'],
      ['Notice whether evening screen time, caffeine, worries or irregular schedules coincide with more difficult nights.', 'Посмотрите, совпадают ли сложные ночи с вечерним экранным временем, кофеином, тревогами или сбитым режимом.'],
    ],
    extra: ['If sleep difficulty persists, causes daytime impairment, or includes breathing disturbances, discuss it with a qualified clinician.', 'Если нарушения сна сохраняются, мешают днём или сопровождаются нарушениями дыхания, обратитесь к специалисту.'],
  },
  anxiety: {
    title: ['Anxiety & tension', 'Тревога и напряжение'],
    try: [
      ['For the next few days, record the situation, body sensation and intensity of tension before and after a stressful moment.', 'Несколько дней записывайте ситуацию, телесную реакцию и выраженность напряжения до и после трудного момента.'],
      ['Try two minutes of comfortable, unforced grounding (feet on the floor, noticing the room) and compare how you feel afterward.', 'Попробуйте две минуты мягкого заземления без усилий (стопы на полу, внимание к окружающему пространству) и сравните ощущения после.'],
    ],
    extra: ['If worry, fear or panic regularly limits daily life, seek an assessment from a qualified mental-health professional.', 'Если тревога, страх или паника регулярно ограничивают повседневную жизнь, обратитесь за оценкой к квалифицированному специалисту.'],
  },
  mood: {
    title: ['Mood & emotional wellbeing', 'Настроение и эмоциональное состояние'],
    try: [
      ['Note your mood once each evening for a week, alongside one event that influenced it and one thing that helped.', 'В течение недели вечером отмечайте настроение, одно повлиявшее событие и то, что помогло.'],
      ['Choose one small, realistic source of connection or enjoyable activity and notice how you feel before and after it.', 'Выберите одно небольшое посильное действие для общения или приятной активности и сравните состояние до и после.'],
    ],
    extra: ['If low mood is persistent or affects functioning, a clinician can help interpret symptoms; questionnaire results alone do not diagnose depression.', 'Если сниженное настроение сохраняется или мешает жить, специалист поможет оценить симптомы; один опросник не устанавливает депрессию.'],
  },
  energy: {
    title: ['Energy & physical wellbeing', 'Энергия и физическое самочувствие'],
    try: [
      ['For a week, note energy at three times of day together with meals, activity, sleep and recovery.', 'Неделю отмечайте энергию утром, днём и вечером, а рядом — питание, активность, сон и восстановление.'],
      ['Plan one small restorative pause before your usual energy dip rather than waiting until you feel depleted.', 'Поставьте короткую восстановительную паузу до обычного спада сил, а не только после истощения.'],
    ],
    extra: ['New, persistent or worsening weakness deserves medical evaluation; a psychological questionnaire cannot establish its physical cause.', 'Новая, стойкая или нарастающая слабость требует медицинской оценки; психологический опросник не объясняет её физическую причину.'],
  },
  attention: {
    title: ['Focus & attention', 'Фокус и внимание'],
    try: [
      ['Pick one task each day and work on it in a short, interruption-free block; note which conditions help you focus.', 'Ежедневно выбирайте одну задачу и уделяйте ей короткий блок без отвлечений; отмечайте, какие условия помогают сосредоточиться.'],
      ['When attention slips, record context such as fatigue, stress and interruptions instead of inferring a diagnosis from the score.', 'Когда внимание рассеивается, отмечайте усталость, стресс и отвлечения, а не делайте вывод о диагнозе по баллам.'],
    ],
    extra: ['If concentration problems affect work, study or everyday safety, consider a professional evaluation.', 'Если трудности внимания мешают работе, учёбе или безопасности, стоит обсудить их со специалистом.'],
  },
  relationship: {
    title: ['Connection & relationships', 'Контакт и отношения'],
    try: [
      ['Identify one interaction in which you felt heard and one in which a boundary mattered; note what was different.', 'Вспомните один контакт, где вас услышали, и один, где были важны границы; запишите, что отличалось.'],
      ['Choose one low-pressure step: ask for specific support, clarify a need, or arrange a comfortable check-in with someone you trust.', 'Выберите один мягкий шаг: попросите конкретной поддержки, обозначьте потребность или договоритесь о спокойном разговоре с близким.'],
    ],
    extra: ['A relationship score does not determine anyone’s intentions or the quality of an individual relationship.', 'Балл по отношениям не определяет намерения другого человека и не оценивает отдельные отношения.'],
  },
  boundaries: {
    title: ['Boundaries & social pressure', 'Границы и социальное давление'],
    try: [
      ['Notice one situation this week when you agreed despite discomfort. Write down the need or boundary you would want to express.', 'Заметьте одну ситуацию, когда вы согласились вопреки дискомфорту. Запишите потребность или границу, которую хотелось бы выразить.'],
      ['Practice one small, respectful boundary in a low-risk interaction, such as asking for time before committing.', 'Потренируйте одну небольшую уважительную границу в безопасном общении, например попросите время перед ответом.'],
    ],
    extra: ['Use your own context, safety and relationships to decide which boundaries are appropriate.', 'Учитывайте собственный контекст, безопасность и отношения при выборе границ.'],
  },
  support: {
    title: ['Support & inner resources', 'Поддержка и внутренние ресурсы'],
    try: [
      ['List two specific people, routines or places that help you recover, and identify which one is accessible this week.', 'Запишите двух людей, привычки или места, которые помогают восстановиться, и выберите доступный на этой неделе ресурс.'],
      ['Try a brief daily check-in: what drained energy, what restored it, and what support would be useful tomorrow?', 'Попробуйте короткую ежедневную проверку: что отнимало силы, что восстанавливало и какая поддержка нужна завтра?'],
    ],
    extra: ['Resources and symptoms are separate dimensions; one does not cancel or diagnose the other.', 'Ресурсы и симптомы — разные измерения; один показатель не отменяет и не диагностирует другой.'],
  },
  functioning: {
    title: ['Everyday functioning', 'Повседневное функционирование'],
    try: [
      ['Choose one everyday task that feels difficult and break it into a first step you can complete in 10 minutes.', 'Выберите одно сложное повседневное дело и выделите первый посильный шаг на 10 минут.'],
      ['Notice what helped or blocked completion—time, rest, support or environment—before your next assessment.', 'Заметьте, что помогало или мешало: время, отдых, поддержка или обстановка, — до следующего замера.'],
    ],
    extra: ['If basic everyday functioning is consistently impaired, a professional can help consider relevant health and life factors.', 'Если повседневные задачи стабильно оказываются непосильными, специалист поможет разобраться в возможных факторах.'],
  },
  selfcompassion: {
    title: ['Self-compassion & self-criticism', 'Самоподдержка и самокритика'],
    try: [
      ['Write down one common self-critical sentence and rephrase it as something fair you could say to a friend.', 'Запишите одну привычную самокритичную фразу и переформулируйте её так, как справедливо сказали бы другу.'],
      ['Notice when perfectionism or shame changes your behaviour; try allowing one good-enough rather than perfect action.', 'Замечайте, когда стыд или перфекционизм меняет поведение; попробуйте один раз выбрать достаточно хороший, а не идеальный результат.'],
    ],
    extra: ['A brief self-report can prompt reflection, but it is not a fixed judgement of self-worth.', 'Краткий самоотчёт помогает размышлению, но не даёт постоянную оценку вашей ценности.'],
  },
  work: {
    title: ['Workload & balance', 'Рабочая нагрузка и баланс'],
    try: [
      ['Make a brief list of work demands you can control and one demand where you might ask for help or renegotiate a deadline.', 'Составьте короткий список рабочих нагрузок, которыми можете управлять, и одну, где уместно попросить помощь или пересмотреть срок.'],
      ['Track when your working day stops and whether recovery time remains protected on two days this week.', 'Отметьте время окончания рабочего дня и попробуйте защитить время восстановления хотя бы два дня на неделе.'],
    ],
    extra: ['Work-related scores are influenced by many contexts and cannot establish a workplace or medical diagnosis.', 'Рабочие показатели зависят от контекста и сами по себе не являются ни медицинским диагнозом, ни оценкой места работы.'],
  },
  personality: {
    title: ['Personal tendencies', 'Личностные особенности'],
    try: [
      ['Notice one setting where this tendency feels useful and another where a different response might serve you better.', 'Отметьте одну ситуацию, где эта особенность помогает, и другую, где мог бы быть полезен иной способ реагирования.'],
      ['Ask yourself what is flexible in your behaviour rather than treating a questionnaire trait score as your identity.', 'Спросите себя, что в вашем поведении гибко, вместо того чтобы считать результат теста определением своей личности.'],
    ],
    extra: ['Personality dimensions are descriptive; higher is not automatically better or worse.', 'Личностные шкалы описательны: больший балл не обязательно лучше или хуже.'],
  },
  general: {
    title: ['Your personal pattern', 'Ваша личная картина'],
    try: [
      ['Note when this experience is strongest, what preceded it and what seems to help; keep these observations until a repeat check-in.', 'Отмечайте, когда ощущение сильнее, что ему предшествовало и что помогает; сохраните наблюдения до повторного теста.'],
      ['Choose one small change for this week and compare your experience before and after, without assuming the questionnaire reveals a cause.', 'Выберите одно небольшое изменение на неделю и сравните ощущения до и после, не считая балл доказательством причины.'],
    ],
    extra: ['The result describes selected answers on this measure, not overall health, identity or a diagnosis.', 'Результат описывает выбранные ответы по этой шкале, а не здоровье в целом, личность или диагноз.'],
  },
}

const RULES = [
  [/cbi|burnout|exhaust|выгоран|истощ/i, 'burnout'],
  [/sleep|insomn|circadian|quality of rest/i, 'sleep'],
  [/self.?compassion|shame|perfection|self.?criticism|self.?worth/i, 'selfcompassion'],
  [/boundar|people.?pleas|social pressure|approval/i, 'boundaries'],
  [/support|resilien|resource|self.?care|recovery/i, 'support'],
  [/lonel|relationship|connection|attachment|social|interperson/i, 'relationship'],
  [/anxi|gad|panic|fear|worr|tension|stress|distress|trauma/i, 'anxiety'],
  [/depress|phq|mood|affect|emotion|sad|hope/i, 'mood'],
  [/energy|fatigue|vital|physical|somatic|pain|health|bodily|body/i, 'energy'],
  [/focus|attent|adhd|concentrat|cognit|clarity/i, 'attention'],
  [/work|job|career|occupat|professional/i, 'work'],
  [/function|disabil|daily.?life|impair/i, 'functioning'],
  [/trait|personality|ipip|big.?five|identity/i, 'personality'],
]

function domainFor(dimension, result) {
  const label = [dimension.key, dimension.sourceConstruct, result.definitionKey].filter(Boolean).join(' ')
  const rule = RULES.find(([pattern]) => pattern.test(label))
  if (rule) return rule[1]
  const topic = (monitoringCatalogItem(result.definitionKey)?.topics || []).join(' ')
  return RULES.find(([pattern]) => pattern.test(topic))?.[1] || 'general'
}

function scaleDescription(dimension, language) {
  const lo = Number(dimension.min)
  const hi = Number(dimension.max)
  const val = Number(dimension.value)
  const direction = dimension.direction || 'non-normative'
  const relative = Number.isFinite(val) && hi > lo ? (val - lo) / (hi - lo) : null
  if (relative === null || relative < 0 || relative > 1 || !Number.isFinite(relative)) {
    return language === 'ru' ? 'Это показатель самоотчёта; интерпретировать его нужно с учётом контекста.' : 'This is a self-report measure and needs context for interpretation.'
  }
  const position = relative < 1 / 3 ? 0 : relative > 2 / 3 ? 2 : 1
  if (direction === 'lower-reported-difficulty') {
    const en = [
      'Your answers fall in the lower part of this reported-difficulty scale.',
      'Your answers fall around the middle of this reported-difficulty scale.',
      'Your answers fall in the upper part of this reported-difficulty scale.',
    ]
    const ru = [
      'По ответам показатель находится в нижней части шкалы сообщаемых трудностей.',
      'По ответам показатель находится около середины шкалы сообщаемых трудностей.',
      'По ответам показатель находится в верхней части шкалы сообщаемых трудностей.',
    ]
    return (language === 'ru' ? ru : en)[position]
  }
  if (direction === 'higher-reported-resource') {
    const en = [
      'Your answers fall in the lower part of this reported-resource scale.',
      'Your answers fall around the middle of this reported-resource scale.',
      'Your answers fall in the upper part of this reported-resource scale.',
    ]
    const ru = [
      'По ответам показатель находится в нижней части шкалы сообщаемых ресурсов.',
      'По ответам показатель находится около середины шкалы сообщаемых ресурсов.',
      'По ответам показатель находится в верхней части шкалы сообщаемых ресурсов.',
    ]
    return (language === 'ru' ? ru : en)[position]
  }
  return language === 'ru'
    ? 'Эта шкала описательная: большее или меньшее значение не обязательно означает «лучше» или «хуже».'
    : 'This scale is descriptive: a higher or lower value is not automatically better or worse.'
}

function personalizedSteps(dimension, content, langIndex) {
  const base = content.try.map((pair) => pair[langIndex])
  const min = Number(dimension.min)
  const max = Number(dimension.max)
  const value = Number(dimension.value)
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(value) || max <= min)
    return base
  const position = (value - min) / (max - min)
  // These thirds describe location on a scale, NEVER diagnostic severity bands.
  // Keep suggestions proportional: a low reported-burden score should not be
  // interpreted as an instruction to seek treatment for burnout, for example.
  if (dimension.direction === 'lower-reported-difficulty' && position < 1 / 3)
    return [
      langIndex
        ? 'Этот суммарный показатель находится в нижней части шкалы трудностей. Если он соответствует вашему опыту, отметьте, что помогает сохранять текущее равновесие, вместо больших изменений только из-за теста.'
        : 'This overall score is in the lower part of the reported-difficulty scale. If it reflects your experience, notice what helps maintain your balance rather than making major changes based only on the questionnaire.',
      base[0],
    ]
  if (dimension.direction === 'higher-reported-resource' && position > 2 / 3)
    return [
      langIndex
        ? 'Этот показатель расположен в верхней части шкалы ресурсов. Отметьте один конкретный источник устойчивости, который хотели бы сохранить в ближайшие дни.'
        : 'This score is in the upper part of the reported-resource scale. Identify one specific source of support or strength you want to preserve over the next few days.',
      base[0],
    ]
  return base
}

export function buildAssessmentResultReport(result, locale = 'en') {
  const language = locale === 'ru' ? 'ru' : 'en'
  const langIndex = language === 'ru' ? 1 : 0
  const measures = Array.isArray(result?.dimensions) ? result.dimensions : []
  const sections = measures.map((dimension) => {
    const domain = domainFor(dimension, result)
    const content = ADVICE[domain]
    return {
      key: dimension.key,
      domain,
      title: content.title[langIndex],
      construct: dimension.sourceConstruct || dimension.key,
      meaning: scaleDescription(dimension, language),
      steps: personalizedSteps(dimension, content, langIndex),
      followUp: content.extra[langIndex],
    }
  })
  const hasDifficulty = measures.some((dimension) => dimension.direction === 'lower-reported-difficulty')
  return {
    title: language === 'ru' ? 'Ваш отчёт и конкретные рекомендации' : 'Your report and practical recommendations',
    intro: language === 'ru'
      ? 'Рекомендации связаны с темами именно этого пройденного теста. Они помогают выбрать наблюдения и небольшие действия на ближайшую неделю.'
      : 'These suggestions follow the measured topics in this particular completed test. Use them to choose observations and small next steps for the coming week.',
    sections,
    note: language === 'ru'
      ? 'Положение внутри шкалы — не клинический порог, диагноз или доказательство причины. Рекомендации не являются индивидуальным назначением лечения.'
      : 'Position within a scale is not a clinical cutoff, diagnosis or proof of cause. These suggestions are not individualized treatment.',
    seekSupport: hasDifficulty
      ? language === 'ru'
        ? 'Если трудности сохраняются, нарастают или мешают повседневной жизни, обратитесь к квалифицированному специалисту; тест не заменяет обследование.'
        : 'If difficulties persist, worsen or interfere with daily life, discuss them with a qualified professional; a questionnaire is not a clinical assessment.'
      : null,
  }
}
