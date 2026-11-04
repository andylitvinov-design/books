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
  const playing = after(resumed, 'playing');
  const actualFrame = playing < 0 ? -1 : events.findIndex((event, index) =>
    index > playing && event.type === 'presented-frame' &&
    Number.isFinite(event.presentedFrame?.mediaTime) &&
    event.presentedFrame.mediaTime > before.time + 0.35 &&
    event.source === source
  );
  return {
    oneReload: reloads.length === 1,
    firstPlay: firstPlay >= 0,
    metadata: metadata >= 0,
    seeked: seeked >= 0,
    resumed: resumed >= 0,
    playing: playing >= 0,
    realFrame: actualFrame >= 0,
    sameSource: events.every(event => event.source === source),
    muted: el.muted,
    live: !el.paused && !el.seeking && !el.ended && !el.error,
  };
}
