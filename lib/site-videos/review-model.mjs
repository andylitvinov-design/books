// Shared, dependency-free catalog moderation rules. The DB remains the source of truth.
export const VIDEO_AREAS = Object.freeze([
  { id: 'business', labels: { en: 'Business & money', ru: 'Бизнес и деньги', es: 'Negocios y dinero' }, goals: ['money'], topics: [
    { id: 'money', en: 'Money', ru: 'Деньги', es: 'Dinero' },
    { id: 'work', en: 'Work / focus', ru: 'Работа / фокус', es: 'Trabajo / concentración' },
  ] },
  { id: 'relationships', labels: { en: 'Relationships', ru: 'Отношения', es: 'Relaciones' }, goals: ['relationships'], topics: [
    { id: 'connection', en: 'Connection / boundaries', ru: 'Общение / границы', es: 'Conexión / límites' },
  ] },
  { id: 'energy_health', labels: { en: 'Energy & wellbeing', ru: 'Энергия и самочувствие', es: 'Energía y bienestar' }, goals: ['energy'], topics: [
    { id: 'body', en: 'Body', ru: 'Тело', es: 'Cuerpo' },
    { id: 'emotions', en: 'Emotions', ru: 'Эмоции', es: 'Emociones' },
    { id: 'recovery', en: 'Recovery', ru: 'Восстановление', es: 'Recuperación' },
  ] },
  { id: 'personal_growth', labels: { en: 'Personal growth & meaning', ru: 'Развитие и смыслы', es: 'Desarrollo y sentido' }, goals: ['meaning', 'goals'], topics: [
    { id: 'goal', en: 'Goals', ru: 'Цели', es: 'Metas' },
    { id: 'meaning', en: 'Meaning', ru: 'Смыслы', es: 'Sentido' },
    { id: 'support', en: 'Self-support', ru: 'Самоподдержка', es: 'Autoapoyo' },
    { id: 'traits', en: 'Personal traits', ru: 'Личные качества', es: 'Rasgos personales' },
  ] },
]);

export function videoAreasFromRow(row) {
  const goals = Array.isArray(row?.goals) ? row.goals : [];
  const topics = Array.isArray(row?.subtopics) ? row.subtopics : [];
  return VIDEO_AREAS.filter(area => topics.includes(area.id) ||
    area.goals.some(goal => goals.includes(goal))).map(area => area.id);
}

export function videoTopicsFromRow(row) {
  const topics = Array.isArray(row?.subtopics) ? row.subtopics : [];
  return VIDEO_AREAS.flatMap(area => area.topics).filter(topic =>
    topics.includes(topic.id)).map(topic => topic.id);
}

export function prepareVideoReview(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('validation');
  const keys = Object.keys(input);
  if (keys.some(key => !['youtubeId', 'revision', 'action', 'areas', 'topics', 'note', 'screened'].includes(key))) throw Error('validation');
  if (typeof input.youtubeId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(input.youtubeId)) throw Error('validation');
  if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw Error('validation');
  if (!['accept', 'reject', 'save'].includes(input.action)) throw Error('validation');
  if (!Array.isArray(input.areas) || input.areas.length > 4 || (input.areas.length === 0 && input.action !== 'reject') ||
    input.areas.some(area => typeof area !== 'string') || new Set(input.areas).size !== input.areas.length) throw Error('validation');
  const selected = VIDEO_AREAS.filter(area => input.areas.includes(area.id));
  if (selected.length !== input.areas.length) throw Error('validation');
  if (!Array.isArray(input.topics) || input.topics.length > 12 ||
    input.topics.some(topic => typeof topic !== 'string') || new Set(input.topics).size !== input.topics.length) throw Error('validation');
  const validTopics = new Set(selected.flatMap(area => area.topics.map(topic => topic.id)));
  if (input.action !== 'reject' && !input.topics.every(topic => validTopics.has(topic))) throw Error('validation');
  if (typeof input.note !== 'string' || input.note.length > 500 || typeof input.screened !== 'boolean') throw Error('validation');
  const goals = [...new Set(selected.flatMap(area => area.goals))];
  return {
    youtubeId: input.youtubeId, revision: input.revision, action: input.action,
    areas: selected.map(area => area.id),
    goals, subtopics: [...selected.map(area => area.id), ...input.topics],
    note: input.note.trim(), screened: input.action === 'accept' && input.screened,
  };
}

export function videoLinkEligible(row) {
  return row?.owner_review_status === 'accepted' &&
    row.source_kind === 'external' && row.content_type === 'guided' &&
    row.editorial_status === 'candidate' &&
    Number.isSafeInteger(row.duration_verified_seconds) &&
    row.duration_verified_seconds > 0 && row.duration_verified_seconds <= 600 &&
    ['metadata_checked', 'owner_checked'].includes(row.duration_basis) &&
    row.metadata_confidence === 'public_listing' &&
    Boolean(row.metadata_checked_at && row.youtube_oembed_checked_at && row.content_checked_at) &&
    ['low', 'moderate'].includes(row.claims_risk) &&
    row.embed_status === 'unverified' && row.rights_status === 'pending_embed_check';
}

export function videoReviewChecks(row) {
  return {
    duration: Number.isSafeInteger(row?.duration_verified_seconds) &&
      row.duration_verified_seconds > 0 && row.duration_verified_seconds <= 600 &&
      ['metadata_checked','owner_checked'].includes(row.duration_basis),
    oembed: Boolean(row?.youtube_oembed_checked_at),
    content: Boolean(row?.content_checked_at),
    embed: row?.embed_status === 'confirmed' && row?.rights_status === 'embed_approved',
  };
}

/** Owner-attested clock duration after personally watching the YouTube player.
 *  This is distinct from a video title or a successful oEmbed metadata fetch. */
export function prepareDurationReview(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(k => !['youtubeId', 'revision', 'clock', 'confirmed'].includes(k)))
    throw Error('validation');
  if (typeof input.youtubeId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(input.youtubeId) ||
      !Number.isSafeInteger(input.revision) || input.revision < 0 ||
      input.confirmed !== true || typeof input.clock !== 'string')
    throw Error('validation');
  const match = input.clock.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) throw Error('validation');
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 600)
    throw Error('validation');
  return { youtubeId: input.youtubeId, revision: input.revision, seconds };
}
