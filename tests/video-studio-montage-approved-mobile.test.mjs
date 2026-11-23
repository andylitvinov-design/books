import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const studio=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../components/mandala-montage-approved.module.css',import.meta.url),'utf8');

test('photo-first Montage uses the original editor, native iPhone input and real private gallery',()=>{
  assert.match(studio,/data-video-montage-photo-fold=/);
  assert.match(studio,/data-video-montage-photo-upload/);
  assert.match(studio,/data-video-montage-photo-options/);
  assert.match(studio,/data-video-montage-photo-choice=\{item\.id\}/);
  assert.match(studio,/id:"animate",tab:"animated",price:250/);
  assert.match(studio,/id:"library",tab:"personal",price:100/);
  assert.match(studio,/id:"coach",tab:"coaches",price:0/);
  assert.match(studio,/data-video-montage-library-tab=\{item\.id\}/);
  assert.match(studio,/data-video-montage-library-panel=\{montageLibraryTab\}/);
  assert.match(studio,/data-video-montage-coach=\{item\.id\}/);
  assert.match(studio,/data-video-montage-saved-photos/);
  assert.match(studio,/<VideoPhotoLibrary locale=\{locale\} compact/);
  assert.match(studio,/href=\{"\/"\+locale\+"\/app\/videos\?tab=photos"\}/);
  const start=studio.indexOf('data-video-montage-effects>');
  const end=studio.indexOf('data-video-montage-audio>',start);
  const step=studio.slice(start,end);
  assert.match(step,/<NativePhotoInput label=/,'real native input at main upload label');
  assert.equal((studio.match(/<NativePhotoInput label=/g)||[]).length,4,
    "one main Montage input plus three original native iPhone pickers");
  assert.doesNotMatch(step,/onPickPhoto\(\)/,'no scripted iOS picker inside Montage photo step');
  assert.match(step,/data-video-montage-photo-rights/);
  assert.match(step,/data-video-montage-next="audio"/);
  assert.match(step,/data-video-montage-more-styles/);
  assert.match(step,/data-video-montage-aspect-switch/);
  assert.match(step,/data-video-montage-style=\{index\}/);
  assert.match(step,/data-video-montage-library-scene=\{index\}/);
  assert.match(css,/\.photoChoices\{display:grid;grid-template-columns:1fr/);
  assert.match(css,/\.photoOption\{/);
  assert.match(css,/\.photoUploadHero\{/);
  assert.match(css,/\.coachRail\{/);
  assert.match(css,/\.photoStage\[data-video-montage-photo-fold="true"\]/);
});
test('photo options disclose unavailable AI, enforce rights and do not silently charge XP',()=>{
  const start=studio.indexOf('data-video-montage-effects>');
  const end=studio.indexOf('data-video-montage-audio>',start);
  const step=studio.slice(start,end);
  assert.match(step,/montagePhotoChoice==="animate"/);
  assert.match(step,/Face animation is not payment-enabled/);
  assert.match(step,/!photoConsent/);
  assert.match(step,/montagePhotoChoice==="coach"&&\(!montageCoachPhoto\|\|!photoUrl\)/);
  assert.match(step,/Photo-mode XP is indicative/);
  assert.doesNotMatch(step,/postVideoCreditAction\(|heygen\.ai\/v\d/i);
  assert.match(studio,/image\.src="\/images\/holistic-house\/my-coach-motion\/"\+id\+"-still\.webp"/);
  assert.match(studio,/canvas\.toBlob\(resolve,"image\/jpeg",0\.9\)/);
  assert.match(studio,/selectNativePhoto\(new File\(\[blob\],id\+"-coach\.jpg"/);
  assert.doesNotMatch(studio,/\bfetch\s*\(/,'editor retains no direct fetch call');
});
test('Montage Audio has one-row music filters and readable rows without album art',()=>{
  const start=studio.indexOf('data-video-montage-audio-columns>');
  const end=studio.indexOf('data-video-audio-compact-selected',start);
  assert.ok(start>=0&&end>start);
  const audio=studio.slice(start,end);
  assert.match(audio,/data-video-audio-category=\{item.id\}/);
  assert.match(audio,/data-video-audio-compact-track=\{id\}/);
  assert.match(audio,/data-video-audio-compact-play=\{id\}/);
  assert.match(audio,/data-video-audio-compact-select=\{id\}/);
  assert.match(audio,/playQuickTrack\(id\)/);
  assert.match(audio,/toggleQuickMusic\(id\)/);
  assert.match(audio,/data-video-montage-voice-record/);
  assert.match(audio,/startMicRecording\(\)/);
  assert.match(audio,/stopMicRecording\(\)/);
  assert.match(audio,/data-video-audio-compact-upload/);
  assert.doesNotMatch(audio,/<img\s+src=\{poster\}/);
  assert.match(css,/\.filterRail\{[^}]*flex-wrap:nowrap/s);
  assert.match(css,/\.filterRail\{[^}]*overflow-x:auto/s);
  assert.match(css,/\.trackMeta strong\{/);
  assert.match(css,/\.trackPlay\{/);
});
test('only the existing multitrack editor is used for visuals/music/voice and real music offset',()=>{
  assert.match(studio,/const sharedMontageTimeline = \(/);
  assert.match(studio,/data-video-montage-shared-timeline/);
  assert.match(studio,/activeWorkspace==="editor"&&montagePanel==="audio"\?/);
  assert.ok(studio.indexOf('data-video-montage-shared-timeline')>
    studio.indexOf('className={videoStyles.montageAudioWarning}'),
    'timeline is a sibling *after* the Audio panel, not nested in Settings');
  assert.equal((studio.match(/\{sharedMontageTimeline\}/g)||[]).length,1,
    'one relocated Montage timeline; PRO reuses the variable without a duplicate editor');
  assert.match(studio,/activeWorkspace==="pro"\?sharedMontageTimeline:null/);
  assert.match(studio,/onChangeAudioStart=\{seconds=>/);
  assert.match(studio,/setAudioStartSeconds\(clampTrackSecond/);
  assert.match(studio,/musicBed=\{attachedAudio/);
  assert.match(studio,/data-video-audio-compact-rights/);
  assert.match(studio,/data-video-audio-compact-attach/);
  assert.match(css,/\.timelineLayer\{/);
});
test('mobile-safe sizes, scoping and EN/RU/ES parity',()=>{
  assert.match(css,/@media\(max-width:359px\)/);
  assert.match(css,/@media\(min-width:700px\)/);
  assert.match(css,/\.photoChoices\{display:grid;grid-template-columns:1fr/s);
  assert.match(css,/\.audioColumns\{[^}]*grid-template-columns:/s);
  assert.match(css,/\.stepStrip button\{[^}]*min-height:46px/s);
  for(const phrase of ['"Создайте живое фото"','"Crea tu foto viva"','"Create Your Living Photo"',
    '"Выбрать музыку"','"Elegir música"','"Choose Music Track"',
    '"Записать аудиопожелание"','"Grabar un mensaje"','"Record a Voice Wish"']){
    assert.ok(studio.includes(phrase),phrase);
  }
});

test('owner 23 Nov actual Montage screen has hero, two-column upload and thumbnail rail, CTA last',()=>{
  assert.match(studio,/data-video-montage-living-hero/);
  assert.match(studio,/data-video-montage-photo-workspace/);
  const start=studio.indexOf('data-video-montage-effects>');
  const end=studio.indexOf('data-video-montage-audio>',start);
  const step=studio.slice(start,end);
  assert.match(step,/<VideoPhotoLibrary locale=\{locale\} compact rail/);
  assert.ok(step.indexOf('data-video-montage-more-styles')<step.indexOf('data-video-montage-next="audio"'));
  assert.ok(step.indexOf('actualPriceNote')<step.indexOf('data-video-montage-next="audio"'));
  assert.match(css,/\.photoWorkspace\{display:grid;grid-template-columns:minmax/);
  assert.match(css,/\.livingHero::after/);
  assert.match(css,/data-client-photo-rail/);
  const gallery=readFileSync(new URL('../components/app/video-photo-library.jsx',import.meta.url),'utf8');
  assert.match(gallery,/if\(!opened&&!rail\)return/);
  assert.match(gallery,/data-client-photo-rail aria-label/);
  assert.match(gallery,/photos\.map\(photo=><button/);
  assert.match(gallery,/void usePhoto\(photo\.id\)/);
});
