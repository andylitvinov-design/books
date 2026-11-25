/**
 * SERVER-SIDE, PRIVACY-SAFE GPT Image brief compiler.
 * A client may submit only harmless enum selectors. Raw wishes, diagnostic
 * material, transcripts, people, photos or arbitrary provider prompts never
 * enter the outbound request. Reuse the existing Cinematic Director and its
 * trusted prompt catalog; do not invent a second psychological director.
 */
import {createHash} from 'node:crypto';
import {buildCinematicStoryboard,safeCinematicPrompt} from '../mandala/cinematic-director.mjs';

export const IMAGE_BRIEF_VERSION='hh-gpt-image-brief-v1';
const THEMES=new Set(['energy','money','relationships','goals','life','health']);
const STYLES=new Set(['warm','nature','dream','minimal']);
const ASPECTS=new Set(['portrait','landscape','square']);
const LANGS=new Set(['ru','en','es']);
const MOTIFS=new Set(['water','forest','night']);
const INPUT_KEYS=new Set(['theme','style','aspect','locale','durationSeconds','shotNumbers','avoidMotifs']);
const RULES=Object.freeze({
  water:'avoid water, sea and rivers',
  forest:'avoid trees, forests and woods',
  night:'avoid night, darkness and starfields',
});
const IMAGE_STYLE='Original photorealistic cinematic STILL background for a gentle, contemplative montage. Visually coherent, natural depth, beautiful detailed scene, soft light. Keep lower third clear for subtitles. No text, no titles, no numbers, no watermarks, no logos, no faces, no identifiable people, no medical or therapeutic symbols, no flashing lights. This is a STATIC image; camera movement is added locally after generation.';

export function buildSafeGptImageBrief(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input)||
     Object.keys(input).some(key=>!INPUT_KEYS.has(key)))throw Error('invalid_image_brief_fields');
  if(!THEMES.has(input.theme)||!STYLES.has(input.style)||!ASPECTS.has(input.aspect)||
     !LANGS.has(input.locale)||![20,30,60].includes(input.durationSeconds))
    throw Error('invalid_image_brief_selector');
  if(!Array.isArray(input.shotNumbers)||input.shotNumbers.length<1||input.shotNumbers.length>2||
     !input.shotNumbers.every(x=>Number.isInteger(x)&&x>=1&&x<=6)||
     new Set(input.shotNumbers).size!==input.shotNumbers.length)
    throw Error('invalid_image_shots');
  const avoid=input.avoidMotifs??[];
  if(!Array.isArray(avoid)||avoid.length>3||avoid.some(x=>!MOTIFS.has(x))||
    new Set(avoid).size!==avoid.length)throw Error('invalid_image_avoidance');
  // This is the only call into the existing director. Never accept a plan
  // or prompt provided by the browser, even if its `safe` flag is true.
  const plan=buildCinematicStoryboard({
    theme:input.theme,locale:input.locale,style:input.style,
    aspect:input.aspect,durationSeconds:input.durationSeconds,
    wish:'',avoid:avoid.map(x=>RULES[x]).join('; '),mode:'creative',
  });
  const shots=input.shotNumbers.map(number=>{
    const shot=plan.shots[number-1];
    if(!shot)throw Error('image_shot_out_of_range');
    const approved=safeCinematicPrompt(plan,number);
    const prompt=[IMAGE_STYLE,approved].join('\n');
    return Object.freeze({shotNumber:number,sceneId:shot.sceneId,
      camera:shot.camera,seconds:shot.durationSeconds,prompt});
  });
  const descriptor={version:IMAGE_BRIEF_VERSION,theme:input.theme,style:input.style,
    aspect:input.aspect,locale:input.locale,durationSeconds:input.durationSeconds,
    avoidMotifs:[...avoid].sort(),shots};
  return Object.freeze({...descriptor,planHash:createHash('sha256').update(JSON.stringify(descriptor)).digest('hex')});
}

export function imageOutputSize(aspect){
  if(aspect==='portrait')return '1024x1536';
  if(aspect==='landscape')return '1536x1024';
  if(aspect==='square')return '1024x1024';
  throw Error('invalid_image_aspect');
}