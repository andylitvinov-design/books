// Shared, deterministic request-fit model for PUBLIC meditation and personal
// service discovery. Strictly local: no client state leaves the browser.
//
// This is topic relevance (NOT a diagnosis, prognosis, therapeutic effectiveness
// score, booking confirmation or a paid conversion propensity estimate).
export const CLIENT_GOALS = Object.freeze(["money","energy","relationships","goals","meaning"]);
const VALID_GOALS = new Set(CLIENT_GOALS);
const safeTags = (value) => Array.isArray(value)
  ? [...new Set(value.filter(x=>typeof x==="string" && /^[a-z][a-z0-9_]{0,48}$/.test(x)))].slice(0,25)
  : [];
const hits = (available, requested) => {
  const known = new Set(safeTags(available));
  return safeTags(requested).filter(value=>known.has(value));
};
const number = (n, fallback=0) => typeof n==="number" && Number.isFinite(n) && n>=0 ? n : fallback;

/**
 * Explicit goal dominates. The three optional user-chosen dimensions affect
 * both ranking and the *honesty* of the match label. A broad goal match
 * without an explicitly requested situation is NEVER an "exact" match.
 */
export function evaluateClientFit(item, request={}) {
  const goal = VALID_GOALS.has(request.goal) ? request.goal : null;
  const selected = {
    situations:safeTags(request.situations), desiredStates:safeTags(request.desiredStates),
    techniques:safeTags(request.techniques),
  };
  const matched = {
    situations:hits(item.situations,selected.situations),
    desiredStates:hits(item.desiredStates,selected.desiredStates),
    techniques:hits(item.techniques,selected.techniques),
  };
  const goalMatched = Boolean(goal && safeTags(item.goals).includes(goal));
  const groups = Object.keys(selected).filter(key=>selected[key].length);
  const matchedGroups = groups.filter(key=>matched[key].length);
  const groupWeights = {situations:38,desiredStates:23,techniques:13};
  const detailScore = groups.reduce((sum,key)=>sum+
    (matched[key].length ? groupWeights[key] * matched[key].length/selected[key].length : 0),0);
  const rawGoalWeight = item.goalWeights?.[goal];
  const weight = goalMatched ? Math.min(100,number(rawGoalWeight,75)) : 0;
  // A broad video with five unrelated tags must not routinely outrank a
  // single-purpose practice that meets the user's specific request.
  const broadness = Math.max(0,safeTags(item.goals).length-1)*3;
  const score = (goalMatched?52+weight*0.12:0) + detailScore - broadness;
  const matchType = !goalMatched ? "related" :
    groups.length===0 ? "topic" :
    matchedGroups.length===groups.length ? "exact" :
    matchedGroups.length ? "partial" : "related";
  return {
    goalMatched, score, matchType, matched, groups,
    reasons:[
      ...(goalMatched ? [{facet:"goal",value:goal}] : []),
      ...matched.situations.map(value=>({facet:"situation",value})),
      ...matched.desiredStates.map(value=>({facet:"outcome",value})),
      ...matched.techniques.map(value=>({facet:"technique",value})),
    ],
  };
}

// All IDs below come from the already published, localized core-service
// catalogue. This is topic metadata ONLY; it never creates an offer, price,
// practitioner, availability, or review score.
export const CLIENT_SERVICE_FITS = Object.freeze({
  situation: {
    goals:CLIENT_GOALS, situations:[], desiredStates:["clarity","reflection","acceptance"],
    techniques:["reflection"],free:true,format:"written",
  },
  dao: {
    goals:["energy","meaning"],situations:["spiritual_exploration","loss_of_meaning"],
    desiredStates:["reflection","grounding"],techniques:["reflection","energy_symbolic"],
    free:true,format:"self_reflection",
  },
  alchemy: {
    goals:["relationships","meaning","goals"],
    situations:["relationships_tension","self_criticism","hard_decision","loss_of_meaning"],
    desiredStates:["clarity","connection","reflection","acceptance"],
    techniques:["visualization","reflection"],free:false,format:"session",
  },
  hypnotherapy: {
    goals:["relationships","meaning","energy"],
    situations:["self_criticism","loss_of_meaning","emotional_overload","relationships_tension"],
    desiredStates:["reflection","self_compassion","calm"],
    techniques:["visualization","relaxation"],free:false,format:"course",
  },
  business: {
    goals:["money","goals"],situations:["income_uncertainty","hard_decision","low_focus","need_motivation"],
    desiredStates:["clarity","focus","confidence","motivation"],
    techniques:["reflection","focus"],free:false,format:"session",
  },
});

/** Lists only actual published offers supplied by the caller, with no guessed prices. */
export function rankClientServices({offers=[],request={},limit=3}={}) {
  const wantFree = request.paymentPreference==="free";
  const goals = VALID_GOALS.has(request.goal);
  const list = (Array.isArray(offers)?offers:[]).filter(offer=>{
    const meta = CLIENT_SERVICE_FITS[offer?.id];
    return meta && offer.href?.match(/^\/(en|ru|es)\/services\/[a-z][a-z-]+(?:[?#][a-z0-9-]+)?$/) &&
      (!wantFree || meta.free);
  });
  const seen=new Set();
  return list.flatMap(offer=>{
    if(seen.has(offer.id))return [];
    seen.add(offer.id);
    const meta=CLIENT_SERVICE_FITS[offer.id];
    const fit=evaluateClientFit({
      goals:meta.goals,goalWeights:{},situations:meta.situations,
      desiredStates:meta.desiredStates,techniques:meta.techniques,
    },request);
    // Never return an unrelated paid service just to fill the section.
    if(goals && !fit.goalMatched)return [];
    const generic = offer.id==="situation";
    const score=fit.score+(meta.free?3:0)-(generic?18:0);
    return [{offer,free:meta.free,format:meta.format,score,matchType:generic?"related":fit.matchType,
      reasons:generic?[]:fit.reasons}];
  }).sort((a,b)=>b.score-a.score || (Number(b.free)-Number(a.free)) ||
    a.offer.id.localeCompare(b.offer.id)).slice(0,Math.max(0,Math.min(5,Number.isFinite(limit)?Math.trunc(limit):3)));
}
