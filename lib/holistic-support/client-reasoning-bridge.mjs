// Source-only adapter for existing source-verified content ranking.
// A route must enforce real Supabase owner/auth permissions and safety preflight
// before calling this bridge; neither is inferred from a request body.
import { rankOffersByClientAxes } from './axis-offer-ranker.mjs';
import { planClientNextStep } from './client-reasoning-core.mjs';

export function reasonAcrossVerifiedOffers(input = {}) {
  return planClientNextStep({ ...input, rankOffers: rankOffersByClientAxes });
}