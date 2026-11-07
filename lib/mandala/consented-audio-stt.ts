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
  const form=new FormData();
  form.append("file",file,file.name);
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
