// Failure-only host-side evidence. No request permission, browser injection,
// retry, timer, transport action or raw request/error storage belongs here.
const capacity = 192;
const phases = new Set(['initial', 'dao', 'energy-navigation', 'energy-reload',
  'holistic-return', 'quick-anchors', 'pro-navigation', 'assertions', 'teardown']);
const targets = new Set(['unavailable', 'foreign-or-credentials', 'local-api', 'local-other', '/',
  ...['en', 'ru', 'es'].flatMap(locale => ['', '/holistic-support', '/services/remote-energy-support',
    '/services/free-consultation', '/pro'].map(path => '/' + locale + path))]);
const verdicts = new Set(['anonymous-401', 'abort-policy', 'abort-draining', 'fetch', 'fulfill',
  'handler-failed', 'request-failed']);
const failures = new Set(['none', 'unavailable', 'blocked', 'cancelled-or-aborted', 'access-control', 'other']);

export function createHolisticTransportDiagnostics({now = () => performance.now()} = {}) {
  const events = [];
  let phase = 'initial', sequence = 0, dropped = 0, start;
  const record = data => {
    try {
      const value = now();
      if (start === undefined && Number.isFinite(value)) start = value;
      const relativeMs = Number.isFinite(value) && Number.isFinite(start)
        ? Math.max(0, Math.min(86400000, Math.round(value - start))) : 0;
      if (events.length === capacity) { events.shift(); dropped = Math.min(dropped + 1, 1000000); }
      sequence = Math.min(sequence + 1, 1000000);
      events.push({sequence, relativeMs, phase, ...data});
    } catch { /* recording must never affect the original verifier */ }
  };
  return {
    phase(value) { try { if (phases.has(value)) { phase = value; record({kind: 'phase'}); } } catch {} },
    observeTransport(value) {
      try {
        const {requestId, target, rsc, prefetch, verdict, failure} = value;
        if (!verdicts.has(verdict)) return;
        record({kind: 'transport', requestId: Number.isInteger(requestId) && requestId > 0 && requestId <= 1000000 ? requestId : 0,
          target: targets.has(target) ? target : 'unavailable', rsc: rsc === true,
          prefetch: prefetch === true, verdict,
          failure: failures.has(failure) ? failure : 'unavailable'});
      } catch { /* arbitrary observer input cannot enter the artifact */ }
    },
    pageError(error) {
      try {
        const message = error?.message;
        const failure = typeof message !== 'string' ? 'unavailable'
          : /access control/i.test(message) ? 'access-control'
          : /cancelled|canceled|abort/i.test(message) ? 'cancelled-or-aborted' : 'other';
        record({kind: 'pageerror', failure});
      } catch { /* retain the original pageerror, never replace it */ }
    },
    snapshot() {
      try { return {schemaVersion: 1, capacity, dropped, events: events.map(event => ({...event}))}; }
      catch { return {schemaVersion: 1, capacity, dropped: 0, events: []}; }
    },
  };
}
