/**
 * Choose one client-relevant text source for the existing local video renderer.
 * No visitor input is transmitted to a network service.
 */
export const SINGLE_VIDEO_TEXT_TRACK_VERSION="hh-single-video-text-track-v1";
const GENERIC=new Set(["могу","можно","хочу","быть","свои","себя","меня","важно","делать","choose","could","would","there","today","video","myself","quiero","puedo","ahora","hacer","sobre"]);
function tokens(value){
  if(typeof value!=="string")return [];
  const words=value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/ё/g,"е").match(/[\p{L}\p{N}]+/gu)||[];
  return [...new Set(words.filter(word=>word.length>=4&&!GENERIC.has(word))
    .map(word=>word.length>=6?word.slice(0,5):word))];
}
function relevance(phrases,wish){
  const cues=new Set(tokens(wish));
  if(!cues.size)return 0;
  return phrases.reduce((best,phrase)=>
    Math.max(best,tokens(phrase).filter(token=>cues.has(token)).length),0);
}
/**
 * @returns {"affirmations"|"stage"|"caption"|"none"}
 * Explicit timeline/custom wording wins. Approved narration is never silently
 * replaced by a disconnected subtitle. Automatic material is scored by the
 * visitor's wish, with stable affirmative preference on ties.
 */
export function pickSingleVideoTextSource({
  affirmationsEnabled=false,affirmationLines=[],affirmationVisibility=[],
  timelineCaptions=null,storyboardCaptions=[],captionMode="none",
  caption="",wish="",approvedNarration=false,
}={}){
  const hasText=value=>typeof value==="string"&&value.trim().length>0;
  if(Array.isArray(timelineCaptions))
    return timelineCaptions.some(clip=>hasText(clip?.text))?"stage":"none";
  if(captionMode==="custom"&&hasText(caption))return "caption";
  const affirmation=affirmationsEnabled===true&&Array.isArray(affirmationVisibility)&&
    affirmationVisibility.length>0&&Array.isArray(affirmationLines)&&affirmationLines.some(hasText);
  const stage=Array.isArray(storyboardCaptions)&&storyboardCaptions.some(hasText);
  if(affirmation&&stage){
    if(approvedNarration)return "affirmations";
    if(typeof wish==="string"&&wish.trim().length>=8&&
      relevance(storyboardCaptions,wish)>=relevance(affirmationLines,wish)+2)
      return "stage";
    return "affirmations";
  }
  if(affirmation)return "affirmations";
  if(stage)return "stage";
  return captionMode==="theme"&&hasText(caption)?"caption":"none";
}
