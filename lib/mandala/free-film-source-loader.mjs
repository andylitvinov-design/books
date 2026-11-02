/**
 * Prepare the four licensed, same-origin MP4 masters for the existing Canvas
 * film renderer. Safari may ignore preload="auto" on hidden <video> elements:
 * prime muted playback synchronously from the user's Create tap instead of
 * permanently disabling that tap while waiting for passive video decoding.
 *
 * This never fetches client data, fabricates frames or marks unreadable movies
 * as ready. The renderer still verifies each real video frame before export.
 */
export function playableFilmSource(video) {
  return Boolean(video && !video.error &&
    video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0);
}

// A reused preview decoder can already be at second 5 or 10. Never export
// a new montage from those stale positions just because loadeddata fired.
const START_TOLERANCE_SECONDS = 0.08;

export function prepareFourFilmSources(shots, playersById, options = {}) {
  const { onProgress = () => {}, timeoutMs = 20000 } = options;
  const ids = Array.isArray(shots) ? shots.map(shot => shot?.sceneId) : [];
  if (ids.length !== 4 || ids.some(id => typeof id !== "string" || !id) ||
      new Set(ids).size !== 4) {
    return Promise.reject(new Error("invalid_four_scene_montage"));
  }
  const videos = ids.map(id => playersById?.[id]);
  if (videos.some(video => !video || typeof video.addEventListener !== "function" ||
      typeof video.play !== "function")) {
    return Promise.reject(new Error("four_scene_player_not_mounted"));
  }

  // Attach listeners and invoke native load/play immediately on this call
  // stack, before the studio awaits audio, an image or any other async work.
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout;
    let lastCount = -1;
    const removers = [];
    const rewindRequested = videos.map(() => false);
    const rewindVerified = videos.map(() => false);
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      removers.forEach(remove => remove());
      if (error) reject(error);
      else resolve({ ready: 4, total: 4 });
    };
    const check = () => {
      if (settled) return;
      let ready = 0;
      for (let index = 0; index < videos.length; index++) {
        const video = videos[index];
        if (!playableFilmSource(video)) continue;
        if (!Number.isFinite(video.currentTime) || video.currentTime < 0) {
          finish(new Error("four_scene_media_clock_invalid:" + ids[index]));
          return;
        }
        if (!rewindRequested[index]) {
          rewindRequested[index] = true;
          try {
            video.pause();
            if (video.currentTime > START_TOLERANCE_SECONDS) {
              video.currentTime = 0;
              // A stale decoded frame may remain visible until seeked fires.
            } else {
              rewindVerified[index] = !video.seeking;
            }
          } catch {
            finish(new Error("four_scene_rewind_failed:" + ids[index]));
            return;
          }
        }
        if (rewindVerified[index] && !video.seeking &&
            Math.abs(video.currentTime) <= START_TOLERANCE_SECONDS) ready++;
      }
      if (ready !== lastCount) {
        lastCount = ready;
        try { onProgress(ready, 4); } catch { /* progress is advisory */ }
      }
      if (ready === 4) finish();
    };
    for (let index = 0; index < videos.length; index++) {
      const video = videos[index];
      const checkReady = () => check();
      const seeked = () => {
        if (rewindRequested[index]) rewindVerified[index] = true;
        check();
      };
      const fail = () => finish(new Error("four_scene_decode_failed:" + ids[index]));
      video.addEventListener("loadeddata", checkReady);
      video.addEventListener("canplay", checkReady);
      video.addEventListener("seeked", seeked);
      video.addEventListener("error", fail);
      removers.push(() => {
        video.removeEventListener("loadeddata", checkReady);
        video.removeEventListener("canplay", checkReady);
        video.removeEventListener("seeked", seeked);
        video.removeEventListener("error", fail);
      });
    }
    timeout = setTimeout(() => finish(new Error("four_scene_load_timeout")),
      Math.max(1, Math.min(60000, timeoutMs)));
    check();
    if (settled) return;
    for (const video of videos) {
      if (playableFilmSource(video)) continue;
      try {
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        if (video.networkState === 0 || video.error) video.load();
        // iOS may reject autoplay even when muted. Never treat a rejected
        // play() as success; loadeddata/canplay and decoded dimensions decide.
        const attempt = video.play();
        if (attempt && typeof attempt.then === "function") {
          void attempt.then(() => {
            video.pause();
            check();
          }).catch(() => { /* native load events or timeout remain authoritative */ });
        }
      } catch { /* decode events or timeout will provide the real outcome */ }
    }
    check();
  });
}
