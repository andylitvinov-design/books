# AI Messenger · compact test picker · owner 14 Nov 2026

## Same-view identity
- Canonical: existing `/ru/app/messages?section=ai`, analogous EN/ES, guest and signed-in.
- Starting state: Messenger → Тесты → topic (Личность / Стресс / Отношения / Работа и ресурсы).
- Reference: owner's two iPhone screenshots of Messenger test picker, 13 November. Preserve site chrome, portrait and fixed composer/dock; change only scrollable transcript and the test picker. No duplicate route, generated image, new API or test catalogue.

## Screen specification
- Only **latest user topic choice + one assistant invitation** are rendered above the picker. The full prior transcript remains in existing React/private history, reversible upon leaving test flow.
- Picker starts directly with matching photo cards, not behind a second tap. Filter pills: Все, Анкеты, Pro (sourced, not validated), Хобби, Типологии; same underlying `testKindFor` and HOBBY keys as global catalogue. Search and 3 initially visible cards, subsequent 4 each tap.
- Each photo-left/card-right row includes title, source question count, 1–2 line description and a real 44px Take action. Persisted guest run remains first and its Resume uses original protected endpoint. Link to the real complete library in the header.
- Touch geometry: iOS 320/354/390/430; only existing thread scrolls; no horizontal overflow or nested catalogue scroll; keyboard/composer above fixed 7-item dock.
- Back restores old messages. After selecting a test, adult consent, unmodified instrument language, special/trauma safety, secure guest run/resume, answers/result/report remain original. No sensitive test answers in general LLM history.

## Evidence and release
- Source regression in `tests/messenger-test-card-layout.test.mjs`.
- Run actual Chromium + WebKit 320/354/390/430 same-route guest screenshot and interaction review, including EN/RU/ES, guest saved draft, filter and first question; compare geometry to owner reference before declaring visual fidelity.
- Exact-HEAD Core/Specialist/browser, protected merge and Vercel READY alias/SHA separately. A source test or READY response alone is not proof of real iPhone acceptance.
