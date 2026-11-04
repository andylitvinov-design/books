// Browser-side, deterministic proof of a resumed original HTTP-backed MP4.
// The WebKit timeline timestamps have millisecond precision: seeked and the
// subsequent native js-play may share the same timestamp. Browser event array
// order, NOT strict timestamp inequality, establishes their sequencing.
// Never replace decoded-frame evidence with synthetic or elapsed-time claims.
export function verifyNativeWebKitRecovery(el, before, providedTimeline = null) {
  const timeline = Array.isArray(providedTimeline)
    ? providedTimeline
    : (window.__tantraNativeTimeline ?? []);
  const source = el.currentSrc;
  const events = timeline.filter(event =>
    event.source === source && event.open === true &&
    Number.isFinite(event.at) &&
    event.at > (before.presentedFrame?.at ?? -1)
  );
  const after = (index, type) => index < 0 ? -1
    : events.findIndex((event, offset) => offset > index && event.type === type);
  const firstPlay = events.findIndex(event => event.type === 'js-play');
  const reloads = events.flatMap((event, index) =>
    firstPlay >= 0 && index > firstPlay && event.type === 'js-load' ? [index] : []);
  const reload = reloads.length === 1 ? reloads[0] : -1;
  const metadata = after(reload, 'loadedmetadata');
  const seeked = after(metadata, 'seeked');
  const resumed = after(seeked, 'js-play');
  const playingEvent = after(resumed, 'playing');
  const resumedNode = resumed < 0 ? null : events[resumed]?.node;
  // WebKit may continue decoded playback after seek without a second 'playing'
  // event: the player was already running. Genuine new video frames, the exact
  // user-resumed DOM node and a matching moving media clock are stronger proof
  // than the optional event. Never let an old competing decoder's frames pass.
  const actualFrame = resumed < 0 || !Number.isInteger(resumedNode) ? -1
    : events.findIndex((event, index) =>
      index > resumed && event.type === 'presented-frame' &&
      event.node === resumedNode && event.connected === true &&
      event.paused === false && event.seeking === false &&
      Number.isFinite(event.presentedFrame?.mediaTime) &&
      event.presentedFrame.mediaTime > before.time + 0.35 &&
      Number.isFinite(el.currentTime) && el.currentTime > before.time + 0.35 &&
      Math.abs(event.presentedFrame.mediaTime - el.currentTime) < 0.35 &&
      event.source === source
    );
  const live = !el.paused && !el.seeking && !el.ended && !el.error;
  const decodedPlayback = actualFrame >= 0 && live;
  return {
    oneReload: reloads.length === 1,
    firstPlay: firstPlay >= 0,
    metadata: metadata >= 0,
    seeked: seeked >= 0,
    resumed: resumed >= 0,
    playing: playingEvent >= 0 || decodedPlayback,
    realFrame: decodedPlayback,
    sameSource: events.every(event => event.source === source),
    muted: el.muted,
    live,
  };
}
