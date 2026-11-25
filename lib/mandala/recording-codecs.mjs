// MediaRecorder MIME support does not imply native playback on iPhone.
export function isAppleMobileDevice(userAgent="",maxTouchPoints=0){
  const ua=String(userAgent);
  return /iPhone|iPad|iPod/i.test(ua)||
    (/Macintosh/i.test(ua)&&Number(maxTouchPoints)>1);
}
export function prefersSafariWebm(userAgent="", maxTouchPoints=0){
  const ua=String(userAgent);
  if(isAppleMobileDevice(ua,maxTouchPoints))return false;
  return /Macintosh/i.test(ua)&&/Safari\//.test(ua)
    &&!/CriOS|Chrome|Edg|OPR\//i.test(ua);
}
export function orderRecordingMimes({mp4,webm,preferWebm=false,forceMp4=false,userAgent="",maxTouchPoints=0}){
  if(forceMp4)return [...mp4];
  if(isAppleMobileDevice(userAgent,maxTouchPoints))return preferWebm?[]:[...mp4];
  if(preferWebm)return [...webm];
  return prefersSafariWebm(userAgent,maxTouchPoints)
    ? [...webm,...mp4] : [...mp4,...webm];
}

// Generic video/mp4 may contain VP9/Opus. Procedural movies require an
// explicit AVC/AAC recorder or the existing H.264/AAC WebCodecs path.
export function proceduralMp4Route({nativeAvc=false,webCodecs=false,nativeWebm=false,preferNativeWebm=false}={}){
  // Chromium can expose H.264 WebCodecs without a usable AAC encoder. Keep
  // the selected real sound in a correctly labelled browser-native WebM/Opus
  // instead of failing or silently returning a video-only MP4.
  return nativeAvc?'native':preferNativeWebm&&nativeWebm?'native-webm':
    webCodecs?'webcodecs':nativeWebm?'native-webm':'unsupported';
}

// Safari's MP4 default remains intact. An explicit retry in WebM must
// bypass the MP4 WebCodecs encoder even if it is installed and supported.
export function selectWebCodecsForRecording({
  hasWebCodecs=false,safariWebKit=false,procedural=false,
  proceduralRoute="unsupported",preferWebm=false,
  nativeMp4Available=false,userAgent="",maxTouchPoints=0,forceWebCodecs=false,
}={}){
  // Apple's own MediaRecorder writes an iPhone-native H.264/AAC MP4.
  // Prefer it when this device advertises a playable MP4 recording stream.
  // The old unconditional Safari WebCodecs path repeatedly emitted a Blob
  // rejected by the owner's physical phone (MEDIA_ERR_SRC_NOT_SUPPORTED 4).
  // A manual alternate attempt may explicitly select WebCodecs, never auto.
  const nativeAppleMp4=safariWebKit&&nativeMp4Available&&
    isAppleMobileDevice(userAgent,maxTouchPoints);
  return Boolean(hasWebCodecs && !preferWebm &&
    (!nativeAppleMp4||forceWebCodecs) &&
    (safariWebKit || forceWebCodecs || (procedural && proceduralRoute==="webcodecs")));
}

/** A finalized MP4 header is insufficient proof of Safari playback. */
export function shouldAutoRecoverSafariPlayback({
  safariWebKit=false,format="",errorCode=0,nativeWebm=false,
  alreadyAttempted=false,catalog=false,userAgent="",maxTouchPoints=0
}={}){
  return Boolean(!isAppleMobileDevice(userAgent,maxTouchPoints)&&
    safariWebKit&&format==="mp4"&&(errorCode===3||errorCode===4)&&nativeWebm&&
    !alreadyAttempted&&!catalog);
}
