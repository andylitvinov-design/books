// Source-only adapter for existing source-verified content ranking.
// A route must enforce real Supabase owner/auth permissions and safety preflight
// before calling this bridge; neither is inferred from a request body.
import { rankOffersByClientAxes } from './axis-offer-ranker.mjs';
import { rankMeditationCatalog } from './meditation-catalog-ranker.mjs';
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
