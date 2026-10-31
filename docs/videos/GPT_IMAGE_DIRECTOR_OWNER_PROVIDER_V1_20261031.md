# Holistic House · GPT Image Director — owner provider + image-to-MP4 motion pilot

**Scope:** narrow, independent foundation for the existing `/[locale]/holistic-support/mandala` Studio. The goal-first Auto Video Director, Canvas/MediaRecorder, first free video PRs, audio and XP wallet are owned by separate workstreams. **Do not start a second editor.** This PR is intentionally new files only.

## Delivered code (this PR)

- `lib/video-generation/safe-visual-brief.mjs`: recomputes a privacy-safe prompt from existing `buildCinematicStoryboard` and `safeCinematicPrompt`. It accepts **only** theme, style, format, locale, 20/30/60 sec, one/two shot positions and the enumerated exclusions water/forest/night. Rejects raw wishes, profile, photos and arbitrary text. SHA-256 captures exact server-reconstructed plan.
- `lib/video-generation/openai-image-provider.mjs`: explicit `gpt-image-2.5-flare` Image API adapter, owner and spend switches default **OFF**. A caller must supply proof of an actually persistent single-request reservation and verified owner session; this library does not manufacture proofs or reserve money itself. Builds one lower-cost JPEG request, hashed safety identifier, no automatic paid retry, bounds provider body and verifies JPEG header and dimensions. Returns bytes and a `not_delivered` status; no implicit publish, charge, account entitlement or XP.
- `scripts/render-image-motion-clip.mjs`: real offline FFmpeg H.264 image-to-camera-motion clip. Explicit rights declaration, SHA-256 checks, path containment, duration and aspect bounds, ffprobe QA. This is visual camera movement over a still **not** generated subject motion. The existing `scripts/cinematic-video-assemble.mjs` can concatenate approved resulting MP4 clips with library clips, voice and music. Works without image API use.
- `tests/gpt-image-director.test.mjs`, `tests/gpt-image-motion.test.mjs`: deterministic privacy/permission/provider mock and real ffmpeg/ffprobe motion checks.

## Flags: never enable all until durable owner controls exist

| Server-only variable | Default | Role |
|---|---|---|
| `OPENAI_API_KEY` | unset | OpenAI project key, no browser exposure |
| `HH_GPT_IMAGE_ENABLED` | false | kill switch |
| `HH_GPT_IMAGE_OWNER_ONLY` | false | owner pilot boundary |
| `HH_GPT_IMAGE_SPEND_APPROVED` | false | explicit expenditure gate |
| `HH_GPT_IMAGE_SAFETY_SALT` | unset | >=32 random chars, keyed hash for `safety_identifier` |

**No connected site route or worker calls `generateOwnerImage` yet.** This is intentional: no API key, global cost reservation ledger, approved spent-budget cap, private image storage and working owner UI were verified. Turning on flags alone does not provide a safe public product. Do not claim image generation is LIVE. A later backend PR must persist/validate the one-shot authorization proof and spend cap, rather than trusting client input.

## Sample local motion manifest

```
{
  "version":"hh-gpt-image-motion-v1",
  "image":"approved-background.jpg",
  "assetSha256":"<actual sha256 of this exact file>",
  "rightsConfirmed":true,
  "seconds":5,
  "aspect":"portrait"
}
```

The `image` file must be in the same directory as the manifest, a regular JPEG/PNG/WebP, rights-cleared for rendered reuse. Compute SHA with `shasum -a 256 approved-background.jpg` on Mac or `sha256sum` on Linux. Run:

```
node scripts/render-image-motion-clip.mjs ./private-master/manifest.json ./private-master/shot-1.mp4
node scripts/cinematic-video-assemble.mjs ./private-master/approved-composite.json ./private-master/final.mp4
```

The composite manifest uses the pre-existing `hh-assembly-1` format and **only rights-cleared** MP4s. Do not store private client footage in `public/` or in GitHub Actions logs.

## Required next backend/release work

1. Check merge/release and preserve UX in **#2713** and **#2643**; keep editor out of this provider patch.
2. Create account-scoped DB-backed quote/reservation/job queue with unique `(account_id,request_id)`, 1–2 image ceiling, explicit owner/admin approval, global daily budget; transactional leases, status, cancellation and reconciliation. Do not call provider from long-lived Vercel HTTP request. `authorization` passed to `generateOwnerImage` must originate from this **server-verified** transaction, never a browser body.
3. Add a private image bucket and per-account read-signed URLs, RLS, SHA-256 verified storage write, deletion and retry controls. For exact JPEG integrity use a decode/probe in media worker, not solely the fast header inspection of the provider adapter.
4. Add worker staging: queued → generating → image verified → motion render → MP4 QA → delivered; ambiguous provider timeout = `needs_review` **not** immediate retry. Reconcile actual API charges before XP debit.
5. Reuse existing XP wallet after **#2634 → #2705** actually passes migrations, RLS, and live. Never create a second balance or free paid API generation.
6. Add a small optional image tab to existing Director only after its active PRs land. Show quoted cost, consent, honest progress and cancellation. Basic local render remains free.
7. Release verification: real owner authorised OpenAI output + actual private image readback, 30s MP4 with real licensed catalog clips, ffprobe + decoded frame difference, iPhone Safari, Vercel READY exact production SHA and canonical alias.

## Provider references
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- https://github.com/andylitvinov-design/books/issues/2397