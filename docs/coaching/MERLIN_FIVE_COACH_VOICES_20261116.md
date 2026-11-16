# Five living AI coaches — Merlin and voice identities (16 Nov 2026)

Five visible identities in order: Mira, Max, Sofia, Alex, Merlin. Historical Lea, Noah, Iris and Ray stay registered but hidden. Fifth Merlin has an original distinct first-party photograph; no duplicated face or nonexistent video loop. His fictional-coach style is thoughtful, philosophical and grounded in reflective metaphors, never a wizard claiming supernatural powers.

## Distinct voice contracts

The previous Google Chirp mapper sent *all* women to Aoede and *all* men to Charon. This patch assigns a different official Chirp 3 HD voice name to **each** of nine registered personas in each of RU/EN/ES:
Mira Gacrux (female); Max Fenrir (male); Sofia Kore (female); Alex Charon (male); Merlin Iapetus (male); hidden Lea Aoede, Noah Achird, Iris Leda, Ray Puck. Documented Google voice names exist for ru-RU/en-US/es-ES, but actual naturalness/age remain subject to playback QA. This remains disabled unless the existing owner-approved cost and privacy GCP gates are enabled.

Fish free fallback for five visible personas has **five separate reference IDs**, none generic or cloned from celebrities: Mira Sarah, Max Jordan, Sofia Laura, Alex Adrian, Merlin Ethan (official, interim). English availability is not evidence of native Russian pronunciation. Do not pretend the older sound of Merlin is achieved by Ethan.

The owner rejected Russian Mira “Ариша” as too childlike. New optional adult native Russian candidates, still **disabled until written commercial usage rights/owner-approved provider terms are verified**:
- Mira “Саша”, mid-aged calm female: reference `aeca68fc0f82475eb9d9c0d5b106d8bc`; `HH_MY_COACH_MIRA_RU_VOICE_RIGHTS_APPROVED=true`.
- Merlin “Дедушка”, warm deep older male: reference `1fabe6bebedb43749ca9d4b264f42ba7`; `HH_MY_COACH_MERLIN_RU_VOICE_RIGHTS_APPROVED=true`.

Both the original first-Play greeting and subsequent protected TTS resolve by `personaId + locale`; a different voice never silently substitutes for one of the five. Keep Fish's original free-tier expiry (Dec 1, 2026), training consent and existing authenticated rate limits unchanged. No new provider, cost, scheduled worker or deployment has been approved.

## Release acceptance
1. Exact-head unit/CI: 9 registered; 5 public; 2F/3M, 4 historical hidden; all five distinct EN/RU Fish IDs with and without approvals; all nine distinct Google voice IDs per locale; portrait WebP exists and no broken Merlin MP4 request.
2. Phone E2E: RU and EN Merlin introduction and 5 spoken turns, voice reply, transcript/replay identity, no synthetic “voice played” when upstream returned an error.
3. Rights checked before activating community voice flags. Test mature Russian samples personally: no childlike voice, no strong accent, no impersonation.
4. Preserve concurrent #4747 manual RU/EN switching and remove its **rejected** Arisha option in reviewed merge resolution, if it lands. Preserve #4731 Director session authority.
5. Existing protected CI and source owner lease required. Ordinary Production only through existing hourly Vercel publisher, and a served alias plus real feature QA is needed before claiming LIVE.
