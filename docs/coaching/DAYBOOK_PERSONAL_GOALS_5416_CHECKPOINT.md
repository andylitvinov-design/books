# Personal goal lifecycle — local implementation checkpoint

Scope remains the full #5416 program. This branch prepares its missing personal goal lifecycle without modifying the frozen journal PR #5429 or duplicating the open #2609 free goal-profile/Google Cabinet handoff.

Preflight: repo andylitvinov-design/books; protected base 92844bdf57c30fa37c5c753020ed72f696c2201c; local branch codex/daybook-personal-goals-5416; no new remote branch/PR. #2609 owns development-goals/profile ratings and shared Cabinet handoff; #5429 owns new private journal paths. Existing coaching_life_plans/coaching_life_plan_areas/coaching_goals/coaching_action_items remain canonical.

Prepared: strict owner-authored DTO with title/why/desired outcome, canonical outer area + optional inner axes, optional calendar deadline, bounded uniquely identified milestones, short step/fallback, optimistic revision and operation ID; explicit transition guard requires client confirmation before acceptance/activation/completion and preserves legacy paused/cancelled state handling. No AI request, automatic goal completion, paid activation or persistence is implemented here.

Four focused tests passed after an initial missing-implementation failure. They cover invalid/unknown fields and ownership injection, areas/axes, deadlines, milestones, explicit transition confirmation and legacy resumption. Syntax/diff checks passed. No claim of runtime CRUD, encryption, migration, browser acceptance or LIVE.

Next: integrate this contract into owner-scoped encrypted CRUD using existing life-plan tables, not a parallel goal store. Inspect current production constraints and consent/audit triggers first. Existing goals allow proposed/active/paused/completed/cancelled; accepted/deferred/declined require a backwards-compatible additive constraint migration. Additional encrypted metadata must also be integrated into existing export/deletion/readback; current Life Plan export fails closed on unknown *_ciphertext fields, so adding a column alone is incorrect. Recheck ownership and current exact HEADs before shared-file edits. Build complete source/tests/UI locally, publish once, then protected CI and existing hourly publisher.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
