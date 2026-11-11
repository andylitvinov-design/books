import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePrTrigger, matchesTrigger } from '../lib/ci/specialist-aggregate.mjs';

const workflow = (name) => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');

test('My Progress uses a valid broad dynamic Next.js pathname and production push only', () => {
  const s = workflow('hh-my-progress-release.yml');
  assert.ok(s.includes("      - 'app/**/app/my-progress/**'"));
  assert.ok(!s.includes("      - 'app/**/app/**/page.jsx'"));
  assert.doesNotMatch(s, /\[\[\.\.\.path\]\]/);
  assert.doesNotMatch(s, /codex\/my-progress-unified-history-20261028/);
  assert.match(s, /push:\s*\n\s*branches: \['codex\/public-book-library'\]/);
});

test('Practitioner editor validates dynamic routes without spurious push trigger', () => {
  const s = workflow('practice-visual-services.yml');
  assert.ok(s.includes("      - 'app/api/app/practice/**'"));
  assert.ok(s.includes("      - 'app/api/app/services/**'"));
  assert.ok(!s.includes("      - 'app/api/app/**/route.js'"));
  assert.ok(!s.includes("      - 'components/app/messages-simple-inbox.module.css'"));
  assert.match(s, /'app\/\*\*\/practice\/page\.jsx'/);
  assert.doesNotMatch(s, /app\/api\/app\/\[\.\.\.path\]/);
  assert.doesNotMatch(s.split(/^permissions:/m)[0], /^  push:/m);
  assert.match(s, /^  pull_request:/m);
});

test('every CI YAML is structurally checked; touched workflows keep strict ShellCheck', () => {
  const s = workflow('hh-actionlint.yml');
  assert.match(s, /find \.github\/workflows -type f/);
  assert.match(s, /actionlint -shellcheck= -color/);
  assert.match(s, /actionlint -color "\$\{files\[@\]\}"/);
  assert.match(s, /'\.github\/workflows\/\*\*'/);
  assert.doesNotMatch(s, /continue-on-error:\s*true/);
});


test('actionlint does not rerun Core Git fixtures on the constrained slim runner', () => {
  const lint = workflow('hh-actionlint.yml');
  const fast = lint.split('      - name: Fast zero-install CI policy contracts')[1]
    ?.split('      - name: Install checksum-verified actionlint')[0];
  assert.ok(fast, 'fast deterministic ESLint contract must remain');
  assert.match(fast, /node --test tests\/ci-deterministic-eslint-repair\.test\.mjs/);
  assert.doesNotMatch(fast, /node --test tests\/pr-fast-lane\.test\.mjs/,
    'synthetic Git topology fixtures must run once under mandatory Core, not twice on ubuntu-slim');
  assert.match(workflow('hh-pr-core-release.yml'), /node --test tests\/pr-fast-lane\.test\.mjs/,
    'Core must retain the complete fail-closed topology regression');
  assert.match(lint, /actionlint -shellcheck= -color/);
  assert.match(lint, /actionlint -color "\$\{files\[@\]\}"/);
  assert.doesNotMatch(lint, /continue-on-error:\s*true/);
});

test('deleted workflow-only changes cannot hide an unverified YAML removal', () => {
  const s = workflow('hh-actionlint.yml');
  assert.match(s, /git diff --no-renames --name-status -z/);
  assert.match(s, /saw_deletion=true/);
  assert.ok(s.includes('[[ -n "$filename" && "$status" == D ]] || deleted_only=false'));
  assert.match(s, /\[\[ "\$deleted_only" == true \]\]/);
  assert.match(s, /Workflow filter triggered but no changed YAML is available; refusing unverified changes/);
  assert.match(workflow('hh-pr-core-release.yml'), /BASE_SHA:.*github.event.pull_request.base.sha/);
});

test('Portrait PR runs focused current contracts while the old synthetic DB/browser matrix is manual-only',()=>{
  const s=workflow('hh-portrait-mobile-browser.yml');
  const dollar=String.fromCharCode(36);
  assert.match(s,/^  pull_request:\s*\n    types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/m);
  assert.ok(s.includes('group: hh-portrait-mobile-'+dollar+"{{ github.event_name == 'pull_request' && github.run_attempt == 1 && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"));
  assert.ok(s.includes('cancel-in-progress: '+dollar+"{{ github.event_name == 'pull_request' && github.run_attempt == 1 && github.event.action == 'synchronize' }}"));
  assert.ok(s.includes("  synthetic-mobile:\n    if: "+dollar+"{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}"));
  assert.ok(s.includes("fromJSON(github.event_name == 'workflow_dispatch'"),
    'PR routing must not allocate two private DB/browser runners');
  assert.ok(s.includes("'[\"chromium\",\"webkit\"]'"), 'manual full matrix remains available');
  assert.ok(s.includes("'[\"chromium\"]'"), 'normal PR executes one Chromium core check');
  for (const step of [
    'Isolated Playwright browser (manual deep QA only)',
    'Initialize isolated synthetic database',
    'Five profile navigation with four scored sectors, goal check-in, mobile EN/RU',
  ]) {
    assert.ok(s.includes('- name: '+step+"\n        if: github.event_name == 'workflow_dispatch'"),
      'obsolete portrait E2E must not block an ordinary PR: '+step);
  }
  assert.ok(s.includes('node --test tests/portrait-report-actions.test.mjs tests/portrait-sector-take-test.test.mjs'),
    'current profile source contracts still run');
  assert.match(s,/postgres:17-alpine/);
  assert.match(s,/HH_APP_TEST_RUNTIME: isolated/);
  assert.match(s,/verify-portrait-mobile\.mjs/);
  assert.match(s,/^permissions:\s*\n  contents: read/m);
  assert.ok(s.includes('for ((i=1; i<=110; i++)); do'));
  assert.doesNotMatch(s,/continue-on-error:\s*true|actions:\s*write/);
});

test('YouTube and Free Review: obsolete PR commits cancel safely; Draft saves browser runner minutes', () => {
  const suffix = "${{ github.event_name == 'pull_request' && github.run_attempt == 1 && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}";
  const cancel = "${{ github.event_name == 'pull_request' && github.run_attempt == 1 && github.event.action == 'synchronize' }}";
  const ready = "    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  for (const [file, prefix, job] of [
    ['youtube-phone-uploader.yml', 'hh-youtube-phone', 'test'],
    ['hh-free-review-live-mobile.yml', 'hh-free-review-mobile', 'read-only-mobile'],
  ]) {
    const source = workflow(file);
    assert.ok(source.includes('  pull_request:\n    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]\n'), file + ' must test Ready transitions');
    assert.ok(source.includes('  ' + job + ':\n' + ready + '\n'), file + ' must run full QA for Ready');
    assert.ok(source.includes('group: ' + prefix + '-' + suffix), file + ' must group by PR number and independent manual run');
    assert.ok(source.includes('cancel-in-progress: ' + cancel), file + ' must not cancel production or manual runs');
    assert.match(source, /^  workflow_dispatch:/m, file + ' must preserve manual verification');
    assert.match(source, /playwright install --with-deps chromium webkit/, file + ' must retain actual browser QA');
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  }
  const youtube = workflow('youtube-phone-uploader.yml');
  const free = workflow('hh-free-review-live-mobile.yml');
  assert.match(youtube, /npm run build/, 'YouTube local real video UI build must remain');
  assert.match(youtube, /verify-youtube-phone-mobile\.mjs/, 'YouTube mobile acceptance must remain');
  assert.match(free, /^  push:/m, 'post-merge production verification cannot be cancelled');
  assert.match(free, /Verify PR's local production build, not old live alias/, 'PR acceptance must test exact source');
  assert.match(free, /tests\/private-material-handoff\.test\.mjs/, 'privacy/consent checks must remain');
});

test('isolated YouTube mobile QA shares a true same-origin loopback host with browser navigation', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const guard = read('lib/youtube/mobile-qa-guard.mjs');
  const qa = read('app/qa/youtube-phone/page.js');
  const verifier = read('scripts/verify-youtube-phone-mobile.mjs');
  assert.match(verifier, /const origin = 'http:\/\/localhost:3157'/);
  assert.match(verifier, /'start','-p','3157','-H','localhost'/);
  assert.match(guard, /host==='localhost:3157'/);
  assert.match(guard, /host==='127\.0\.0\.1:3157'/);
  for(const field of ["CI==='true'","HH_APP_TEST_RUNTIME==='isolated'","!env.VERCEL"])
    assert.ok(guard.includes(field), 'never open QA in production: ' + field);
  assert.match(qa, /phoneYoutubeQaAllowed/, 'QA owner gate must remain isolated');
  assert.match(verifier, /assert\.deepEqual\(errors,\[\]/, 'WebKit page JS errors must still fail');
  assert.match(verifier, /webkit/, 'real Chromium/WebKit acceptance retained');
  assert.match(verifier, /origin\+'\/admin\/youtube-upload'/, 'unauthenticated admin still explicitly denied');
});
test('express review accepts one real mobile tap only after radio and React card agree', () => {
  const source = readFileSync(new URL('../scripts/verify-free-review-live-mobile.mjs', import.meta.url), 'utf8');
  assert.match(source, /timeout: 8000/);
  assert.ok(source.includes('scrollIntoView({block:"center"'), 'real user-like scroll must make full card visible');
  assert.ok(source.includes('document.elementFromPoint(x,y)'), 'fixed toolbar must not intercept tap');
  assert.ok(source.includes('assert.ok(targetHit.hittable'), 'do not silently click blocked card');
  assert.ok(source.includes('await card.tap()'), 'one native touch tap on the full card, no retry');
  assert.match(source, /radio instanceof HTMLInputElement && radio.checked/);
  assert.match(source, /getAttribute\("data-selected"\) === "true"/);
  assert.match(source, /Single-tap focus was not committed/);
  assert.match(source, /input\[type="checkbox"\]/);
  assert.match(source, /TOTAL " \+ results.length/, 'all EN/RU/ES browser cases must still execute');
});

test('Public Services exact-head routing preserves source contracts and real risk-based browser acceptance', () => {
  const s = workflow('hh-public-services-production.yml');
  assert.ok(!s.includes("      - '.github/workflows/hh-public-services-production.yml'"),
    'CI-only YAML is checked by required Core/actionlint, not 20-minute E2E');
  assert.match(s, /node scripts\/ci-public-services-plan\.mjs/);
  assert.match(s, /node --test tests\/ci-public-services-plan\.test\.mjs/);
  assert.match(s, /fetch-depth: 2/);
  assert.match(s, /steps\.scope\.outputs\.browser == 'true'/);
  assert.match(s, /steps\.scope\.outputs\.build == 'true'/);
  assert.match(s, /HH_PUBLIC_CASES/);
  assert.match(s, /wait "\$lane_a_pid"/);
  assert.match(s, /wait "\$lane_b_pid"/);
  assert.ok(!s.includes('run_case "verify-contact-channel-chooser-browser.mjs"'),
    'obsolete contact-channel browser duplicate must not run');
  for (const required of [
    './node_modules/.bin/next build', 'for (const [name, engine] of engines)',
    'run_case "verify-service-cart-browser.mjs"',
    'run_case "verify-talisman-google-checkout-browser.mjs"',
    "'app/api/payments/**'"
  ]) assert.ok(s.includes(required),'lost current acceptance: '+required);
  // Prebuilt version-matched browser images replace per-job apt installs,
  // not genuine Chromium/WebKit launch and risk-scoped acceptance.
  assert.match(s, /image: mcr\.microsoft\.com\/playwright:v1\.63\.0-noble/);
  assert.match(s, /playwright@1\.63\.0/);
  assert.match(s, /await engine\.launch\(\{ headless: true, timeout: 15000 \}\)/);
  assert.doesNotMatch(s, /playwright install --with-deps/);
  assert.doesNotMatch(s,/continue-on-error:\s*true/);
});


test('Core classification and all applicable Core checks share the first scheduled runner', () => {
  const s=workflow('hh-pr-core-release.yml');
  const core=s.split('\n  scope:')[1]?.split('\n  hh-specialist:')[0];
  assert.ok(core, 'Unified Core job must exist');
  assert.match(core, /name: core-lint-types-build/);
  assert.match(core, /runs-on: ubuntu-24\.04/);
  assert.doesNotMatch(core, /^\s+needs:/m, 'Core must not wait for a separate classification job');
  assert.match(core, /fetch-depth: 2/, 'do not fetch all repository history for every Core PR');
  assert.doesNotMatch(core, /fetch-depth: 0/, 'full-history Core scope would amplify CI traffic');
  assert.match(core, /Verify bounded shallow scope ancestry before PR routing/);
  assert.match(core, /tested_base="\$\(git rev-parse HEAD\^1\)"/);
  assert.match(core, /tested_head="\$\(git rev-parse HEAD\^2\)"/);
  assert.match(core, /\[\[ "\$tested_head" == "\$PR_HEAD_SHA" \]\]/);
  assert.match(core, /git fetch --quiet --no-tags --deepen="\$extra" origin "\$tested_base"/);
  assert.match(core, /git merge-base --is-ancestor "\$EVENT_BASE_SHA" "\$tested_base" 2>\/dev\/null/);
  assert.ok(core.includes('gh api "repos/$GITHUB_REPOSITORY/compare/$EVENT_BASE_SHA...$tested_base"'),
    'fallback must prove the old base using authenticated GitHub Compare');
  assert.ok(core.includes('HH_EVENT_BASE_VERIFIED=$EVENT_BASE_SHA'),
    'verified event base is reused without a second shallow ancestry failure');
  assert.match(core, /Verify live PR readiness before costly CI/);
  assert.match(core, /Classify strictly documentation-only PRs/);
  assert.match(core, /Route exact image and proven public JSX changes without Next build/);
  assert.match(core, /npm ci --no-audit --no-fund/);
  assert.match(core, /run: npm run build/);
  assert.match(core, /steps\.diff\.outputs\.ci_only/);
  assert.match(core, /steps\.fast\.outputs\.route != 'ASSETS'/);
  assert.doesNotMatch(s, /^  code:/m, 'the delayed dependent Core job must be removed');
  assert.doesNotMatch(core, /continue-on-error:\s*true|--force/);
});

test('IA v2 uses an exact mobile-dock batch for Messenger isolation and restores only trusted production caches', () => {
  const s = workflow('ia-v2.yml');
  for (const file of [
    'app/[locale]/app/[[...path]]/workspace.css',
    'app/[locale]/app/messages/messages-page.css',
    'components/app/messages-bottom-navigation.jsx',
    'lib/mobile-visual-bottom.mjs',
    'tests/mobile-visual-dock.test.mjs',
  ]) assert.ok(s.includes(file), 'mobile dock exact scope missing ' + file);
  assert.match(s, /const mobileDockExpected=new Map\(\[/);
  assert.match(s, /mobileDockOnly=fields\.at\(-1\)===''/);
  assert.match(s, /\|\|operatorOnly\|\|mobileDockOnly/);
  for (const line of [
    '["app/[locale]/app/[[...path]]/workspace.css","M"]',
    '["app/[locale]/app/messages/messages-page.css","M"]',
    '["components/app/messages-bottom-navigation.jsx","M"]',
    '["lib/mobile-visual-bottom.mjs","M"]',
  ]) assert.ok(s.includes(line), 'repeatable mobile dock change must use exact modified-file manifest: ' + line);
  assert.ok(!s.includes('["tests/mobile-visual-dock.test.mjs","M"]'),
    'the fast lane must never allow the PR to rewrite its own geometry test');
  assert.ok(!s.includes('["tests/messages-iphone-keyboard-layout.test.mjs","M"]'),
    'the fast lane must never allow the PR to rewrite its iPhone keyboard test');
  assert.match(s, /run: node --test tests\/mobile-visual-dock\.test\.mjs tests\/messages-iphone-keyboard-layout\.test\.mjs/);
  const detect = s.indexOf('Detect exact Mobile Dock-only batch before costly IA work');
  const install = s.indexOf('      - run: npm ci --no-audit --no-fund');
  assert.ok(detect >= 0 && install > detect, 'dock scope must be proven before npm install or heavy IA checks');
  assert.match(s, /id: dock-scope/);
  assert.match(s, /secondParent===expectedHead/);
  assert.match(s, /merge-base','--is-ancestor',expectedBase,firstParent/);
  assert.match(s, /Mobile Dock geometry and iPhone keyboard contracts/);
  assert.ok(s.includes("steps.dock-scope.outputs.dock_only == 'true'"));
  for (const step of [
    'IA security, ownership and navigation contracts',
    'Application, CRM and billing functional contracts',
    'Guest test access and privacy contracts',
    'Select exact-merge Messenger fast lane (fail closed)',
    'Source-content validators',
    'Restore trusted production-owned scenario media cache',
    'Restore trusted production Next compiler cache',
    'Isolated browser tools and Redis CLI',
    'Initialize disposable owner database with real app migrations',
    'Synthetic encrypted-store and owner/client browser acceptance',
  ]) {
    const start = s.indexOf('- name: ' + step);
    assert.ok(start >= 0, 'expected full IA step ' + step);
    const condition = s.slice(start, start + 300).split('\n').find(line => line.trim().startsWith('if:')) || '';
    assert.ok(condition.includes("steps.dock-scope.outputs.dock_only != 'true'"), step + ' must remain mandatory outside the exact dock lane');
  }
  assert.ok(!s.includes('/^\\.github\\/workflows\\/ia-v2\\.yml$/'),
    'editing the IA workflow itself must retain the full specialist path');
  assert.match(s, /uses: actions\/cache\/restore@v4/);
  assert.ok(s.includes("key: hh-core-media-v1-${{ runner.os }}-${{ hashFiles('scripts/generate-scenario-melodies.mjs', 'scripts/generate-mandala-melodies.mjs', 'lib/mandala/scenario-audio-catalog.mjs', 'package-lock.json') }}"));
  assert.ok(s.includes("key: hh-core-next-v1-${{ runner.os }}-${{ hashFiles('package-lock.json', 'next.config.ts', 'tsconfig.json') }}"));
  assert.match(s, /path: \.next\/cache/);
  assert.doesNotMatch(s, /actions\/cache\/save@v4/,
    'PR workflow restores only; trusted production remains the sole cache writer');
});

test('Core recovery never reruns a superseded HEAD or generic failure',()=>{
  const source=workflow('hh-native-auto-merge.yml');
  const job=source.split('  recover-interrupted-core:')[1].split('  prune-head:')[0];
  assert.match(job,/contains\(fromJSON\('\["timed_out","startup_failure"\]'\), github\.event\.workflow_run\.conclusion\)/);
  assert.match(job,/new Set\(\["timed_out","startup_failure"\]\)/);
  assert.ok(job.includes('live.head.sha !== reference.head.sha'), 'exact source HEAD association must remain');
  assert.ok(job.includes('fresh.head_sha !== event.head_sha'), 'no stale workflow evidence may be retried');
  assert.ok(job.includes('(reference.base?.sha && reference.base?.sha !== live.base.sha)'), 'live protected base must remain unchanged');
  assert.ok(job.includes('event.head_repository?.full_name !== fullRepo'), 'cross-repository workflows cannot receive trusted retry');
  assert.match(job,/event\.head_sha !== live\.head\.sha/,'immutable Core run must match live PR HEAD or exact synthetic merge');
  assert.match(job,/parents\[1\]\?\.sha !== live\.head\.sha/,'synthetic merge must have this PR source as second parent');
  assert.match(job,/parents\[0\]\?\.sha !== live\.base\.sha/,'synthetic merge must have current protected base as first parent');
  // A cancelled *job* may be evidence of a genuinely interrupted run; a
  // cancelled or failed *Core workflow* must not trigger an automatic rerun.
  // Inspect only event-level predicates, never broad text across comments.
  const eventAllowed=[...job.matchAll(/contains\(fromJSON\('([^']+)'\),\s*github\.event\.workflow_run\.conclusion\)/g)];
  assert.ok(eventAllowed.length>=1,'interrupted Core trigger must have an event-level allowlist');
  for(const match of eventAllowed){
    assert.deepEqual(JSON.parse(match[1]),['timed_out','startup_failure']);
  }
  assert.doesNotMatch(job, /event\.conclusion\s*={2,3}\s*['"](?:cancelled|failure)['"]/);
  assert.match(job,/\["cancelled","skipped","timed_out"\]\.includes\(job\.conclusion\)/);
});

test('IA and Mandala browsers allocate expensive runners only after cheap exact-HEAD preflight', () => {
  const ia = workflow('ia-v2.yml');
  assert.match(ia, /^  browser_preflight:\n    if: .*draft == false/m);
  assert.match(ia, /^  verify:\n    if: .*draft == false.*\n    needs: \[browser_preflight\]/m);
  assert.match(ia, /node --test tests\/ia-v2-loopback-proxy\.test\.mjs tests\/ia-public-navigation-diagnostics\.test\.mjs/);
  const mandala = workflow('holistic-support-mandala.yml');
  const preflightGuard = mandala.match(/^  webkit_preflight:\n    if: (.+)$/m)?.[1];
  const macosGuard = mandala.match(/^  voice-webkit-macos:\n    if: (.+)$/m)?.[1];
  assert.equal(preflightGuard, "${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}",
    'preflight must execute on every Ready Mandala PR; a new skipped job cannot be waived by the old BASE specialist contract');
  assert.ok(macosGuard?.includes("startsWith(github.head_ref, 'feat/video-')"),
    'macOS WebKit must retain original video release guard');
  assert.ok(macosGuard?.includes("startsWith(github.head_ref, 'feat/voice-timed-storyboard-')"),
    'the consented voice storyboard must run existing macOS WebKit MP4/AAC release acceptance');
  assert.match(mandala, /^  voice-webkit-macos:\n    if: .+\n    needs: \[webkit_preflight\]\n    runs-on: macos-15/m);
  for (const source of [ia, mandala]) {
    assert.match(source, /node scripts\/ci-pr-readiness\.mjs/);
    assert.match(source, /git rev-parse HEAD\^2/);
    assert.match(source, /git rev-parse HEAD\^1/);
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  }
});

test('Core runs CI policy regressions only when relevant CI or manifest files change',()=>{
  const source=workflow('hh-pr-core-release.yml');
  assert.match(source,/ci_touched=false/);
  assert.match(source,/preflight_touched=false/);
  assert.match(source,/repair_touched=false/);
  assert.match(source,/scripts\/ci-\*/);
  assert.match(source,/echo "ci_touched=\$ci_touched"/);
  assert.match(source,/echo "preflight_touched=\$preflight_touched"/);
  assert.match(source,/echo "repair_touched=\$repair_touched"/); 
  assert.match(source,/\} >> "\$GITHUB_OUTPUT"/);
  for(const [name,signal] of [
    ['Verify Source Preflight unit contracts','preflight_touched'],
    ['Assert fast-lane workflow contracts','ci_touched'],
    ['Verify deterministic ESLint repair worker contract','repair_touched']]){
    const clause=source.split('      - name: '+name+'\n')[1]?.split('\n')[0] || '';
    assert.ok(clause.includes("steps.diff.outputs."+signal+" == 'true'"),
      'Related CI contracts must run on mixed application+CI changes: '+name);
  }
  // Security/release policy continues through the broad CI-touched lane.
  assert.match(source,/steps\.diff\.outputs\.ci_touched == 'true'/);
  for(const required of ['.github/workflows/hh-pr-core-release.yml',
    '.github/workflows/hh-actionlint.yml','scripts/ci-source-preflight.mjs',
    'scripts/ci-deterministic-eslint-repair.mjs'])
    assert.ok(source.includes(required),'Relevant CI contract owner lost: '+required);
  assert.match(source,/node scripts\/ci-source-preflight\.mjs/);
  assert.match(source,/run: npm run build/);
  assert.match(source,/^  hh-specialist:/m);
  assert.match(source,/^  hh-merge-check:/m);
});

test('Mandala workflow-only speed route fails closed for all product or deleted file changes',()=>{
  const source=workflow('holistic-support-mandala.yml');
  assert.match(source,/Classify exact-head CI-policy-only PR maintenance/);
  assert.match(source,/fetch-depth: 2/);
  assert.match(source,/git rev-parse HEAD\^2/);
  assert.match(source,/git diff --no-renames --name-status -z HEAD\^1 HEAD/);
  assert.match(source,/M:\.github\/workflows\/\*\.yml/);
  assert.match(source,/M:tests\/ci-workflow-globs\.test\.mjs/);
  assert.match(source,/M:tests\/pr-fast-lane\.test\.mjs/);
  assert.match(source,/policy_only=false/);
  assert.match(source,/node --test tests\/ci-heavy-impact\.test\.mjs tests\/ci-workflow-globs\.test\.mjs/);
  assert.ok(source.includes('- name: Install lockfile dependencies without networked FFmpeg postinstall\n        if: steps.policy.outputs.policy_only != \'true\'\n        run: npm ci --ignore-scripts --no-audit --no-fund'),
    'Mandala installs lockfile dependencies without invoking networked ffmpeg-static postinstall');
  assert.ok(source.includes('- name: Prepare verified upstream FFmpeg for full Mandala runtime'));
  assert.ok(source.includes('- name: Materialize SHA-verified FFmpeg for Mandala runtime and Next trace'));
  for(const name of ['Mandala and mobile support contracts','Voice provider contract and negative cases','Targeted lint']){
    const clause=source.split('      - name: '+name+'\n')[1]?.split('\n')[0] || '';
    assert.match(clause,/steps\.policy\.outputs\.policy_only != 'true'/);
  }
  assert.match(source,/^  webkit_preflight:/m);
  assert.match(source,/^  voice-webkit-macos:/m);
  assert.match(source,/HH_LIVE_VIDEO_ENGINE=webkit/);
  assert.doesNotMatch(source,/continue-on-error:\s*true/);
});

test('Mandala restores the same immutable production Core MP3 cache before safe generation', () => {
  const core=workflow('hh-pr-core-release.yml');
  const mandala=workflow('holistic-support-mandala.yml');
  const cacheKey="key: hh-core-media-v1-${{ runner.os }}-${{ hashFiles('scripts/generate-scenario-melodies.mjs', 'scripts/generate-mandala-melodies.mjs', 'lib/mandala/scenario-audio-catalog.mjs', 'package-lock.json') }}";
  const section=mandala.split('      - name: Restore production-owned scenario MP3 cache (read-only)\n')[1]
    ?.split('      - name: Generate original first-party melody masters\n')[0];
  assert.ok(section,'Mandala must reuse existing Core media, not build a parallel cache');
  assert.ok(core.includes(cacheKey),'Core source hash must match the approved Mandala cache');
  assert.ok(section.includes(cacheKey),'a changed generator, catalog or lockfile must miss the cache');
  assert.ok(section.includes("if: steps.policy.outputs.policy_only != 'true'"),
    'workflow/CI-policy edits must not spend time downloading media');
  assert.match(section,/uses: actions\/cache\/restore@v4/);
  assert.match(section,/path: public\/audio\/mandala\/scenarios/);
  assert.doesNotMatch(section,/restore-keys:/,
    'do not restore stale audio when production source fingerprints differ');
  const focused=mandala.split('  focused-unit-types-build:')[1]
    ?.split('  webkit_preflight:')[0] || '';
  assert.doesNotMatch(focused,/actions\/cache\/save@v4|uses: actions\/cache@v4/,
    'focused PR media lane must restore only; macOS has unrelated build cache writers');
  assert.ok(mandala.indexOf('Restore production-owned scenario MP3 cache (read-only)') <
    mandala.indexOf('Generate dedicated scenario music and four classic performances'));
  assert.match(mandala,/node scripts\/generate-scenario-melodies\.mjs && node scripts\/generate-scenario-melodies\.mjs --check/);
  assert.match(mandala,/run: node --test tests\/mandala-scenario-audio\.test\.mjs/);
});

test('cheap Mandala UI source contracts fail before macOS WebKit without skipping real media',()=>{
  const source=workflow('holistic-support-mandala.yml');
  const preflight=source.split('  webkit_preflight:\n')[1]
    ?.split('  voice-webkit-macos:\n')[0]||'';
  const focused=source.split('  focused-unit-types-build:\n')[1]
    ?.split('  webkit_preflight:\n')[0]||'';
  const mac=source.split('  voice-webkit-macos:\n')[1]||'';
  assert.ok(preflight && focused && mac,'all three existing Mandala jobs must remain');
  for(const file of [
    'tests/video-studio-question-registry.test.mjs',
    'tests/mandala-video-goal-media-coverage.test.mjs',
    'tests/mandala-approved-mobile-studio.test.mjs',
  ]) {
    assert.ok(preflight.includes(file),'fast source preflight missing '+file);
    assert.ok(focused.includes(file),'full independent source acceptance must remain '+file);
  }
  assert.ok(focused.includes('tests/mandala-workspace-tabs.test.mjs'),
    'TypeScript-dependent workspace test remains in the required full suite');
  assert.ok(!preflight.includes('tests/mandala-workspace-tabs.test.mjs'),
    'a no-install preflight must never import TypeScript-dependent workspace tests');
  assert.ok(preflight.includes('node scripts/ci-pr-readiness.mjs'));
  assert.ok(preflight.includes('git rev-parse HEAD^2'));
  assert.doesNotMatch(preflight,/npm ci|npm run build|actions\/cache\/save/,'preflight must remain a cheap no-install gate');
  assert.match(source,/^  voice-webkit-macos:\n    if: .+\n    needs: \[webkit_preflight\]\n    runs-on: macos-15/m);
  assert.ok(mac.includes('npm run build'),'WebKit must still build the exact tested site');
  assert.ok(mac.includes('node scripts/verify-affirmation-voice-browser.mjs'));
  assert.ok(mac.includes('HH_LIVE_VIDEO_ENGINE=webkit'));
  assert.ok(mac.includes('node scripts/benchmarking/verify-original-motion-export.mjs'));
  assert.doesNotMatch(source,/continue-on-error:\s*true/);
});

test('benchmark scripts and standalone Video Studio UI do not allocate unrelated CI, while owner gates remain', () => {
  const benchmark = workflow('hh-benchmark-program.yml');
  const benchmarkTriggers = [...benchmark.matchAll(/^      - "scripts\/benchmarking\/plan\.mjs"$/gm)];
  assert.equal(benchmarkTriggers.length, 2, 'offline benchmark plan remains covered for PR and production push');
  assert.doesNotMatch(benchmark, /- "scripts\/benchmarking\/\*\*"/,
    'unrelated video/media scripts must not launch a competitor benchmark runner');
  for (const owner of [
    'data/benchmarking/**','lib/benchmarking/**',
    'tests/benchmark-reference-matrix.test.mjs'
  ]) assert.ok(benchmark.includes('      - "' + owner + '"'), 'benchmark owner not covered: ' + owner);

  const services = workflow('hh-public-services-production.yml');
  const mandala = workflow('holistic-support-mandala.yml');
  const pathsOnly = services.split(/^permissions:/m)[0];
  const broadMandala = pathsOnly.indexOf("      - 'components/mandala-*'");
  assert.ok(broadMandala > -1, 'public services retain conservative catch-all');
  assert.ok(mandala.includes("      - 'components/mandala-*'"),
    'mandatory separate Mandala browser/voice owner must retain matching paths');
  for (const file of [
    'components/mandala-pro-enhance.tsx',
    'components/mandala-pro-enhance.module.css',
    'components/mandala-video-ideas.tsx',
    'components/mandala-video-ideas.module.css'
  ]) {
    const exclusion = pathsOnly.indexOf("      - '!" + file + "'");
    assert.ok(exclusion > broadMandala, 'single-purpose video UI should not run service browser matrix: ' + file);
  }
  for (const sensitive of [
    'app/api/payments/**', 'components/commerce/**',
    'components/contact-channel-chooser*', 'app/**/services/**',
    'app/api/service-enquiries/**'
  ]) assert.ok(pathsOnly.includes("      - '" + sensitive + "'"),
    'real public booking/checkout/service changes must keep E2E: ' + sensitive);
});


test('Core Mandala fast contracts run only as fallback when the BASE/HEAD Specialist path filter does not own the diff',()=>{
  const core=workflow('hh-pr-core-release.yml');
  const mandala=workflow('holistic-support-mandala.yml');
  const owner=core.split('      - name: Resolve BASE-trusted Mandala Specialist owner for overlapping fast contracts')[1]
    ?.split('      - name: Fast Mandala release contracts')[0];
  const fast=core.split('      - name: Fast Mandala release contracts')[1]
    ?.split('      - name: Verify Source Preflight unit contracts')[0];
  assert.ok(owner,'Core resolves ownership before considering the duplicate test suite');
  assert.ok(fast,'Core keeps its bounded fallback release suite');
  for(const marker of [
    "execFileSync", "HEAD^1",
    "execFileSync", "HEAD^2",
    "HH_EVENT_HEAD_SHA",
    "baseSha + ':' + workflowPath",
    "baseSha + ':lib/ci/specialist-aggregate.mjs'",
    "lib/ci/specialist-aggregate.mjs",
    "parsePrTrigger",
    "matchesTrigger",
    "specialist_owns_mandala=",
  ]) assert.ok(owner.includes(marker),'owner router must verify '+marker);
  assert.ok(fast.includes("steps.mandala_owner.outputs.specialist_owns_mandala != 'true'"));

  const specialistOwns=(baseSource,headSource,changed)=>{
    const triggers=[
      parsePrTrigger(baseSource,'.github/workflows/holistic-support-mandala.yml:base'),
      parsePrTrigger(headSource,'.github/workflows/holistic-support-mandala.yml:head'),
    ];
    return triggers.some(trigger=>matchesTrigger(trigger,changed,'codex/public-book-library'));
  };
  assert.equal(specialistOwns(mandala,mandala,['components/mandala-free-video-studio.tsx']),true,
    'a changed Mandala component belongs to the independent specialist workflow');
  assert.equal(specialistOwns(mandala,mandala,['tests/affirmation-voice.test.mjs']),true,
    'the real voice acceptance test is owned by the specialist path');
  assert.equal(specialistOwns(mandala,mandala,['tests/mandala-video-phrase-catalog.test.mjs']),true,
    'the phrase-catalog contract is owned by its dedicated specialist path');
  assert.equal(specialistOwns(mandala,mandala,['tests/mandala-audio-attach.test.mjs']),true,
    'the broad Mandala unit-test manifest owns all mandala-*.test.mjs files');
  assert.equal(specialistOwns(mandala,mandala,['tests/video-export-contract.test.mjs']),false,
    'a video test outside the owned video-chat and video-owner manifest retains Core fallback coverage');
  assert.equal(specialistOwns(mandala,mandala,['scripts/benchmarking/first-video-live-export.mjs']),false,
    'the first-video benchmark keeps the Core fallback unless its specialist path is explicitly added');

  const newline = String.fromCharCode(10);
  const narrowed=mandala.replace("      - 'components/mandala-*'"+newline,'');
  assert.equal(specialistOwns(mandala,narrowed,['components/mandala-free-video-studio.tsx']),true,
    'candidate narrowing cannot remove BASE-owned specialist coverage');
  const extended=mandala.replace("      - 'tests/affirmation-voice.test.mjs'"+newline,
    "      - 'tests/affirmation-voice.test.mjs'"+newline+"      - 'tests/mandala-audio-attach.test.mjs'"+newline);
  assert.equal(specialistOwns(mandala,extended,['tests/mandala-audio-attach.test.mjs']),true,
    'a HEAD-only owner addition is also considered by the same BASE/HEAD union');
  assert.throws(()=>specialistOwns(mandala,'not a supported workflow',['components/mandala-free-video-studio.tsx']),
    /MISSING_ON|UNSUPPORTED/,'unknown workflow syntax must not authorize skipping Core tests');

  const duplicated=[
    'tests/affirmation-voice.test.mjs',
    'tests/mandala-webcodecs-mp4.test.mjs',
    'tests/mandala-audio-attach.test.mjs',
    'tests/mandala-export.test.mjs',
    'tests/mandala-free-video.test.mjs',
    'tests/mandala-video-phrase-catalog.test.mjs',
  ];
  for(const name of duplicated){
    assert.ok(fast.includes(name),'Core fallback must retain '+name);
    assert.ok(mandala.includes(name),'Specialist focused unit coverage must retain '+name);
  }
});

test('Stories Studio PR must execute real WebKit and four-format acceptance, never silently skip media gates', () => {
  const s=workflow('holistic-support-mandala.yml');
  assert.match(s, /'lib\/mandala\/stories-studio\.\*'/);
  assert.match(s, /'tests\/stories-studio-\*\.test\.mjs'/);
  assert.match(s, /node --test tests\/stories-studio-contract\.test\.mjs tests\/stories-studio-ui\.test\.mjs/);
  const webkit=s.slice(s.indexOf('  voice-webkit-macos:'),s.indexOf('    needs: [webkit_preflight]',s.indexOf('  voice-webkit-macos:')));
  assert.match(webkit, /startsWith\(github\.head_ref, 'codex\/stories-'\)/);
  const linux=s.slice(s.indexOf('      - name: Build\n'),s.indexOf('  webkit_preflight:'));
  assert.match(linux, /startsWith\(github\.head_ref, 'codex\/stories-'\)/);
});


test('Stories physical five-scene MP4 is mandatory in the macOS WebKit release path',()=>{
  const s=workflow('holistic-support-mandala.yml');
  assert.match(s,/scripts\/benchmarking\/verify-five-scene-stories-browser\.mjs/);
  const mac=s.slice(s.indexOf('  voice-webkit-macos:'));
  assert.match(mac,/if \[\[ "\$\{GITHUB_HEAD_REF:-\}" == codex\/stories-\* \]\]/);
  assert.match(mac,/HH_STORIES_E2E_ENGINE=webkit/);
  assert.match(mac,/node scripts\/benchmarking\/verify-five-scene-stories-browser\.mjs/);
  assert.match(mac,/artifacts\/benchmarking\/five-scene-stories-webkit\.json/);
  assert.doesNotMatch(mac,/continue-on-error:\s*true/);
});
