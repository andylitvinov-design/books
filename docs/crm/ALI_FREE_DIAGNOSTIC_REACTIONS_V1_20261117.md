# Ali · Free Diagnostic Reaction Library · 17 Nov 2026

## Why
A new client in a Telegram/WhatsApp-style conversation may interrupt the
standard question sequence to ask about cost, privacy, photographs, methodology,
human contact, results, timing, or to express shame, fear, skepticism, anger,
exhaustion or an objection. None of these interrupts is automatically a
completed diagnostic stage.

This layer extends the merged **#4914 Free Diagnostic Mind**, rather than
replacing Secretary, Secretary Psychologist, Sales or Coach. Current first-party
integration is the **consented Telegram V3 free review** only. Human personal
Telegram Business and WhatsApp provider readiness remain independently gated.

## Implementation
- `lib/assist/ali-free-diagnostic-reactions.mjs`: **43 categorized intents**
  (24 FAQ + 19 comments/boundaries), **2 vetted variants × 3 languages each:
  258 authored response texts**. Fully deterministic. No LLM, photo analysis,
  account access, database operations, billing, or provider calls.
- `lib/assist/ali-free-diagnostic.mjs`: after STOP, safety, explicit skip,
  pause and correction checks, but before deciding whether an interview phase
  is answered, select a reply and optionally append **one** still-relevant
  stage question. The interview stage and factual slots are retained.
- Variants rotate against the last 8 assistant turns. If both were recently
  used, prefer the least recently used; no superficial randomization.
- A user-described goal stays a goal even if it includes an emotion; a stated
  privacy boundary takes priority even if it contains the words "want to".
  Entire mixed/labelled multi-line answers are not hijacked by FAQ patterns.
- Crisis signals, explicit STOP, withdrawal, and refusal remain stronger than
  any reaction or sales response. No diagnosis, promises, invented prices,
  "reading auras" from photos, human impersonation or unsolicited upsell.

## Reaction categories

| FAQ / question | Response logic |
|---|---|
| Who are you / bot or therapist? | Plainly identify Ali as digital assistant |
| Photo scan / check energy | No image-based health/energy claims; spoken description suffices |
| Is it free / price? | Preliminary situation review is free; paid session separate |
| Privacy / who sees my words? | Protected conversation; practitioner gets approved summary only |
| Time / number of questions | Short, flexible; skip and early finish |
| What details do you need? | Goal, difficulty, current situation; rest optional |
| How does this work? | Clarify, show draft, require separate client confirmation |
| Why are you asking? | Explain purpose; question optional |
| May I speak to a human? | Reviewable request; no invented human reply |
| When will I hear back? | No invented response-time guarantee |
| Is it accurate / guaranteed? | No outcome/diagnosis promises |
| Can you diagnose or prescribe? | Non-clinical scope, refer to qualified practitioner |
| Drawing / form | Drawing optional via approved secure route; no long Google Form needed |
| Booking / format / language | No booking created; respond within verified support boundaries |
| What's next / will I get a report? | Reviewable short summary; no promised separate report |
| Can I stop / skip / not answer? | Consent and refusal respected |
| Reviews / evidence | No fabricated testimonials |
| Give me advice or solve it? | Clarify before offering suggestions |

| Comment / emotion | Response logic |
|---|---|
| Thanks, OK, No | Acknowledge briefly; never auto-fill goal |
| Ashamed, afraid of judgment | Reflect words without diagnosing, permit low disclosure |
| Sad, afraid, angry, overwhelmed, hopeful | One brief reflection, no hidden-cause inference |
| Distrust, skepticism, hopelessness | No promises, acknowledge concern |
| "This sounds robotic" | Acknowledge, shorten, do not force stage |
| "You misunderstood" | Ask one focused correction, don't append old question |
| "I don't understand the question" | Simplify and use a different stage variant |
| "I don't want to share" | No further question; skip/finish option |
| "I need time" | No pressure or repeated prompts |
| "Don't sell me anything" | No paid offer or follow-up question |
| "This isn't helping" | Permission to stop or review what is known |

## Example English interaction
Client: "I got this link from meet up app"
Ali: "Thanks for finding us. What would you most like to understand or change?"

Client: "I'm scared."
Ali: "Thank you for telling me. We can take it slowly. What would you most like to understand or change?"

Client: "I don't want to share."
Ali: "You don't need to share more than you're comfortable with. You can skip or finish here."

Client: "Is this free?"
Ali: "This preliminary review is free. A paid session would be a separate choice."

Client: "You don't understand."
Ali: "I may have misunderstood. What should I correct?"

## Validation and release
- Dedicated real-wording assertions in `tests/ali-free-diagnostic.test.mjs`:
  49 multilingual examples, fixed stage, no fictitious goal, one question
  at most, contextual refusal, alternate template selection and explicit
  correctable feedback.
- Also require existing Telegram V3 consent, signed webhooks, STOP, client
  review confirmation, CRM and owner notice regression suite.
- Protected exact-HEAD GitHub Core, CRM and hh-merge-check before auto-merge.
- Production publishing through existing hourly Vercel workflow only; don't
  create extra paid Preview/Production runs, new bot, paid provider or cron.
- Real two-account Telegram end-to-end QA is a **separate acceptance gate**.
  A green PR is not in itself proof that `@holistichouse` human Business
  permissions or outbound sending are enabled.
