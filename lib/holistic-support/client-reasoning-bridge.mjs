// Source-only adapter for existing source-verified content ranking.
// A route must enforce real Supabase owner/auth permissions and safety preflight
// before calling this bridge; neither is inferred from a request body.
import { rankOffersByClientAxes } from './axis-offer-ranker.mjs';
import { rankMeditationCatalog } from './meditation-catalog-ranker.mjs';
import { rankClientServices } from './client-intent-model.mjs';
import { planClientNextStep } from './client-reasoning-core.mjs';

export function reasonAcrossVerifiedOffers(input = {}) {
  return planClientNextStep({ ...input, rankOffers: rankOffersByClientAxes });
}
// `videos` and `publishedSourceIds` must come from the server-side discovery
// loader, never from the browser. The caller must provide its safety preflight.
export function reasonAcrossMeditations({ videos = [], publishedSourceIds = [], ...input } = {}) {
  return planClientNextStep({ ...input, catalogItems: videos, rankOffers: ({ client, items }) => {
    const goals = new Set(['money', 'energy', 'relationships', 'goals', 'meaning']);
    const goal = client.selectedTopics.find(topic => goals.has(topic));
    if (!goal || (client.formats.length && !client.formats.includes('video'))) return [];
    const safeItems = items.filter(video => typeof video?.youtube_id === 'string' &&
      video.source_url === `https://www.youtube.com/watch?v=${video.youtube_id}` &&
      // The current catalog has no verified sensitivity field. Until that
      // review exists, do not offer relationship-tagged or flagged content.
      video.sensitive !== true && !(Array.isArray(video.goals) && video.goals.includes('relationships')) &&
      !(Array.isArray(video.safety_flags) && video.safety_flags.some(flag => ['intimacy','sexuality','sexual_content','sensitive'].includes(flag))) &&
      !(Array.isArray(video.safety_flags) && video.safety_flags.some(flag => client.avoidSafetyFlags.includes(flag))));
    return rankMeditationCatalog({ videos: safeItems, publishedSourceIds, request: {
      language: client.audioLanguage, goal, maxDurationMinutes: client.maxDurationMinutes,
      intensity: input.intent?.intensity, situations: input.intent?.situations,
      desiredStates: input.intent?.desiredStates, techniques: input.intent?.techniques,
      limit: 30,
    } }).map(({ video }) => ({
      id: `youtube:${video.youtube_id}`, kind: 'video', rankClass: 'topic',
      item: { title: video.title, href: video.source_url, free: true },
      matchedTopics: [goal],
    }));
  } });
}

// The shortlist is a public, rights-cleared projection made by the server;
// full test definitions and answers are never part of this contract.
export function reasonAcrossTests({ testCatalog = {}, ...input } = {}) {
  return planClientNextStep({ ...input, rankOffers: ({ client }) => {
    const goal = client.selectedTopics.find(topic => ['energy','money','meaning'].includes(topic));
    if (!goal || (client.formats.length && !client.formats.includes('test'))) return [];
    const rows = Array.isArray(testCatalog[goal]) ? testCatalog[goal] : [];
    return rows.filter(item => typeof item?.key === 'string' && /^[a-z0-9][a-z0-9-]{1,95}$/.test(item.key) &&
      ['en','ru'].includes(item.instrumentLocale) &&
      item.href === `/${client.language === 'ru' ? 'ru' : 'en'}/client?startTests=${encodeURIComponent(item.key)}` &&
      Number.isFinite(item.durationMinutes) && item.durationMinutes > 0 &&
      (!client.maxDurationMinutes || item.durationMinutes <= client.maxDurationMinutes))
      .map(item => ({id:`test:${item.key}`,kind:'test',rankClass:'topic',
        item:{title:item.title,href:item.href,free:true},matchedTopics:[goal]}));
  } });
}

// Only these existing published routes have been reviewed for this adapter.
// Symbolic and other sensitive services require a separate review and opt-in.
export function reasonAcrossServices({ services = [], includePaid = false, ...input } = {}) {
  return planClientNextStep({ ...input, rankOffers: ({ client }) => {
    const goal = client.selectedTopics.find(topic => ['money','energy','relationships','goals','meaning'].includes(topic));
    if (!goal || client.maxDurationMinutes || (client.formats.length && !client.formats.includes('service'))) return [];
    const routes = { situation:'free-situation-review', business:'business-consulting' };
    const eligible = (Array.isArray(services) ? services : []).filter(row => Object.hasOwn(routes,row?.id) &&
      row.href === `/${client.language}/services/${routes[row.id]}` &&
      (row.id !== 'business' || includePaid === true));
    return rankClientServices({ offers:eligible, request:{goal,paymentPreference:includePaid?'any':'free'}, limit:5 })
      .map(({offer,free}) => ({id:`service:${offer.id}`,kind:'service',rankClass:'topic',
        item:{title:offer.title,href:offer.href,free},matchedTopics:[goal]}));
  } });
}
