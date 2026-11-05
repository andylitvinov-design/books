# Tantric Intimacy Coaching · Adult consent-centered self-reflection

**Scope:** Original Holistic House educational model for adults (18+) only, NOT sex therapy, medical treatment, clinical assessment, trauma treatment, explicit sexual instruction, or a manual for persuading a partner.  
**Release target:** existing guest Coaching Lounge `/[locale]/coaching` and authenticated encrypted Personal Coaching; no parallel chatbot, no new data store, no new billable provider.  
**Code:** `tantric_intimacy_v1`, published scheme `tantric_intimacy_reflective_v1`; additive migration `20261024171100_hh_tantric_intimacy_coaching_v1.sql`.

## Editorial benchmarks, not replicas

- [Somatica Institute · Code of Ethics](https://www.somaticainstitute.com/code-of-ethics/): autonomy, truthful role boundaries, embodied communication.
- [Wheel of Consent / Somatic Consent](https://somaticconsent.com/somatic-consent-training/): differentiate wanting, giving, receiving, agreement and boundaries (do **not** reuse their proprietary exercises or reproduce the framework).
- [AASECT certification information](https://www.aasect.org/certification/certification-faqs): sexual-health professional boundaries and why an online educational exercise must not claim to be sex therapy.
- [Association of Certified Sexological Bodyworkers · Ethics](https://sexologicalbodyworkers.org/ethics): informed consent and safeguarding. This digital course does **not** include touch, bodywork, breathwork, nudity or physical practices.

This is a **contemporary HH-authored reflection loosely inspired by mindful presence and professional ethical principles**. It is **not** an evidence-validated tantra procedure or a certified form of the above methods. No recommendation or guaranteed change is inferred from answers.

## Single-idea screen structure, ~20 minutes

| Step | Screen focus | Core question (EN) | Preferred result |
|---|---|---|---|
| 1. `intention` | One topic | What aspect of intimacy matters most to you right now? | Chosen subject |
| 2. `presence` | Body comfort | How do you usually recognize comfort or discomfort in closeness? | Noticing without practice |
| 3. `desire` | Authentic preference | What kind of closeness would feel genuinely welcome to you? | Permission to choose |
| 4. `boundaries` | Own limits | Which boundary would help you feel safer and freer to choose? | Personal autonomy |
| 5. `consent` | Ongoing agreement | What would make conversations about consent easier for you? | Language for asking/listening |
| 6. `dialogue` | Mutual respect | What conversation could strengthen mutual respect and closeness? | Conversation, not persuasion |
| 7. `step` | Small voluntary next step | What gentle next step, if any, would you like to choose? | May choose to do nothing |
| 8. `review` | Meaning-making | What would you most like to take away from this conversation? | Own words, editable recap |

Each question has **six original, non-explicit, localized choices** plus optional personal text; **all eight are skippable**. EN, RU and ES are authored, not machine-generated at runtime. The existing completion screen offers a user-edited summary and voluntary step, not a sexual-performance score. No explicit details about sexual acts, names of partners or personal history are necessary.

## Safety and data-handling contract

1. Age self-attestation (18+) **before** the first question on the public page and authenticated model choice. This is voluntary attestation, not identity/age verification. The authenticated server also checks the `adultConfirmed===true` start payload; no birthday or identity scan is collected.
2. Adult content should be discoverable only on deliberate selection; never auto-play audio/video or use sexually explicit card images. Reuse site-owned soft scenery. At every step: Back, Continue, **Skip**, Exit.
3. Never suggest sexual activity, pressure to obtain intimacy, ways to override another person's refusal, touch instruction, altered breathing, coercion or bodywork. Consent is ongoing, freely given, specific and reversible.
4. Words suggesting abuse, assault, coercion, underage exploitation or immediate safety danger must **block automated coaching recommendation** and instead prompt qualified human/local emergency support. Not a diagnosis or emergency triage system. Persistent sexual pain or dysfunction likewise requires qualified clinical support, without pretending an automatic classifier can diagnose it.
5. Guest selection, answers and copied summary remain **only in React tab memory**, not browser storage, analytics, CRM, marketing or back-end. Signed-in answers use existing encrypted, account-owned private personal coaching sessions and server-side auth; no SMS, Telegram, push or pixels with intimate content.
6. Never share private session answers with a coach, CRM contact, analytics or third party without a separate explicit, scoped consent. A CTA is not a lead, booking or payment.
7. Browser TTS/dictation in existing private runner is opt-in, text must remain editable. No remote speech API is added. Existing privacy notices and owner-scoped delete remain available.

## Routing and acceptance

- Browser matcher only: special topic signals `intimacy, desire, consent, boundaries, tantra`, EN/RU/ES. If present, prefer the tantra model, but keep user choice and existing alternatives. Recognized danger phrases suppress self-coaching recommendations entirely.
- Catalog remains the existing `app_private.coaching_*` schema; **no new tables or grants**. Only the existing `hh_app_backend` role reads these reference rows. Keep RLS and private owner encryption intact.
- Before marking live: inspect production SHA vs `codex/public-book-library`; PR diff, focused tests and Next build/CI; apply additive migration to **Holistic House CA Central** project `shervdixkaxurnaecioe`; verify 19 published schemes, 11 models, 28 topic signals, 64 question records (if baseline unchanged), joined stage/order data and private catalog; Vercel READY + alias to exact production SHA; browser EN/RU/ES, 320–430px, opt-in/skip/copy/resume, blocked-risk routing and signed-in private E2E. Never claim signed-in iPhone E2E without a real user device/account check.
- Cost: `CAD 0` new billable API, no paid AI rendering, no mass messages/ads. User can voluntarily ask a human later via existing services.

## Topic-group extension · 24 Oct 2026
The same adult-first contracts also apply to CLEAR intimacy dialogue and two curated Tantra variants. See [topic-first implementation and release gates](COACHING_LOUNGE_TOPIC_GROUPS_2026-10-24.md). All sexuality-tagged schemes require age acknowledgment; step requirements are optional per scheme (without mutating the original nonsexual CLEAR question bank). The earlier 11-scheme baseline was superseded by the 19-scheme library extension and has not been published until migrations + live checks succeed.
