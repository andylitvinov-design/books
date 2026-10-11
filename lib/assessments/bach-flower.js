import { BACH_QUESTION_BANK, BACH_REMEDY_NAMES } from '../../data/assessments/bach-flower-v1.js'

const SECTION_WEIGHTS = Object.freeze({ situation: 1, character: 1, control: 1.5 })
const SECTION_LABELS = Object.freeze({
  en: { situation: 'current situation', character: 'recurring patterns', control: 'confirmation' },
  ru: { situation: 'текущая ситуация', character: 'повторяющиеся особенности', control: 'контрольный срез' },
})

// A vocabulary for interpretation and reflection, not evidence of medical effectiveness.
const REMEDY_THEMES = Object.freeze({
  Agrimony: ['Hiding distress behind harmony', 'Скрытые переживания за внешним спокойствием'],
  Aspen: ['Unease without a clear cause', 'Неясная тревога'],
  Beech: ['Criticism and low tolerance', 'Критичность и нетерпимость'],
  Centaury: ['Difficulty setting boundaries', 'Трудности с личными границами'],
  Cerato: ['Doubting your judgment', 'Недоверие к собственным решениям'],
  'Cherry Plum': ['Fear of losing emotional control', 'Страх потерять эмоциональный контроль'],
  'Chestnut Bud': ['Repeating familiar mistakes', 'Повторение привычных ошибок'],
  Chicory: ['Needing acknowledgment and care', 'Ожидание признания и заботы'],
  Clematis: ['Drifting away from the present', 'Уход от настоящего'],
  'Crab Apple': ['Discomfort with imperfections', 'Неприятие несовершенства'],
  Elm: ['Feeling overwhelmed by responsibility', 'Перегрузка ответственностью'],
  Gentian: ['Discouragement after setbacks', 'Уныние после трудностей'],
  Gorse: ['Loss of hope', 'Потеря надежды'],
  Heather: ['Need for attention and connection', 'Потребность во внимании и общении'],
  Holly: ['Jealousy, anger or suspicion', 'Ревность, гнев и подозрительность'],
  Honeysuckle: ['Being stuck in the past', 'Застревание в прошлом'],
  Hornbeam: ['Difficulty getting started', 'Трудность приступить к делу'],
  Impatiens: ['Impatience with others or delays', 'Нетерпеливость'],
  Larch: ['Doubting your abilities', 'Неуверенность в своих силах'],
  Mimulus: ['Fear of specific situations', 'Страх конкретных ситуаций'],
  Mustard: ['Sadness without a clear trigger', 'Грусть без ясной причины'],
  Oak: ['Pushing on despite fatigue', 'Напряжённый долг вопреки усталости'],
  Olive: ['Emotional or physical exhaustion', 'Эмоциональное или физическое истощение'],
  Pine: ['Guilt and self-blame', 'Вина и самообвинение'],
  'Red Chestnut': ['Worry about others', 'Тревога за других'],
  'Rock Rose': ['Acute fear or panic', 'Сильный страх или паника'],
  'Rock Water': ['Rigidity and self-denial', 'Жёсткость к себе'],
  Scleranthus: ['Indecision between alternatives', 'Колебания между вариантами'],
  'Star of Bethlehem': ['Unprocessed shock or hurt', 'Переживание шока или душевной раны'],
  'Sweet Chestnut': ['Feeling trapped or desperate', 'Ощущение тупика и отчаяния'],
  Vervain: ['Overcommitment and intensity', 'Чрезмерное рвение'],
  Vine: ['Pressure and need for control', 'Давление и стремление контролировать'],
  Walnut: ['Difficulty adapting to change', 'Трудности адаптации к переменам'],
  'Water Violet': ['Withdrawal and isolation', 'Замкнутость и изоляция'],
  'White Chestnut': ['Repetitive unwanted thoughts', 'Повторяющиеся навязчивые мысли'],
  'Wild Oat': ['Uncertainty about life direction', 'Неопределённость жизненного пути'],
  'Wild Rose': ['Apathy and resignation', 'Апатия и пассивность'],
  Willow: ['Resentment and feeling wronged', 'Обида и ощущение несправедливости'],
})

const QUESTIONS_BY_REMEDY = Object.freeze(Object.fromEntries(
  BACH_REMEDY_NAMES.map((name) => [name, BACH_QUESTION_BANK.filter((q) => q.remedy === name)]),
))
const scoreMax = (name) => {
  const questions = QUESTIONS_BY_REMEDY[name]
  const sections = new Set(questions.map(({section}) => section))
  return questions.reduce((sum, q) => sum + 5 * SECTION_WEIGHTS[q.section] + 2, 0) +
    (sections.size >= 3 ? 4 : sections.size === 2 ? 2 : 0) +
    (sections.has('control') ? 1.5 : 0)
}
const remedyKey = (remedy) => 'bach.' + remedy.toLowerCase().replaceAll(' ', '-')
const roundScore = (value) => Math.round(value * 10) / 10

// Mirrors the source scorer's weights, peaks, cross-section and control bonuses.
// Stable remedy-keyed dimensions let existing saved reports/history compare the same
// remedy between visits, even when the ranking changes.
export function scoreBachRemedies(definition, answers) {
  return BACH_REMEDY_NAMES.map((remedy) => {
    const matched = QUESTIONS_BY_REMEDY[remedy].filter((q) => answers[q.id] > 0)
    const sectionScores = { situation: 0, character: 0, control: 0 }
    const themeScores = new Map()
    let peakBonus = 0
    for (const q of matched) {
      const value = answers[q.id]
      sectionScores[q.section] += value
      themeScores.set(q.theme, (themeScores.get(q.theme) || 0) + value)
      if (value === 4) peakBonus += 1
      if (value === 5) peakBonus += 2
    }
    const sections = Object.keys(sectionScores).filter((key) => sectionScores[key] > 0)
    const crossSectionBonus = sections.length >= 3 ? 4 : sections.length === 2 ? 2 : 0
    const controlPresenceBonus = sections.includes('control') ? 1.5 : 0
    const total = Object.entries(sectionScores).reduce(
      (sum, [section, score]) => sum + score * SECTION_WEIGHTS[section], 0,
    ) + crossSectionBonus + peakBonus + controlPresenceBonus
    const theme = [...themeScores].sort((a, b) => b[1] - a[1])[0]?.[0] || null
    return {
      key: remedyKey(remedy),
      remedy,
      value: roundScore(total),
      min: 0,
      max: scoreMax(remedy),
      unit: 'points',
      timeframe: definition.timeframe,
      direction: 'non-normative',
      dimensionClass: 'state',
      sourceConstruct: remedy,
      sections,
      evidenceCount: matched.length,
      theme,
      // Supplemental labels are explanatory, not diagnostic probability values.
    }
  })
}

const sectionText = (sections, locale) => {
  const labels = SECTION_LABELS[locale] || SECTION_LABELS.en
  return sections.map((value) => labels[value] || value).join(', ')
}

export function buildBachFlowerReport(result, locale = 'en') {
  const ru = locale === 'ru'
  const lang = ru ? 'ru' : 'en'
  const positive = (result?.dimensions || [])
    .filter((item) => item.key?.startsWith('bach.') && item.remedy && item.value > 0)
    .sort((a, b) => b.value - a.value || b.evidenceCount - a.evidenceCount || a.remedy.localeCompare(b.remedy, 'en'))
  const shortlisted = positive.slice(0, 13)
  const title = ru ? 'Ваш эмоциональный профиль по методике Баха' : 'Your Bach Flower Emotional Reflection'
  const intro = ru
    ? 'Сопоставлены ответы из трёх разделов: ситуация, устойчивые реакции и контроль. Ниже — не назначение препаратов, а темы для личного наблюдения и обсуждения со специалистом.'
    : 'Your responses across situation, recurring patterns and confirmation were compared. These are themes for personal reflection and practitioner discussion, not prescriptions.'
  const note = ru
    ? 'Рейтинг эссенций — не клинический порог, диагноз, оценка эффективности или индивидуальная рекомендация к лечению. Доказательств эффективности цветочных эссенций Баха при заболеваниях недостаточно.'
    : 'The essence ranking is not a clinical cutoff, diagnosis, effectiveness estimate or individualized treatment recommendation. Evidence that Bach flower remedies treat health conditions is insufficient.'
  const followUp = ru
    ? 'Если сильные чувства, тревога или упадок сил сохраняются либо мешают повседневной жизни, обратитесь к квалифицированному специалисту.'
    : 'If distress, anxiety or exhaustion persists or affects daily life, consider speaking with a qualified healthcare professional.'
  const sections = shortlisted.map((dimension, index) => {
    const role = index < 3
      ? (ru ? 'Основное соответствие' : 'Primary match')
      : index < 7
        ? (ru ? 'Дополнительная тема' : 'Additional theme')
        : (ru ? 'Для уточнения' : 'For further review')
    const theme = REMEDY_THEMES[dimension.remedy]?.[ru ? 1 : 0] || dimension.remedy
    const placement = ru
      ? `Эссенция ${dimension.remedy} сопоставлена с темой «${theme}». Отмечено признаков: ${dimension.evidenceCount}; разделы: ${sectionText(dimension.sections || [], lang)}. Баллы отражают только совпадения с вопросами анкеты и не подтверждают лечебный эффект.`
      : `${dimension.remedy} was matched to the theme “${theme}”. Positive answers: ${dimension.evidenceCount}; sections: ${sectionText(dimension.sections || [], lang)}. Points express questionnaire matches only, not treatment effectiveness.`
    const limited = (dimension.sections || []).length <= 1 || dimension.evidenceCount <= 1
    return {
      key: dimension.key,
      domain: 'emotional-reflection',
      title: `${role} · ${dimension.remedy}`,
      construct: theme,
      value: dimension.value,
      max: dimension.max,
      meaning: placement + (limited
        ? ru ? ' Соответствие основано на узком круге ответов; требуется уточнение.' : ' This match rests on limited answers and needs further review.'
        : ''),
      steps: ru ? [
        `В течение недели замечайте, когда возникает тема «${theme}», и кратко записывайте ситуацию и свои ощущения.`,
        'Отмечайте, что помогает восстановить устойчивость в такие моменты: пауза, отдых, поддержка, безопасные границы или разговор.',
      ] : [
        `For one week, notice when “${theme}” appears, and write down the situation and your response.`,
        'Notice what helps you feel more grounded, such as rest, a short pause, support, a clear boundary or a conversation.',
      ],
      followUp,
    }
  })
  if (!sections.length) sections.push({
    key: 'bach.no-active-themes', domain: 'emotional-reflection',
    title: ru ? 'Выраженных соответствий не найдено' : 'No prominent matches',
    construct: ru ? 'Нейтральный результат' : 'Neutral response pattern',
    value: 0, max: 5,
    meaning: ru
      ? 'Вы не отметили эмоциональные состояния в этой анкете. Это не означает отсутствие трудностей и не требует подбора каких-либо эссенций.'
      : 'You did not endorse any of the listed emotional patterns. This is not proof of absence of difficulty and does not call for an essence recommendation.',
    steps: ru ? [
      'Если есть актуальная проблема, сформулируйте её своими словами и отметьте, когда она возникает в повседневной жизни.',
      'При желании повторите самоанализ в другой день, если состояние изменится, или обсудите свои переживания со специалистом.',
    ] : [
      'If you have a current concern, describe it in your own words and note when it tends to show up in daily life.',
      'You can repeat this reflection another day if your state changes, or discuss specific concerns with a professional.',
    ],
    followUp,
  })
  return {
    title, intro,
    purpose: ru
      ? 'Авторский опросник из 115 пунктов связывает самоописанные эмоции с 38 традиционными эссенциями Баха. Он не является валидированным диагностическим инструментом.'
      : 'This 115-item author questionnaire connects self-reported emotions with 38 traditional Bach flower essences. It is not a clinically validated diagnostic instrument.',
    sections,
    note,
    seekSupport: followUp,
  }
}
