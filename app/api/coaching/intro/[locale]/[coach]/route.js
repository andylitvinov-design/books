import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {consumeRate} from '@/lib/app/database'
import {safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {getCoachPresentation} from '@/lib/coaching/persona-presentations.mjs'
import {coachOpeningIntro,coachSessionOpeningLine} from '@/lib/coaching/coach-opening-protocol.mjs'
import {myCoachFishConfig,myCoachFishVoice,myCoachFishProsody} from '@/lib/coaching/my-coach-fish-voice.mjs'
import {GOOGLE_PROVIDER,GOOGLE_TTS_GLOBAL_DAILY_LIMIT,googleChirpConfig,
  normalizeGoogleChirpInput,synthesizeGoogleChirp} from '@/lib/coaching/my-coach-google-chirp.mjs'
import {coachSpokenText} from '@/lib/coaching/coach-spoken-text.mjs'
import {readSavedCoachGreeting,saveCoachGreetingOnce,isMp3Bytes} from '@/lib/coaching/coach-greeting-mp3-store.mjs'
import {geminiCoachTtsConfig,normalizeGeminiCoachTtsInput,synthesizeGeminiCoachTts} from '@/lib/coaching/gemini-coach-tts.mjs'
import {approvedGeminiVoice} from '@/lib/coaching/gemini-voice-catalog.mjs'
import {encodeCoachGreetingMp3} from '@/lib/coaching/coach-greeting-mp3.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export const maxDuration=60

// Preserve the previous English recording identities even if an old cache key
// was never populated. New v4 greetings alone use the owner's new EN defaults.
const LEGACY_EN_GREETING_VOICES=Object.freeze({mira:'Gacrux',max:'Orus',sofia:'Sulafat',alex:'Charon',merlin:'Algenib',harry:'Achird',genie:'Orus'})
const ARCHIVED_CACHE_CONTROL='public, max-age=31536000, s-maxage=31536000, immutable'
const CACHE_HEADERS={
  'Content-Type':'audio/mpeg',
  'Cache-Control':'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
  'X-Content-Type-Options':'nosniff',
  'X-Robots-Tag':'noindex, nofollow',
}

// MP3 bytes are stored only on the first successful versioned request; every later
// Play and Replay serves the SAME immutable Supabase object, without TTS.
function storedAudioResponse(stored){
  if(stored.status===416)return new NextResponse(null,{status:416,headers:{
    'Cache-Control':'private, no-store','Accept-Ranges':'bytes',
    'Content-Range':stored.headers.get('content-range'),
    'X-Content-Type-Options':'nosniff',
  }})
  const headers={...CACHE_HEADERS,'Cache-Control':ARCHIVED_CACHE_CONTROL,'Accept-Ranges':'bytes'}
  for(const key of ['content-length','content-range']){
    const value=stored.headers.get(key)
    if(value)headers[key]=value
  }
  return new NextResponse(stored.body,{status:stored.status,headers})
}
async function persistGreeting(config,personaId,locale,audio,version='v2'){
  if(!isMp3Bytes(audio))throw new AppError('MY_COACH_INTRO_INVALID_MP3',502)
  let saved
  try{saved=await saveCoachGreetingOnce(config,personaId,locale,audio,fetch,version)}
  catch{throw new AppError('MY_COACH_INTRO_STORAGE_UNAVAILABLE',503)}
  if(!saved.created){
    // Concurrent first Play: always use the FIRST recording, not the loser's
    // freshly synthesized version (which may have different prosody).
    try{
      const canonical=await readSavedCoachGreeting(config,personaId,locale,fetch,null,version)
      if(canonical)return storedAudioResponse(canonical)
    }catch{}
    throw new AppError('MY_COACH_INTRO_STORAGE_UNAVAILABLE',503)
  }
  return new NextResponse(audio,{status:200,headers:{...CACHE_HEADERS,
    'Cache-Control':ARCHIVED_CACHE_CONTROL,'Accept-Ranges':'bytes',
    'Content-Length':String(audio.length)}})
}

// Public, editorial-only natural voice. Path parameters survive browsers and
// proxies that strip query strings. Never accepts arbitrary user-supplied text,
// recorded microphone audio, voice IDs, or client session history.
export async function GET(request){
  try{
    if(request.headers.get('sec-fetch-site')==='cross-site')
      throw new AppError('MY_COACH_INTRO_CROSS_SITE',403)
    const url=new URL(request.url)
    const match=/^\/api\/coaching\/intro\/(en|ru|es)\/(mira|max|sofia|alex|merlin|harry|genie|caesar|lea|noah|iris|ray)\/?$/.exec(url.pathname)
    if(!match||!['','?v=2','?v=3','?v=4','?v=5','?v=6'].includes(url.search))throw new AppError('MY_COACH_INTRO_INVALID',400)
    const [,locale,personaId]=match
    const version=url.search==='?v=6'?'v6':url.search==='?v=5'?'v5':url.search==='?v=4'?'v4':url.search==='?v=3'?'v3':'v2'
    if(version==='v3'&&(personaId!=='genie'||locale==='es'))throw new AppError('MY_COACH_INTRO_INVALID',400)
    if(version==='v4'&&!((locale==='en'&&/^(?:mira|max|sofia|alex|merlin|harry|genie)$/.test(personaId))||(locale==='ru'&&/^(?:alex|max)$/.test(personaId))))throw new AppError('MY_COACH_INTRO_INVALID',400)
    if(version==='v5'&&(personaId!=='caesar'||locale==='es'))throw new AppError('MY_COACH_INTRO_INVALID',400)
    const intro=getCoachPresentation(personaId,locale)
    // Record the same authored greeting shown on the coach's introduction card.
    const introduction=version==='v6'?coachSessionOpeningLine(personaId,locale):(intro?.text||coachOpeningIntro(personaId,locale))
    if(!introduction||introduction.length>900)
      throw new AppError('MY_COACH_INTRO_INVALID',400)
    const config=getAppConfig()
    const useRecordedGreeting=url.search==='?v=2'||url.search==='?v=3'||url.search==='?v=4'||url.search==='?v=5'||url.search==='?v=6'
    if(useRecordedGreeting){
      // Storage failure must not be interpreted as a cache miss: that would
      // trigger paid TTS again on every transient outage.
      let saved
      try{saved=await readSavedCoachGreeting(config,personaId,locale,fetch,
        request.headers.get('range'),version)}
      catch{throw new AppError('MY_COACH_INTRO_STORAGE_UNAVAILABLE',503)}
      if(saved)return storedAudioResponse(saved)
    }

    // Never record a new voice into Caesar's obsolete v2 cache key.
    if(personaId==='caesar'&&version!=='v5'&&version!=='v6')throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)
    // Freeze each selected public RU/EN Gemini voice into a real MP3. Only the
    // fixed editorial greeting leaves the server, never a visitor's words.
    // Reuse the existing Free-tier approval/key and shared 24/day TTS budget;
    // no Paid fallback, voice substitution, or repeated synthesis on cache hits.
    const voiceName=useRecordedGreeting?(locale==='en'&&version!=='v4'&&version!=='v6'&&Object.hasOwn(LEGACY_EN_GREETING_VOICES,personaId)?LEGACY_EN_GREETING_VOICES[personaId]:locale==='ru'&&version==='v2'&&personaId==='alex'?'Alnilam':locale==='ru'&&version==='v2'&&personaId==='max'?'Orus':approvedGeminiVoice(personaId,locale)):null
    const gemini=voiceName?geminiCoachTtsConfig(process.env,'gemini_tts_free'):null
    if(gemini){
      let input
      try{
        input=normalizeGeminiCoachTtsInput({provider:'gemini_tts_free',locale,personaId,
          voiceName,text:coachSpokenText(introduction).text,
          voiceConsent:true,cloudVoiceConsent:true,trainingUseConsent:true})
      }catch{throw new AppError('MY_COACH_INTRO_INVALID',400)}
      await consumeRate(config,{op:'my-coach-gemini-public-intro-minute'},3,60)
      await consumeRate(config,{op:'my-coach-gemini_tts_free-global-day'},24,86400)
      let audio
      try{
        const wav=await synthesizeGeminiCoachTts({config:gemini,input,
          signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)])})
        audio=await encodeCoachGreetingMp3(wav,{signal:request.signal})
      }catch{throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)}
      return await persistGreeting(config,personaId,locale,audio,version)
    }
    // New approved versioned greetings must be Gemini, never a substituted voice.
    if((personaId==='merlin'&&voiceName)||(personaId==='caesar'&&version!=='v6')||version==='v3'||version==='v4'||version==='v5'||(version==='v6'&&voiceName))throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)

    // Google is the owner-approved long-term voice ONLY when every existing
    // GCP project, billing, consent and service-account flag is configured.
    // This serves a fixed authored introduction, never any visitor's words.
    // Public/unauthenticated Play shares the private route's atomic global
    // limit: 40 * 500 * 31 = 620k maximum monthly characters across BOTH.
    const chirp=googleChirpConfig()
    if(chirp){
      let input
      try{
        input=normalizeGoogleChirpInput({provider:GOOGLE_PROVIDER,locale,personaId,
          text:coachSpokenText(introduction).text,voiceConsent:true,cloudVoiceConsent:true})
      }catch{throw new AppError('MY_COACH_INTRO_INVALID',400)}
      // 24 fixed greetings can warm the CDN without exhausting the 40/day
      // shared Google budget. Never silently fall back to Fish on Google error.
      await consumeRate(config,{op:'my-coach-google-public-intro-minute'},12,60)
      await consumeRate(config,{op:'my-coach-google-public-intro-day'},24,86400)
      await consumeRate(config,{op:'my-coach-google-global'},GOOGLE_TTS_GLOBAL_DAILY_LIMIT,86400)
      let audio
      try{
        audio=await synthesizeGoogleChirp({config:chirp,input,
          signal:AbortSignal.any([request.signal,AbortSignal.timeout(19000)])})
      }catch{throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)}
      if(useRecordedGreeting)return await persistGreeting(config,personaId,locale,audio,version)
      return new NextResponse(audio,{status:200,headers:{
        ...CACHE_HEADERS,'Content-Length':String(audio.length)}})
    }

    const referenceId=myCoachFishVoice(personaId,locale)
    if(!referenceId)throw new AppError('MY_COACH_NATIVE_VOICE_NOT_APPROVED',503)
    const vendor=myCoachFishConfig()
    if(!vendor)throw new AppError('MY_COACH_NATURAL_VOICE_UNAVAILABLE',503)
    // Atomic DB limits on origin (uncached) requests, never per audio chunk.
    await consumeRate(config,{op:'my-coach-public-intro-minute'},12,60)
    await consumeRate(config,{op:'my-coach-public-intro-global-day'},40,86400)
    let upstream
    try{
      upstream=await fetch('https://api.fish.audio/v1/tts',{
        method:'POST',cache:'no-store',
        signal:AbortSignal.any([request.signal,AbortSignal.timeout(15000)]),
        headers:{Authorization:`Bearer ${vendor.key}`,
          'Content-Type':'application/json',Accept:'audio/mpeg',model:vendor.model},
        body:JSON.stringify({text:introduction,format:'mp3',reference_id:referenceId,
          latency:'low',chunk_length:100,
          ...(myCoachFishProsody(personaId,locale)?{prosody:myCoachFishProsody(personaId,locale)}:{})}),
      })
    }catch{throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)}
    const type=upstream.headers.get('content-type')||''
    if(!upstream.ok||!upstream.body||
      (!type.startsWith('audio/')&&!type.startsWith('application/octet-stream')))
      throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)
    if(useRecordedGreeting){
      // Buffer exactly once to make an immutable MP3 before replying. Every
      // later visit streams it directly from Storage (no vendor call/XP).
      let audio
      try{audio=Buffer.from(await upstream.arrayBuffer())}
      catch{throw new AppError('MY_COACH_INTRO_TTS_UNAVAILABLE',503)}
      return await persistGreeting(config,personaId,locale,audio,version)
    }
    // Keep existing legacy v=1 streaming untouched.
    return new NextResponse(upstream.body,{status:200,headers:CACHE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{status:safe.status,headers:{
      'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
    }})
  }
}
