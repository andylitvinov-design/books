# My Coach — Personality Graph v1
## Scope and purpose
Eight public fictional AI personalities: Mira, Max, Sofia, Alex, Merlin, Harry, Samir (genie), Caesar. The other four registry IDs remain untouched. A personality is a versioned editorial model, not a human psyche, psychometric diagnosis, client profile, transcript or learned personal memory.

## Architecture
- Stable identity: purpose, competence, legend, relationships, limitations.
- Value system: ranked values, worldview, beliefs, principles, preferred attitudes and revision conditions.
- Dispositions: 12 weighted dimensions (1–5); shared context multipliers (0–3).
- Experience: four immutable fictional events per persona, related story legend and attitude/success algorithms. New examples are explicitly fictional or hypothetical, not factual experiences.
- Response patterns: six proposed editorial reactions per persona (failure, uncertainty, conflict, achievement, pressure, criticism). Distress and no-advice override reactions.
- Expression: voice, coaching/therapy style, dialogue profile, localized signatures and cues. Existing audio and signature engines remain authoritative; the graph archives their current data, not a replacement voice provider.

## Storage (existing Supabase, app_private)
| Relation | Purpose |
|---|---|
| hh_personality_releases | Release status and source manifest (source blob hashes, story/opinion rules) |
| hh_personality_characters | Stable persona IDs scoped to release |
| hh_personality_nodes | Typed structured records, ordinal and optional weight, source metadata |
| hh_personality_edges | Typed, same-release/same-persona relationships; composite foreign keys |
| hh_personality_context_weights | Context-to-dimension coefficients |
RLS enabled; SELECT only for existing hh_app_backend and only published releases; no public/client access or application writes. No client content or health data in the graph. Only editorial/admin migrations may publish new versions. The reviewed code remains the safe static fallback if the DB is unavailable. v1 release ID is pinned by the application; publishing v2 requires an explicit coordinated code/data version update, not silent mutation.

## Composition
1. Current user topic and request remain authoritative; narrow keyword hints are advisory, not a topic whitelist or psychological assessment.
2. Score dimensions = editorial weight × contextual multiplier. Select top three.
3. Activate related values via dimension→value edges; select linked principles via principle→value edges, including explicitly linked reaction principles. Worldview→value and algorithm→principle/value links document character consistency.
4. For a relevant event, choose an existing reaction pattern; a personal example request may choose a compatible fictional story anchor via event→domain/principle/algorithm links.
5. Send a bounded editorial instruction to the existing model, not a new inference call. Existing persona identity, voice IDs, consent, safety, course Director, evidence, and timebox win. Facts are not personality-dependent.
6. Preserve the same static personality profile if the DB, role, schema or release validation fails. No automatic retry. Published data cached in memory for five minutes per configuration and persona, no client data cached.

## Seeded and verified
8 characters; 816 nodes (102 each); 1,732 edges; 84 context weights (7 × 12); 96 dimension nodes, 40 values, 40 principles, 32 fictional events, 48 reactions, 16 algorithms, 16 voice nodes, 160 signatures and 80 cues. Source: nine existing code modules, with blob hashes recorded. New reaction mappings and semantic edges are editorial proposals, not measured scores or individually approved by the owner. The two SQL files together reproduce the release; Supabase management recorded three additive migrations (base, semantic links, context coverage). Data has been verified by management SQL and isolated execution of the committed graph composer: 56/56 context combinations and 48/48 reaction combinations activate values and principles. Role permissions verified at catalog level; actual application session and deployed provider acceptance still required. The existing static code must not be deleted until runtime parity is proven.
