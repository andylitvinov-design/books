# Holistic House — Manus Repair Webhook v1

Owner instruction: 2026-11-06. **Integration disabled until configured.** This handoff reuses the existing trusted HH PR source Repair Worker; it adds no new cron, workflow, poller or runner.

## Activate
1. In Manus, open **Automations → Create → Trigger → Webhook**. Confirm the existing GitHub connector can access andylitvinov-design/books. Select a new task per event, use the Manus project instruction below, and copy the generated webhook URL and auth header from its Settings. This is the incoming automation trigger, **not** the outgoing Manus Developers task-completion webhook.
2. In GitHub repository Settings → Secrets and variables → Actions → **Secrets**, set HH_MANUS_WEBHOOK_URL and HH_MANUS_WEBHOOK_AUTH_HEADER. The latter must be a complete Header-Name: value string shown in Manus. Never post either publicly. The destination must be HTTPS on manus.im, manus.ai or their subdomains; review any different official host before changing allowlist.
3. Check remaining included Manus credits and overage behavior. In GitHub **Variables**, set HH_MANUS_ENABLED=true and HH_MANUS_CREDITS_APPROVED=true only when the cost is acceptable. The integration remains off when either flag is missing or false. Pause instantly by setting HH_MANUS_ENABLED=false. Do not enable paid upgrades.
4. Exercise only a **real** current signed source-failure MANUAL PR that is safe and unowned. Verify one HH_MANUS_HANDOFF_V1 comment, Manus Updates task, checked patch, exact-HEAD protected checks and, independently, production LIVE. Do not manufacture failures or CI reruns merely for testing.

## Manus project instruction
Read payload.instruction, GLOBAL_PR_ONE_PUBLISH_V1 and the Holistic House canonical policy first. Verify payload.pr_url, expected_sha, task_key and worker_run_url against live GitHub. Use the existing PR only. Check source owner lease, protect existing holds, draft, dirty, privacy, auth, payment, consent and security. Make **one locally tested coherent source repair** if and only if safe, with one remote update and no empty commits, no repeated CI, no extra paid resources, no force-push, no duplicate PR, no auto-merge and no deploy. Report source commit SHA or precise HOLD directly in the existing PR. The protected native merge and LIVE verifier own later stages.

## Guards
Only owner-created signed exact-HEAD MANUAL receipts, no active source lease, up to eight modified allowlisted safe code paths. The trusted handoff marker is written **before** the outbound POST to prevent duplicate credit charges. HTTP acceptance is NOT proof of code repair, merge or LIVE. In an uncertain timeout inspect Manus manually, never blindly retry. No GitHub token, customer data, payment data or Manus account API key is passed in the task payload.
