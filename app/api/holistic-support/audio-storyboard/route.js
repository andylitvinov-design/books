/**
 * Explicitly consented, free-quota-only speech-to-text bridge. No storage.
 * Full audio stays in the visitor's browser until this one-off opt-in click.
 * Editing, shot matching and rendering remain local on the original Studio.
 */
import {NextResponse} from "next/server";
import {isBoundedCoachReviewWav} from "@/lib/coaching/coach-speech-review-wav.mjs";
import {coachSpeechReviewEnabled,isCoachSpeechReviewRequest,coachOrdinarySpeechReviewEnabled} from "@/lib/coaching/coach-speech-review-config.mjs";
import {shouldUseCoachLargeV3} from "@/lib/coaching/coach-stt-model.mjs";
import {coachSpeechReviewGlossary} from "@/lib/coaching/coach-speech-review-glossary.mjs";
import {AppError} from "@/lib/assessments/contracts";
import {getAppConfig,requireSameOrigin} from "@/lib/app/config";
import {createRequestAuth} from "@/lib/app/session";
import {consumeRate} from "@/lib/app/database";
import {PRIVATE_HEADERS,safeError} from "@/lib/app/http";
import {normalizeTimedTranscript} from "@/lib/mandala/audio-visual-storyboard.mjs";
import {isSpeechTranscriptLanguageMismatch} from "@/lib/mandala/audio-speech-language.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=25;

const MAX_AUDIO_BYTES=4*1024*1024;
const ACCEPTED=new Set(["audio/mpeg","audio/mp3","audio/mp4","audio/x-m4a",
  "audio/wav","audio/x-wav","audio/aac","audio/webm","audio/ogg",
  "video/mp4","application/ogg"]);
const EXTENSION=/\.(mp3|mp4|m4a|wav|webm|ogg|aac)$/i;
// The coach's EN page can still receive Russian speech. Only explicit
// "auto" omits Groq Whisper's language hint; all file/consent/quota gates remain.
const LANGUAGE=new Set(["ru","en","es","auto"]);
const GROQ_TRANSCRIPT_URL="https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(request){
  try{
    const config=getAppConfig();
    requireSameOrigin(request,config);
    if(process.env.HH_AUDIO_STT_FREE_CONFIRMED!=="true"||
      process.env.HH_FIRST_VIDEO_GROQ_FREE_CONFIRMED!=="true"||
      !process.env.HH_FIRST_VIDEO_GROQ_API_KEY)
      throw new AppError("AUDIO_STT_FREE_PROVIDER_NOT_CONFIGURED",503);
    const contentLength=Number(request.headers.get("content-length")||"0");
    if(contentLength>MAX_AUDIO_BYTES+150000)
      throw new AppError("AUDIO_STT_FILE_TOO_LARGE",413);
    if(!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data"))
      throw new AppError("AUDIO_STT_MULTIPART_REQUIRED",415);
    const form=await request.formData();
    const file=form.get("file");
    const language=form.get("locale");
    const output=form.get("output");
    if(output!==null&&output!=="text")throw new AppError("AUDIO_STT_OUTPUT_INVALID",400);
    if(form.get("consent")!=="yes")
      throw new AppError("AUDIO_STT_CONSENT_REQUIRED",400);
    if(!LANGUAGE.has(language)||!(file instanceof File)||
      file.size===0||file.size>MAX_AUDIO_BYTES||
      !EXTENSION.test(file.name)||!ACCEPTED.has(file.type))
      throw new AppError("AUDIO_STT_INVALID_FILE",400);
    // The coach previously shared Video Studio's three-requests-per-minute,
    // twenty-per-day GLOBAL bucket. A normal five-turn conversation therefore
    // ran out of recognition even though the microphone was still working.
    // Separate the quotas without removing the verified FREE-only provider gate.
    // The coach lane is authenticated so a public caller cannot claim its quota.
    const purpose=form.get("purpose");
    const textOnly=output==="text";
    const reviewScope=form.get("review_scope");
    if(reviewScope!==null&&(reviewScope!=="ordinary"||purpose!=="my_coach"||!textOnly||!isCoachSpeechReviewRequest({purpose,filename:file.name,review:form.get("review")})))throw new AppError("AUDIO_STT_PURPOSE_INVALID",400);
    if(textOnly&&purpose!==null&&purpose!=="ali_chat"&&purpose!=="my_coach")throw new AppError("AUDIO_STT_PURPOSE_INVALID",400);
    if(purpose==="my_coach"){
      const actor=await createRequestAuth(request,config).verified();
      if(reviewScope==="ordinary"&&!coachOrdinarySpeechReviewEnabled(process.env))throw new AppError("AUDIO_STT_REVIEW_DISABLED",503);
      if(isCoachSpeechReviewRequest({purpose,filename:file.name,review:form.get("review")})&&(!textOnly||!coachSpeechReviewEnabled(process.env)))
        throw new AppError("AUDIO_STT_REVIEW_DISABLED",503);
      if(isCoachSpeechReviewRequest({purpose,filename:file.name,review:form.get("review")})){
        const long=process.env.HH_MY_COACH_STT_LONG_REVIEW_ENABLED==="true";
        if(file.type!=="audio/wav"||file.size>(long?35:12)*32000+44||
          !isBoundedCoachReviewWav(new Uint8Array(await file.arrayBuffer()),{long}))
          throw new AppError("AUDIO_STT_INVALID_FILE",400);
      }
      await consumeRate(config,{op:"my-coach-stt-free-user-minute",userId:actor.id},8,60);
      await consumeRate(config,{op:"my-coach-stt-free-user-day",userId:actor.id},120,86400);
      await consumeRate(config,{op:"my-coach-stt-free-global-minute"},12,60);
      await consumeRate(config,{op:"my-coach-stt-free-global-day"},240,86400);
    }else if(purpose==="ali_chat"){
      // A distinct authenticated Ali quota shares the existing Coach global
      // free-tier ceiling; no paid provider or extra background retry.
      const actor=await createRequestAuth(request,config).verified();
      await consumeRate(config,{op:"ali-chat-stt-free-user-minute",userId:actor.id},6,60);
      await consumeRate(config,{op:"ali-chat-stt-free-user-day",userId:actor.id},60,86400);
      await consumeRate(config,{op:"ali-chat-stt-free-global-minute"},6,60);
      await consumeRate(config,{op:"ali-chat-stt-free-global-day"},60,86400);
      await consumeRate(config,{op:"my-coach-stt-free-global-minute"},12,60);
      await consumeRate(config,{op:"my-coach-stt-free-global-day"},240,86400);
    }else{
      if(purpose!==null)throw new AppError("AUDIO_STT_PURPOSE_INVALID",400);
      // Preserve the original Video Studio allocation and no-guest-abuse gate.
      await consumeRate(config,{op:"audio-stt-free-global-day"},20,86400);
      await consumeRate(config,{op:"audio-stt-free-global-minute"},3,60);
    }
    const multipart=new FormData();
    multipart.set("file",file,file.name.replace(/[^a-z0-9._-]/gi,"_").slice(-70));
    multipart.set("model","whisper-large-v3-turbo");
    // The background review can switch independently of Basic's response path.
    // The model-specific flag requires confirmed free entitlement; no retry on another model.
    if(shouldUseCoachLargeV3({purpose,textOnly,fileName:file.name,
      freeConfirmed:process.env.HH_MY_COACH_STT_LARGE_V3_FREE_CONFIRMED,
      basicEnabled:process.env.HH_MY_COACH_STT_LARGE_V3_BASIC_ENABLED}))
      multipart.set("model","whisper-large-v3");
    // Never forward a client-provided prompt, prior dialogue or profile.
    const glossary=coachSpeechReviewGlossary({purpose,textOnly,filename:file.name,language,
      enabled:process.env.HH_MY_COACH_STT_GLOSSARY_ENABLED==="true"});
    if(glossary)multipart.set("prompt",glossary);
    // Plain chat dictation needs text only; do not reject a short phrase for missing timecodes.
    multipart.set("response_format",textOnly?"json":"verbose_json");
    if(!textOnly)multipart.set("timestamp_granularities[]","segment");
    if(language!=="auto")multipart.set("language",language);
    const provider=await fetch(GROQ_TRANSCRIPT_URL,{
      method:"POST",cache:"no-store",redirect:"error",
      signal:purpose==="my_coach"&&textOnly?AbortSignal.any([request.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(18000),
      headers:{Authorization:"Bearer "+process.env.HH_FIRST_VIDEO_GROQ_API_KEY},
      body:multipart
    });
    if(provider.status===429)throw new AppError("AUDIO_STT_RATE_LIMITED",429);
    if(!provider.ok)throw new AppError("AUDIO_STT_PROVIDER_UNAVAILABLE",503);
    const result=await provider.json();
    if(textOnly){
      const recognized=typeof result?.text==="string"?result.text.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/gu," ").trim():"";
      const text=purpose==="my_coach"?recognized:recognized.slice(0,2000);
      if(!text)throw new AppError("AUDIO_STT_EMPTY",422);
      if(purpose==="my_coach"&&isSpeechTranscriptLanguageMismatch({requested:language,detected:result.language,text}))
        throw new AppError("AUDIO_STT_LANGUAGE_MISMATCH",422);
      return NextResponse.json({version:"hh-audio-dictation-v1",text,provider:"groq_free_confirmed",charged:false,locallyStored:false,
        ...(purpose==="my_coach"?{model:multipart.get("model")}:{})},{headers:PRIVATE_HEADERS});
    }
    const transcript=normalizeTimedTranscript(result);
    if(!transcript)throw new AppError("AUDIO_STT_TIMECODES_UNAVAILABLE",502);
    // Never display a likely English transcription of detected Russian speech.
    if(isSpeechTranscriptLanguageMismatch({requested:language,detected:result.language,text:transcript.text}))
      throw new AppError("AUDIO_STT_LANGUAGE_MISMATCH",422);
    return NextResponse.json({version:"hh-audio-stt-v1",
      transcript,provider:"groq_free_confirmed",charged:false,
      mediaGenerated:false,locallyStored:false},{headers:PRIVATE_HEADERS});
  }catch(error){
    const result=safeError(error);
    return NextResponse.json({error:result.code},
      {status:result.status,headers:PRIVATE_HEADERS});
  }
}
