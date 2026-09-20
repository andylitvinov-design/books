# Documents Ready language and layout

The supplied specification defines the approved design. Implement on a separate Preview branch after approved PR24 merge.

Visual thesis: retain the warm neutral surface, calm typography and thin separators; emphasize client identity and one Copy link action per document.
Content: client/date, shared EN/RU segmented control, two document sections with metadata/actions, subtle edit links and collapsed access settings.
Interactions: instant selected-state/action URL updates without navigation; temporary Copied feedback; restrained focus/hover transitions, respecting reduced motion.

- Server loads/authenticates the pair and supplies only display metadata and bound lifecycle actions.
- One client result component owns locale, defaulting to the consultation preference or EN. Locale never participates in document/action component identity.
- Each document retains a cached credential; locale switches only format URLs. Concurrent copy requests share one issuance request. All admin URLs include locale explicitly.
- Reactivation is explicit inside access settings and does not revive revoked credentials. Ordinary language changes never call lifecycle endpoints.
- Verify URL combinations, credential stability/concurrent copying, pluralization and lifecycle guards; run all tests/lint/build and hosted desktop/mobile bilingual PDF/access smoke.
- Stop at Preview review; do not merge the redesign or deploy it to Production.

## Accepted localization follow-up

The shared selector also controls all result-screen UI copy: navigation/title, document headings/metadata, actions, edit/access controls and feedback. RU uses Russian plural forms and number/date formatting. Record data is not translated. Locale switching preserves mounted document identities and their credential cache. Browser title and page language follow selection.
