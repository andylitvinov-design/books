// Run before the app router hydrates. A browser Back/Forward action can arrive
// while the new document is still parsing; React effects are too late then.
// Keep the exact history destination until the full CSP boundary takes over.
export const CSP_PREHYDRATION_SCRIPT = `(() => {
  const state = { destination: null, dispose: null };
  // WebKit can traverse Back/Forward before parser-time scripts execute.
  // NavigationTiming.name is the URL whose HTML this document actually
  // received. If history already changed the address, *never* hydrate the
  // previous document's tree/CSP against a new URL. Do a normal replacement.
  let racedHistoryDestination = null;
  try {
    const name = window.performance?.getEntriesByType?.('navigation')?.[0]?.name;
    if (name) {
      const requested = new URL(name, window.location.href);
      const actual = new URL(window.location.href);
      if (requested.origin === actual.origin &&
          (requested.pathname !== actual.pathname || requested.search !== actual.search))
        racedHistoryDestination = actual.href;
    }
  } catch { /* NavigationTiming may be unavailable in older browsers. */ }
  if (racedHistoryDestination) {
    state.destination = racedHistoryDestination;
    window.__cspPreHydration = state;
    window.__hhOptionalReadsDeparting = true;
    // Stop HTML and still-loading client chunks BEFORE replacing the URL.
    // This avoids React hydration #418 under WebKit rapid-history traversal.
    window.stop?.();
    window.location.replace(racedHistoryDestination);
    return;
  }
  // A new document can traverse to a same-policy history entry whose Next
  // router tree belongs to an earlier document. Do not replay that foreign tree:
  // a following hard navigation can cancel its still-loading route chunks.
  // Observe native entry keys without changing Next's history state or methods.
  const documentEntries = new Set();
  const rememberCurrentEntry = () => {
    const key = window.navigation?.currentEntry?.key;
    if (key) documentEntries.add(key);
  };
  rememberCurrentEntry();
  window.navigation?.addEventListener('currententrychange', event => {
    if (event.navigationType === 'push' || event.navigationType === 'replace') rememberCurrentEntry();
  });
  window.__hhOwnsHistoryEntry = () => {
    const key = window.navigation?.currentEntry?.key;
    // Older engines retain the existing CSP-class history behavior.
    return !key || documentEntries.has(key);
  };
  // Hydration may mount optional readers after a hard history navigation has
  // already started. Keep a document-lifetime signal before React loads.
  window.__hhOptionalReadsDeparting = false;
  const departing = () => { window.__hhOptionalReadsDeparting = true; };
  window.navigation?.addEventListener('navigate', event => {
    if (event.destination?.sameDocument === false) departing();
  });
  // WebKit may hydrate while the outgoing document awaits the next response,
  // before pagehide. Block optional reads at the earlier departure signal.
  window.addEventListener('beforeunload', departing, true);
  window.addEventListener('pagehide', departing, true);
  const resume = () => { window.__hhOptionalReadsDeparting = false; };
  window.addEventListener('pageshow', resume, true);
  // Staying after an unrelated unload prompt need not dispatch pageshow. Only
  // genuine interaction with the visible document can reopen the read gate.
  const resumeInteraction = event => {
    if (event.isTrusted === true && document.visibilityState !== 'hidden') resume();
  };
  window.addEventListener('pointerdown', resumeInteraction, true);
  window.addEventListener('keydown', resumeInteraction, true);
  const onPopState = event => {
    event.stopImmediatePropagation();
    departing();
    state.destination = window.location.href;
    // Cancel unfinished hydration for the stale history document.
    window.stop?.();
    window.location.replace(state.destination);
  };
  state.dispose = () => window.removeEventListener('popstate', onPopState, true);
  window.__cspPreHydration = state;
  window.addEventListener('popstate', onPopState, true);
})();`;
