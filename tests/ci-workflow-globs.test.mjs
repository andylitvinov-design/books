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

