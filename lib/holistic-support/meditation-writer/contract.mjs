/**
 * Writer Mind input contract. Does not decide clinical eligibility, user
 * identity, consent or account access. Those MUST come from a trusted host.
 */
export const WRITER_SCHEMA_VERSION = "meditation-writer-v1";
export const WRITER_BEAT_IDS = Object.freeze([
  "arrival","choice","resource_image","non_directive_exploration",
  "supportive_choice","return_to_here","closing",
]);
export const WRITER_STYLES = Object.freeze([
  "gentle_simple","grounded_practical","poetic_contained","contemplative",
]);
export const WRITER_AVOID = Object.freeze([
  "breath_focus","eyes_closed","touch","water","animals","darkness",
  "people","body_scan",
]);
const LOCALES = new Set(["ru","en","es"]);
const FOCI = new Set(["stress","relationships","self_worth","meaning"]);
const INTENTIONS = new Set(["settle","support","confidence","boundaries",
  "clarity","energy","relationships","goals","meaning"]);
const STYLES = new Set(WRITER_STYLES);
const AVOID = new Set(WRITER_AVOID);
const ALLOWED_FIELDS = new Set([
  "locale","focus","intentionCode","motifId","symbolId","mode",
  "durationMinutes","styleId","channel","noImagery","avoidElements",
  "clientPhrase","desiredExperience","problemFrame",
]);
const CHANNELS = new Set(["neutral","visual","auditory","tactile"]);
const exactText = (s,max) => typeof s === "string" &&
  s.length <= max && !/[\u0000-\u0008\u000B-\u001F]/u.test(s);
const invalid = code => Object.freeze({status:"invalid_input",code});
export function normalizeWriterRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(k => !ALLOWED_FIELDS.has(k)))
    return invalid("WRITER_UNRECOGNIZED_FIELDS");
  if (!LOCALES.has(input.locale) || !FOCI.has(input.focus) ||
      (input.mode !== undefined && input.mode !== "resource") ||
      ![5,10,15].includes(input.durationMinutes) ||
      (input.intentionCode !== undefined && !INTENTIONS.has(input.intentionCode)) ||
      (input.styleId !== undefined && !STYLES.has(input.styleId)) ||
      (input.channel !== undefined && !CHANNELS.has(input.channel)) ||
      (input.noImagery !== undefined && typeof input.noImagery !== "boolean") ||
      (input.motifId !== undefined && (!exactText(input.motifId,60) || !/^[a-z_]+$/.test(input.motifId))) ||
      (input.symbolId !== undefined && (!exactText(input.symbolId,60) || !/^[a-z_]+$/.test(input.symbolId))) ||
      (input.avoidElements !== undefined && (!Array.isArray(input.avoidElements) ||
         input.avoidElements.length > 8 || new Set(input.avoidElements).size !== input.avoidElements.length ||
         input.avoidElements.some(x=>!AVOID.has(x)))) ||
      (input.clientPhrase !== undefined && !exactText(input.clientPhrase,160)) ||
      (input.desiredExperience !== undefined && !exactText(input.desiredExperience,180)) ||
      (input.problemFrame !== undefined && !exactText(input.problemFrame,350)))
    return invalid("WRITER_INVALID_VALUE");
  // The input may not elevate permissions. Only the server passes consent,
  // safety or profile-scoped values as separate trusted arguments.
  return Object.freeze({
    status:"valid", schemaVersion:WRITER_SCHEMA_VERSION,
    locale:input.locale,focus:input.focus,mode:"resource",
    intentionCode:input.intentionCode||null,motifId:input.motifId||null,
    symbolId:input.symbolId||null,durationMinutes:input.durationMinutes,
    styleId:input.styleId||"gentle_simple",
    channel:input.channel||"neutral",noImagery:input.noImagery===true,
    avoidElements:Object.freeze([...(input.avoidElements||[])]),
    clientPhrase:(input.clientPhrase||"").trim(),
    desiredExperience:(input.desiredExperience||"").trim(),
    problemFrame:(input.problemFrame||"").trim(),
  });
}
export function validateWriterRequest(request) {
  const value=normalizeWriterRequest(request);
  return value.status==="valid" ? {ok:true,value} :
    {ok:false,error:value.code};
}
