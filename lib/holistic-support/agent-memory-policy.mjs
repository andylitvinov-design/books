/**
 * Validated, affirmative and revocable memory. No silent extraction from chat.
 * The only accepted fields are client-authored communication preferences.
 * Keep private health and test evidence in the existing owner-scoped profile,
 * NOT in this new memory store.
 */
export const AGENT_MEMORY_VERSION="hh-agent-memory-v1";
export const AGENT_MEMORY_KEYS=Object.freeze([
  "preferred_name","communication_style","response_length",
  "avoid_format","personal_accent",
]);
const KINDS=new Set(AGENT_MEMORY_KEYS);
const STYLE=new Set(["formal","informal","neutral"]);
const LENGTH=new Set(["short","normal","detailed"]);
const FORMATS=new Set(["video","audio","test","course","service"]);
const forbidden=/https?:\/\/|www\.|[\u0000-\u001f\u007f]|[<>]|(?:^|\s)(?:sk-|pk-|sb_secret_|eyJ[A-Za-z0-9_-]{20,})|(?:\S+@\S+\.[A-Za-z]{2,})/iu;
const injection=/(?:ignore\s+(?:all\s+)?(?:previous|system|developer)|system\s+prompt|developer\s+message|assistant\s+instructions|you\s+are\s+now|ignore\s+(?:safety|rules)|игнорируй\s+(?:все\s+)?(?:правила|инструкции)|забудь\s+(?:все\s+)?(?:правила|инструкции)|omitir\s+(?:las\s+)?instrucciones)/iu;
const trimmed = value=>typeof value==="string"?value.trim().replace(/\s+/g," "):"";
export function validateMemoryPreference(kind,value) {
  if(!KINDS.has(kind) || typeof value!=="string")return null;
  const text=trimmed(value);
  if(!text || forbidden.test(value) || injection.test(text))return null;
  if(kind==="communication_style")return STYLE.has(text)?text:null;
  if(kind==="response_length")return LENGTH.has(text)?text:null;
  if(kind==="avoid_format")return FORMATS.has(text)?text:null;
  if(kind==="preferred_name"){
    if(text.length>60 || /[\d{}[\]\\/=]/u.test(text))return null;
    return text;
  }
  // This is user-typed, never LLM-extracted. The UI discourages medical notes.
  return text.length<=160 ? text : null;
}
export function approvedMemoryForLocalPrompt(items) {
  const safe=[];
  if(!Array.isArray(items))return safe;
  for(const row of items.slice(0,10)){
    const kind=row?.kind;
    const value=validateMemoryPreference(kind,row?.value);
    if(value && !safe.some(x=>x.kind===kind))safe.push({kind,value});
  }
  return safe.slice(0,5);
}

/**
 * An ephemeral VIEW of state for one turn. Never mutate the real dialogue state
 * or save this projection back to the profile after opt-out. Current dialogue
 * choices override saved defaults unless the visitor explicitly changed mind.
 */
export function applyAgentMemoryForTurn(previous,memory) {
  if(!previous || typeof previous!=="object" || !Array.isArray(memory) || !memory.length)
    return previous;
  const approved=approvedMemoryForLocalPrompt(memory);
  const get=kind=>approved.find(item=>item.kind===kind)?.value;
  const address=get("communication_style"),brevity=get("response_length"),
    avoid=get("avoid_format");
  const state={...previous};
  if(previous.address==="neutral" && (address==="formal"||address==="informal"))
    state.address=address;
  if(previous.brevity==="normal" && (brevity==="short"||brevity==="detailed"))
    state.brevity=brevity;
  if(FORMATS.has(avoid))
    state.excluded=[...new Set([...(Array.isArray(previous.excluded)?previous.excluded:[]),avoid])];
  return state;
}
