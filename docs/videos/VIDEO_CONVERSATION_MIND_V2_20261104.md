# Video Conversation Mind 2.0 · implemented source contract
Date: 2026-11-04. Repo: andylitvinov-design/books. Target: codex/public-book-library.

## Audit
Before this change the site had a deterministic state machine:
category → topic → scenario → idea → curated phrase → mood/aspect/duration/music/captions → review → explicit confirmation → render.
The local parser handled common RU/EN/ES filters but was missing conversational repair
(undo, rejection, uncertainty, "leave music unchanged") and grounded responses to
informational questions. The existing free AI endpoint only rephrased a filter question;
it did NOT interpret a free visitor reply into the site taxonomy.

## Solution
- Local FAQ interpreter classifies user questions about price/free use, privacy, external AI,
  source footage, own photos, voice/audio guide, phrases, music, aspect, duration, download,
  current choices, explanation, stages and available options. Answers are localized RU/EN/ES,
  grounded in actual selected state and current catalog choices, with no mutation.
- Deterministic repair acts: undo the last changed draft, reject a selected proposal, ask
  for recommendation, preserve settings without accidentally overwriting them.
- Existing single Video Director component and licensed renderer remain the only UI/export.
  Text answers and buttons go through the same state machine. Explicit approve/create
  gates remain unchanged.
- Optional semantic selector for difficult natural-language answers:
  POST /api/holistic-support/video-chat-semantic. The server computes options from the
  canonical taxonomy, sends only current short utterance and public catalog options
  to a selected free-confirmed model, and accepts only one allowlisted optionId with
  numeric confidence >=0.90. Client independently revalidates optionId and stage,
  ignores stale responses, and cannot receive render/approve/edit commands.
- Semantic network path is OFF by default, even if the user opted into optional AI.
  Both HH_FIRST_VIDEO_AI_ENABLED=true and HH_VIDEO_CHAT_SEMANTIC_ENABLED=true must
  be deliberately configured AFTER account-level billing/free-tier verification.
  If provider is absent, times out, returns invalid JSON, or confidence is low, the
  local dialog continues with a clarification. No provider fallback/retry loop.
- Server uses existing same-origin policy, private headers and global shared free AI
  quotas (60/day, 10/min), further limited to 20/day, 3/min for semantic resolution.
  No extra cron, scheduler, paid subscriptions, media uploads, storage or database tables.
- User uploads, health/profile data, messages history and voice files are never included
  in the semantic request. A visitor's current utterance is sent only after explicit
  checkbox opt-in. No raw utterance is logged by the new route.

## Acceptance
- 108 distinct RU/EN/ES question examples mapped to correct grounded help topics.
- Regression cases for undo, reject, preserve, unsure, and combined format+music updates.
- Strict semantic input, parent/child tree validation, confidence/allowlist tests.
- Mock provider contract with disabled-by-default verification; no real paid calls.
- TypeScript and old video-chat tests must pass on the exact PR head before any merge.
- Real Chromium/WebKit mobile proof must show input + options parity, no keyboard overlay,
  no unexpected render/approval, and safe fallback with AI disabled.
- Release only after GitHub required checks and production Vercel deployment show READY.
  Branch commit and a green unit test are not proof of LIVE.

## Known limits
- Semantic interpretation is deliberately scoped to selecting canonical tree options.
  It does not generate new video footage, invent scenes, dynamically write captions,
  process clinical requests or emulate a human therapist.
- Free-tier eligibility must be verified against the user's actual provider account.
  No API key, environment flag or new paid usage has been enabled by this change.
