/**
 * Music → MV: private, deterministic rhythm detection and four-shot cut planning.
 * It never uploads/retains audio and never invents licensed footage or vocals.
 * Only explicit approved, first-party recording paths may be fetched for analysis.
 * The caller decodes the visitor's approved PCM with Web Audio after a click.
 */
export const MUSIC_MV_MAX_SECONDS = 60;
export const MUSIC_MV_MAX_FILE_BYTES = 8 * 1024 * 1024;
const allowedLengths = new Set([10, 15, 20, 30, 60]);
/** The main Studio deliberately has no raw network access for private songs.
 * This helper only reads a reviewed, same-origin static music master.
 * No arbitrary URL, redirect to a third-party host or private upload. */
export async function readApprovedMusicMaster(url) {
  const prefix="/audio/mandala/curated/";
  const basename=typeof url==="string"&&url.startsWith(prefix)?url.slice(prefix.length):"";
  if(!/^curated-[a-z0-9-]+[.]mp3$/.test(basename))
    throw Error("music_mv_unapproved_master");
  const response=await fetch(url,{cache:"force-cache",redirect:"error",credentials:"same-origin"});
  if(!response.ok)throw Error("music_mv_missing_master");
  const size=Number(response.headers.get("content-length"));
  if(Number.isFinite(size)&&size>MUSIC_MV_MAX_FILE_BYTES)throw Error("music_mv_master_too_large");
  const bytes=await response.arrayBuffer();
  if(!bytes.byteLength||bytes.byteLength>MUSIC_MV_MAX_FILE_BYTES)
    throw Error("music_mv_master_too_large");
  return bytes;
}

const round = value => Math.round(value * 100) / 100;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

/** Detect real local amplitude attacks at 40ms resolution. BPM is an estimate,
 * emitted only when repeated attacks agree on a credible periodic pulse. */
export function analyzeMusicRhythm(channel, sampleRate, durationSeconds) {
  if (!(channel instanceof Float32Array) || !Number.isFinite(sampleRate) ||
      sampleRate < 8000 || sampleRate > 192000 ||
      !allowedLengths.has(durationSeconds)) throw Error('invalid_music_mv_audio');
  const sampleCount = Math.min(channel.length, Math.floor(sampleRate * durationSeconds));
  if (sampleCount < sampleRate * (durationSeconds - 0.1)) throw Error('music_mv_audio_too_short');
  const hop = Math.max(1, Math.round(sampleRate * 0.04));
  const stride = Math.max(1, Math.floor(sampleRate / 3200));
  const count = Math.floor(sampleCount / hop);
  const rms = new Float32Array(count);
  for (let bin = 0; bin < count; bin++) {
    let power = 0, valid = 0;
    const stop = Math.min(sampleCount, (bin + 1) * hop);
    for (let i = bin * hop; i < stop; i += stride) {
      const value = channel[i];
      if (Number.isFinite(value)) { power += value * value; valid++; }
    }
    rms[bin] = valid ? Math.sqrt(power / valid) : 0;
  }
  const rises = new Float32Array(count);
  let maxRise = 0;
  for (let i = 2; i < count - 1; i++) {
    const rise = Math.max(0, rms[i] - (rms[i - 1] + rms[i - 2]) / 2);
    rises[i] = rise;
    maxRise = Math.max(maxRise, rise);
  }
  if (maxRise < 0.005) return {bpm: null, confidence: 0, beats: []};
  const threshold = Math.max(0.004, maxRise * 0.2);
  const candidates = [];
  for (let i = 2; i < count - 2; i++) {
    const rise = rises[i];
    if (rise < threshold || rise < rises[i - 1] || rise < rises[i + 1]) continue;
    const at = round(i * hop / sampleRate);
    const strength = round(clamp(rise / maxRise, 0, 1));
    const last = candidates[candidates.length - 1];
    if (last && at - last.seconds < 0.16) {
      if (strength > last.strength) candidates[candidates.length - 1] = {seconds: at, strength};
    } else candidates.push({seconds: at, strength});
  }
  if (candidates.length < 5) return {bpm: null, confidence: 0, beats: candidates};
  // Search for a recurring pulse using pairwise attack intervals, then verify
  // the phase against all attacks. No fabricated metronome events are added.
  const intervals = new Float64Array(181);
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < Math.min(candidates.length, i + 7); j++) {
      const delta = candidates[j].seconds - candidates[i].seconds;
      if (delta > 1.02) break;
      if (delta < 0.33) continue;
      const bpm = Math.round(60 / delta);
      if (bpm >= 60 && bpm <= 180)
        intervals[bpm] += Math.min(candidates[i].strength, candidates[j].strength);
    }
  }
  let bestBpm = null, bestAgreement = 0;
  const totalStrength = candidates.reduce((sum, item) => sum + item.strength, 0);
  for (let bpm = 60; bpm <= 180; bpm++) {
    const beatSeconds = 60 / bpm;
    for (const anchor of candidates.slice(0, 15)) {
      let agreement = 0;
      for (const attack of candidates) {
        const beatsFromAnchor = (attack.seconds - anchor.seconds) / beatSeconds;
        const phaseError = Math.abs(beatsFromAnchor - Math.round(beatsFromAnchor)) * beatSeconds;
        if (phaseError <= 0.085) agreement += attack.strength;
      }
      const confidence = totalStrength ? agreement / totalStrength : 0;
      if (confidence > bestAgreement + 0.0001 ||
          (Math.abs(confidence - bestAgreement) <= 0.0001 &&
           intervals[bpm] > (bestBpm ? intervals[bestBpm] : 0))) {
        bestAgreement = confidence; bestBpm = bpm;
      }
    }
  }
  const stable = bestAgreement >= 0.55 && candidates.length >= 7;
  return {bpm: stable ? bestBpm : null, confidence: stable ? round(bestAgreement) : 0,
    beats: candidates};
}

/** Align only existing distinct, rights-checked shots. Preserve text, motion,
 * order and the exact duration; no source is substituted or generated. */
export function planMusicVideoCuts(durationSeconds, shots, rhythm) {
  if (!allowedLengths.has(durationSeconds) || !Array.isArray(shots) || shots.length !== 4 ||
      shots.some(shot => !shot || typeof shot.sceneId !== 'string' || !shot.sceneId ||
        !Number.isFinite(shot.startSeconds) || !Number.isFinite(shot.durationSeconds)) ||
      new Set(shots.map(shot => shot.sceneId)).size !== 4 ||
      !rhythm || !Array.isArray(rhythm.beats) ||
      rhythm.beats.length > 600 ||
      rhythm.beats.some(beat => !Number.isFinite(beat.seconds) ||
        beat.seconds < 0 || beat.seconds > durationSeconds ||
        !Number.isFinite(beat.strength) || beat.strength < 0 || beat.strength > 1))
    throw Error('invalid_music_mv_plan');
  const baseline = shots.slice(1).map(shot => shot.startSeconds);
  if (baseline.some((t, i) => !Number.isFinite(t) ||
    t < 2 * (i + 1) || t > durationSeconds - 2 * (3 - i) ||
    (i > 0 && t - baseline[i - 1] < 2)))
    return {status:'invalid_timeline', shots, cuts:[], confidence:0};
  if (!rhythm.beats.length) return {status:'no_clear_beats', shots, cuts:[], confidence:0};
  const radius = clamp(durationSeconds * 0.16, 2, 6);
  const choices = baseline.map(target => rhythm.beats
    .filter(beat => beat.strength >= 0.2 && Math.abs(beat.seconds - target) <= radius)
    .map(beat => ({...beat, score: beat.strength * 4 - Math.abs(beat.seconds - target) * 0.32}))
    .sort((a, b) => b.score - a.score || a.seconds - b.seconds).slice(0, 10));
  if (choices.some(group => group.length === 0))
    return {status:'no_clear_beats', shots, cuts:[], confidence:0};
  let best = null, bestScore = -Infinity;
  for (const a of choices[0]) for (const b of choices[1]) for (const c of choices[2]) {
    if (a.seconds < 2 || b.seconds - a.seconds < 2 ||
        c.seconds - b.seconds < 2 || durationSeconds - c.seconds < 2) continue;
    const score = a.score + b.score + c.score;
    if (score > bestScore + 0.000001) {best = [a, b, c]; bestScore = score;}
  }
  if (!best) return {status:'no_valid_timing', shots, cuts:[], confidence:0};
  const cuts = best.map(item => item.seconds);
  const at = [0, ...cuts, durationSeconds];
  const aligned = shots.map((shot, i) => ({...shot,
    startSeconds:round(at[i]), durationSeconds:round(at[i + 1] - at[i])}));
  return {status:cuts.every((t, i) => Math.abs(t - baseline[i]) < 0.03)
    ? 'already_aligned' : 'audio_aligned',
    shots:aligned, cuts, confidence:round(best.reduce((sum, item) => sum + item.strength, 0) / 3)};
}
