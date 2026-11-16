# Messenger · previous AI reply visible above the iPhone keyboard (2026-11-12)

## Page identity / reference
- User-provided iPhone screenshots of the same AI Assistant tab in the Holistic House Messenger, English UI, Cyrillic device keyboard.
- Canonical route: `/en/app/messages?section=ai` (equivalent `/ru/app/messages?section=ai`, `/es/app/messages?section=ai`). The actual URL bar and authentication state are not shown in the references; the scroll defect is independent of client role.
- Screen A: editor focused, opening hero visible but the assistant's welcome question is below the keyboard-visible transcript.
- Target screen B: editor focused, conversation moves upward within the transcript so the latest assistant question is visible immediately above the pinned editor.
- Route owner: `components/app/messages-orders-clients.jsx`; scroll owner: `components/holistic-agent-chat.tsx`; existing layout CSS remains unchanged.

## Behavior contract
- On first load without keyboard: keep the video hero at the top of the conversation.
- On focused composer and iOS visualViewport resize/scroll or transcript resize: reveal the welcome question if no text turns exist; otherwise reveal the latest assistant bubble.
- Scroll only the inner `[role="log"]` transcript; keep the input, send control and app navigation intact. No whole-page `scrollIntoView`, duplicate chat, reset or loss of messages.
- Do not automatically override manual scrolling through older turns. Preserve EN/RU/ES, media playback by user action, guest/auth and private history/consent.

## Visual block reference (approximate, from cropped user screenshots)
- Mobile header + language switch remain at top; the AI video header may crop upward behind the transcript's scroll boundary.
- Last assistant prompt is fully visible between the remaining portion of the hero and composer while the keyboard is open.
- Composer remains a full-width rounded toolbar immediately above keyboard; no overlap or text clipping.

## Acceptance and evidence
- [x] Same Messenger AI view/source identified, no route/role mismatch inferred.
- [x] Targeted focus/resize source assertions prepared.
- [ ] Run full focused Node tests, lint/TypeScript and browser checks on protected PR HEAD.
- [ ] Render iPhone WebKit focus/keyboard at 320, 354, 390, 430 CSS px; inspect question and last AI response visibility, including long reply and manual history scroll.
- [ ] Confirm actual LIVE deployment SHA after protected merge; compare captured target screenshot and app Safari result.
- Status at source authoring: CODE PREPARED; visual browser QA and LIVE unverified.
