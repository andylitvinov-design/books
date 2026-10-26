// Canonical four life directions for the existing public assessment catalogue.
// These are discovery facets, not medical scores or separate client profiles.
export const LIFE_TEST_PROFILES = Object.freeze([
  Object.freeze({
    key: 'wellbeing',
    label: Object.freeze({ en: 'Body, health & energy', ru: 'Тело, здоровье и энергия', es: 'Cuerpo, salud y energía' }),
    detail: Object.freeze({ en: 'Stress, sleep, body awareness and recovery', ru: 'Стресс, сон, телесные ощущения и восстановление', es: 'Estrés, sueño, cuerpo y recuperación' }),
    axes: Object.freeze(['stress', 'anxiety', 'mood', 'emotional_regulation', 'sleep', 'energy', 'embodiment']),
    focus: Object.freeze(['stress', 'anxiety', 'mood', 'sleep', 'body', 'health']),
  }),
  Object.freeze({
    key: 'relationships',
    label: Object.freeze({ en: 'Relationships & connection', ru: 'Отношения и близость', es: 'Relaciones y cercanía' }),
    detail: Object.freeze({ en: 'Connection, closeness and personal boundaries', ru: 'Общение, близость и личные границы', es: 'Conexión, cercanía y límites personales' }),
    axes: Object.freeze(['relationships', 'intimacy', 'boundaries', 'self_support', 'emotional_regulation', 'sexual_wellbeing']),
    focus: Object.freeze(['relationships', 'intimacy', 'sexuality']),
  }),
  Object.freeze({
    key: 'work',
    label: Object.freeze({ en: 'Work, business & money', ru: 'Дело, бизнес и деньги', es: 'Trabajo, negocios y dinero' }),
    detail: Object.freeze({ en: 'Focus, clarity, actions and goals', ru: 'Концентрация, ясность, действия и цели', es: 'Concentración, claridad, acciones y metas' }),
    axes: Object.freeze(['clarity', 'focus', 'functioning', 'resource', 'self_support', 'meaning']),
    focus: Object.freeze(['clarity', 'function', 'resources', 'meaning']),
  }),
  Object.freeze({
    key: 'identity',
    label: Object.freeze({ en: 'Personality & personal growth', ru: 'Личность и развитие', es: 'Personalidad y crecimiento' }),
    detail: Object.freeze({ en: 'Strengths, resources, values and purpose', ru: 'Сильные стороны, ресурсы, ценности и смысл', es: 'Fortalezas, recursos, valores y propósito' }),
    axes: Object.freeze(['personality', 'resource', 'self_support', 'meaning', 'emotional_regulation']),
    focus: Object.freeze(['personality', 'resources', 'meaning']),
  }),
]);

export function findLifeTestProfile(key) {
  return LIFE_TEST_PROFILES.find((profile) => profile.key === key) || null;
}

export function profileAxisSelection(key, selectedAxes = []) {
  const profile = findLifeTestProfile(key);
  if (!profile || !Array.isArray(selectedAxes)) return [];
  return [...new Set(selectedAxes.filter((axis) => profile.axes.includes(axis)))];
}

// Zero checked scales means ALL supported scales of the chosen profile.
// Multiple checked scales combine with OR (a test measuring any is eligible).
export function selectedLifeProfileAxes(key, selectedAxes = []) {
  const profile = findLifeTestProfile(key);
  if (!profile) return [];
  const valid = profileAxisSelection(key, selectedAxes);
  return valid.length ? valid : [...profile.axes];
}
