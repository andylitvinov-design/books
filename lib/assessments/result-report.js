import { isPcPtsd5Result, buildPcPtsd5ResultReport } from './pc-ptsd5-report.js'
import { IPIP_TRAIT_GUIDANCE } from './ipip50-guidance.js'
import { withReportInterpretationSource } from './report-interpretation-source.js'
import { verifiedHistoryResult } from './verified-history.js'
import { buildOriginalCheckinInsight } from './checkin-synthesis.js'
import { isTraumaResult, buildTraumaResultReport } from './trauma-report.js'
import { buildBachResultReport, isBachResult } from './bach-guidance.js'
import { personalityTypeHypothesis, personalityDimensionGuidance } from './personality-type-interpretation.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { assessmentMethodology } from './assessment-methodology.js'
import { RELATIONSHIPS_INTIMACY_KEYS, RELATIONSHIP_CONTEXT_COPY } from '../../data/assessments/relationships-intimacy-v1.js'
import { TANTRIC_REFLECTION_KEYS, TANTRIC_CONTEXT_COPY } from '../../data/assessments/tantric-reflections-v1.js'
import { interpretationPlan, interpretationDimensionPlan, interpretationForDimension, interpretationBandModel, classificationDirection, exactAsrs6DefinitionForResult, INTERPRETATION_RULES_VERSION } from './interpretation-registry.js'


/**
 * Source-specific, score-aware PHQ-4 explanations. Only show these after the
 * immutable source identity and published screening bands have been verified.
 * The same copy is used by the on-screen report and the saved/PDF interpretation.
 */
function verifiedPhq4Narrative(result, dimension, classification, locale) {
  if (result?.definitionKey !== 'phq-4' || classification.basis !== 'screening' ||
      !Number.isInteger(dimension?.value)) return null
  const ru = locale === 'ru'
  const score = dimension.value
  if (dimension.key === 'symptoms.phq4.total' && dimension.min === 0 && dimension.max === 12) {
    const mood = result.dimensions?.find(item => item.key === 'symptoms.phq4.depression')
    const anxiety = result.dimensions?.find(item => item.key === 'symptoms.phq4.anxiety')
    const compatible = [mood, anxiety].every(item => item && Number.isInteger(item.value) &&
      item.min === 0 && item.max === 6) && mood.value + anxiety.value === score
    const focus = !compatible ? '' : anxiety.value > mood.value
      ? (ru
        ? `Из них ${anxiety.value} баллов относятся к вопросам о тревоге, а ${mood.value} — к настроению: тревожные переживания заметнее в этих ответах.`
        : `The anxiety questions contribute ${anxiety.value} points versus ${mood.value} for mood, making worry the more prominent concern in these answers.`)
      : mood.value > anxiety.value
        ? (ru
          ? `Из них ${mood.value} баллов относятся к настроению, а ${anxiety.value} — к тревоге: вопросы о настроении дали больший вклад.`
          : `The mood questions contribute ${mood.value} points versus ${anxiety.value} for anxiety, making mood the more prominent concern in these answers.`)
        : (ru
          ? 'Вопросы о настроении и тревоге дали одинаковый вклад — их полезно рассмотреть по отдельности.'
          : 'The mood and anxiety questions contribute equally; consider each area separately.')
    return ru
      ? `Общий результат PHQ-4 — ${score}/12: «${classification.label}» по опубликованной скрининговой категории за последние две недели. ${focus} Сумма не определяет причину и не устанавливает диагноз; обратите внимание на влияние переживаний на повседневную жизнь.`
      : `The PHQ-4 total is ${score}/12, in the published “${classification.label}” screening band for the past two weeks. ${focus} The sum does not explain the cause. Questionnaire results do not diagnose a condition; consider the impact on daily life.`
  }
  if (dimension.min !== 0 || dimension.max !== 6) return null
  if (dimension.key === 'symptoms.phq4.depression') {
    return ru
      ? `За последние две недели два вопроса о снижении интереса и подавленном настроении дали ${score}/6 — ${score >= 3 ? 'на уровне или выше порога 3/6 для дополнительной оценки' : 'ниже скринингового порога 3/6'}. ${score >= 3 ? 'Если это мешает обычной жизни, обсудите симптомы с квалифицированным специалистом.' : 'Это не исключает сложностей с настроением, особенно если они мешают обычной жизни.'} Ответы опросника не устанавливают диагноз.`
      : `Across the past two weeks, the two questions about low mood and loss of interest add up to ${score}/6 — ${score >= 3 ? 'at or above the 3/6 threshold for further screening' : 'below the 3/6 screening threshold'}. ${score >= 3 ? 'Discuss the symptoms and their day-to-day impact with a qualified professional.' : 'This does not rule out mood difficulties, especially if they affect everyday life.'} Questionnaire results do not diagnose a condition.`
  }
  if (dimension.key === 'symptoms.phq4.anxiety') {
    return ru
      ? `За последние две недели два вопроса о нервозности и трудноконтролируемом беспокойстве дали ${score}/6 — ${score >= 3 ? 'на уровне или выше порога 3/6 для дополнительной оценки' : 'ниже скринингового порога 3/6'}. ${score >= 3 ? 'Стоит обсудить, как тревога влияет на сон, внимание и повседневные дела, с квалифицированным специалистом.' : 'Если беспокойство всё же мешает жить, его имеет смысл обсудить независимо от балла.'} Ответы опросника не устанавливают диагноз.`
      : `Across the past two weeks, the two questions about nervousness and hard-to-control worry add up to ${score}/6 — ${score >= 3 ? 'at or above the 3/6 threshold for further screening' : 'below the 3/6 screening threshold'}. ${score >= 3 ? 'Discuss the effects on sleep, concentration and daily routines with a qualified professional.' : 'If worry affects everyday life, it is worth discussing regardless of the score.'} Questionnaire results do not diagnose a condition.`
  }
  return null
}

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

// Source-aware actions precede optional general reflection prompts. Never
// manufacture treatment advice from arbitrary fractions of a response range.
const distinctSteps = steps => [...new Set(steps.filter(step => typeof step === 'string' && step.trim()))]

function personalizedSteps(content, langIndex, plan, classification, traitGuide, typingGuide) {
  if (classification.basis === 'unavailable') return []
  const language = langIndex ? 'ru' : 'en'
  return distinctSteps([
    ...(classification.actions || []),
    ...(typingGuide?.steps || []),
    ...(traitGuide?.steps || []).map(pair => pair[langIndex]),
    plan?.step?.[language],
    ...content.try.map(pair => pair[langIndex]),
  ])
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

function buildAsrs6ResultReport(result, locale) {
  const ru = locale === 'ru'
  const language = ru ? 'ru' : 'en'
  const definition = exactAsrs6DefinitionForResult(result)
  const dimension = definition ? result.dimensions[0] : null
  const classification = interpretationForDimension(result, dimension, language)
  const followUp = ru
    ? 'Независимо от результата обсудите беспокоящие симптомы с квалифицированным медицинским специалистом. Точный диагноз требует клинической оценки.'
    : 'Discuss concerns with a qualified healthcare professional regardless of the score. An accurate diagnosis requires a clinical evaluation.'
  const contextNote = definition?.instrumentLocale === 'ru'
    ? ru
      ? 'Использован официальный русский перевод, распространяемый NYU. Валидация именно этой русской формулировки не подтверждена. Язык отчёта не меняет происхождение или статус валидации вопросов.'
      : 'The questionnaire uses the official Russian translation distributed by NYU. Validation of this exact Russian wording has not been established. Changing the report language does not change the questionnaire provenance or validation status.'
    : definition
      ? ru
        ? 'Использован оригинальный английский опросник. Русские пояснения Holistic House относятся только к отчёту и не являются переводом вопросов.'
        : 'The questionnaire uses the original English form. Holistic House explanations are separate from the instrument text.'
      : ru
        ? 'Не удалось подтвердить точную версию и происхождение результата. Скрининговый вывод недоступен.'
        : 'The exact version and provenance of this result could not be verified. No screening interpretation is available.'
  return {
    rulesVersion: INTERPRETATION_RULES_VERSION,
    definitionVersion: result?.definitionVersion || null,
    displayKind: 'screening-count',
    title: ru ? 'Результат скрининга ASRS-v1.1 6Q' : 'ASRS-v1.1 6Q screening result',
    intro: ru
      ? 'Пояснение Holistic House к классическому подсчёту заштрихованных ответов. Исходный текст инструмента приведён отдельно.'
      : 'Holistic House explanation of the classic shaded-response count. Original instrument text is provided separately.',
    purpose: ru
      ? 'Шесть вопросов для взрослых от 18 лет о внимании и активности за последние шесть месяцев. Только скрининг; результат не устанавливает диагноз.'
      : 'Six questions for adults aged 18 or older about attention and activity during the past six months. Screening only; the result does not establish a diagnosis.',
    methodology: assessmentMethodology({ key: 'asrs-6', definition, locale: language }).text,
    contextNote,
    personalityType: null,
    instrumentText: definition ? {
      instrumentLocale: definition.instrumentLocale,
      eligibilityText: definition.eligibilityText,
      printedScoringText: definition.printedScoringText,
      safetyText: definition.safetyText,
      requiredSiteAttribution: definition.requiredSiteAttribution,
      formCopyright: definition.formCopyright,
      sourceUrl: definition.source.url,
    } : null,
    sections: [{
      key: 'symptoms.asrs6.shaded_count', domain: 'attention',
      title: ru ? 'Скрининг внимания и активности' : 'Attention and activity screening',
      construct: ru ? 'Ответы в заштрихованных клетках' : 'Shaded-response count',
      value: dimension?.value ?? null, min: 0, max: 6,
      displayKind: 'screening-count',
      meaning: classification.meaning,
      summary: classification.summary,
      band: classification.label,
      bandBasis: classification.basis,
      source: classification.source,
      steps: definition ? [
        ru
          ? 'Можно записать конкретные примеры трудностей с вниманием или активностью и их влияние на повседневную жизнь за последние шесть месяцев.'
          : 'Consider noting concrete examples of attention or activity difficulties and their everyday impact during the past six months.',
        classification.recommendedReview
          ? ru
            ? 'Результат может соответствовать симптомам СДВГ у взрослых. Возможно, будет полезно обсудить дальнейшую оценку с квалифицированным медицинским специалистом.'
            : 'These symptoms may be consistent with adult ADHD. It may be helpful to discuss an evaluation with a qualified healthcare professional.'
          : ru
            ? 'Результат ниже порога не исключает СДВГ. Если вас что-то беспокоит, обсудите это с квалифицированным медицинским специалистом независимо от балла.'
            : 'A below-threshold result does not rule out ADHD. Discuss any concerns with a qualified healthcare professional regardless of the score.',
      ] : [],
      followUp: definition ? followUp : contextNote,
      recommendedReview: classification.recommendedReview,
    }],
    note: ru
      ? 'Число 0–6 отражает только количество ответов в заштрихованных клетках. Это не шкала тяжести, процент здоровья или вероятность СДВГ; не показатель личностных черт или ежедневного прогресса. Баллы не определяют лечение. Шесть месяцев — период вопросов, а не рекомендованный интервал повторного теста.'
      : 'The 0–6 count records only responses in the shaded cells. It is not a severity scale, health percentage or probability of ADHD, personality measure or daily-progress score. It does not determine treatment. Six months is the reference period, not a recommended retesting interval.',
    seekSupport: definition ? followUp : null,
  }
}

function buildAssessmentResultReportContent(result, locale = 'en') {
  const integrity = verifiedHistoryResult(result)
  // Recognise retained Bach scoring/dimensions before key-only specialised
  // routes, so an altered key cannot attach another instrument's methodology.
  if (isBachResult(result)) {
    const report = buildBachResultReport(result, locale)
    const methodology = report.verified
      ? assessmentMethodology({ key: result.definitionKey, catalog: monitoringCatalogItem(result.definitionKey), locale }).text
      : assessmentMethodology({ locale }).text
    return { ...report, rulesVersion: INTERPRETATION_RULES_VERSION, methodology }
  }
  if (isPcPtsd5Result(result)) return buildPcPtsd5ResultReport(result, locale)
  if (integrity && isTraumaResult(result)) return { ...buildTraumaResultReport(result, locale), methodology: assessmentMethodology({key: result?.definitionKey, catalog: monitoringCatalogItem(result?.definitionKey), locale}).text }
  if (integrity && (result?.definitionKey === 'asrs-6' || result?.scoringKey === 'asrs-v1-6-classic' ||
      (Array.isArray(result?.dimensions) && result.dimensions.some(dimension => dimension?.key === 'symptoms.asrs6.shaded_count'))))
    return buildAsrs6ResultReport(result, locale)
  const methodology = assessmentMethodology({key: result?.definitionKey, catalog: monitoringCatalogItem(result?.definitionKey), locale}).text
  const language = locale === 'ru' ? 'ru' : 'en'
  const ru = language === 'ru'
  const langIndex = ru ? 1 : 0
  const measures = Array.isArray(result?.dimensions) ? Array.from(result.dimensions)
    .filter(d => d && typeof d === 'object' && !Array.isArray(d)) : []
  const plan = interpretationPlan(result?.definitionKey, result?.definitionVersion)
  const sections = measures.map((dimension) => {
    const classification = interpretationBandModel(result, dimension, language)
    const dimensionPlan = interpretationDimensionPlan(result, dimension.key)
    const domain = dimensionPlan?.domain || plan?.domain || domainFor(dimension, result)
    const content = ADVICE[domain] || ADVICE.general
    const validInterpretation = classification.basis !== 'unavailable'
    const traitGuide = validInterpretation && result?.definitionKey === 'ipip-big-five-50' ? IPIP_TRAIT_GUIDANCE[dimension.key] : null
    const typingGuide = validInterpretation ? personalityDimensionGuidance(dimension, language) : null
    const specificMeaning = typingGuide?.meaning || traitGuide?.meaning[langIndex]
    const steps = personalizedSteps(content, langIndex, dimensionPlan || plan, classification, traitGuide, typingGuide)
    const clinicalFollowUp = classification.recommendedReview
      ? ru
        ? 'Повышенный скрининговый показатель — повод обсудить симптомы и их влияние на жизнь с квалифицированным специалистом. Он не устанавливает диагноз. При непосредственной угрозе безопасности обращайтесь в экстренную службу.'
        : 'An elevated screening result is a reason to discuss symptoms and their everyday impact with a qualified professional; it is not a diagnosis. Seek emergency help if you face immediate danger.'
      : ''
    const focusedMeaning = validInterpretation ? verifiedPhq4Narrative(result, dimension, classification, language) : null
    return {
      key: dimension.key,
      domain,
      presentationDirection: validInterpretation ? classification.presentationDirection || 'neutral' : 'neutral',
      title: content.title[langIndex],
      construct: dimensionPlan?.label?.[language] || traitGuide?.name?.[langIndex] ||
        (classification.basis !== 'unavailable' ? classification.construct : null) || visibleConstruct(dimension, language),
      value: dimension.value,
      min: dimension.min,
      max: dimension.max,
      meaning: (focusedMeaning ? focusedMeaning + ' ' : '') + classification.meaning + (specificMeaning && !classification.meaning.includes(specificMeaning) ? ' ' + specificMeaning : ''),
      summary: focusedMeaning || (specificMeaning && classification.summary?.includes(specificMeaning) ? classification.summary : specificMeaning || classification.summary),
      band: classification.label,
      bandBasis: classification.basis,
      responseAnchors: validInterpretation ? classification.responseAnchors || null : null,
      source: classification.source,
      steps,
      // The compact view presents one existing, non-score-prefixed option.
      // Keep every source-linked action in steps for the expanded report.
      primarySupport: validInterpretation
        ? classification.actions?.[1] || typingGuide?.steps?.[0] || traitGuide?.steps?.[0]?.[langIndex] ||
          (dimensionPlan || plan)?.step?.[language] || content.try[0][langIndex]
        : null,
      limitations: classification.limitations || [],
      followUp: classification.basis === 'unavailable' ? (ru ? 'Проверьте корректность результата перед дальнейшими выводами.' : 'Verify the score before taking any further action.') : (clinicalFollowUp || typingGuide?.followUp || content.extra[langIndex]),
      recommendedReview: classification.recommendedReview,
    }
  })
  const hasDifficulty = measures.some((dimension) => classificationDirection(dimension) === 'difficulty') ||
    sections.some((section) => section.recommendedReview)
  const verified = sections.length > 0 && sections.every(section => section.bandBasis !== 'unavailable')
  const checkinInsight = verified && integrity ? buildOriginalCheckinInsight(result, sections, language) : null
  const unverifiedNotice = ru
    ? 'Происхождение, версия или показатели сохранённого результата не подтверждены. Числа показаны только как сохранённые данные; интерпретация и персональные рекомендации недоступны.'
    : 'The saved result’s provenance, version or scores could not be verified. Numbers are shown only as saved data; interpretation and personalised recommendations are unavailable.'
  const missingPlan = !plan
  return {
    verified,
    rulesVersion: INTERPRETATION_RULES_VERSION,
    definitionVersion: result?.definitionVersion || null,
    title: !verified ? (ru ? 'Сохранённый результат: требуется проверка' : 'Saved result: verification needed')
      : ru ? 'Ваш отчёт и конкретные рекомендации' : 'Your report and practical recommendations',
    intro: (!verified ? unverifiedNotice : ru
      ? 'Для каждого показателя приведены интерпретация его значения и практические шаги по теме этого теста. Опубликованные скрининговые диапазоны отделены от описательных шкал.'
      : 'Each measure has a score-specific interpretation and practical next steps. Published screening categories are kept separate from descriptive questionnaire ranges.') + (checkinInsight ? ' ' + checkinInsight.summary + ' ' + checkinInsight.reflectionQuestion : ''),
    purpose: !verified ? unverifiedNotice : monitoringCatalogItem(result?.definitionKey)?.description?.[language] ||
      monitoringCatalogItem(result?.definitionKey)?.description?.en ||
      (ru ? 'Этот опросник описывает ответы в конкретный период; учитывайте контекст.' : 'This questionnaire describes responses in a particular period; consider the context.'),
    sections,
    checkinInsight,
    methodology: verified ? methodology : assessmentMethodology({ locale: language }).text,
    personalityType: verified
      ? personalityTypeHypothesis(result, language) : null,
    contextNote: verified && result?.definitionVersion === 'v1'
      ? RELATIONSHIPS_INTIMACY_KEYS.includes(result?.definitionKey)
        ? RELATIONSHIP_CONTEXT_COPY[language]
        : TANTRIC_REFLECTION_KEYS.includes(result?.definitionKey) ? TANTRIC_CONTEXT_COPY[language] : null
      : null,
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


export function buildAssessmentResultReport(result, locale = 'en') {
  return withReportInterpretationSource(buildAssessmentResultReportContent(result, locale), result, locale)
}
