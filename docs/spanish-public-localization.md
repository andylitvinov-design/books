# Spanish public-site localization

## Scope

Spanish public navigation uses real `/es` routes: Home, About, Services, Books catalog, Homeopathy landing, remedy directory, all source-backed remedy detail pages, and a localized public client-entry form. The five main destinations stay in Spanish. Original book editions and source references deliberately open their original language with an explicit label.

The existing EN/RU private-cabinet locale, authorization, stored client records, administrative editor and source files are not migrated. The Spanish client-entry UI passes through to the existing English private route. Private documents are not machine-translated or exposed.

## Content

Home, services, navigation, form labels and book catalog descriptions are translated editorially. The existing seven-section Spanish About biography is retained. The full public remedy corpus is translated offline from the current English source files using a pinned OPUS model, with technical source identifiers, Latin names and numerical values protected. This is an automatic reference translation, NOT a clinical review or new medical advice. The UI labels it and links to the original sources. Spot checks and mechanical completeness checks do not constitute expert review of every sentence.

`data/spanish-remedies.json` records each original file's SHA-256. `data/remedies-es.js` rejects missing, stale, extra or malformed translations, and allows only explicit text fields. It never overrides media links, publication controls or source identity. An English source update requires a corresponding Spanish translation update before the build can pass. The original corpus remains untouched.

The original audio is retained: the ES About introduction is clearly labelled English audio with Spanish text; testimonial recordings and archival books retain their source languages. No new video render, voice, upload, media publication or credential is part of this change.

## Verification and rollout

Run translation/completeness unit tests, existing About/video/native regressions, ESLint and TypeScript, then the production build. The browser workflow exercises ES/EN/RU navigation, remembered language, search, actual remedy pages, poster-first playback, form labels and mobile/desktop layout in Chromium and WebKit. It then checks every Spanish remedy HTTP route in bounded batches and the sitemap. Post-merge production runs are read-only; no real client links or submissions are used.

Rollback is a revert of the localization PR; no database migration is required. Keep the archived approved media and original EN/RU sources.
