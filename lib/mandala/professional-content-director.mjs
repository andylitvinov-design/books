/**
 * P0 professional marketing storyboard. Deterministic, local and source-only.
 *
 * This never authorizes a provider, a payment, a publication or a rendered
 * video. The caller must pass PUBLIC approved snapshots, not raw account/CRM
 * rows. Runtime decode and commercial-media permission remain separate gates.
 */
import { proposeProfessionalTemplate } from './professional-growth-templates.mjs';

export const PROFESSIONAL_DIRECTOR_VERSION = 'hh-professional-content-director-v1';
const LOCALES = ['en', 'ru', 'es'];
const THEMES = ['money', 'relationships', 'energy', 'life', 'health', 'goals'];
const PUBLIC_PATH = /^\/(ru|en|es)\/(services|masters|articles|events|courses)\/[a-zA-Z0-9/_-]+$/;
const VIDEO_PATH = /^\/videos\/holistic-house\/(money-films-v1|film-collection-v2|film-collection-v3)\/[a-z0-9-]+\.mp4$/;
const SAFE_SCENE_ID = /^[a-z0-9-]{3,70}$/;
const EXCLUDED_MOTIFS = Object.freeze({
  water: new Set(['water', 'sea', 'ocean', 'lake', 'river', 'stream', 'coast', 'beach', 'waves']),
  forest: new Set(['forest', 'trees', 'tree', 'garden']),
  dark: new Set(['dark', 'night', 'stars']),
});
const GOAL_THEME = Object.freeze({
  introduce: 'relationships', first_meeting: 'relationships', approach: 'goals',
  question: 'goals', principles: 'goals', myth_fact: 'goals',
  consultation: 'relationships', program: 'life', workshop: 'life',
  exercise: 'health', explain_method: 'goals', story: 'life',
});
const REQUIRES_OFFER = new Set(['consultation', 'program', 'workshop']);
const COPY = Object.freeze({
  ru: {
    topic: 'Тема', about: 'Подробнее', learn: 'Узнать об услуге',
    hook: 'Что важно знать?', context: 'Знакомство с практикой',
    substance: 'Изучите описание и условия на странице специалиста.',
    details: 'Подробности и условия:', review: 'Проверьте текст и права перед публикацией.',
    noMedia: 'Подходящего лицензированного монтажа пока не найдено.',
  },
  en: {
    topic: 'Topic', about: 'Learn more', learn: 'Learn about this service',
    hook: 'What is useful to know?', context: 'An introduction to this practice',
    substance: 'See the practitioner page for the format and conditions.',
    details: 'Details and conditions:', review: 'Review the copy and rights before publishing.',
    noMedia: 'No eligible licensed montage was found.',
  },
  es: {
    topic: 'Tema', about: 'Más información', learn: 'Conoce este servicio',
    hook: '¿Qué conviene saber?', context: 'Conoce esta práctica',
    substance: 'Consulta la página profesional para conocer las condiciones.',
    details: 'Detalles y condiciones:', review: 'Revisa el texto y los derechos antes de publicar.',
    noMedia: 'No se ha encontrado un montaje autorizado.',
  },
});
function clean(value, limit = 120) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ')
    .trim().slice(0, limit);
}
function publicHref(value, locale) {
  const href = clean(value, 320);
  return PUBLIC_PATH.test(href) && href.startsWith('/' + locale + '/') ? href : '';
}
function publicOfferSnapshot(value, locale, goal) {
  if (value == null) {
    if (REQUIRES_OFFER.has(goal)) throw Error('published_offer_required');
    return null;
  }
  if (typeof value !== 'object' || value.published !== true ||
      value.publicSnapshot !== true || !['service', 'event', 'course', 'article'].includes(value.kind)) {
    throw Error('approved_public_snapshot_required');
  }
  if (REQUIRES_OFFER.has(goal) && !['service', 'event', 'course'].includes(value.kind)) {
    throw Error('offer_kind_mismatch');
  }
  const id = clean(value.id, 100), title = clean(value.title, 110);
  const href = publicHref(value.href, locale);
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !title || !href ||
      value.locale !== locale || !value.practitionerId) {
    throw Error('invalid_public_offer');
  }
  return Object.freeze({
    id, kind: value.kind, title, href, locale,
    practitionerId: clean(value.practitionerId, 100),
    // Public description is a quoted SOURCE claim, not a statement verified
    // by a generative model. Do not invent anything beyond this source.
    description: clean(value.publicDescription, 150),
  });
}
function publicIdentity(value, offer) {
  if (!value || typeof value !== 'object' || value.published !== true ||
      value.publicSnapshot !== true) return Object.freeze({ name: '', title: '' });
  const id = clean(value.practitionerId || value.id, 100);
  if (offer && id !== offer.practitionerId) throw Error('practitioner_mismatch');
  return Object.freeze({
    name: clean(value.displayName, 70),
    title: value.credentialVerified === true ? clean(value.professionalTitle, 90) : '',
  });
}
function exclusions(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 3) throw Error('invalid_visual_exclusions');
  const unique = new Set();
  for (const raw of value) {
    if (typeof raw !== 'string' || !Object.hasOwn(EXCLUDED_MOTIFS, raw)) {
      throw Error('unsupported_visual_exclusion');
    }
    unique.add(raw);
  }
  return [...unique];
}
function eligibleScene(value, id, excluded) {
  if (!value || value.id !== id || value.status !== 'approved' ||
      value.media !== 'licensed_mp4' || !Array.isArray(value.motifs) ||
      !Array.isArray(value.tags) || !SAFE_SCENE_ID.test(id) ||
      !VIDEO_PATH.test(value.video) || !value.video.endsWith('/' + id + '.mp4') ||
      value.rightsReference?.kind !== 'existing_approved_first_party_master' ||
      value.commercialUseDenied === true) return false;
  return excluded.every(tag => !value.motifs.some(motif => EXCLUDED_MOTIFS[tag].has(motif)));
}
function selectMontage({presets, scenes, theme, excluded, preferredPresetId}) {
  if (!Array.isArray(presets) || !Array.isArray(scenes)) return null;
  const byId = new Map(scenes.filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
  const eligible = presets.filter(p => p && typeof p.id === 'string' &&
    THEMES.includes(p.theme) && Array.isArray(p.clips) && p.clips.length === 4 &&
    new Set(p.clips).size === 4 &&
    p.clips.every(id => eligibleScene(byId.get(id), id, excluded)));
  if (!eligible.length) return null;
  const ranked = eligible.map((p, position) => {
    const special = p.id === preferredPresetId ? 15 : 0;
    const content = Array.isArray(p.focusTags) ? p.focusTags : [];
    const thematic = content.some(tag => ['trust', 'connection', 'clarity', 'growth'].includes(tag)) ? 2 : 0;
    return {preset: p, position, score: (p.theme === theme ? 100 : 0) + special + thematic};
  }).sort((a, b) => b.score - a.score || a.position - b.position);
  const selected = ranked[0].preset;
  // Commercial permission is NOT inferred from an existing catalog approval.
  const rightsReviewRequired = selected.clips.some(id => byId.get(id).commercialUseVerified !== true);
  return {
    presetId: selected.id,
    theme: selected.theme,
    sceneIds: [...selected.clips],
    scenes: selected.clips.map(id => ({id, video: byId.get(id).video,
      poster: byId.get(id).poster || null})),
    rightsReviewRequired,
  };
}
/**
 * @param {{goal: string, locale: 'ru'|'en'|'es', topic?:string,
 *  publicOffer?:object|null, publicPractitioner?:object|null,
 *  presets?:object[], scenes?:object[], avoidMotifs?:string[],
 *  preferredPresetId?:string|null}} input
 */
export function proposeProfessionalCampaign(input = {}) {
  const {goal, locale} = input;
  if (!LOCALES.includes(locale)) throw Error('unsupported_locale');
  const template = proposeProfessionalTemplate({goal, locale});
  const offer = publicOfferSnapshot(input.publicOffer, locale, goal);
  const identity = publicIdentity(input.publicPractitioner, offer);
  const topic = clean(input.topic, 140);
  const excludedMotifs = exclusions(input.avoidMotifs);
  const theme = GOAL_THEME[goal] || 'goals';
  const montage = selectMontage({
    presets: input.presets, scenes: input.scenes, theme,
    excluded: excludedMotifs, preferredPresetId: input.preferredPresetId,
  });
  const t = COPY[locale];
  const headline = offer?.title || topic || template.title[locale];
  const context = [identity.name, identity.title].filter(Boolean).join(' · ') || t.context;
  const approvedDescription = offer?.description || '';
  const cta = offer ? {label: t.learn, href: offer.href, verifiedPublicSource: true} :
    {label: t.about, href: null, verifiedPublicSource: false};
  const texts = [
    clean(headline, 95),
    clean(context, 95),
    approvedDescription || t.substance,
    offer ? (t.details + ' ' + offer.href) : t.review,
  ];
  const shotPlan = template.shotPlan.map((beat, index) => Object.freeze({
    ...beat, sceneId: montage?.sceneIds[index] || null,
    onScreenText: clean(texts[index], 150),
  }));
  const copy = [
    headline,
    approvedDescription,
    offer ? t.details + ' ' + offer.href : t.review,
  ].filter(Boolean).join('\n\n');
  const warnings = [];
  if (!offer) warnings.push('no_verified_public_offer');
  if (!montage) warnings.push('no_eligible_montage');
  if (montage?.rightsReviewRequired) warnings.push('commercial_rights_review_required');
  warnings.push('professional_copy_review_required');
  // Drafts deliberately require a real human check. A media reference alone
  // never proves an actual video, render, publication or social provider receipt.
  return Object.freeze({
    version: PROFESSIONAL_DIRECTOR_VERSION,
    templateId: template.templateId, goal, locale,
    aspect: '9:16', durationSec: 30,
    headline, displayName: identity.name, verifiedProfessionalTitle: identity.title,
    source: offer && {id: offer.id, kind: offer.kind, href: offer.href, publicSnapshot: true},
    montage: montage && {presetId: montage.presetId, theme: montage.theme, sceneIds: montage.sceneIds,
      scenes: montage.scenes, rightsReviewRequired: montage.rightsReviewRequired},
    sceneIds: montage?.sceneIds || [],
    mediaAvailability: montage ? 'catalog_matched_runtime_unverified' : 'no_matching_licensed_preset',
    renderMode: montage ? 'existing_local_mp4_compilation' : 'storyboard_only',
    shotPlan, postDraft: copy, cta,
    excludedMotifs, warnings, requiresHumanReview: true,
    paidRenderApproved: false, aiVideoGenerated: false,
    noExternalClientData: true,
    status: montage ? 'proposal_ready_for_editor_review' : 'needs_media_selection',
  });
}
