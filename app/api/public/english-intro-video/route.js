import {createYoutubeRedisCommand,getYoutubeHistoryStore} from '@/lib/youtube/upload-history-store.js'
import {ENGLISH_HEYGEN_INTRO_ID,ENGLISH_YOUTUBE_MASTERS,verifiedEnglishIntroYoutubeId}
  from '@/lib/youtube/english-master-catalog.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
// This endpoint ONLY exposes a previously verified YouTube ID intended for
// owner-approved Unlisted website embedding. Never return account grants,
// channel metadata, signed HeyGen URLs, or transient upload state.
export async function GET(request){
  // Optional exact-source lookup for the other approved English presentations.
  // Never accept arbitrary YouTube, HeyGen or publisher URLs from the browser.
  const params=new URL(request.url).searchParams
  const requested=params.getAll('videoId')
  const videoId=requested.length?requested[0]:ENGLISH_HEYGEN_INTRO_ID
  if(requested.length>1||[...params.keys()].some(key=>key!=='videoId')||
    !ENGLISH_YOUTUBE_MASTERS.some(master=>master.videoId===videoId))
    return Response.json({youtubeId:null},{status:400,headers:{'cache-control':'no-store'}})
  let youtubeId=null
  try{
    const command=createYoutubeRedisCommand()
    const history=getYoutubeHistoryStore()
    if(command&&history){
      const [channels,receipt]=await Promise.all([
        history.channels(),
        command(['HGET','holistic-house:youtube:heygen-en:completed:v1',videoId]),
      ])
      youtubeId=verifiedEnglishIntroYoutubeId(receipt,channels.en)
    }
  }catch{/* No verified receipt; never fall back to an English HeyGen player. */}
  return Response.json({youtubeId},{headers:{
    'cache-control':'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
    'x-content-type-options':'nosniff',
  }})
}
