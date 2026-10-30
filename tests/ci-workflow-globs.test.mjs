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


test('SEO and Portrait mobile browser gates cancel only superseded PR HEADs and rerun after Draft to Ready',()=>{
  const dollar=String.fromCharCode(36);
  const cases=[
    {file:'hh-portrait-mobile-browser.yml',group:'hh-portrait-mobile',source:['browser: [chromium, webkit]','postgres:17-alpine','verify-portrait-mobile.mjs']},
    {file:'hh-live-seo-audit.yml',group:'hh-live-seo-audit',source:['verify-live-sitemap.mjs','verify-public-tests-mobile.mjs','run: npm run build']},
  ];
  for(const item of cases){
    const s=workflow(item.file);
    const pr=s.split('  pull_request:')[1]?.split(/^(?:  push:|  workflow_dispatch:|permissions:)/m)[0]||'';
    assert.ok(pr.includes('ready_for_review')&&pr.includes('converted_to_draft'),item.file+' must rerun required jobs on Ready');
    assert.ok(s.includes('group: '+item.group+'-'+dollar+"{{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}"),
      item.file+' group must isolate PRs and push/manual runs');
    assert.ok(s.includes('cancel-in-progress: '+dollar+"{{ github.event_name == 'pull_request' }}"),
      item.file+' must not cancel production/manual verification');
    assert.match(s,/^permissions:\s*\n  contents: read/m);
    assert.doesNotMatch(s,/continue-on-error:\s*true|actions:\s*write/);
    for(const phrase of item.source) assert.ok(s.includes(phrase),item.file+' lost acceptance: '+phrase);
  }
  const portrait=workflow('hh-portrait-mobile-browser.yml');
  assert.ok(portrait.includes("  synthetic-mobile:\n    if: "+dollar+"{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}"));
  assert.ok(portrait.includes('for ((i=1; i<=110; i++)); do'));
  const seo=workflow('hh-live-seo-audit.yml');
  assert.match(seo,/^  push:/m);
  assert.match(seo,/^  workflow_dispatch:/m);
  assert.ok(seo.includes("  source-build:\n    if: github.event_name == 'pull_request' && github.event.pull_request.draft == false"));
  assert.ok(seo.includes("  audit:\n    if: "+dollar+"{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}"));
  assert.ok(seo.includes("  public-tests-mobile:\n    if: github.event_name != 'pull_request'"));
});

