/**
 * Explicitly consented, free-quota-only speech-to-text bridge. No storage.
 * Full audio stays in the visitor's browser until this one-off opt-in click.
 * Editing, shot matching and rendering remain local on the original Studio.
 */
import {NextResponse} from "next/server";
import {AppError} from "@/lib/assessments/contracts";
import {getAppConfig,requireSameOrigin} from "@/lib/app/config";
import {consumeRate} from "@/lib/app/database";
import {PRIVATE_HEADERS,safeError} from "@/lib/app/http";
import {normalizeTimedTranscript} from "@/lib/mandala/audio-visual-storyboard.mjs";

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
    if(form.get("consent")!=="yes")
      throw new AppError("AUDIO_STT_CONSENT_REQUIRED",400);
    if(!LANGUAGE.has(language)||!(file instanceof File)||
      file.size===0||file.size>MAX_AUDIO_BYTES||
      !EXTENSION.test(file.name)||!ACCEPTED.has(file.type))
      throw new AppError("AUDIO_STT_INVALID_FILE",400);
    // Shared conservative global quota: never turn a guest microphone into
    // automatic provider requests or a new third-party billing obligation.
    await consumeRate(config,{op:"audio-stt-free-global-day"},20,86400);
    await consumeRate(config,{op:"audio-stt-free-global-minute"},3,60);
    const multipart=new FormData();
    multipart.set("file",file,file.name.replace(/[^a-z0-9._-]/gi,"_").slice(-70));
    multipart.set("model","whisper-large-v3-turbo");
    multipart.set("response_format","verbose_json");
    multipart.set("timestamp_granularities[]","segment");
    if(language!=="auto")multipart.set("language",language);
    const provider=await fetch(GROQ_TRANSCRIPT_URL,{
      method:"POST",cache:"no-store",redirect:"error",
      signal:AbortSignal.timeout(18000),
      headers:{Authorization:"Bearer "+process.env.HH_FIRST_VIDEO_GROQ_API_KEY},
      body:multipart
    });
    if(!provider.ok)throw new AppError("AUDIO_STT_PROVIDER_UNAVAILABLE",503);
    const result=await provider.json();
    const transcript=normalizeTimedTranscript(result);
    if(!transcript)throw new AppError("AUDIO_STT_TIMECODES_UNAVAILABLE",502);
    return NextResponse.json({version:"hh-audio-stt-v1",
      transcript,provider:"groq_free_confirmed",charged:false,
      mediaGenerated:false,locallyStored:false},{headers:PRIVATE_HEADERS});
  }catch(error){
    const result=safeError(error);
    return NextResponse.json({error:result.code},
      {status:result.status,headers:PRIVATE_HEADERS});
  }
}
