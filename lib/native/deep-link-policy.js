const publicHosts = new Set(['codex-public-book-library.vercel.app', 'holistichouse.vercel.app'])
const publicRemedyPattern = /^\/(ru|en)\/homeopathy\/remedies\/([a-z0-9-]+)\/?$/
const privatePattern = /^\/(ru|en)\/(prescriptions|client)\//

/**
 * Maps only public remedy URLs into an in-app route. Private prescription
 * links deliberately never receive an in-app/native route.
 */
export function classifyNativeLink(rawUrl) {
  let url
  try { url = new URL(rawUrl) } catch { return { kind: 'invalid' } }

  const isPsiAlchemyScheme = url.protocol === 'psialchemy:'
  const isPublicWebUrl = url.protocol === 'https:' && publicHosts.has(url.host)
  if (!isPsiAlchemyScheme && !isPublicWebUrl) return { kind: 'external', url: url.toString() }

  const pathname = isPsiAlchemyScheme
    ? `/${[url.hostname, ...url.pathname.split('/').filter(Boolean)].filter(Boolean).join('/')}`
    : url.pathname
  if (privatePattern.test(pathname)) return { kind: 'private-blocked' }
  const match = pathname.match(publicRemedyPattern)
  if (!match) return { kind: 'unsupported' }
  return { kind: 'public-remedy', path: `/${match[1]}/homeopathy/remedies/${match[2]}` }
}

const hhRequestId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
/** Only a known, owner-checked Cabinet thread may be routed from a native
 * notification or universal link. The URL is navigation, never authorization. */
export function classifyHolisticHouseNativeLink(rawUrl) {
  let url
  try { url=new URL(rawUrl) } catch { return {kind:'invalid'} }
  let locale,requestId
  if(url.protocol==='holistichouse:' && url.hostname==='app' && url.pathname==='/consultations'){
    if([...url.searchParams.keys()].some(key=>!['request','lang'].includes(key)))return {kind:'unsupported'}
    locale=url.searchParams.get('lang')==='ru'?'ru':'en'
    requestId=url.searchParams.get('request')
  }else if(url.protocol==='https:' && url.hostname==='holistichouse.vercel.app' &&
      /^\/(en|ru)\/app\/consultations$/.test(url.pathname)){
    if([...url.searchParams.keys()].some(key=>key!=='request'))return {kind:'unsupported'}
    locale=url.pathname.split('/')[1]
    requestId=url.searchParams.get('request')
  }else return {kind:'unsupported'}
  if(!hhRequestId.test(requestId||''))return {kind:'unsupported'}
  return {kind:'hh-consultation',path:'/'+locale+'/app/consultations?request='+requestId.toLowerCase()}
}

/** Accept only our app's OAuth return, never remote/open redirect URLs.
 * PKCE verifier stays in the WebView HttpOnly cookie. The code is exchanged
 * on the existing same-origin SSR callback, not inside the system browser. */
export function classifyHolisticHouseNativeAuth(rawUrl) {
  let url
  try { url = new URL(rawUrl) } catch { return { kind: 'invalid' } }
  if(url.protocol!=='holistichouse:'||url.hostname!=='auth'||url.pathname!=='/callback'||
    url.hash||url.username||url.password) return {kind:'unsupported'}
  const allowed=new Set(['code','error','locale','intent','service','continue','program','request','sb_flow_id'])
  if([...url.searchParams.keys()].some(k=>!allowed.has(k)||
    url.searchParams.getAll(k).length!==1)) return {kind:'unsupported'}
  const code=url.searchParams.get('code')
  const error=url.searchParams.get('error')
  if((!code&&!error)|| (code&&error) || (code && (code.length>4096||/[\\u0000-\\u001f]/.test(code))))
    return {kind:'unsupported'}
  const path=new URL('/api/app/auth/callback','https://holistichouse.vercel.app')
  for(const key of allowed) {
    if(key==='error')continue
    const val=url.searchParams.get(key)
    if(val!==null) path.searchParams.set(key,val)
  }
  if(error)path.searchParams.set('error','cancelled')
  return {kind:'hh-auth',path:path.pathname+path.search}
}
