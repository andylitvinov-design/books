import catalogue from '../../data/video-catalog/free-film-presets-v2.json' with {type:'json'};

import sceneCatalogue from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import {importMotionGuideV3} from './video-project-v3.mjs';

const scenesById = new Map(sceneCatalogue.scenes.map(scene => [scene.id, scene]));

const SCENE_DURATION_MS = 5000;
const CROSSFADE_MS = 500;
const AMBIENCE_DURATION_MS = 8000;
const AMBIENCE_BY_THEME = {health:'ocean',relationships:'rain'};

export function listPresetMotionGuides(locale) {
  return catalogue.presets.map(preset => {
    const first = scenesById.get(preset.clips[0]);
    return {id:preset.id,label:preset.label[locale],
      aspect:first.height>first.width?'portrait':'landscape'};
  });
}

export function createPresetMotionGuideV3(presetId, locale) {
  const preset = catalogue.presets.find(candidate => candidate.id === presetId);
  if (!preset || !['en', 'ru', 'es'].includes(locale)) {
    throw new Error('motion_guide_unknown_preset');
  }
  const firstScene = scenesById.get(preset.clips[0]);
  if (!firstScene) throw new Error('motion_guide_missing_scene');
  const aspect = firstScene.height > firstScene.width ? 'portrait' : 'landscape';
  const clips = preset.clips.map((assetId, index) => ({
    id: 'shot-' + (index + 1),
    assetId,
    startMs: index * (SCENE_DURATION_MS - CROSSFADE_MS),
    durationMs: SCENE_DURATION_MS,
    sourceInMs: 0,
    sourceOutMs: SCENE_DURATION_MS,
    speed: 1,
    opacityPercent: 100,
    transitionIn: index === 0 ? 'cut' : 'crossfade',
    transform: {scale: 1, x: 0, y: 0, rotation: 0},
    mask: 'none',
  }));
  const last = clips.at(-1);
  const durationMs = last.startMs + last.durationMs;
  const ambience = AMBIENCE_BY_THEME[preset.theme] ?? 'breeze';
  const guide = {
    durationMs,
    aspect,
    fps: 24,
    videoTracks: [{id: 'scenes', layer: 0, clips}],
    audioTracks: [{
      id: 'ambience', kind: 'ambience', assetId: ambience, startMs: 0,
      durationMs, sourceInMs: 0, gainPercent: 30, fadeInMs: 500, fadeOutMs: 800, loop: true,
    }],
    textTracks: [{id: 'titles', items: [{
      id: 'opening-title',
      text: preset.label[locale],
      startMs: 0,
      endMs: 3000,
      position: 'bottom',
      style: 'minimal',
      approved: true,
    }]}],
  };
  return ['\x60\x60\x60hh-motion-v1', JSON.stringify(guide, null, 2), '\x60\x60\x60'].join('\n');
}

export function createPresetMotionProjectV3(presetId, locale) {
  const guide = createPresetMotionGuideV3(presetId, locale);
  const preset = catalogue.presets.find(candidate => candidate.id === presetId);
  const sources = [...new Set(preset.clips)].map(id => {
    const scene = scenesById.get(id);
    if (scene?.status !== 'approved' || scene.media !== 'licensed_mp4') {
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
  const ambience = AMBIENCE_BY_THEME[preset.theme] ?? 'breeze';
  assets.push({id: ambience, kind: 'audio', origin: 'catalog',
    durationMs: AMBIENCE_DURATION_MS, width: 0, height: 0});
  approvedAssets.push({id: ambience, kind: 'audio', origin: 'catalog',
    durationMs: AMBIENCE_DURATION_MS, path: '/audio/mandala/' + ambience + '.wav',
    rightsKind: 'project_generated_original', loaded: true, consentConfirmed: false});
  const project = importMotionGuideV3(guide, {projectId: presetId, locale, assets, approvedAssets});
  if (sources.some(scene => !scene.allowedAspects.includes(project.aspect))) {
    throw new Error('motion_guide_incompatible_aspect');
  }
  return {project, approvedAssets};
}
