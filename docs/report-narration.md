# Private client-report analysis narration (2026-10-18)

## Purpose

A **Play / Pause / Stop** control inside the existing **Analysis** section of an approved Holistic House client report. The reader may optionally hear the practitioner's text in Andrey Litvinov's private AI-cloned HeyGen voice. No speech is generated, requested or played on document load. The original analysis text remains visible and unchanged; print/PDF output is unchanged.

## Identity and languages

- Russian: private HeyGen voice `333115d9f7ff4042846baa63a26b6f76` (“Andrey Litvinov”).
- English: private HeyGen voice `f447c75e0b7c40f4ae992bd6cfbce23c` (“Andrey English Therapy v4 Identity”).
- Engine: HeyGen `starfish` TTS. **Never** replace either voice with a stock speaker, browser `speechSynthesis` or another HeyGen account's voice.

## Security

- The client posts only the scope, report identity, locale, and chunk number. **Never** accepts analysis text or arbitrary voice ID from a request.
- The server loads the same authenticated, approved analysis as the corresponding HTML/PDF report. Guest sessions require a valid, unrevoked viewer cookie and a published report fingerprint; cabinet sessions and legacy links require their existing session access; Google-saved copies require account verification and pinned source revision/hash.
- Only the explicitly pressed **Play** control starts an authenticated TTS request. After the visible disclosure, the **analysis text is transmitted to HeyGen** to synthesize the chosen voice; no diagnosis, remedy or medical recommendation is added or edited.
- A server-only API key is sent to `api.heygen.com`, never to the browser. The server validates HeyGen's audio URL/host and media signature and proxies the returned file over a private no-store same-origin response. The generated audio is held only in the current browser session's memory; it is not uploaded to Google Drive, YouTube, public CDNs, or the practitioner media library.
- Rate limits: up to 40 synthesis segments per viewer per day and 20 segments per report per day, enforced through the existing private Redis-backed attempt counters. Replaying already downloaded segments in the same open tab consumes no extra HeyGen credits.
- Each synthesis request reads only one bounded segment (max 3000 characters), with no silent truncation of a supported full analysis. If the source version/access expires, the request must fail closed.
- Content Security Policy permits `blob:` as a media source only in the six authorized private report reader paths; third-party HeyGen URLs are not granted to the browser.

## Required production configuration

The feature intentionally stays disabled until the owner explicitly approves sending private client report text to the contracted synthesis provider and configures BOTH production secrets:

```
HH_REPORT_NARRATION_ENABLED=true
HEYGEN_API_KEY=<owner's own HeyGen API key; server-side only>
```

Use protected Vercel environment variables (production and separately preview if authorized). NEVER check the API key into GitHub or reveal it to clients. After deployment, verify the approved private HeyGen voice ID still belongs to the connected HeyGen workspace and that your API subscription permits synthesis, including personal client text under agreed data processing/privacy terms.

**Current implementation stage:** Source implementation and automated contract tests. Actual in-browser pronunciation, iOS Safari gesture playback, correct voice timbre, account-specific HeyGen API authorization/billing, and production TTS end-to-end **must be verified** after configuring the key and enabling the feature. Do not label speech as working live before a successful authorized Play call.

## Acceptance checks

1. On an approved Russian report containing an Analysis section, Play uses the Russian private cloned voice. On an English report it uses the English private cloned voice.
2. Page load, PDF download, print and scroll make **zero** TTS requests. Clicking Play sends exactly the approved server-side narrative, not other personal notes/diagnoses or archived drafts.
3. Play, pause, resume, stop, restart, and phone audio controls work. On Safari, if auto-play is blocked after synthesis, a second explicit tap on the native audio controls works.
4. All six private contexts: guest session, legacy document access, legacy client cabinet, published client session cabinet, saved session in Google account, saved document in Google account.
5. Expired/rotated link, invalid account, unpublished report edit, altered source hash, blocked origin, wrong report, and attempts to inject different text return errors **before calling HeyGen**.
6. Confirm no provider secret, synthesis URL, generated media or private text appears in client-side HTML, application logs, analytics, or public site storage.
7. Confirm mobile layout 320/390 px, audio duration, accessibility and that the button never prints.

Rollback: set `HH_REPORT_NARRATION_ENABLED=false` (no client documents or media require data migration).
