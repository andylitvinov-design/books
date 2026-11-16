// The only browser-side network transport for explicitly consented speech recognition.
// Keep the Video Studio renderer strictly local and fail before any request without consent.
import type {TimedSpeechTranscript} from "./audio-visual-storyboard.mjs";

export async function requestConsentedTimedTranscript(
  file:File,locale:string,consent:boolean,signal:AbortSignal
):Promise<TimedSpeechTranscript>{
  if(!consent)throw Error("AUDIO_STT_CONSENT_REQUIRED");
  if(!file||file.size<=0||file.size>4*1024*1024)
    throw Error("AUDIO_STT_INVALID_FILE");
  if(!["ru","en","es"].includes(locale))throw Error("AUDIO_STT_INVALID_LOCALE");
  // iPhone Files may provide a valid audio with empty/generic MIME.
  // Retain the original bytes and name; normalize ONLY known extensions for
  // the unchanged server-side file-type gate (never upload on selection).
  const formats:Record<string,string>={
    mp3:"audio/mpeg",m4a:"audio/x-m4a",wav:"audio/wav",
    webm:"audio/webm",mp4:"audio/mp4",aac:"audio/aac"
  };
  const extension=file.name.slice(file.name.lastIndexOf(".")+1).toLowerCase();
  const mime=formats[extension];
  if(!mime)throw Error("AUDIO_STT_INVALID_FILE");
  // Safari MediaRecorder can produce audio/mp4;codecs=mp4a.40.2.
  // Canonicalize only explicitly supported MIME types, preserving recorded bytes.
  const declaredType=file.type.toLowerCase().split(";")[0].trim();
  if(!new Set(["","application/octet-stream","audio/mpeg","audio/mp3",
    "audio/mp4","video/mp4","audio/x-m4a","audio/wav","audio/x-wav",
    "audio/aac","audio/webm"]).has(declaredType))
    throw Error("AUDIO_STT_INVALID_FILE");
  const normalized=file.type===mime?file
    :new File([file],file.name,{type:mime,lastModified:file.lastModified});
  const form=new FormData();
  form.append("file",normalized,normalized.name);
  form.append("locale",locale);
  form.append("consent","yes");
  const response=await fetch("/api/holistic-support/audio-storyboard",{
    method:"POST",cache:"no-store",credentials:"same-origin",
    body:form,signal
  });
  const payload=await response.json() as {
    transcript?:TimedSpeechTranscript;error?:string
  };
  if(!response.ok||!payload.transcript)
    throw Error(payload.error||"AUDIO_STT_UNAVAILABLE");
  return payload.transcript;
}
