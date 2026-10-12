# GA4 document boundary: proposed repair and release gates

Status: investigation only; PR 387 remains release-blocked. Production routing is unchanged.

## Confirmed blocker

On 3455275cd12e0c1ebf048f3b5b5b8d4223de2261, official Google SDK SHA256 78b57b56df53a4236a7167df0de0c52b0585c19a7d7a2207a8f3727dbbbe71b2 emitted an intercepted `/td` request containing a synthetic private pathname after delayed SDK loading crossed an SPA transition. `ga-disable` did not cover diagnostics. No request was transmitted. The old same-document fixture must remain failing until the architecture it models is removed or otherwise proved safe; do not weaken its personal-data assertion.

## Supported architectural candidate

Next.js 15 documents that navigation between different root layouts performs a full page load. Parenthesized route groups do not change URL paths. Remove the common top-level `app/layout.tsx` root, create `app/(public)/layout.tsx` and `app/(private)/layout.tsx`, and share server-rendered HTML/metadata/CSS through a helper. Mount Ga4Analytics only in the public root. Consent controls and cleanup remain available as appropriate; private roots never create a Google SDK script or queue.

Primary reference: https://nextjs.org/docs/15/app/api-reference/file-conventions/route-groups

The installed Next router's `isNavigatingToNewRootLayout` / `navigate-reducer` path selects `mpaNavigation`; AppRouter uses `location.assign` or `location.replace` without committing children under the target URL. This is a stronger boundary than a React effect that reloads after `history.pushState`.

This remains a candidate, not a proof that root layouts disable every Google subsystem. Withdrawal before pending SDK execution and BFCache behavior need separate tests. No documented Google diagnostics-disable option has been identified; no internal SDK switches will be used.

## Proof before migration

1. Build an isolated real Next/React application with two root layouts, using this PR's actual analytics/consent and canonical CSP boundary components. Use only synthetic HTML/forms and no database, authentication provider, secrets or production backend.
2. Route every browser request before page creation. Serve app responses from the loopback fixture server and the frozen official Google script from disk. Fulfill or abort all third-party requests locally; a dead loopback browser proxy is the second boundary. Never submit test events to Google.
3. Force Google's existing diagnostic sampler via the synthetic `gtm_latency` URL parameter. Delay the SDK response across Link, router.push and router.replace transitions into a synthetic private route. Prove that the old public document is replaced before private rendering, the private document has no SDK, and all Google requests lack synthetic private path/query/form values in URLs, bodies and complete headers.
4. Positive controls: public grant sends one manual page_view and one allowed acquisition event; public return/regrant works. Test normal loaded-SDK transitions as well as delayed loading; public departure engagement must retain public context and not include private dwell.
5. Test Back/Forward, cookie withdrawal from another document, and public in-memory draft restoration. Record actual pageshow.persisted and document IDs; do not call a fresh reload a BFCache test. A blanket BFCache reload is not an acceptable substitute for preserving restored public drafts.
6. Keep an explicit result for direct raw history mutation: root-layout boundaries govern Next navigation, not arbitrary application calls to history.pushState. Audit all real cross-boundary callsites; any remaining same-document private mutation is a release blocker.

## Route-preserving migration, only after the proof

- Base: canonical 575f87639fbecd4b503e899124ac5b24c2e37429. Make a manifest of every route handler, page, loading, not-found, layout and metadata file before/after grouping. Normalized URL patterns must be identical and unique.
- Move the private app/client/report/prescriptions/admin/document-preview trees into `(private)` and public content trees into `(public)`. Keep API/media handlers, root metadata routes and global styles in stable locations where possible. The proposed manifest lists exactly 96 moves (75 page/route entries), preserving root icon and shared Spanish CSS in place. The manifest is `ga4-document-boundary-route-plan.json`; it is a plan, not an applied migration.
- Preserve Spanish shared CSS on both relevant roots, locale metadata/html lang, JSON-LD, nonce propagation, current middleware route matching and all public SEO paths.
- Preserve server-action imports and relative references. Update path-based regression tests mechanically, then run the complete suite. Do not alter the underlying auth/PKCE, authorization or database logic.
- Verify canonical middleware/CSP classification agrees with route-group membership. Keep the current media CSP boundaries working for public-video/tantra-media and private/video-manager transitions; avoid duplicate navigation loops.
- Compare active PR 388 and 389 changed paths and relative imports against the manifest, and communicate the final mapping before either integration. Rebase/integrate on the current canonical without overwriting those changes.
- Build the real application and compare generated route manifests. Run synthetic authenticated-route shell and auth/PKCE regressions using stubs, without querying client records or creating users/sessions.

## Release decision

The transport must remain unactivated until the final exact head passes route parity, full tests/build, synthetic full-SDK network checks and independent review. If the complete boundary cannot be established in this scope, the safe deliverable is explicit SDK-disabled behavior with a clear explanation that analytics cannot yet be enabled, not a partially working transport with known private-path telemetry.
