// Explicit allowlist for educational video previews in the practitioner cabinet.
// Never use these URLs for private client media (which stays on authenticated routes).
const youtubeHosts=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'])
const shortHosts=new Set(['youtu.be','www.youtu.be'])
const vimeoHosts=new Set(['vimeo.com','www.vimeo.com','player.vimeo.com'])

function checkedVideoUrl(value){
  if(typeof value!=='string'||value.length>1500)return null
  try{
    const url=new URL(value.trim())
    const host=url.hostname.toLowerCase()
    if(url.protocol!=='https:'||url.username||url.password)return null
    if(!youtubeHosts.has(host)&&!shortHosts.has(host)&&!vimeoHosts.has(host))return null
    return url
  }catch{return null}
}

export function safeMaterialVideoUrl(value){
  return checkedVideoUrl(value)?.href||''
}

export function youtubePreviewId(value){
  const url=checkedVideoUrl(value)
  if(!url)return ''
  const host=url.hostname.toLowerCase()
  let id=''
  if(shortHosts.has(host))id=url.pathname.split('/')[1]||''
  else if(youtubeHosts.has(host)){
    const [section,identifier]=url.pathname.split('/').filter(Boolean)
    id=section==='watch'?url.searchParams.get('v')||'':
      ['embed','shorts','live','v'].includes(section)?identifier||'':''
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id)?id:''
}
