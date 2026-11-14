# My Coach — spoken-answer parity (14 November 2026)

The visible coach previously answered a question or acknowledged a correction, while its audible loop/readback extracted only the final question. The user heard a rigid questionnaire despite a useful full answer.

This patch preserves the actual reply in local/device speech and existing consented Fish speech. Google Chirp retains the approved 500-character and 1600-byte cap: it receives an opening excerpt that begins with the validated answer, never just a trailing question. The full unmodified response remains in the visible transcript, and each RU/EN/ES consent disclosure explains the excerpt.

The pure helper contains no provider/network/storage access. All current login, safety/boundary, cost, ZDR, cloud voice opt-in, free quota, cancel and replay gates remain unchanged. No new model or provider, API, database, cron or billing charge. Existing protected CI, mobile browser/physical iPhone and real audio acceptance still required.

Dependencies: merged #4617 (mic/replay), #4621 (Groq natural dialogue); open #4563 later must preserve the current My Coach code during its semantic UI reconciliation.
