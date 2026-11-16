// One-use handoff from the public dialog-first Home to the existing AI Assistant.
// Never put user free text in a URL, analytics, localStorage, cookies or network calls.
export const HOME_AI_HANDOFF_KEY="hh:home-ali-handoff:v1";
export const HOME_AI_HANDOFF_MAX_AGE_MS=2*60*1000;
const LOCALES=new Set(["ru","en","es"]);
const MODES=new Set(["self","business"]);
export function encodeHomeAiHandoff({text,locale,mode="self",now=Date.now()}){
  if(typeof text!=="string"||!LOCALES.has(locale)||!MODES.has(mode))return null;
  const question=text.replace(/[\u0000-\u001f\u007f]/g," ").trim();
  if(question.length<1||question.length>1200||!Number.isFinite(now))return null;
  return JSON.stringify({v:1,text:question,locale,mode,createdAt:now});
}
export function parseHomeAiHandoff(raw,locale,now=Date.now()){
  if(typeof raw!=="string"||raw.length>1600||!LOCALES.has(locale))return null;
  let value;
  try{value=JSON.parse(raw)}catch{return null}
  if(value?.v!==1||value.locale!==locale||!MODES.has(value.mode)||
     !Number.isFinite(value.createdAt)||value.createdAt>now+5000||
     now-value.createdAt>HOME_AI_HANDOFF_MAX_AGE_MS)return null;
  const packed=encodeHomeAiHandoff({...value,now:value.createdAt});
  if(!packed)return null;
  const normalized=JSON.parse(packed);
  if(value.text!==normalized.text)return null;
  return {text:normalized.text,locale,mode:value.mode};
}
export function takeHomeAiHandoff(storage,locale,now=Date.now()){
  if(!storage)return null;
  let raw;
  try{raw=storage.getItem(HOME_AI_HANDOFF_KEY);storage.removeItem(HOME_AI_HANDOFF_KEY)}
  catch{return null}
  return parseHomeAiHandoff(raw,locale,now);
}
