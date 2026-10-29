/**
 * Holistic House cinematic director v1.
 * Deterministic, first-party and local-only: private wishes influence only the
 * choice of an allowlisted visual scene. Raw client words never enter prompts.
 */
import {graphemeTrim, suggestPersonalVideoScene} from './personal-video-intent.mjs';

export const CINEMATIC_PLAN_VERSION = 'hh-cinematic-storyboard-v1';
export const CINEMATIC_THEMES = Object.freeze(['energy','money','relationships','goals','life','health']);
export const CINEMATIC_STYLES = Object.freeze({
  warm: Object.freeze({
    name:{en:'Golden hour',ru:'Золотой час',es:'Hora dorada'},
    visual:'cinematic natural landscape, amber sunrise, warm soft volumetric light, realistic textures',
    camera:'slow steady dolly, natural depth, no sudden motion', motion:'slow',
  }),
  nature: Object.freeze({
    name:{en:'Living nature',ru:'Живая природа',es:'Naturaleza viva'},
    visual:'photorealistic tranquil nature, organic greens, clear air, gentle overcast light',
    camera:'restrained gliding camera, natural foreground parallax', motion:'slow',
  }),
  dream: Object.freeze({
    name:{en:'Symbolic dream',ru:'Символический сон',es:'Sueño simbólico'},
    visual:'elegant symbolic fine-art film, gentle luminous haze, restrained soft color palette',
    camera:'subtle drifting cinematic viewpoint, stable composition', motion:'slow',
  }),
  minimal: Object.freeze({
    name:{en:'Quiet minimalism',ru:'Тихий минимализм',es:'Minimalismo sereno'},
    visual:'minimal contemplative visual, simple forms, calm neutral colors, natural soft daylight',
    camera:'mostly locked-off thoughtful composition, extremely subtle movement', motion:'slow',
  }),
});
const VISUAL_SCENES = Object.freeze({
  energy:['solar-surge','ocean-pulse','gentle-shield','sun-flight'],
  money:['wealth-sunrise','abundance-tree','golden-shield','path-to-goals'],
  relationships:['blossom-garden','two-circles','warm-connection','heart-light'],
  goals:['light-path','guiding-stars','open-door','meaning-tree'],
  life:['meadow-morning','lone-tree','coastal-freedom','fern-awakening'],
  health:['calm-sea','mossy-stream','morning-dew','sea-breeze'],
});
// Approved scenes that already exist in the SAME local video/Canvas library.
// The original four stay the default: an explicit client wish can now choose
// an additional real supported motif rather than silently ignoring the words.
const ADDITIONAL_SCENES = Object.freeze({
  energy:['light-waterfall','green-vortex','river-power','mountain-air','desert-light','sunbeam-flow'],
  money:['money-magnet','partners','opportunity-falls','golden-rain','cosmic-flow','prosperity-coast','golden-harvest'],
  relationships:[],goals:[],
  life:['wildflower-dance'],
  health:['gentle-falls'],
});
const VISUAL_CUES = Object.freeze({
  'solar-surge':'sunlight awakening across a wide meadow',
  'ocean-pulse':'calm blue water and long slow waves',
  'gentle-shield':'soft light forming a quiet protective circle',
  'sun-flight':'warm golden sunlight moving across the sky',
  'wealth-sunrise':'natural sunrise over a broad landscape',
  'abundance-tree':'large mature tree in soft golden morning light',
  'golden-shield':'gentle amber light surrounding an open clearing',
  'path-to-goals':'winding path through a natural landscape',
  'blossom-garden':'flowering garden with warm open space',
  'two-circles':'two balanced rings of soft reflected light',
  'warm-connection':'two overlapping circles of gentle daylight',
  'heart-light':'soft warm light spreading across an open garden',
  'light-path':'quiet sunlit footpath with distant horizon',
  'guiding-stars':'subtle stars and a clear distant horizon',
  'open-door':'simple doorway opening into natural daylight',
  'meaning-tree':'rooted tree with wide branches',
  'meadow-morning':'peaceful meadow at first light',
  'lone-tree':'single mature tree in an open field',
  'coastal-freedom':'wide sandy coast and open sky',
  'fern-awakening':'unfurling fern in a soft green forest',
  'calm-sea':'very gentle sea under quiet morning sky',
  'mossy-stream':'small clear stream flowing over mossy stones',
  'morning-dew':'morning dew on green leaves in natural light',
  'sea-breeze':'soft movement of coastal grasses in the breeze',
  'prosperity-coast':'sunlit peaceful coastline',
  'money-magnet':'golden abstract particles in a balanced field',
  'partners':'two paths meeting in an open meadow',
  'golden-harvest':'natural field in the gentle light of harvest',
  'light-waterfall':'gentle luminous waterfall and flowing light',
  'green-vortex':'restrained green aurora with concentric moving light',
  'river-power':'quiet clear river and softly changing daylight',
  'mountain-air':'broad open mountain sky and slow clouds',
  'desert-light':'calm sunlit desert landscape',
  'sunbeam-flow':'soft beams of sunlight through open air',
  'opportunity-falls':'small golden particles falling gently through sunlight',
  'golden-rain':'abstract golden light falling softly through the frame',
  'cosmic-flow':'subtle golden particles drifting in a luminous sky',
  'wildflower-dance':'natural meadow wildflowers moving in a mild breeze',
  'gentle-falls':'gentle waterfall over smooth rocks',
});
const STAGES=Object.freeze({
  en:['Arrival','Finding support','Opening possibilities','Integration'],
  ru:['Начало','Опора','Новые возможности','Завершение'],
  es:['Llegada','Encontrar apoyo','Abrir posibilidades','Integración'],
});
const AVOID=[
  {pattern:/вод|мор|океан|руч|water|sea|ocean|river|stream|agua|mar|rio/i, cue:/ocean|sea|water|coast|stream|wave/i},
  {pattern:/лес|дерев|forest|tree|bosque|arbol/i,cue:/tree|forest|fern/i},
  {pattern:/темнот|ноч|dark|night|oscuro|noche/i,cue:/night|stars/i},
];
function safeLocale(locale){return ['en','ru','es'].includes(locale)?locale:'en';}
function safeTheme(theme){if(!CINEMATIC_THEMES.includes(theme))throw Error('invalid_cinematic_theme');return theme;}
function styleOrDefault(style){return Object.hasOwn(CINEMATIC_STYLES,style)?style:'warm';}
function sceneAllowed(id,avoid){return !AVOID.some(item=>item.pattern.test(avoid)&&item.cue.test(VISUAL_CUES[id]||''));}
function trustedPrompt(sceneId,styleId){
  const style=CINEMATIC_STYLES[styleId],cue=VISUAL_CUES[sceneId];
  if(!style||!cue)throw Error('invalid_cinematic_shot');
  return cue+'. '+style.visual+'. '+style.camera+
    '. One coherent cinematic scene; natural motion; no faces, no people, no captions, no logos, no flicker, no rapid cuts.';
}
export function buildCinematicStoryboard(input={}){
  const theme=safeTheme(input.theme);
  const locale=safeLocale(input.locale);
  const styleId=styleOrDefault(input.style);
  const style=CINEMATIC_STYLES[styleId];
  const durationSeconds=[20,30,60].includes(input.durationSeconds)?input.durationSeconds:20;
  const aspect=['portrait','square','landscape'].includes(input.aspect)?input.aspect:'landscape';
  // No raw wishes, tests, photos, gender or clinical information are retained.
  const wish=graphemeTrim(input.wish||'',160);
  const avoid=graphemeTrim(input.avoid||'',160);
  const scenes=VISUAL_SCENES[theme].slice();
  const candidateScenes=[...scenes,...ADDITIONAL_SCENES[theme]];
  const allowedCandidates=candidateScenes.filter(id=>sceneAllowed(id,avoid));
  const allowed=scenes.filter(id=>sceneAllowed(id,avoid));
  const available=allowed.length?allowed:scenes;
  if(wish && allowedCandidates.length){
    const recommended=suggestPersonalVideoScene({
      theme,wish,locale,availableScenes:allowedCandidates,
    });
    if(recommended.matched && sceneAllowed(recommended.sceneId,avoid)){
      const found=scenes.indexOf(recommended.sceneId);
      if(found>=0)[scenes[2],scenes[found]]=[scenes[found],scenes[2]];
      else scenes[2]=recommended.sceneId;
    }
  }
  const step=Math.floor(durationSeconds/4),rem=durationSeconds-step*4;
  let start=0;
  const shots=scenes.map((id,index)=>{
    const sceneId=sceneAllowed(id,avoid)?id:available[index%available.length];
    const seconds=step+(index<rem?1:0);
    const cue=VISUAL_CUES[sceneId]||VISUAL_CUES[scenes[0]];
    const shot={
      number:index+1,id:'shot-'+(index+1),title:STAGES[locale][index],
      theme,sceneId,startSeconds:start,durationSeconds:seconds,
      camera:style.camera,visualCue:cue,styleId,
      // This external-ready prompt is constructed exclusively from our trusted
      // allowlist, never from any client text or private test/profile data.
      providerPrompt:trustedPrompt(sceneId,styleId),
    };
    start+=seconds;
    return Object.freeze(shot);
  });
  return Object.freeze({
    version:CINEMATIC_PLAN_VERSION,locale,theme,styleId,aspect,
    durationSeconds,shotCount:4,shots:Object.freeze(shots),
    localPreview:true,paidRenderApproved:false,providerQuote:null,
    noExternalClientData:true,requiresPractitionerReview:input.mode==='therapy',
  });
}
export function findCinematicShot(shots,elapsedSeconds){
  if(!Array.isArray(shots)||!shots.length||!Number.isFinite(elapsedSeconds))return null;
  const elapsed=Math.max(0,elapsedSeconds);
  return shots.find(s=>elapsed>=s.startSeconds && elapsed<s.startSeconds+s.durationSeconds)||
    shots[shots.length-1];
}
export function safeCinematicPrompt(plan,shotNumber){
  if(!plan||plan.version!==CINEMATIC_PLAN_VERSION||
     plan.paidRenderApproved!==false||plan.noExternalClientData!==true)throw Error('unsafe_cinematic_plan');
  const shot=plan.shots?.[shotNumber-1];
  if(!shot||!Number.isInteger(shotNumber)||!Object.hasOwn(VISUAL_CUES,shot.sceneId)||
     typeof shot.providerPrompt!=='string'||shot.providerPrompt.length>650||
     shot.providerPrompt!==trustedPrompt(shot.sceneId,plan.styleId))throw Error('invalid_cinematic_shot');
  return shot.providerPrompt;
}
