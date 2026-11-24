# Three separate coaching Daybooks

Existing program routes:
- Achieve My Goal: /{locale}/app/daybook, saved goal ID, seven working weeks x seven practices and final session 8. Approved mobile refresh PR #5561, profile PR #5560.
- Find Clarity & Support: /{locale}/app/daybook?program=clarity and public /{locale}/coaching/clarity, existing PR #5559. Four sessions, first free, later sessions must remain locked until verified weekly payment entitlement exists. The PR has one saved first-session reflection; paid session materials and checkout still require implementation/approved terms.
- Business Growth: /{locale}/app/daybook/business, four sessions x three independent self-guided practices, same warm cabinet design, real saved progress and optional consultation link. Profile Business program presentation PR #5558 is separate.

Business stages follow the established strategy -> organizational design -> organizational transformation -> strategic execution order. Self-guided material is new proposed instructional content, not a record of paid consultations. One business workbook per account; no automatic share, charge, booking, or company multi-workspace claim. Uses the existing encrypted journal API, exact program tags, verified readback and full pagination. New notes have goalId null and only a program-specific tag; Goal and Clarity records do not count. Existing business service terms remain on the consulting landing.

Shared release blocker observed independently in #5558, #5559, #5560 and #5561: the public header browser test expected retired understand/goal/talk controls despite current protected Home rendering clarity/goal/business program cards. Update the source and browser contract to check all three actual cards, 3 substeps each, five methods, and order/geometry; preserve header/dock and privacy checks, no gate bypass. This change does not alter Home design.

Source preflight: verify unique replacement anchors, business progress and isolation with exact model functions, localized curriculum, and CSS braces. Browser build and authenticated E2E not available in connector session. Existing PRs remain independently owned; no head rewrite. Protected CI and ordinary publisher only.
