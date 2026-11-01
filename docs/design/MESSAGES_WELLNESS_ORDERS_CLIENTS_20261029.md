# Holistic House · Messages 2.0 — approved mobile design and functional map

**Approved by owner:** 29 October 2026. Source: the three consecutive Russian mobile mockups approved in this conversation (Orders, Clients, Order chat). Current reference: owner's three actual iPhone screenshots of `holistichouse.vercel.app` Messages. Do not use the concept illustration's illustrative people, counts, payments, conversations, dates or order titles as production data.

## Page identity gate

- **Canonical route:** `/{en|ru|es}/app/messages`; previous entry screenshot is `/ru/app/messages` as a signed-in owner, at 390-ish CSS px, iPhone Safari/webview.
- **Orders state:** `?section=orders` (also default), optional existing UUID `?order=<id>` opens only an owned order.
- **Clients state:** `?section=clients` / legacy `?tab=chats` and direct `?to=<approved-master-slug>`, only signed-in, owner/practitioner state.
- **Identity:** same existing Messages route, account and role; replace default UI chrome, **not** the database/CRM, existing conversation provider, auth logic or order detail route. The approved mockup is a *concept* with synthetic content. Numeric pixel overlay with a real signed-in screenshot cannot be accepted until synthetic browser fixtures are captured in identical state and crop.
- **Production source at start:** `codex/public-book-library` SHA `121ccdc60c46cb2905f505411e5ca999858dc43d` via Vercel READY `holistichouse.vercel.app`. GitHub default `codex/bootstrap-books` is **not** production.

## Layout specification for 390px viewport

| Region | Target / order | Visual tokens | Existing code |
|---|---|---|---|
| Global public banner | Keep global site chrome as-is; one five-item Cabinet dock only | No duplicate bottom nav | `app/[locale]/app/messages/page.tsx` |
| Header | “Сообщения” 27–32px dark forest + subtitle “Заказы и общение” | Pale ivory canvas, one compact refresh action | `messages-orders-clients.jsx` |
| Gentle helper | Single compact card, only in list view, describes **actual** private function | Cream→sage gradient, botanical approved site art, rounded 18px | `messages-orders-clients.module.css` |
| Primary folders | Two mutually exclusive accessible tabs: “Мои заказы” / “Мои клиенты” (for non-practitioners: “Переписка”) | Deep green active, neutral inactive, small **actual** record count badge | `MessagesOrdersClients` |
| Search + optional filters | Search matching owned orders, names, titles/status; owner’s actual clients via current CRM | White rounded field, 44px filter button; no dead decoration | `MessagesOrdersClients`, `MessagesSimpleInbox` |
| Zero owned orders | Two fully clickable compact service banners immediately below tabs, only after loaded authenticated zero-order response; free *written* situation review with Andrey and five-lesson Reiki Practitioner course | First-party portrait and Reiki image on left, desktop two cards / mobile stacked | `MessagesOrdersClients`, `/services/free-situation-review`, `/academy/reiki/free-practitioner-course` |
| Order cards | Thumbnail from existing approved public assets; real service title/master/status/date, existing unread chat counter | Separate ivory 16px cards; actual status chips; no invented “Paid” status | `my-orders` endpoint + `MessagesOrdersClients` |
| Client inbox cards | **Actual** CRM/website/direct threads with source, unread/needs reply, natural preview | White cards, circle initials/verified private portrait only, date | `MessagesSimpleInbox` existing source-specific data |
| Order detail + chat | Compact pinned order card and pre-existing per-request conversation | Green own/ivory other bubbles; actual messages, original note, private media and send controls | `PracticeRequestConversation` |
| Bottom mobile dock | One global five-tab dock; disappears on focused input/keyboard | Existing safe-area support | `MessagesBottomNavigation` |

## Functional contract

- Default entry: display **My Orders** from `GET /api/app/messages/my-orders`, account-bound, no cross-user lookup. Show all historical requests returned, up to existing server pagination; never invent older orders.
- Tap **My Clients**: display the current owner-specific `crm`, `direct`, `request`, `business` list in one consolidated folder, **no nested Chats/Requests tabs**. Existing CRM Telegram sends have provider receipt constraints; business public enquiries are not sent via on-site chat without verified protocol.
- For a non-practitioner with no clients, name the second tab **Conversations**, not pretend the user has a business CRM; preserve private participant dialog access and requests flow.
- Tap order: keep `order=<UUID>` compatibility; render original service status and confirmed metadata only; wire existing `PracticeRequestConversation` `requestId` / account check; visible chat is attached to this exact order.
- Status colors: pending=amber, in progress=green, completed=soft neutral, declined/cancelled=grey. `remoteBooking.price` does **not** mean “paid”.
- Keep existing user-initiated microphone, private attachments, upload safety, retry and idempotent send semantics; don't introduce external paid APIs, public buckets, duplicate conversations, or synthetic messages.
- Search/filters must operate over actual authenticated results, with truthful loading, empty, offline, sign-in and failure states.
- In empty My Orders, hide unnecessary search, but retain the approved **small, noninteractive botanical helper** above the two tabs once the authenticated load succeeds; show **exactly two free full-card links** and a compact explanatory empty-state panel below. Never create sample orders. Do not show free-offer links for loading, errors, signed-out, client tab, order detail or existing orders. Cover widths 320, 354, 390, 430.
- Consultation offer means a *free written review*, **not a live free call** (live 30 min remains €50). No fake consultation booking or course completion is created by following these links.
- Existing five dock links and EN/RU/ES parity, accessible role=tab, aria-selected, focus rings, >=44px touch targets. iPhone widths 320, 354, 390, 430; no horizontal scroll / composer overlap.

## Routing + role matrix

| Entry | Expected screen | Backend | Access |
|---|---|---|---|
| `/ru/app/messages` | My Orders (list) | `/api/app/messages/my-orders` | Verified signed-in account |
| `?section=clients` | My Clients (owner) / Conversations (client) | `/api/app/messages/requests`, CRM + direct private inbox | Verified existing roles |
| `?section=orders&order=UUID` | Owned order status + conversation | `/api/app/practitioner-client-messages` | Customer or assigned practitioner only |
| `?to=slug` | Verified practitioner direct conversation | `/api/app/direct-messages` | Verified participant; no new pairing |
| Guest | Sign-in path + protected empty state | Authenticated GET returns 401 | No private content |

## Validation checklist

- [ ] Focused tests and source contract; account-switch/private data isolation.
- [ ] Scoped lint, TypeScript, Next build.
- [ ] Authenticated synthetic browser screenshots, WebKit & Chromium at 320/354/390/430 and desktop 768/1440; keyboard composer visible; overlay against **same-state** design reference.
- [ ] No synthetic client names/counts, false payment/provider receipts or phantom chat messages.
- [ ] Exact-head CI checked and safe merge, production Vercel READY SHA and canonical alias checked.
- [ ] Owner iPhone physical 2-account send/receive and optional mic/camera permission acceptance (not equivalent to synthetic source tests).

**Evidence status at authoring:** visual acceptance pending authenticated browser fixture; production not yet released; this document preserves approved concept and route/behavior invariants.

## 31 October 2026 · Owner-approved visual refinement (without new data or provider claims)

The original 3 PNGs in ChatGPT Library `/Holistic House/Messenger Design 2026-10-29/` remain the source of truth. User's later authenticated screenshots show a zero-order account and an actual Telegram CRM thread: those are **different page states** from the illustrative 4-order and practitioner request chat references. Match hierarchy, typography, compact controls, card shapes and wellness palette; do not synthesize reference messages or claim paid/media features on Telegram.

- The CRM thread uses `CrmMessengerPanel(conversationOnly)`; align its real text-only reply row (SalesBot sparkles, input, Send arrow) with the attached design. `CrmSalesbotAssist` must never float permanently over customer messages: closed helper is an accessible icon; suggestions open only when tapped and can insert a *draft*, never dispatch automatically.
- Unread CRM read-receipt uses a small `CheckCheck` action with full aria/title; no giant banner that displaces chat content. `CrmMessengerPanel` provider send guard and idempotency remain unchanged; do not draw audio/photo/video send icons on provider channels lacking verified upload transports.
- The `MessagesSimpleInbox` cards show a genuine source chip once and a distinct readable call to action rather than duplicating “Telegram” as preview and chip. A textual message preview requires an explicit owner-scoped, separately reviewed encrypted CRM backend; never invent private message excerpts.
- For accounts with zero orders, keep exactly the two functional existing free offers and one small illustrated empty explanation; previous 'no helper' compression is superseded by owner's visual-fidelity request. The consultation is a **free written situation review**, not a free live call.
- Preserve one five-item dock, actual keyboard-safe mobile conversation height, protected per-request messaging, independent account/RLS boundary and EN/RU/ES.

### Page-state mapping for visual acceptance

| Reference (941×1672 PNG) | Actual 31 Oct 2026 screenshot | Same state? | Correct comparison |
|---|---|---|---|
| `01_my_orders.png`: 4 illustrative orders | `IMG_8716.jpeg`: 0 real orders | No | Compare header, helper, tabs, typography and cards only; use synthetic 4-order fixture for pixel comparison |
| `02_my_clients.png`: 4 fictional people/topics | `IMG_8715.jpeg`: 2 real CRM/site threads | No | Compare card anatomy with synthetic same dataset, not counts or names |
| `03_order_chat.png`: protected master↔customer order chat | `IMG_8717.jpeg`: Telegram CRM owner thread | No | Apply shared chat styling; test each actual provider separately; never promise provider media sends |

**Evidence requirements:** real Chromium/WebKit 320/354/390/430 geometry, no cut-off composer, same-state screenshot/overlay on actual mock/synthetic data, and independent owner iPhone review for keyboard/permission. Code-only tests are not pixel fidelity. Last verified baseline at authoring `3c3bf9e194ae47d2e946d0b90ad18b12fe5b15f9`; production may advance before merge.
