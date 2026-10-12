// Run before the app router hydrates. A browser Back/Forward action can arrive
// while the new document is still parsing; React effects are too late then.
// Keep the exact history destination until the full CSP boundary takes over.
export const CSP_PREHYDRATION_SCRIPT = `(() => {
  const state = { destination: null, dispose: null };
  const onPopState = event => {
    event.stopImmediatePropagation();
    state.destination = window.location.href;
    window.location.replace(state.destination);
  };
  state.dispose = () => window.removeEventListener('popstate', onPopState, true);
  window.__cspPreHydration = state;
  window.addEventListener('popstate', onPopState, true);
})();`;
