/**
 * Native prescription sessions are intentionally fail-closed. This explicit
 * gate remains false until device instrumentation proves the no-persistence
 * contract described in docs/native-private-session.md.
 */
export function nativePrivatePrescriptionEnabled() {
  return false
}

export function privateNativeSessionPolicy() {
  return {
    enabled: nativePrivatePrescriptionEnabled(),
    storage: 'ephemeral-only',
    urlPersistence: false,
    cookiePersistence: false,
    cachePersistence: false,
    serviceWorkerPersistence: false,
    historyPersistence: false,
  }
}
