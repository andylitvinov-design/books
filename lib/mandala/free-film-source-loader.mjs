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
  const { onProgress = () => {}, timeoutMs = 20000, adaptive = false,
    verifiedMixedPhotoSubset = false } = options;
  const ids = Array.isArray(shots) ? shots.map(shot => shot?.sceneId) : [];
  const phases = Array.isArray(shots) ? shots.map(shot =>
    shot?.sourcePhasePercent === undefined ? 0 : shot.sourcePhasePercent) : [];
  if ((verifiedMixedPhotoSubset === true ? ids.length > 12 :
       adaptive === true ? ids.length < 4 || ids.length > 12 : ids.length !== 4) ||
      ids.some(id => typeof id !== "string" || !id) ||
      new Set(ids).size !== ids.length || phases.some(value =>
        !Number.isInteger(value) || value < 0 || value > 95)) {
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
    const startTimeFor=(index,video)=>{
      if(phases[index]===0)return 0; // Legacy unedited sources need no duration metadata.
      const seconds=video.duration;
      if(!Number.isFinite(seconds)||seconds<=0)return null;
      return seconds*phases[index]/100;
    };
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      removers.forEach(remove => remove());
      if (error) reject(error);
      else resolve({ ready: ids.length, total: ids.length });
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
        const expectedStart=startTimeFor(index,video);
        if(expectedStart===null){
          finish(new Error("four_scene_source_duration_invalid:" + ids[index]));
          return;
        }
        if (!rewindRequested[index]) {
          rewindRequested[index] = true;
          try {
            video.pause();
            if (Math.abs(video.currentTime-expectedStart) > START_TOLERANCE_SECONDS) {
              video.currentTime = expectedStart;
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
            Math.abs(video.currentTime-expectedStart) <= START_TOLERANCE_SECONDS) ready++;
      }
      if (ready !== lastCount) {
        lastCount = ready;
        try { onProgress(ready, ids.length); } catch { /* progress is advisory */ }
      }
      if (ready === ids.length) finish();
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

/**
 * Mixed photo/film is admitted only after the Studio verifies the complete
 * 4–12 scene plan and every photo identity/decoded image. Partial film subsets
 * still require each real mounted film decoder to rewind and decode; the
 * default strict four-source contract remains unchanged for normal callers.
 */
