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

Merlin's first-party still comes from #4748 and remains static. At the owner's
19 November request Harry now uses the owner-supplied portrait, cropped to 3:4,
with a silent six-second H.264 MP4 loop and WebP fallback stored in the existing
first-party My Coach media folder. The old SVG remains as an unused rollback
asset. The six-second calm loop remains for idle/greeting/speaking. An additional
owner-requested eight-second `harry-attentive.mp4` (H.264 600×800, 24fps, silent)
plays only in the `listening` phase: two nods and visibly moving hands, rendered
from the same supplied picture using offline portrait warps. It is not real-time
motion capture, speech lip-sync or a video call. The selected phase changes the
video source and safely remounts the video element; the existing still remains
for reduced-motion users and playback failures.
No paid rendering, new voice, model or consent flag was enabled. Actual signed-in
iPhone playback still needs separate QA.

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
