# iHelp shared warm welcome — screenshot implementation specification (7 Nov 2026)

## Page identity and scope
- **Reference:** owner-supplied iPhone screenshot of the current AI Video Director welcome in the Video Studio help drawer. The mobile status bar and system navigation are *not* part of the page.
- **Reference state:** public EN Video Studio, iHelp intentionally opened, AI/video welcome. Exact screenshot route/query and browser DPR were not supplied: *unverified*; do not compare to a different route or authenticated cabinet as a pixel match.
- **Target:** owner-invoked sitewide iHelp on public EN/RU/ES sections (home, tests, courses/practices, services, library, MyTube, shop), and the existing account assistant. Messages continues to use its sole protected HolisticAgentChat. Studio retains its sole executable video director and its previously approved welcome; no duplicate studio engine.
- **Canonical deployed route:** https://holistichouse.vercel.app; code base codex/public-book-library. Production parent inspected at 8b5a3767ceeea3cb89403090b240b19f7b339fdb (7 Nov 2026).
- **Page identity gate:** same *type* of owner-triggered assistant view, but other routes intentionally have different section-specific actions; identical screenshots would be incorrect. No changes to OAuth redirect, dashboard/editor routing or private content.
- **Source owners:** components/sitewide-ihelp.tsx + CSS, shared components/ihelp-welcome.tsx + CSS, and existing components/app/messenger-ai-workspace.jsx + CSS. Route copy/actions remain in lib/ihelp/page-context.mjs.

## Visual block map
| Order | Reference | Target implementation | Notes |
|---|---|---|---|
| 1 | Ivory iHelp bar + disclaimer and close | sitewide header | Existing focus trap/Escape/close preserved |
| 2 | Soft mint/lavender AI Video Director identity strip | IHelpWelcome identity bar | Route-specific localized title, gradient avatar |
| 3 | Warm sunrise/woman photo; large Hi + heading | IHelpWelcome hero | Reuses already approved site artwork, not external stock |
| 4 | Three near-white pastel action cards | Existing pageHelp actions, CSS as three photo/icon tiles | Actual existing click handlers; ask-question remains available |
| 5 | Rounded white question composer with teal Send | Existing HolisticAgentChat textarea/actions | Existing consent, AI backend, cancellation and reset retained |
| 6 | Body / Energy / Love / Work topic chips | IHelpTopics | Populates composer without automatically sending or tracking |
| 7 | AI / Orders / Clients | Existing Messages navigation; sitewide overlay links to real Messages Orders/Clients views | No duplicate global dock, guest Orders/Clients uses existing auth gate |

## Visual measurements and design acceptance
- Reference screenshot was provided in chat; no private screenshot or file is committed to this public repository.
- Target mobile: horizontal inset 7–13px; 44px minimum interactive controls; three equal action cards with 5–8px gaps; photo hero ~171–196px (short viewport shrinks); semantic canvas #FBF5E9, text #143D3A, teal action and pastel tiles.
- Keep the established desktop right-hand dialog and mobile full-screen overlay; iOS safe top/bottom padding, Escape focus return, backdrop click. On short viewports hide optional topic rail rather than crop the composer.
- EN/RU/ES labels wrap in 320–430px. Topic chips scroll horizontally rather than expanding the whole screen. Active conversation shrinks decorative hero to favor answer and composer.
- Protect existing route-sensitive state and privacy. No automatic popup, LLM request, video render, media upload, database migration, or new provider cost from visual entry. No clinical guarantees.

## Verification matrix (to be completed by protected CI and LIVE acceptance)
| Screen | Width | Browser | Screenshot/overlay | Real clicks | Result |
|---|---|---|---|---|---|
| Public home iHelp EN | 320 | WebKit | pending | pending | BLOCKED |
| Tests iHelp RU | 390 | WebKit | pending | pending | BLOCKED |
| Services iHelp ES | 430 | Chromium | pending | pending | BLOCKED |
| Video Studio iHelp EN | 390 | WebKit | pending | pending | native Director unchanged; pending |
| Messages AI / iHelp EN | 390 | WebKit | pending | pending | existing chat unchanged; pending |
| Desktop public iHelp | 768/1440 | Chromium | pending | pending | BLOCKED |

**Initial validation:** reviewed source routing, semantic tokens, component state and one-chat ownership. Automated source contracts are in tests/ihelp-welcome-skin.test.mjs. Real screenshot overlays, full Next build and production phone QA must be recorded from actual CI/browser/READY evidence; a text-level test is not visual fidelity.

**GLOBAL_PR_ONE_PUBLISH_V1:** staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
