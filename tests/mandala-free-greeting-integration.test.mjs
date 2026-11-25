import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const editor=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8');
const panel=readFileSync(new URL('../components/mandala-free-greeting.tsx',import.meta.url),'utf8');

test('30-character free panel is visible before existing PRO free-generate action',()=>{
  assert.match(editor,/activeWorkspace==="pro"\?<MandalaFreeGreeting/);
  assert.match(editor,/sceneKey=\{greetingSceneKey\} theme=\{theme\}/);
  assert.ok(editor.indexOf('activeWorkspace==="pro"?<MandalaFreeGreeting')<editor.indexOf('<MandalaProEnhance locale={locale}'));
  assert.match(editor,/selected=\{greetingCharacter\}/);
  assert.match(editor,/onPreview=\{\(\)=>\{/);
  assert.match(panel,/data-greeting-option="auto"/);
  assert.match(panel,/data-greeting-option="none"/);
  assert.match(panel,/data-greeting-mode="greeting"/);
  assert.match(panel,/data-greeting-mode="support"/);
  assert.match(panel,/0 дополнительных XP/);
  assert.match(panel,/0 extra XP/);
  assert.match(panel,/0 XP adicionales/);
});

test('greeting uses the exact same preview and both export renderers',()=>{
  assert.match(editor,/data-mandala-cinematic-canvas/);
  const actual=[...editor.matchAll(/paintFreeGreeting\(ctx,(previewSeekSeconds|elapsed|0|time|frameTime),duration,greetingCharacter,aspect,greetingSceneKey,theme\);/g)].map(x=>x[1]);
  assert.deepEqual(actual.sort(),['0','elapsed','frameTime','previewSeekSeconds','time'].sort());
  assert.match(editor,/greetingCharacter!=="none"\|\|/);
  // Preserve the original affirmation export-signature contract while the
  // extra selection still invalidates stale rendered video on every change.
  assert.match(editor,/shot\.sourceSpeed\?\?1\]\),appliedStory,\s*creationMode/);
  assert.match(editor,/currentFreeVideoPlan\?\.reducedMotion,professionalMode,greetingCharacter,greetingSceneKey,storyboardPhotoRevision\]\)/);
  assert.match(editor,/freeFilmReady, appliedStory, greetingCharacter, greetingSceneKey,/);
  assert.match(editor,/const greetingSceneKey=cinematicPlan\?\.shots\.slice\(-1\)\[0\]/);
  assert.match(editor,/activeWorkspace==="ready"\?<MandalaVideoReady/);
});

test('tap-to-preview and selection are distinct opt-in events, no automatic XP charge',()=>{
  assert.match(editor,/setGreetingCharacter\(character\)/);
  assert.match(editor,/setPreviewSeekSeconds\(at\);setPreviewPlayhead\(at\)/);
  assert.match(editor,/setPreviewPlaying\(true\)/);
  assert.match(editor,/if\(attachedAudio\)startMovieSound\(attachedAudio,soundVolume,at\)/);
  assert.doesNotMatch(panel,/postVideoCreditAction|videoCreditRequest|fetch\(/);
  for(const locale of ['ru','en','es'])assert.match(panel,new RegExp(`(?:^|\\n)  ${locale}:\\{`));
});

test('all 30 genuinely rendered choices sit directly on the first PRO screen without nested tabs or modal',()=>{
  assert.match(panel,/data-greeting-choices=\{mode\}/);
  assert.match(panel,/data-greeting-option=\{entry.id\}/);
  assert.match(panel,/FREE_GREETING_CATALOG\]\.sort/);
  assert.match(panel,/data-greeting-purpose=\{mode\}/);
  assert.match(panel,/role="group"/);
  assert.match(panel,/aria-pressed=\{selected===entry.id\}/);
  assert.match(panel,/IntersectionObserver/);
  assert.doesNotMatch(panel,/<dialog|showModal\(|data-greeting-filter=|data-story-addon-tab/);
  assert.match(panel,/data-greeting-preview/);
});
