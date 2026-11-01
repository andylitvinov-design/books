import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflows = [
  'assessment-range-mobile-browser.yml',
  'hh-benchmark-public-browser.yml',
  'hh-home-conversation.yml',
  'site-video-browser.yml',
];

const read = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');

for (const name of workflows) {
  test(name + ': draft skips heavy job, but ready-for-review and later commits trigger it', () => {
    const source = read(name);
    const pr = source.match(/^  pull_request:\s*\n([\s\S]*?)(?=^  (?:push|workflow_dispatch|schedule|workflow_call):|^permissions:|^concurrency:|^jobs:)/m);
    assert.ok(pr, 'pull_request missing: ' + name);
    for (const event of ['opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft']) {
      assert.match(pr[1], new RegExp('\\b' + event + '\\b'), 'missing event ' + event);
    }
    const jobBlock = source.split(/^jobs:\s*$/m)[1];
    assert.ok(jobBlock, 'jobs block missing');
    const jobNames = [...jobBlock.matchAll(/^  ([a-z][a-z0-9-]+):\s*$/gm)].map(match => match[1]);
    const expanded = name === 'site-video-browser.yml';
    assert.equal(jobNames.length, expanded ? 2 : 1, 'unexpected job count; update all jobs when expanding workflow');
    if (expanded) {
      assert.deepEqual(jobNames, ['browser','admin-verified-owner-browser']);
      assert.ok(jobBlock.includes("    if: ${{ github.event_name == 'workflow_dispatch' || (github.event_name == 'pull_request' && github.event.pull_request.draft == false) }}"),
        'The protected owner job must run on Ready PRs or explicit manual QA, not Draft or production push');
      assert.match(jobBlock, /postgres:17-alpine/);
      assert.match(jobBlock, /redis:7-alpine/);
      assert.match(jobBlock, /\/api\/app\/practitioner\/open|verify-site-video-admin-browser\.mjs/,
        'Protected browser job must run the verified owner, not a fabricated v1 cookie');
    }
    assert.match(jobBlock, /if: \${\{ github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false \}\}/);
    assert.match(source, /^concurrency:/m);
    assert.ok(source.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"));
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  });
}

test('production post-merge push and explicit manual verification are not disabled', () => {
  for (const name of ['hh-home-conversation.yml', 'site-video-browser.yml']) {
    const s = read(name);
    assert.match(s, /^  push:/m, name + ' lost production push verification');
  }
  for (const name of ['assessment-range-mobile-browser.yml', 'hh-benchmark-public-browser.yml']) {
    const s = read(name);
    assert.match(s, /^  workflow_dispatch:/m, name + ' lost manual acceptance');
  }
});

test('short CI contract tests run even when expensive browser gates are draft-skipped', () => {
  const guard = read('hh-pr-sweep-guard.yml');
  assert.match(guard, /tests\/ci-heavy-draft-policy\.test\.mjs/);
  assert.match(guard, /node --test tests\/pr-sweep-guard\.test\.mjs tests\/ci-heavy-draft-policy\.test\.mjs/);
  assert.match(guard, /^  pull_request:/m);
});

test('core Draft skips heavy checkout but cannot pass release-ready, and Ready restores full checks', () => {
  const core = read('hh-pr-core-release.yml');
  assert.ok(core.includes("  pull_request:\n    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]\n    branches: ['codex/public-book-library']"));
  assert.ok(core.includes("  merge_group:"));
  assert.ok(core.includes("  workflow_dispatch:"));
  const scope = core.split('  scope:')[1]?.split('  code:')[0];
  assert.ok(scope);
  assert.ok(scope.includes("if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}"));
  assert.ok(core.includes("run: npm ci --no-audit --no-fund"));
  assert.ok(core.includes("run: npm run build"));
  const gate = core.split('  release-ready:')[1];
  assert.ok(gate);
  assert.ok(gate.includes("    if: always()"));
  assert.ok(gate.includes("PR_DRAFT: ${{ github.event.pull_request.draft }}"));
  assert.ok(gate.includes("if [[ \"$EVENT_NAME\" == pull_request && \"$PR_DRAFT\" == true ]]; then"));
  assert.ok(gate.includes("[[ \"$SCOPE_RESULT\" == success ]] || exit 1"));
  assert.ok(gate.includes("[[ \"$CODE_RESULT\" == success ]] || exit 1"));
  assert.ok(gate.includes("ci-specialist-aggregate.mjs"));
  assert.doesNotMatch(core, /continue-on-error:\s*true/);
});

const runGroupSuffix = "${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}";
const prOnlyCancellation = "${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}";
const supersededRunWorkflows = [
  ['hh-crm-source-check.yml', 'hh-crm-source'],
  ['practice-google-browser.yml', 'hh-practice-google'],
  ['practitioner-presentations.yml', 'hh-practitioner-presentations'],
  ['hh-private-audio-e2e.yml', 'hh-private-audio'],
  ['practice-visual-browser.yml', 'hh-practice-visual'],
];

for (const [workflow, key] of supersededRunWorkflows) {
  test(workflow + ': superseded PR runs preserve push audit', () => {
    const source = read(workflow);
    assert.match(source, /^  pull_request:/m);
    assert.match(source, /^jobs:/m);
    assert.equal((source.match(/^concurrency:/gm) || []).length, 1);
    assert.ok(source.includes('group: ' + key + '-' + runGroupSuffix));
    assert.ok(source.includes('cancel-in-progress: ' + prOnlyCancellation));
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  });
}

test('non-PR push verification is still triggered for release-sensitive suites', () => {
  for (const name of ['practice-google-browser.yml', 'practitioner-presentations.yml', 'hh-private-audio-e2e.yml', 'practice-visual-browser.yml']) {
    assert.match(read(name), /^  push:/m);
  }
});

test('browser readiness polling preserves 120 Bash attempts without unused iterator', () => {
  for (const name of ['practice-google-browser.yml', 'practice-visual-browser.yml']) {
    assert.ok(read(name).includes('for ((i=1; i<=120; i++)); do'));
    assert.ok(!read(name).includes('for i in $(seq 1 120); do'));
  }
});

const draftStageWorkflows = [
  'hh-crm-source-check.yml',
  'hh-private-audio-e2e.yml',
  'practice-google-browser.yml',
  'practice-visual-browser.yml',
  'practitioner-presentations.yml',
];

for (const name of draftStageWorkflows) {
  test(name + ': Draft skips costly jobs but Ready and subsequent commits run them', () => {
    const source = read(name);
    assert.ok(source.includes('  pull_request:\n    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]'));
    assert.match(source, /^  pull_request:[\s\S]*?^    paths:/m);
    const jobs = source.split(/^jobs:\s*$/m)[1];
    assert.ok(jobs, 'jobs missing: ' + name);
    const jobNames = [...jobs.matchAll(/^  ([a-z][a-z0-9-]*):\s*$/gm)].map(item => item[1]);
    assert.ok(jobNames.length >= 1, 'no job names: ' + name);
    const stage = "    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
    for (const job of jobNames) {
      assert.ok(jobs.includes('  ' + job + ':\n' + stage), 'Draft gate missing: ' + name + '/' + job);
    }
    assert.match(source, /^concurrency:\s*\n  group:/m);
    assert.ok(source.includes("  cancel-in-progress: ${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"));
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  });
}

test('Draft staging retains release and manual verification events', () => {
  for (const name of ['hh-private-audio-e2e.yml', 'practice-google-browser.yml', 'practice-visual-browser.yml', 'practitioner-presentations.yml']) {
    assert.match(read(name), /^  push:/m, 'push audit must remain: ' + name);
  }
  assert.match(read('hh-crm-source-check.yml'), /^  workflow_dispatch:/m);
});

const prodBuildReuse = [
  ['hh-profile-axis-matching.yml', ['TypeScript check','Build site'], 'axis-unit-types-build'],
  ['hh-energywork-ai.yml', ['TypeScript verification','Production compile'], 'verify'],
];

test('one core TS/build per production Ready PR; specialist validation remains independent', () => {
  const core=read('hh-pr-core-release.yml');
  assert.ok(core.includes("  pull_request:\n    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]\n    branches: ['codex/public-book-library']"), 'core must rerun on Ready and keep production base');
  assert.match(core,/run: npm run build/);
  assert.match(core,/^  release-ready:/m);
  assert.match(core,/ci-specialist-aggregate\.mjs/);
  for(const [workflow,stepNames,job] of prodBuildReuse){
    const src=read(workflow);
    assert.match(src,/^  pull_request:\s*\n\s+types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/m);
    assert.match(src,/if: \$\{\{ github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false \}\}/);
    assert.match(src,new RegExp('^  '+job+':','m'));
    const ifLine="if: \${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
    for(const step of stepNames){
      assert.ok(src.includes('- name: '+step+'\n        '+ifLine+'\n        run:'),workflow+' must reuse core '+step+' only on production PR');
    }
    assert.match(src,/run: npm ci --no-audit --no-fund/);
    assert.match(src,/node --test/);
    assert.match(src,/eslint/);
    assert.match(src,/run: npm run build/);
    assert.doesNotMatch(src,/continue-on-error:\s*true/);
  }
});
test('Energywork cancels superseded PR commits only, never manual verification',()=>{
  const src=read('hh-energywork-ai.yml');
  assert.match(src,/^  workflow_dispatch:/m);
  assert.ok(src.includes("group: hh-energywork-\${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"));
  assert.ok(src.includes("cancel-in-progress: \${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"));
});


const dedupWave2 = [
  ['hh-support-guided-recommendations.yml', ['Typecheck', 'Build'], ['focused-unit-types-build','mobile-browser']],
  ['hh-my-progress-release.yml', ['Typecheck', 'Production build'], ['private-progress']],
  ['hh-messenger-notification-build.yml', ['Next.js production build (no provider keys)'], ['notification-build']],
];

test('wave 2: production Ready uses one shared full build but retains real specialist tests', () => {
  const core=read('hh-pr-core-release.yml');
  assert.match(core,/^  release-ready:/m);
  assert.match(core,/run: npm run build/);
  const reuse="if: \${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  for(const [filename, steps, jobs] of dedupWave2){
    const source=read(filename);
    assert.match(source,/^  pull_request:\s*\n\s+types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/m);
    for(const job of jobs){
      assert.ok(source.includes('  '+job+':\n    if: \${{ github.event_name != \'pull_request\' || github.event.pull_request.draft == false }}'),filename+' draft policy');
    }
    for(const step of steps){
      assert.ok(source.includes('- name: '+step+'\n        '+reuse+'\n        run:'),filename+' build/type step must rely on core only for production PR');
    }
    assert.match(source,/node --test/);
    assert.match(source,/eslint/);
    assert.match(source,/npm run build/);
    assert.doesNotMatch(source,/continue-on-error:\s*true/);
  }
});
test('wave 2: messenger keeps scoped booking ESLint and runs tsc on non-production/manual',()=>{
  const source=read('hh-messenger-notification-build.yml');
  assert.ok(source.includes('npx --no-install eslint lib/app/repository.js'));
  assert.ok(source.includes('if [[ "$GITHUB_EVENT_NAME" != "pull_request" || "$HH_TARGET_BASE" != "codex/public-book-library" ]]; then'));
  assert.ok(source.includes('npx --no-install tsc --noEmit'));
  assert.ok(source.includes('HH_TARGET_BASE: \${{ github.event.pull_request.base.ref }}'));
  assert.ok(source.includes("cancel-in-progress: \${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"));
  assert.match(source,/^  workflow_dispatch:/m);
});
test('wave 2: My Progress production post-merge checks keep full independent compile',()=>{
  const source=read('hh-my-progress-release.yml');
  assert.match(source,/^  push:/m);
  assert.match(source,/run: npm run build/);
  assert.ok(source.includes("github.event_name != 'pull_request'"));
});


// Heavy workflows must execute on Ready-for-review and later commits, while
// non-mergeable Draft PRs avoid expensive full matrices on intermediate pushes.
const highCostDraftSuites = [
  ['hh-app-r1.yml', ['unit-build', 'course-banner-browser', 'database'], true],
  ['hh-app-browser.yml', ['browser'], true],
  ['opora-module-ci.yml', ['module-routing', 'as56-mobile-browser'], true],
  ['hh-public-services-production.yml', ['public-services'], false],
];
test('wave 4: App, OPORA and public-services Draft gates preserve full Ready acceptance', () => {
  const core=read('hh-pr-core-release.yml');
  assert.match(core,/^  release-ready:/m);
  assert.match(core,/ci-specialist-aggregate\.mjs/);
  assert.match(core,/run: npm run build/);
  const trigger='    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]';
  const gate='    if: $'+"{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  for (const [name, jobNames, pushAudit] of highCostDraftSuites) {
    const source=read(name);
    assert.ok(source.includes('  pull_request:\n'+trigger+'\n'),name+' must rerun when Draft becomes Ready');
    assert.ok(source.includes("branches: ['codex/public-book-library']") ||
      /^    branches:\s*\n\s+- codex\/public-book-library/m.test(source),
      name+' must target production explicitly');
    if(pushAudit)assert.match(source,/^  push:/m,name+' lost push verification');
    assert.equal((source.match(/^concurrency:/gm)||[]).length,1);
    assert.ok(source.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"));
    assert.doesNotMatch(source,/continue-on-error:\s*true/);
    const jobs=source.split(/^jobs:\s*$/m)[1];
    assert.ok(jobs,name+' has no jobs');
    if (name === 'hh-app-r1.yml') {
      // Exact-head impact routing retains non-PR exhaustive checks and skips
      // expensive jobs only after the scope job proves a modified UI-only PR.
      assert.ok(jobs.includes('  impact:\n    name: route-expensive-app-suites\n'+gate+'\n'),
        'App R1 impact job must skip Draft');
      const unit = jobs.split('  unit-build:\n')[1]?.split('  course-banner-browser:\n')[0];
      assert.ok(unit && unit.includes('needs: impact'), 'App R1 unit must depend on exact-head impact');
      assert.match(unit, /needs\.impact\.result == 'success'/);
      assert.match(unit, /needs\.impact\.outputs\.profile == 'true'/);
      assert.match(unit, /github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false/,
        'App R1 unit must never run for Draft; CI-only edits delegate to Core');
      const gated = {
        'course-banner-browser': 'banner',
        database: 'database',
      };
      for (const [job, output] of Object.entries(gated)) {
        const target = '  ' + job + ':\n    needs: impact\n';
        assert.ok(jobs.includes(target), name + '/' + job + ' must depend on fail-closed impact routing');
        assert.ok(jobs.includes('needs.impact.result ==') && jobs.includes('needs.impact.outputs.' + output + ' =='),
          name + '/' + job + ' must require successful scope and strict route');
      }
    } else {
      for (const job of jobNames) assert.ok(jobs.includes('  ' + job + ':\n' + gate + '\n'),
        name + '/' + job + ' must run when ready and retain non-PR events');
    }
  }
  const browser=read('hh-app-browser.yml');
  const summaryGate='    if: $'+"{{ always() && (github.event_name != 'pull_request' || github.event.pull_request.draft == false) }}";
  assert.ok(browser.includes('  browser-journey-complete:\n'));
  assert.ok(browser.includes(summaryGate),'browser suite aggregate must be fail-closed on Ready');
  assert.match(browser,/run: test "\$MATRIX_RESULT" = success/);
});

const PR_NUMBER_CANCELLATION_BROWSER_PILOT = [["hh-public-journey-wave1.yml","hh-public-wave1"]];
test('consolidated public journey browser cancels obsolete PR heads without other events',()=>{
  const suffix="${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}";
  const cancel="${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}";
  const required={
    'hh-public-journey-wave1.yml':['verify-public-pathway-mobile.mjs','verify-public-pathway-toronto-mobile.mjs','npm run build','tests/public-pathway-migration.test.mjs','tests/public-pathway-toronto.test.mjs'],
  };
  for(const [filename,group] of PR_NUMBER_CANCELLATION_BROWSER_PILOT){
    const source=read(filename);
    assert.match(source,/^  pull_request:/m,'PR coverage missing: '+filename);
    assert.match(source,/^    paths:/m,'Path coverage missing: '+filename);
    assert.equal((source.match(/^concurrency:/gm)||[]).length,1,filename+' must have exactly one concurrency block');
    assert.ok(source.includes('group: '+group+'-'+suffix),filename+' must group by immutable PR number');
    assert.ok(source.includes('cancel-in-progress: '+cancel),filename+' must not cancel production or manual');
    assert.match(source,/^jobs:/m);
    for(const contract of required[filename])assert.ok(source.includes(contract),filename+' lost '+contract);
    assert.ok(!source.includes('continue-on-error: true'),filename+' cannot hide real failures');
  }
});


test('PR-number cancellation browser suites use shellchecked bounded readiness loops',()=>{
  for(const [file,limit] of [['hh-public-journey-wave1.yml',75]]){
    const source=read(file);
    assert.ok(source.includes('for ((i=1; i<='+limit+'; i++)); do'),
      file+' readiness loop must use the counter and remain bounded');
    assert.ok(!source.includes('for i in $(seq 1 '+limit+'); do'),
      file+' must not reintroduce shellcheck SC2034');
  }
});



test('Ideas & Coaching PR validates source contracts while manual acceptance owns unique browsers', () => {
  const source=read('hh-ideas-coaching-public.yml');
  const core=read('hh-pr-core-release.yml');
  assert.match(source,/^  pull_request:\s*\n    types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/m);
  assert.match(source,/^    branches: \[codex\/public-book-library\]/m);
  assert.match(source,/^  workflow_dispatch:/m);
  assert.match(source,/^concurrency:\s*\n  group: hh-ideas-coaching-/m);
  const dollar=String.fromCharCode(36);
  assert.ok(source.includes('group: hh-ideas-coaching-'+dollar+"{{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"));
  assert.ok(source.includes('cancel-in-progress: '+dollar+"{{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"));
  const jobGate='    if: '+dollar+"{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  assert.ok(source.includes('  public-coaching-release:\n'+jobGate+'\n'),
    'Only a Ready PR or manual dispatch may run expensive browser acceptance');
  const tsGate='        if: '+dollar+"{{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  assert.ok(source.includes('      - name: TypeScript noEmit\n'+tsGate+'\n        run: npx --no-install tsc --noEmit'),
    'Manual/other branch typecheck stays, production PR relies on core');
  for(const preserved of [
    'node --test tests/public-coaching-discovery.test.mjs',
    '- name: Next.js production build (manual full acceptance only)\n        if: github.event_name != \'pull_request\'\n        run: npm run build',
    'playwright install --with-deps chromium webkit',
    'node scripts/verify-coaching-lounge-mobile.mjs',
    'node scripts/verify-holistic-support-browser.mjs',
    'node --check scripts/verify-ideas-mobile-browser.mjs'
  ]) assert.ok(source.includes(preserved),'Missing source or manual acceptance: '+preserved);
  for (const name of ['Install isolated mobile browsers', 'Real choice-first mobile journey in Chromium and WebKit (EN/RU/ES)']) {
    assert.ok(source.includes('- name: '+name+'\n        if: github.event_name != \'pull_request\''),name+' cannot repeat on PR');
  }
  const manualJourney = source.split('- name: Real choice-first mobile journey in Chromium and WebKit (EN/RU/ES)')[1]?.split('\n      - uses:')[0] || '';
  assert.match(manualJourney, /if: github\.event_name != 'pull_request'/);
  assert.match(manualJourney, /node scripts\/verify-ideas-mobile-browser\.mjs/);
  assert.match(core,/^  release-ready:/m);
  assert.match(core,/run: npm run build/);
  assert.doesNotMatch(source,/continue-on-error:\s*true/);
});

test('Holistic Support mock screenshots run after merge or on exact existing #2483 QA; PR retains source contracts', () => {
  const source = read('hh-support-mobile-mock-browser.yml');
  const core = read('hh-pr-core-release.yml');
  assert.match(source, /^  pull_request:/m);
  assert.match(source, /^  push:/m);
  const boundedBrowserGate="${{ github.event_name != 'pull_request' || github.event.pull_request.number == 2483 }}";
  for (const name of [
    'Install Chromium and WebKit (post-merge visual audit)',
    'Check 320 / 390 / 430 in Chromium and WebKit'
  ]) {
    assert.ok(source.includes('- name: '+name+'\n        if: '+boundedBrowserGate),
      'Only production push or exact preapproved PR #2483 may allocate browser matrices: '+name);
  }
  assert.ok(source.includes("if: always() && github.event_name != 'pull_request'"),
    'PRs must not allocate duplicate screenshot artifacts');
  assert.ok((/node --test [^\n]*tests\/greek-video-series\.test\.mjs/).test(source),
    'PR source contracts must still execute');
  assert.ok(source.includes('tests/holistic-support-mobile-mock-parity.test.mjs'),
    'Parity source contract must not be removed');
  assert.match(core, /^  release-ready:/m);
});

test('Mandala Ready executes source contracts; full encoded video/browser available manually', () => {
  const source = read('holistic-support-mandala.yml');
  const core = read('hh-pr-core-release.yml');
  const types = '    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]';
  const gate = "    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  assert.ok(source.includes('  pull_request:\n' + types + '\n'), 'Draft to Ready event is mandatory');
  assert.ok(source.includes("branches: ['codex/public-book-library']"));
  assert.ok(source.includes('  focused-unit-types-build:\n' + gate + '\n'), 'heavy job only on Ready');
  assert.ok(source.includes('node scripts/verify-holistic-mandala-browser.mjs'));
  assert.ok(source.includes('tests/mandala-export.test.mjs'));
  assert.match(source, /^  workflow_dispatch:/m);
  assert.ok(source.includes("if: github.event_name == 'workflow_dispatch' && steps.impact.outputs.browser == 'true'"));
  assert.ok(source.includes('playwright install --with-deps chromium webkit'));
  assert.ok(source.includes('ffprobe -version'));
  assert.ok(source.includes('ffmpeg -version'));
  assert.ok(source.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"), 'manual runs cannot be cancelled by unrelated PRs');
  assert.match(core, /^  release-ready:/m);
  assert.match(core, /npm run build/);
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});

test('Support Mobile Draft skips costly mock browser; Ready and production push retain full checks', () => {
  const source=read('hh-support-mobile-mock-browser.yml');
  const types="    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]";
  const gate="    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  assert.match(source, /^  push:/m, 'production visual acceptance must remain');
  assert.ok(source.includes("branches: ['codex/public-book-library']"));
  assert.ok(source.includes('  pull_request:\n'+types+'\n'));
  assert.ok(source.includes('  mobile-visual-parity:\n'+gate+'\n'));
  assert.equal((source.match(/^concurrency:/gm)||[]).length,1);
  assert.ok(source.includes("group: hh-support-mobile-mock-${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"));
  assert.ok(source.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"),'never cancel production push');
  assert.ok((/node --test [^\n]*tests\/greek-video-series\.test\.mjs/).test(source));
  assert.ok(source.includes('tests/holistic-support-mobile-mock-parity.test.mjs'));
  assert.ok(source.includes('node scripts/verify-holistic-support-mock-fidelity.mjs'));
  assert.ok(source.includes('playwright install --with-deps chromium webkit'));
  assert.ok(source.includes("      - '.github/workflows/hh-support-mobile-mock-browser.yml'"));
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});


test('wave 5: Support Mock delegates only duplicate production PR TypeScript to unconditional Core', () => {
  const core=read('hh-pr-core-release.yml');
  const mock=read('hh-support-mobile-mock-browser.yml');
  assert.match(core, /run: npm run build/);
  assert.match(core,/^  release-ready:/m);
  assert.match(mock,/^  pull_request:\s*\n    types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/m);
  assert.match(mock,/^  push:/m);
  assert.ok(mock.includes("  mobile-visual-parity:\n    if: $"+"{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}"));
  assert.ok(mock.includes('- name: Full TypeScript on non-production PR or production push\n        if: $'+"{{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}"+'\n        run: npx --no-install tsc --noEmit --pretty false'));
  assert.match(mock,/node-version: '22'\s*\n          cache: npm/);
  assert.match(mock,/node --test [^\n]*tests\/greek-video-series\.test\.mjs/);
  assert.match(mock,/npx eslint/);
  assert.match(mock,/playwright install --with-deps chromium webkit/);
  assert.ok(mock.includes('node scripts/verify-holistic-support-mock-fidelity.mjs'));
  assert.ok(mock.includes('tests/holistic-support-mobile-mock-parity.test.mjs'));
  assert.doesNotMatch(mock,/continue-on-error:\s*true/);
});

test('wave 5: Support Mock readiness loop is bounded, strict and ShellCheck-clean',()=>{
  const mock=read('hh-support-mobile-mock-browser.yml');
  assert.match(mock,/for \(\(attempt=1; attempt<=120; attempt\+\+\)\); do/);
  assert.match(mock,/if \(\( attempt == 120 \)\); then/);
  assert.match(mock,/tail -80 \/tmp\/hh-support-mock-next\.log/);
  assert.match(mock,/exit 1/);
  assert.doesNotMatch(mock,/for i in \$\(seq 1 120\)/);
});

const heavyDraftStage = [
  ['ia-v2.yml', ['verify']],
  ['hh-live-seo-audit.yml', ['audit', 'public-tests-mobile']],
  ['hh-public-performance-audit.yml', ['measure-public']],
];

for (const [name, jobs] of heavyDraftStage) {
  test(name + ': skip Draft-only runner work but restore exact Ready checks', () => {
    const source = read(name);
    assert.ok(source.includes('  pull_request:\n    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]\n'));
    assert.match(source, /^concurrency:/m);
    assert.match(source, /cancel-in-progress:/);
    const block = source.split(/^jobs:\s*$/m)[1];
    assert.ok(block);
    const suffix = '$' + "{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
    for (const job of jobs) {
      assert.ok(block.includes('  ' + job + ':\n    if: ' + suffix + '\n'), name + '/' + job + ' Ready gate missing');
    }
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  });
}

test('Draft staging keeps full IA security, SEO source-build and production monitoring', () => {
  const ia = read('ia-v2.yml');
  // The IA workflow validates its own security and browser acceptance on its exact PR head.
  assert.match(ia, /'\.github\/workflows\/ia-v2\.yml'/);
  assert.match(ia, /npm run test:app/);
  assert.match(ia, /IA security, ownership and navigation contracts/);
  assert.match(read('hh-actionlint.yml'), /^      - '\.github\/workflows\/\*\*'$/m);
  assert.match(read('hh-pr-core-release.yml'), /node --test tests\/pr-fast-lane\.test\.mjs/);
  assert.match(ia, /verify:ia-v2/);
  assert.match(ia, /redis:7-alpine/);
  assert.match(ia, /^  workflow_dispatch:/m);
  const seo = read('hh-live-seo-audit.yml');
  const sourceBlock = seo.split('  source-build:')[1]?.split('  audit:')[0];
  assert.ok(sourceBlock);
  assert.ok(sourceBlock.includes("    if: $" + "{{ github.event_name == 'pull_request' && github.event.pull_request.draft == false }}"));
  assert.match(sourceBlock, /npm run build/);
  assert.match(seo, /^  push:/m);
  assert.match(seo, /^  workflow_dispatch:/m);
  assert.match(seo, /verify-live-sitemap\.mjs/);
  const performance = read('hh-public-performance-audit.yml');
  assert.match(performance, /^  push:/m);
  assert.match(performance, /^  workflow_dispatch:/m);
  assert.match(performance, /tests\/holistic-house-image-quota\.test\.mjs/);
});


// Existing Guard job exercises the new preflight's fail-closed decision table.
// The preflight adds no standalone CI workflow, job, or required check.
import { assessPrReadiness } from '../scripts/ci-pr-readiness.mjs';

const earlyRepo = 'andylitvinov-design/books';
const earlyEvent = {
  repository: { full_name: earlyRepo },
  pull_request: {
    number: 4242, draft: false,
    head: { sha: 'a'.repeat(40), repo: { full_name: earlyRepo } },
    base: { ref: 'codex/public-book-library', sha: 'b'.repeat(40) },
  },
};
const earlyLive = {
  number: 4242, state: 'open', draft: false, mergeable: true, mergeable_state: 'clean',
  head: { sha: 'a'.repeat(40), repo: { full_name: earlyRepo } },
  base: { ref: 'codex/public-book-library', sha: 'b'.repeat(40) },
};

test('early readiness accepts current mergeable HEAD without deadlocking pending reviews', () => {
  assert.equal(assessPrReadiness(earlyEvent, earlyLive, earlyRepo).ready, true);
  assert.equal(assessPrReadiness(earlyEvent, { ...earlyLive, mergeable_state: 'blocked' }, earlyRepo).ready, true);
  assert.equal(assessPrReadiness(earlyEvent, { ...earlyLive, mergeable_state: 'unstable' }, earlyRepo).ready, true);
  // A newer production base alone does not require rerunning all old CI suites.
  const advanced = { ...earlyLive, base: { ...earlyLive.base, sha: 'c'.repeat(40) }, mergeable_state: 'behind' };
  assert.equal(assessPrReadiness(earlyEvent, advanced, earlyRepo).ready, true);
});

test('early readiness fails closed for stale SHA, conflicts, Draft, forks and API unknown', () => {
  const mutations = [
    [{ ...earlyLive, head: { ...earlyLive.head, sha: 'c'.repeat(40) } }, 'superseded_head'],
    [{ ...earlyLive, base: { ...earlyLive.base, sha: 'bad' } }, 'invalid_live_base_sha'],
    [{ ...earlyLive, mergeable: false }, 'conflict'],
    [{ ...earlyLive, mergeable_state: 'dirty' }, 'conflict'],
    [{ ...earlyLive, mergeable: null }, 'mergeability_pending'],
    [{ ...earlyLive, mergeable_state: 'unknown' }, 'mergeability_pending'],
    [{ ...earlyLive, draft: true }, 'draft'],
    [{ ...earlyLive, state: 'closed' }, 'closed'],
    [{ ...earlyLive, number: 7 }, 'pr_mismatch'],
    [{ ...earlyLive, head: { ...earlyLive.head, repo: { full_name: 'fork/external' } } }, 'fork_head'],
  ];
  for (const [live, code] of mutations) {
    const result = assessPrReadiness(earlyEvent, live, earlyRepo);
    assert.equal(result.ready, false, code);
    assert.equal(result.code, code);
  }
  assert.equal(assessPrReadiness({}, earlyLive, earlyRepo).ready, false);
  assert.equal(assessPrReadiness(earlyEvent, earlyLive, 'wrong/repo').ready, false);
});

test('existing heavy jobs preflight before dependency install; core release gate stays required', () => {
  const expected = [
    ['hh-app-r1.yml', 3], ['hh-app-browser.yml', 1],
    ['opora-module-ci.yml', 2], ['hh-public-services-production.yml', 1],
    ['site-video-browser.yml', 2],
  ];
  for (const [name, expectedCount] of expected) {
    const source = read(name);
    assert.equal((source.match(/- name: Verify live PR readiness before costly CI/g) || []).length,
      expectedCount, name + ' preflight steps');
    assert.match(source, /^  pull-requests: read$/m, name + ' read-only permission');
    const jobText = source.split(/^jobs:\s*$/m)[1];
    assert.ok(jobText, name + ' missing jobs');
    const jobBlocks = jobText.split(/^  (?=[a-z][a-z0-9-]*:\s*$)/m).slice(1);
    for (const block of jobBlocks) {
      const install = block.indexOf('      - run: npm ci');
      if (install === -1) continue;
      const preflight = block.indexOf('run: node scripts/ci-pr-readiness.mjs');
      assert.ok(preflight >= 0 && preflight < install, name + ' costly job starts before preflight');
    }
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  }
  const core = read('hh-pr-core-release.yml');
  const scope = core.split('  scope:')[1]?.split('  code:')[0];
  assert.ok(scope && scope.includes('run: node scripts/ci-pr-readiness.mjs'));
  assert.ok(scope.indexOf('run: node scripts/ci-pr-readiness.mjs') <
    scope.indexOf('name: Classify strictly documentation-only PRs'));
  assert.ok(core.includes('scripts/ci-pr-readiness.mjs|\\'));
  assert.ok(core.includes('needs: scope'));
  assert.match(core, /^  release-ready:/m);
  assert.match(core, /run: npm run build/);
  assert.ok(read('hh-pr-sweep-guard.yml').includes("'scripts/ci-pr-readiness.mjs'"));
});

test('wave 4: Core owns duplicate global TypeScript on production PRs; specialist runtime checks stay', () => {
  const core=read('hh-pr-core-release.yml');
  assert.match(core,/run: npm run build/);
  const guard="if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  for(const [name,label] of [
    ['hh-owner-telegram-video.yml','TypeScript'],
    ['hh-messenger-mobile-release.yml','Type-check real production application'],
  ]) {
    const yaml=read(name);
    const step=yaml.split('      - name: '+label+'\n')[1]?.split(/\n      - /)[0];
    assert.ok(step?.includes(guard),name+' delegates production-PR typecheck only');
    assert.match(yaml,/run: npm run build/,name+' retains independent build needed by real acceptance');
  }
  for(const [name,required] of [
    ['hh-live-audio-ci.yml','node --test tests/live-audio-pilot.test.mjs'],
    ['hh-free-express-wizard-v2.yml','node scripts/verify-free-express-wizard-v2.mjs'],
  ]) {
    const yaml=read(name);
    assert.ok(yaml.includes('HH_TARGET_BASE: ${{ github.event.pull_request.base.ref }}'),name+' must have target');
    assert.ok(yaml.includes('GITHUB_EVENT_NAME'),name+' must retain manual/other-base typecheck');
    assert.ok(yaml.includes('npx tsc --noEmit'),name+' retains standalone TypeScript');
    assert.ok(yaml.includes(required),name+' preserves original negative/browser checks');
    assert.match(yaml,/npm run build/,name+' retains local production build');
  }
  const crm=read('hh-crm-source-check.yml');
  const commands=crm.split('\n').filter(x=>/^\s+run: node --test /.test(x));
  for(const testFile of [
    'tests/crm-telegram-diagnostic.test.mjs',
    'tests/crm-public-registration.test.mjs',
    'tests/public-service-enquiries.test.mjs',
  ]) assert.equal(commands.filter(x=>x.includes(testFile)).length,1,testFile+' must execute once');
  for(const testFile of ['tests/crm-security-contract.test.mjs','tests/crm-consent.test.mjs','tests/free-express-google-claim.test.mjs']) {
    assert.ok(crm.includes(testFile),testFile+' security contract remains mandatory');
  }
  assert.match(crm,/github.event_name == 'workflow_dispatch'/);
});

test('mobile-install PR retains private-message contracts; post-merge/manual runs full browser', () => {
  const yaml=read('holistic-house-mobile-install.yml');
  assert.match(yaml, /ready_for_review/);
  assert.match(yaml, /workflow_dispatch:/);
  for (const name of [
    'Build public phone installation pages without credentials',
    'Install Chromium and WebKit for real public iPhone installation QA',
    'Check EN/RU install pages and real PNG icons',
  ]) {
    assert.ok(yaml.includes('- name: '+name+"\n        if: github.event_name != 'pull_request'"),
      'ordinary PR must skip duplicate mobile browser matrix: '+name);
  }
  assert.ok(yaml.includes("if: always() && github.event_name != 'pull_request'"));
  assert.match(yaml, /^  push:/m);
  assert.match(yaml, /tests\/holistic-house-install-push-regression\.test\.mjs/);
  assert.match(yaml, /node --test tests\/holistic-house-pwa\.test\.mjs/);
  assert.doesNotMatch(yaml, /continue-on-error:\s*true/);
});

test('auxiliary visual PRs run source contracts; real Chromium/WebKit and duplicate builds are manual/post-merge',()=>{
  const configs=[
    ['youtube-phone-uploader.yml',['Next.js production build','Install isolated Chromium and WebKit for phone UX acceptance',
      'Reproduce iPhone-sized scrolling in real Chromium/WebKit']],
    ['hh-public-journey-wave1.yml',['Build exact candidate once for both real-browser suites',
      'Install Chromium and WebKit once for both journeys','Read-only EN/RU/ES Chromium and WebKit journeys on a shared local server']],
    ['home-locale-switch.yml',['Build three home locales with reviewed dependencies',
      'Build the real application','Install isolated browsers without changing app dependencies',
      'Delayed navigation cannot discard the first play click']],
  ];
  for (const [filename,names] of configs) {
    const source=read(filename);
    for (const name of names) {
      assert.ok(source.includes('      - name: '+name+"\n        if: github.event_name != 'pull_request'"),
        filename+' must defer duplicate PR build/browser for '+name);
    }
    assert.match(source,/workflow_dispatch:/,filename+' manual QA lost');
    assert.doesNotMatch(source,/continue-on-error:\s*true/,filename+' cannot hide source failures');
  }
  const owner=read('hh-reiki-all-slides-browser.yml');
  for(const original of ['tests/tantra-reiki-compact-fullwidth.test.mjs',
    'tests/tantra-reiki-photographic-landing.test.mjs','tests/tantra-reiki-level-one-focus.test.mjs',
    'tests/tantra-reiki-mobile-chapters.test.mjs','tests/tantra-reiki-teacher-compact.test.mjs',
    'components/tantra-reiki-journey.tsx','.github/workflows/hh-tantra-photo-levels.yml']) {
    assert.ok(owner.includes(original),'Existing Reiki owner must cover retired Tantra Photo source: '+original);
  }
  const youtube=read('youtube-phone-uploader.yml');
  assert.match(youtube,/tests\/youtube-upload-readback\.test\.mjs/);
  const journey=read('hh-public-journey-wave1.yml');
  assert.match(journey,/^  push:/m);
  const home=read('home-locale-switch.yml');
  assert.match(home,/^  push:/m);
  assert.match(home,/tests\/home-locale-menu-state\.test\.mjs/);
});
