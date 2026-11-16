# HH Learning Path — rules-first release and operational limits

Status: source implementation for HH-AI-LEARNING-PATH-TZ-v1.0. **Do not claim full AI tutoring or production readiness without verified provider, DB migration and live E2E.**

## Components and routes
- Public and signed-in entry: /{ru|en|es}/academy/my-path and /{ru|en|es}/app/learning-path.
- Authenticated API: /api/learning-path GET (owner-only list/detail) and POST (create, mark, tutor, archive, delete).
- Core: lib/learning-path/planner.mjs; five canonical Reiki source IDs from data/academy/energywork-ai-schema.js.
- Storage: app_private.learning_paths and app_private.learning_path_tutor_turns, private AES-GCM interview/tutor text, strict owner/RLS.
- New persisted progress is **self-report only**. Original Reiki completion, journal, XP, initiation and CRM records remain untouched.

## Production gate
1. Check open PR overlap and exact protected base. Run: node --test tests/learning-path-planner.test.mjs, eslint, tsc, Next build and source regression.
2. Confirm target Supabase app_private schema, migration ledger and RLS/grants. Apply 20261105060000_hh_learning_path_private_v1.sql only after review.
3. On a test account, verify interview consent, active course creation, resume, mark/unmark, tutor encryption/history, idempotency, archive, export, delete, cross-account 404.
4. Test EN/RU/ES and physical or automated mobile WebKit 320/390/430 px, bottom navigation, safe-area and keyboard.
5. Merge on exact PR HEAD via hh-merge-check and approved specialist gates. Verify Vercel production READY, deployed SHA and public alias; no PR-only claim of LIVE.
6. Emergency stop: set HH_LEARNING_PATH_ENABLED=false as production env flag. This preserves all private records.

## Honest product limits
- AI external model calls: **none**. Tutor mode is explicitly 'rules'; never label it generative AI.
- Spanish landing is translated; the canonical Reiki lesson currently links to English, explicitly labeled.
- Mentor CTA opens existing Messenger; no auto-send and no sharing of reflections.
- User must explicitly consent to saving answers. No marketing/push opt-in or hidden CRM creation.
- No new paid services and no separate login provider.
