/**
 * Decode one same-origin, published MP4 after an explicit user Play/Create action.
 * Metadata and a fulfilled play() Promise are not proof that a frame is usable.
 *
 * @param {HTMLVideoElement} video
 * @param {{timeoutMs?: number}} [options]
 * @returns {Promise<boolean>}
 */
export function ensureDecodedVideoOnUserIntent(video, { timeoutMs = 20000 } = {}) {
  if (!video || typeof video.play !== 'function' || typeof video.load !== 'function') {
    return Promise.resolve(false);
  }
  const decoded = () => video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !video.error;
  if (decoded()) return Promise.resolve(true);
  return new Promise(resolve => {
    let settled = false;
    let deadline;
    const cleanup = () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('error', onError);
      clearTimeout(deadline);
    };
    const finish = ok => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ok);
    };
    const onReady = () => { if (decoded()) finish(true); };
    const onError = () => finish(false);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('error', onError);
    deadline = setTimeout(() => finish(false), Math.max(500, Math.min(30000, Number(timeoutMs) || 20000)));
    try {
      video.muted = true;
      // A hidden source starts with preload=none by design. On a real Play/Create
      // gesture, Safari must be allowed to fetch and decode its physical frames.
      // Never promote preload while the studio is idle or during server render.
      video.playsInline = true;
      video.preload = "auto";
      // NETWORK_LOADING=2. Do not restart an already loading media request.
      if (video.networkState !== 2 && !decoded()) video.load();
      // Must happen synchronously within the trusted tap for iOS WebKit.
      Promise.resolve(video.play()).then(onReady, () => {
        // WebKit can reject play() during setup while still decoding a frame.
        // The real canplay/loadeddata/error events and timeout remain authoritative.
      });
    } catch {
      finish(false);
    }
    onReady();
  });
}
