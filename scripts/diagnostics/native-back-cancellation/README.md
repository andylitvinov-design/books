# Synthetic native Back cancellation diagnostic

Run separately from the release audit on the existing Ubuntu24.04 Playwright1.63.0/WebKit2359 installation:

    PLAYWRIGHT_MODULE=file:///tmp/reaudit-tools/node_modules/@playwright/test/index.mjs node /path/to/probe.mjs

No external requests, app data, credentials, deployment changes or browser installation. Node starts a loopback-only ephemeral HTTP server. Four cases compare pending vs released scripts for protocol Back and DOM history.back. Each pending case proves both the server request and fixture flag before navigating. Loaded controls prove script execution before Back. Request errors are classified into a cancellation boolean, never persisted as arbitrary text. Fixture error has a fixed marker. Events are capped at100 percase and written immediately to JSONL so a later hang does not erase preceding evidence. Each case has a30s outer deadline including protocol evaluate/setup; normal navigation/waits and launch have5s bounds, combined server/browser cleanup5s. Original caught error is retained over browser cleanup failure.

Outputs go to /tmp/native-back-cancellation (override PROBE_OUTPUT). Each summary outcome is cancellation-reproduced, not-reproduced, control-passed/control-failed, unexpected-error or navigation-failed. A not-reproduced outcome is not a pass of the production issue. Controls and unrelated browser errors fail the diagnostic. This fixture intentionally allows its synthetic script rejection to surface; it suppresses no errors.

Expected discriminating evidence:
- If both pending methods cancel the delayed script and raise the synthetic rejection, native WebKit navigation is sufficient without any Next/history-boundary code.
- If only protocol Back does, investigate automation-path differences before changing application runtime.
- If neither does, this fixture has not reproduced the production failure; do not infer that the application is fixed.
- Loaded controls must return Home without cancellation or script rejection.

The unchanged release audit remains authoritative and currently failed on live rapid history. This diagnostic neither alters that assertion nor clears that failure. A subsequent Next-specific isolated scenario may still be required to establish a safe application correction.

Local preparation only: node syntax check and8 focused classifier/fixture tests passed. No WebKit execution has been performed locally.

Proposed repository location: scripts/diagnostics/native-back-cancellation/{probe.mjs,probe.test.mjs,README.md}. Dedicated workflow proposal is under .github/workflows/native-back-cancellation-diagnostic.yml. It runs only on push to the existing assessment-interpretation working branch when those diagnostic paths change; no PR/default-branch/scheduled/dispatch trigger. It uses contents:read, no app build/database/secrets and a10min job cap; probe step3min. Root is sole publisher.
