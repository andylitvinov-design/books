# Holistic House — weekly business coaching quality review (2026-10-20)

**Implementation issue:** [books #1298](https://github.com/andylitvinov-design/books/issues/1298).  
**Scope:** existing private `/en/app/business` and `/ru/app/business`; educational **Business & Career 90 Days**, not OPORA/Anti-Stress, no new prices or videos.

## Quality audit — before
| Finding | Why it matters | Correction |
|---|---|---|
| Generic imperative daily exercises | A checkbox alone does not prove any usable deliverable | Every day now has a distinct named artifact + explicit "done when" criterion EN/RU |
| Empty notes could be marked "completed" | Misleading progress and empty report | New v2 UI requires at least 6 characters of authored *actual result* to mark a day done, with unfinished drafts still allowed |
| Unstructured 90-day picker | Hard to navigate on mobile and find current week | 12 weekly modules (7 days each) + separate 6-day integration module; one module shown at a time; 7-day pill navigation |
| Actions and reflections merged in one textarea | Hard to find tangible gains | Separate private concrete result from optional reflection; print report grouped by weekly module |
| Retroactive reinterpretation risk | Older results were logged under v1 | Preserve original day IDs, previous checkmarks, and note fields; version and snapshot the v2 result label on the server |
| Sensitive business figures | Do not infer income or expose contacts | No forced numbers, no third-party identifiable details, no conversion of qualitative observations to made-up KPIs |

## Learning outcomes, one per week
| Module | Completion artifact | Day results |
|---|---|---|
| 1. Point A | Dated baseline map | 3 facts; value work; time map; baseline indicator; feedback; resources and constraints; baseline summary |
| 2. Point B | 90-day goal card | Desired change; priority; metric; supports; influence; first step; complete goal card |
| 3. Bottlenecks | Barrier-to-experiment map | Deferred task; actual bottleneck; 3 steps; 2-minute test; evidence; help request; revised map |
| 4. Stop-doing | Time-recovery plan | Low-value list; safe stop; next priority; pending-task decision; focus block; capacity check; month-one review |
| 5. Rhythm | Sustainable weekly system | Review slot; 3 outcomes; buffered calendar; fallback; focus test; revision; final checklist |
| 6. Value | One-page offer | Audience; real need; potential outcome; feedback; 2-sentence pitch; clarity feedback; offer |
| 7. Opportunities | Respectful opportunity map | Relationship roles; channel; 3 questions; discussion/draft; agreed next step; 3 insights; map |
| 8. Money | Private resource snapshot | Privacy choice; reference period; sources; cost categories; price analysis; evidence-dependent decision; month-two review |
| 9. Conversations | Ethical conversation plan | Questions; inclusions/exclusions; transparent terms; non-pressure response; next step; lesson; checklist |
| 10. Process | Tested checklist | Repeatable workflow; steps; bottleneck; draft checklist; trial; one before/after measure; final process |
| 11. Experiment | Evidence-based growth experiment | Idea; hypothesis; preselected metric; actual action; data; hypothesis check; continue/revise/stop |
| 12. Review | Quarter summary | Initial goal; comparable KPIs; real skills; conditions; retest choice; next habit; 30-day plan |
| Final 6 days | Integration and continuation decision | Useful practices; month-one observations; month-two rhythm; month-three facts; support; closure/continuation |

## Implementation contract
- `lib/business-coaching/program.js` remains the original v1 sequence of teaching actions and stable 1..90 numbering.
- `lib/business-coaching/week-modules.js` is the **v2 content layer** with original day IDs, weekly outcome, capstone and 90 unique daily deliverables.
- `components/app/business-coaching.jsx` presents a selected module and 7 activities (6 for integration), separate result textarea, factual acceptance criterion and optional reflection.
- `lib/app/business-coaching.js` stores `result`, `contentVersion` and the server-generated bilingual `resultLabelSnapshot` inside the existing AES-GCM encrypted account-owned payload. No new schema, encryption key, analytics integration, payment or client share.
- Old client payloads (`note` only) remain valid. They count as legacy participation; the interface explicitly distinguishes "completed" from "completed with recorded result". The server enforces a nonempty result only for requests declaring the reviewed v2 content version.
- `Report` renders source-versioned actual outputs under each module. Do not reinterpret missing results as failure or empty business figures as zero.

## QA gates before merge
1. 12×7+6 = 90 stable, unique, translated outputs with criteria; each maps to its original corresponding exercise.
2. Unit tests prove weekly grouping, progress and legacy compatibility, server request contract, mobile module UI and print report.
3. Syntax tests for JS, JSX, CSS Module purity; scoped CI test pass.
4. Build and deploy to Vercel Preview if available, check mobile 320/390 and desktop UI, no horizontal scroll and working state transitions.
5. Production only after safe merge; verify exact SHA and READY, then EN/RU route and actual owner save if authenticated test account is available.
6. Never claim actual psychological/business improvement based solely on completed tasks.

No render, publication of videos or client communication is requested.
