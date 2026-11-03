// Pure browser/server contract for practitioner-approved PUBLIC education links.
// Never treat an Unlisted YouTube URL as a private client-media capability.
const youtubeId=/^[a-zA-Z0-9_-]{11}$/
const youtubeHosts=new Set(['youtube.com','www.youtube.com','m.youtube.com'])
const nocookieHosts=new Set(['youtube-nocookie.com','www.youtube-nocookie.com'])

export function parseSessionYouTubeUrl(value) {
  if(typeof value!=='string'||!value.trim()||value.length>1500)return null
  let url
  try {url=new URL(value.trim())} catch {return null}
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null
  const host=url.hostname.toLowerCase()
  const path=url.pathname.replace(/\/$/,'')
  let id=null
  if(host==='youtu.be'||host==='www.youtu.be'){
    if(/^\/[a-zA-Z0-9_-]{11}$/.test(path))id=path.slice(1)
  } else if(youtubeHosts.has(host)){
    if(path==='/watch')id=url.searchParams.get('v')
    else {
      const match=/^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})$/.exec(path)
      if(match)id=match[1]
    }
  } else if(nocookieHosts.has(host)){
    const match=/^\/embed\/([a-zA-Z0-9_-]{11})$/.exec(path)
    if(match)id=match[1]
  }
  if(!youtubeId.test(id||''))return null
  // Remove timestamps, playlist links and tracking parameters before saving.
  return {id,url:'https://www.youtube.com/watch?v='+id}
}
