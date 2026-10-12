# GA4 transport and privacy repair

## Why this changes the implementation

Google's documented gtag shim pushes Arguments objects. The prior implementation pushed Arrays; the current Google dispatcher treats those as data-model method calls instead of GA commands. An isolated test using the official downloaded dispatcher confirmed that difference, without sending any events.

The repair must be reviewed with the privacy controls, not deployed as a transport-only change. A functioning dispatcher can activate collection that the broken shim previously prevented.

## Boundaries

- Keep analytics opt-in, canonical-production-only, and absent from excluded private routes on first load.
- Retain manual pageviews and `send_page_view: false`. Enhanced-measurement/history pageviews must remain disabled in the data stream.
- Use safe context before initialization and on every explicit event: public origin/path only, fixed `Holistic House` title, empty referrer and explicit measurement destination. No form payloads, query strings, fragments, raw titles or referrer paths are included in these commands.
- Use the documented `ga-disable` property as a live getter, checking actual location, ownership, current consent cookie and DOM consent at Google event-processing time. A restored stale DOM cannot override a newer persisted withdrawal. This avoids depending only on the later React effect after an SPA navigation. Explicit outside opt-outs remain effective.
- Refuse to trust an unrelated `window.gtag` as proof that this measurement destination is initialized. No app consent/config/event commands are sent to it, and the same-destination disable getter stays true. An unowned pre-existing dataLayer is likewise never activated by loading our SDK.
- A disabled SDK still accumulates engagement time. On the first transition from an owned tag to a private route, or on withdrawal, latch collection off and reload the current document once. The next private/denied document loads no SDK. Returning/regranting therefore starts a fresh SDK and cannot reattribute private/off dwell to public engagement.
- The reset only runs when this document has our own registered tag; a private or denied cold load and subsequent private UI renders never request reload. A one-shot flag prevents loops. No auth/CSP code is changed. The tradeoff is one document reload on this boundary.
- Erase only `_ga`/`_ga_*` host cookies and the canonical-domain legacy variants. New Google cookies use host-only scope; unrelated/auth cookies remain untouched.
- Returning/regranting gets one resumed view. Repeated unchanged consent notifications do not duplicate it.
- Forward only the existing secondary event allowlist. No lead, purchase or primary conversion is added.

The deliberate reporting tradeoff is that titles are generic and referrers are suppressed. Public paths still distinguish pages, but title-based detail and referral attribution are reduced.

## Checks and release gate

The focused Node harness runs the actual component and consent sources with synthetic hooks/DOM and no network API. It covers transport, consent, host/ID/path guards, all-event context, listener cleanup, stale handlers, external opt-out, unknown gtag, return views and regrant.

The `GA4 privacy and transport` workflow runs the full current Google SDK in a clean Chromium context. The SDK is first fetched as a read-only script. Before creating a page, the fixture installs context-wide interception: synthetic HTML and SDK responses are local, collection attempts get local responses, all other requests and WebSockets are blocked. A dead loopback proxy is a second boundary. No browser request is intentionally transmitted to Google or production.

Full-SDK assertions include:

1. No tag/collection without consent.
2. Positive public pageview and secondary-event controls, with exact pageview counts.
3. Private navigation before React effects, a one-minute autonomous timer window, visibility/page lifecycle, and subsequent document reset. The return view must not include that private dwell in `_et` engagement time.
4. Return to the same public page, withdrawal, and regrant, including positive resumed-event assertions and real host/domain cookie cleanup. A synthetic unrelated cookie must survive.
5. Grant queued while the SDK response is held; change to private or withdraw before the SDK executes, then verify no collection and positive recovery in the same browser context.
6. Already-loaded SDK with a pending consented public event followed immediately by private navigation or withdrawal. An already-consented public batch may drain; it is identified separately from prohibited new private/off events and must contain only safe public context. A fresh document must recover normally. Google may retry a failed transport on the exact `https://www.google.com/g/collect` endpoint with `gaf=1`; the fixture recognizes it only when its complete query/body/method match an earlier primary request in the same phase. Both attempts receive privacy assertions and remain in evidence, while the retried event is counted once. Unknown destinations still fail.
7. An unknown pre-existing gtag backed by the actual full SDK remains disabled and receives no app consent/event commands.
8. The actual CSP navigation component runs alongside analytics in an additional synthetic hook fixture, exercising click and programmatic public/private navigation, Back/Forward destinations and repeated private renders. The SDK can flush `user_engagement` for the document being left while its URL and consent are still public; the fixture permits at most one such event from that exact old document with bounded public engagement time, separately from prohibited new private events. Actual document IDs and `pageshow.persisted` are recorded. A history pass with fresh documents is not a claim of actual BFCache restoration. This remains a source-component/browser test, not the Next router.
9. URL, request body and complete `allHeaders()` contain no synthetic sensitive sentinels. Assertions occur before cookie-header redaction. Only synthetic cookie names/domain/path/count are saved, never cookie values. A public synthetic email/phone/name/free-text form receives input/change/blur/submit interactions; raw values, known normalized SHA-256 values and user-identifying event parameter names must remain absent.

The artifact records the actual tested commit, browser version, SDK hash and intercepted attempts. Browser state is freshly synthetic; no owner login, client data, real cookie jar, database or service credentials are used. This is not evidence that a real GA property has received events.

The local environment could not launch Chromium because its kernel rejected the browser's socket creation. Unit, lint and focused TypeScript checks passed locally; full-SDK network acceptance is performed in CI. The first 11-scenario CI passed, but independent review found missing cookie/foreign-tag/pending-batch coverage and private engagement carried into the return event. The next run exposed the SDK fallback for an already-consented public event during document teardown; source and artifact matching established it as a transport retry, and the fixture now validates that exact pairing. This revision closes the implementation gaps and expands the assertions; old-head success is not acceptance of the revised head. Do not merge or activate until current-head intercepted-network CI, ordinary applicable checks and independent review pass. Source review found no reload loop or lost saved plan/answer path, but real Next routing, Back/Forward and unsaved UI-state preservation are not exercised by this fixture; the one-time reload can discard in-memory state. A passing synthetic fixture does not replace a later consented public production delivery check or a real React/Next integration review.

## Sources

- [Google tag setup](https://developers.google.com/tag-platform/gtagjs)
- [GA4 configuration and page/referrer defaults](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [Turn off Google Analytics](https://developers.google.com/tag-platform/security/guides/privacy#turn_off_google_analytics)
- [Consent behavior](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [Manual pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Playwright request interception](https://playwright.dev/docs/network)

- [Automatically collected public engagement](https://support.google.com/analytics/answer/9234069)
