import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const audioSource = read("lib/mandala/local-video-music.ts");
const studioSource = read("components/mandala-free-video-studio.tsx");

function makeAudioHarness({ failResume = false, playbackSupported = true } = {}) {
  const compiled = ts.transpileModule(audioSource, {
    fileName: "local-video-music.ts", reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const contexts = [];
  class Param {
    constructor() { this.value = 0; this.calls = []; }
    setValueAtTime(value) { this.value = value; this.calls.push(["set", value]); }
    linearRampToValueAtTime(value) { this.value = value; this.calls.push(["ramp", value]); }
    setTargetAtTime(value) { this.value = value; this.calls.push(["target", value]); }
    cancelScheduledValues() { this.calls.push(["cancel"]); }
  }
  class Node {
    constructor() { this.connections = []; this.disconnected = false; }
    connect(target) { this.connections.push(target); return target; }
    disconnect() { this.disconnected = true; }
  }
  class Context {
    constructor() {
      this.state = "suspended"; this.currentTime = 0; this.destination = new Node();
      this.gains = []; this.voices = []; this.closed = false;
      contexts.push(this);
    }
    createMediaStreamDestination() {
      this.track = { readyState: "live", stopped: false,
        stop() { this.stopped = true; this.readyState = "ended"; } };
      this.mediaDestination = new Node();
      this.mediaDestination.stream = { getAudioTracks: () => [this.track] };
      return this.mediaDestination;
    }
    createGain() { const node = new Node(); node.gain = new Param(); this.gains.push(node); return node; }
    createOscillator() {
      const osc = new Node();
      osc.frequency = { value: 0 }; osc.started = false; osc.stopped = false;
      osc.start = () => { osc.started = true; };
      osc.stop = () => { osc.stopped = true; };
      this.voices.push(osc);
      return osc;
    }
    resume() {
      if (failResume) return Promise.reject(new Error("Audio route interrupted"));
      this.state = "running"; return Promise.resolve();
    }
    close() { this.closed = true; return Promise.resolve(); }
  }
  const audioSession = { type: "ambient" };
  const navigator = playbackSupported ? { audioSession } : {};
  const exports = {};
  new Function("exports", "window", "navigator", compiled.outputText)(
    exports, { AudioContext: Context }, navigator,
  );
  return { start: exports.startAmbientMusic, contexts, audioSession };
}

test("iPhone silent mode: explicit preview switches to media playback, audible gain and restores previous session", async () => {
  const h = makeAudioHarness();
  const session = await h.start("prosperity", 30, true);
  assert.ok(session);
  const ctx = h.contexts[0];
  assert.equal(h.audioSession.type, "playback");
  assert.equal(ctx.state, "running");
  assert.ok(ctx.gains[0].connections.includes(ctx.destination), "preview connects to speakers");
  assert.ok(ctx.gains[0].connections.includes(ctx.mediaDestination), "same graph has recorded audio output");
  assert.equal(ctx.gains[0].gain.value, 0.15, "30% has a usable, capped default level");
  assert.equal(ctx.voices.length, 8, "all four tones and their modulation sources started");
  assert.ok(ctx.voices.every(v => v.started));

  session.setVolume(70);
  assert.equal(ctx.gains[0].gain.value, 0.35, "moving slider changes live gain without restarting");
  session.setVolume(0);
  assert.equal(ctx.gains[0].gain.value, 0, "0% really mutes");
  session.fadeOut();
  assert.equal(ctx.gains[0].gain.value, 0);
  session.close();
  session.close();
  assert.ok(ctx.closed && ctx.track.stopped && ctx.voices.every(v => v.stopped));
  assert.equal(h.audioSession.type, "ambient", "do not leave site audio session in playback mode");
});

test("export has the same audio track but does not send sound to device speakers", async () => {
  const h = makeAudioHarness();
  const session = await h.start("harmony", 100);
  const ctx = h.contexts[0];
  assert.ok(session?.track === ctx.track);
  assert.equal(ctx.gains[0].gain.value, 0.5, "100% remains within bounded gain");
  assert.ok(ctx.gains[0].connections.includes(ctx.mediaDestination));
  assert.ok(!ctx.gains[0].connections.includes(ctx.destination), "export not an unsolicited speaker playback");
  assert.equal(h.audioSession.type, "playback");
  session.close();
  assert.equal(h.audioSession.type, "ambient");
});

test("resume failure returns no fake playing session and restores iOS routing", async () => {
  const h = makeAudioHarness({ failResume: true });
  const session = await h.start("energy", 30, true);
  assert.equal(session, null);
  assert.equal(h.audioSession.type, "ambient");
  assert.ok(h.contexts[0].closed);
  const legacy = makeAudioHarness({ playbackSupported: false });
  const running = await legacy.start("love", 30, true);
  assert.ok(running, "older browsers can still play with the original fallback path");
  running.close();
});

test("recording negotiates a real AAC/Opus mux and never silently removes a selected track", () => {
  assert.match(studioSource, /recordingMimes\(Boolean\(musicSession\)\)/);
  assert.match(studioSource, /mp4a\.40\.2/);
  assert.match(studioSource, /vp8,opus/);
  assert.match(studioSource, /stream\.addTrack\(musicSession\.track\)/);
  assert.match(studioSource, /new MediaRecorder\(stream,recorderOptions\)/);
  assert.match(studioSource, /if \(!recorder\)[\s\S]*?setMusicWarning\(ui\.musicFallback\)/);
  assert.doesNotMatch(studioSource, /stream\.getAudioTracks\(\)\.forEach\(track=>\{stream\?\.removeTrack/);
  assert.match(studioSource, /soundPreviewRef\.current\?\.setVolume\(value\)/);
  assert.match(studioSource, /data-video-music-preview/);
  assert.match(studioSource, /stopHiddenPreview/);
  for (const locale of ["en:", "ru:", "es:"]) assert.match(studioSource, new RegExp(locale));
});
