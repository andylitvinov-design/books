# Holistic House Agents Director — isolated Vercel project

The owner requested independent Vercel projects and site addresses for **Agents Director** and **PR Monitor** after repeated public-monitor regressions.

- This root is **ONLY** the mobile Agent Director shell (Briefing, Agents, Tasks, Chats, Projects, Automations, Skills, Learning, Memory, protected Task Editor). It is a separate copy of the reviewed client code and selected legacy server adapters from the previous combined monitor project; it must not be deployed from the PR Monitor root.
- The seven-tab mobile dock and its PR menu now link to the **different Vercel project** https://holistic-house-pr-observatory.vercel.app/.
- Any historical /pr-monitor.html or /legacy.html paths redirect at the edge to the Observatory project. This site's root remains the Agent Director briefing.
- Public project data remains the existing JSON snapshot. Existing owner/session enforcement in server API adapters has not been weakened. **No private credentials or Supabase secrets are copied**. Authorized private actions may remain unavailable until the owner-approved deployment secret and origin settings are explicitly configured and tested. Never claim authenticated editing/dispatch works from the public 200 status.
- No additional LLM, TaskService, brain, database, paid service, cron or polling. Agent Director continues to use the existing server roles/learning/memory, not an additional custom datastore.

**Release:** this folder is the dedicated Git root for Vercel project holistic-house-agents-director. Use a reviewed protected PR and SHA-pinned deployment; smoke actual root/agents/chats/projects/tasks/automations/skills and owner-auth fail-closed behaviour; then promote the exact tested deployment and lock automatic production assignment.
