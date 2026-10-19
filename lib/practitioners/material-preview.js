import {normalizeVideoPresentation} from './presentation-contract.js'

// Reuse the same allowlist and canonical URL contract as saved practitioner
// videos. Never turn an arbitrary URL or a private client media link into a
// browser navigation or remote poster request.
export function safeMaterialVideoUrl(value){
  if(typeof value!=='string'||value.length>500)return ''
  try{return normalizeVideoPresentation({kind:'external',url:value.trim()})?.url||''}
  catch{return ''}
}

export function youtubePreviewId(value){
  const canonical=safeMaterialVideoUrl(value)
  if(!canonical||!canonical.startsWith('https://www.youtube.com/watch?v='))return ''
  const id=new URL(canonical).searchParams.get('v')||''
  return /^[A-Za-z0-9_-]{11}$/.test(id)?id:''
}
