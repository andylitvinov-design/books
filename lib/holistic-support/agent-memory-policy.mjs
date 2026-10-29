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

/**
 * A user may directly request a memory in normal speech. This function only
 * PROPOSES one well-defined preference; saving always needs an explicit click
 * and server-side memory consent. Never auto-extract health details or free text.
 */
export function proposeAgentMemoryPreference(message) {
  if(typeof message!=="string" || message.length>600)return null;
  const phrase=message.trim().replace(/\s+/g," ");
  const lower=phrase.toLocaleLowerCase();
  if(/^(?:не запоминай|не сохраняй|don't remember|do not remember|no recuerdes)/iu.test(lower))
    return null;
  if(!/(?:запомни|сохрани(?:\s+в\s+памяти)?|remember(?:\s+that)?|guarda\s+(?:en\s+)?memoria|recuerda\s+que)/iu.test(lower))
    return null;
  const name=phrase.match(/(?:меня\s+зовут|зови\s+меня|call\s+me|my\s+name\s+is|me\s+llamo|ll[aá]mame)\s+([^.,!?;]+)/iu)?.[1]
    ?.split(/\s+(?:и|а|но|and|but|y|pero)\s+/iu)[0]?.trim();
  if(name){
    const value=validateMemoryPreference("preferred_name",name);
    return value?{kind:"preferred_name",value}:null;
  }
  const style=/на\s+ты|общайся\s+на\s+ты|informally|informal\s+address|tut[eé]ame/iu.test(lower)
    ?"informal":/на\s+вы|общайся\s+на\s+вы|formally|formal\s+address|usted/iu.test(lower)
      ?"formal":null;
  if(style)return {kind:"communication_style",value:style};
  const size=/коротк|кратк|покороче|brief|short(?:er)?\s+(?:repl|answer)|respuestas?\s+breves?/iu.test(lower)
    ?"short":/подробн|детальн|in detail|detailed|con\s+detalle/iu.test(lower)
      ?"detailed":null;
  if(size)return {kind:"response_length",value:size};
  const formats=[
    ["video",/без\s+видео|не\s+предлагай\s+видео|no\s+videos?|without\s+video|sin\s+v[ií]deo/iu],
    ["audio",/без\s+аудио|не\s+предлагай\s+аудио|no\s+audio|without\s+audio|sin\s+audio/iu],
    ["test",/без\s+тест|не\s+предлагай\s+тест|no\s+tests?|without\s+tests?|sin\s+test/iu],
    ["course",/без\s+курс|не\s+предлагай\s+курс|no\s+courses?|without\s+courses?|sin\s+curso/iu],
    ["service",/без\s+сесси|не\s+предлагай\s+сесси|no\s+sessions?|without\s+sessions?|sin\s+sesi[oó]n/iu],
  ];
  const found=formats.find(([,re])=>re.test(lower));
  return found?{kind:"avoid_format",value:found[0]}:null;
}
