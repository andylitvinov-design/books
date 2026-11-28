import {NextResponse} from 'next/server'
import {AppError} from '@/lib/assessments/contracts'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {geminiSpeechReviewEnabled,geminiSpeechReviewPayload,geminiSpeechReviewText} from '@/lib/coaching/gemini-speech-review-provider.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=25
export async function POST(request){
 try{
  const config=getAppConfig()
  requireSameOrigin(request,config)
  if(!geminiSpeechReviewEnabled(process.env))throw new AppError('AUDIO_STT_FREE_PROVIDER_NOT_CONFIGURED',503)
  const actor=await createRequestAuth(request,config).verified()
  if(Number(request.headers.get('content-length')||0)>400000)throw new AppError('AUDIO_STT_FILE_TOO_LARGE',413)
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data'))throw new AppError('AUDIO_STT_MULTIPART_REQUIRED',415)
  const form=await request.formData(),file=form.get('file'),locale=form.get('locale')
  if(form.get('purpose')!=='my_coach'||form.get('output')!=='text'||form.get('consent')!=='yes'||form.get('geminiConsent')!=='yes')throw new AppError('AUDIO_STT_CONSENT_REQUIRED',400)
  if(!(file instanceof File)||file.name!=='coach-review.wav'||file.type!=='audio/wav'||file.size>384044||!['ru','en','es'].includes(locale))throw new AppError('AUDIO_STT_INVALID_FILE',400)
  let payload
  try{payload=geminiSpeechReviewPayload(Buffer.from(await file.arrayBuffer()),locale)}catch{throw new AppError('AUDIO_STT_INVALID_FILE',400)}
  // Shared Coach + Ali ceiling: selecting a different provider never adds quota.
  await consumeRate(config,{op:'my-coach-stt-free-user-minute',userId:actor.id},8,60)
  await consumeRate(config,{op:'my-coach-stt-free-user-day',userId:actor.id},120,86400)
  await consumeRate(config,{op:'my-coach-stt-free-global-minute'},12,60)
  await consumeRate(config,{op:'my-coach-stt-free-global-day'},240,86400)
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.any([request.signal,AbortSignal.timeout(10000)]),headers:{'Content-Type':'application/json','Api-Revision':'2026-05-20','x-goog-api-key':process.env.HH_MY_COACH_GEMINI_TRANSCRIBE_API_KEY},body:JSON.stringify(payload)})
  if(response.status===429)throw new AppError('AUDIO_STT_RATE_LIMITED',429)
  if(!response.ok)throw new AppError('AUDIO_STT_PROVIDER_UNAVAILABLE',503)
  const text=geminiSpeechReviewText(await response.json())
  if(!text)throw new AppError('AUDIO_STT_EMPTY',422)
  return NextResponse.json({text,provider:'gemini_transcribe_free_confirmed',charged:false,locallyStored:false},{headers:PRIVATE_HEADERS})
 }catch(error){
  const result=safeError(error)
  return NextResponse.json({error:result.code},{status:result.status,headers:PRIVATE_HEADERS})
 }
}
