// One-tab, explicitly submitted Home -> existing Ali conversation handoff.
// The message never enters a URL, analytics event or a second AI service.
export const HOME_INTENT_HANDOFF_KEY="hh:home-intent-handoff:v1";
const LOCALES=new Set(["ru","en","es"]);
export const HOME_INTENT_MAX_LENGTH=1600;
export const HOME_INTENT_TTL_MS=120000;
export function parseHomeIntentHandoff(raw,routeLocale,now=Date.now()){
  if(!LOCALES.has(routeLocale)||typeof raw!=="string"||raw.length>6000)return null;
  try{
    const value=JSON.parse(raw);
    if(!value||typeof value!=="object"||Array.isArray(value))return null;
    if(value.locale!==routeLocale||!["self","business"].includes(value.mode))return null;
    if(!Number.isFinite(value.at)||value.at>now+5000||now-value.at>HOME_INTENT_TTL_MS)return null;
    if(typeof value.text!=="string"||value.text.length>HOME_INTENT_MAX_LENGTH)return null;
    const text=value.text.trim();
    return text?{text,mode:value.mode,locale:routeLocale}:null;
  }catch{return null;}
}
