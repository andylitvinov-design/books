// Deterministic, local-only MIME preference for browser MediaRecorder.
// iOS Safari 26 can accept MP4 options yet emit files that fail native playback.
// This is an ordering preference, not a claim that WebM will always succeed.
export function prefersSafariWebm(userAgent="", maxTouchPoints=0){
  const ua=String(userAgent);
  if(/iPhone|iPad|iPod/i.test(ua))return true;
  if(/Macintosh/i.test(ua)&&Number(maxTouchPoints)>1)return true; // iPad desktop UA
  // Safari 18.4+ supports WebM/Opus recording; Playwright WebKit can
  // advertise a lower Version number than its actual media implementation.
  // Prefer WebM for desktop Safari whenever supported. The caller filters
  // with MediaRecorder.isTypeSupported(), preserving MP4 for older browsers.
  return /Macintosh/i.test(ua)&&/Safari\//.test(ua)
    &&!/CriOS|Chrome|Edg|OPR\//i.test(ua);
}
export function orderRecordingMimes({mp4,webm,preferWebm=false,forceMp4=false,userAgent="",maxTouchPoints=0}){
  if(forceMp4)return [...mp4];
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
}={}){
  return Boolean(hasWebCodecs && !preferWebm &&
    (safariWebKit || (procedural && proceduralRoute==="webcodecs")));
}

/** A finalized MP4 header is insufficient proof of Safari playback. */
export function shouldAutoRecoverSafariPlayback({
  safariWebKit=false,format="",errorCode=0,nativeWebm=false,
  alreadyAttempted=false,catalog=false
}={}){
  return Boolean(safariWebKit&&format==="mp4"&&errorCode===4&&nativeWebm&&
    !alreadyAttempted&&!catalog);
}
