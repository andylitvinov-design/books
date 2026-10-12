# GA4 transport and privacy repair

## Why this changes the implementation

Google's documented gtag shim pushes Arguments objects. The prior implementation pushed Arrays; the current Google dispatcher treats those as data-model method calls instead of GA commands. An isolated test using the official downloaded dispatcher confirmed that difference, without sending any events.

The repair must be reviewed with the privacy controls, not deployed as a transport-only change. A functioning dispatcher can activate collection that the broken shim previously prevented.

## Boundaries

- Keep analytics opt-in, canonical-production-only, and absent from excluded private routes on first load.
- Retain manual pageviews and `send_page_view: false`. Enhanced-measurement/history pageviews must remain disabled in the data stream.
- Use safe context before initialization and on every explicit event: public origin/path only, fixed `Holistic House` title, empty referrer and explicit measurement destination. No form payloads, query strings, fragments, raw titles or referrer paths are included in these commands.
- Use the documented `ga-disable` property as a live getter, checking actual location and consent at Google event-processing time. This avoids depending only on the later React effect after an SPA navigation. Explicit outside opt-outs remain effective.
- Refuse to trust an unrelated `window.gtag` as proof that this measurement destination is initialized. The application fails closed instead of inheriting unknown routing.
- Reset pageview deduplication on private navigation and withdrawal; returning/regranting gets one resumed view. Repeated unchanged consent notifications do not duplicate it.
- Forward only the existing secondary event allowlist. No lead, purchase or primary conversion is added.

The deliberate reporting tradeoff is that titles are generic and referrers are suppressed. Public paths still distinguish pages, but title-based detail and referral attribution are reduced.

## Checks and release gate

The focused Node harness runs the actual component and consent sources with synthetic hooks/DOM and no network API. It covers transport, consent, host/ID/path guards, all-event context, listener cleanup, stale handlers, external opt-out, unknown gtag, return views and regrant.

The `GA4 privacy and transport` workflow runs the full current Google SDK in a clean Chromium context. The SDK is first fetched as a read-only script. Before creating a page, the fixture installs context-wide interception: synthetic HTML and SDK responses are local, collection attempts get local responses, all other requests and WebSockets are blocked. A dead loopback proxy is a second boundary. No browser request is intentionally transmitted to Google or production.

Full-SDK assertions include:

1. No tag/collection without consent.
2. Positive public pageview and secondary-event controls, with exact pageview counts.
3. Private navigation before React effects, a one-minute autonomous timer window, visibility/page lifecycle, and subsequent private consent synchronization.
4. Return to the same public page, withdrawal, and regrant, including positive resumed-event assertions.
5. Grant queued while the SDK response is held; change to private or withdraw before the SDK executes, then verify no collection.
6. Unknown pre-existing gtag fails closed.
7. URL, request body and headers contain no synthetic sensitive sentinels; emitted events contain only sanitized context and the expected destination.

The artifact records the actual tested commit, browser version, SDK hash and intercepted attempts. Browser state is freshly synthetic; no owner login, client data, real cookie jar, database or service credentials are used. This is not evidence that a real GA property has received events.

The local environment could not launch Chromium because its kernel rejected the browser's socket creation. Unit, lint and focused TypeScript checks passed locally; the full-SDK network result is therefore pending CI. Do not merge or activate until the intercepted-network job passes, ordinary applicable checks pass and independent review is complete. A passing synthetic fixture does not replace a later consented public production delivery check or a real React/Next integration review.

## Sources

- [Google tag setup](https://developers.google.com/tag-platform/gtagjs)
- [GA4 configuration and page/referrer defaults](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [Turn off Google Analytics](https://developers.google.com/tag-platform/security/guides/privacy#turn_off_google_analytics)
- [Consent behavior](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [Manual pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Playwright request interception](https://playwright.dev/docs/network)
