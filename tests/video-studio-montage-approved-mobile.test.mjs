import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const studio=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../components/mandala-montage-approved.module.css',import.meta.url),'utf8');

test('owner-approved Montage Style is the existing editor, not a second page',()=>{
  assert.match(studio,/data-video-montage-effects/);
  assert.match(studio,/data-video-montage-progress/);
  assert.match(studio,/data-video-montage-progress-step=\{item.step\}/);
  assert.match(studio,/data-video-montage-photo-choice="animate"/);
  assert.match(studio,/data-video-montage-photo-choice="library"/);
  assert.match(studio,/data-video-montage-photo-options/);
  assert.match(studio,/data-video-montage-avatar-library/);
  assert.match(studio,/data-video-montage-photo-upload/);
  assert.match(studio,/data-video-montage-current-photo/);
  assert.match(studio,/data-video-montage-library-scene=\{index\}/);
  assert.match(studio,/500 XP/);
  assert.match(studio,/250 XP/);
  assert.match(studio,/onPhotoFileSelected\(photo\)/);
  assert.match(studio,/data-video-montage-photo-rights/);
  assert.match(studio,/data-video-montage-next="audio"/);
  assert.match(studio,/data-video-montage-more-styles/);
  assert.match(studio,/data-video-montage-style=\{index\}/);
  assert.match(studio,/data-video-montage-aspect-switch/);
});
test('AI-photo selection never triggers an unapproved HeyGen spend or silent still export',()=>{
  const style=studio.slice(studio.indexOf('data-video-montage-effects>'),
    studio.indexOf('{montagePanel==="audio" ? <div'));
  assert.match(style,/montagePhotoChoice==="animate"/);
  assert.match(style,/disabled=\{recording\|\|preparing\|\|montagePhotoChoice==="animate"/);
  assert.match(style,/HeyGen face animation is not yet payment-enabled/);
  assert.match(style,/No XP is charged here/);
  assert.doesNotMatch(style,/heygen\.ai\/v\d|postVideoCreditAction\(/i);
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
  assert.match(css,/\.photoChoices\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css,/\.audioColumns\{[^}]*grid-template-columns:/s);
  assert.match(css,/\.stepStrip button\{[^}]*min-height:46px/s);
  for(const phrase of ['"Добавьте фотографию"','"Añade tu foto"','"Add Your Photo"',
    '"Выбрать музыку"','"Elegir música"','"Choose Music Track"',
    '"Записать аудиопожелание"','"Grabar un mensaje"','"Record a Voice Wish"']){
    assert.ok(studio.includes(phrase),phrase);
  }
});
