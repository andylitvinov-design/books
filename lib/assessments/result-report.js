import { buildBachResultReport } from './bach-guidance.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { interpretationPlan, interpretationDimensionPlan, interpretationForDimension, classificationDirection, INTERPRETATION_RULES_VERSION } from './interpretation-registry.js'

// Interpret scored, versioned dimensions only. Clinical review of proposed copy is required before calling the feature diagnostic.
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

const IPIP_TRAIT_GUIDANCE = Object.freeze({
  'trait.ipip50.extraversion': {
    name: ['Extraversion', 'Экстраверсия'],
    meaning: [
      'This dimension describes your responses about sociability and comfort initiating contact. Neither a quieter nor a more outgoing style is inherently healthier.',
      'Эта шкала отражает ответы об общительности и лёгкости вступления в контакт. Более спокойный или более общительный стиль сам по себе не означает лучшего здоровья.',
    ],
    steps: [
      ['Notice where social contact gives you energy and where quiet time helps you recover.', 'Отметьте, в каком общении появляется энергия, а когда полезнее время наедине с собой.'],
      ['Choose one connection style that feels comfortable rather than trying to reach a supposedly ideal score.', 'Выберите комфортный способ общения вместо попыток достичь якобы идеального балла.'],
    ],
  },
  'trait.ipip50.agreeableness': {
    name: ['Agreeableness', 'Доброжелательность'],
    meaning: [
      'This dimension describes reported empathy and willingness to cooperate; it does not judge moral worth or relationship quality.',
      'Эта шкала отражает сопереживание и готовность к сотрудничеству, но не оценивает нравственность или качество отношений.',
    ],
    steps: [
      ['Notice when cooperation helps your relationships and when a clear boundary is appropriate.', 'Заметьте, когда сотрудничество помогает отношениям, а когда уместно обозначить границу.'],
      ['Consider how you express disagreement while maintaining respect for yourself and others.', 'Обратите внимание, как выражать несогласие с уважением к себе и другим.'],
    ],
  },
  'trait.ipip50.conscientiousness': {
    name: ['Conscientiousness', 'Организованность и добросовестность'],
    meaning: [
      'This dimension reflects reported planning, order and follow-through; it is not a measure of talent or overall ability.',
      'Эта шкала отражает склонность к планированию, порядку и доведению дел до конца, но не измеряет талант или общие способности.',
    ],
    steps: [
      ['Look for one routine that supports your goals without unnecessary rigidity.', 'Найдите один ритуал, помогающий целям без излишней жёсткости.'],
      ['Notice when flexibility works better than detailed planning.', 'Отметьте ситуации, в которых гибкость полезнее детального плана.'],
    ],
  },
  'trait.ipip50.emotional_stability': {
    name: ['Emotional stability', 'Эмоциональная устойчивость'],
    meaning: [
      'Higher raw scores here correspond to endorsing calmer reactions more often; this is a personality description, not an anxiety or mood-disorder screening result.',
      'Более высокий сырой балл соответствует ответам о более спокойных реакциях. Это описание личностного стиля, а не результат диагностики тревожного или аффективного расстройства.',
    ],
    steps: [
      ['Notice which settings make it easier to stay grounded and which make reactions stronger.', 'Отметьте, в каких обстоятельствах легче сохранять опору, а где реакции усиливаются.'],
      ['Use your usual sources of support and recovery, without treating this trait score as a treatment target.', 'Опирайтесь на привычные способы поддержки и восстановления, не делая балл личностной шкалы целью лечения.'],
    ],
  },
  'trait.ipip50.intellect_imagination': {
    name: ['Intellect / imagination', 'Интерес к идеям и воображение'],
    meaning: [
      'This factor captures reported enjoyment of ideas and imagination, not measured IQ or intellectual capacity.',
      'Эта шкала отражает интерес к абстрактным идеям и воображению, а не IQ или уровень умственных способностей.',
    ],
    steps: [
      ['Notice whether creative exploration or concrete practical examples help you learn best.', 'Заметьте, что помогает учиться: творческое исследование или конкретные практические примеры.'],
      ['Choose a learning or creative activity that fits your interests, not a ranking of intelligence.', 'Выберите подходящее интересам учебное или творческое занятие, не опираясь на рейтинг интеллекта.'],
    ],
  },
})

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

// Optional self-care intensity depends on a source-backed screening band or a
// *descriptive* relative position, not on invented medical thresholds.
const BAND_ACTIONS = Object.freeze({
  minimal: [
    'If the reported symptoms are not affecting daily life, notice what helps you stay steady and review again only if relevant.',
    'Если описанные симптомы не мешают жизни, отмечайте, что поддерживает равновесие, и возвращайтесь к тесту по необходимости.',
  ],
  below_screen: [
    'A below-threshold screening score does not rule out a problem. Consider the wider context and ask for help if difficulties persist.',
    'Показатель ниже скринингового порога не исключает трудности. Учитывайте контекст и обращайтесь за помощью при стойких жалобах.',
  ],
  mild: [
    'Consider tracking which symptoms actually interfere with daily activities; a brief assessment is only one source of information.',
    'Отметьте, какие симптомы реально влияют на обычные дела; краткий опросник — только один источник информации.',
  ],
  low: [
    'Notice which somatic symptoms matter in daily life, and seek medical assessment if a symptom is new or persists.',
    'Отметьте телесные симптомы, влияющие на жизнь, и обратитесь к врачу, если жалоба новая или сохраняется.',
  ],
  medium: [
    'Pay attention to how bodily symptoms affect functioning, and consider a clinician review rather than deciding their cause yourself.',
    'Обратите внимание на влияние телесных симптомов на дела и рассмотрите консультацию специалиста вместо самостоятельного поиска причины.',
  ],
  moderate: [
    'Consider discussing this symptom pattern with a qualified professional, especially if it affects work, relationships or self-care.',
    'Рассмотрите обсуждение симптомов с квалифицированным специалистом, особенно если они мешают работе, общению или уходу за собой.',
  ],
  screen_signal: [
    'This screening signal suggests that a fuller assessment could help. You can discuss an appropriate next questionnaire with a qualified professional.',
    'Скрининговый сигнал указывает на возможную пользу более полной оценки. Подходящий следующий опросник можно обсудить со специалистом.',
  ],
  moderately_severe: [
    'Please prioritize a timely qualified evaluation if these experiences reflect your current state; self-help exercises alone are not an assessment.',
    'Если эти переживания отражают ваше состояние, по возможности организуйте своевременную оценку специалиста; упражнения не заменяют обследование.',
  ],
  severe: [
    'Please seek qualified clinical support promptly if these symptoms reflect your situation. If safety is immediately at risk, use local emergency services.',
    'Если симптомы соответствуют вашему состоянию, обратитесь за профессиональной помощью как можно скорее. При непосредственной опасности — в экстренную службу.',
  ],
  high: [
    'When symptom burden is high, a medical or psychological review can help clarify the situation; do not assume a psychological cause.',
    'При высоких показателях симптомов медицинская или психологическая оценка помогает прояснить ситуацию; не предполагайте автоматически психологическую причину.',
  ],
  low_coping: [
    'Consider trying one coping skill with support; a lower self-report coping score is not a verdict on your ability to manage life.',
    'Попробуйте один способ совладания с поддержкой; невысокий балл не определяет вашу способность справляться с жизнью.',
  ],
  mid_coping: [
    'Identify when your coping strategies are useful and one situation where a different response could help.',
    'Заметьте, когда привычное совладание помогает, и ситуацию, где мог бы пригодиться другой вариант.',
  ],
  high_coping: [
    'Identify one flexible coping strategy you want to preserve; a high score does not mean you must manage everything alone.',
    'Выберите гибкий способ совладания, который хотите сохранять; высокий балл не означает, что всё нужно решать в одиночку.',
  ],
  descriptive_difficulty_lower: [
    'This score is in the lower part of the possible response range, not a clinical category. Focus on what is currently working.',
    'Показатель в нижней части доступных значений — не клиническая категория. Отмечайте то, что уже помогает.',
  ],
  descriptive_difficulty_middle: [
    'Describe when this difficulty is more or less noticeable; score position alone cannot establish severity.',
    'Замечайте, когда трудность выражена сильнее или слабее; положение на шкале само по себе не определяет тяжесть.',
  ],
  descriptive_difficulty_upper: [
    'Explore one manageable way to reduce the impact of this reported difficulty and consider extra support if it disrupts life.',
    'Найдите один посильный способ снизить влияние трудности и подумайте о поддержке, если она мешает повседневности.',
  ],
  descriptive_resource_lower: [
    'A lower resource score may be a prompt to seek a modest support or recovery opportunity, not a deficiency in you.',
    'Нижняя часть шкалы ресурсов может подсказать поиск поддержки или отдыха, но не означает личный недостаток.',
  ],
  descriptive_resource_middle: [
    'Consider in which situations this resource is available and where a little additional support might help.',
    'Отметьте ситуации, где ресурс доступен, и где могла бы помочь небольшая дополнительная поддержка.',
  ],
  descriptive_resource_upper: [
    'Notice which conditions support this resource and which routines could help maintain it.',
    'Отметьте условия, поддерживающие этот ресурс, и привычки, помогающие его сохранять.',
  ],
  descriptive_trait: [
    'This score describes a personal style or tendency, which may vary by context; it is not inherently good or bad.',
    'Это описание стиля или склонности, зависящих от ситуации, а не показатель того, что человек «лучше» или «хуже».',
  ],
})

function bandAction(dimension, classification, langIndex) {
  let code = classification.code
  if (classification.basis === 'descriptive') {
    const direction = String(dimension.direction || 'non-normative')
    code = direction.startsWith('higher-reported-')
      ? 'descriptive_resource_' + classification.code
      : direction.startsWith('lower-reported-')
        ? 'descriptive_difficulty_' + classification.code
        : 'descriptive_trait'
  }
  return (BAND_ACTIONS[code] || BAND_ACTIONS.descriptive_trait)[langIndex]
}

function personalizedSteps(dimension, content, langIndex, plan, classification) {
  if (classification.basis === 'unavailable') return []
  const base = content.try.map((pair) => pair[langIndex])
  const specific = plan?.step?.[langIndex ? 'ru' : 'en'] || base[1]
  const bandAdvice = bandAction(dimension, classification, langIndex)
  const min = Number(dimension.min)
  const max = Number(dimension.max)
  const value = Number(dimension.value)
  const position = (value - min) / (max - min)
  const lowBurden = String(dimension.direction || '').startsWith('lower-reported-') &&
    position < 1 / 3 && classification.basis === 'descriptive'
  const strongResource = String(dimension.direction || '').startsWith('higher-reported-') &&
    position > 2 / 3 && classification.basis === 'descriptive'
  // Descriptive bands MUST NOT be described as clinical severity.
  if (lowBurden) return [
    langIndex
      ? 'Этот показатель находится в нижней части шкалы трудностей. Если это соответствует вашему опыту, отметьте, что помогает сохранять текущее равновесие, вместо больших изменений только из-за теста.'
      : 'This overall score is in the lower part of the reported-difficulty scale. If it reflects your experience, notice what helps maintain your balance rather than making major changes based only on the questionnaire.',
    specific,
    bandAdvice,
    base[0],
  ]
  if (strongResource) return [
    langIndex
      ? 'Этот показатель расположен в верхней части шкалы ресурсов. Отметьте один конкретный источник устойчивости, который хотели бы сохранить в ближайшие дни.'
      : 'This score is in the upper part of the reported-resource scale. Identify one specific source of support or strength you want to preserve over the next few days.',
    specific,
    base[0],
  ]
  // Preserve the validated-screening distinction: a score at/above a published
  // cut-point receives support options, never a diagnosis or an auto-prescription.
  // Keep the first burnout step observational for continuity with earlier reports.
  if (content === ADVICE.burnout && position > 2 / 3)
    return [base[0], specific, bandAdvice, base[1]]
  return [specific, bandAdvice, ...base]
}

function visibleConstruct(dimension, language) {
  const raw = String(dimension.sourceConstruct || dimension.key || '').trim()
  const names = {
    'state.fatigue': ['Fatigue', 'Усталость'],
    'state.life_impact': ['Impact on daily life', 'Влияние на повседневную жизнь'],
    'state.problem_intensity': ['Current problem intensity', 'Интенсивность проблемы'],
  }
  const known = names[dimension.key] || names[raw]
  if (known) return known[language === 'ru' ? 1 : 0]
  if (raw && !/^[a-z-]+[.][a-z0-9_.-]+$/i.test(raw)) return raw
  return raw.split('.').pop().replace(/[_-]+/g, ' ').replace(/^./, first => first.toUpperCase())
}

export function buildAssessmentResultReport(result, locale = 'en') {
  // Bach scoring uses a distinct weighted ranking and 38 human-authored theme guides.
  // Preserve its bespoke report, never reinterpret weights as clinical severities.
  if (result?.definitionKey === 'hh-bach-flower-profile')
    return { ...buildBachResultReport(result, locale), rulesVersion: INTERPRETATION_RULES_VERSION }

  const language = locale === 'ru' ? 'ru' : 'en'
  const ru = language === 'ru'
  const langIndex = ru ? 1 : 0
  const measures = Array.isArray(result?.dimensions) ? result.dimensions : []
  const plan = interpretationPlan(result?.definitionKey, result?.definitionVersion)
  const sections = measures.map((dimension) => {
    const classification = interpretationForDimension(result, dimension, language)
    const dimensionPlan = interpretationDimensionPlan(result, dimension.key)
    const domain = dimensionPlan?.domain || plan?.domain || domainFor(dimension, result)
    const content = ADVICE[domain] || ADVICE.general
    const traitGuide = result?.definitionKey === 'ipip-big-five-50' ? IPIP_TRAIT_GUIDANCE[dimension.key] : null
    const plannedSteps = personalizedSteps(dimension, content, langIndex, dimensionPlan || plan, classification)
    const steps = traitGuide
      ? traitGuide.steps.map(pair => pair[langIndex])
      : plannedSteps
    const clinicalFollowUp = classification.recommendedReview
      ? ru
        ? 'Повышенный скрининговый показатель — повод обсудить симптомы и их влияние на жизнь с квалифицированным специалистом. Он не устанавливает диагноз. При непосредственной угрозе безопасности обращайтесь в экстренную службу.'
        : 'An elevated screening result is a reason to discuss symptoms and their everyday impact with a qualified professional; it is not a diagnosis. Seek emergency help if you face immediate danger.'
      : ''
    return {
      key: dimension.key,
      domain,
      title: content.title[langIndex],
      construct: dimensionPlan?.label?.[language] || traitGuide?.name?.[langIndex] || visibleConstruct(dimension, language),
      value: dimension.value,
      min: dimension.min,
      max: dimension.max,
      meaning: classification.meaning + (traitGuide ? ' ' + traitGuide.meaning[langIndex] : ''),
      band: classification.label,
      bandBasis: classification.basis,
      source: classification.source,
      steps,
      followUp: classification.basis === 'unavailable' ? (ru ? 'Проверьте корректность результата перед дальнейшими выводами.' : 'Verify the score before taking any further action.') : (clinicalFollowUp || content.extra[langIndex]),
      recommendedReview: classification.recommendedReview,
    }
  })
  const hasDifficulty = measures.some((dimension) => classificationDirection(dimension) === 'difficulty') ||
    sections.some((section) => section.recommendedReview)
  const missingPlan = !plan
  return {
    rulesVersion: INTERPRETATION_RULES_VERSION,
    definitionVersion: result?.definitionVersion || null,
    title: ru ? 'Ваш отчёт и конкретные рекомендации' : 'Your report and practical recommendations',
    intro: ru
      ? 'Для каждого показателя приведены интерпретация его значения и практические шаги по теме этого теста. Опубликованные скрининговые диапазоны отделены от описательных шкал.'
      : 'Each measure has a score-specific interpretation and practical next steps. Published screening categories are kept separate from descriptive questionnaire ranges.',
    purpose: monitoringCatalogItem(result?.definitionKey)?.description?.[language] ||
      monitoringCatalogItem(result?.definitionKey)?.description?.en ||
      (ru ? 'Этот опросник описывает ответы в конкретный период; учитывайте контекст.' : 'This questionnaire describes responses in a particular period; consider the context.'),
    sections,
    note: missingPlan
      ? ru
        ? 'Для этой версии инструмента ещё нет проверенных правил. Положение на шкале — не клинический порог, диагноз или доказательство причины.'
        : 'This instrument version has no reviewed interpretation plan. A descriptive score is not a clinical cutoff, diagnosis or proof of cause.'
      : ru
        ? 'Описательное положение на шкале — не клинический порог. Даже опубликованные скрининговые диапазоны не устанавливают диагноз и не заменяют клиническую оценку; советы не являются назначением лечения.'
        : 'A descriptive position on a scale is not a clinical cutoff. Even published screening bands do not establish a diagnosis or replace a clinical assessment; suggestions are not treatment prescriptions.',
    seekSupport: hasDifficulty
      ? ru
        ? 'Если трудности сохраняются, нарастают или мешают повседневной жизни, обратитесь к квалифицированному специалисту. Ответы не отслеживаются в реальном времени.'
        : 'If difficulties persist, worsen or interfere with daily life, contact a qualified professional. Responses are not monitored in real time.'
      : null,
  }
}
