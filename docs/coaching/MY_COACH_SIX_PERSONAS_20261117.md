# My Coach — six public personas (2026-11-17)

Mira, Max, Sofia and Alex retain their existing first-party MP4 motion clips. The public
directory now also includes Merlin (reflective archetypal wisdom, adapted from the
already prepared #4748 proposal) and Harry Potter (practical courage, friendship and
resilience). Lea, Noah, Iris and Ray stay hidden from public discovery, yet existing
historic session URLs still work.

The existing shared Coaching Brain, Director, privacy/consent and stage policy power
both additions. Original RU/EN/ES introductions, five stages and server speech styles
are registered; all ten Google Chirp 3 HD names are distinct, but the existing explicit
cost and consent gates remain OFF unless separately configured. Fish interim library
voices may be shared between personas; no film, actor, celebrity or dub voice is copied.
No new paid model, voice vendor, database, CI workflow or Vercel project is created.

Merlin retains the first-party still from #4748. Harry's presentation now uses
the **owner-approved 12-frame animated GIF** (uploaded with a misleading .png
extension) instead of the earlier warped portrait. The first frame is stored as
`harry-soft-still.webp`; two silent H.264/yuv420p loops are `harry-soft-calm.mp4`
for profile/idle/greeting/speaking (7.0s) and `harry-soft-attentive.mp4` for
the microphone/listening state (8.25s). Both 360×644 at 24fps, created offline by
smooth temporal frame blending, without stretching, changing face geometry or
synthesizing speech. The filenames are versioned to avoid stale browser caches.
All three assets are first-party in the existing My Coach folder; previous
`harry-still.webp`, `harry-calm.mp4`, `harry-attentive.mp4` remain as rollback.
Selected profile, coach rail, avatar fallback and video canvas use the same
approved character. Other persona assets, voice, auth and consent are unchanged.
Reduced-motion users receive a still, and these videos are NOT lip-synced or a
live call. Production browser/iPhone E2E remains a separate release check.

**Rights review:** Harry Potter is an existing protected fictional character and
associated marks/visual identifiers may require commercial permission. Source
implementation is not a rights license. Confirm rights with the product owner
before public commercial publication or replace the name and character with an
independent original wizard. We do not depict an existing movie actor.

Regression command:
node --test tests/my-coach-six-personas.test.mjs tests/my-coach-personas.test.mjs tests/my-coach-google-chirp.test.mjs tests/my-coach-four-living-pilot.test.mjs

Required release after checks: Core, Coaching Specialist, 320/390/430 mobile
EN/RU/ES, WebKit/Chromium, protected merge, normal hourly production publisher,
and separate real iPhone audio acceptance. No manual bypass or paid preview.
