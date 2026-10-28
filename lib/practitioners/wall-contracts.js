import {AppError} from '../assessments/contracts.js'
import {normalizeVideoPresentation} from './presentation-contract.js'

const fail=()=>{throw new AppError('INVALID_WALL_MEDIA',400)}
const allowedTypes=new Set(['image','audio','video'])
const mediaExtensions={image:/\.(jpe?g|png|webp)(?:$)/i,audio:/\.(mp3|m4a|aac|ogg|oga|wav)(?:$)/i,video:/\.(mp4|webm|mov)(?:$)/i}

// Never fetch arbitrary third-party URLs from our backend. Embed only public
// video hosts or directly playable HTTPS media on public, DNS-based hosts.
export function normalizeWallExternalUrl(raw,type){
 if(typeof raw!=='string'||raw.length>900||!['image','audio','video'].includes(type))fail()
 if(type==='video'){
  try{return normalizeVideoPresentation({kind:'external',url:raw})?.url||fail()}
  catch(error){if(error?.code!=='INVALID_PRESENTATION_VIDEO')throw error}
 }
 let parsed
 try{parsed=new URL(raw.trim())}catch{fail()}
 const host=parsed.hostname.toLowerCase()
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||!host.includes('.')||
    host.includes(':')||/^\d+(?:\.\d+){3}$/.test(host)||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)||
    /[\\\s\u0000-\u001f]/.test(raw)||!mediaExtensions[type].test(parsed.pathname))fail()
 return parsed.href
}

export function normalizeWallMedia(raw){
 if(raw==null)return []
 if(!Array.isArray(raw)||raw.length>4)fail()
 return raw.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))fail()
  const keys=Object.keys(item)
  if(keys.some(k=>!['source','type','assetId','url'].includes(k)))fail()
  if(!allowedTypes.has(item.type))fail()
  // Uploaded/private assets require an owner-scoped publishing pipeline and
  // explicit public-media copy verification. Do not trust arbitrary UUIDs here.
  if(item.source==='upload')fail()
  if(item.source==='external'&&['image','audio','video'].includes(item.type)){
   if(keys.some(k=>!['source','type','url'].includes(k)))fail()
   return {source:'external',type:item.type,url:normalizeWallExternalUrl(item.url,item.type)}
  }
  fail()
 })
}

export function wallPostDraft({locale='en',body='',media=[]}={}){
 const value=String(body).trim().slice(0,2000)
 const first=(value.split(/\r?\n/).find(Boolean)||'').trim()
 return {kind:'post',locale,title:(first||'Media update').slice(0,160),
  excerpt:(value||'Media update').slice(0,500),body:value,media}
}
