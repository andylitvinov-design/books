# My Course V7 — approved mockup fidelity update (2026-10-14)

**Approved visual reference:** https://drive.google.com/file/d/1fVeeSSZMw6LqqlSFENg8T9P6lF7f-XLy/view

**Target:** the four-screen adult wellness game: (1) focused Today (2) visual 14-day journey (3) one learning task per slide (4) gentle completion/reward. Blue, aqua, teal and mint; no Duolingo trademarks or mascot.

## Implemented visuals

- Today: clear Russian/English My Course heading and decorative XP total (20 × saved practiceCount), local original vector wellness character blended with the existing site-owned background photo, one primary Start practice CTA and a real server-derived progress bar. Trends remain accessible in a collapsed disclosure, not competing with Today's task.
- Journey: all 14 verified server-roadmap nodes presented on an alternating, curved dotted path with chapter headers, active step halo, completed checkmarks, muted locked future steps and bottom scenic illustration. Labels remain in document-flow CSS grid, never absolutely positioned, and expanded summaries take their own row.
- Lesson entry: a single question Choose your rhythm with three large real options. The saved choice updates the existing course preferences endpoint (quick/standard/no-imagery) only after a successful server response, with failure retry and busy locking. Same preferences stay accessible inside guided steps in a collapsed panel.
- Lesson explanations: the aphorism and detailed learn paragraph are now separate steps; prior baseline/check-in, recall, guided practice, action, reflection, matched before/after and neutral completion remain intact.
- Completion: calmer adult turquoise-and-gold illustration and 20 XP only upon confirmed saved session; comparison remains visible as a compact before/after pair. No rewards for lower self-reported distress or a clinical interpretation.

## Data safety

No backend schema migration; no change to original test instruments, question keys, scoring, reports, private client data or daily calendar limits. Preserves lesson IDs, accepted preferences, server-owned progress, original English/Russian content and existing accessibility/reduced-motion rules.

## QA gates

- Full app tests with new tests/my-course-v7-mockup.test.mjs.
- Production build, TypeScript, lint, DB RLS tests and Chromium/WebKit synthetic journeys.
- Real signed-in iPhone 320–390px lesson review after production rollout; no personally identifying client data in synthetic tests.
- Production holistichouse.vercel.app alias must serve the exact merge SHA, verified through Vercel, not inferred from successful merge.
