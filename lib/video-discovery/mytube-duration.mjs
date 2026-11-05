/**
 * A verified public-video duration is required for format membership.
 * Do not infer duration from a title, lesson number, thumbnail or series name.
 * Ten minutes exactly belongs to Study, not Shorts.
 */
export const MYTUBE_STUDY_MIN_SECONDS = 600;

export function matchesMyTubeDuration(verifiedSeconds, mode="all") {
  if(mode==="all")return true;
  if(mode!=="shorts"&&mode!=="study")return false;
  if(!Number.isFinite(verifiedSeconds)||verifiedSeconds<=0)return false;
  return mode==="shorts"
    ? verifiedSeconds<MYTUBE_STUDY_MIN_SECONDS
    : verifiedSeconds>=MYTUBE_STUDY_MIN_SECONDS;
}

export function myTubeDurationCounts(items=[]) {
  let shorts=0,study=0,unknown=0;
  for(const item of items){
    const seconds=item?.durationVerifiedSeconds;
    if(!Number.isFinite(seconds)||seconds<=0){unknown++;continue}
    if(seconds<MYTUBE_STUDY_MIN_SECONDS)shorts++;
    else study++;
  }
  return {all:items.length,shorts,study,unknown};
}
