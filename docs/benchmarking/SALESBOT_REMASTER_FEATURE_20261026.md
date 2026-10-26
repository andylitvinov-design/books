# Holistic SalesBot — Remaster feature-mode clean-room benchmark
**26 October 2026 · owner program #2058 · related CRM #985 / advisor #1519**  
**Target product:** public documentation of amoCRM Salesbot.  
**Host:** existing Holistic House CRM Automations; no second CRM or messenger.  
**Status:** verified public-doc feature inventory; original product editor was NOT exercised with a logged-in trial account. Remaster GitHub research gate remains incomplete without authentic customer reviews and allowed demo interaction.

## What is actually installed and executable

- Audited **Remaster @thenavidm/remaster 0.2.1** is installed project-only in an isolated checkout on owner's Mac, discovered by a fresh Codex as `$clone` (PR #2066 and #2058). This did **not** globally install it in the production repository.
- The Mac Desktop Commander is currently offline; local sandbox previously rejected Playwright browser launches even though Chromium/WebKit binaries were downloaded. Do not invent a successful macOS Salesbot visit.
- **REA** is not installed. Its native/decompiler capabilities are unnecessary for functional product research and unauthorized proprietary extraction is out of scope.
- A separate pinned **GitHub Actions runner** runs the audited Remaster CLI in `feature` mode against a four-source public-documentation ledger and an honest parity matrix. It uses no competitor login, tokens, private endpoint, code, cookies or screenshot assets.
- The CI does not try to pass the Remaster `research` gate by inventing 30 reviews. It requires `sources` and `features` to pass, `reviews` / `pains` to remain incomplete, and the final parity verdict to be `not shippable` until must-haves are really done.

**Run the scoped CI:** [.github/workflows/hh-salesbot-remaster-feature.yml](../../.github/workflows/hh-salesbot-remaster-feature.yml). It pins the previously audited SHA-512 SRI of version 0.2.1 and disables lifecycle scripts. Results are stored as short-lived anonymous JSON under GitHub Actions artifacts, not committed original-site data.

## Public evidence — black-box functional contract

| ID | Official source | Behavior described in public documentation | What we implement ourselves |
|---|---|---|---|
| S01 | https://www.amocrm.ru/support/digitalpipeline/salesbot | Message steps; choices; rules; preview; CRM actions | Editable branching graph and safe preview |
| S02 | https://www.amocrm.ru/support/digitalpipeline/trigger_salesbot | Launch by configured pipeline events and conditions; schedule | Later owner-approved event gate; no invented live sends |
| S03 | https://www.amocrm.ru/developers/content/digital_pipeline/salesbot | wait_answer; condition; validations; goto; message; webhook extensions | Typed allowlisted steps; NO arbitrary scripts/HTTP; bounded DAG |
| S04 | https://www.amocrm.ru/support/digitalpipeline/task_creation_trigger | Owner task by confirmed pipeline event | Later reuse existing CRM followups only |

Sources are **public documentation, not independently measured original interactive screens**; no true 1:1 UX claims. Derived behavior and own code are separate evidence classes.

**Feature ledger:** [data/benchmarking/salesbot-remaster-features.csv](../../data/benchmarking/salesbot-remaster-features.csv), [source ledger](../../data/benchmarking/salesbot-remaster-sources.csv). No proprietary JavaScript, network replay, source maps, private admin pages or third-party assets are read.

## Implementation in this PR

- `lib/crm/salesbot-editor.mjs`: deterministic owner step builder for `say / choice / branch / offer / handoff`, add options up to five, choose topic and allowlisted offer, remove only safe linear nodes, import strictly validated JSON (no executing code), reject cycles/orphans/unknown actions.
- `components/app/crm-salesbot.jsx`: use **existing** CRM Automations view to edit and preview one branch at a time with EN/RU/ES and ≥44px controls on mobile. Do not open another capture modal or duplicate the public chat.
- `lib/crm/salesbot-flow.mjs` remains the exact bounded validator and owner simulator; `app/api/app/crm/salesbot` remains auth-protected and side-effect-free.
- `app.crm_salesbot_flows` continues as the existing encrypted drafts/version store with FORCE RLS from merged R2a #2078. No new SQL migration needed.
- `tests/crm-salesbot-feature-editor.test.mjs` validates all edges, multiple answer paths, invalid code and URLs, 24-node max, import rejection, zero sends/leads/payments. CRM CI and Remaster benchmark CI run tests.

### Deliberately not cloned or activated

- No arbitrary JavaScript, webhook/RPA action or copying Salesbot internal schemas. All user-supplied JSON is allowlisted graph data, not executable source.
- No automatic Telegram, WhatsApp, Instagram, Messenger or paid AI call. Those require confirmed provider identity, explicit opt-in/STOP, approved budgets and real receipts.
- No self-generated CRM contact or clinical-profile linkage. A visitor click or chatbot text is not a server-confirmed consented lead.
- No real booking or payment on redirect; retain independent provider confirmation.
- No public executor yet; owner preview is not activation. The public `HomeConversationGuide` and `ContactChannelChooser` remain intact.
- No pixel-level copying of the original interface; reuse HH existing beige/wood editor style.

## Follow-up when the authorized Mac / Codex is available

1. Restore an allowed interactive browser context for the already installed Remaster; verify the project-scoped skill exists. **Do not reinstall or upgrade blindly, use the already pinned v0.2.1.** The Mac must be online at https://mcp.desktopcommander.app/ .
2. From an isolated clean worktree based on production, start a fresh Codex session. Invoke **`$clone`** with this user-approved goal: *“Use Remaster in feature mode to research the public/authorized amoCRM Salesbot conversation builder (messages → questions/buttons → wait/condition → approved owner CRM task). Collect first-party source links and synthetic example flows, record browser-visible interaction states, privacy and error paths. Do not read JS bundles, intercept traffic, copy any third-party code/assets, bypass login, create accounts or send customer messages. Preserve HH CRM and editor. Compare to our feature ledger and fill only missing verified rows.”*
3. Inside Remaster toolchain, `remaster status`; if the isolated project has no state, `remaster init https://www.amocrm.ru/support/digitalpipeline/salesbot --mode feature --name "amoCRM Salesbot"`. Continue only with user-authorized public screens. Signed-in product demo requires user's own approved account and contractual permission; do not bypass limitations.
4. Compare actual behavior to the pinned ledger, run `remaster parity --json` and gates (no invented reviews), then Codex implements the verified missing slices using **the existing** `HomeConversationGuide`, CRM, consent-ledger, owner tasks and EN/RU/ES. Production commit, CI, Vercel READY and complete real E2E evidence remain separate requirements.

## Next real functional release gates

R2b: existing public chat -> user-confirmed contact with one-off reply consent -> real `POST /api/service-enquiries` saved+reference -> existing CRM owner lead -> task after true DB receipt -> manually supervised conversation. Dry-run graph actions must never create leads.

R3: authorize deliberate on-site publication/versioned interpreter, idempotent event/outbox, replay/STOP/timeout guard; public activate is a separate reviewed state from `approved_preview`. Only later official messenger transports with provider-level delivery receipts and separate approval.

**Acceptance:** no duplicated CRM; all source/migration/security checks; Chrome/WebKit 320/390/430 EN/RU/ES; authenticated owner save/reload/pause; second-account negative RLS; no social/health contents in pixels and external notifications; exact production branch and READY SHA. Any unavailable test is BLOCKED, not PASS.
