# Holistic House · Mobile Messages fullscreen conversation · 2026-10-31

## Identity and source

- **Owner report:** iPhone screenshot supplied privately in chat on 31 October 2026 at approximately 18:12 Toronto time. Do not commit the image or names/chat contents.
- **Actual:** authenticated practitioner CRM Telegram thread, embedded under **My Clients**, inferred canonical route `/{ru,en,es}/app/messages?section=clients`; screenshot only shows domain, so exact query is **not independently observed**.
- **Reference intent:** functional Telegram/WhatsApp-style conversation, not a separate marketing page, editor, or static mockup. Same authenticated conversation, providers and replies remain.
- **React ownership:** `MessagesOrdersClients` → `MessagesSimpleInbox` → `CrmMessengerPanel`, or `DirectMessageInbox` for portal chat. Changes target only mobile conversation layout.
- **Production baseline when branch was created:** `codex/public-book-library@135addb48f2dbbecdf465d576213f02a023357c8`. This is NOT the repository default branch.
- **Screenshot viewport:** approximately 706×1536 source pixels; exact CSS width, DPR and Safari/PWA viewport state unknown. Browser chrome and iOS keyboard are external UI, not site pixels.
- **Identity gate:** source route/component matched to screenshot content, but authenticated live browser route and state not independently verified. Do not declare pixel match.

## Screen mapping

| Region | Before (owner screenshot) | After (mobile open conversation) |
| --- | --- | --- |
| Browser chrome | system/host toolbar at top | unchanged; never imitate it |
| Outer Messages heading | occupies significant height | behind fixed selected conversation |
| Orders / My Clients tabs | visible while writing | behind selected conversation; back returns to list |
| Client identity | tall inner card | single 50–56px toolbar with back/avatar/name/client-card |
| Mark as read | separate large button | compact 30px action when unread |
| Message history | small clipped scroll area | sole expandable scrolling area |
| Composer | large area under a card | 44px textarea + real Send + inline AI button |
| SalesBot | floats over last message | small **AI** button in composer; suggestions expand **in flow** only on tap |
| Keyboard | overlaps/clips message and input | `visualViewport.height/offsetTop` drives fixed chat height/position |
| Cabinet navigation | can overlap Send | hidden only during selected mobile conversation |
| Close | nested layout / tab switch | back arrow returns to real client list; draft preserved by component state while open |

## Behavior preservation

- Existing authenticated CRM, Telegram/WhatsApp provider checks, read/unread, direct messages, private requests, profile card, SalesBot drafts, and non-automatic Send handlers remain.
- No new API, credentials, data storage, message sending shortcuts or consent bypass. SalesBot produces a draft only.
- Mobile safe-area preserved, 16px textarea to prevent iOS focus zoom; no separate mobile chat route.
- On-screen keyboard uses visualViewport instead of assuming `100dvh` shrinks on Safari.
- Desktop/tablet remain original split-pane layout.

## QA and acceptance

- **Source checks:** `tests/messages-iphone-keyboard-layout.test.mjs`.
- **Rendered synthetic browser checks (on CI/authorized local browser):** `scripts/verify-messages-wellness-browser.mjs`, Chromium + WebKit, RU/EN/ES at 320/354/390/430. Must verify fullscreen boundaries, safe-area/dock, real composer geometry and shorter simulated viewport. Do not send real messages.
- **Human iPhone Safari:** authenticated 390px portrait with hardware/software keyboard, scroll 11 messages, back, card, send only via explicit test recipient.
- **Not established by source changes alone:** actual device keyboard behavior, rendered screenshot overlay, provider acceptance, merged state, Vercel READY or live end-to-end delivery. Record separately.

## Coordination

- Existing broad visual PR #2721 is behind production and overlaps client CSS. This is a small production-based keyboard/overlay fix; rebase/reconcile #2721, do not blindly merge older full CSS after this change.
- Functional contact/reply PR #2809 also touches `messages-simple-inbox.jsx` and its CSS; preserve its privacy/consent logic and reconcile on exact production HEAD before delivery.
