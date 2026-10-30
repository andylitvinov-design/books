# Holistic House Video Studio · Basic / Smart / Pro and safe paid-code pilot
**Implementation 30 Oct 2026. Production base: codex/public-book-library, NOT repository default.**
**Status: integration staged in PR. Paid provider MUST stay OFF until credentials, budget and real end-to-end test.**

## Public product promise
- **Basic $0**: existing first-party real MP4 montage PLUS brand-new locally generated 4-shot symbolic videos (Mandala, Light/Energy, Lotus/Water), seeded variations, color grades, original music, consented local photo, actual browser-recorded video.
- **Smart proposed $2**: up to 30 seconds *final composite*, **one 8-second 768p HeyGen Video 1 AI shot** using OpenRouter, then custom 22-second Basic footage. Full 30s automatic combining of new remote shot is **not yet shipped**. No claim that an 8s clip is a finished 30s Smart video.
- **Pro proposed $9.90**: up to 30s finished vision, initial API **one 15-second 768p AI shot**, rest curated/procedural. Multiple paid AI shots and final 30s automatic studio assembly **not shipped yet**.
- **First Smart free**: owner-verified signed-in account **one** gift coupon only, never anonymous or unlimited. The DB enforces unique gift recipient. Manual owner issuance after eligibility check, not automatic on first click. No coupon credit is issued on page view.

The public selector appears ABOVE the existing six compact editor panels. When provider disabled, paid mode explicitly explains that only a free draft can be created and no charges apply. Client can prepare prompt and first-party cinematic storyboard, but no fake paid status.

## Provider evaluation
- Primary prototype: OpenRouter asynchronous video API POST /api/v1/videos using exact official model \`heygen/heygen-video-1\`, GET /videos/{jobId} and GET /videos/{jobId}/content?index=0.
- HeyGen Video is general prompt video, not HeyGen Avatar/Video Agent. Standard 768p current list ~$0.036/sec (promo ~$0.018/sec expiring 31 Oct 2026). **Cost must be re-quoted and tested before launch**: current internal guard uses conservative 4 cents/second.
- Smart budget 8 seconds × 4¢ = 32¢ estimated, external ceiling 75¢. Pro 15s × 4¢ = 60¢ estimated, ceiling $5.50. Rate and provider model are server-owned, not client-supplied; real provider charges, failed clips and retries may differ.
- Fallback candidates: LTX 2.3 Fast through fal.ai ($0.04/s 1080p starting), Kling owner-only, Higgsfield aggregator. None silently activated or auto-charged.
- HeyGen Creator subscription credits are NOT API credits. Need separate OpenRouter Video API key and prepaid budget.

## Privacy and fraud prevention
- Dedicated production secrets: HH_VIDEO_OPENROUTER_API_KEY, HH_VIDEO_CODE_HMAC_KEY (at least 32 random characters), HH_VIDEO_PAID_ENABLED (default OFF).
- Personal goals, medical data, test answers, user photos, narration text never automatically transmitted externally. The customer enters a separate safe visual prompt and explicitly consents. Payload excludes client profile.
- Payment: currently MANUAL admin verifier. User pays via approved existing Square/PayPal/Wise path and owner verifies the payment/reference in provider before issuing code. Admin page \`/admin/videos\` has private code issuer; only admin can call \`POST /api/admin/videos/codes\`. It returns code plaintext once, to be privately delivered to the signed-in customer. No automatic payment webhook or automatic sending built yet; do NOT call this automatic payment confirmation.
- HMAC-SHA256 hashed 144-bit random one-use code, payment reference unique, gift account UUID unique, expiration max 30 days.
- Private RLS/forced tables \`app_private.video_generation_codes\` and \`app_private.video_generation_jobs\`. Only existing authorized \`hh_app_backend\`, no anon/authenticated direct table access. Production migration applied and confirmed under \`20261030042841\` and committed to the repository.
- Client \`POST /api/app/videos/generate\` checks strict same origin, verified Supabase signed-in user, exact account ID, rate limiting, prompt/consent, row lock + atomic claim. Retry with same code and identical request returns existing job, not another paid API submission. Network/provider ambiguous states are UNKNOWN, owner-only reconciliation. No blind provider retries or refunds. GET status and GET private streaming content are scoped to the same user.
- Provider readiness GET \`/api/holistic-support/video/availability\` returns enabled:false without keys/flag, no billing action. UI disables code submission unless ready.

## Strict limitations
- **At PR stage neither "Smart ready" nor "Pro ready" is true.** No paid external calls were made. No production key configured from ChatGPT; credentials must be stored in Vercel by the operator through secret manager and separately provisioned with fixed credit cap.
- Provider quote enforcement needs verified live price and exact provider receipt before enabling. $2 commercial price is provisional; budget for moderation failures/secondary attempts.
- Automatic combining AI-generated clip with Basic soundtrack, scene continuity, timeline and MP4 30-second download is NEXT; presently account-bound API clip can be downloaded separately. We MUST test end-to-end in secure sandbox under owner-set spending budget before promising finished commercial video.
- Current paid photo-input mode is NOT supported. Only explicitly entered symbolic text-to-video prompts accepted. No client photos sent to provider.
- "First Smart gift" code generation is manual admin only; no self-claiming public free API to prevent abuse.

## Release requirements
1. Focused node contracts tests/free-video-generator.test.mjs, tests/video-tiers.test.mjs, tests/video-ai-codes-and-api.test.mjs; ESLint/TS, Next production build.
2. Live Chromium/WebKit synthetic browser tests: Basic 4 scene original frames, variation changes pixels, real recorded MP4/WebM decode, original catalog still works, price cards do not make paid calls.
3. Database schema version and RLS, unique code/paid receipt/gift constraint tested on isolated DB; authorization across users.
4. Owner manually verifies real OpenRouter account model access/pricing before setting feature flag; one controlled non-client paid pilot with fixed $ budget, provider actual clip readback, playback quality and copyright.
5. Real authenticated browser redeem / status / content flow; verify one code cannot generate twice.
6. Only after successful latest PR exact head CI, merge into \`codex/public-book-library\`, Vercel READY exact SHA, public alias check. Paid mode stays OFF until separate paid-pilot approval and receipt.

## Further free quality
Procedural renderer now builds FOUR DISTINCT timed scenes with dissolves and seeded shapes rather than one infinitely repeating wallpaper. Retains original audio, customer-controlled text and shot format. Next quality wave: WebGL material/light upgrade; licensed wider real footage catalog; actual licensed moving MP4 multi-shot montage with beat/voice sync; original custom symbolic forms for four-stage guided imagery.
