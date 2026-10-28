# Holistic House — native Messages: private photographs and voice notes
Date: 28 October 2026 (Toronto). Owner issue: [#985](https://github.com/andylitvinov-design/books/issues/985).

## User-facing behavior

- In **Messages → Conversations**, client and practitioner can attach a photo (HEIC/JPEG/PNG/WebP from iPhone Photos) or audio file, or press **Record voice** / **Записать голос** / **Grabar voz**.
- Voice recording is opt-in per tap; iOS MP4/M4A and compatible WebM/Ogg browser formats; 120-second auto-stop, explicit finish/discard, preview and separate Send confirmation. No auto-send or transcription.
- Photo is decoded locally, EXIF/GPS removed by canvas re-encode and compressed to JPEG ≤3 MB. For private attachments ≤3 MB, an authenticated same-origin streaming upload avoids Safari cross-origin signed PUT failures. Larger audio files keep the legacy signed Storage upload within the existing 20 MB cap. Both paths reuse the **same** encrypted conversation and private asset table, not a second messaging system.
- A stable, immutable upload intent and message operation ID are retained across retries. Server checks account, thread membership, block state, exact size, MIME and magic bytes; no upsert; complete() rechecks Storage and signature before the user can send.
- Private photos and audio are accessed only through authenticated member media route with short-lived signed private Storage redirects. The CSP permits the exact configured Supabase HTTPS origin **only** in the EN/RU/ES native Messages and My Practice screens; other pages are unchanged.
- Audio publication permission remains **off by default**, with separate sender consent and recipient confirmation. No media is automatically forwarded to Telegram, WhatsApp, YouTube, marketing pixels or push notifications.

## Checks performed / acceptance gates

Read-only Production Supabase check: `hh-member-direct-media` is **private**, MIME list includes JPEG/PNG/WebP/MP3/MP4/WebM/Ogg/WAV, max object 20 MB. The four `app.practitioner_direct_*` tables have RLS **enabled and FORCE**. At audit: **0 threads, 0 messages, 0 assets**.

- Local deterministic transport/security and existing direct-message synthetic tests: **17/17 passed** (sender/recipient/outsider, signature, MIME/size, idempotence, EN/RU/ES, photo viewer).
- Local `tsc --noEmit --incremental false` passed.
- Full project ESLint on the isolated Mac worktree is **not a passed gate**: the shared external `node_modules` symlink makes Rushstack's Next ESLint patch fail to recognize its caller. GitHub Actions with lockfile-matched `npm ci` must run lint.
- Full production Next build, exact-head GitHub CI, rollout READY SHA/alias and **two authenticated browser accounts on physical iPhone Safari** need explicit verified results before calling delivery proven.
- No existing client photos/audios were opened or sent; no migration, new paid API, outbound provider setup, or extra object bucket.

## Owner acceptance script, after verified deployment

1. Sign in on the canonical [Messages](https://holistichouse.vercel.app/ru/app/messages) as the test client and on a second authorized master account. Choose an existing authorized private thread (or start one explicitly).
2. On iPhone Safari, send a non-sensitive sample photo from Photos and a short native voice note. Confirm both render and play on the **other** account, and after a refresh; verify failed mobile-network retry does not create duplicates.
3. Ensure a **third unrelated account** cannot access either original asset URL; verify microphone denial/discard, EN/RU/ES at 320–430px, block behavior, no publication without opt-in.

**Interpretation:** a green source test or Storage intent does **not** prove recipient delivery. External Telegram/WhatsApp transport remains a separate disabled/consent-gated program in #985.
