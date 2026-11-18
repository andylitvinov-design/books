// Public filter metadata only. Keep scoring and questionnaire dependencies out of navigation.
export const TEST_RECOMMENDATION_FOCUS = Object.freeze([
  { key: 'anxiety', label: { en: 'Anxiety & worry', ru: 'Тревога и волнение' } },
  { key: 'stress', label: { en: 'Stress & overload', ru: 'Стресс и перегрузка' } },
  { key: 'clarity', label: { en: 'Clarity & productivity', ru: 'Ясность и продуктивность' } },
  { key: 'body', label: { en: 'Body symptoms & energy', ru: 'Телесные симптомы и энергия' } },
  // Non-diagnostic wellbeing interest; maps only to existing instrument topics/scales.
  { key: 'health', label: { en: 'General health & wellbeing', ru: 'Здоровье и самочувствие', es: 'Salud y bienestar' } },
  { key: 'mood', label: { en: 'Mood & sadness', ru: 'Настроение и грусть' } },
  { key: 'sleep', label: { en: 'Sleep & recovery', ru: 'Сон и восстановление' } },
  { key: 'relationships', label: { en: 'Relationships & support', ru: 'Отношения и поддержка' } },
  { key: 'intimacy', label: { en: 'Love & emotional intimacy', ru: 'Любовь и эмоциональная близость' } },
  { key: 'sexuality', label: { en: 'Sexual wellbeing & consent', ru: 'Сексуальное благополучие и согласие' } },
  { key: 'tantra', label: { en: 'Tantric presence & embodiment', ru: 'Тантрическое присутствие и телесность' } },
  { key: 'resources', label: { en: 'Resilience & self-regulation', ru: 'Ресурс и саморегуляция' } },
  { key: 'attention', label: { en: 'Attention & focus', ru: 'Внимание и концентрация' } },
  { key: 'function', label: { en: 'Everyday functioning', ru: 'Повседневное функционирование' } },
  { key: 'personality', label: { en: 'Personality & patterns', ru: 'Личность и паттерны' } },
  { key: 'meaning', label: { en: 'Meaning & direction', ru: 'Смысл и направление' } },
])

export const TEST_STYLE_FILTERS = Object.freeze([
  { key: 'engaging', label: { en: 'Funny / light', ru: 'Лёгкие / игровые' } },
  { key: 'professional', label: { en: 'Professional', ru: 'Профессиональные' } },
])

export const TEST_LENGTH_FILTERS = Object.freeze([
  { key: 'short', label: { en: 'Short', ru: 'Короткие' } },
  { key: 'medium', label: { en: 'Medium', ru: 'Средние' } },
  { key: 'comprehensive', label: { en: 'Comprehensive', ru: 'Комплексные' } },
])

