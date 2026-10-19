import { sanitizePathname } from './isolated-browser-diagnostics.mjs'
const PATHS = new Set(['/api/app/test-ratings', '/api/app/guest/test-ratings', '/api/app/test-ratings/[definition]', '/api/app/guest/test-ratings/[definition]'])
export function ratingsFailureCategory(raw) {
 const text=String(raw || '')
 if(/access control|cors|security|content security policy|blocked by.*policy/i.test(text))return 'access-control-or-security'
 if(/cancel|abort/i.test(text))return 'cancelled'
 if(/timed? ?out/i.test(text))return 'timeout'
 return 'other'
}
export function ratingsPath(raw,origin) {
 try {
  const u=new URL(raw,origin);if(u.origin!==origin||u.username||u.password)return null
  const match=u.pathname.match(/^(\/api\/app\/(?:guest\/)?test-ratings)(?:\/([a-z0-9][a-z0-9._-]{0,99}))?$/i)
  return match?match[1]+(match[2]?'/[definition]':''):null
 } catch{return null}
}
export function ratingsErrorEndpoint(raw,origin) {
 for(const candidate of String(raw||'').slice(0,8192).match(/https?:\/\/[^\s)'"<>]+/g)||[]) {
  const endpoint=ratingsPath(candidate,origin);if(endpoint)return endpoint
 }
 return null
}
// Browser-side document identities are exact for these window events. They are
// deliberately not advertised as exact request ownership: Playwright Request
// exposes a Frame, not the originating Document/ExecutionContext identifier.
export function ratingsDocumentObserver() {
 const safe=callback=>(...args)=>{try{callback(...args)}catch{}}
 const token=crypto.randomUUID()
 const emit=(kind,extra={})=>{
  try { Promise.resolve(window.__hhRatingsSource({kind,documentToken:token,at:Date.now(),pagePath:location.pathname,...extra})).catch(()=>{}) }catch{}
 }
 emit('document-init')
 for(const kind of ['beforeunload','pagehide','pageshow','DOMContentLoaded'])addEventListener(kind,safe(()=>emit(kind)),{capture:true,passive:true})
 globalThis.navigation?.addEventListener('navigate',safe(event=>{
  let path=null
  try{const u=new URL(event.destination.url);if(u.origin===location.origin)path=u.pathname}catch{}
  emit('navigate',{destinationPath:path,navigationType:event.navigationType,sameDocument:event.destination?.sameDocument===true})
 }))
 const error=(kind,value)=>{
  const message=typeof value==='string'?value:String(value?.message||'')
  let endpoint=null
  for(const candidate of message.slice(0,8192).match(/https?:\/\/[^\s)'"<>]+/g)||[]) {
   try {const u=new URL(candidate);if(u.origin!==location.origin||u.username||u.password)continue
    const match=u.pathname.match(/^(\/api\/app\/(?:guest\/)?test-ratings)(?:\/([a-z0-9][a-z0-9._-]{0,99}))?$/i)
    if(match){endpoint=match[1]+(match[2]?'/[definition]':'');break}
   }catch{}
  }
  if(!endpoint)return
  emit(kind,{endpoint,category:/access control|cors|security/i.test(message)?'access-control-or-security':/cancel|abort/i.test(message)?'cancelled':'other'})
 }
 addEventListener('error',safe(event=>error('window-error',event.message)),{capture:true,passive:true})
 addEventListener('unhandledrejection',safe(event=>error('window-rejection',event.reason)),{capture:true,passive:true})
}

export async function installRatingsRequestDiagnostics(context,origin,log,{limit=2000}={}) {
 if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))throw new Error('Isolated diagnostics origin required')
 const listen=(target,event,callback)=>target.on(event,(...args)=>{try{callback(...args)}catch{}})
 const pages=new WeakMap(), requests=new WeakMap()
 let nextPage=0,nextRequest=0,count=0,dropped=0
 const emit=event=>{
  if(count>=limit){if(!dropped++){try{log({kind:'limit-reached',limit})}catch{}}return}
  count++;try{log({...event,receivedAt:Date.now()})}catch{}
 }
 const pageState=page=>{
  if(!pages.has(page))pages.set(page,{pageId:++nextPage,documentCandidate:null,navigationId:0})
  return pages.get(page)
 }
 const stateFor=request=>{
  try {const frame=request.frame(),page=frame.page();if(frame!==page.mainFrame())return null;return {page,...pageState(page)}}catch{return null}
 }
 const attach=page=>{
  pageState(page)
  listen(page,'framenavigated',frame=>{
   if(frame!==page.mainFrame())return
   const state=pageState(page)
   emit({kind:'main-frame-commit',pageId:state.pageId,navigationId:state.navigationId,documentCandidate:state.documentCandidate,pagePath:sanitizePathname(frame.url(),origin),attribution:'frame-current-candidate-only'})
  })
  listen(page,'pageerror',error=>{
   // Keep the original verifier error listener/gate untouched. This is additive.
   const endpoint=ratingsErrorEndpoint(error.message,origin)
   if(!endpoint)return
   const state=pageState(page)
   emit({kind:'pageerror',pageId:state.pageId,navigationId:state.navigationId,documentCandidate:state.documentCandidate,pagePath:sanitizePathname(page.url(),origin),endpoint,category:ratingsFailureCategory(error.message),attribution:'source-page-exact-document-unproven'})
  })
 }
 listen(context,'page',attach)
 for(const page of context.pages())attach(page)
 await context.exposeBinding('__hhRatingsSource',(source,data)=>{try{
  if(!source.page||source.frame!==source.page.mainFrame()||!data||!/^[a-f0-9-]{36}$/i.test(data.documentToken||''))return
  const kinds=['document-init','beforeunload','pagehide','pageshow','DOMContentLoaded','navigate','window-error','window-rejection']
  if(!kinds.includes(data.kind)||!Number.isFinite(data.at))return
  const state=pageState(source.page)
  if(data.kind==='document-init')state.documentCandidate=data.documentToken
  const event={kind:data.kind,pageId:state.pageId,documentToken:data.documentToken,at:data.at,pagePath:sanitizePathname(data.pagePath,origin),navigationId:state.navigationId,attribution:'source-window-exact'}
  if(data.kind==='navigate'){
   event.destinationPath=typeof data.destinationPath==='string'?sanitizePathname(data.destinationPath,origin):null
   event.navigationType=['push','replace','traverse','reload'].includes(data.navigationType)?data.navigationType:'unknown'
   event.sameDocument=data.sameDocument===true
  }
  if(data.kind.startsWith('window-')){
   if(!PATHS.has(data.endpoint))return
   event.endpoint=data.endpoint
   event.category=['access-control-or-security','cancelled','other'].includes(data.category)?data.category:'other'
  }
  emit(event)
 }catch{}})
 await context.addInitScript(ratingsDocumentObserver)
 listen(context,'request',request=>{
  const state=stateFor(request);if(!state)return
  if(request.isNavigationRequest()){
   const live=pageState(state.page);live.navigationId++
   emit({kind:'document-request',pageId:state.pageId,navigationId:live.navigationId,outgoingDocumentCandidate:state.documentCandidate,destinationPath:sanitizePathname(request.url(),origin),attribution:'frame-current-candidate-only'})
  }
  const endpoint=ratingsPath(request.url(),origin);if(!endpoint)return
  const record={requestId:++nextRequest,pageId:state.pageId,navigationId:pageState(state.page).navigationId,sourceDocumentCandidate:state.documentCandidate,endpoint,method:['GET','POST'].includes(request.method())?request.method():'other',startedAt:Date.now(),attribution:'source-frame-exact-document-unproven'}
  requests.set(request,record);emit({kind:'ratings-request',...record})
 })
 listen(context,'response',response=>{
  const record=requests.get(response.request());if(record)emit({kind:'ratings-response',...record,status:response.status(),elapsedMs:Date.now()-record.startedAt})
 })
 listen(context,'requestfailed',request=>{
  const record=requests.get(request);if(record)emit({kind:'ratings-failed',...record,category:ratingsFailureCategory(request.failure()?.errorText),elapsedMs:Date.now()-record.startedAt})
 })
 listen(context,'requestfinished',request=>{
  const record=requests.get(request);if(record)emit({kind:'ratings-finished',...record,elapsedMs:Date.now()-record.startedAt})
 })
}
