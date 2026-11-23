// The eight already-generated HeyGen Creator coach takes. One first-party source.
import {coachNaturalFilename} from './coach-natural-motion.mjs';
const ROOT='/images/holistic-house/my-coach-motion/';
const coaches=[['mira','Mira','Мира','Mira'],['sofia','Sofia','София','Sofía'],
  ['max','Max','Макс','Max'],['alex','Alex','Алекс','Alex']];
export const SITE_OWNER_AVATARS=Object.freeze(coaches.flatMap(([persona,en,ru,es])=>
  ['calm','attentive'].map(take=>Object.freeze({
    id:persona+'-'+take,persona,take,names:Object.freeze({en,ru,es}),
    poster:ROOT+persona+'-still.webp',
    video:ROOT+coachNaturalFilename(persona,take),
  }))
));
const IDS=new Set(SITE_OWNER_AVATARS.map(item=>item.id));
export function isSiteOwnerAvatarId(id){return typeof id==='string'&&IDS.has(id);}
export function visibleSiteOwnerAvatars(hidden=[]){
  const ids=new Set(Array.isArray(hidden)?hidden.filter(isSiteOwnerAvatarId):[]);
  return SITE_OWNER_AVATARS.filter(item=>!ids.has(item.id));
}
