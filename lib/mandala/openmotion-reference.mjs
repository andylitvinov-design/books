/**
 * OpenMotion/HF metadata-only reference adapter for the existing, first-party
 * Mandala video renderer. This deliberately does NOT execute imported HTML/JS,
 * download unlicensed assets, call providers, promise 95% fidelity, or fork a
 * second editor. It maps visible movement/pacing onto safe local video presets.
 *
 * Upstream https://github.com/nexu-io/openmotion (Apache-2.0 engine).
 * Source video and brand media retain their own licensing and attribution.
 */
import {OPENMOTION_REFERENCE_SNAPSHOT as SOURCE} from "../../data/openmotion/openmotion-reference-snapshot.mjs";

export const OPENMOTION_REFERENCE_COUNT=SOURCE.referenceVideoCount;
export const OPENMOTION_GUIDE_COUNT=SOURCE.motionGuideCount;
export const OPENMOTION_REFERENCE_COLLECTIONS=Object.freeze([
  "all","reference","moment","example","block","component"
]);
const REFERENCE_BY_ID=new Map(SOURCE.references.map(item=>[item.id,item]));
const LOCALS=new Set(["ru","en","es"]);
const THEMES=Object.freeze({
  gentle:"gentle-pause",
  breath:"forest-breath",
  heart:"heart-connection",
  money:"work-possibilities",
  goal:"inner-confidence",
  evening:"quiet-evening",
  morning:"morning-light",
});

export function listOpenMotionReferences({query="",collection="all",offset=0,limit=18}={}){
  const group=OPENMOTION_REFERENCE_COLLECTIONS.includes(collection)?collection:"all";
  const needle=String(query).trim().slice(0,100).toLocaleLowerCase();
  const start=Number.isInteger(offset)&&offset>=0?offset:0;
  const count=Number.isInteger(limit)&&limit>=1&&limit<=40?limit:18;
  const selected=SOURCE.references.filter(entry=>{
    if(group!=="all"&&entry.collection!==group)return false;
    return !needle||[entry.title,entry.description,entry.source,
      ...entry.tags,...entry.mechanics].some(s=>s.toLocaleLowerCase().includes(needle));
  });
  return {total:selected.length,items:selected.slice(start,start+count)};
}

export function getOpenMotionGuideIds(){
  return [...SOURCE.motionGuideIds];
}
export function getOpenMotionReference(id){
  return REFERENCE_BY_ID.get(id)||null;
}

/** Safe, deterministic local adaptation: only a first-party draft, no copying. */
export function planOpenMotionReferenceSelection(id,locale="en"){
  const item=getOpenMotionReference(id);
  if(!item||!LOCALS.has(locale))return null;
  const source=[item.title,item.description,...item.tags,...item.mechanics].join(" ").toLowerCase();
  let templateId=THEMES.morning;
  if(/meditat|quiet|relax|calm|ocean|water|nature|forest|wellness|breath|peace/i.test(source)){
    templateId=/forest|breath/i.test(source)?THEMES.breath:THEMES.gentle;
  }else if(/heart|love|people|relation|connection|friend|together|couple/i.test(source)){
    templateId=THEMES.heart;
  }else if(/money|business|work|marketing|finance|commerce|product|launch|brand|app|sales|growth/i.test(source)){
    templateId=THEMES.money;
  }else if(/goal|journey|progress|achieve|path|future|milestone|road|success/i.test(source)){
    templateId=THEMES.goal;
  }else if(/night|moon|star|cosmos|space|evening/i.test(source)){
    templateId=THEMES.evening;
  }
  const ratio=item.ratio.replace(":", "/");
  const aspect=/^(?:9\/16|4\/5|3\/4)$/.test(ratio)?"portrait":
    /^(?:1\/1|4\/4)$/.test(ratio)?"square":"landscape";
  const durationSeconds=item.seconds<=20?20:item.seconds<=40?30:60;
  const movement=item.mechanics.join(" ").toLowerCase()+" "+source;
  const motion=/kinetic|stagger|hard.?cut|glitch|shake|flash|snap|fast|dynamic|counter|spin|speed|pop/i.test(movement)
    ?"dynamic":"slow";
  return Object.freeze({
    id:item.id,title:item.title,templateId,aspect,durationSeconds,motion,
    mode:"original_local_adaptation",
    fidelityClaim:false,providerRequired:false,
  });
}
