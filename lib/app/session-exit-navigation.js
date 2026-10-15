// Browser-only, same-tab continuation after explicit session Save confirmation.
// This contains a public first-party destination, never a client selector,
// bearer fragment, invitation token, medical record ID or health content.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const TTL=15*60*1000
const prefix='hh:confirmed-session-next:'

export function safeSessionExitTarget(input,origin,currentUrl=null) {
  try {
    const base=new URL(origin)
    const target=new URL(input,base)
    if(base.protocol!=='https:' && base.hostname!=='localhost') return null
    if(target.origin!==base.origin || !['https:','http:'].includes(target.protocol)) return null
    const path=target.pathname
    // This flow is only for public site sections and the separately signed-in
    // /app/ Cabinet. Never persist private links, service endpoints, admin tools.
    if(path!=='/' && !/^\/(?:en|ru|es)(?:\/|$)/.test(path))return null
    if(/^\/(?:en|ru|es)\/(?:client|admin|api|prescriptions|report)(?:\/|$)/.test(path) ||
       path.includes('%') || path.includes('\\') || path.includes('//'))return null
    if(currentUrl){
      const current=new URL(currentUrl,base)
      if(current.pathname===path && current.search===target.search) return null
    }
    // The first-party path is sufficient to preserve the choice. Drop search,
    // which can carry tests, patient input or external redirect parameters.
    // Preserve only an established, non-sensitive Cabinet anchor.
    const anchor=path.endsWith('/app/portrait') &&
      target.hash==='#personal-reports' ? '#personal-reports' : ''
    return path+anchor
  }catch{return null}
}
// A link to the separately protected legacy Client Cabinet should still
// offer the Save dialog, but its private selector must never be persisted.
// Declining keeps the original link; saving continues to My Reports instead.
export function sessionExitActionTarget(input,origin,currentUrl=null) {
  const publicTarget=safeSessionExitTarget(input,origin,currentUrl)
  if(publicTarget)return {afterSave:publicTarget,withoutSave:publicTarget}
  try{
    const u=new URL(input,origin),base=new URL(origin)
    if(u.origin!==base.origin)return null
    const match=/^\/(en|ru)\/client\/([A-Za-z0-9_-]{22})(?:\/.*)?$/.exec(u.pathname)
    if(!match || (currentUrl&&new URL(currentUrl,base).pathname===u.pathname))return null
    return {afterSave:'/'+match[1]+'/app/portrait#personal-reports',
      withoutSave:u.href}
  }catch{return null}
}
export function rememberSessionSaveTarget(intentId,target,origin,store) {
  if(!uuid.test(intentId||'')||!store)return false
  const safe=safeSessionExitTarget(target,origin)
  if(!safe)return false
  try {
    store.setItem(prefix+intentId,JSON.stringify({target:safe,createdAt:Date.now()}))
    return true
  }catch{return false}
}
export function consumeSessionSaveTarget(intentId,locale,origin,store) {
  if(!uuid.test(intentId||'')||!store)return null
  const key=prefix+intentId
  let raw
  try {raw=store.getItem(key);store.removeItem(key)}catch{return null}
  if(!raw)return null
  try {
    const data=JSON.parse(raw)
    if(!Number.isFinite(data.createdAt)||Date.now()<data.createdAt-TTL||
      Date.now()-data.createdAt>TTL) return null
    const safe=safeSessionExitTarget(data.target,origin)
    if(!safe)return null
    // Language switching and the site root remain valid first-party sections.
    // Never allow a client/admin/API URL, even if storage was tampered with.
    if(safe!=='/' && !/^\/(?:en|ru|es)(?:\/|$)/.test(safe))return null
    return safe
  }catch{return null}
}
