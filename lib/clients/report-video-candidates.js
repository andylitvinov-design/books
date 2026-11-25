import {parseSessionYouTubeUrl} from './youtube-resource.js'

const reusableRoles=new Set(['additional','meditation'])
const allowedVideoMime=new Set(['video/mp4','video/quicktime'])

// Pure, intentionally client-data-minimal selection of report-owned resources.
// Recognize legacy URL-only links, even if not tagged as YouTube or at the top.
// Never promote a private personal/hidden/instruction attachment automatically.
export function reportReusableVideoCandidates(session){
  const resources=[...(Array.isArray(session?.published?.plan?.resources)?session.published.plan.resources:[]),
    ...(Array.isArray(session?.draft?.plan?.resources)?session.draft.plan.resources:[])]
  const seen=new Set(),links=[]
  for(const resource of resources){
    const parsed=parseSessionYouTubeUrl(resource?.url)
    if(!parsed||seen.has(parsed.id))continue
    seen.add(parsed.id)
    links.push({id:parsed.id,url:parsed.url,title:resource?.title||'YouTube',kind:'youtube'})
  }
  const assets=new Map((Array.isArray(session?.assets)?session.assets:[])
    .filter(asset=>asset.kind==='video'&&asset.status==='ready'&&asset.scope==='client'&&
      allowedVideoMime.has(asset.mime)).map(asset=>[asset.id,asset]))
  const videos=[],used=new Set()
  for(const item of [...(Array.isArray(session?.published?.media)?session.published.media:[]),
    ...(Array.isArray(session?.draft?.media)?session.draft.media:[])]){
    if(!item||item.scope!=='client'||!reusableRoles.has(item.role)||
      !assets.has(item.assetId)||used.has(item.assetId))continue
    used.add(item.assetId)
    videos.push({id:item.assetId,title:item.title||'Video',kind:'session'})
  }
  return {links,videos}
}
