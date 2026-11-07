# iHelp / AI Video Director — owner visual acceptance (7 November 2026)

## Source / page identity
- **Reference:** owner's second illustrated mobile mock from the current ChatGPT task (private reference; do not publish or reuse it as fake interactive page output).
- **Actual before change:** owner's first iPhone Safari screenshot. The current production interface has the right single Director and imagery but over-large topic-image cards, navigation at the top, a faded hero and a text composer below the visible part of the thread.
- **Same route:** `/{en|ru|es}/holistic-support/mandala`; user-invoked **iHelp overlay**, existing original Video Director. Primary comparison is guest, initial `category` step, no selected goal and no private state. Production default branch `codex/bootstrap-books` is not this site; release target is `codex/public-book-library`.
- **Reference vs actual chrome:** screenshots have different browser/status-bar crops and image pixel dimensions. Compare content only at the same **CSS** viewport. A desktop/older in-progress chat transcript is not the approved fresh welcome.

## Block / layout specification (mobile 320, 354, 390, 430 CSS px)
| Region | Keep / change | Expected visual and active behavior |
| --- | --- | --- |
| iHelp close bar | Keep | Real close + existing AI safety disclosure; do not impersonate a therapist |
| Director identity | Keep; improve copy | One existing Director, truthful real-footage statement, real settings button |
| Photo hero | Restyle | Crisp self-hosted approved sunrise photo, **left-only** light gradient, strong dark title, portrait remains clear on right |
| Three action cards | Replace icon-only gradient tiles | 3 compact illustrated cards, real Create (continue canonical choices), Explore (real in-chat help) and Ask (focus text) actions |
| Personal composer | **Move into welcome directly after cards** | **One** real form, visible without long scroll on standard iPhone, 16px input, mic opens existing Studio audio control (not STT), send uses original answer state machine; no fake microphone transcription |
| Topics | Restyle / reorder visual only | Five canonical targets in order Body · Energy · Love · Work · Stress, localized labels, pastel single-line chips with horizontal containment on narrow screens |
| AI / Orders / Clients | Move visually only at welcome | Existing three protected routes, one bottom row after the welcome thread; normal in-progress conversation retains its existing topology |
| Expanded help | Collapse | Optional `details` only, real published-video link, no blocking marketing popup |

## Invariants and interactive QA
- On fresh welcome, the sole `form[data-video-chat-composer]` must be *visible within* the scroll viewport; five canonical chip ids are `body,energy,love,business,stress`; no horizontal viewport overflow. The greeting must start within the viewport, and AI/Orders/Clients must appear below the welcome content.
- Clicking **Create my video** enters the original active answer panel; clicking a chip calls `answer(value)`; clicking **Explore ideas** calls existing in-chat help; **Ask a question** focuses the true composer. Sending custom text must preserve ordinary dialogue and errors.
- Voice button enters the existing audio settings UI, **not** a claim of speech-to-text or completed MP4. No unapproved paid AI/provider or microphone streaming.
- Maintain one renderer and MediaRecorder, MP4 rights checks, opt-in consent default OFF, private media guards, signed-in Orders/Clients, EN/RU/ES localization, keyboard focus and reduced motion.
- The existing Playwright public Browser workflow covers RU/EN/ES + 320/390/430; the exact owner iPhone Safari screenshot/keyboard and cropped pixel overlay remain a separate owner/device QA item, **not implied by CI**.

## Release evidence to append after checks
Use the actual PR, exact tested head, protected `hh-merge-check`, merge commit, Vercel READY serving SHA and canonical-alias check. HTTP 200 or an unexamined screenshot does not prove interactive E2E. Do not claim physical iPhone QA unless directly performed.
