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
  assert.match(source, /scrollIntoView\\(\\{block:"center"/, 'real user-like scroll must make full card visible');
  assert.match(source, /document\\.elementFromPoint\\(x,y\\)/, 'fixed toolbar must not intercept tap');
  assert.match(source, /assert\\.ok\\(targetHit\\.hittable/, 'do not silently click blocked card');
  assert.match(source, /await card\\.click\\(\\)/, 'one full-card tap, no retry');
  assert.match(source, /radio instanceof HTMLInputElement && radio.checked/);
  assert.match(source, /getAttribute\("data-selected"\) === "true"/);
  assert.match(source, /Single-tap focus was not committed/);
  assert.match(source, /input\[type="checkbox"\]/);
  assert.match(source, /TOTAL " \+ results.length/, 'all EN/RU/ES browser cases must still execute');
});
