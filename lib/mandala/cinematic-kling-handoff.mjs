/**
 * Safe one-scene Kling handoff for the EXISTING Holistic House editor.
 * Compiles only whitelisted visual tokens, never clients' raw wishes, tests or photos.
 * Preparing a prompt does not call Kling and cannot authorize a paid request.
 */
import {CINEMATIC_STYLES} from './cinematic-director.mjs';

export const KLING_HANDOFF_VERSION='hh-kling-visual-v1';
const TOKENS=Object.freeze({
  subject:Object.freeze({eagle:'one fictional eagle',phoenix:'one fictional phoenix',
    wolf:'one fictional wolf',fox:'one fictional fox',dolphin:'one fictional dolphin',
    landscape:'a calm natural landscape'}),
  action:Object.freeze({flight:'gliding through the air',metamorphosis:'gradually transforming',
    journey:'travelling slowly across the landscape',emergence:'slowly emerging into view',
    dance:'moving in gentle rhythmic motion'}),
  setting:Object.freeze({mountains:'dramatic but peaceful mountain ridges',
    valley:'a sunlit valley',starfield:'a clear sky with delicate distant stars',
    forest:'a tranquil green forest',sky:'an open spacious sky',sea:'a calm sea'}),
  destination:Object.freeze({constellation:'a coherent glowing constellation',light:'soft golden light'}),
  color:Object.freeze({white:'white',golden:'golden',blue:'soft blue'}),
});
const ASPECT=Object.freeze({landscape:'16:9',portrait:'9:16',square:'1:1'});
const FIELDS=Object.freeze(['version','subject','action','setting','destination','color','styleId','aspect','shotNumber','exclusions']);
const SAFE_STYLE=Object.freeze({
  warm:'photorealistic golden-hour natural light, organic textures, warm amber highlights',
  nature:'photorealistic quiet nature, soft green palette, airy overcast light',
  dream:'restrained symbolic dream film, delicate luminous haze, elegant soft colors',
  minimal:'minimal contemplative film, natural neutral colors, delicate detail',
});
const EXCLUSION_HINTS=Object.freeze({
  water:/вод|мор|океан|руч|water|sea|ocean|river|stream|agua|mar|rio/i,
  trees:/лес|дерев|forest|tree|bosque|arbol/i,
  night:/ноч|темнот|dark|night|oscuro|noche/i,
});
const EXCLUSION_PHRASES=Object.freeze({
  water:'no rivers, sea, lakes or open water',
  trees:'no trees, woods or forest',
  night:'no starry night, darkness or nocturnal sky',
});
export function parseKlingExclusions(value=''){
  const text=typeof value==='string'?value.slice(0,180):'';
  return Object.freeze(Object.entries(EXCLUSION_HINTS)
    .filter(([,re])=>re.test(text)).map(([id])=>id));
}
function pick(table,value,field){
  if(value===null||value===undefined||value==='')return null;
  if(typeof value!=='string'||!Object.hasOwn(table,value))throw Error('invalid_kling_art_'+field);
  return value;
}
/** Strict art packet: no raw prompts, prices, patient data, URLs or unknown keys. */
export function normalizeKlingHandoff(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input)||
     Object.keys(input).some(key=>!FIELDS.includes(key)))throw Error('invalid_kling_handoff');
  if(input.version!==KLING_HANDOFF_VERSION)throw Error('invalid_kling_handoff_version');
  const subject=pick(TOKENS.subject,input.subject,'subject');
  const action=pick(TOKENS.action,input.action,'action');
  const setting=pick(TOKENS.setting,input.setting,'setting');
  const destination=pick(TOKENS.destination,input.destination,'destination');
  const color=pick(TOKENS.color,input.color,'color');
  const exclusions=input.exclusions===undefined?[]:input.exclusions;
  if(!Array.isArray(exclusions)||exclusions.length>3||
     exclusions.some(id=>typeof id!=='string'||!Object.hasOwn(EXCLUSION_PHRASES,id))||
     new Set(exclusions).size!==exclusions.length)throw Error('invalid_kling_art_exclusions');
  if((exclusions.includes('water')&&setting==='sea')||
     (exclusions.includes('trees')&&setting==='forest')||
     (exclusions.includes('night')&&setting==='starfield'))
    throw Error('conflicting_kling_visual_preferences');
  if(!subject&&!setting)throw Error('kling_art_subject_or_setting_required');
  const styleId=pick(CINEMATIC_STYLES,input.styleId,'style');
  const aspect=pick(ASPECT,input.aspect,'aspect');
  if(!styleId||!aspect||!Number.isInteger(input.shotNumber)||
      input.shotNumber<1||input.shotNumber>4)throw Error('invalid_kling_art_settings');
  return Object.freeze({version:KLING_HANDOFF_VERSION,subject,action,setting,destination,
    color,styleId,aspect,shotNumber:input.shotNumber,exclusions:Object.freeze([...exclusions].sort())});
}
export function cinematicKlingHandoffFromReference(referencePack,plan,shotNumber=3,avoidText=''){ 
  if(!referencePack||referencePack.noExternalClientData!==true||
      referencePack.rawUserPromptIncluded!==false||
      referencePack.externalTransferApproved!==false||
      !referencePack.recognized||!plan||plan.noExternalClientData!==true||
      plan.paidRenderApproved!==false)throw Error('unsafe_kling_reference');
  const terms=referencePack.recognized;
  return normalizeKlingHandoff({
    version:KLING_HANDOFF_VERSION,subject:terms.subject,action:terms.action,
    setting:terms.setting,destination:terms.destination,color:terms.color,
    styleId:plan.styleId,aspect:plan.aspect,shotNumber,exclusions:parseKlingExclusions(avoidText),
  });
}
export function buildKlingPromptFromHandoff(packet){
  const p=normalizeKlingHandoff(packet);
  const subject=TOKENS.subject[p.subject]||'the selected natural scenery';
  const name=(p.color?TOKENS.color[p.color]+' ':'')+subject;
  const place=TOKENS.setting[p.setting]||'a softly lit natural landscape';
  const action=TOKENS.action[p.action]||'moving with subtle natural motion';
  const destination=TOKENS.destination[p.destination];
  const transformation=p.action==='metamorphosis'?
    (destination?'The same '+name+' transforms into '+destination+' while preserving continuity.':
      'The same '+name+' changes into delicate abstract light with continuous identity.'):
    'The same '+name+' is '+action+'.';
  const beat=p.shotNumber===3?transformation:
    p.shotNumber===1?'Begin with an establishing view of '+name+' above '+place+'.':
    p.shotNumber===2?'Track '+name+' '+action+' in one continuous location.':
    'End in a peaceful composition with '+name+(destination?' and '+destination:'')+'.';
  const prompt=[
    'Single continuous cinematic shot, 3 seconds, no scene cuts.',
    'Subject: '+name+'. Setting: '+place+'.',
    beat,
    'Visual identity: '+SAFE_STYLE[p.styleId]+'.',
    'Camera: '+CINEMATIC_STYLES[p.styleId].camera+'.',
    'Clear geometry, believable gentle motion, stable character and scene.',
    ...p.exclusions.map(id=>EXCLUSION_PHRASES[id]+'.'),
    'No real person, no face, no logo, no watermark, no letters, no captions, no flicker or flashing light.',
  ].join(' ');
  if(prompt.length<12||prompt.length>2500)throw Error('kling_prompt_bounds');
  return Object.freeze({
    packet:p,prompt,mode:'text',duration:3,aspectRatio:ASPECT[p.aspect],
    resolution:'720p',model:'kling-3.0',audio:'off',
    origin:'trusted_holistic_house_art_tokens',
    containsPrivateClientData:false,containsRawWish:false,
    canSubmitWithoutOwnerApproval:false,submissionPerformed:false,
  });
}
export function klingHandoffAdminPath(packet){
  const p=normalizeKlingHandoff(packet);
  const q=new URLSearchParams({cinema:'1',v:'1',style:p.styleId,
    aspect:p.aspect,shot:String(p.shotNumber)});
  for(const field of ['subject','action','setting','destination','color']){
    if(p[field])q.set(field,p[field]);
  }
  if(p.exclusions.length)q.set('ex',p.exclusions.join(','));
  return '/admin/videos?'+q.toString()+'#kling-scene-studio';
}
export function parseKlingHandoffQuery(query){
  const params=query instanceof URLSearchParams?query:
    new URLSearchParams(typeof query==='string'?query:'');
  if(params.get('cinema')!=='1'||params.get('v')!=='1'||String(params).length>420)return null;
  const allowed=new Set(['cinema','v','subject','action','setting','destination','color','style','aspect','shot','ex']);
  if([...params.keys()].some(key=>!allowed.has(key)))return null;
  try{
    return normalizeKlingHandoff({
      version:KLING_HANDOFF_VERSION,
      subject:params.get('subject'),action:params.get('action'),
      setting:params.get('setting'),destination:params.get('destination'),
      color:params.get('color'),styleId:params.get('style'),
      aspect:params.get('aspect'),shotNumber:Number(params.get('shot')),
      exclusions:params.get('ex')?params.get('ex').split(','):[],
    });
  }catch{return null;}
}
