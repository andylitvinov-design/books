// Educational, deterministic interpretations of Holistic House original type reflections.
// Not official Socionics/Enneagram/DISC/MBTI and not a validated diagnostic instrument.
// Work solely from the private persisted versioned score dimensions; never infer illnesses.

const TYPE_KEYS = Object.freeze({
  'hh-socionics-32': 'socionics',
  'hh-enneagram-36': 'enneagram',
  'hh-disc-style-20': 'disc',
  'hh-temperaments-16': 'temperament',
})

const SOCIONICS_TYPES = Object.freeze({
  ENLP: { code: 'ILE', en: 'Intuitive–Logical Extravert', ru: 'Интуитивно-логический экстраверт' },
  ISFP: { code: 'SEI', en: 'Sensory–Ethical Introvert', ru: 'Сенсорно-этический интроверт' },
  ESFJ: { code: 'ESE', en: 'Ethical–Sensory Extravert', ru: 'Этико-сенсорный экстраверт' },
  INLJ: { code: 'LII', en: 'Logical–Intuitive Introvert', ru: 'Логико-интуитивный интроверт' },
  ENFJ: { code: 'EIE', en: 'Ethical–Intuitive Extravert', ru: 'Этико-интуитивный экстраверт' },
  ISLJ: { code: 'LSI', en: 'Logical–Sensory Introvert', ru: 'Логико-сенсорный интроверт' },
  ESLP: { code: 'SLE', en: 'Sensory–Logical Extravert', ru: 'Сенсорно-логический экстраверт' },
  INFP: { code: 'IEI', en: 'Intuitive–Ethical Introvert', ru: 'Интуитивно-этический интроверт' },
  ESFP: { code: 'SEE', en: 'Sensory–Ethical Extravert', ru: 'Сенсорно-этический экстраверт' },
  INLP: { code: 'ILI', en: 'Intuitive–Logical Introvert', ru: 'Интуитивно-логический интроверт' },
  ENLJ: { code: 'LIE', en: 'Logical–Intuitive Extravert', ru: 'Логико-интуитивный экстраверт' },
  ISFJ: { code: 'ESI', en: 'Ethical–Sensory Introvert', ru: 'Этико-сенсорный интроверт' },
  ESLJ: { code: 'LSE', en: 'Logical–Sensory Extravert', ru: 'Логико-сенсорный экстраверт' },
  INFJ: { code: 'EII', en: 'Ethical–Intuitive Introvert', ru: 'Этико-интуитивный интроверт' },
  ENFP: { code: 'IEE', en: 'Intuitive–Ethical Extravert', ru: 'Интуитивно-этический экстраверт' },
  ISLP: { code: 'SLI', en: 'Sensory–Logical Introvert', ru: 'Сенсорно-логический интроверт' },
})
const SOCIONICS_PAIRS = Object.freeze([['e','i'], ['n','s'], ['l','f'], ['j','p']])
const POLARITY = Object.freeze({e:'E',i:'I',n:'N',s:'S',l:'L',f:'F',j:'J',p:'P'})
const LABELS = Object.freeze({
  enneagram: {
    one: ['1 · Integrity and improvement', '1 · Принципиальность и совершенствование'],
    two: ['2 · Care and usefulness', '2 · Забота и нужность'],
    three: ['3 · Achievement and impact', '3 · Достижения и результат'],
    four: ['4 · Authenticity and individuality', '4 · Подлинность и самобытность'],
    five: ['5 · Knowledge and independence', '5 · Понимание и автономия'],
    six: ['6 · Security and loyalty', '6 · Надёжность и лояльность'],
    seven: ['7 · Possibilities and exploration', '7 · Возможности и исследование'],
    eight: ['8 · Autonomy and protection', '8 · Самостоятельность и защита'],
    nine: ['9 · Harmony and steadiness', '9 · Гармония и устойчивость'],
  },
  disc: {
    d: ['D · Direct action', 'D · Прямое действие'],
    i: ['I · Social influence', 'I · Вовлечение людей'],
    s: ['S · Steady support', 'S · Стабильная поддержка'],
    c: ['C · Careful analysis', 'C · Точность и анализ'],
  },
  temperament: {
    sanguine: ['Sanguine · Expressive', 'Сангвинический · Общительный'],
    choleric: ['Choleric · Decisive', 'Холерический · Решительный'],
    phlegmatic: ['Phlegmatic · Steady', 'Флегматический · Спокойный'],
    melancholic: ['Melancholic · Reflective', 'Меланхолический · Рефлексивный'],
  },
})
const CUES = Object.freeze({
  socionics: {
    e: ['sharing ideas and clarifying thoughts in conversation', 'обменом идеями и прояснением мыслей в разговоре'],
    i: ['private reflection and restoring energy in quiet', 'личными размышлениями и восстановлением сил в тишине'],
    n: ['noticing patterns, meanings and future possibilities', 'поиском закономерностей, смыслов и будущих возможностей'],
    s: ['using observable facts, senses and practical experience', 'опорой на факты, ощущения и практический опыт'],
    l: ['checking logical structure, criteria and consistency', 'проверкой логики, критериев и непротиворечивости'],
    f: ['considering feelings, relationships and trust', 'учётом чувств, отношений и доверия'],
    j: ['preferring decisions, clear priorities and predictable structure', 'предпочтением решений, ясных приоритетов и структуры'],
    p: ['keeping possibilities open and adapting a plan as you go', 'сохранением вариантов и изменением плана по ситуации'],
  },
  enneagram: {
    one: ['responsibility, personal principles and improving what matters', 'ответственностью, личными принципами и улучшением важного'],
    two: ['giving care and being useful to important people', 'заботой и возможностью быть полезным близким'],
    three: ['visible achievement, effectiveness and recognition', 'заметными достижениями, эффективностью и признанием'],
    four: ['emotional nuance, identity and genuine self-expression', 'тонкими переживаниями, самобытностью и искренним выражением'],
    five: ['deep understanding, privacy and independent thought', 'глубоким пониманием, личным пространством и самостоятельным мышлением'],
    six: ['reliability, preparation and trust in uncertain situations', 'надёжностью, подготовкой и доверием в неопределённости'],
    seven: ['opportunities, variety and enthusiasm for exploration', 'возможностями, разнообразием и энтузиазмом исследования'],
    eight: ['clear autonomy, directness and protecting what you value', 'самостоятельностью, прямотой и защитой ценного'],
    nine: ['finding common ground and maintaining a steady atmosphere', 'поиском общего и поддержанием спокойной атмосферы'],
  },
  disc: {
    d: ['decisive action, clear priorities and taking initiative', 'решительными действиями, приоритетами и инициативой'],
    i: ['enthusiasm, social engagement and involving people', 'энтузиазмом, общением и вовлечением других'],
    s: ['listening, patient support and steady cooperation', 'слушанием, терпеливой поддержкой и последовательным сотрудничеством'],
    c: ['careful checking, standards and evidence-based discussion', 'тщательной проверкой, стандартами и обсуждением оснований'],
  },
  temperament: {
    sanguine: ['social energy, variety and spontaneous engagement', 'общительностью, разнообразием и спонтанным включением'],
    choleric: ['quick initiative, clear expression and decisive challenges', 'быстрой инициативой, прямотой и решительными действиями'],
    phlegmatic: ['a calm pace, steadiness and thoughtful listening', 'спокойным темпом, устойчивостью и внимательным слушанием'],
    melancholic: ['thoughtful reflection, precision and emotional nuance', 'вдумчивостью, точностью и тонкими переживаниями'],
  },
})

export const HH_PERSONALITY_TYPE_KEYS = Object.freeze(Object.keys(TYPE_KEYS))
export const SOCIONICS_TYPE_CODES = Object.freeze(Object.values(SOCIONICS_TYPES).map(value => value.code))

function scoreMap(result, kind) {
  const prefix = 'trait.hh_' + kind + '.'
  return new Map((result?.dimensions || [])
    .filter(d => typeof d.key === 'string' && d.key.startsWith(prefix) && Number.isFinite(d.value))
    .map(d => [d.key.slice(prefix.length), d.value]))
}

function socionicsHypothesis(scores, locale) {
  const pairs = SOCIONICS_PAIRS.map(([left,right]) => ({
    left,right,
    delta:(scores.get(left) ?? NaN) - (scores.get(right) ?? NaN),
  }))
  if (pairs.some(p => !Number.isFinite(p.delta))) return null
  const ambiguous = pairs.filter(p => p.delta === 0)
  const near = pairs.filter(p => Math.abs(p.delta) <= 2)
  const fourLetters = pairs.map(p => POLARITY[p.delta >= 0 ? p.left : p.right]).join('')
  const match = ambiguous.length ? null : SOCIONICS_TYPES[fourLetters] || null
  const weakest = [...pairs].sort((a,b) => Math.abs(a.delta)-Math.abs(b.delta))[0]
  const index = pairs.indexOf(weakest)
  const alternativeLetters = [...fourLetters]
  alternativeLetters[index] = POLARITY[weakest.delta >= 0 ? weakest.right : weakest.left]
  const alternativeType = SOCIONICS_TYPES[alternativeLetters.join('')] || null
  const candidates = [...new Set([match?.code, alternativeType?.code].filter(Boolean))]
  return {
    kind:'socionics',
    headline: match
      ? (locale === 'ru' ? 'Возможный социотип: ' : 'Possible sociotype: ') + match.code + ' — ' + match[locale]
      : (locale === 'ru' ? 'Однозначный социотип не определяется' : 'No single sociotype is supported by these answers'),
    description: (locale === 'ru'
      ? 'Это условная комбинация четырёх пар предпочтений на основе ответов, а не достоверное типирование. '
      : 'This is a provisional combination of four preference pairs based only on your answers, not a validated typing result. ')
      + (near.length
        ? (locale === 'ru' ? 'По некоторым парам предпочтения близки — рассмотрите альтернативы и реальный контекст.' : 'Some preference pairs have similar scores; explore alternatives and real-life context.')
        : (locale === 'ru' ? 'Даже отчётливый профиль ответов не гарантирует точности типа.' : 'Even clearly separated responses do not establish a scientifically valid type.')),
    alternatives: ambiguous.length
      ? (locale === 'ru' ? ['Есть равные баллы хотя бы в одной паре; не выбирайте тип произвольно.'] : ['One or more preference pairs are tied; no type has been chosen arbitrarily.'])
      : near.length ? (locale === 'ru'
        ? ['Близкий вариант для сравнения: ' + alternativeType.code + ' — ' + alternativeType.ru]
        : ['Nearby comparison candidate: ' + alternativeType.code + ' — ' + alternativeType.en]) : [],
    code:match?.code ?? null,
    possibleCodes:candidates,
    warning:locale === 'ru'
      ? 'Соционика не является клинически валидированным тестом. Соционические J/P и типовые коды нельзя автоматически переводить в MBTI.'
      : 'Socionics is not a clinically validated measure. Socionics J/P and type codes cannot be directly converted into MBTI types.',
  }
}

function rankedHypothesis(kind, scores, locale) {
  const items=Object.entries(LABELS[kind] || {}).map(([key, labels])=>({key,value:scores.get(key),label:labels[locale==='ru'?1:0]}))
  if(items.some(x=>!Number.isFinite(x.value)))return null
  items.sort((a,b)=>b.value-a.value || a.key.localeCompare(b.key))
  const first=items[0],second=items[1],tie=first.value===second.value
  const close=first.value-second.value<=2
  const categoryName=({
    enneagram:['motivational theme','мотивационная тема'],
    disc:['communication style','стиль коммуникации'],
    temperament:['temperament style','темпераментный стиль'],
  })[kind][locale==='ru'?1:0]
  return{
    kind,
    headline:tie
      ? (locale==='ru' ? 'Несколько равных ведущих паттернов' : 'Several equally prominent patterns')
      : (locale==='ru' ? 'Ведущая ' + categoryName + ': ' : 'Leading ' + categoryName + ': ') + first.label,
    description:locale==='ru'
      ? 'Показан паттерн с наибольшим числом согласий в этом авторском опроснике, а не подтверждённый личностный тип. Контекст и текущее самоощущение могут изменить ответы.'
      : 'This is the highest endorsed pattern in an original reflection quiz, not a scientifically verified personality type. Context and self-perception can change answers.',
    alternatives:close
      ? [locale==='ru' ? 'Другой близкий вариант: ' + second.label : 'Another close pattern: ' + second.label]
      : [],
    code:tie ? null : first.key,
    possibleCodes:close ? [first.key,second.key] : [first.key],
    warning:kind==='enneagram'
      ? (locale==='ru' ? 'Научные данные не подтверждают устойчивое деление всех людей на девять типов и «крылья».' : 'Evidence does not establish nine distinct natural categories or reliable wings.')
      : (locale==='ru' ? 'Историческая/популярная модель для обсуждения привычек; не используйте как диагноз или критерий отбора людей.' : 'A historical/popular model for reflecting on habits, not diagnosis or a basis for selecting people.'),
  }
}

export function personalityTypeHypothesis(result, locale = 'en') {
  const language=locale==='ru'?'ru':'en'
  const kind=TYPE_KEYS[result?.definitionKey]
  if(!kind || result?.definitionVersion !== 'v1')return null
  const scores=scoreMap(result,kind)
  const expected = kind === 'socionics' ? SOCIONICS_PAIRS.flat() : Object.keys(LABELS[kind])
  const min = kind === 'disc' ? 5 : 4
  const max = kind === 'disc' ? 25 : 20
  if(scores.size !== expected.length || expected.some(key => !scores.has(key) || scores.get(key) < min || scores.get(key) > max))return null
  return kind==='socionics' ? socionicsHypothesis(scores,language) : rankedHypothesis(kind,scores,language)
}

export function personalityDimensionGuidance(dimension, locale='en') {
  const language=locale==='ru'?'ru':'en'
  const match=/^trait\.hh_(socionics|enneagram|disc|temperament)\.([a-z]+)$/.exec(dimension?.key||'')
  if(!match)return null
  const cue=CUES[match[1]]?.[match[2]]
  if(!cue)return null
  const theme=cue[language==='ru'?1:0]
  if(language==='ru')return {
    meaning:'Ответы показывают степень согласия с высказываниями, связанными с '+theme+'. Этот результат не является нормативным рейтингом, диагнозом или устойчивым свойством без контекста.',
    steps:[
      'В ближайшие дни вспомните конкретную ситуацию, связанную с '+theme+', и запишите, что в ней действительно помогло или мешало.',
      'Сравните эту склонность в спокойных и напряжённых обстоятельствах и попробуйте один небольшой альтернативный способ поведения.',
    ],
    followUp:'Не пытайтесь «повысить» такой балл как показатель здоровья; используйте его лишь как материал для наблюдения.',
  }
  return {
    meaning:'Your answers describe agreement with statements about '+theme+'. This is not a population ranking, clinical indicator or fixed identity.',
    steps:[
      'Over the next few days, notice a specific situation involving '+theme+' and record what genuinely helped or got in the way.',
      'Compare this preference in calm and stressful situations; try one small alternative response when it seems useful.',
    ],
    followUp:'Do not try to increase this score as a health goal; use it to reflect on your actual experiences.',
  }
}
