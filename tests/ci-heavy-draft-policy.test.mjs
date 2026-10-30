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
    assert.equal(jobNames.length, 1, 'unexpected job count; update all jobs when expanding workflow');
    assert.match(jobBlock, /if: \${\{ github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false \}\}/);
    assert.match(source, /^concurrency:/m);
    assert.match(source, /^  cancel-in-progress: true/m);
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

const runGroupSuffix = "${{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}";
const prOnlyCancellation = "${{ github.event_name == 'pull_request' }}";
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
    assert.ok(source.includes("  cancel-in-progress: ${{ github.event_name == 'pull_request' }}"));
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
  assert.match(core,/^  pull_request:\s*\n\s+branches: \['codex\/public-book-library'\]/m);
  assert.match(core,/run: npx --no-install tsc --noEmit --pretty false/);
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
  assert.ok(src.includes("group: hh-energywork-\${{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}"));
  assert.ok(src.includes("cancel-in-progress: \${{ github.event_name == 'pull_request' }}"));
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
  assert.match(core,/run: npx --no-install tsc --noEmit --pretty false/);
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
  assert.ok(source.includes("cancel-in-progress: \${{ github.event_name == 'pull_request' }}"));
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
    assert.match(source,/^  cancel-in-progress: true/m);
    assert.doesNotMatch(source,/continue-on-error:\s*true/);
    const jobs=source.split(/^jobs:\s*$/m)[1];
    assert.ok(jobs,name+' has no jobs');
    for(const job of jobNames) assert.ok(jobs.includes('  '+job+':\n'+gate+'\n'),
      name+'/'+job+' must run when ready and retain non-PR events');
  }
  const browser=read('hh-app-browser.yml');
  const summaryGate='    if: $'+"{{ always() && (github.event_name != 'pull_request' || github.event.pull_request.draft == false) }}";
  assert.ok(browser.includes('  browser-journey-complete:\n'));
  assert.ok(browser.includes(summaryGate),'browser suite aggregate must be fail-closed on Ready');
  assert.match(browser,/run: test "\$MATRIX_RESULT" = success/);
});

test('Mandala Draft gating preserves complete Ready video and audio acceptance', () => {
  const source = read('holistic-support-mandala.yml');
  const core = read('hh-pr-core-release.yml');
  const types = '    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]';
  const gate = "    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  assert.ok(source.includes('  pull_request:\n' + types + '\n'), 'Draft to Ready event is mandatory');
  assert.ok(source.includes("branches: ['codex/public-book-library']"));
  assert.ok(source.includes('  focused-unit-types-build:\n' + gate + '\n'), 'heavy job only on Ready');
  assert.ok(source.includes('node scripts/verify-holistic-mandala-browser.mjs'));
  assert.ok(source.includes('tests/mandala-export.test.mjs'));
  assert.ok(source.includes('playwright install --with-deps chromium webkit'));
  assert.ok(source.includes('ffprobe -version'));
  assert.ok(source.includes('ffmpeg -version'));
  assert.ok(source.includes('cancel-in-progress: true'));
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
  assert.ok(source.includes("group: hh-support-mobile-mock-${{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}"));
  assert.ok(source.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' }}"),'never cancel production push');
  assert.ok(source.includes('node --test tests/greek-video-series.test.mjs'));
  assert.ok(source.includes('tests/holistic-support-mobile-mock-parity.test.mjs'));
  assert.ok(source.includes('node scripts/verify-holistic-support-mock-fidelity.mjs'));
  assert.ok(source.includes('playwright install --with-deps chromium webkit'));
  assert.ok(source.includes("      - '.github/workflows/hh-support-mobile-mock-browser.yml'"));
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});
