# Today Speaks → My Test — conversational personal test advisor

**Holistic House · Product concept and implementation-ready specification v1.0 · 2026-10-28**  
**Status: SPEC ONLY — not implemented, not deployed; this document is not approval to enable a paid AI provider or perform a release.**  
**Owner request:** Today Speaks top ribbon, "My Test" advisor with an existing consultant photo on the left, meaningful personal observations on the right, one recommended test + one alternative, individual "Let's take this test" actions, and a question input that recalculates the selection.  
**Canonical feature epic:** [books #338](https://github.com/andylitvinov-design/books/issues/338) · [original concept comment](https://github.com/andylitvinov-design/books/issues/338#issuecomment-6483271971)  
**Related:** [#117](https://github.com/andylitvinov-design/books/issues/117), [#179](https://github.com/andylitvinov-design/books/issues/179), [#397](https://github.com/andylitvinov-design/books/issues/397), [#1519](https://github.com/andylitvinov-design/books/issues/1519), [#1881](https://github.com/andylitvinov-design/books/issues/1881), [#1223](https://github.com/andylitvinov-design/books/issues/1223), [#1637](https://github.com/andylitvinov-design/books/issues/1637), [#2484](https://github.com/andylitvinov-design/books/pull/2484).

## 1. Purpose, scope and product decisions

The advisor answers **"Which existing free test would help me explore what matters to me today, and why?"** Rather than making a user search 100+ test cards, it proposes one relevant questionnaire and one genuine alternative. Results remain in the existing My Tests / Insights / My Development Path. The product is self-discovery, not diagnosis, treatment selection, psychotherapy or an automatic sales funnel.

**Build this as one entry mode of existing My Tests**, not a new profile, questionnaire/scorer, CRM contact or database of medical information.

1. The **Today Speaks** compact ribbon is a shared navigation surface: **My Test · Get Ideas · Motivation Video · Study Program**. The English label is deliberately singular **My Test** for today's action; the destination remains the existing **My Tests** collection. Do not implement four competing ribbons or a parallel gamification engine; integrate with the existing client progress widgets and the pending #2484 journey only after inspecting their current merged status.
2. Clicking **My Test** opens an **Advisor** view within the existing My Tests route/state. Provide an obvious **All tests** route to the unchanged catalogue. Deep links must contain only public route/focus identifiers; never scores, answers, personal goals, private text or account IDs.
3. In the hero, use the existing approved **female advisor photo** on the **left**, with short conversation bubbles on the **right**. Do not synthesize/reuse a new AI avatar or start any paid video. On narrow iPhones preserve a recognizable portrait and readable message, avoiding a tall image taking the whole first screen.
4. Explain the recommendation in ordinary language: what the person already **explicitly chose**, what **specific source-backed measure** may be relevant, and **what the next test can help clarify**. Show the source/date and interpretation direction in an expandable "Why this test?" disclosure. Never pretend an inferred interest was personally confirmed.
5. Display **exactly 1 primary** and **up to 1 alternative** recommendation when there are two genuine, distinct eligible tests. Each has its own clear CTA: **"Let's take this test"**. If only one is available, show one; if none, offer topic selection and the existing full finder. Never invent a test for UI symmetry.
6. Beneath both cards show **"Ask a question"** and optional compact topic chips. A reply must update the active topic and **recompute** the primary/alternative list, with an observable rationale change; not merely append a generic answer. Users can override/correct the advisor without overwriting their saved scores or goals.
7. The first milestone is a **free meaningful test**, not booking, checkout or medical advice. Paid services, courses and videos are optional **downstream** after a saved report and explicit choice, using existing verified offers only.

## 2. Visual specification — one screen, not a second chat app

Top-of-page wireframe, desktop to small phone:

~~~text
TODAY SPEAKS  [ My Test ] [ Get Ideas ] [ Motivation Video ] [ Study Program ]
                 ✓ only on server-verified completion of today's assigned test

MY TESTS                                           [ All tests ]
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ EXISTING     │ Hi! You chose energy and recovery as your current focus.  │
│ ADVISOR      │ Your self-rating was 4/10; your own goal is 8/10.         │
│ PHOTO        │ Let's explore sleep and recovery.                          │
│ (reuse)      │ [Why this test?]                                           │
└──────────────┴─────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────┐
│ TODAY'S PICK: existing test title · duration from current catalogue      │
│ Helps you explore: [named constructs, not a promised diagnosis]          │
│ [ Let's take this test ]                                                  │
│                                                                            │
│ ALSO POSSIBLE: another eligible test · brief distinct reason              │
│ [ Let's take this test ]                                                  │
└────────────────────────────────────────────────────────────────────────────┘
[ More about relationships ] [ Less time today ] [ Show another option ]
[ Ask a question about these tests…                               ] [ Send ]
[ conversation stays on page; a real test opens in the existing runner ]
~~~

- A signed-in user sees a *source-backed* explanation only when matching data exists and are authorized for that user; no data becomes public server-rendered HTML.
- A guest sees a **lightweight Google sign-in suggestion** at the top ("Sign in to use your private results"), **not a login wall**. Below, ask "What matters to you today?" and allow a free public test without claiming personal history.
- Keep test-cards visually compact like the site's current warm ivory/sand/wood design; one dominant button per card, 44px touch targets, text at readable phone sizes. Reuse actual catalogue time/type labels, only if available.
- Conversation expands upward with recent bubbles and auto-scroll **only inside the active chat region** when new messages arrive; keep keyboard focus predictable and let people read older messages. Avoid autoplay/audio and disorienting auto-scroll of the whole page.
- If the production runner can be safely embedded using its existing auth/save hooks, reveal it below the recommendation within the same experience. **Otherwise** navigate to its existing route and carry only an allowlisted public test key + non-sensitive return context. Do not fork scoring, create a fake inline runner or make "Start" count as completion.
- "What can I learn?" / "Why this?" must describe the instrument's legitimate purpose, not imply that the test will fix a problem. For previously completed tests, replace "Start" with **"View my results"** unless an eligible repeat is due and explicitly chosen.

## 3. User input and data provenance

Use only approved and correctly scoped signals; do not flatten them into a single composite "health index":

| Signal | Source / meaning | Use in recommendations | Must not do |
|---|---|---|---|
| **Explicit current topic** | Latest topic confirmed by the person in this session (e.g. energy, relationships, work/money, meaning/goals) | Highest-priority relevance signal | Infer consent from an old click or passively store a sensitive interest |
| **User-set goal** | Account-owned saved 0–10 aspiration for the **same named self-rated question** | Identify an optional interest gap; explain source/time | Treat a chosen target as measured test result |
| **Current self-rating** | Same question/time window as a stated goal; four current domains **Energy, Money/Work, Relationships, Meaning** (Goals integrated with Meaning) | Informs relevance if current and target are comparable | Compare money rating with income, or map 4/10 onto a clinical percentile |
| **Completed assessment scales** | Owned results with definition key/version, dimension key, scoring direction, date, purpose, validity/rights status | Suggest *legitimate new measurement coverage* or a due retest | Diagnose, invert every low score, compare unlike instruments, leak item answers |
| **Existing test history** | Account-owned completion dates, compatible versions and retest cooldowns | Prefer not-yet-completed valid tests; direct to report when recent | Trigger arbitrary forced retest or mark a click complete |
| **Preference in dialogue** | A voluntarily chosen free text/chip for this interaction, available time, preferred language | Rerank and show concise explanation | Send raw questions, private scores or identity to analytics/third party by default |

**Four life directions, not five:** Body/health/energy; relationships; work/business/money; personality/meaning/personal growth. The compact support check-in's four current ratings are Energy / Money / Relationships / Meaning, and **Goals belongs to Meaning**, per #1881 and the shipped #2475 correction. The Profile Builder also has an explicit *goal* facet; it is **not** a fifth life score and must not resurrect a separate "Goals" slider in Today Speaks.

**Comparable 0–10 gap:** only for the same self-rating definition and direction, when the user has saved both current and desired values. Display **desired minus current** (max(0, desired-current)) as a simple **personal goal gap**, e.g. 8 − 4 = 4 *self-rating points*. No norm, clinical cutoff, disease estimate, or claim of improvement follows from this value. Missing/ambiguous/unapproved values → omit the number and say "not measured / you haven't selected a target".

**Clinical/psychometric direction matters:** symptom/difficulty scales may be high when support is relevant; low resource/functioning scores may be relevant; personality traits are descriptive, not deficiencies. Different instruments, languages, scales, cutoffs, original HH check-ins, validated screeners, traditional/symbolic systems and life satisfaction must retain separate semantics. Only reviewed, instrument-appropriate interpretation can enter a personalized rationale. Sensitive sexual/intimacy themes require the user's explicit selected focus; do not surface them based on unrequested inferred traits.

## 4. Selection: reuse existing ranking, add a transparent intent layer

**Pipeline (P0 deterministic; no external model):**

1. **Auth scope:** resolve signed-in identity server-side; fetch only that person's stored results, goal and history under RLS, through existing account APIs. If guest, use only volunteered public focus and session-local non-sensitive choices; no private history query.
2. **Safety/consent filter:** discard disabled, unavailable, wrong-language, restricted-license, research-only, invalidly scored, non-startable or inappropriate-age/administration instruments. Do not accidentally show a test as available because it exists in a research catalogue.
3. **Match source scales:** use current **test-explorer**, scale-guide and public ranking helpers to match source-defined topics and scale coverage. Explain exactly what the test measures (and what it does not measure). Use existing `rankPublicTestMatches` / `estimatedTestMatchPercent` where applicable; if showing match %, label it **interest-match heuristic, not accuracy/health percentage**.
4. **Priority order:** (a) explicitly confirmed topic/question, (b) appropriate goal gap from comparable self-ratings, (c) independently supported assessment-scale relevance, (d) novelty/due status and recency, (e) desired length and format. A user's manual topic correction must win even if another stored measure looks more extreme.
5. **Deterministic tie-break:** stable catalogue key, not random rotations that change across reloads. Encourage variety across substantive constructs for the alternative; never offer two indistinguishable tests when one meaningful option exists.
6. **Evidence gate:** if profile or scale evidence is incomplete/low-confidence, show **"Because you chose [topic]"** rather than fabricating "your weakest score". If a questionnaire's provenance/validity is unsuitable, it may appear in the ordinary catalogue with its original label but must not generate a confident personalized clinical inference.
7. **Eligibility gate:** recent completed test with cooldown active → "View result", not an urgency-driven retest. If no new eligible test is available → "Review my results", "Choose another topic" or "Browse all tests".
8. **Post-completion rerank:** use server-confirmed saved result after runner returns; refresh safe context, offer **next relevant test / view report / optional free practice**. Do not automatically add the next questionnaire to a plan or enrol in paid courses.

Do not create a competing fixed 100-point health/recommendation score. If a tunable rank is needed, use **category-level bounded priority tiers** with explicit intent always above inferred topics. Version the explanation and mapping rules. Store/show "reason codes" instead of a fabricated precision.

**Proposed reason codes and user-visible language:**

| Reason code | Meaning (not a medical judgment) | UI copy example |
|---|---|---|
| `chosen_focus` | User explicitly picked this direction | "You selected relationships as today's focus." |
| `goal_gap_same_scale` | Current and personal target exist on same 0–10 self-rating | "Your energy self-rating is 4/10 and your chosen target is 8/10." |
| `scale_coverage` | A reviewed compatible source scale indicates an additional research topic | "This test may help you explore recovery patterns." |
| `unexplored_topic` | Relevant eligible test not yet completed | "You haven't explored this topic with this questionnaire yet." |
| `view_recent_result` | Result already saved and repeat not due | "You completed this test recently. Open your report." |
| `selected_time` | Matches available duration preference | "A short option for today." |
| `no_evidence` | User has not shared comparable measures | "Start with what interests you; your results will build up over time." |

## 5. Conversation model and state transitions

The consultant is **an automated guide, not a human therapist**. For P0, use existing on-site pattern-based conversation/intent handling, localized templates and verified IDs. Never answer an unrecognized free-text question with a fake precise interpretation.

| State | Entered by | Next action and observable result |
|---|---|---|
| `loading_context` | Open My Test | Privacy-safe spinner; account auth check; avoid displaying stale previous-user content |
| `guest_choose_focus` | Not authenticated or no approved data | Show Google sign-in suggestion + four nonexclusive topic choices; free catalogue remains usable |
| `signed_in_recommendations` | Valid private profile or user-chosen topic | 1 primary + ≤1 alternative; personalized or neutral reason with source |
| `question_received` | Free text/chip submitted | Echo user's question, classify topic/duration/correction or ask **one** clarifying question |
| `recommendations_updated` | User corrected focus or preference | Visible change to both choices / reasons; preserve prior messages and unsaved data |
| `test_opened` | Click named test CTA | Existing authorized runner, not a completion event; offer Back/Resume if supported |
| `awaiting_verified_result` | Runner open/return | Display neutral pending/continue state; never assign ✓ on route navigation |
| `result_confirmed` | Existing result persisted & read back server-side | Render report link, dated receipt, ribbon ✓ if today-specific criteria met |
| `no_match_or_error` | Empty catalog, API failure, malformed text | Honest fallback: try again / browse all / choose topic; never guessed scores |

Sample conversations below are **examples only; figures are never hardcoded UI defaults**:

**A. Authenticated, real comparable values exist**

> Advisor: "You chose energy and recovery. In your recent self-rating you put energy at 4/10, and your personal goal is 8/10. Would you like to explore which habits may affect rest and energy?"
>
> Primary: "Sleep and recovery" — "Understand how you experience rest" — **Let's take this test**.
>
> Alternative: "Personal resources" — "Explore what supports your daily energy" — **Let's take this test**.
>
> User: "I'd rather explore relationships."
>
> Advisor: "Of course. I'll switch to relationships. You can change your focus at any time." New pair now matches actual eligible relationship-scale definitions.

**B. Guest without a profile**

> Advisor: "Hi! What would you like to understand today: energy, relationships, work and money, or meaning and goals? You can take a free test now. Sign in with Google if you'd like to use your private previous results."

**C. Completed and not due**

> Advisor: "You already completed that questionnaire on [saved date]. You can review your result now. Shall I offer a different relevant test?" **View my result** and a different eligible alternative.

**D. Unsupported question or serious distress**

> Unknown: "I may have misunderstood. Are you asking about [supported topic A] or [topic B]?" Offer free finder; do not create a fictitious recommendation.
>
> Crisis/uncontrolled distress: avoid a sales pitch, no deep unmonitored imagery or speculative clinical classification; present appropriate urgent support options in the user's location and encourage qualified help.

## 6. "Today Speaks" truth model and synchronization

- Ribbon status is **per real task** (My Test, Get Ideas, Motivation Video, Study Program), not one global "health score". For **My Test**, show ✓ only for a **server-verified, account-owned completed and saved** relevant test attributed to today's journey, with a real completion timestamp and stable questionnaire ID/version. A guest's local progress badge from #2484, if used, must say **guest/self-reported** and must not impersonate an account-owned verified result.
- Do not mark ✓ for opening a test, ticking a guest checkbox, playing a video, asking a question, reaching a report page, or selecting "done" on the client.
- Define user-local day boundary based on an **explicitly known timezone or account preference**; if unknown, choose documented UTC fallback rather than silently guessing geography. Ensure a saved result completed earlier is still recognized as *history* but not mislabelled "today's".
- Refresh ribbon when a verified result returns, when the user reloads, after sign-in/account switch, or when navigating back from the runner. Preserve progress in separate modules only when their own server-verified events exist. Do not infer video completion from play clicks.
- Avoid exposing personal result data in global public layouts, browser analytics, pixel requests or outgoing notifications. Ribbon only needs a minimal verified completion flag, task ID and appropriate expiry.

## 7. Technical integration contract: adapt, don't clone

Known production-source modules as of 2026-10-28 (verify current changes before implementation):

- **Test discovery:** `lib/assessments/test-explorer.js`, `lib/assessments/scale-guides.js`, `lib/assessments/test-problems.js`, existing Test Explorer and actual question runner.
- **Profile selection:** `components/personality-profiles-builder.tsx`, `lib/profile/profile-scale-selection.js`, profile battery and scale-to-topic mappings. Four life directions, with optional goal facet; respect #1881.
- **Course/test reuse:** `components/app/my-course.jsx`, `lib/inner-growth/course-entry-intent.js`, existing selected test plans / My Tests, `app.assessment_results`, `app_private.assessment_plans` as governed by existing server auth and RLS.
- **Conversation:** existing HomeConversationGuide / `ideas-guidance.mjs` / `home-conversation.mjs` rule-based patterns from #1519. Reuse intent classification and safe handling; do **not** couple My Tests to an external LLM.
- **Progress:** existing My Development Path / #1637 plus any implemented, **verified** daily ribbon/7-step journey from #2484. Avoid competing counters or status flags.

Proposed **internal adapter contract** (design, **not a new schema mandate**):

~~~ts
type AdvisorInput = {
  locale: 'en' | 'ru' | 'es';
  authenticated: boolean; // verified by server, never trusted from a query param
  selectedFocusIds: string[]; // allowlisted interest labels
  optionalDurationMinutes?: number;
  // Account-owned, server-resolved goals, comparable check-ins and eligible
  // versioned dimension summaries. No raw question answers in this adapter.
  approvedContext: 'none' | 'limited' | 'source_backed';
};
type AdvisorSuggestion = {
  testKey: string;             // existing allowlisted catalogue key
  definitionVersion: string;   // source-version identity, not a new test
  status: 'startable' | 'view_result' | 'repeat_eligible';
  reasonCodes: string[];       // versioned, explainable reasons
  sourceRefs: Array<{ kind: string; key: string; measuredAt?: string }>;
  action: 'start_existing_runner' | 'open_existing_report';
};
type AdvisorOutput = {
  primary: AdvisorSuggestion | null;
  alternative: AdvisorSuggestion | null;
  confidence: 'chosen_topic_only' | 'limited' | 'source_backed';
  messageKey: string; // localized copy template, never guessed diagnosis
};
~~~

Server side **must re-authorize** any submitted test ID, access to previous results and post-run completion. UI source references should be converted into readable labels only after auth and adequate consent. No raw free-text persistence by default. Any persistent goal/intent save needs its own explicit user action and existing owner-scoped API. Prefer **no DB migrations** for first iteration; add one only after inspection proves a required, consented server-owned state cannot be derived from existing tables.

## 8. Delivery slices and external dependencies

**P0 — front-end advisor with existing test catalogue (non-paid)**  
- Check actual current Today Speaks/guest ribbon implementation (especially merged state of #2484); build one My Test mode without a duplicated header.
- Approved photo + short EN/RU/ES templates + topic chips + question field; one primary and optional alternative; accurate existing-runner links.
- Cold start works without login; on sign-in render only server-owned data; user correction updates results. No fabricated numeric data.

**P1 — source-backed personalized ranking and report feedback**  
- Reuse instrument-specific scales, direction, score provenance and recency, saved same-question goal comparisons and real completion history.
- Show source/date in explanation; report-first on recently completed test, valid next-test after real save. No re-testing pressure.

**P2 — shared journey statuses and deeper discussion**  
- Tie Today Speaks green check to server-confirmed relevant save, implement account switch handling and timezone behavior; link to "Discuss this test" in existing consultant context after report.
- Route optionally into verified free meditation/course or human consultation after explicit user choice. AI provider optional only after separate privacy, budget and review approval.

**Release gate for each slice:** PR against **actual** production branch, scope review, passing relevant unit/contract tests + tsc/lint/build, synthetic Chromium/WebKit **320/390/430px EN/RU/ES**, account-owner/guest/RLS/IDOR checks, actual Google OAuth → runner → save → report → ribbon ✓ E2E, then Vercel READY and **exact SHA/hostname readback**. No "LIVE VERIFIED" without production E2E for the claim being made.

## 9. Acceptance matrix and edge cases

| Case | Expected evidence / behavior |
|---|---|
| Anonymous visitor / no profile | No invented scores/previous tests; focus chosen manually; optional Google sign-in; free tests work |
| Signed-in with current 4/10, goal 8/10 on same self-rating | Explains **4 self-rating points of personal gap**, source and date; no diagnosis |
| Goal exists but no comparable current measure | Shows selected goal, omits numeric gap and misleading percentage |
| Low symptom score / high resource score / descriptive trait | Correct direction and no "low = broken" inversion; traits not assigned remediation |
| User says "relationships, not energy" | Primary and alternative actually change to eligible relationship tests, with corrected copy |
| User says "only 1 minute" | Filter by real duration only; if none, disclose no exact match rather than invent duration |
| Only one eligible test | Exactly one card; no synthetic second test |
| Already completed test with cooldown | Read-only report CTA, not forced repeat; history intact |
| Click Start / close test mid-run | Ribbon remains uncompleted |
| Completed real test but save fails | No checkmark; clear retry/save status |
| Server-verified saved result; return after sign-in | Account ribbon ✓ only for qualifying task/day; history links continue to work |
| Account A → account B in same tab | All A-specific bubbles, suggestions and scores cleared on identity change |
| Denied auth/expired session/private API 401 | Fail closed, guest mode/login invitation; no old confidential data flash |
| Question unknown, inappropriate or potentially urgent | Safe bounded clarification/support; no false interpretation or upsell |
| Different locale / smaller phone / keyboard-only | EN/RU/ES, 320/390/430px, no horizontal overflow, accessible tap/focus, screen-reader labels |
| No consent for analytics/third-party AI | No sensitive text/scores/results leave authenticated first-party services |
| Static render/SEO/link copy | No account-specific private content in unauthenticated HTML, preview, metadata or URLs |

**Privacy checks** must inspect request payloads and redirects for text, results, symptom labels, user identifiers, media IDs, analytic events, CRM/WhatsApp/Telegram/push. Opt-in/STOP and existing privacy holds remain unchanged. No new paid API, mass messaging, ads, payment, render, diagnosis or automatic treatment claim under this PR.

## 10. Decision record / scope of this pull request

- **Approved for concept refinement:** The owner asked for this architecture and an open PR on 2026-10-28.
- **This PR only saves this specification.** There is **no user-facing implementation**, no DB or auth changes, no newly verified source scores, no paid model, no render, no merge into production and no proof of live completion.
- **Do not change canonical sources silently:** existing #338 roadmap / #1881 unified profile / #397 course results remain authoritative; link this document from those contexts rather than copying their implementations.
- **Next engineering PR** should implement P0 in existing components; subsequent P1/P2 need real account E2E evidence before production status can be claimed.
