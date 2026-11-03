// OPORA: a warm, optional moment-of-arrival question, not a symptom scale.
// The selected feeling changes supportive wording only. It never changes
// the course focus, validated baseline, test scores, or progression.
export const WELCOME_FEELING_IDS = Object.freeze(['steady', 'tense', 'low', 'unsure'])

const THEMES = Object.freeze({
  calm_regulation: {
    en: ['I feel fairly steady', 'I feel tense', 'It is hard to slow down', 'I am not sure yet'],
    ru: ['Довольно спокойно', 'Чувствую напряжение', 'Трудно замедлиться', 'Пока не понимаю'],
  },
  inner_support: {
    en: ['I feel supported', 'I am doubting myself', 'I need some kindness', 'I am not sure yet'],
    ru: ['Чувствую опору', 'Сомневаюсь в себе', 'Хочется поддержки', 'Пока не понимаю'],
  },
  emotional_flexibility: {
    en: ['I feel fairly balanced', 'My feelings are intense', 'I have mixed feelings', 'I cannot name it yet'],
    ru: ['В целом ровно', 'Сильные переживания', 'Смешанные чувства', 'Пока трудно назвать'],
  },
  attention_clarity: {
    en: ['My mind feels clearer', 'I have many thoughts', 'It is hard to focus', 'I am not sure yet'],
    ru: ['Мысли яснее', 'Слишком много мыслей', 'Трудно сосредоточиться', 'Пока не понимаю'],
  },
  connection_boundaries: {
    en: ['I feel open to connection', 'Contact feels tense', 'I need more space', 'I am not sure yet'],
    ru: ['Открыт(а) к контакту', 'В общении напряжение', 'Хочется больше пространства', 'Пока не понимаю'],
  },
  energy_agency: {
    en: ['I have some energy', 'I feel tired', 'It is hard to get started', 'I am not sure yet'],
    ru: ['Есть немного сил', 'Чувствую усталость', 'Трудно начать дела', 'Пока не понимаю'],
  },
})

// Same optional check-in for Spanish visitors; responses only affect supportive copy.
const ES_LABELS=Object.freeze({
  calm_regulation:['Me siento tranquilo/a','Me siento tenso/a','Me cuesta bajar el ritmo','Todavía no lo sé'],
  inner_support:['Siento apoyo','Dudo de mí','Necesito algo de amabilidad','Todavía no lo sé'],
  emotional_flexibility:['Me siento bastante equilibrado/a','Mis emociones son intensas','Tengo emociones mezcladas','Aún no puedo nombrarlo'],
  attention_clarity:['Mi mente está más clara','Tengo muchos pensamientos','Me cuesta concentrarme','Todavía no lo sé'],
  connection_boundaries:['Estoy abierto/a al contacto','El contacto me genera tensión','Necesito más espacio','Todavía no lo sé'],
  energy_agency:['Tengo algo de energía','Me siento cansado/a','Me cuesta empezar','Todavía no lo sé'],
})

const SUPPORT = Object.freeze({
  en: {
    steady: 'You can begin with the support already available to you.',
    tense: 'Nothing needs to change right away. We can begin gently.',
    low: 'There is no need to push. A small, manageable step is enough.',
    unsure: 'You do not need to have the right words for how you feel.',
  },
  es: {
    steady:'Puedes empezar con el apoyo que ya tienes.',
    tense:'No necesitas cambiar nada de inmediato. Podemos empezar suavemente.',
    low:'No tienes que exigirte. Basta con un paso pequeño.',
    unsure:'No necesitas encontrar las palabras exactas para lo que sientes.',
  },
  ru: {
    steady: 'Можно начать с той опоры, которая уже есть.',
    tense: 'Не нужно сразу менять своё состояние. Начнём мягко.',
    low: 'Не нужно себя подгонять. Достаточно маленького посильного шага.',
    unsure: 'Не обязательно точно понимать или называть своё состояние.',
  },
})

export function welcomeFeelingChoices(goal, locale = 'en') {
  const labels = locale==='es'?(ES_LABELS[goal]||ES_LABELS.calm_regulation):
    (THEMES[goal] || THEMES.calm_regulation)[locale === 'ru' ? 'ru' : 'en']
  return WELCOME_FEELING_IDS.map((id, index) => ({ id, label: labels[index] }))
}

export function welcomeFeelingSupport(id, locale = 'en') {
  return SUPPORT[locale === 'ru' ? 'ru' : locale === 'es' ? 'es' : 'en'][id] || ''
}
