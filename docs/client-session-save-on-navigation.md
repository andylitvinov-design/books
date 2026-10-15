# Client session → Save on internal navigation, Holistic House

Behavior: On the private consultation, same-tab first-party site and Google-Cabinet links (including the global site menu) open a compact consent dialog. Primary action is Save with Google, alternative action is Continue without saving, and closing stays on the consultation.

The confirmation creates an item-scoped 15-minute HttpOnly browser-proven save intent; the existing Google OAuth flow is launched if needed. After the user finishes Google sign-in and existing Account consent, SaveContinuation automatically commits ONLY the confirmed individual session and returns to the chosen first-party section. If target recovery expires, the authenticated saved session reader opens.

Already signed-in visitors still confirm saving but skip needless Google reauthentication. Clicking My tests, My reports, My courses or My Cabinet, or a same-tab global site link, triggers the same flow. The explicit Save this consultation card also opens the same dialog without an intended navigation target.

One same-tab sessionStorage value keyed to the Save Intent UUID stores a sanitized public first-party path and 15-minute timestamp. No patient names, source IDs, private invitation selectors, secrets, clinical contents or search parameters enter this storage or the Google redirect. Accepted destinations are the root and EN/RU/ES public website or Account sections; private client, admin, API and prescription routes are not stored.

Do not block in-page hash navigation, PDF download, video/audio playback, new-tab/modifier clicks, or external origins. Browser tab closure and OS shutdown cannot reliably show a custom dialog. If the user chooses Continue without saving or cancels Google, nothing is saved.

DB invariants stay unchanged: the guest invitation authorizes only one session; the Save Intent commits only to the authenticated Account after confirmation and consent; no automatic full legacy client binding; cross-account conflict, publication revocation, source revision changes, and expired grants must fail closed. Saved sessions are listed under My Reports and are owner-account scoped.

Release: The page remains behind HH_CLIENT_DELIVERY_ENABLED, and real private media use requires server-only HH_APP_SUPABASE_SECRET_KEY. Do not silently enable before actual iPhone/Android mic, PDF, A/B session isolation and revoke tests.

Acceptance: invited Session A → My Tests → modal Save → Google → Session A appears in My Reports and target My Tests opens; already signed-in Account works; decline continues without saving; in-page links do not prompt; malicious return target rejected; repeated save does not transfer ownership.