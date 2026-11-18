/**
 * Problem-first shortlist of actual Holistic House offers.
 * The public Assist request and preferences remain entirely in the browser.
 * No categories, directories or general reading tools are sold as products.
 */
import { rankAssistOffers } from "./service-match.mjs";

export const ASSIST_PRODUCT_PRIORITY=Object.freeze({
  stress: Object.freeze(["therapy","opora","reiki"]),
  relationships: Object.freeze(["therapy","constellation","review"]),
  energy: Object.freeze(["reiki","opora","mandala"]),
  health: Object.freeze(["review","therapy"]),
  work: Object.freeze(["business","review","constellation"]),
  growth: Object.freeze(["review","therapy","constellation"]),
  general: Object.freeze(["review","therapy","constellation"]),
});
export function rankAssistProducts(focus="general",preferences={},limit=3){
  const topic=Object.hasOwn(ASSIST_PRODUCT_PRIORITY,focus)?focus:"general";
  // Use the existing verified budget/channel/mode constraints as hard eligibility.
  // Retrieve the full eligible set: the top three generic tools may not be products.
  const eligible=new Set(rankAssistOffers(topic,preferences,20).map(({id})=>id));
  return ASSIST_PRODUCT_PRIORITY[topic].filter(id=>eligible.has(id)).slice(0,limit);
}
