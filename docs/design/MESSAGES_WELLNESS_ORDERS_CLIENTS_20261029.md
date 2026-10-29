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
