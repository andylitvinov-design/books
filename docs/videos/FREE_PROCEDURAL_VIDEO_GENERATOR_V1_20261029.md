# Holistic House · Free Procedural Video Generator v1
**29 Oct 2026 · delivery PR, not a remote AI model**
**Production target:** codex/public-book-library (NOT repository default)

## Product problem and solution
The existing "Smart match" chooses a pre-existing MP4 from a catalog. The existing
four-shot Cinematic Director paints curated Canvas motifs and exports real media,
but it is buried in expanded controls. Customers have no distinct entry to
CREATE NEW MOVING ARTWORK FROM A VISUAL DESCRIPTION.

This PR adds a prominent source selector **above the existing six editor panels**:
1. "Create new animation": local visual prompt, three genuinely NEW drawn motif
   engines, palette, movement, deterministic variation, interactive moving
   preview, reuse of the current 720p/1080p MediaRecorder recording with
   optional attached music and consented user photo. No catalog MP4 is used.
2. "Edit existing footage": the existing curated licensed HD catalog; the
   original six panels, source-backed MP4 decoding, compact Hypno, personal
   meditation and cinematic director remain available and functionally intact.

Default remains the established catalog to preserve existing customer flows;
the NEW animation choice is shown **first and prominently** on all screens.

## What text understanding actually means
The browser-local pure compiler recognizes supported visual motifs and color/
motion words in RU/EN/ES. Supported families:
- **Mandala**: radial geometry, seed-specific petals/rings, slow independent
  rotation and luminous central gradients.
- **Light and energy**: parameterized orbiting rings, animated beams, glowing
  light streams and seeded particles.
- **Lotus and water**: blooming seed-specific petals, reflected light and
  rippling waves.

Palettes Gold/Ocean/Violet and motion Calm/Flow/Dynamic are inferred from
supported words or explicitly selected. Changing a variant modifies a seed,
causing new pixel geometry rather than a different source clip. Auto-detection
uses a visible fallback message for unsupported descriptions. This is
**controlled procedural animation**, not unrestricted photorealistic text-to-video.
We do not generate humans, complex animals, arbitrary invented filmed settings,
3D movies or voices from a text description.

The visual prompt and psychological goal remain two different inputs. The
existing optional "What would you like to change?" field below the generator
remains the separate personal goal; it does not get transmitted to a model.
The visual plan contains only sanitized parameter IDs, seed and length.

## Runtime and privacy
- Source: lib/mandala/free-video-generator.mjs (pure, deterministic, no network)
- Renderer: lib/mandala/free-video-renderer.ts (browser Canvas gradients, shapes,
  petals, parallax-like movements, glowing symbolic art)
- UI: components/mandala-free-video-generator.tsx + .module.css
- Integration: the SAME main editor paintCinematicFrame() receives an optional
  procedural plan; both live-preview Canvas and recorded MediaRecorder use this
  path, followed by the existing affirmation painter. The existing recording
  still uses captureStream, existing permitted user-photo overlay and attach-only
  audio track (no silent fallback if selected audio fails).
- The recorder only encodes after the visitor clicks Create. Preview movement
  only starts when clicked (and stops on hidden/disabled). No remote AI calls.
- A generated plan or variant changes exportSignature and invalidates any
  previous downloadable clip. No stock MP4 master is loaded in generation mode.
- Existing 10/20/30/60s and aspect controls share state. Full HD depends on
  device capabilities; a heavy 1080p 24fps path is NOT promised on all phones.
- No account upload, persistent storage, new payment, API secret, paid AI render,
  CDN credits or extra compute billed to the project.

## Release gates
- Pure compiler unit tests cover localized prompt detection, seed determinism,
  variants, unsafe options, unsupported motifs and non-disclosure.
- Focused CI must pass lint, TypeScript, Next production build.
- Browser acceptance in real Chromium and WebKit (RU 390px) verifies two
  source modes, newly composed visible pixels, actual different variation,
  animated preview, no original MP4 element, a real saved video (Chromium),
  ffprobe video stream, actual differences in decoded frames, zero provider
  calls and console errors. Existing 10 global mobile/source checks remain.
- Vercel READY exact merged SHA and canonical alias after merge; physical iPhone
  Safari with actual audio must be manually accepted separately.

## Next value improvements
Better anti-aliasing/material/lighting on WebGL GPU, additional supported
symbols (temple/trees/flowers), richer camera moves, transitions and beat-aware
montage of generated scenes AND existing licensed footage. If a description
requires a realistic actor/forest flythrough, explicitly explain that it
requires filmed footage or a separate AI provider, not promise it for free.
