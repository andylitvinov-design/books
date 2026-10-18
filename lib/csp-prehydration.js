// Run before the app router hydrates. A browser Back/Forward action can arrive
// while the new document is still parsing; React effects are too late then.
// Keep the exact history destination until the full CSP boundary takes over.
export const CSP_PREHYDRATION_SCRIPT = `(() => {
  const state = { destination: null, dispose: null };
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
    window.location.replace(state.destination);
  };
  state.dispose = () => window.removeEventListener('popstate', onPopState, true);
  window.__cspPreHydration = state;
  window.addEventListener('popstate', onPopState, true);
})();`;
