// Exactly two owner-approved captioned intros are permitted as public,
// read-only playback. No other third-party media, uploads, analytics or
// provider API calls are permitted from the local video renderer.
const APPROVED = Object.freeze([
  "https://resource2.heygen.ai/movio/video/72e3e6f45c3664b0b8d75281b1b413a5/2e30e44294964059b57670860ee3828b/caption.mp4",
  "https://resource2.heygen.ai/movio/video/8d998c778af3b563aa63233aa4fb4a06/89b101dc9dbb4fcea06aab3eb6ce5094/caption.mp4",
]);
export function stripApprovedIntroVideoSources(source) {
  let result=String(source);
  for (const url of APPROVED) {
    const needle='src:"'+url+'"';
    if (result.split(needle).length-1!==1) throw new Error("Approved video intro source is missing or duplicated");
    result=result.replace(needle,'src:"[approved read-only intro]"');
  }
  return result;
}
