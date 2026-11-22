# Generated site coach avatars in the practitioner's My Materials · 21 Nov 2026

**Scope:** this is a view of existing first-party public coach assets, not new
HeyGen generation, not a second video editor and not a new media bucket.

## Behavior
- My House → My Materials → My AI Avatars (once existing #5337 merges):
  the existing generated private Live Photos list stays as-is. An additional
  owner-only section displays Mira, Sofia, Max and Alex, calm + attentive each.
- Source MP4s are the 8 previously generated 5-second HeyGen clips, already
  referenced by \`scripts/prepare-my-coach-natural-mp4.mjs\`. The normal
  Vercel Production prebuild mirrors each as
  \`/images/holistic-house/my-coach-motion/<persona>-natural-<take>-v1.mp4\`.
  No provider job, credit, or new render is triggered by the Cabinet.
- Practitioner authentication is server-verified and hash-checked using the
  existing \`practitionerEmailAllowed\` gate. Other clients do not see the
  public-preset Cabinet panel. Account ID header mismatches fail closed.
- "Remove from my avatars" inserts only an account-scoped private hide record.
  Restore removes this record. Shared site files, playback on public pages,
  other accounts and source filenames never change.
- **Personal uploads are different:** existing \`/api/app/support-photo\`
  already deletes that account's saved portrait, and #5339 adds DELETE of
  individual private gallery photos. #5337 exposes deletion of private generated
  Live Photos via its existing signed/owner-scoped API. Do not collapse these
  hard-delete flows into public-preset hide. Deleting user files from Supabase
  does not itself confirm removal of any earlier upload to HeyGen's servers:
  #5337 provider-side asset erasure must be accepted separately.
- Account scoped table \`app_private.site_coach_avatar_hidden\` uses FORCE RLS,
  \`auth.uid()\`, account_active, app.accounts cascade, and only hh_app_backend
  grants. There is no new public user information exposed.

## Acceptance
- Protected exact-HEAD Core/Specialist/browser/merge check and migration apply.
- Authenticated practitioner: 8 visible, remove one, reload retains hide,
  show removed → restore. Check output MP4 and poster on served Production.
- Two separate Google accounts: clients can delete only their own private
  photos and Live Photos; they must not access owner-only preset API. A forged
  account header, forged preset ID, foreign origin and expired session fail.
- EN/RU/ES, 320–430px, Safari reduced motion, no autoplay or added overlay.
- Production branch \`codex/public-book-library\`; only existing hourly publisher.
  Merge/READY alone are not proof of signed-in E2E, media playback or privacy
  erasure from a third-party provider.

Depends on #5337 My Materials and #5339 multi-photo gallery; no changes
to either concurrently owned PR. No paid API or feature gates enabled.
