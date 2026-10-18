// Run before the app router hydrates. A browser Back/Forward action can arrive
// while the new document is still parsing; React effects are too late then.
// Keep the exact history destination until the full CSP boundary takes over.
export const CSP_PREHYDRATION_SCRIPT = `(() => {
  const state = { destination: null, dispose: null };
  // Hydration may mount optional readers after a hard history navigation has
  // already started. Keep a document-lifetime signal before React loads.
  window.__hhOptionalReadsDeparting = false;
  const departing = () => { window.__hhOptionalReadsDeparting = true; };
  window.navigation?.addEventListener('navigate', event => {
    if (event.destination?.sameDocument === false) departing();
  });
  window.addEventListener('pagehide', departing, true);
  window.addEventListener('pageshow', () => { window.__hhOptionalReadsDeparting = false; delete window.__hhCspHardDestination; }, true);
  const onPopState = event => {
    event.stopImmediatePropagation();
    departing();
    state.destination = window.__hhCspHardDestination || window.location.href;
    window.location.replace(state.destination);
  };
  state.dispose = () => window.removeEventListener('popstate', onPopState, true);
  window.__cspPreHydration = state;
  window.addEventListener('popstate', onPopState, true);
})();`;
