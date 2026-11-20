import test from 'node:test';
import assert from 'node:assert/strict';
import { requiresRealMediaWebKit, requiresStoriesWebKit } from '../lib/ci/merge-check-light.mjs';
const rows=(...files)=>files.map(filename=>({filename,status:'M'}));
test('Mac impact: all physical video, codec, export and voice source must execute',()=>{
 for(const path of [
  'components/mandala-free-video-studio.tsx',
  'components/mandala-video-mobile.module.css',
  'lib/mandala/webcodecs-mp4-export.ts',
  'lib/mandala/recording-codecs.mjs',
  'app/api/holistic-support/voice/route.js',
  'scripts/benchmarking/first-video-live-export.mjs',
  'public/videos/holistic-house/original-motion-v1/film.mp4',
  '.github/workflows/holistic-support-mandala.yml',
  'lib/ci/merge-check-light.mjs',
 ]) assert.equal(requiresRealMediaWebKit(rows(path)),true,path);
});
test('Mac impact: UI-only Ideas, text, CSS and browser assertions skip macOS, retain focused CI',()=>{
 assert.equal(requiresRealMediaWebKit(rows(
  'components/mandala-video-idea-goal.tsx',
  'components/mandala-video-personalization.module.css',
  'lib/mandala/video-personal-goal-composer.mjs',
  'scripts/verify-affirmation-voice-browser.mjs',
  'tests/mandala-ideas-goal-flow.test.mjs'
 )),false);
});
test('Mac impact: Stories Studio always requests five-scene real WebKit acceptance',()=>{
 for(const path of ['lib/mandala/stories-studio.mjs',
    'components/mandala-stories-characters.tsx',
    'scripts/benchmarking/verify-five-scene-stories-browser.mjs']){
   assert.equal(requiresRealMediaWebKit(rows(path)),true,path);
   assert.equal(requiresStoriesWebKit(rows(path)),true,path);
 }
 assert.equal(requiresStoriesWebKit(rows('components/mandala-video-idea-goal.tsx')),false);
});

test('Mac impact: incomplete or malformed candidate does not self-waive media release',()=>{
 for(const source of [null,[],[{filename:'../escape',status:'M'}],
  [{filename:'lib/mandala/audio-export.mjs',status:'R100'}],
  [{filename:'tests/browser.test.mjs',status:'invalid'}]
 ])assert.equal(requiresRealMediaWebKit(source),true);
});
