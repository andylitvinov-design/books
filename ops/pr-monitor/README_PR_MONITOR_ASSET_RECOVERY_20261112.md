# PR Monitor recovered static assets · 2026-11-12

The canonical PR Monitor's complete direct HTML (merged PR #4408) references 54 existing JS/CSS assets. A read-only LIVE sweep showed 51/54 HTTP 200. Three failed 404 only on the public canonical domain:

| Asset | Verified intact on immutable Vercel deployment | UTF-8 size |
|---|---|---|
| `pr-stage-dashboard.css` | `dpl_3aiyhwb7JQfV5pshLZ3Er89U3YuM` | 14954 |
| `pr-stage-dashboard.js` | same | 31973 |
| `pr-monitor-fluid.css` | same | 6070 |

The three original first-party client resources have been copied byte-for-byte into `ops/pr-monitor/` in GitHub. A source test asserts substantial contents, script syntax and references. No existing assets were overwritten.

**Release**: protected merge of this source PR, then stage Vercel project routes only for these three paths to `https://raw.githubusercontent.com/andylitvinov-design/books/<merged-commit-sha>/ops/pr-monitor/<filename>`. Check each staged HTTP 200 and correct MIME, then promote the exact routes version and repeat a complete 54-resource LIVE sweep. Do not redeploy the incomplete standalone archive or change owner authentication. Record rollback to previous route version.

The root release-publisher integration remains in incident #4398 (merged source preflight #4404), separately from this restored LIVE read-only user interface.
