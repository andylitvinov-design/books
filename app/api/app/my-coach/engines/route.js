// Dedicated metadata-only My Coach route. The literal URL is unchanged;
// Next's exact route takes precedence over the old app catch-all.
// Keep the old generic route's verified account, rate bucket and private headers.
import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {geminiCoachTextConfig} from '@/lib/coaching/gemini-coach-text.mjs'
import {geminiCoachTtsConfig} from '@/lib/coaching/gemini-coach-tts.mjs'
import {geminiFreeLiveConfig,geminiFreeLiveUnavailableReason} from '@/lib/coaching/gemini-live-free.mjs'
import {coachSpeechReviewEnabled,coachOrdinarySpeechReviewEnabled} from '@/lib/coaching/coach-speech-review-config.mjs'
import {geminiSpeechReviewEnabled} from '@/lib/coaching/gemini-speech-review-provider.mjs'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request){
  let auth
  try{
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method!=='GET'&&request.method!=='HEAD')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const expectedAccount=request.headers.get('x-hh-account-id')
    if(expectedAccount&&expectedAccount!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
    await consumeRate(config,{op:'app',actor:actor.id},180,60)
    if(request.method!=='GET')throw new AppError('NOT_FOUND',404)
    return auth.apply(NextResponse.json({schema:'HH_MY_COACH_ENGINES_V1',
        gemini_free:Boolean(geminiCoachTextConfig(process.env,'gemini_free')),
        gemini_paid:Boolean(geminiCoachTextConfig(process.env,'gemini_paid')),
        gemini_tts_free:Boolean(geminiCoachTtsConfig(process.env,'gemini_tts_free')),
        gemini_tts_paid:Boolean(geminiCoachTtsConfig(process.env,'gemini_tts_paid')),
        gemini_live_free:Boolean(geminiFreeLiveConfig(process.env)),
        gemini_live_reason:geminiFreeLiveUnavailableReason(process.env),
        speech_review_free:coachSpeechReviewEnabled(process.env),
        speech_review_ordinary:coachOrdinarySpeechReviewEnabled(process.env),
        speech_review_gemini:geminiSpeechReviewEnabled(process.env),
        live:false},{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export {handle as GET,handle as HEAD,handle as POST}
