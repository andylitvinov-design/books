// Short, reviewed educational reflections keyed to the actual construct of a
// completed, rights-cleared questionnaire scale. No author attribution,
// diagnostic interpretation, prescription or invented psychometric result.
export const COURSE_FOCUS_APHORISMS = Object.freeze({
  stress: Object.freeze({
    en: 'A pause is not giving up; it can be a way to choose your pace.',
    ru: 'Пауза — не отказ от движения, а возможность выбрать свой темп.',
  }),
  anxiety: Object.freeze({
    en: 'Not every worried thought needs an answer right away.',
    ru: 'Не каждая тревожная мысль требует немедленного ответа.',
  }),
  mood: Object.freeze({
    en: 'A feeling deserves attention, but it does not define the whole of you.',
    ru: 'Чувство заслуживает внимания, но не определяет вас целиком.',
  }),
  sleep: Object.freeze({
    en: 'Rest can be a choice worth making, not a reward to be earned.',
    ru: 'Отдых — это забота, которую не нужно сначала заслуживать.',
  }),
  energy: Object.freeze({
    en: 'Sometimes respecting your energy is more helpful than pushing harder.',
    ru: 'Иногда беречь свои силы важнее, чем заставлять себя стараться сильнее.',
  }),
  clarity: Object.freeze({
    en: 'Clarity sometimes begins with just one small, honest question.',
    ru: 'Ясность иногда начинается с одного простого и честного вопроса.',
  }),
  focus: Object.freeze({
    en: 'You do not need to do everything at once to be present in one thing.',
    ru: 'Не обязательно успевать всё, чтобы присутствовать в одном важном деле.',
  }),
  emotional_regulation: Object.freeze({
    en: 'You can make room for a feeling without letting it choose every action.',
    ru: 'Чувству можно дать место, не отдавая ему право решать за вас.',
  }),
  relationships: Object.freeze({
    en: 'Connection can grow where there is room for both closeness and choice.',
    ru: 'Близость становится свободнее, когда в ней есть место и контакту, и выбору.',
  }),
  intimacy: Object.freeze({
    en: 'Your own pace of closeness deserves respect.',
    ru: 'Ваш собственный темп сближения заслуживает уважения.',
  }),
  boundaries: Object.freeze({
    en: 'A kind boundary protects the possibility of an honest yes.',
    ru: 'Бережная граница помогает сохранить возможность искреннего «да».',
  }),
  sexual_wellbeing: Object.freeze({
    en: 'Comfort and choice matter more than someone else’s idea of how you should feel.',
    ru: 'Комфорт и собственный выбор важнее чужих представлений о том, что вы должны чувствовать.',
  }),
  embodiment: Object.freeze({
    en: 'You may notice your body gently, without needing to change anything.',
    ru: 'К телесным ощущениям можно прислушаться мягко, ничего не требуя от себя.',
  }),
  resource: Object.freeze({
    en: 'Support need not be enormous to be real and available.',
    ru: 'Опора не обязана быть большой, чтобы быть настоящей и доступной.',
  }),
  self_support: Object.freeze({
    en: 'You can be on your own side even on an uncertain day.',
    ru: 'Можно оставаться на своей стороне даже в день, когда нет уверенности.',
  }),
  functioning: Object.freeze({
    en: 'One manageable step is still a step, even if the rest can wait.',
    ru: 'Один посильный шаг остаётся шагом, даже если остальное подождёт.',
  }),
  personality: Object.freeze({
    en: 'Your traits describe patterns; they do not take away your freedom to choose.',
    ru: 'Личные особенности описывают привычные способы, но не лишают свободы выбора.',
  }),
  meaning: Object.freeze({
    en: 'What matters to you can be a direction, not a demand.',
    ru: 'То, что важно для вас, может быть направлением, а не требованием.',
  }),
})

const GENERAL = Object.freeze({
  en: 'Noticing what matters to you is already a way to begin.',
  ru: 'Замечать важное для себя — уже способ начать.',
})

// Accept only suitable scales actually produced by courseMeasuredProfile from
// completed, account-owned and current tests. This is not a diagnosis or an
// automatic choice based on the highest symptom score.
export function courseFocusScaleOptions(profile, selectedCourseScaleIds = [], limit = 12) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 30) return []
  const priorities = Array.isArray(selectedCourseScaleIds) ? selectedCourseScaleIds : []
  const rank = id => {
    const index = priorities.indexOf(id)
    return index < 0 ? Number.MAX_SAFE_INTEGER : index
  }
  const unique = new Set()
  return (Array.isArray(profile?.eligible) ? profile.eligible : [])
    .filter(scale => scale?.eligible === true &&
      typeof scale.id === 'string' && scale.id.includes('::') &&
      typeof scale.label === 'string' && scale.label.trim() &&
      typeof scale.testTitle === 'string' && scale.testTitle.trim() &&
      Object.hasOwn(COURSE_FOCUS_APHORISMS, scale.axis))
    .sort((a, b) => rank(a.id) - rank(b.id) ||
      Date.parse(b.measuredAt || '') - Date.parse(a.measuredAt || '') ||
      a.id.localeCompare(b.id))
    .filter(scale => {
      if (unique.has(scale.id)) return false
      unique.add(scale.id)
      return true
    })
    .slice(0, limit)
    .map(({ id, axis, label, testTitle }) => ({ id, axis, label, testTitle }))
}

export function courseFocusAphorism(chosenScale, locale = 'en', fallback = '') {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const quote = COURSE_FOCUS_APHORISMS[chosenScale?.axis]?.[lang]
  return quote || (typeof fallback === 'string' && fallback.trim() ? fallback : GENERAL[lang])
}
