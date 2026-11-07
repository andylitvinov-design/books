/**
 * Bounded, ephemeral conversational focus (not a memory database).
 * Preserve context for a genuine follow-up ("and why?"), but never infer a
 * diagnosis, sensitive trait, consent, payment choice or treatment need.
 * Current explicit choice ALWAYS overrides older conversation.
 */
import { interpretSupportUtterance } from "./guide-dialogue.mjs";
import { interpretDialogueCoherence } from "./dialogue-coherence.mjs";
import { CLIENT_GOALS } from "./client-intent-model.mjs";
export const CONVERSATION_CONTEXT_VERSION = "hi-conversation-context-v1";
const GOALS = new Set(CLIENT_GOALS);
const arr = x => Array.isArray(x) ? x : [];
const topicOf = (text,locale) => {
  if(typeof text!=="string"||text.length>3000)return null;
  const topic=interpretSupportUtterance(text,locale).topic;
  const normalized=topic==="love"?"relationships":topic;
  return GOALS.has(normalized)?normalized:null;
};
// A corrected short topic is allowed to replace a previous choice, but never
// to infer sensitive traits, a diagnosis or permission to access private data.
const correctedTopicOf=(text,locale)=>{
 const direct=topicOf(text,locale);
 if(direct)return direct;
 const s=String(text||"").toLocaleLowerCase().normalize("NFD")
   .replace(/[\u0300-\u036f]/g,"").replace(/ё/g,"е");
 const rules=[
  ["money",/(?:работ|карьер|деньг|бизнес|work|job|career|business|money|trabajo|negocio|dinero)/u],
  ["relationships",/(?:любов|отношен|близост|семь|love|relationship|partner|amor|pareja|relacion)/u],
  ["energy",/(?:стресс|тревог|устал|энерг|сон|stress|tired|energy|sleep|ansiedad|estres|energia|sueno)/u],
  ["meaning",/(?:смысл|призвани|meaning|purpose|sentido|proposito)/u],
  ["goals",/(?:цел[ьи]|план|мотивац|goal|plan|motivat|objetivo|meta)/u],
 ];
 return rules.find(([,rx])=>rx.test(s))?.[0]||null;
};
const ref = /^(?:а\s+)?(?:почему|зачем|как|что дальше|и что|а если|да|ага|нет|не знаю|продолжи|расскажи|объясни|why|how|what next|and|yes|no|continue|explain|tell me|por que|porque|cómo|como|y si|sí|si|vale)(?=\s|[?!.,:]|$)/iu;
const stop = /^(?:стоп|хватит|закончим|не хочу продолжать|начнём сначала|начнем сначала|сбросить диалог|stop|end conversation|start over|reset conversation|basta|terminar|empezar de nuevo)(?:[.! ]|$)/iu;
const change = /(?:другая тема|поменять тему|сменить тему|не об этом|не то|не это|давай другое|ты меня не понял|not this topic|change topic|switch topic|you misunderstood|that's not it|thats not it|another subject|otro tema|cambiar tema|no es eso|eso no)/iu;
export function resolveConversationFocus({message="",history=[],locale="en",selectedGoal=null}={}) {
  const text=typeof message==="string"?message.trim().slice(0,3000):"";
  if(!text)return {version:CONVERSATION_CONTEXT_VERSION,goal:null,source:"none",act:"empty"};
  if(stop.test(text))return {version:CONVERSATION_CONTEXT_VERSION,goal:null,source:"none",act:"stop"};
  const coherent=interpretDialogueCoherence({message:text,history});
  if(coherent.act==="correct_topic"){
    const goal=correctedTopicOf(coherent.affirmedClause,locale);
    return {version:CONVERSATION_CONTEXT_VERSION,goal,source:"current",
      act:goal?"focus":"clarify"};
  }
  if(["reject","ambiguous","switch"].includes(coherent.act)||
     /^(?:не\s+(?:про|о)(?=\s)|not about\s|no sobre\s)/iu.test(text))
    return {version:CONVERSATION_CONTEXT_VERSION,goal:null,source:"current",
      act:coherent.act==="ambiguous"?"clarify":"change"};
  const parsed=interpretSupportUtterance(text,locale);
  if(parsed.kind==="switch-topic"||change.test(text))
    return {version:CONVERSATION_CONTEXT_VERSION,goal:null,source:"none",act:"change"};
  const current=topicOf(text,locale);
  if(current)return {version:CONVERSATION_CONTEXT_VERSION,goal:current,source:"current",act:"focus"};
  if(GOALS.has(selectedGoal))return {version:CONVERSATION_CONTEXT_VERSION,
    goal:selectedGoal,source:"explicit_filter",act:"focus"};
  // Never let an assistant message become a user preference, and never infer
  // background motives just because two utterances are adjacent.
  if(!ref.test(text))return {version:CONVERSATION_CONTEXT_VERSION,
    goal:null,source:"none",act:"clarify"};
  const recent=arr(history).slice(-6).filter(x=>x?.role==="user"&&typeof x.text==="string");
  for(const previous of recent.reverse()){
    if(stop.test(previous.text)||change.test(previous.text))break;
    const goal=topicOf(previous.text,locale);
    if(goal)return {version:CONVERSATION_CONTEXT_VERSION,
      goal,source:"recent_user_choice",act:"follow_up"};
  }
  return {version:CONVERSATION_CONTEXT_VERSION,goal:null,source:"none",act:"clarify"};
}
