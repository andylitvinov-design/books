// Browser speech fallback for an explicit user action. No model or transcript is persisted.
// Browser recognition MAY use a vendor's cloud service for live microphone input.
// Uploaded audio is only accepted by this helper when on-device speech is verified.
const LANG = Object.freeze({ru:'ru-RU',en:'en-US',es:'es-ES'});
export const deviceSpeechLanguage = locale => LANG[locale] || LANG.en;
const normalizeText = text => typeof text === 'string' ? text.replace(/\s+/gu,' ').trim() : '';
const round = n => Math.round(n * 100) / 100;

/** Estimates segment boundaries from actual recognition event times, never from a text-only guess. */
export function createSpeechClock(now = () => performance.now()) {
  const begun = now();
  let committed = [];
  let interim = '';
  let seen = new Set();
  return {
    observe(event) {
      const current = [];
      const results = event?.results || [];
      for (let i = 0; i < results.length; i++) {
        const item = results[i];
        const words = normalizeText(item?.[0]?.transcript);
        if (!words) continue;
        if (item.isFinal) {
          if (!seen.has(i)) {
            seen.add(i);
            committed.push({text:words,end:Math.max(.1,(now()-begun)/1000)});
          }
        } else current.push(words);
      }
      interim = current.join(' ');
    },
    newRecognitionSession() { seen = new Set(); },
    finish(duration) {
      if (!Number.isFinite(duration) || duration <= 0 || duration > 180) return null;
      const raw = committed.slice();
      if (interim && !raw.some(part => part.text === interim)) raw.push({text:interim,end:duration});
      const segments = [];
      let start = 0;
      for (const part of raw) {
        if (start >= duration) break;
        const end = Math.min(duration,Math.max(start + .05,part.end));
        if (end <= start || !part.text) continue;
        segments.push({startSeconds:round(start),endSeconds:round(end),text:part.text.slice(0,750)});
        start = end;
      }
      if (!segments.length) return null;
      return {text:segments.map(part=>part.text).join(' ').slice(0,10000),
        durationSeconds:round(duration),segments,timingSource:'estimated'};
    },
  };
}
function getRecognition(){
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/** Start directly from the user's Record click, concurrently with MediaRecorder. */
export function startDeviceVoiceCapture(locale){
  const Constructor = getRecognition();
  if (!Constructor) return null;
  let engine;
  try { engine = new Constructor(); } catch { return null; }
  const clock = createSpeechClock();
  let stopped = false;
  let failed = false;
  let restarts = 0;
  let resolveFinished;
  const finished = new Promise(resolve => {resolveFinished=resolve;});
  engine.lang = deviceSpeechLanguage(locale);
  engine.continuous = true;
  engine.interimResults = true;
  engine.maxAlternatives = 1;
  engine.onresult = event => clock.observe(event);
  engine.onerror = () => { failed = true; resolveFinished(); };
  engine.onend = () => {
    if (!stopped && !failed && restarts < 2) {
      restarts += 1;
      clock.newRecognitionSession();
      try { engine.start(); return; } catch { }
    }
    resolveFinished();
  };
  try { engine.start(); } catch { return null; }
  return {
    async stop(seconds) {
      stopped = true;
      try { engine.stop(); } catch { }
      await Promise.race([finished,new Promise(resolve=>setTimeout(resolve,650))]);
      try { engine.abort(); } catch {}
      engine.onresult = null;engine.onerror = null;engine.onend = null;
      return clock.finish(seconds);
    },
    abort() {
      stopped = true;
      try {engine.abort();} catch {}
      resolveFinished();
    }
  };
}

/**
 * Chrome desktop can transcribe a MediaStreamTrack on device when a language pack
 * is already installed. Safari/iOS cannot accept an audioTrack; fail closed
 * rather than accidentally activating the microphone or a paid cloud provider.
 */
export async function transcribeDeviceAudioFile(file,locale,signal){
  const Constructor = getRecognition();
  if (!Constructor || typeof Constructor.available !== 'function' ||
      typeof window.AudioContext !== 'function')
    throw Error('DEVICE_FILE_STT_UNSUPPORTED');
  if (signal?.aborted) throw Error('AUDIO_STT_ABORTED');
  const language = deviceSpeechLanguage(locale);
  let pack;
  try {pack = await Constructor.available({langs:[language],processLocally:true});}
  catch {throw Error('DEVICE_FILE_STT_UNSUPPORTED');}
  if (pack !== 'available') throw Error('DEVICE_FILE_STT_PACK_NOT_INSTALLED');
  const engine = new Constructor();
  if (!('processLocally' in engine)) throw Error('DEVICE_FILE_STT_UNSUPPORTED');
  engine.processLocally = true;
  engine.lang = language;
  engine.continuous = true;
  engine.interimResults = true;
  engine.maxAlternatives = 1;
  const context = new window.AudioContext();
  let source, destination, track;
  let ended = false;
  let resolveFinished;
  const finished = new Promise(resolve => {resolveFinished=resolve;});
  const clock = createSpeechClock();
  const cancel = () => {
    try {source?.stop();} catch {}
    try {engine.abort();} catch {}
    resolveFinished();
  };
  signal?.addEventListener('abort',cancel,{once:true});
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 59.5)
      throw Error('DEVICE_FILE_STT_DURATION_UNSUPPORTED');
    if (signal?.aborted) throw Error('AUDIO_STT_ABORTED');
    destination = context.createMediaStreamDestination();
    track = destination.stream.getAudioTracks()[0];
    if (!track || track.readyState !== 'live') throw Error('DEVICE_FILE_STT_UNSUPPORTED');
    source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    let providerError = '';
    engine.onresult = event => clock.observe(event);
    engine.onerror = event => {providerError = event?.error || 'recognition';resolveFinished();};
    engine.onend = () => resolveFinished();
    source.onended = () => {
      ended = true;
      try {engine.stop();} catch {}
      setTimeout(resolveFinished,1000);
    };
    engine.start(track);
    await context.resume();
    source.start();
    await Promise.race([finished,new Promise(resolve => setTimeout(resolve,Math.ceil(buffer.duration*1000)+4000))]);
    if (signal?.aborted) throw Error('AUDIO_STT_ABORTED');
    if (providerError) throw Error('DEVICE_FILE_STT_FAILED');
    const transcript = clock.finish(buffer.duration);
    if (!transcript || !ended) throw Error('DEVICE_FILE_STT_FAILED');
    return transcript;
  } finally {
    signal?.removeEventListener('abort',cancel);
    try {source?.stop();} catch {}
    try {engine.abort();} catch {}
    try {track?.stop();} catch {}
    try {await context.close();} catch {}
  }
}
