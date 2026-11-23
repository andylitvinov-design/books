// Exclude ONLY the owner-reviewed RU original playback URLs from the
// device-only local compositor's strict no-network/no-provider checks.
// EN playback uses a separate verified first-party YouTube-ID service.
const RU_MP4="https://resource2.heygen.ai/movio/video/72e3e6f45c3664b0b8d75281b1b413a5/2e30e44294964059b57670860ee3828b/caption.mp4";
const RU_EMBED="https://app.heygen.com/embeds/72e3e6f45c3664b0b8d75281b1b413a5";
export function stripApprovedIntroVideoSources(source){
 let result=String(source);
 for(const [needle,replacement] of [
  ['src:"'+RU_MP4+'"','src:"[approved RU MP4]"'],
  ['embed:"'+RU_EMBED+'"','embed:"[approved RU iframe]"'],
 ]){
  if(result.split(needle).length-1!==1)throw Error("Approved RU intro source is missing or duplicated");
  result=result.replace(needle,replacement);
 }
 return result;
}
