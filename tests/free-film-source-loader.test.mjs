import test from "node:test";
import assert from "node:assert/strict";
import { prepareFourFilmSources, playableFilmSource } from "../lib/mandala/free-film-source-loader.mjs";

class FakeVideo extends EventTarget {
  constructor() {
    super();
    this.readyState = 0;
    this.videoWidth = 0;
    this.videoHeight = 0;
    this.networkState = 0;
    this.error = null;
    this.preload = "none";
    this.muted = false;
    this.playsInline = false;
    this.loads = 0;
    this.plays = 0;
    this.pauses = 0;
    this._currentTime = 0;
    this.seeking = false;
    this.rewinds = 0;
  }
  get currentTime() { return this._currentTime; }
  set currentTime(value) {
    this._currentTime = value;
    this.seeking = true;
    this.rewinds++;
  }
  finishSeek() {
    this.seeking = false;
    this.dispatchEvent(new Event("seeked"));
  }
  load() { this.loads++; }
  play() {
    this.plays++;
    // Simulate Safari deferring hidden playback even after an explicit tap.
    return Promise.reject(new Error("not_allowed"));
  }
  pause() { this.pauses++; }
  ready() {
    this.readyState = 2;
    this.videoWidth = 480;
    this.videoHeight = 270;
    this.dispatchEvent(new Event("loadeddata"));
  }
  fail() {
    this.error = { code: 3 };
    this.dispatchEvent(new Event("error"));
  }
}

const ids = ["golden-shield", "abundance-tree", "partners", "abundance-circle"];
const shots = ids.map(sceneId => ({ sceneId }));
function setup() {
  const videos = ids.map(() => new FakeVideo());
  return { videos, refs: Object.fromEntries(ids.map((id, i) => [id, videos[i]])) };
}

test("Create immediately primes four real videos on the caller's gesture", async () => {
  const { videos, refs } = setup();
  const progress = [];
  const result = prepareFourFilmSources(shots, refs, {
    timeoutMs: 200, onProgress: (ready, total) => progress.push([ready, total]),
  });
  assert.ok(videos.every(video => video.plays === 1 && video.loads === 1 &&
    video.muted && video.playsInline && video.preload === "auto"));
  videos.forEach(video => video.ready());
  assert.deepEqual(await result, {ready:4,total:4});
  assert.deepEqual(progress[0], [0,4]);
  assert.deepEqual(progress.at(-1), [4,4]);
  assert.ok(videos.every(playableFilmSource));
});

test("a decoded source is not mistaken for a missing scene", async () => {
  const { videos, refs } = setup();
  videos[0].ready();
  const promise = prepareFourFilmSources(shots, refs, { timeoutMs: 200 });
  assert.equal(videos[0].plays, 0);
  assert.equal(videos[0].loads, 0);
  videos.slice(1).forEach(video => video.ready());
  await promise;
});

test("a real decoder error fails closed instead of returning a fake film", async () => {
  const { videos, refs } = setup();
  const promise = prepareFourFilmSources(shots, refs, { timeoutMs: 200 });
  videos[2].fail();
  await assert.rejects(promise, /four_scene_decode_failed:partners/);
});

test("Safari preload stall times out; user can retry with the same players", async () => {
  const { videos, refs } = setup();
  await assert.rejects(
    prepareFourFilmSources(shots, refs, { timeoutMs: 10 }), /four_scene_load_timeout/
  );
  const retry = prepareFourFilmSources(shots, refs, { timeoutMs: 200 });
  videos.forEach(video => video.ready());
  await retry;
  assert.equal(videos[0].plays, 2);
});

test("never accept missing, duplicate or still-only media as ready", async () => {
  const { videos, refs } = setup();
  await assert.rejects(prepareFourFilmSources(shots.slice(0,3), refs), /invalid_four_scene_montage/);
  await assert.rejects(prepareFourFilmSources([shots[0],shots[0],shots[1],shots[2]], refs), /invalid_four_scene_montage/);
  await assert.rejects(prepareFourFilmSources(shots, {}), /four_scene_player_not_mounted/);
  videos[0].readyState = 2;
  assert.equal(playableFilmSource(videos[0]), false, "video dimensions are required");
  videos[0].videoWidth = 480;
  videos[0].videoHeight = 270;
  videos[0].error = {code:3};
  assert.equal(playableFilmSource(videos[0]), false, "decoder error must fail closed");
});

test("Create after preview rewinds all four decoded MP4s and waits for seeked", async () => {
  const { videos, refs } = setup();
  videos.forEach((video, index) => {
    video.ready();
    video._currentTime = index + 1; // Previous 4-shot preview already advanced.
  });
  const progress = [];
  let completed = false;
  const pending = prepareFourFilmSources(shots, refs, {
    timeoutMs: 200, onProgress: ready => progress.push(ready),
  }).then(() => { completed = true; });
  assert.ok(videos.every(video =>
    video.rewinds === 1 && video.currentTime === 0 && video.seeking && video.pauses === 1
  ));
  await Promise.resolve();
  assert.equal(completed, false, "loadeddata alone is not a completed decoder seek");
  videos.forEach(video => video.finishSeek());
  await pending;
  assert.equal(completed, true);
  assert.equal(progress.at(-1), 4);
});

test("unseekable old preview frames never become an exported montage", async () => {
  const { videos, refs } = setup();
  videos.forEach(video => video.ready());
  Object.defineProperty(videos[1], "currentTime", {
    get() { return 4; },
    set() { throw Error("seek denied"); },
  });
  await assert.rejects(
    prepareFourFilmSources(shots, refs, {timeoutMs: 200}),
    /four_scene_rewind_failed:abundance-tree/,
  );
});

test("a missing seeked event after rewind times out rather than certifying stale frames", async () => {
  const { videos, refs } = setup();
  videos.forEach(video => {
    video.ready();
    video._currentTime = 3;
  });
  await assert.rejects(
    prepareFourFilmSources(shots, refs, {timeoutMs: 10}),
    /four_scene_load_timeout/,
  );
});
