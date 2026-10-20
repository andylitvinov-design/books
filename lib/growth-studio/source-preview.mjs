// Owner-requested preview of a verified, publicly accessible page.
// Never imports client data, follows redirects, translates, saves, or publishes.
// This is a metadata-only editorial aid, NOT a scraper of private reports.
import {normalizePublicSource,GrowthStudioError} from './model.mjs'

const MAX_HEAD_BYTES = 96 * 1024
const SOURCE_TIMEOUT_MS = 7000
const ALLOWED_KEYS = new Set(['brand','sourceUrl'])
const LANGUAGES = new Set(['en','ru','es'])
const fail = code => new GrowthStudioError(code)

export function cleanGrowthSourceText(value, max=450) {
  if (typeof value !== 'string') return ''
  const decoded = value.replace(/&#(?:x([0-9a-f]{1,6})|([0-9]{1,7}));|&([a-z]{2,12});/gi,
    (original,hex,dec,name) => {
      if (hex || dec) {
        const cp=parseInt(hex||dec,hex?16:10)
        if(cp>=32 && cp<=0x10ffff && !(cp>=0xd800&&cp<=0xdfff))
          return String.fromCodePoint(cp)
        return ' '
      }
      const replacements={
        amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',mdash:'—',ndash:'–',
        hellip:'…',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”',bull:'•',
      }
      return replacements[name.toLowerCase()] ?? original
    })
  return decoded.replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g,' ')
    .replace(/\s+/g,' ').trim().slice(0,max)
}
function attrs(tag) {
  const record=Object.create(null)
  const pattern=/([a-z][a-z0-9_:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gi
  for(const match of tag.matchAll(pattern))record[match[1].toLowerCase()]=match[2]??match[3]??match[4]??''
  return record
}
export function parsePublicGrowthHead(html,sourceUrl) {
  if(typeof html!=='string'||html.length>MAX_HEAD_BYTES||!/^\s*(?:<!doctype\b[^>]*>)?\s*<html\b/i.test(html))
    throw fail('source_invalid_html')
  const end=html.search(/<\/head\s*>/i)
  if(end<0)throw fail('source_invalid_html')
  const content=html.slice(0,end)
  const found=Object.create(null)
  for(const match of content.matchAll(/<meta\b[^>]*>/gi)) {
    const a=attrs(match[0])
    const key=(a.property||a.name||'').toLowerCase()
    if(key && typeof a.content==='string' && !Object.hasOwn(found,key))found[key]=a.content
  }
  if (/\bnoindex\b/i.test([found.robots,found.googlebot,found.bingbot].join(' ')))
    throw fail('source_not_public')
  const tag=content.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)
  const rawTitle=found['og:title']||found['twitter:title']||tag?.[1]||''
  const rawDescription=found['og:description']||found['twitter:description']||found.description||''
  const title=cleanGrowthSourceText(rawTitle,120)
  const description=cleanGrowthSourceText(rawDescription,450)
  if(!title && !description)throw fail('source_missing_metadata')
  const htmlTag=content.match(/<html\b[^>]*>/i)
  const rawLang=attrs(htmlTag?.[0]||'').lang?.toLowerCase().split('-')[0]||''
  const pathLang=new URL(sourceUrl).pathname.match(/^\/(en|ru|es)(?:\/|$)/)?.[1]||''
  return {
    sourceUrl,
    title:title||description.slice(0,120),
    description,
    language:LANGUAGES.has(rawLang)?rawLang:LANGUAGES.has(pathLang)?pathLang:null,
    requiresReview:true,
    // Intentionally omit og:image: a public image tag is not proof of license
    // or that the image asset is fit for each social network.
  }
}
async function readBoundedPublicHead(response) {
  const reader=response.body?.getReader?.()
  if(!reader)throw fail('source_unavailable')
  const decoder=new TextDecoder('utf-8',{fatal:false})
  let html='',bytes=0,ended=false
  try {
    while(true){
      const next=await reader.read()
      if(next.done)break
      if(!(next.value instanceof Uint8Array))throw fail('source_invalid_html')
      const room=MAX_HEAD_BYTES-bytes
      if(room<=0)throw fail('source_too_large')
      const chunk=next.value.subarray(0,room)
      html+=decoder.decode(chunk,{stream:true})
      bytes+=chunk.byteLength
      const end=html.search(/<\/head\s*>/i)
      if(end>=0){html=html.slice(0,end+7);ended=true;break}
      if(next.value.byteLength>room || bytes>=MAX_HEAD_BYTES)throw fail('source_too_large')
    }
    if(!ended)throw fail('source_invalid_html')
    return html
  }finally{
    await reader.cancel().catch(()=>{})
  }
}
export async function previewPublicGrowthSource(input,{fetchFn=fetch,timeoutMs=SOURCE_TIMEOUT_MS}={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).some(key=>!ALLOWED_KEYS.has(key)) ||
      typeof input.brand!=='string'||typeof input.sourceUrl!=='string')
    throw fail('invalid_source')
  let sourceUrl
  try {sourceUrl=normalizePublicSource(input.sourceUrl,input.brand)}
  catch {throw fail('invalid_source')}
  if(!sourceUrl)throw fail('invalid_source')
  if(!Number.isFinite(timeoutMs)||timeoutMs<500||timeoutMs>15000)throw fail('invalid_source')
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),timeoutMs)
  try{
    const response=await fetchFn(sourceUrl,{
      method:'GET',headers:{Accept:'text/html'},credentials:'omit',
      redirect:'manual',cache:'no-store',referrerPolicy:'no-referrer',
      signal:controller.signal,
    })
    if(!response?.ok || response.status!==200)throw fail('source_not_public')
    const type=response.headers?.get?.('content-type')||''
    if(!/^text\/html(?:\s*;|$)|^application\/xhtml\+xml(?:\s*;|$)/i.test(type.trim()))
      throw fail('source_not_html')
    const robots=response.headers?.get?.('x-robots-tag')||''
    if(/\bnoindex\b/i.test(robots))throw fail('source_not_public')
    const html=await readBoundedPublicHead(response)
    return parsePublicGrowthHead(html,sourceUrl)
  }catch(error){
    if(error instanceof GrowthStudioError)throw error
    // Errors must not reveal upstream HTTP bodies, internal endpoints or headers.
    throw fail('source_unavailable')
  }finally{
    clearTimeout(timer)
  }
}
