// One shared public/mobile-app destination map. Routing is presentation-only;
// account authorization remains enforced by existing Cabinet/Practice endpoints.
export const UNIFIED_DOCK_IDS=Object.freeze(["mytube","video","ai","practice","master","profile"]);
const LOCALES=new Set(["ru","en","es"]);
export function isUnifiedMobileDockPath(pathname=""){
  return /^\/(?:ru|en|es)\/(?:mytube|practice|temple-insights|holistic-support\/(?:mobile|mandala))(?:\/|$)/.test(pathname)
    || /^\/(?:ru|en|es)\/app\/?$/.test(pathname)
    || /^\/(?:ru|en|es)\/app\/(?:messages|portrait|practice|settings|consultations|courses|my-course|materials)(?:\/|$)/.test(pathname);
}
export function unifiedMobileDockActive(pathname="",hash=""){
  if(/^\/(?:ru|en|es)\/mytube(?:\/|$)/.test(pathname))return "mytube";
  if(/^\/(?:ru|en|es)\/holistic-support\/mandala(?:\/|$)/.test(pathname))
    return hash==="#video-director-chat"?"ai":"video";
  if(/^\/(?:ru|en|es)\/(?:holistic-support\/mobile|temple-insights)(?:\/|$)/.test(pathname))return "practice";
  if(/^\/(?:ru|en|es)\/(?:practice|app\/practice)(?:\/|$)/.test(pathname))return "master";
  if(/^\/(?:ru|en|es)\/app\/messages(?:\/|$)/.test(pathname))return "ai";
  if(/^\/(?:ru|en|es)\/app(?:\/|$)/.test(pathname))return "profile";
  return null;
}
export function unifiedMobileDockHref(locale,id){
  if(!LOCALES.has(locale)||!UNIFIED_DOCK_IDS.includes(id))return null;
  const prefix="/"+locale;
  switch(id){
    case "mytube": return prefix+"/mytube";
    case "video": return prefix+"/holistic-support/mandala";
    case "ai": return prefix+"/holistic-support/mandala#video-director-chat";
    case "practice": return prefix+"/holistic-support/mobile";
    case "master": return prefix+"/practice";
    case "profile": return "/"+(locale==="es"?"en":locale)+"/app/portrait";
    default: return null;
  }
}
