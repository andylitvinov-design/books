# Ali persona picker — mobile density & audible greetings (19 Nov 2026)

## View identity and reference

Owner's screenshot: mobile portrait **1206×2622 physical pixels**, approximately **402×874 CSS px @3× DPR**. Existing *Holistic House → Messenger → Ali → user-opened Persona modal*, English locale, persona Ali selected. Login status is not visible and is not inferred. Correct component: `components/app/ali-persona-picker.jsx` / its CSS module; shared public greeting engine: `components/app/ali-persona-audio.js`. Do not substitute My Coach's independent five-persona page.

## Reference geometry and requested change

Existing modal begins below the iPhone status region and ends near the bottom safe area; four stacked cards are taller than the available region. Fourth card (Sofia) is cut off above the fixed Apply/Previous chats footer. Keep the warm ivory dialog, teal chosen state, portraits, role, short description, voice waveform and single Apply action. Target: reduce each card's height (about 150 CSS px before → about 120–130 CSS px after), shrink header/footer whitespace, retain a **separately scrollable** list as a fallback for 320px-wide / very short screens. No fixed overlay should obscure the fourth option.

| Region | Keep | Adjustment |
| --- | --- | --- |
| Heading / close | Leaf icon, title, subtitle, close control | tighter gaps, 19px heading on phones |
| Guide rows | Four distinct portraits, names, roles, descriptions, radio/check marks | 68×72px images, compact typography, approximately 5px row gaps |
| Listen | Explicit per-persona voice sample, accessible Pause/Play | full-width 42px tap row, actual playback events, retry state |
| Footer | Only one chosen guide can be applied, history preserved | 44px Apply button, shorter note and history link |
| Micro/landscape | Same actual modal, no demo route | scroll on short portrait, two columns on wide/short landscape |

## Interaction flow (keep)

User opens Persona from Ali header or Home → modal shows current persona → selects one of four → listens (no autoplay) → confirms → existing `useAliPersona` localStorage/event state updates; current Messenger/Telegram/CRM history remains unchanged. Voice sample contains **fixed public editorial greeting only**, not any private user messages. Natural cloud speech only if existing preapproved backend is available and on user request; iPhone uses device speech directly in the user's tap to avoid losing gesture activation on asynchronous provider failure. Start/finish/error signals are reflected in buttons, with no false indefinite playing state.

## QA / acceptance to run on connected browser

- English/Russian/Spanish at 320, 354, 390, 402, 430 CSS px in iOS WebKit, and desktop 768/1440. All four rows visible at 390/402/430 in typical portrait height. Very short viewports must scroll the **list**, not clip buttons.
- Each persona preview plays its own localized text; switch speaker during playback; Stop; replay after End; retry after unavailable audio; close modal while playing; return to modal.
- Check one real audible iPhone Safari greeting, especially iPhone silent-mode and device volume limitations. Production E2E audio remains unverified until browser/device exercise; source/CI alone cannot prove speaker output.
- Preserve keyboard Escape/Tab trap, aria labels, selected indicator, privacy note, previous chats and EN/RU/ES state.

No new paid voices, TTS budget, provider, workflow, deployment or privacy grant. Standard protected PR → hourly Vercel Production publish only.
