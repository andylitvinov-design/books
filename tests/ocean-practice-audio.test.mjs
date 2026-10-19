import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const audio = read('components/ocean-practice-audio.ts');
const toggle = read('components/ocean-sound-toggle.tsx');
const reiki = read('components/energywork-ai-learner.tsx');
const guided = read('components/app/course-guided-timer.jsx');
const outro = read('components/app/opora-ocean-outro.jsx');
const assetPath = 'public/audio/holistic-house-soft-melody-gentle-waves-20s.wav';

test('original, gently mixed melody and light waves have valid and safe WAV dynamics', () => {
  const wav = readFileSync(new URL('../' + assetPath, import.meta.url));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.toString('ascii', 12, 16), 'fmt ');
  assert.equal(wav.readUInt16LE(20), 1, 'PCM');
  assert.equal(wav.readUInt16LE(22), 1, 'mono');
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.toString('ascii', 36, 40), 'data');
  const frames = wav.readUInt32LE(40) / 2;
  assert.ok(frames >= 20 * 24000);
  assert.equal(wav.length, 44 + frames * 2);
  let power = 0, max = 0;
  for (let at = 44; at < wav.length; at += 2) {
    const v = wav.readInt16LE(at) / 32768;
    power += v * v;
    max = Math.max(max, Math.abs(v));
  }
  const rms = Math.sqrt(power / frames);
  assert.ok(rms > 0.025 && rms < 0.08, 'Soft melody should be audible without the harsh previous loudness');
  assert.ok(max < 0.35, 'Soft soundtrack has comfortable, low peaks even on iOS');
  assert.ok(Math.abs(wav.readInt16LE(44) - wav.readInt16LE(wav.length - 2)) < 1500,
    'Loop seam must not create a noticeable click');
});

test('wave playback uses native iPhone media, not muted WebAudio oscillators', () => {
  assert.match(audio, /holistic-house-ocean-waves-ambient-20s\.wav/);
  assert.match(audio, /new window\.Audio\(OCEAN_LOOP\)/);
  assert.match(audio, /audio\.loop = true/);
  assert.match(audio, /audio\.muted = false/);
  assert.match(audio, /audio\.volume = 0\.65/);
  assert.match(audio, /await audio\.play\(\)/);
  assert.match(audio, /onStatus\("blocked"\)/);
  assert.match(audio, /return false/);
  assert.match(audio, /return soundRef\.current\.play\(\)/);
  assert.doesNotMatch(audio, /new AudioContext|createOscillator|context\.resume\(\)/);
  assert.doesNotMatch(audio, /autoplay|new window\.Audio\(.*\)\.play\(\)/i);
});

test('anti-stress, Reiki and other guided timers wait for audible playback', () => {
  for (const source of [reiki, guided, outro]) {
    assert.match(source, /useOceanPracticeAudio/);
    assert.match(source, /await (ocean|audio)\.play\(\)/);
    assert.match(source, /document\.hidden/);
    assert.match(source, /visibilitychange/);
    assert.match(source, /status/);
  }
  for (const source of [reiki, guided]) {
    assert.match(source, /import OceanSoundToggle/);
    assert.match(source, /ocean\.pause\(\)/);
    assert.match(source, /timerRunning=\{/);
    assert.match(source, /"blocked"|'blocked'/);
  }
  assert.match(outro, /audio\.reset\(\)/);
  assert.match(outro, /audio\.status==='blocked'/);
  assert.match(reiki, /slide\.kind === "practice" \? <PracticeTimer/);
  assert.match(guided, /data-course-timer/);
});

test('sound preference remains accessible and survives slides without leaking audio', () => {
  assert.match(toggle, /aria-pressed=\{audio\.supported && audio\.enabled\}/);
  assert.match(toggle, /data-ocean-sound-toggle/);
  assert.match(toggle, /Волны/);
  assert.match(toggle, /Waves/);
  assert.match(audio, /localStorage\.setItem/);
  assert.match(audio, /localStorage\.getItem/);
  assert.match(audio, /document\.addEventListener\("visibilitychange"/);
  assert.match(audio, /soundRef\.current\?\.dispose\(\)/);
  assert.match(audio, /audio\.removeEventListener\("pause"/);
  assert.match(audio, /audio\.removeAttribute\("src"\)/);
});
