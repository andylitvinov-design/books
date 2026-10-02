# Issue 222 execution manifest

Base: `codex/public-book-library` at `92fc2f175f500d6db5596e12eb4130aac404fa4f`.
Production is out of scope; this branch stops at Preview review.

| Task ID | Requirement | Source | Verification |
|---|---|---|---|
| IA-01 | Shared six-item EN/RU/ES header and mobile navigation, active states and accessible responsive layout | #222 §§4–5 | Unit assertions and browser viewport checks |
| IA-02 | EN/RU/ES Library hubs preserve Books, Remedies, readers and featured-book access | #222 §6 | Route/content and legacy-link checks |
| IA-03 | Academy is a same-tab external PsiTrends link; Services/About/videos remain unchanged | #222 §§4, 6 | Rendered-link and regression checks |
| IA-04 | Existing invite-only cabinet resolves a valid server-side session safely | #222 §7 | Synthetic session lifecycle tests |
| IA-05 | Practitioner assessment lifecycle: draft, edit, share, unshare and archive | #222 §8 | Two-client owner/client workflow tests |
| IA-06 | Encrypted REST-KV assessment persistence is atomic, idempotent and optimistic-concurrent | #222 §9 | Store contract and new-adapter readback tests |
| IA-07 | Authorization, private cache policy, relation validation and input boundaries fail closed | #222 §10 | Negative authorization/security tests |
| IA-08 | PR, Preview, screenshots and issue status report, stopping before Production | #222 §§11–13 | CI/Preview readback and sanitized artefacts |

## Scope contract

Included: IA-01 through IA-08. Existing client IDs, cookies, encrypted-store envelope, public videos and documents are reused. No existing client data will be read or written.

Excluded: online questionnaires/scoring, binary uploads, private-video delivery, PsiTrends/Joomla changes, paid infrastructure, DNS and Production merge/deploy (issue §14).

Risk gates: durable storage may only be tested with an isolated configured store; production credentials/configuration remain unread. The current host has 3.2 GiB free, so an installation/build that needs additional disk is blocked rather than cleaning user files.
