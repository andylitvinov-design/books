import catalogue from '../../data/video-catalog/free-film-presets-v2.json' with {type:'json'};

import sceneCatalogue from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import standardCatalogue from '../../data/video-catalog/standard-motion-films-v1.json' with {type:'json'};
import {importMotionGuideV3,parseMotionGuideV3} from './video-project-v3.mjs';

const presets = [...catalogue.presets, ...standardCatalogue.films];
const scenesById = new Map(sceneCatalogue.scenes.map(scene => [scene.id, scene]));

const SCENE_DURATION_MS = 5000;
const CROSSFADE_MS = 500;
const AMBIENCE_DURATION_MS = 8000;
const AMBIENCE_BY_THEME = {health:'ocean',relationships:'rain'};

const isApprovedScene = scene => scene?.status==='approved'&&scene.media==='licensed_mp4';

export function searchMotionGuideScenes(query,locale,aspect) {
  const terms=query.slice(0,100).toLocaleLowerCase(locale).trim().split(/\s+/u).filter(Boolean);
  return sceneCatalogue.scenes.filter(scene=>{
    if(!isApprovedScene(scene)||!scene.allowedAspects.includes(aspect))return false;
    const searchText=[scene.id,scene.label[locale],...scene.tags,...scene.motifs]
      .join(' ').toLocaleLowerCase(locale);
    return terms.every(term=>searchText.includes(term));
  }).slice(0,12).map(scene=>({id:scene.id,label:scene.label[locale],tags:[...scene.tags]}));
}

export function listPresetMotionGuides(locale) {
  return presets.map(preset => {
    const first = scenesById.get(preset.clips[0]);
    return {id:preset.id,label:preset.label[locale],
      aspect:first.height>first.width?'portrait':'landscape'};
  });
}

export function createPresetMotionGuideV3(presetId, locale) {
  const preset = presets.find(candidate => candidate.id === presetId);
  if (!preset || !['en', 'ru', 'es'].includes(locale)) {
    throw new Error('motion_guide_unknown_preset');
  }
  const firstScene = scenesById.get(preset.clips[0]);
  if (!firstScene) throw new Error('motion_guide_missing_scene');
  const aspect = firstScene.height > firstScene.width ? 'portrait' : 'landscape';
  // Standard published films have six full five-second beats. Existing
  // four-shot customizable presets keep their original crossfade timing.
  const fixedBeats = Array.isArray(preset.captions?.[locale]) && preset.clips.length === 6;
  if (fixedBeats && preset.captions[locale].length !== preset.clips.length) {
    throw new Error('motion_guide_incomplete_captions');
  }
  const stepMs = fixedBeats ? SCENE_DURATION_MS : SCENE_DURATION_MS - CROSSFADE_MS;
  const clips = preset.clips.map((assetId, index) => ({
    id: 'shot-' + (index + 1),
    assetId,
    startMs: index * stepMs,
    durationMs: SCENE_DURATION_MS,
    sourceInMs: 0,
    sourceOutMs: SCENE_DURATION_MS,
    speed: 1,
    opacityPercent: 100,
    transitionIn: index === 0 || fixedBeats ? 'cut' : 'crossfade',
    transform: {scale: 1, x: 0, y: 0, rotation: 0},
    mask: 'none',
  }));
  const last = clips.at(-1);
  const durationMs = last.startMs + last.durationMs;
  const ambience = preset.ambience ?? AMBIENCE_BY_THEME[preset.theme] ?? 'breeze';
  const titleItems = fixedBeats
    ? [{id:'opening-title', text:preset.label[locale], startMs:0, endMs:2300,
        position:'top', style:'minimal', approved:true},
       ...preset.captions[locale].map((text,index)=>({
         id:'beat-'+(index+1), text,
         startMs:index*stepMs, endMs:(index+1)*stepMs,
         position:'bottom', style:'minimal', approved:true,
       }))]
    : [{id:'opening-title',text:preset.label[locale],startMs:0,endMs:3000,
        position:'bottom',style:'minimal',approved:true}];
  const guide = {
    durationMs,
    aspect,
    fps: 24,
    videoTracks: [{id: 'scenes', layer: 0, clips}],
    audioTracks: [{
      id: 'ambience', kind: 'ambience', assetId: ambience, startMs: 0,
      durationMs, sourceInMs: 0, gainPercent: 30, fadeInMs: 500, fadeOutMs: 800, loop: true,
    }],
    textTracks: [{id: 'titles', items: titleItems}],
  };
  return ['\x60\x60\x60hh-motion-v1', JSON.stringify(guide, null, 2), '\x60\x60\x60'].join('\n');
}

export function createPresetMotionProjectV3(presetId, locale) {
  return importCatalogMotionGuideV3(createPresetMotionGuideV3(presetId,locale),presetId,locale);
}

export function importCatalogMotionGuideV3(markdown,projectId,locale) {
  const guide = parseMotionGuideV3(markdown);
  const {videoTracks,audioTracks} = guide;
  if (!Array.isArray(videoTracks) || videoTracks.length>8 ||
      !Array.isArray(audioTracks) || audioTracks.length>4 ||
      videoTracks.some(track=>!Array.isArray(track?.clips)||track.clips.length>24)) {
    throw new Error('motion_guide_track_limit');
  }
  const sources = [...new Set(videoTracks.flatMap(track=>track.clips.map(clip=>clip?.assetId)))].map(id => {
    const scene = scenesById.get(id);
    if (!isApprovedScene(scene)) {
      throw new Error('motion_guide_unapproved_scene');
    }
    return scene;
  });
  const assets = sources.map(scene => ({
    id: scene.id, kind: 'video', origin: 'catalog', durationMs: SCENE_DURATION_MS,
    width: scene.width, height: scene.height,
  }));
  const approvedAssets = assets.map((asset, index) => ({
    id: asset.id, kind: asset.kind, origin: asset.origin, durationMs: asset.durationMs,
    path: sources[index].video, rightsKind: sources[index].rightsReference?.kind,
    loaded: true, consentConfirmed: false,
  }));
  for (const id of new Set(audioTracks.map(track=>track?.assetId))) {
    if (!['breeze','rain','ocean'].includes(id)) throw new Error('motion_guide_unapproved_audio');
    assets.push({id,kind:'audio',origin:'catalog',durationMs:AMBIENCE_DURATION_MS,width:0,height:0});
    approvedAssets.push({id,kind:'audio',origin:'catalog',durationMs:AMBIENCE_DURATION_MS,
      path:'/audio/mandala/'+id+'.wav',rightsKind:'project_generated_original',
      loaded:true,consentConfirmed:false});
  }
  const project = importMotionGuideV3(markdown,{projectId,locale,assets,approvedAssets});
  if (sources.some(scene => !scene.allowedAspects.includes(project.aspect))) {
    throw new Error('motion_guide_incompatible_aspect');
  }
  return {project, approvedAssets};
}

export function replaceMotionGuideScene(markdown,clipId,assetId,locale) {
  importCatalogMotionGuideV3(markdown,'edited-motion',locale);
  const guide=parseMotionGuideV3(markdown);
  const clip=guide.videoTracks.flatMap(track=>track.clips).find(item=>item.id===clipId);
  if(!clip)throw new Error('motion_guide_unknown_clip');
  clip.assetId=assetId;
  const edited=['\x60\x60\x60hh-motion-v1',JSON.stringify(guide,null,2),'\x60\x60\x60'].join('\n');
  importCatalogMotionGuideV3(edited,'edited-motion',locale);
  return edited;
}

export function moveMotionGuideScene(markdown,clipId,direction,locale) {
  if(direction!==-1&&direction!==1)throw new Error('motion_guide_invalid_direction');
  importCatalogMotionGuideV3(markdown,'edited-motion',locale);
  const guide=parseMotionGuideV3(markdown);
  const track=guide.videoTracks.find(row=>row.clips.some(clip=>clip.id===clipId));
  if(!track)throw new Error('motion_guide_unknown_clip');
  const index=track.clips.findIndex(clip=>clip.id===clipId);
  const current=track.clips[index];
  const adjacent=track.clips[index+direction];
  if(!adjacent)throw new Error('motion_guide_move_outside_track');
  const sourceFields=({assetId,sourceInMs,sourceOutMs,speed,transform,mask,opacityPercent})=>
    ({assetId,sourceInMs,sourceOutMs,speed,transform,mask,opacityPercent});
  const before=sourceFields(current);
  Object.assign(current,sourceFields(adjacent));
  Object.assign(adjacent,before);
  const edited=['\x60\x60\x60hh-motion-v1',JSON.stringify(guide,null,2),'\x60\x60\x60'].join('\n');
  importCatalogMotionGuideV3(edited,'edited-motion',locale);
  return edited;
}
