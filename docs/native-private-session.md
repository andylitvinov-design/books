# Native private-session boundary

Private prescription links are **not enabled in the native shell**. The public
Capacitor client accepts only public remedy routes; `private-blocked` links are
ignored before a URL is sent to a WebView or storage API.

The future private-session architecture is intentionally separate from the
public browsing WebView:

- construct an ephemeral, non-persistent WebView/session only after an explicit
  feature-gate change;
- disable cookies, HTTP cache, service-worker registration and browsing history;
- never copy a private URL into native preferences, local storage, clipboard,
  share sheets or recent-route state;
- clear the isolated session on close, background termination and relaunch;
- re-check the link server-side so revoked and unknown links stay unavailable.

The gate in `lib/native/private-session.js` is hard-coded `false`. It may not be
opened until CI/device instrumentation demonstrates all persistence assertions
on supported iOS and Android runtimes. Current GitHub-hosted CI provides build
proof, not a trustworthy proof of private WebView persistence behaviour.
