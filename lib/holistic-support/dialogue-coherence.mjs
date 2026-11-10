import {resolveConversationTopic} from "./conversation-intelligence.mjs";

/**
 * Bounded, offline-only conversational repair for RU/EN/ES.
 * Interprets explicit corrections and negated alternatives without inferring
 * consent, personal characteristics, diagnoses, payment or a render command.
 * No persisted memory: assistant messages NEVER establish a preference.
 *
 * @typedef {"none"|"choose"|"switch"|"reject"|"correct_topic"|"ambiguous"} DialogueAct
 * @typedef {"video"|"meditation"|null} DialogueMedium
 * @typedef {{act:DialogueAct,medium:DialogueMedium,topic:string|null,affirmedClause:string|null,
 *   source:"current"|"recent_user"|"none",confidence:number,requiresClarification:boolean}} DialogueTurn
 */
export const DIALOGUE_COHERENCE_VERSION="hi-dialogue-coherence-v1";
const limit = x=>String(x??"").trim().slice(0,800);
const normal = x=>limit(x).toLocaleLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"").replace(/ё/g,"е").replace(/\s+/g," ").trim();
const videoRx=/(?:\bvideo\b|\bfilm\b|\breel\b|видео|видеоролик|ролик|видеофильм|pelicula|vídeo)/iu;
const meditationRx=/(?:медитац|медитир|meditat|meditacion|meditar)/iu;
const negativeRx=/(?:^|\s)(?:не\s+(?:хочу|нужн\p{L}*|надо|делай|выбирай|про)|без|not|no|without|dont want|do not want|dont need|do not need|no quiero|no necesito|sin|вместо|instead of|en vez de)(?=\s|$)/iu;
const corrections=/(?:точнее|вернее|лучше|я\s+(?:име[лла]|имел[ау]?)\s+в\s+виду|нет[,:]\s*(?=не\s|я\s|лучше\s)|\bactually\b|\bi meant\b|\bi mean\b|\brather\b|\binstead\b|\bbut\b|\bsino\b|\bmejor\b|\ben realidad\b|\bquise decir\b|,\s*(?=хочу\s|нужн\p{L}*\s|want\s|quiero\s))/giu;
const topicContrast=/(?:не\s+(?:про|о)\s+|not about\s+|no\s+(?:sobre|de)\s+)([\p{L}\s-]+?)(?:,?\s+(?:а\s+(?:про\s+)?|но\s+(?:про\s+)?|but\s+(?:about\s+)?|rather\s+(?:than\s+)?|sino\s+(?:sobre\s+)?|mejor\s+))([\p{L}\s-]{2,80})/iu;
const separateAlternatives=/(?:\bили\b|\bor\b|\bo\b|\bu\b|\bили лучше\b)/iu;
const stop= /^(?:стоп|хватит|закончим|сбросить диалог|начать сначала|начнем сначала|начнём сначала|stop|end conversation|start over|reset conversation|basta|terminar|empezar de nuevo)(?:[.! ]|$)/iu;
const reject= /^(?:нет|неа|не хочу|другое|не надо|no|nope|not really|otra cosa|otro)(?:[.! ]|$)/iu;
const positive= /^(?:да|ага|угу|ok|okay|yes|yeah|sure|si|claro|vale)(?:[.! ]|$)/iu;
function mediaMentions(s){
  const term=/видео|видеоролик|ролик|\bvideo\b|\bfilm\b|\breel\b|pelicula|медитац\p{L}*|медитир\p{L}*|\bmeditat\p{L}*|\bmeditacion\b|\bmeditar\b/giu;
  const out=[];
  for(const hit of s.matchAll(term)){
    const medium=videoRx.test(hit[0])?"video":"meditation";
    const before=s.slice(Math.max(0,hit.index-55),hit.index).split(/[,;.!?]|\b(?:but|rather|sino|mejor|instead)\b/iu).at(-1)||"";
    const after=s.slice(hit.index+hit[0].length,hit.index+hit[0].length+23);
    const negated=/(?:^|\s)(?:не(?:\s+(?:хочу|нужн\p{L}*|надо|делай|выбирай|про))?|без|don't\s+(?:want|need)|dont\s+(?:want|need)|do\s+not\s+(?:want|need)|not|without|no\s+(?:quiero|necesito)?|sin|вместо|instead\s+of|en\s+vez\s+de)(?:\s+(?:мне|это|un|una|the|a|an|el))?\s*$/iu.test(before)||
      /^\s+(?:не\s+(?:хочу|нужно|надо|подходит)|not\s+wanted|no\s+quiero)(?=\s|[,;.!?]|$)/iu.test(after);
    out.push({medium,negated,index:hit.index});
  }
  return out;
}
function latestCorrection(s){
  const hits=[...s.matchAll(corrections)];
  if(!hits.length)return null;
  // Correction is meaningful only when an actual positive alternative follows.
  return s.slice(hits.at(-1).index+hits.at(-1)[0].length).trim();
}
function chosenMedia(s){
  const mentioned=mediaMentions(s),positive=[...new Set(mentioned.filter(x=>!x.negated).map(x=>x.medium))];
  const excluded=[...new Set(mentioned.filter(x=>x.negated).map(x=>x.medium))];
  return {positive,excluded,mentioned};
}
function lastUserMedium(history){
  for(const row of (Array.isArray(history)?history.slice(-6):[]).reverse()){
    if(row?.role!=="user"||typeof row.text!=="string")continue;
    const s=normal(row.text);
    if(stop.test(s)||reject.test(s))break;
    const {positive}=chosenMedia(s);
    if(positive.length>1)return "ambiguous";
    if(positive.length===1)return positive[0];
  }
  return null;
}
/** Pure, low-assumption step-agnostic interpretation. */
export function interpretDialogueCoherence({message="",history=[]}={}){
  const s=normal(message),empty={act:"none",medium:null,topic:null,affirmedClause:null,source:"none",
    confidence:0,requiresClarification:false};
  if(!s||stop.test(s))return empty;
  const {positive:allPos,excluded:allNeg}=chosenMedia(s),corrected=latestCorrection(s);
  const correctedPos=corrected?chosenMedia(corrected).positive:[];
  if(corrected&&correctedPos.length===1){
    return {act:(allNeg.length||allPos.some(x=>x!==correctedPos[0]))?"switch":"choose",
      medium:correctedPos[0],topic:null,affirmedClause:corrected,source:"current",
      confidence:1,requiresClarification:false};
  }
  if(allPos.length===1&&allNeg.length&&allPos[0]!==allNeg[0]){
    return {act:"switch",medium:allPos[0],topic:null,affirmedClause:s,source:"current",
      confidence:1,requiresClarification:false};
  }
  if(allPos.length>1){
    return {act:"ambiguous",medium:null,topic:null,affirmedClause:null,source:"current",
      confidence:1,requiresClarification:true};
  }
  // "Not about love, but about work" is a correction rather than a new
  // preference for both. Keep only the confirmed final topic text.
  const topic=topicContrast.exec(s);
  if(topic&&!allPos.length){
    return {act:"correct_topic",medium:null,topic:resolveConversationTopic(topic[2].trim()),
      affirmedClause:topic[2].trim(),source:"current",confidence:1,requiresClarification:false};
  }
  if(!allPos.length&&allNeg.length){
    return {act:"reject",medium:allNeg.length===1?allNeg[0]:null,topic:null,
      affirmedClause:null,source:"current",confidence:1,requiresClarification:true};
  }
  // Corrected topic without an explicit contrast is not enough to infer
  // semantics; the existing topic parser examines only the positive tail.
  if(corrected&&!allPos.length&&corrected.length>2&&negativeRx.test(s)){
    return {act:"correct_topic",medium:null,topic:resolveConversationTopic(corrected),
      affirmedClause:corrected,source:"current",confidence:.95,requiresClarification:false};
  }
  if(positive.test(s)){
    const medium=lastUserMedium(history);
    if(medium==="ambiguous")return {act:"ambiguous",medium:null,topic:null,affirmedClause:null,
      source:"recent_user",confidence:1,requiresClarification:true};
  }
  return empty;
}
