# iChat Messenger — approved video-led welcome + always-available chat

**Owner reference:** approved image mock in conversation on 7 November 2026 (no private screenshot copied into repository). **Status:** source implementation staged, exact-HEAD CI / LIVE and physical iPhone QA must be recorded independently.

## Screen identity and existing owner
- URL: `/{en,ru,es}/app/messages?section=ai`; role: guest or signed-in AI tab in **existing** `MessagesOrdersClients`, with existing single unified dock and real authenticated Orders/Clients/News tabs.
- Exact-identity comparison: the approved mock is the *AI tab*, **not** private order conversation or video editor.
- Existing chat owner: `components/holistic-agent-chat.tsx` → existing /api/holistic-agent/turn, consent/secure history, video and meditation flows; no second chat, auth, memory, paid model, media store or CRM.
- Components edited: `components/app/messenger-ai-workspace`, `components/holistic-agent-chat`, `components/app/emotional-avatar`. Reuse `ihelp-welcome` for non-Messages sitewide iHelp without changing its actions.
- Verified production branch before work: `codex/public-book-library`. GitHub default `codex/bootstrap-books` is NOT deployment branch.

## Visual landmarks / 320–430px
| Region | Approved | Implementation |
| --- | --- | --- |
| Top | AI / My orders / My clients / News, Messenger compact header | Existing real hub; retain |
| Hero | sunrise woman, greeting, prominent video play | ~136–195px natural-photo poster, RU approved film only after tap |
| Intro | 40px same woman avatar, one warm chat prompt | small local image + localized question |
| Choices | 3×2 illustrated pastel cards | existing tests, real studio flow, meditation guide, service page, academy, focus composer |
| Conversation | same woman's round portrait by assistant messages | real message transcript only; no duplicate generated replies |
| Bottom composer | rounded text entry, +, mic, speech, Send | existing `submit`, supported upload/audio recorder/consent, existing device TTS in compact icon |
| Bottom app dock | sitewide seven existing destinations | unchanged |

## Real actions and constraints
- Test → `/{locale}/tests`; Create video → `startContent` inside current chat (wizard, **not** render); Practice → existing `startGuided('meditation')`; Session → `/{locale}/services` (request, **not** booking); Course → `/{locale}/academy`; Ask → focus the same unsent textarea.
- Portrait memory panel and large emotional face do **not** mount in Messenger; memory API, secure archive, existing server auth, RLS, sensitive-safety and opt-in processing remain unchanged. Other iHelp surfaces retain their own avatar and memory UI.
- Mic toggles the existing `MessengerAudioVideo`, not a fake voice-chat call; + opens real audio attachment and Reset; tiny speaker runs the existing browser SpeechSynthesis controller **only after actual text reply**; no new external provider, upload, autoplay, medical claims, charge, notification or lead.
- **Video truth:** source `approvedTelegramPresentation('ru')`, stable owner-approved YouTube `G0Db6yOCMto` (1:37) loads *only after explicit Play*, labelled Russian audio in EN/RU/ES. EN/ES have no approved dubbed presentation; do not show an unrendered film as their own. Video hero is a photo **poster**, not an AI woman actually speaking.
- Localization: EN/RU/ES for title, choices, video notice, recording, Reset and Send. On 320px grid/cards shrink; only conversation pane scrolls, composer remains flex-pinned above Safari keyboard and dock.

## Verification gates
- Focused source/TSX and routing contracts in `tests/messenger-ai-landing.test.mjs` plus updated legacy source tests.
- CI mandatory: exact-HEAD Core (TS/lint/build), applicable IA/Specialist, `hh-merge-check`; no CI/wake spoof or bypass.
- Browser visual QA: same-view Chromium/WebKit at 320/354/390/430, confirm first screen hero and all six cards scroll behind pinned textarea; tap a card, video click, mic/audio consent, response bubbles, keyboard and photo crop. Test account/private history and provider playback separately. If screenshots unavailable, mark visual QA **UNVERIFIED**; a test script is not screenshot evidence.
- Production: protected merge SHA → Vercel READY for same SHA or proven descendant → canonical alias → actual functional taps. Not LIVE merely from merge/200 response.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
