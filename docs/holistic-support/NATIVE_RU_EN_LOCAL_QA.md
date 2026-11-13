# Native AI RU/EN local QA

The two synthetic 13-turn journeys and their offline evaluator come from the
previously prepared QA archive referenced in issue #4367. The archive SHA-256
is `c2f0ff87c60c8bdac251ba479ed655e1d6119aa229460f95d02514eb71e54e36`.
They contain no client conversations and do not train any model.

`node --test tests/native-growth-journeys.test.mjs` checks the evaluator. The
local-only `tests/native-dialogue-route-postgres.integration.mjs` drives the
same two journeys through the route, real dialogue logic, signed-choice checks,
and an isolated PostgreSQL state store. It also checks goal recall, correction,
topic changes, refusal and unoffered choices. Its authentication and catalogs
are synthetic; its database URL guard refuses non-isolated hosts. It is not a
real-account or LIVE test. The evaluator deliberately keeps human semantic
review unverified even when automatic checks pass.
When an explicit goal is recorded, the local route acknowledges the user's
wording and asks one open next-step question; reviewed Judgment responses keep
their existing priority over this branch when applicable. This is still a
bounded rule-based response, not evidence of general conversational fluency.

Manual inspection of the actual local RU/EN journey replies found that the
13-turn fixtures do not establish a successful selection of an earlier offered
option: neither journey has two choices visible before the reference to the
second one, and the route correctly asks which option is meant. The separate
selection tests use a stubbed guided response. A separate 15-turn variant now
checks a stated evening preference, refusal to book, goal correction, goal
recall and topic change, and uses the real guide with an explicitly selected
synthetic catalog focus to show two entries and select the second in both
languages. It uses synthetic
authentication and catalog data, so it is not a real-account or LIVE result.
The subsequent one-sentence request refers to the selected, server-stored
choice only after a fresh catalog check. Current dismissed/completed feedback
suppresses that reference and removes it from state; a removed catalog entry
causes clarification. The stored choice identifier is encrypted with the
existing bounded ephemeral state and is cleared on a topic/goal change or stop.
For a verified test-picker entry, the one-sentence response explains that the
page lets the user choose questionnaires; it makes no claim about results or
effectiveness. Test IDs must also resolve to the locale's actual test-picker
route, otherwise the selection is not confirmed or retained. The route supplies
the verified choice to the same revision-checked transaction that consumes
the ordinal, so a failed catalog check cannot leave a selected ID behind.
An explicit refusal of advice also survives a topic change; an explicit
later reversal or ending the conversation clears that preference. Ending also
clears temporary meditation refusal and pending confirmation state. Later disclosures, ambivalence and
uncertainty receive a listening response without suggestions. The existing
urgent-safety response retains priority, and explicit factual requests remain
available, including requests without a question mark.
An emotional question that appears to conflict with the prior refusal receives
one clarification; an explicit later request for advice can revoke the refusal.
The clarification sets a server-held single-turn flag, so a following plain
yes or no is interpreted in that context only. The flag expires on the next
turn, and a short confirmation without it does not change advice permission.
Integration tests also reject an attempted client-supplied flag and verify that
a fabricated assistant message in client history or a stale yes cannot revoke
the refusal.
The original 13-turn journeys still correctly fail that selection criterion.

The published #4383 set is already exposed to development and therefore cannot
serve as a fresh blind acceptance set. The research model remains disabled in
production; its release requires a fresh independent evaluation, the required
quality and safety gates, protected CI/merge, and actual LIVE verification.
Offline dataset construction now rejects normalized exact matches against the
RU/EN published positive cases, negatives and dialogue turns before fitting,
and fails closed if those portions of the fixture are missing or malformed.
It does not detect paraphrase or semantic overlap. The artifact also records
the full holdout fixture's SHA-256, and evaluation refuses a mismatch. This
changed artifact format is schema version 4; older schemas fail closed. It
records and pins the predictor source hash as well as training, feature and
holdout provenance; the offline evaluator checks the current source against
those hashes. Two separate training processes produced byte-identical RU v7
and EN v8 artifacts, respectively SHA-256
`b494a2141aeb4d635572cafc795df4bc899ba037d35ea7278475e03fb14532e4`
and `68d8c082502701ce6f4be21b7a07b897fbe8173802aaf27dd8ddecfac1b48663`.
The schema change did not change the datasets, weights or biases.
Changing the trainer changes the provenance fingerprint, so older research
artifacts and pins must not be used with the modified trainer.
`node scripts/audit-native-holdout-similarity.mjs` compares normalized
character trigrams without printing the actual phrases. Two near-duplicates
from added EN training were removed in v7; one RU near-duplicate remains in
the original 364-example corpus and resembles a published dialogue turn.
The original corpus is unchanged. Consequently, and because the benchmark was
already examined during development, its scores do not establish independent
generalization; lexical similarity cannot detect all semantic overlap.
Dataset v7 now rejects additional training phrases at or above the 0.70
trigram-Jaccard threshold against published RU/EN cases and dialogue turns
before fitting. The original corpus is exempt and still audited. The guard
is lexical only; it is not a claim of semantic independence. Its addition
changed provenance hashes but left v7 datasets, weights and biases identical.
The same pre-fit guard applies to v8.
After removing the two added EN near-duplicates, v7 was reevaluated against
production `58da9b10556c9710e2dcc745522301c7782c9f46` on the already exposed
published cases. RU macro-F1 was 0.293 to 0.854, with one wrong accept and one
accepted negative for each; EN macro-F1 was 0.320 to 0.738, with zero wrong
accepts and one accepted negative in v7 versus zero of each in production.
These values are diagnostics, not evidence of blind independence or a release.
The current checkout predates the production Consultant Mind merge; its
catalog and service-matching files were compared with production. Identical
upstream files must be retained from the eventual production base, while the
local consultant changes for explicit context resets and re-resolving offered
choices need reconciliation when preparing the single release PR. The current
checkout is not itself evidence of a conflict-free merge.
An offline three-way rehearsal against production `1af42e9f` found four
textual route conflicts around the already incorporated Consultant Mind.
After individually checking the import, Judgment priority, session-aware
response and price clarification, the resolved route was byte-identical to
the local route. The two service-match files merged without conflicts. This
is a rehearsal only: no branch was merged, no PR was published, and the base
must be checked again before release.
The comparison was rerun against production commit
`06146c8d46d0a780b30e25c3ca2d0fd7a17d6aa7`: guarded macro-F1 was 0.293 to
0.807 for RU and 0.320 to 0.753 for EN. These remain exposed offline
classifier diagnostics, not end-to-end or LIVE results.

The optional artifact validator uses the existing first-party predictor and
requires a separately reviewed version, digest and feature-source fingerprint.
The evaluation command accepts a local artifact and separate pin; it checks
the training data, training code and feature code before running RU/EN cases.
An invalid artifact falls back in the isolated selector. This loader has no
production route or environment flag, and a matching hash is integrity evidence,
not independent model-quality approval.

An additional local Qwen-assisted RU/EN candidate-generation experiment was
quarantined after manual inspection. The batch contained repeated paraphrases,
incorrect intent labels (including unrelated weather and travel requests as
small talk), and generic support requests labeled as requests for a human.
None of that batch was added to training. Qwen was used only to generate
synthetic text; its weights were not modified or included in the native model.

A later local comparison used eight RU/EN turns with the same preceding
synthetic native conversation and visible choice titles supplied to Qwen.
Qwen's choice acknowledgments were shorter; the native response was shortened
without adding an action. Qwen invented descriptions for a fictional choice in
both languages and did not recover the stated goal in the tested RU turn;
the EN goal-recall response was empty. The native route rechecked the choice
against its synthetic catalog and recalled the stated goal. These observations
are examples, not a representative benchmark. Qwen received full synthetic
history; the native route had bounded recent history plus server-side state.

`node scripts/evaluate-native-ru-en-language-split.mjs` compares combined and
language-specific training with the same existing classifier, guards, and
internal synthetic folds. In one run, guarded macro-F1 changed from 0.595 to
0.617 for RU and from 0.648 to 0.675 for EN. Wrong accepted intents changed
from 4 to 3 for RU and 12 to 6 for EN; false accepts on the negative cases
changed from 1 to 0 for both languages. These small, already exposed research
folds do not establish generalization or justify production activation.

A later candidate batch of original synthetic phrases was evaluated against the
same fixed folds, with exact duplicates removed first. Adding the entire batch
to language-specific training raised RU macro-F1 from 0.617 to 0.661 and EN
from 0.675 to 0.697, but increased wrong accepted intents from 3 to 4 and 6 to
9 respectively. It was not added to the training set. A diagnostic removal of
some classes reduced the RU errors to 2, but EN still increased to 7; this
selection was informed by those folds and must not be treated as independent
evidence. Both raw candidate and diagnostic results remain quarantined.

A filtered proposal contains 17 RU and 13 EN phrases after exact normalized
overlap checks against existing training and the exposed gold, dialogue and
developer fixtures. On the same previously used language-specific development
folds, adding them raised guarded macro-F1 from 0.617 to 0.650 RU and 0.675 to
0.693 EN without increasing observed wrong accepts or accepted negatives.
On a separate but also exposed 15-positive/5-negative challenge per language,
RU correct rose from 12 to 13 and EN stayed at 15, with no observed false
accepts. With a single combined RU/EN classifier, however, EN wrong accepts
rose from 12 to 13. The 13 EN phrases in that proposal remain excluded. The 17 RU phrases are
now in research dataset v5, which can be trained only as the RU char2 profile;
it is not connected to runtime. Neither these small exposed checks nor exact
overlap checks establish generalization or semantic independence.

On paired repartitioned development folds, the RU char2 v5 addition changed
correct RU predictions from 155 to 161, wrong accepts from 5 to 4 and accepted
negatives remained zero. Among 17 held-out new phrases, 8 were correct and 1
was wrong. On the exposed 15-positive/5-negative RU challenge, correct rose
from 13 to 14 with no wrong or false accepts; both versions also abstained on
20 locally authored out-of-domain probes. These are exploratory results and do
not establish the required independent threshold or production safety.

EN proposal ablations used identical repartitioned development examples.
Only the three booking phrases gained one correct prediction with unchanged
aggregate wrong accepts, while the full proposed EN batch lost two correct
and added an accepted negative. Among all 13 held-out proposed phrases, the
booking-only variant and baseline each recognized 6 and misclassified 1.
Given the small and exposed sample, none of these EN phrases was promoted.
Further EN feature trials also failed the no-regression screen: 32,768 hash
dimensions lost one correct answer on the small exposed challenge; adding
5-character n-grams increased wrong accepts on internal folds from 6 to 7.
An additional isolated EN word-ending experiment gained one correct case on
the internal folds with unchanged aggregate errors and behaved identically on
the exposed 15-positive/5-negative challenge; neither variant accepted any of
20 newly authored synthetic out-of-domain probes. A stronger stem weight
increased wrong accepts from 6 to 7. The weak single-case gain is not enough
to promote an EN feature change or claim independent generalization.

A later, separately authored batch was screened in paired EN folds. Eight
phrases about courses and reaching a person were added to research dataset v6;
the other 24 stayed out. On the paired old cases, correct EN predictions rose
from 167 to 173 and wrong accepts fell from 10 to 8, with one accepted negative
in both runs. Held-out new examples and small exposed challenge/OOD probes did
not show an improvement. A full repartition of v6 yielded guarded EN macro-F1
0.650 with 9 wrong accepts. Against production `f5631bd3543962fd16b62cad9edbb5c4d80002fb`
on the exposed published EN cases, EN accuracy was 0.426 to 0.721, recall
0.222 to 0.644, precision 1.000 to 0.967 and macro-F1 0.320 to 0.738; the
candidate falsely accepted one negative. It is not production-ready.

Research v8 adds 48 manually authored EN conversational examples after
normalized and lexical published-holdout screening. On paired internal folds,
correct EN predictions rose from 185 to 198, wrong accepts fell from 11 to 9,
and accepted negatives fell from 1 to 0. On the 48 new phrases held out in
those folds only 23 were recognized; on the separate exposed developer
challenge and 20 synthetic negatives no regression was observed. Full v8 EN
cross-validation yielded guarded macro-F1 0.729 with 9 wrong accepts. Against
production `58da9b10556c9710e2dcc745522301c7782c9f46`, exposed published EN
accuracy was 0.426 to 0.738, recall 0.222 to 0.689, precision 1.000 to 0.939,
and macro-F1 0.320 to 0.776. The candidate accepted two unrelated cases,
classified as small talk and courses. The benchmark was already exposed;
neither its score nor the internal result authorizes production activation.

Another 32 original EN candidates targeted greetings, capabilities, uncertainty
and pricing. The full batch increased wrong accepts on paired internal folds
from 12 to 15. A selected greeting-and-pricing subset improved paired recall
but lost one correct result on the exposed developer challenge; greetings alone
preserved that challenge but added one wrong accept on a repartitioned paired
fold. None was added to the versioned training set. These remain development
observations, not a blind test or an adequate quality threshold.

An exploratory EN small-talk eligibility guard required conversational cues.
Its first version suppressed two genuine internal small-talk cases; expanding
the cues restored the original internal score but did not reduce false accepts
in the available internal negatives. A separate 20-message probe also
contained valid technical, booking, status and human-contact requests, so those
accepted labels must not be counted as out-of-domain errors. This guard was
not promoted, and no changes were tuned to published test phrases.

Removing the proposed English booking phrases recovered the original EN
wrong-accept count on the fixed combined-model folds (12), while guarded
macro-F1 rose from 0.648 to 0.668; RU rose from 0.595 to 0.642 with the same
four wrong accepts. However, when the expanded dataset itself was repartitioned
so that proposed phrases could also be held out, the combined model produced
eight RU wrong accepts and one accepted RU negative. The repartitioned result
is not directly paired with the original folds, but the increased errors and
previous tuning on these data make it unsuitable as release evidence.
On a subsequent paired comparison using the same repartitioned original
examples and negatives, RU wrong accepts increased from 5 to 7 while EN fell
from 12 to 10; both had one accepted negative. This confirms the RU regression
is not explained solely by the changed split. Among held-out proposed phrases,
one farewell was mistaken for thanks in each language. The existing dialogue
core now recognizes a narrowly worded gratitude-and-farewell as a close, with
negative tests for similar non-closing statements; this is a conversation
fix, not evidence that the statistical model was retrained or reached target.

An isolated feature-hash dimension study used the existing fitting and
prediction code with only its vector dimension changed, and the same
language-specific v4 internal folds. At 1,024 dimensions guarded macro-F1 was
0.617 RU and 0.675 EN; at 32,768 it was 0.631 RU and 0.704 EN, with the same
wrong-accepted counts (3 and 6) and no accepted negatives in these small folds.
The larger configuration increases dense weight storage 32-fold. Intermediate
sizes accepted one unrelated English negative, showing why F1 alone is not a
release criterion. These results are development evidence only, not an
independent evaluation; production features and artifacts were not changed.

An isolated study of longer fitting and a higher initial learning rate used
the same existing trainer, RU/EN-only data and language-specific internal
folds. Longer fitting improved recall but also increased wrong accepts: from
3 to 7 RU and 6 to 9 EN at 150 epochs, with one additional EN false accept
among 31 negatives. At 240 epochs wrong accepts rose to 9 RU and 10 EN. These
configurations were rejected; the production/default trainer was not changed.
Increasing the confidence and margin thresholds after 150 epochs reduced
wrong accepts, but at a cost: the first tested threshold restoring the original
RU wrong-accept count also reduced RU recall below the 78-epoch baseline;
the corresponding EN threshold likewise fell below baseline recall. This
trade-off is based on the same exposed folds, not calibration evidence for a
release threshold.

An isolated feature-weight study doubled character n-gram weight in the same
classifier without changing production code. For language-specific training,
RU guarded macro-F1 rose from 0.617 to 0.670 with 3 wrong accepts and no
accepted negatives in either run; on the separate but exposed 15-positive/
5-negative RU challenge, correct predictions rose from 12 to 13 with no
observed wrong accepts. EN wrong accepts rose from 6 to 11, so the change is not
appropriate as a shared default. With combined RU/EN training it raised RU
wrong accepts from 4 to 5. The experiment remains local and unpromoted, and
the small development samples do not establish generalization.
The RU profile can now be reproduced with the existing trainer using
`--dataset v4 --language ru --balance sqrt --feature-profile ru-char2-v1`.
The internal three-fold comparison uses `--dataset v4 --ood extended --balance
sqrt --split-language yes --ru-feature-profile ru-char2-v1`. It uses the same
classifier with locale-scoped research weights; EN and ES fall back, and no
production route activates these artifacts. A SHA is not an independent model
quality approval.
The pinned RU artifact was also compared with the secretary at production
commit `5d0f3da624a2eb4bf24931b1cb4e310637fca1f0` on the exposed published RU
cases: accuracy 0.410 to 0.836, recall 0.222 to 0.800, precision 0.833 to
0.947, and macro-F1 0.293 to 0.848; each had one wrong accepted intent and one
accepted negative. The older combined research candidate had no wrong accepts
or accepted negatives on that same set. The set was previously exposed and
this diagnostic does not justify activation or establish blind generalization.
The later RU char2 v5 artifact scored accuracy 0.836, recall 0.800, precision
0.947 and macro-F1 0.854 against the same production baseline and the same
exposed RU cases; it still produced one wrong accept and one accepted negative.
The required 0.90 macro-F1 was not met, so this remains research only.

Research v9 added 29 original Russian phrases and no English phrases. On a
paired internal split of the existing Russian examples, guarded macro-F1 rose
from 0.715 to 0.741, with six wrong accepts and no accepted negatives in each
run. Fifteen of the 29 new phrases were recognized when held out; the same
number was recognized by the preceding candidate. These development checks
are small and exposed, not independent validation. Full repartitioned v9
cross-validation gave RU macro-F1 0.738 (seven wrong accepts) and EN 0.729
(nine wrong accepts); folds differ from earlier versions.

Two offline runs produced byte-identical schema-4 v9 artifacts: RU SHA-256
`db274e2feafac8f263d347dbfbb04ab1d0fb6a7970e62533109805ce76684ac4`,
EN `75c57da3f2ec8173f6a23d428d2dbf2fcbfb3abb3846e5433c1e30ab0b43b0e9`.
The updated similarity audit still finds one close RU phrase in the original
corpus and no added RU/EN phrase at the 0.70 threshold. The published fixture
was already exposed during development, so this is not a blind evaluation.

Against production commit `bffc8f3c1c40ca648560e60bfd60a9ab29d288f9`,
published RU diagnostic accuracy/recall/macro-F1 were 0.410/0.222/0.293
for baseline and 0.803/0.778/0.834 for v9; wrong accepts remained one,
while accepted unrelated examples increased from one to two. EN was
0.426/0.222/0.320 versus 0.738/0.689/0.776, with zero wrong accepts in
each and unrelated examples rising from zero to two. Local classifier p95
was approximately 0.38 ms for RU baseline and candidate, and 0.49/0.50 ms
for EN; these are noisy local measurements, not route or LIVE latency. RU v9
regressed against the earlier v7 diagnostic (0.854 macro-F1 and one unrelated
accept), so it is rejected for release. Neither language meets the 0.90 gate.

A second developer-authored open-set challenge contains 16 synthetic negatives
per language (unrelated topics, emotional disclosures and refusals); it has
not been used for training and is now exposed to development. Its fixture
SHA-256 is `40bbf438c3a3bb0183a9386e8b10c094aefbcb08ee6d13ece234f6a51eeac7f5`.
The research v7 RU and v8 EN artifacts each accepted two unrelated cases:
a bicycle price as site pricing and a question about a book as assistant
capabilities. This measures secretary eligibility, not the full route. A
prototype lexical capability guard suppressed the book cases while leaving
the existing internal-fold scores unchanged, but those folds do not establish
coverage of conversational paraphrases; it is not enabled or released. The
pricing ambiguity also remains. Future fixes must test both in-domain recall
and unrelated objects rather than merely matching these examples.

The actual local route also treated a bicycle-price question as a service
price, including when the secretary was selected. Its RU/EN price fallbacks
now say that the current price cannot be checked, and refer to the Holistic
House listing only conditionally. A local route integration test covers a
fresh conversation and a follow-up after a consultation goal in both
languages. This prevents the unsupported service assumption but does not
change the classifier's two false accepts or prove LIVE behaviour. Spanish
copy remains unchanged. The focused secretary/rule tests and isolated
PostgreSQL route/session suites passed after this change.

Explicit conversational topic changes now include Russian «Давай сменим
тему и поговорим…» and English “Let's change the subject and talk…”. The
existing event clears the old goal before storing a recognized new topic;
negative statements about changing topic do not trigger it. A route test
recalls a goal after eight intervening turns, changes topic using these
phrases, and verifies that the old goal is no longer recalled in RU and EN.
This stateful route is locally tested behind its existing disabled-by-default
flag; it is not evidence that state persistence is enabled on LIVE.

The same local stateful route recognizes direct conversational booking
deferrals such as «Я пока не хочу записываться» and “I'm not ready to book
yet”, alongside the existing imperative refusal. It acknowledges the
refusal, keeps the consultation goal and clears offered choices without
performing an action. Question-mark variants are not treated as confirmed
refusals. RU/EN event tests and the isolated PostgreSQL route/session suites
passed; this is not a claim about a production booking workflow.

When a user explicitly rejects the currently saved consultation time without
providing a replacement, the local state now clears that time and asks one
question. Rejecting a different time or asking a question does not clear it;
the state transition also verifies that the rejected value matches the saved
one. RU/EN route tests cover morning preference, rejection, and an evening
replacement without asserting that an appointment was booked. The focused
event/state tests and isolated PostgreSQL integration suites passed.

Production commit `bffc8f3c1c40ca648560e60bfd60a9ab29d288f9` also contains
Complaint Mind, which was absent from this older checkout. The local
candidate now incorporates the identical production component and its tests,
keeps complaint handling after safety/auth gates, and commits state through
the existing session finish path. An explicit existing advice refusal is
handled before the generic complaint response. RU/EN route tests cover
complaints with state enabled and disabled, and the complaint, dialogue,
rule and PostgreSQL suites pass. This is a local reconciliation only:
the final protected branch integration and exact-HEAD CI remain outstanding.

During reconciliation, a conversational topic change was found to clear the
dialogue state but not the Consultant Mind's short history lookup. A later
ambiguous price question could therefore revive an earlier service. The
existing Consultant Mind now uses the shared explicit topic-change event as a
history boundary. RU/EN tests exercise both the consultant and the complete
local stateful route; unrelated earlier service suggestions do not recur.
Consultant, event and PostgreSQL route/session tests passed. Targeted ESLint
reported no errors and one existing unused-import warning in the consultant.

The grouped local chatbot test files passed together after reconciliation.
An initial broader filename match also included the unrelated
`mandala-native-audio-files.test.mjs`; its composed melody export assertion
failed again in isolation. The Mandala test and its audio implementation are
not modified by this task, and the old checkout's audio implementation differs
from the current production branch, so this is not evidence of a chatbot
regression or proof that production audio passes. Disk free space was under
1 GiB; no full production build or cleanup was attempted in that state.

On 2026-11-13 a guest iHelp browser check on the current public site asked
synthetic questions about the price of a bicycle in RU and EN. Both visibly
received the old generic response claiming that the price depends on a service
listing. This confirms the observed production problem, not deployment of the
local correction. The local guest path calls the same modified reviewed-rule
composer; local unit tests cover the changed wording. No deployment SHA was
verified in this browser check, and it does not establish authenticated or
stateful behaviour.

A local regression check now compares all 72 messages in the two exposed
developer challenges with each versioned RU/EN training set v1–v9 after text
normalization. No exact overlap was found. This prevents accidental test
phrase inclusion in future changes that run the check; it does not undo prior
exposure, establish semantic independence or replace the published PR #4383
diagnostic.

An additional exposed, developer-authored capability paraphrase probe (15
positive and eight unrelated queries per language) showed why the prototype
keyword guard is unsafe: it suppressed two of five correctly accepted RU
capability paraphrases, despite blocking three accepted unrelated RU examples.
The EN model correctly accepted only three of 15 positive probes and accepted
an unrelated bicycle question as privacy. These are small research probes,
not independent test metrics or full-route results.

An offline paired-fold experiment added eight newly authored capability
phrases per language, separate from those probes and screened against the
published fixture. On the existing internal validation folds, RU correct
predictions rose 169 to 171 but wrong accepts rose 5 to 6; EN correct fell
221 to 220, wrong accepts rose 9 to 11 and accepted negatives rose 0 to 1.
The candidate was rejected, not added to training, and not evaluated on the
published cases. Scripts and synthetic phrases remain in the local recovery
directory for reproducibility; neither is evidence of LIVE improvement.

Splitting those candidates into two groups of four did not resolve the
regressions. On identical existing folds, each RU group changed correct
169→171 but wrong accepts 5→6; each EN group increased accepted unrelated
examples 0→1 and wrong accepts from 9 to 12 or 10. Newly accepted errors
included a course request classified as services, an English price question
classified as capabilities, and an unrelated weather question classified as
small talk. The training algorithm updates all classes and its deterministic
sample order depends on total sample count, so adding one class's phrases can
affect other classes. Both subsets were rejected; the result calls for a
broader training and calibration change, not a keyword-only patch.

An isolated trainer experiment replaced the sample-count-dependent sequence
with a deterministic per-epoch hash order while leaving the existing model,
features and optimization otherwise unchanged. On the same exposed internal
folds, RU correct predictions changed 169→168 with five wrong accepts in
both; EN stayed at 221 correct but wrong accepts changed 9→10 and unrelated
accepts 0→1. Adding the eight capability phrases under the stable order still
increased wrong accepts (RU 5→6, EN 10→11). The ordering change is therefore
not promoted. This isolates one factor but does not prove what causes every
classification change; multiclass updates and class balancing also interact.

Nested threshold calibration was evaluated without consulting the published
fixture: each of three outer development folds used two inner folds drawn only
from its training portion to choose class-specific thresholds, then scored the
held-out outer fold. A permissive minimum of 0.35 increased RU wrong accepts
5→9 and EN 9→15 (plus two unrelated accepts). Restricting thresholds to at
least the existing 0.47 avoided extra accepted errors but reduced correct RU
169→144 without reducing its five wrong accepts; EN correct fell 221→187
while wrong accepts fell 9→5. The small calibration splits could not support
some class thresholds, which were set to abstain. Neither policy is promoted;
these are exposed development folds and cannot establish release quality.

An 8192-dimensional variant of the same hashed features and trainer was
evaluated on the current research RU v7 and EN v8 folds. RU correct rose
169→177, wrong accepts fell 5→3, and unrelated accepts remained zero;
guarded macro-F1 rose 0.692→0.721. EN gained three correct but accepted one
unrelated example, so its profile was rejected. On two small exposed RU
developer challenges, the RU variant changed correct 14→15 of 15 on the
positive challenge and unrelated accepts 2→1 of 16 on the open challenge.

Two offline RU runs produced byte-identical experimental artifacts
`hh-native-ru-v7-8192-char2-sqrt-research-v1`, SHA-256
`12102d9b5bdd700c928649c9d0bc8075504ba569421cc4ed4c8ab9c743a3dad6`.
They are stored only in the local recovery directory, use 314 RU examples,
and are not compatible with or activated by the production artifact loader.
On the previously exposed PR #4383 RU diagnostic, compared with production
commit `bffc8f3c1c40ca648560e60bfd60a9ab29d288f9`, accuracy was
0.410→0.836, recall 0.222→0.800, precision 0.833→0.973, macro-F1
0.293→0.864, wrong accepts 1→0 and unrelated accepts remained 1. Local
classifier p95 was approximately 0.326→0.350 ms in that run. The fixture is
not blind, one original RU training phrase is lexically close to a held-out
dialogue, the 0.90 target is unmet, and these timings are not LIVE latency.

Additional fixed-fold dimension probes (2048, 4096 and 16384) did not find an
English profile that improved recognition without either extra wrong accepts
or an unrelated accepted example. At 4096 EN correct rose 221→224 and wrong
accepts fell 9→8, but one unrelated example was accepted. A proposed
small-talk lexical guard removed that example on the exposed folds, but a
separately authored 15-message probe showed it also rejected five naturally
worded accepted small-talk messages such as “How has your week been?”. The
guard was rejected. These observations concern the secretary classifier,
not the complete conversation route, and no EN candidate was promoted.

An EN-only feature study subsequently tested character weight 2 together
with larger hash spaces. On the same exposed v8 internal folds, the 8192
profile improved correct predictions 221→234 and wrong accepts 9→7, with
zero unrelated accepts in both; macro-F1 rose 0.729→0.756. On the small
developer challenge it retained 15/15 correct, while the separate open
challenge retained two unrelated accepts. These are development observations.

Two EN offline runs were byte-identical, with artifact SHA-256
`30a93d86fb329ff5a565f03c290d8d0a3408ae94f8e8f20a8c9e03a948f627c2`.
The local-only candidate `hh-native-en-v8-8192-char2-sqrt-research-v1` uses
368 EN training examples; it is not activated by the production loader.
On the previously exposed PR #4383 EN cases against production commit
`bffc8f3c1c40ca648560e60bfd60a9ab29d288f9`, accuracy was 0.426→0.770,
recall 0.222→0.733, precision 1.000→0.943 and macro-F1 0.320→0.802.
There were no wrong accepted positive labels in either, but unrelated
accepts increased 0→2. Local classifier p95 was roughly 0.367→0.625 ms in
that run, not LIVE latency. The score remains below 0.90 and the fixture is
not blind; this model must not be treated as release-ready.

The existing offline trainer and pinned artifact loader now support an
explicit locale-scoped `char2-8192-v1` research profile as schema 5; the
schema 4 format and default 1024-dimensional runtime behavior are preserved.
The shared source fingerprints changed and older artifact provenance must be
revalidated. Two runs per
language produced matching bytes: RU SHA-256
`bb9e5bd913aea4bda1361a936b548094b1e995ebb96dad9bb7a1aa4c8e43040d`,
EN `86f72840d301de607d2ad96e14e16b462ac671ab9bee88d018c74b2ed592e713`.
Their weights and biases match the earlier isolated research artifacts. The
existing pinned published-diagnostic script reproduced the same RU/EN
metrics above; the pins are local research pins, not independent approval.
At the time of that evaluation the candidate remained disabled and below the release quality threshold.

The 8192 RU/EN profiles were also fitted experimentally with an extra
synthetic out-of-scope label, using either eight unrelated phrases or all 16
previously authored negative phrases per language. On the same internal
folds, RU correct fell 177→170 or 169 with unchanged wrong/unrelated
accepts; EN correct fell 234→231 or 225 while wrong accepts fell 7→6.
On the separate exposed open challenge, neither version removed the existing
bicycle-price false accept in RU or the bicycle/book false accepts in EN.
The additional label was rejected and is not in the production model.

## Owner-directed staged release candidate

After the owner requested release of the current model before further work, the
local authenticated server route was wired to the pinned RU v7 and EN v8
artifacts. `HH_NATIVE_RU_EN_MODEL_ENABLED=false` selects the previous model;
invalid artifacts also fall back. Spanish continues to use the previous model.
This is a local candidate, not evidence of a merge or live deployment. The
previously exposed PR #4383 diagnostic is not a blind evaluation, and the EN
candidate has two out-of-domain false accepts; further independent quality and
safety work remains necessary. Guest chat uses its existing rules path, not
these server artifacts. The optional server dialogue state remains off by
default and its migration has not been applied to production.

On 2026-11-13, after wiring the pinned artifacts, a local Node 22 process
measured module import at 580 ms and RSS at 82 MiB after 300 predictions per
language. Prediction p50/p95/p99 in milliseconds was 0.038/0.159/0.265 for
RU and 0.033/0.175/0.262 for EN. This is a single-process synthetic timing,
not a Vercel cold-start, end-to-end latency, or production capacity claim.

Longer fitting of the 8192 RU/EN profiles (100, 120 and 150 epochs against
the existing 78) increased recognized positives but also increased wrong
accepts on the same internal folds; 150 epochs additionally accepted an
unrelated example in each language. Increasing the acceptance threshold to
offset the errors did not improve the RU or EN 78-epoch trade-off on those
folds. During this experiment, a threshold comparison using the predictor's
rounded display score differed at the boundary from its actual acceptance
decision; the baseline was corrected to use `accepted` directly, and higher
threshold probes conservatively exclude rounded ties. None of these exposed
development results was promoted or evaluated on the published fixture.

Four additional synthetic dialogue checkpoints were compared locally with
`hh-qwen3-test:latest`, with the same preceding native transcript supplied to
Qwen and no model fine-tuning. For the RU evening preference, Qwen suggested
evening leisure activities instead of retaining consultation timing; for the
RU price question it asserted negotiation without supporting evidence. For EN
it gave a very brief but context-free follow-up to the timing preference and
honestly said it could not check the price. The local route acknowledged the
preference and used its service-catalogue information for the price question.
Qwen was not given that catalogue, so the price comparison is not a like-for-
like factual knowledge benchmark. All four Qwen outputs were nonempty, with
observed local times of about 1.1–6.8 seconds; no client data was used.
On the same RU folds the language-specific comparison gained 20 correct
answers without losing a correct answer or changing the three wrong accepts.
Both variants also abstained on a further 20 locally authored synthetic RU
out-of-domain probes, checked for exact training overlap. That probe was
created during development and is neither blind nor statistically sufficient
to certify safety. In a shared model, applying the same feature weighting to
Cyrillic words alone still increased EN wrong accepts from 12 to 13 and EN
accepted negatives from 1 to 2; it was not promoted.
