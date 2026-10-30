/**
 * Bounded, ephemeral conversational focus (not a memory database).
 * Preserve context for a genuine follow-up ("and why?"), but never infer a
 * diagnosis, sensitive trait, consent, payment choice or treatment need.
 * Current explicit choice ALWAYS overrides older conversation.
 */
import { interpretSupportUtterance } from "./guide-dialogue.mjs";
import { CLIENT_GOALS } from "./client-intent-model.mjs";
export const CONVERSATION_CONTEXT_VERSION = "hi-conversation-context-v1";
const GOALS = new Set(CLIENT_GOALS);
const obj = x => x && typeof x==="object" && !Array.isArray(x) ? x : {};
const arr = x => Array.isArray(x) ? x : [];
const topicOf = (text,locale) => {
  if(typeof text!=="string"||text.length>3000)return null;
  const topic=interpretSupportUtterance(text,locale).topic;
  const normalized=topic==="love"?"relationships":topic;
  return GOALS.has(normalized)?normalized:null;
};
const ref = /^(?:а\s+)?(?:почему|зачем|как|что дальше|и что|а если|да|ага|нет|не знаю|продолжи|расскажи|объясни|why|how|what next|and|yes|no|continue|explain|tell me|por que|porque|cómo|como|y si|sí|si|vale)(?=\s|[?!.,:]|$)/iu;
const stop = /^(?:стоп|хватит|закончим|не хочу продолжать|начнём сначала|начнем сначала|сбросить диалог|stop|end conversation|start over|reset conversation|basta|terminar|empezar de nuevo)(?:[.! ]|$)/iu;
const change = /(?:другая тема|поменять тему|сменить тему|не об этом|не то|ты меня не понял|not this topic|change topic|switch topic|you misunderstood|otro tema|cambiar tema|no es eso)/iu;
export function resolveConversationFocus({message="",history=[],locale="en",selectedGoal=null}={}) {
  const text=typeof message==="string"?message.trim().slice(0,3000):"";
  if(!text)return {version:CONVERSATION_CONTEXT_VERSION,goal:null,source:"none",act:"empty"};
  if(stop.test(text))return {version:CONVERSATION_CONTEXT_VERSION,goal:null,source:"none",act:"stop"};
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
