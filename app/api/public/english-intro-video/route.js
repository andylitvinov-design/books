import {createYoutubeRedisCommand,getYoutubeHistoryStore} from '@/lib/youtube/upload-history-store.js'
import {ENGLISH_HEYGEN_INTRO_ID,verifiedEnglishIntroYoutubeId}
  from '@/lib/youtube/english-master-catalog.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
// This endpoint ONLY exposes a previously verified YouTube ID intended for
// owner-approved Unlisted website embedding. Never return account grants,
// channel metadata, signed HeyGen URLs, or transient upload state.
export async function GET(){
  let youtubeId=null
  try{
    const command=createYoutubeRedisCommand()
    const history=getYoutubeHistoryStore()
    if(command&&history){
      const [channels,receipt]=await Promise.all([
        history.channels(),
        command(['HGET','holistic-house:youtube:heygen-en:completed:v1',ENGLISH_HEYGEN_INTRO_ID]),
      ])
      youtubeId=verifiedEnglishIntroYoutubeId(receipt,channels.en)
    }
  }catch{/* Safe fallback: the existing exact English HeyGen master. */}
  return Response.json({youtubeId},{headers:{
    'cache-control':'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
    'x-content-type-options':'nosniff',
  }})
}
