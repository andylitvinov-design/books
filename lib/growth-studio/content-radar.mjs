// Owner-invoked, first-party sitemap -> reviewed editorial draft suggestions.
// No cron, social API calls, client data, background scraper, automatic approval
// or posting. We only read the configured Holistic House public sitemap.
import {createHash} from 'node:crypto'
import {GrowthStudioError,normalizePublicSource} from './model.mjs'
import {previewPublicGrowthSource} from './source-preview.mjs'
import {prepareGrowthBulk} from './bulk.mjs'

const ORIGIN='https://holistichouse.vercel.app'
const SITEMAP=ORIGIN+'/sitemap.xml'
const MAX_BYTES=850_000
const MAX_ITEMS=12
const TIMEOUT_MS=10_000
const LANGUAGES=new Set(['en','ru','es'])
const CHANNELS=new Set(['manual','facebook','instagram','telegram','linkedin','threads','bluesky'])
// Only public editorial categories with predictable routes. Never use the
// site's private tests, reports, account, client, payment or profile pages.
const VISIBLE=/^\/(en|ru|es)\/(?:academy(?:\/[a-z0-9][a-z0-9-]*){0,4}|articles\/[a-z0-9][a-z0-9-]*|events(?:\/[a-z0-9][a-z0-9-]*)?|services\/(?:free-situation-review|alchemy-of-soul|imagery-therapy|systemic-constellations|business-consulting|hypnotherapy-course|dao-health-profile))\/?$/
const blocked=()=>new GrowthStudioError('radar_unavailable')
const invalid=()=>new GrowthStudioError('invalid_source')

export function normalizeGrowthRadarUrl(value,locale) {
  if(!LANGUAGES.has(locale)||typeof value!=='string'||value.length>300)throw invalid()
  let url
  try {url=normalizePublicSource(value,'holistic_house')}
  catch {throw invalid()}
  if(!url||!url.startsWith(ORIGIN+'/'))throw invalid()
  const path=new URL(url).pathname
  if(!VISIBLE.test(path)||!path.startsWith('/'+locale+'/'))throw invalid()
  return url
}

export function parseGrowthRadarSitemap(xml,{locale='en',existingSourceUrls=[]}={}) {
  if(!LANGUAGES.has(locale)||typeof xml!=='string'||xml.length>MAX_BYTES||
    !/^\s*<\?xml\b[^>]*\?>\s*<urlset\b/i.test(xml) ||
    !/<\/urlset\s*>\s*$/.test(xml) ||
    !Array.isArray(existingSourceUrls)||existingSourceUrls.length>1500)
    throw blocked()
  const known=new Set(existingSourceUrls.filter(v=>typeof v==='string'&&v.startsWith(ORIGIN+'/')))
  const candidates=new Map()
  let scanned=0
  for (const found of xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url\s*>/gi)) {
    scanned++
    if(scanned>7000)throw blocked()
    const body=found[1]
    if(body.length>4500)continue
    const loc=body.match(/<loc>\s*([^<&"']+?)\s*<\/loc\s*>/i)?.[1]?.trim()
    if(!loc)continue
    let url
    try {url=normalizeGrowthRadarUrl(loc,locale)}
    catch {continue}
    if(candidates.has(url))continue
    const value=body.match(/<lastmod>\s*([^<]{1,40})\s*<\/lastmod\s*>/i)?.[1]?.trim()||''
    const date=Date.parse(value)
    // This is merely the site's advertised lastmod, NOT proof of freshness.
    const lastmod=Number.isFinite(date)&&date>0&&date<=Date.now()+86400_000?
      new Date(date).toISOString():null
    candidates.set(url,{
      sourceUrl:url,locale,hasDraft:known.has(url),lastmod,
    })
  }
  return [...candidates.values()].sort((a,b)=>
    Number(a.hasDraft)-Number(b.hasDraft)||
    (b.lastmod||'').localeCompare(a.lastmod||'')||
    a.sourceUrl.localeCompare(b.sourceUrl)).slice(0,MAX_ITEMS)
}

async function boundedSitemap(fetchFn) {
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),TIMEOUT_MS)
  try {
    const res=await fetchFn(SITEMAP,{
      method:'GET',headers:{Accept:'application/xml,text/xml'},
      cache:'no-store',credentials:'omit',redirect:'error',
      referrerPolicy:'no-referrer',signal:controller.signal,
    })
    if(!res||res.status!==200||!res.ok)throw blocked()
    const type=res.headers?.get?.('content-type')||''
    if(!/^(?:application|text)\/xml\b/i.test(type))throw blocked()
    const reader=res.body?.getReader?.()
    if(!reader)throw blocked()
    const chunks=[]
    let bytes=0
    try {
      for(;;){
        const result=await reader.read()
        if(result.done)break
        const chunk=result.value
        if(!(chunk instanceof Uint8Array))throw blocked()
        bytes+=chunk.byteLength
        if(bytes>MAX_BYTES)throw blocked()
        chunks.push(chunk)
      }
    } finally {
      await reader.cancel().catch(()=>{})
    }
    const buffer=new Uint8Array(bytes)
    let offset=0
    for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length}
    return new TextDecoder('utf-8',{fatal:true}).decode(buffer)
  }catch{throw blocked()}
  finally {clearTimeout(timeout)}
}

export async function scanGrowthPublicRadar({locale='en',existingSourceUrls=[]}={},
  {fetchFn=fetch}={}) {
  if(!LANGUAGES.has(locale))throw invalid()
  const xml=await boundedSitemap(fetchFn)
  return parseGrowthRadarSitemap(xml,{locale,existingSourceUrls})
}

// Deterministic ID per canonical page, locale and channel. The same owner
// request cannot create more than one initial radar draft, even after reload.
export function radarBatchId(sourceUrl,channel) {
  const hash=createHash('sha256').update('HH-CONTENT-RADAR-v1\0'+sourceUrl+'\0'+channel).digest('hex')
  return hash.slice(0,8)+'-'+hash.slice(8,12)+'-4'+hash.slice(13,16)+'-a'+hash.slice(17,20)+'-'+hash.slice(20,32)
}

export async function createGrowthRadarDraft({sourceUrl,locale,channel='manual'}={},
  {store,fetchFn=fetch,now=new Date()}={}) {
  const url=normalizeGrowthRadarUrl(sourceUrl,locale)
  if(!CHANNELS.has(channel)||!store||typeof store.get!=='function'||
     typeof store.batchCreate!=='function')throw invalid()
  const candidates=await scanGrowthPublicRadar({locale},{fetchFn})
  if(!candidates.some(row=>row.sourceUrl===url))throw invalid()
  // Existing safe metadata-only source reader independently checks HTTP 200,
  // redirect, noindex, bounded head and the exact allowed public origin.
  const preview=await previewPublicGrowthSource({brand:'holistic_house',sourceUrl:url},
    {fetchFn})
  if(preview.sourceUrl!==url||preview.language!==locale||
      preview.requiresReview!==true)throw invalid()
  const entries=[{
    brand:'holistic_house',channel,locale,
    title:preview.title,
    caption:preview.description||preview.title,
    sourceUrl:url,campaign:'hh_content_radar',
    scheduledAt:'',mediaUrl:'',mediaAlt:'',
  }]
  const [draft]=prepareGrowthBulk({batchId:radarBatchId(url,channel),entries},now)
  const previous=await store.get(draft.id)
  if(previous)return {record:previous,reused:true}
  try {
    await store.batchCreate([draft])
    return {record:draft,reused:false}
  } catch(error) {
    if(error?.code!=='conflict')throw error
    const recovered=await store.get(draft.id)
    if(recovered)return {record:recovered,reused:true}
    throw error
  }
}
