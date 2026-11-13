// One shared public/mobile-app destination map. Routing is presentation-only;
// account authorization remains enforced by existing Cabinet/Practice endpoints.
export const UNIFIED_DOCK_IDS=Object.freeze(["mytube","video","coach","ai","services","practice","profile"]);
const LOCALES=new Set(["ru","en","es"]);
// The installed homepage shares the application dock; the public website
// still renders the editorial seven-item nav outside standalone mode.
export function isUnifiedMobileDockHomePath(pathname=""){
  return pathname==="/" || /^\/(?:ru|en|es)\/?$/.test(pathname);
}
export function isUnifiedMobileDockPath(pathname=""){
  return isUnifiedMobileDockHomePath(pathname)
    || /^\/(?:ru|en|es)\/(?:masters|my-coach)\/?$/.test(pathname)
    || /^\/(?:ru|en|es)\/services(?:\/|$)/.test(pathname)
    || /^\/(?:ru|en|es)\/(?:mytube|practice|personality-profiles|temple-insights|holistic-support\/(?:mobile|mandala))(?:\/|$)/.test(pathname)
    || /^\/(?:ru|en|es)\/app\/?$/.test(pathname)
    || /^\/(?:ru|en|es)\/app\/(?:messages|portrait|practice|settings|consultations|courses|my-course|materials|portfolio|tests|history|results)(?:\/|$)/.test(pathname);
}
export function unifiedMobileDockActive(pathname="",hash=""){
  if(/^\/(?:ru|en|es)\/services(?:\/|$)/.test(pathname))return "services";
  if(/^\/(?:ru|en|es)\/my-coach\/?$/.test(pathname))return "coach";
  if(/^\/(?:ru|en|es)\/mytube(?:\/|$)/.test(pathname))return "mytube";
  if(/^\/(?:ru|en|es)\/holistic-support\/mandala(?:\/|$)/.test(pathname))
    return hash==="#video-director-chat"?"ai":"video";
  if(/^\/(?:ru|en|es)\/(?:holistic-support\/mobile|temple-insights)(?:\/|$)/.test(pathname))return "practice";
  // Work is now the second mode of Profile; the protected editor keeps its own route.
  if(/^\/(?:ru|en|es)\/practice(?:\/|$)/.test(pathname))return "profile";
  if(/^\/(?:ru|en|es)\/app\/practice(?:\/|$)/.test(pathname))return "practice";
  if(/^\/(?:ru|en|es)\/app\/messages(?:\/|$)/.test(pathname))return "ai";
  if(/^\/(?:ru|en|es)\/personality-profiles(?:\/|$)/.test(pathname))return "profile";
  if(/^\/(?:ru|en|es)\/app(?:\/|$)/.test(pathname))return "profile";
  return null;
}
export function unifiedMobileDockHref(locale,id){
  if(!LOCALES.has(locale)||!UNIFIED_DOCK_IDS.includes(id))return null;
  const prefix="/"+locale;
  switch(id){
    case "mytube": return prefix+"/mytube";
    case "video": return prefix+"/holistic-support/mandala";
    case "ai": return prefix+"/app/messages?section=ai";
    case "practice": return prefix+"/holistic-support/mobile";
    case "coach": return prefix+"/my-coach";
    case "profile": return "/"+(locale==="es"?"en":locale)+"/app/portrait";
    case "services": return prefix+"/services";
    default: return null;
  }
}
