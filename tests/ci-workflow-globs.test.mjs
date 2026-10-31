import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = (name) => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');

test('My Progress uses a valid broad dynamic Next.js pathname and production push only', () => {
  const s = workflow('hh-my-progress-release.yml');
  assert.match(s, /'app\/\*\*\/app\/\*\*\/page\.jsx'/);
  assert.doesNotMatch(s, /\[\[\.\.\.path\]\]/);
  assert.doesNotMatch(s, /codex\/my-progress-unified-history-20261028/);
  assert.match(s, /push:\s*\n\s*branches: \['codex\/public-book-library'\]/);
});

test('Practitioner editor validates dynamic routes without spurious push trigger', () => {
  const s = workflow('practice-visual-services.yml');
  assert.match(s, /'app\/api\/app\/\*\*\/route\.js'/);
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

test('deleted workflow-only changes cannot hide an unverified YAML removal', () => {
  const s = workflow('hh-actionlint.yml');
  assert.match(s, /git diff --no-renames --name-status -z/);
  assert.match(s, /saw_deletion=true/);
  assert.ok(s.includes('[[ -n "$filename" && "$status" == D ]] || deleted_only=false'));
  assert.match(s, /\[\[ "\$deleted_only" == true \]\]/);
  assert.match(s, /Workflow filter triggered but no changed YAML is available; refusing unverified changes/);
  assert.match(workflow('hh-pr-core-release.yml'), /BASE_SHA:.*github.event.pull_request.base.sha/);
});

test('Portrait Chromium/WebKit runs only on Ready PR HEAD and safely cancels superseded PR runs',()=>{
  const s=workflow('hh-portrait-mobile-browser.yml');
  const dollar=String.fromCharCode(36);
  assert.match(s,/^  pull_request:\s*\n    types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/m);
  assert.ok(s.includes('group: hh-portrait-mobile-'+dollar+"{{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}"));
  assert.ok(s.includes('cancel-in-progress: '+dollar+"{{ github.event_name == 'pull_request' }}"));
  assert.ok(s.includes("  synthetic-mobile:\n    if: "+dollar+"{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}"));
  assert.match(s,/browser: \[chromium, webkit\]/);
  assert.match(s,/postgres:17-alpine/);
  assert.match(s,/HH_APP_TEST_RUNTIME: isolated/);
  assert.match(s,/verify-portrait-mobile\.mjs/);
  assert.match(s,/^permissions:\s*\n  contents: read/m);
  assert.ok(s.includes('for ((i=1; i<=110; i++)); do'));
  assert.doesNotMatch(s,/continue-on-error:\s*true|actions:\s*write/);
});

test('YouTube and Free Review: obsolete PR commits cancel safely; Draft saves browser runner minutes', () => {
  const suffix = "${{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}";
  const cancel = "${{ github.event_name == 'pull_request' }}";
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

test('Public Services exact-head impact routing preserves all source and browser guarantees', () => {
  const s = workflow('hh-public-services-production.yml');
  const planner = readFileSync(new URL('../scripts/ci-public-services-plan.mjs', import.meta.url), 'utf8');
  assert.ok(!s.includes("      - '.github/workflows/hh-public-services-production.yml'"),
    'workflow-only changes must use Core/actionlint rather than launching unrelated browsers');
  assert.match(s, /HH_PUBLIC_HEAD_SHA:.*github\.event\.pull_request\.head\.sha/);
  assert.match(s, /HH_PUBLIC_BASE_SHA:.*github\.event\.pull_request\.base\.sha/);
  assert.match(s, /node scripts\/ci-public-services-plan\.mjs/);
  assert.match(s, /if: \$\{\{ steps\.scope\.outputs\.browser == 'true' \}\}/);
  assert.match(s, /if: \$\{\{ steps\.scope\.outputs\.build == 'true' \}\}/);
  assert.match(planner, /second !== head/);
  assert.match(planner, /merge-base/);
  assert.match(planner, /GIT_HISTORY_OR_CHANGED_FILES_UNVERIFIED/);
  assert.match(planner, /RUNTIME_SHARED_PAYMENT_OR_UNKNOWN_PATH/);
  const list = planner.match(/PUBLIC_SOURCE_TESTS = Object\.freeze\((\[[\s\S]*?\])\);/);
  assert.ok(list, 'required existing source contract registry must be declared');
  const allowed = JSON.parse(list[1]);
  const invoked = new Set([...s.matchAll(/node --test ([^\n]+)/g)]
    .flatMap(m => m[1].trim().split(/\s+/).filter(name => name.startsWith('tests/'))));
  assert.ok(allowed.length >= 20, 'do not silently empty existing Node test contracts');
  for (const file of allowed) assert.ok(invoked.has(file), 'registered test must run: ' + file);
  const suites = [...s.matchAll(/run_case "(verify-[\w-]+\.mjs)" node scripts\/verify-[\w-]+\.mjs/g)]
    .map(m => m[1]);
  assert.equal(suites.length, 14, 'all 14 real E2E scenarios remain');
  assert.equal(new Set(suites).size, 14, 'each browser scenario has one real command');
  for (const required of ['npm run build', 'playwright install --with-deps chromium webkit',
    'verify-service-cart-browser.mjs', 'verify-talisman-google-checkout-browser.mjs',
    "'app/api/payments/**'", 'wait "$lane_a_pid"', 'wait "$lane_b_pid"']) {
    assert.ok(s.includes(required), 'required source/browser/payment acceptance missing: ' + required);
  }
  assert.doesNotMatch(s, /continue-on-error:\s*true/);
});

test('lighter specialist CI preserves contract tests, Ready rechecks, and protected Core compilation', () => {
  const core = workflow('hh-pr-core-release.yml');
  assert.match(core, /name: release-ready/);
  assert.match(core, /name: core-lint-types-build/);
  assert.match(core, /Full TypeScript check/);
  assert.match(core, /Exact proposed release production build/);
  const compileGuard = "if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  const draftGuard = "if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  const readyEvents = 'types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]';
  const suites = [
    ['hh-practice-telegram-digest.yml', ['offline-contracts', 'production-build'], ['Next.js production build and TypeScript']],
    ['practice-material-previews.yml', ['unit-types-build'], ['TypeScript regression', 'Production Next.js build']],
    ['hh-messages-wellness-v2.yml', ['focused'], ['TypeScript check']],
    ['reiki-enquiry-capture-ci.yml', ['reiki-capture'], ['Type-check Next app']],
    ['hh-event-referral-contract.yml', ['tracked-handoff-regression'], ['Check TypeScript without publishing']],
  ];
  for (const [file, jobs, steps] of suites) {
    const source = workflow(file);
    assert.ok(source.includes(readyEvents), file + ': Draft must rerun automatically on Ready');
    assert.match(source, /node --test/, file + ': focused domain contracts must remain');
    assert.doesNotMatch(source, /continue-on-error:\s*true/, file + ': no weakened failures');
    for (const job of jobs) {
      assert.ok(source.includes('  ' + job + ':\n    ' + draftGuard),
        file + ': expensive work must skip Draft, not Ready');
    }
    for (const step of steps) {
      const start = source.indexOf('      - name: ' + step + '\n');
      assert.ok(start >= 0, file + ': original compile step must be retained: ' + step);
      const next = source.indexOf('\n      - ', start + 1);
      const body = source.slice(start, next < 0 ? undefined : next);
      assert.ok(body.includes(compileGuard), file + ': Core must own production PR compile: ' + step);
    }
  }
  for (const file of [
    'hh-practice-telegram-digest.yml', 'practice-material-previews.yml',
    'hh-messages-wellness-v2.yml', 'reiki-enquiry-capture-ci.yml',
  ]) assert.match(workflow(file), /^  workflow_dispatch:/m, file + ': manual full verification preserved');
  assert.match(workflow('hh-event-referral-contract.yml'), /^  push:/m, 'production push still verifies TypeScript');
  const gauntlet = workflow('hh-gauntlet-loop.yml');
  assert.ok(gauntlet.includes(readyEvents));
  assert.ok(gauntlet.includes('  offline-contract:\n    ' + draftGuard));
  assert.match(gauntlet, /node --test tests\/hh-gauntlet-loop\.test\.mjs/);
  assert.match(gauntlet, /HH_TARGET_BASE:.*github\.event\.pull_request\.base\.ref/);
  assert.ok(gauntlet.includes('if [[ "$GITHUB_EVENT_NAME" != pull_request || "$HH_TARGET_BASE" != codex/public-book-library ]]; then'));
  assert.match(gauntlet, /^  push:/m);
  assert.match(gauntlet, /^  workflow_dispatch:/m);
});
