# PsiAlchemy native private-context verification

Status: **DISABLED / NOT VERIFIED**

The codebase contains an isolated private-session container behind a hard-coded
false feature gate:

- iOS uses `WKWebsiteDataStore.nonPersistent()` and clears the transient store
  when its controller closes.
- Android declares a non-exported `:private` process, sets a dedicated WebView
  data-directory suffix before WebView creation, disables cache/DOM storage and
  clears cookies, storage, cache and history before terminating that process.

Neither platform registers private prescription paths for Universal Links or
Android App Links. The public shell also blocks those paths before navigation.

## Remaining proof gate

The current GitHub-hosted workflow proves unsigned compilation and artifact
creation only. It does not boot a signed app with controlled active, revoked,
unknown and unavailable prescription fixtures. Therefore it cannot yet prove
all of the following after close and relaunch:

- private URL absent from navigation/history;
- cookies, DOM storage and HTTP cache empty;
- service-worker state empty;
- revoked/unknown routes unavailable after a fresh online server check;
- Android isolated process terminated and iOS ephemeral store destroyed.

The feature gate and private association paths must remain disabled until a
dedicated simulator/emulator instrumentation harness records only these boolean
assertions and all of them pass. No URL, response body or patient field may be
recorded by that harness.
