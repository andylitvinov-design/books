import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const audio = read('components/ocean-practice-audio.ts');
const toggle = read('components/ocean-sound-toggle.tsx');
const reiki = read('components/energywork-ai-learner.tsx');
const guided = read('components/app/course-guided-timer.jsx');

test('ocean sound is created only after a user starts a timer, not during rendering', () => {
  assert.match(audio, /function createOceanSoundscape\(\)/);
  assert.match(audio, /context\.resume\(\)/);
  assert.match(audio, /window\.AudioContext/);
  assert.match(audio, /lowPass\.type = "lowpass"/);
  assert.match(audio, /surf\.loop = true/);
  assert.match(audio, /swell\.frequency\.value = 0\.09/);
  assert.match(audio, /return \{ enabled, supported, play, pause, toggle \}/);
  assert.doesNotMatch(audio, /<audio[^>]*autoplay|fetch\(|new Audio\(/i);
});

test('both timed learning experiences use the same wave sound controls', () => {
  for (const source of [reiki, guided]) {
    assert.match(source, /import \{ useOceanPracticeAudio \}/);
    assert.match(source, /import OceanSoundToggle/);
    assert.match(source, /ocean\.play\(\)/);
    assert.match(source, /ocean\.pause\(\)/);
    assert.match(source, /visibilitychange/);
    assert.match(source, /timerRunning=\{/);
  }
  assert.match(reiki, /slide\.kind === "practice" \? <PracticeTimer/);
  assert.match(guided, /data-course-timer/);
});

test('wave preference is accessible, bilingual, persistent and cleaned up', () => {
  assert.match(toggle, /aria-pressed=\{audio\.supported && audio\.enabled\}/);
  assert.match(toggle, /data-ocean-sound-toggle/);
  assert.match(toggle, /Волны/);
  assert.match(toggle, /Waves/);
  assert.match(audio, /localStorage\.setItem/);
  assert.match(audio, /localStorage\.getItem/);
  assert.match(audio, /document\.addEventListener\("visibilitychange"/);
  assert.match(audio, /soundRef\.current\?\.dispose\(\)/);
  assert.match(audio, /void context\.close\(\)/);
  assert.match(audio, /void context\.suspend\(\)/);
});
