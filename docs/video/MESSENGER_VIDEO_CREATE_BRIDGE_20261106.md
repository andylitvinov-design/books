# P0: Messenger → Studio video creation handoff · 2026-11-06

## Reference screen and exact component
Owner iPhone screenshot: `/{en,ru,es}/app/messages?section=ai`; compact AI Messenger at final review, possibly guest or session-unresolved, ~390px content viewport. The green button was not a renderer. Keep a single HolisticAgentChat and existing Mandala Canvas/WebCodecs/MediaRecorder.

## Root cause
The AI Messenger's `authenticated` flag came from `GET /api/app/messages/my-orders`. A signed-in user's orders service may be unavailable even if authentication is valid; the UI falsely treated it as guest and offered Google again.

## Fixed route
Independent private same-origin `GET /api/app/session` uses the already verified Supabase identity, response/no-store private headers and explicit origin check; orders/CRM are not consulted. Only HTTP 401 is guest; 5xx/network/malformed response is unknown with a retry. A verified account change or confirmed sign-out may reset the in-memory AI draft; a transient orders failure cannot.

## Video user journey
1. Chat collects canonical topic/story/mood/format/duration/music/text. A handoff packet is accepted only after validating the full canonical parent chain.
2. The final review keeps the 12 optional edit links inside a closed, accessible disclosure; one primary CTA says "Continue to create video" rather than falsely claiming an instant MP4.
3. Signed in: existing one-use sessionStorage handoff opens the real Studio; guest: same existing Google PKCE flow, then Studio with the draft retained. Neither an auth check nor a chat click renders or charges for video.
4. Studio presents physically approved scenes and requires explicit confirmation and one final Create tap. It retains the real encoder, XP credit checks, audio/media consent, WebKit MP4 decoding and private saved-video handling.
5. Success means real playback/download of completed MP4. Navigation, HTML preview, API 200 and a chat reply alone do not prove success.

## Verification / release
Source regression contracts for RU/EN/ES, independent auth, handoff and compact review are extended. Exact-HEAD Core/Guard/Specialist plus real 320/354/390/430px iOS/WebKit guest/signed-in/expired and scene → render → play → download acceptance are required. No new provider, secrets, migration, automation, billed video render, or queue is introduced. Browser visual overlays/real signed-in iPhone E2E must not be asserted without captures.
