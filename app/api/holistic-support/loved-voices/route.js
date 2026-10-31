import {NextResponse} from "next/server";
import {AppError} from "@/lib/assessments/contracts";
import {getAppConfig,requireSameOrigin} from "@/lib/app/config";
import {consumeRate} from "@/lib/app/database";
import {PRIVATE_HEADERS,safeError} from "@/lib/app/http";
import {generateLovedVoice} from "@/lib/mandala/loved-voice-provider.mjs";
import {
  lovedVoiceKey,approveLovedVoiceText,inspectLovedVoiceWav,
  LOVED_VOICE_LANGUAGES,LOVED_VOICE_MAX_UPLOAD_BYTES,
} from "@/lib/mandala/loved-voices.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=60;
export const preferredRegion="yul1";

const failure=error=>{
  const safe=safeError(error);
  return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
};

export async function GET() {
  return NextResponse.json({
    enabled:Boolean(lovedVoiceKey(process.env)),
    mode:"stateless-speaker-consent",
    languages:LOVED_VOICE_LANGUAGES,
    requiresExternalRegistration:false,
    storesVoiceProfile:false,
    provider:"gemini",
  },{headers:PRIVATE_HEADERS});
}

async function boundedForm(request) {
  const contentType=request.headers.get("content-type")||"";
  if(!/^multipart\/form-data;\s*boundary=/i.test(contentType))
    throw new AppError("LOVED_VOICE_MULTIPART_REQUIRED",415);
  const announced=Number(request.headers.get("content-length")||0);
  if(announced>LOVED_VOICE_MAX_UPLOAD_BYTES)
    throw new AppError("LOVED_VOICE_UPLOAD_TOO_LARGE",413);
  const reader=request.body?.getReader();
  if(!reader)throw new AppError("LOVED_VOICE_INVALID_UPLOAD",400);
  const parts=[];let bytes=0;
  for(;;) {
    const {done,value}=await reader.read();
    if(done)break;
    bytes+=value.byteLength;
    if(bytes>LOVED_VOICE_MAX_UPLOAD_BYTES) {
      await reader.cancel().catch(()=>{});
      throw new AppError("LOVED_VOICE_UPLOAD_TOO_LARGE",413);
    }
    parts.push(Buffer.from(value));
  }
  const parsed=new Request(request.url,{
    method:"POST",
    headers:{"Content-Type":contentType},
    body:Buffer.concat(parts),
  });
  try{return await parsed.formData();}
  catch{throw new AppError("LOVED_VOICE_INVALID_UPLOAD",400);}
}

export async function POST(request) {
  try {
    const key=lovedVoiceKey(process.env);
    if(!key)throw new AppError("LOVED_VOICE_NOT_CONFIGURED",503);
    const config=getAppConfig();
    requireSameOrigin(request,config);
    // Real, durable quotas; do not call Google for anonymous unlimited traffic.
    const ip=(request.headers.get("x-vercel-forwarded-for")||
      request.headers.get("x-real-ip")||"shared").split(",")[0].trim().slice(0,64);
    await consumeRate(config,{op:"loved-voice-pilot-hour",ip},1,3600);
    await consumeRate(config,{op:"loved-voice-pilot-day",ip},3,86400);
    await consumeRate(config,{op:"loved-voice-pilot-global"},12,86400);
    const form=await boundedForm(request);
    if([...form.keys()].some(k=>!["source","consent","text","language","adult","permission"].includes(k)))
      throw new AppError("LOVED_VOICE_INVALID_UPLOAD",400);
    if(form.get("adult")!=="yes" || form.get("permission")!=="yes")
      throw new AppError("LOVED_VOICE_SPEAKER_CONSENT_REQUIRED",403);
    const language=form.get("language");
    const text=approveLovedVoiceText(form.get("text"),language);
    const source=form.get("source"),consent=form.get("consent");
    if(!source || !consent || typeof source.arrayBuffer!=="function"||
       typeof consent.arrayBuffer!=="function" || source.size>1_600_000 ||
       consent.size>1_150_000 || source.size<1000 || consent.size<1000)
      throw new AppError("LOVED_VOICE_INVALID_UPLOAD",400);
    const [sample,spokenConsent]=await Promise.all([
      source.arrayBuffer(),consent.arrayBuffer(),
    ]);
    try {
      inspectLovedVoiceWav(sample,"source");
      inspectLovedVoiceWav(spokenConsent,"consent");
    } catch{
      throw new AppError("LOVED_VOICE_INVALID_AUDIO",422);
    }
    let audio;
    try {
      audio=await generateLovedVoice({key,source:new Uint8Array(sample),
        consent:new Uint8Array(spokenConsent),text,language,
        signal:AbortSignal.timeout(50000)});
    } catch(error) {
      const code=typeof error?.code==="string"&&error.code.startsWith("LOVED_VOICE_")
        ?error.code:"LOVED_VOICE_PROVIDER_UNAVAILABLE";
      throw new AppError(code,[400,422,429,502,503].includes(error?.status)?error.status:503);
    }
    return new NextResponse(audio,{headers:{
      ...PRIVATE_HEADERS,
      "Content-Type":"audio/wav",
      "Content-Disposition":'attachment; filename="holistic-house-synthetic-support.wav"',
      "Content-Length":String(audio.length),
      "X-HH-Synthetic-Audio":"true",
    }});
  }catch(error){return failure(error);}
}
