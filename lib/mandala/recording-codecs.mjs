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
