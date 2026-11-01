import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join,matchesGlob as requireGlob } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const workflow = (name) =>
  readFileSync(join(root, '.github', 'workflows', name), 'utf8');

const scoped = [
  'hh-app-browser.yml',
  'hh-app-r1.yml',
  'hh-billing-isolated.yml',
  'hh-interpretation-database.yml',
  'hh-public-services-production.yml',
  'ia-v2.yml',
  'opora-module-ci.yml',
];

test('seven formerly unconditional PR workflows run only on relevant paths', () => {
  for (const filename of scoped) {
    const source = workflow(filename);
    const trigger = source.split(/^permissions:/m)[0];
    const start = trigger.indexOf('  pull_request:');
    assert.notEqual(start, -1, filename + ' lost PR trigger');
    const remainder = trigger.slice(start + '  pull_request:'.length);
    const block = remainder.split(/^  [a-z_]+:/m)[0];
    assert.match(block, /^    branches:/m, filename + ' lost target branch');
    assert.match(block, /codex\/public-book-library/, filename + ' points to wrong base');
    assert.match(block, /^    paths:/m, filename + ' will run for every PR again');
    assert.match(block, /^      - /m, filename + ' has no scoped path patterns');
  }
});

test('OPORA My Courses test-only routing is exact; App R1 still verifies the full app suite', () => {
  const opora = workflow('opora-module-ci.yml');
  const app = workflow('hh-app-r1.yml');
  const pathsOf = src => {
    const block = src.match(/^  pull_request:\s*\n([\s\S]*?)(?=^permissions:|^concurrency:|^jobs:)/m);
    assert.ok(block, 'production-targeted PR trigger required');
    return [...block[1].matchAll(/^      - '([^']+)'$/gm)].map(x => x[1]);
  };
  const oporaPaths = pathsOf(opora), appPaths = pathsOf(app);
  const covers = (paths, filename) => paths.some(pattern => requireGlob(filename, pattern));
  for (const filename of ['tests/my-course-moment-trends.test.mjs', 'tests/my-course-programs.test.mjs']) {
    assert.ok(oporaPaths.includes(filename), 'OPORA must run its directly invoked test ' + filename);
    assert.equal(covers(oporaPaths, filename), true);
  }
  assert.ok(!oporaPaths.includes('tests/my-course*.mjs'), 'unrelated My Courses test-only edits must not launch full OPORA browser matrix');
  assert.equal(covers(oporaPaths, 'tests/my-course.test.mjs'), false);
  assert.equal(covers(appPaths, 'tests/my-course.test.mjs'), true, 'full App R1 suite still runs this test');
  assert.ok(app.includes('node --conditions=react-server --test tests/historical-interpretation-coverage.test.mjs'), 'focused historical contract remains');
  for (const source of ['components/my-course-progress.jsx', 'lib/course/course-recommendations.js', 'tests/opora-as56-experience-first.test.mjs']) {
    assert.equal(covers(oporaPaths, source), true, 'OPORA source/safety test must remain covered: ' + source);
  }
  const moduleTests = opora.split(/^  module-routing:\s*$/m)[1]?.split(/^  as56-mobile-browser:\s*$/m)[0];
  assert.ok(moduleTests, 'OPORA unit suite must be retained');
  const executed = [...moduleTests.matchAll(/tests\/[a-z0-9.-]+\.test\.mjs/g)].map(x => x[0]);
  assert.equal(executed.length, new Set(executed).size, 'run each distinct OPORA source test once per unit job');
  assert.ok(executed.length >= 47, 'retain all 47 proven OPORA cases as the suite grows');
  for (const crucial of ['tests/opora-day-one-interactive.test.mjs', 'tests/opora-as57-calm-morning.test.mjs', 'tests/course-compact-owner-ui.test.mjs']) {
    assert.ok(executed.includes(crucial), 'missing original real consent or mobile regression: ' + crucial);
  }
  assert.match(opora, /types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/);
  assert.ok(opora.includes("fromJSON(github.event_name == 'pull_request'"), 'OPORA browser matrix must route by event');
  assert.ok(opora.includes("'[\"chromium\"]'"), 'Ready PR runs one isolated Chromium');
  assert.ok(opora.includes("'[\"chromium\",\"webkit\"]'"), 'manual and feature-push still cover WebKit');
  assert.ok(opora.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"), 'manual jobs cannot be cancelled by unrelated PRs');
  assert.doesNotMatch(opora, /continue-on-error:\s*true/);
});

test('one unconditional fail-closed release-ready gate protects core code validation', () => {
  const source = workflow('hh-pr-core-release.yml');
  assert.match(source, /^  pull_request:/m);
  assert.match(source, /^  merge_group:/m);
  assert.match(source, /^  release-ready:/m);
  assert.match(source, /^    needs: \[scope, code\]/m);
  assert.match(source, /^    if: always\(\)/m);
  assert.match(source, /git diff --no-renames --name-only -z/);
  assert.match(source, /docs\/\*\.md\|README\.md/);
  assert.match(source, /npm ci --no-audit --no-fund/);
  assert.match(source, /eslint/);
  assert.match(source, /run: npm run build/);
  assert.match(source, /npm run build/);
  assert.match(source, /ci-specialist-aggregate\.mjs/);
  assert.match(source, /git show/);
  assert.match(source, /HH_HEAD_REPO/);
  assert.match(source, /HH_TRUSTED_BASE_SHA:scripts\/ci-specialist-aggregate\.mjs/);
  assert.match(source, /HH_HEAD_SHA/);
  assert.match(source, /HH_BASE_SHA/);
  assert.match(source, /actions: read/);
  assert.match(source, /pull-requests: read/);
  assert.match(source, /timeout-minutes: 45/);
  assert.match(source, /\[\[ "\$SCOPE_RESULT" == success \]\]/);
  assert.match(source, /\[\[ "\$CODE_RESULT" == success \]\]/);
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});

test('PR automation policy and agent entry point require specialist safety gates', () => {
  const docs = readFileSync(join(root, 'docs', 'operations', 'CI_RELEASE_POLICY.md'), 'utf8');
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(docs, /sole required GitHub status is `release-ready`/);
  assert.match(docs, /SUCCESS on the exact PR HEAD/);
  assert.match(docs, /Applicable specialist CI workflows must execute and succeed/);
  assert.match(docs, /production advance alone does not require updating the PR branch/);
  assert.match(docs, /FAST presentation-only/);
  for (const requiredSafetyGate of ['RLS', 'auth', 'privacy', 'payment']) {
    assert.match(docs, new RegExp(requiredSafetyGate, 'i'));
  }
  assert.match(agents, /CI_RELEASE_POLICY\.md/);
});

// Exercise only the classifier shell block in a disposable synthetic Git repository.
// Never execute workflow jobs, package scripts, application modules or providers.
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { verifiedCheckoutBase, checkoutChangedRows } from '../scripts/ci-specialist-aggregate.mjs';

const directDependencies = {
  "hh-app-browser.yml": ["scripts/helpers/isolated-browser-diagnostics.mjs", "scripts/verify-account-status-filters.mjs", "scripts/verify-asrs6-pdf.mjs", "scripts/verify-asrs6.mjs", "scripts/verify-bach-personal-report-browser.mjs", "scripts/verify-mhc-sf.mjs", "scripts/verify-personality-types.mjs"],
  "hh-app-r1.yml": ["scripts/verify-eight-v2-registry-proposal.mjs", "tests/author-score-clusters.test.mjs", "tests/cabinet-today.test.mjs", "tests/canonical-pdf.test.mjs", "tests/checkin-course-result-integrity.test.mjs", "tests/checkin-scoring-analysis-quality.test.mjs", "tests/consultation-draft-preview.test.mjs", "tests/consultation-report-language.test.mjs", "tests/course-banner/browser.mjs", "tests/distance-homeopathy-report.test.mjs", "tests/free-course-banner.test.mjs", "tests/full-assessment-library-quality.test.mjs", "tests/hh-original-review-ledger.test.mjs", "tests/historical-interpretation-coverage.test.mjs", "tests/personal-analysis-cabinet.test.mjs", "tests/professional-test-expansion-2026.test.mjs", "tests/psi-monitoring.test.mjs", "tests/psychometric-validity-directory.test.mjs", "tests/public-test-match-paging.test.mjs", "tests/session-publication-review.test.mjs"],
  "hh-billing-isolated.yml": ["tests/talisman-google-checkout.test.mjs"],
  "hh-public-services-production.yml": ["components/academy-course-video-playlist.tsx", "lib/practitioners/taoist-talisman-cart.js", "scripts/fixtures/holistic-support-directory.mjs", "scripts/measure-hh-public-ttfb.mjs", "scripts/verify-alchemy-one-screen.mjs", "scripts/verify-business-quiz-mobile.mjs", "scripts/verify-contact-channel-chooser-browser.mjs", "scripts/verify-direction-focus-mobile.mjs", "scripts/verify-home-consultation-first-screen.mjs", "scripts/verify-ideas-mobile-browser.mjs", "scripts/verify-reiki-mobile-order-browser.mjs", "scripts/verify-service-cart-browser.mjs", "scripts/verify-storefront-shop-browser.mjs", "scripts/verify-talisman-google-checkout-browser.mjs", "tests/goal-support-offers.test.mjs", "tests/practitioner-homeopathy-canonical-route.test.mjs", "tests/practitioner-remote-energy-support.test.mjs", "tests/service-alchemy-one-screen-story.test.mjs", "tests/talisman-google-checkout.test.mjs", "tests/temple-insights-compact-cta.test.mjs", "tests/temple-support-hub.test.mjs"],
  'ia-v2.yml': [
    'scripts/verify-ia-v2.mjs',
    'scripts/ia-v2-loopback-proxy.mjs',
    'scripts/ia-public-navigation-diagnostics.mjs',
    'lib/clients/**',
    'lib/prescriptions/**',
    'lib/site-navigation-model.js',
  ],
  'hh-interpretation-database.yml': [
    'tests/helpers/interpretation-db-isolation.mjs',
    'tests/helpers/trauma-context-fixtures.mjs',
    'tests/helpers/legacy-source-fingerprint.mjs',
    'tests/helpers/historical-interpretation-coverage.mjs',
    'scripts/compact-interpretation-sql.mjs',
    'docs/assessments/interpretation-registry-readback.sql',
  ],
};

test('specialist PR filters retain proven direct harness dependencies', () => {
  for (const [filename, dependencies] of Object.entries(directDependencies)) {
    const source = workflow(filename);
    const pr = source.split('  pull_request:')[1].split(/^  [a-z_]+:|^permissions:/m)[0];
    const patterns = [...pr.matchAll(/^      - '([^']+)'$/gm)].map((match) => match[1]);
    for (const dependency of dependencies) {
      assert.ok(patterns.includes(dependency), `${filename} misses ${dependency}`);
    }
  }
});

test('Video Studio-only changes run Mandala real-media QA, not unrelated Public Services E2E',()=>{
  const fromWorkflow=name=>{
    const source=workflow(name);
    const pr=source.split('  pull_request:')[1]?.split(/^  [a-z_]+:|^permissions:/m)[0]??'';
    return [...pr.matchAll(/^      - '([^']+)'$/gm)].map(x=>x[1]);
  };
  const covers=(patterns,file)=>{
    let yes=false;
    for(const p of patterns){
      const neg=p.startsWith('!');
      const m=neg?p.slice(1):p;
      if(requireGlob(file,m))yes=!neg;
    }
    return yes;
  };
  // Use the same Node core matcher as the protected specialist aggregator;
  // don't fake coverage by comparing only literal prefixes.
  const service=fromWorkflow('hh-public-services-production.yml');
  const mandala=fromWorkflow('holistic-support-mandala.yml');
  for(const file of [
    'components/mandala-cinematic-director.tsx',
    'components/mandala-cinematic-director.module.css',
    'scripts/verify-holistic-mandala-browser.mjs',
    'components/mandala-free-video-studio.tsx',
    'components/mandala-video-mobile.module.css',
    'components/mandala-stories-characters.tsx',
    'components/mandala-stories-characters.module.css',
    'components/mandala-first-video-start.tsx',
    'components/mandala-first-video-start.module.css',
    'app/api/holistic-support/first-video-prompt/route.js',
    'tests/first-video-director.test.mjs',
    'tests/mandala-stories-characters.test.mjs',
  ]){
    assert.equal(covers(service,file),false,file+' should not run unrelated Alchemy/storefront');
    assert.equal(covers(mandala,file),true,file+' must still run real video/browser checks');
  }
  // Public voice API is owned by Mandala real media/provider E2E; other
  // public-service paths retain their normal independent checks.
  const voiceRoute='app/api/holistic-support/voice/route.js';
  assert.equal(covers(service,voiceRoute),false,'voice-only API not Public Services');
  assert.equal(covers(mandala,voiceRoute),true,'voice-only API requires Mandala real WAV/MP4 tests');
  for(const file of [
    'components/mandala-meditation-client.tsx',
    'components/holistic-support-mobile.tsx',
    'scripts/verify-holistic-master-browser.mjs',
    'scripts/verify-holistic-support-recommendations-mobile.mjs',
    'app/en/holistic-support/mandala/page.tsx',
    'tests/practitioner-remote-energy-support.test.mjs',
    'app/api/holistic-support/checkout/route.js',
  ])assert.equal(covers(service,file),true,file+' still covered for public service changes');
});

const classifierCases = [
  ['workflow-to-doc rename', '.github/workflows/synthetic.yml', 'docs/moved.md', 'rename', false],
  ['invalid nonempty base', 'docs/start.md', null, 'edit', false, 'pull_request', 'invalid'],
  ['code-to-doc rename', 'source.ts', 'docs/moved.md', 'rename', false],
  ['doc-to-code rename', 'docs/start.md', 'source.ts', 'rename', false],
  ['doc-to-doc rename', 'docs/start.md', 'docs/moved.md', 'rename', true],
  ['code deletion', 'source.ts', null, 'delete', false],
  ['docs edit', 'docs/start.md', null, 'edit', true],
  ['mixed code and docs', 'docs/start.md', 'source.ts', 'mixed', false],
  ['empty diff', 'docs/start.md', null, 'empty', false],
  ['manual docs change', 'docs/start.md', null, 'edit', false, 'workflow_dispatch'],
  ['merge queue docs change', 'docs/start.md', null, 'edit', false, 'merge_group'],
  ['newline code filename', 'source\nfile.ts', 'docs/moved.md', 'rename', false],
  ['missing base', 'docs/start.md', null, 'edit', false, 'pull_request', true],
  ['CI workflow YAML edit', '.github/workflows/example.yml', null, 'edit', false, 'pull_request', false, true],
  ['CI workflow YAML deletion', '.github/workflows/example.yml', null, 'delete', false, 'pull_request', false, true],
  ['CI source aggregator edit', 'lib/ci/specialist-aggregate.mjs', null, 'edit', false, 'pull_request', false, true],
  ['CI policy test edit', 'tests/pr-fast-lane.test.mjs', null, 'edit', false, 'pull_request', false, true],
  ['CI workflow validation test edit', 'tests/ci-workflow-globs.test.mjs', null, 'edit', false, 'pull_request', false, true],
  ['CI YAML plus runtime code', '.github/workflows/example.yml', 'app/api/payments/route.js', 'mixed', false],
  ['CI YAML rename to runtime file', '.github/workflows/example.yml', 'components/example.tsx', 'rename', false],
  ['dependency lockfile edit', 'package-lock.json', null, 'edit', false],
  ['Supabase SQL migration', 'supabase/migrations/20261030_sensitive.sql', null, 'edit', false],
  ['auth API edit', 'app/api/auth/route.js', null, 'edit', false],
  ['CI instructions update', 'AGENTS.md', null, 'edit', false],
];

for (const [name, from, to, operation, expected, event = 'pull_request', missingBase = false, expectedCiOnly = false] of classifierCases) {
  test(`fail-closed PR classifier: ${name}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'hh-fast-lane-'));
    const env = { PATH: process.env.PATH, HOME: dir, TMPDIR: dir,
      GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_AUTHOR_NAME: 'Synthetic', GIT_AUTHOR_EMAIL: 'synthetic@example.invalid',
      GIT_COMMITTER_NAME: 'Synthetic', GIT_COMMITTER_EMAIL: 'synthetic@example.invalid' };
    const run = (command, args, extra = {}, allowFailure = false) => {
      const result = spawnSync(command, args, { cwd: dir, env: { ...env, ...extra }, encoding: 'utf8', timeout: 10_000, maxBuffer: 1024 * 1024 });
      assert.ifError(result.error);
      if (allowFailure) return result;
      assert.equal(result.status, 0, `${command}: ${result.stderr}`);
      return result.stdout.trim();
    };
    const git = (...args) => run('git', ['-c', 'core.hooksPath=/dev/null', ...args]);
    const write = (path, value) => { mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), value); };
    try {
      git('init', '--quiet');
      // Explicitly enable detection so the regression cannot pass accidentally
      // because a local Git default happens to disable rename detection.
      git('config', 'diff.renames', 'true');
      write(from, 'synthetic unchanged content\n');
      git('add', '--all'); git('commit', '--quiet', '-m', 'synthetic baseline');
      const base = git('rev-parse', 'HEAD');
      if (operation === 'rename') { mkdirSync(join(dir, to, '..'), { recursive: true }); renameSync(join(dir, from), join(dir, to)); }
      if (operation === 'delete') rmSync(join(dir, from));
      if (operation === 'edit' || operation === 'mixed') write(from, 'synthetic edited content\n');
      if (operation === 'mixed') write(to, 'synthetic source\n');
      git('add', '--all'); git('commit', '--quiet', '--allow-empty', '-m', 'synthetic change');
      const source = workflow('hh-pr-core-release.yml');
      const classifierStep = source.match(/^      - name: Classify strictly documentation-only PRs\n([\s\S]*?)(?=^      - (?:name|uses):|^  [a-z][\w-]*:)/m);
      assert.ok(classifierStep);
      const block = classifierStep[1].match(/^        run: \|\n([\s\S]*)$/m);
      assert.ok(block, 'classifier shell block is present');
      // Preserve classifier logic exactly; isolate only its fixed temporary file.
      const script = block[1].replace(/^          /gm, '').replaceAll('/tmp/hh-pr-changed-files.z', join(dir, 'changed.z'));
      const invalidBase = missingBase === 'invalid';
      const result = run('bash', ['--noprofile', '--norc', '-c', script], {
        BASE_SHA: invalidBase ? 'not-a-valid-commit' : missingBase ? '' : base, EVENT_NAME: event,
        GITHUB_OUTPUT: join(dir, 'output'), GITHUB_STEP_SUMMARY: join(dir, 'summary'),
      }, invalidBase);
      if (invalidBase) {
        assert.notEqual(result.status, 0, 'invalid base must fail closed');
        assert.equal(result.signal, null, 'invalid base is a normal Git failure, not timeout');
        assert.ok(!existsSync(join(dir, 'output')) || !readFileSync(join(dir, 'output'), 'utf8').includes('docs_only=true'));
      } else {
        assert.deepEqual(readFileSync(join(dir, 'output'), 'utf8').trim().split('\n'), [`docs_only=${expected}`,`ci_only=${expectedCiOnly}`]);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

test('PR fast lane ignores unrelated production commits in verified merge checkout', () => {
  const dir=mkdtempSync(join(tmpdir(),'hh-pr-merge-base-'));
  const run=(cmd,args,env={})=>{
    const out=spawnSync(cmd,args,{cwd:dir,encoding:'utf8',timeout:10_000,maxBuffer:1024*1024,
      env:{PATH:process.env.PATH,HOME:dir,TMPDIR:dir,GIT_CONFIG_NOSYSTEM:'1',
        GIT_CONFIG_GLOBAL:'/dev/null',GIT_AUTHOR_NAME:'Synthetic',
        GIT_AUTHOR_EMAIL:'synthetic@example.invalid',GIT_COMMITTER_NAME:'Synthetic',
        GIT_COMMITTER_EMAIL:'synthetic@example.invalid',...env}});
    assert.ifError(out.error);
    return out;
  };
  const git=(...args)=>{
    const out=run('git',['-c','core.hooksPath=/dev/null',...args]);
    assert.equal(out.status,0,'synthetic git: '+out.stderr);
    return out.stdout.trim();
  };
  const write=(path,value)=>{
    mkdirSync(join(dir,path,'..'),{recursive:true});
    writeFileSync(join(dir,path),value);
  };
  try {
    git('init','--quiet');
    write('.github/workflows/example.yml','original\n');
    git('add','--all'); git('commit','--quiet','-m','base');
    const base=git('rev-parse','HEAD');
    git('switch','--quiet','-c','feature');
    write('.github/workflows/example.yml','updated\n');
    git('add','--all'); git('commit','--quiet','-m','CI-only PR');
    const feature=git('rev-parse','HEAD');
    git('switch','--quiet','-c','production',base);
    write('app/api/payments/route.js','unrelated production payment change\n');
    git('add','--all'); git('commit','--quiet','-m','other production PR');
    git('merge','--quiet','--no-ff','feature','-m','PR merge checkout');
    assert.match(git('diff','--name-only',base,'HEAD'),/app\/api\/payments\/route\.js/,
      'stale event base falsely treats production changes as PR changes');
    const source=workflow('hh-pr-core-release.yml');
    const classifierStep=source.match(/^      - name: Classify strictly documentation-only PRs\n([\s\S]*?)(?=^      - (?:name|uses):|^  [a-z][\w-]*:)/m);
    assert.ok(classifierStep, 'the named classifier step is present');
    const block=classifierStep[1].match(/^        run: \|\n([\s\S]*)$/m);
    assert.ok(block);
    const script=block[1].replace(/^          /gm,'')
      .replaceAll('/tmp/hh-pr-changed-files.z',join(dir,'changed.z'));
    const output=join(dir,'output'),summary=join(dir,'summary');
    const checked=run('bash',['--noprofile','--norc','-c',script],
      {BASE_SHA:base,PR_HEAD_SHA:feature,EVENT_NAME:'pull_request',
        GITHUB_OUTPUT:output,GITHUB_STEP_SUMMARY:summary});
    assert.equal(checked.status,0,checked.stderr);
    assert.deepEqual(readFileSync(output,'utf8').trim().split('\n'),
      ['docs_only=false','ci_only=true']);
    assert.deepEqual(readFileSync(join(dir,'changed.z'),'utf8').split('\0').filter(Boolean),
      ['.github/workflows/example.yml']);
    const bad=run('bash',['--noprofile','--norc','-c',script],
      {BASE_SHA:base,PR_HEAD_SHA:'f'.repeat(40),EVENT_NAME:'pull_request',
        GITHUB_OUTPUT:join(dir,'bad-output'),GITHUB_STEP_SUMMARY:summary});
    assert.notEqual(bad.status,0,'mismatched merge commit HEAD must fail closed');
    const lint=source.split(/^  code:/m)[1]?.split(/^  release-ready:/m)[0];
    assert.ok(lint?.includes('BASE_SHA="$first_parent"'),
      'changed-file lint must also exclude unrelated target-branch updates');
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
});

test('policy-only YAML edits and AGENTS.md do not fan out into seven product acceptance suites', () => {
  // A workflow definition is checked by the dedicated actionlint+core policy gates.
  // A change to product, auth, billing, DB, test, or harness paths still exercises its suites.
  const actionlint = workflow('hh-actionlint.yml');
  const core = workflow('hh-pr-core-release.yml');
  assert.match(actionlint, /^  pull_request:/m);
  assert.match(actionlint, /^      - '\.github\/workflows\/\*\*'$/m);
  assert.match(actionlint, /actionlint -color/);
  assert.match(core, /^  pull_request:/m);
  assert.match(core, /^  release-ready:/m);
  assert.match(core, /node --test tests\/pr-fast-lane\.test\.mjs/);
  for (const name of scoped) {
    const s = workflow(name);
    const block = s.split('  pull_request:')[1].split(/^  [a-z_]+:|^permissions:/m)[0];
    const patterns = [...block.matchAll(/^      - '([^']+)'$/gm)].map(match => match[1]);
    assert.ok(!patterns.includes('AGENTS.md'), name + ' must not run a product suite on agent instructions alone');
    // IA workflow changes must exercise their own security and real browser lane;
    // App R1 routes its own YAML edits through its existing impact classifier.
    const focusedSelfCheck = (name === 'hh-app-r1.yml' && s.includes('node scripts/ci-heavy-impact.mjs app-r1')) ||
      (name === 'ia-v2.yml' && s.includes('npm run test:app') && s.includes('npm run verify:ia-v2'));
    assert.ok(focusedSelfCheck || !patterns.includes('.github/workflows/' + name), name + ' must not launch unrelated acceptance for YAML edits');
    assert.ok(patterns.includes('package.json') && patterns.includes('package-lock.json'), name + ' lost dependency change coverage');
    assert.ok(patterns.some(pattern => /^app\/|^components\/|^lib\/|^tests\//.test(pattern)), name + ' lost product source coverage');
  }
});

test('App R1 and IA retain specialist tests but avoid duplicate global validation on production PRs', () => {
  const core = workflow('hh-pr-core-release.yml');
  assert.match(core, /eslint/);
  const skip = "if: $" + "{{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  const app = workflow('hh-app-r1.yml');
  const appUnit = app.split('  unit-build:\n')[1]?.split('  course-banner-browser:\n')[0];
  assert.ok(appUnit, 'App R1 unit-build job exists');
  for (const [name, command] of [
    ['Lint complete repository including literal App Router paths', 'npm run lint'],
    ['Production-mode build, app flags absent', 'npm run build'],
    ['Full TypeScript (core release-ready owns production PR typing)', 'npx --no-install tsc --noEmit'],
  ]) {
    assert.ok(appUnit.includes('- name: ' + name + '\n        ' + skip + '\n        run: ' + command), name + ' must be scoped to non-production-PR only');
  }
  assert.match(appUnit, /node --conditions=react-server --test/);
  assert.match(appUnit, /npm run pwa:check && npm run native:check/);
  assert.match(app, /run: npm run test:app:db/);
  const ia = workflow('ia-v2.yml');
  for (const [name, command] of [
    ['Full lint outside production PR (core release-ready owns production lint)', 'npm run lint'],
    ['Full TypeScript outside production PR (core release-ready owns production typing)', 'npx --no-install tsc --noEmit'],
  ]) {
    assert.ok(ia.includes('- name: ' + name + '\n        ' + skip + '\n        run: ' + command), name + ' must be scoped to non-production-PR only');
  }
  assert.match(ia, /name: IA security, ownership and navigation contracts/);
  assert.match(ia, /run: npm run test:app/);
  for (const file of ['ia-v2.test.mjs', 'ia-preview-verifier.test.mjs', 'admin-session-lifecycle.test.mjs', 'ia-v2-loopback-proxy.test.mjs', 'ia-public-navigation-diagnostics.test.mjs', 'app-auth-pkce.integration.mjs', 'app-migration-contract.test.mjs', 'app-guest-report-migration.test.mjs', 'app-http-security.test.mjs', 'prescriptions.test.mjs', 'prescription-access.test.mjs', 'client-account-document-save.test.mjs', 'practitioner-private-relay.test.mjs', 'admin-login-security.test.mjs', 'remote-support-privacy-contract.test.mjs', 'client-session-recorder-auth.test.mjs', 'practitioner-preview-auth.test.mjs', 'admin-auth-refresh.test.mjs', 'oauth-public-pages.test.mjs', 'public-security-headers.test.mjs', 'crm-security-contract.test.mjs', 'session-delivery-security.test.mjs', 'practice-telegram-auth-fetch.test.mjs', 'crm-consent.test.mjs', 'manual-billing-security.test.mjs', 'public-tests-auth-transparency.test.mjs']) {
    assert.ok(ia.includes('tests/' + file), file + ' remains in the IA PR lane');
  }
  assert.match(ia, /name: Full unit inventory outside production PR[\s\S]*?if: \$\{\{ github\.event_name != 'pull_request' \}\}[\s\S]*?run: npm run test:unit/);
  assert.match(ia, /run: npm run build/);
  assert.match(ia, /run: npm run verify:ia-v2/);
});

// Exact single-purpose exclusions are safe only with positive installer coverage.
// Test the same ordered Node glob semantics as the trusted release aggregator.
test('public installer changes use their dedicated real mobile gate, not unrelated public-services E2E',()=>{
  const patterns=name=>{
    const s=workflow(name);
    const pr=s.split('  pull_request:')[1]?.split(/^  [a-z_]+:|^permissions:/m)[0]??'';
    return [...pr.matchAll(/^      - '([^']+)'$/gm)].map(x=>x[1]);
  };
  const covered=(pats,file)=>{
    let matched=false;
    for(const pattern of pats){
      const neg=pattern.startsWith('!');
      if(requireGlob(file,neg?pattern.slice(1):pattern))matched=!neg;
    }
    return matched;
  };
  const services=patterns('hh-public-services-production.yml');
  const installer=patterns('holistic-house-mobile-install.yml');
  for(const file of ['tests/holistic-house-free-install.test.mjs','tests/holistic-house-native-public-downloads.test.mjs']){
    assert.equal(covered(services,file),false,file+' must not launch the unrelated 20-minute Alchemy/Reiki suite');
    assert.equal(covered(installer,file),true,file+' MUST retain real PWA/browser/manifest checks');
  }
  for(const file of [
    'tests/holistic-support-mobile-alternative.test.mjs',
    'tests/holistic-support-meditations.test.mjs',
    'tests/holistic-talisman-mobile-categories.test.mjs',
    'components/holistic-support-mobile.tsx',
    'app/ru/services/alchemy-of-soul/page.tsx',
    'app/es/business/consultation/page.tsx',
    'scripts/verify-holistic-master-browser.mjs',
    'tests/practitioner-remote-energy-support.test.mjs'
  ])assert.equal(covered(services,file),true,file+' must still run public services acceptance');
});

test('two confirmed source-only specialist suites delegate duplicate TypeScript or build to unconditional production release-ready', () => {
  const skip = "if: $" + "{{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  const core = workflow('hh-pr-core-release.yml');
  const specs=[
    ['hh-public-test-collections.yml',[['Verify Next.js production build','npm run build']],['tests/public-test-topic-collections.test.mjs','tests/profile-construct-axes.test.mjs']],
    ['hh-kling-video.yml',[['TypeScript','npx tsc --noEmit'],['Next.js build','npm run build']],['tests/kling-video.test.mjs','tests/kling-avatar.test.mjs']],
  ];
  for(const [filename,guardedSteps,domainContracts] of specs){
    const s=workflow(filename);
    for(const [name,command] of guardedSteps){
      const exact='- name: '+name+'\n        '+skip+'\n        run: '+command;
      assert.ok(s.includes(exact), filename+' must retain global '+name+' outside production-targeted PR only');
    }
    for(const src of domainContracts) assert.ok(s.includes(src),filename+' domain contract removed: '+src);
    assert.ok(s.includes("      - '.github/workflows/"+filename+"'"),filename+' must trigger its own edited workflow for domain validation');
    assert.ok(!s.includes('continue-on-error: true'),filename+' cannot bypass real test errors');
  }
  for(const filename of ['hh-kling-video.yml']) {
    const s=workflow(filename);
    assert.match(s,/^concurrency:/m,filename+' must cancel outdated PR runs');
    assert.match(s,/cancel-in-progress: \$\{\{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after \}\}/);
  }
});

test('CI-only fast lane retains exact policy checks and refuses broad source skips',()=>{
  const core=workflow('hh-pr-core-release.yml');
  const actionlint=workflow('hh-actionlint.yml');
  assert.ok(core.includes("ci_only: $"+"{{ steps.diff.outputs.ci_only }}"));
  for(const path of [".github/workflows/*.yml",".github/workflows/*.yaml","docs/operations/PR_FAST_LANE_20261029.md","lib/ci/specialist-aggregate.mjs","lib/ci/pr-sweep-guard.mjs","scripts/ci-specialist-aggregate.mjs","scripts/pr-sweep-guard.mjs","tests/pr-fast-lane.test.mjs","tests/ci-specialist-aggregate.test.mjs","tests/ci-workflow-globs.test.mjs","tests/pr-sweep-guard.test.mjs","tests/ci-heavy-draft-policy.test.mjs"]) assert.ok(core.includes(path),'Missing exact allowlist path '+path);
  assert.ok(core.includes("if: needs.scope.outputs.ci_only != 'true'"));
  assert.match(core,/node --test tests\/pr-fast-lane\.test\.mjs/);
  assert.match(core,/run: npm run build/);
  assert.match(core,/node scripts\/ci-specialist-aggregate\.mjs/);
  assert.ok(actionlint.includes("'tests/ci-workflow-globs.test.mjs'"),'Changing the CI syntax regression must launch its own check');
  for(const forbidden of ['package.json','package-lock.json','app/api/app','app/api/auth','supabase/migrations','AGENTS.md']) {
    const classifier=core.split('case "$f" in').slice(-1)[0].split('*) ci_only=false')[0];
    // A pinned CI-only parser may have its own nested package.json/lock;
    // still forbid the root dependency manifests from using CI-only mode.
    const rootManifest = forbidden === 'package.json' || forbidden === 'package-lock.json';
    const exact = forbidden.split('.').join('\\.');
    const unsafe = rootManifest
      ? new RegExp('(?:^|\\n|\\|)\\s*' + exact + '(?=\\||\\))').test(classifier)
      : classifier.includes(forbidden);
    assert.ok(!unsafe,'Unsafe CI-only source inclusion: '+forbidden);
  }
});


const prOnlyCancel = "${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}";
const prGroupSuffix = "${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}";
test('video About and Library cancel only superseded PR checks, preserving specialized tests', () => {
  for (const [file,prefix,job] of [
    ...(existsSync(join(root,'.github','workflows','holistic-about-video-check.yml')) ? [['holistic-about-video-check.yml','hh-about-video','check']] : []),
    ['library-public-feed.yml','hh-library-feed','isolated-build'],
  ]) {
    const src=workflow(file);
    assert.match(src,/types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/);
    assert.match(src,new RegExp('^  '+job+':\\n    if:','m'));
    assert.ok(src.includes("github.event_name != 'pull_request' || github.event.pull_request.draft == false"));
    assert.equal((src.match(/^concurrency:/gm)||[]).length,1);
    assert.ok(src.includes('group: '+prefix+'-'+prGroupSuffix));
    assert.ok(src.includes('cancel-in-progress: '+prOnlyCancel));
    assert.ok(src.includes("if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}"));
    assert.match(src,/node (?:--conditions=react-server )?--test/);
    assert.match(src,/eslint/);
    assert.doesNotMatch(src,/continue-on-error:\s*true/);
  }
  const lib=workflow('library-public-feed.yml');
  assert.match(lib,/^  workflow_dispatch:/m);
  assert.match(lib,/run: npm run build/);
  assert.match(lib,/playwright install --with-deps chromium webkit/);
  assert.match(lib,/node scripts\/verify-ideas-mobile-browser\.mjs/);
  // A BASE-trusted two-PR migration may retire the duplicate About source-only
  // workflow only after an unchanged Site Video successor covers the same paths.
  const successor=workflow('site-video-browser.yml');
  for(const inherited of [
    'components/psychic-alchemy-intro-video*',
    'app/**/about/page.tsx',
    'tests/psychic-alchemy-intro-video.test.mjs',
    'lib/site-videos/**',
    'components/site-video-*',
    'components/page-video.tsx',
    'app/admin/videos/**',
    'app/site-video*.css',
    'tests/site-video*.mjs',
    'middleware.ts',
    '.github/workflows/holistic-about-video-check.yml',
  ]) assert.ok(successor.includes("      - '"+inherited+"'"),'Missing original About trigger '+inherited);
  for(const contract of ['tests/psychic-alchemy-intro-video.test.mjs','tests/site-videos.test.mjs',
    'tests/site-video-defaults.test.mjs','node scripts/verify-site-video-browser.mjs','npx tsc --noEmit']) {
    assert.ok(successor.includes(contract),'Missing About source/browser evidence '+contract);
  }
  assert.doesNotMatch(successor,/continue-on-error:\s*true/);
  if(existsSync(join(root,'.github','workflows','holistic-about-video-check.yml'))) {
    const about=workflow('holistic-about-video-check.yml');
    assert.match(about,/npx tsc --noEmit/);
    assert.match(about,/node --test tests\/psychic-alchemy-intro-video\.test\.mjs/);
  } else {
    const policy=readFileSync(join(root,'lib','ci','specialist-aggregate.mjs'),'utf8');
    assert.ok(policy.includes("'.github/workflows/holistic-about-video-check.yml': '.github/workflows/site-video-browser.yml'"),
      'Only production BASE-approved migration can retire the old workflow');
  }
});


test('PR-only cancellation safeguards owner video, SEO and performance audit without cancelling release',()=>{
  const suffix="${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}";
  const guard="${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}";
  const specs=[
    ['hh-live-seo-audit.yml','hh-live-seo',['Verify Next.js production build','Run comprehensive public-only SEO audit against production','public-tests-mobile:']],
    ['hh-public-performance-audit.yml','hh-public-performance',['Validate targeted safety and booking contracts','Measure public TTFB and HTML/RSC size']],
    ['hh-owner-telegram-video.yml','hh-owner-telegram-video',['Telegram and audio regression tests','Real 1080p MP4 with H264 AAC via ffmpeg-static','Verify shipped FFmpeg in owner Dot webhook function trace']],
  ];
  for(const [filename,group,contracts] of specs){
    const s=workflow(filename);
    assert.match(s,/^  pull_request:/m,filename+' must still validate PR changes');
    assert.match(s,/^  push:/m,filename+' must preserve trusted production release audit');
    assert.match(s,/^    paths:/m,filename+' must retain relevant path filters');
    assert.equal((s.match(/^concurrency:/gm)||[]).length,1,filename+' requires exactly one concurrency block');
    assert.ok(s.includes('group: '+group+'-'+suffix),filename+' must only group the same PR');
    assert.ok(s.includes('cancel-in-progress: '+guard),filename+' must never cancel manual/PUSH runs');
    assert.match(s,/^permissions:\s*\n  contents: read/m,filename+' must stay read only');
    assert.doesNotMatch(s,/continue-on-error:\s*true/,filename+' must never hide E2E failures');
    for(const marker of contracts)assert.ok(s.includes(marker),filename+' lost '+marker);
  }
  assert.match(workflow('hh-live-seo-audit.yml'),/^  workflow_dispatch:/m);
  assert.match(workflow('hh-public-performance-audit.yml'),/^  workflow_dispatch:/m);
});

// Preserve #2652's already merged, independent path-scope regression.
test('mobile-mock-only QA does not fan out into unrelated 20-minute public-service and Ideas workflows', () => {
  const prPaths = name => {
    const trigger = workflow(name).split('  pull_request:')[1].split(/^  [a-z_]+:|^permissions:/m)[0];
    return [...trigger.matchAll(/^      - '([^']+)'$/gm)].map(item=>item[1]);
  };
  const covers = (patterns, file) => {
    let included = false;
    for (const pattern of patterns) {
      const negative = pattern.startsWith('!');
      if (requireGlob(file, negative ? pattern.slice(1) : pattern)) included = !negative;
    }
    return included;
  };
  const publicServices = prPaths('hh-public-services-production.yml');
  const ideas = prPaths('hh-ideas-coaching-public.yml');
  const mock = prPaths('hh-support-mobile-mock-browser.yml');
  for (const file of [
    'scripts/verify-holistic-support-mock-fidelity.mjs',
    'tests/holistic-support-mobile-mock-parity.test.mjs',
  ]) {
    assert.equal(covers(mock,file),true,file+' must still run real Chromium/WebKit mock QA');
    assert.equal(covers(publicServices,file),false,file+' must not trigger unrelated services acceptance');
  }
  assert.equal(covers(ideas,'tests/holistic-support-mobile-mock-parity.test.mjs'),false);
  for (const file of [
    'components/holistic-support-mobile.tsx',
    'tests/holistic-support-mobile-alternative.test.mjs',
    'scripts/verify-holistic-master-browser.mjs',
    'app/ru/holistic-support/page.tsx',
    'app/api/payments/some-service/route.ts',
    'tests/temple-support-hub.test.mjs',
  ]) assert.equal(covers(publicServices,file),true,file+' must still enforce full services acceptance');
  for (const file of [
    'components/ideas-discovery.tsx',
    'tests/holistic-support-first-screen.test.mjs',
    'scripts/verify-holistic-support-browser.mjs',
  ]) assert.equal(covers(ideas,file),true,file+' must still exercise real Ideas/Coaching routes');
  assert.ok(workflow('hh-support-mobile-mock-browser.yml').includes('node scripts/verify-holistic-support-mock-fidelity.mjs'));
});

test('Reports Development Programme keeps its focused verification and separate Core production build', () => {
  const core = workflow('hh-pr-core-release.yml');
  const reports = workflow('hh-reports-development-program.yml');
  const gate = "if: $" + "{{ github.event_name == 'workflow_dispatch' || (github.event_name == 'push' && github.ref != 'refs/heads/codex/public-book-library') || (github.event_name == 'pull_request' && github.event.pull_request.base.ref != 'codex/public-book-library') }}";
  assert.match(core, /^  release-ready:/m);
  assert.match(core, /ci-specialist-aggregate\.mjs/);
  assert.match(reports, /^  pull_request:/m);
  assert.match(reports, /^  push:/m);
  assert.ok(reports.includes('.github/workflows/hh-reports-development-program.yml'));
  assert.ok(reports.includes('- name: Verify production Next.js build without preview deployment\n        '+gate+'\n        run: npm run build'));
  assert.ok(reports.includes('tests/reports-development-program.test.mjs'));
  assert.ok(reports.includes('tests/goal-profile-journey.test.mjs'));
  assert.match(reports, /node --conditions=react-server --test/);
  assert.match(reports, /npx --no-install eslint/);
  assert.doesNotMatch(reports,/continue-on-error:\s*true/);
});

 
test('proven CI fast wins remove duplicate jobs but preserve domain coverage',()=>{
  const guarded="if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  for(const [file,step,contract] of [
    ['dao-iching-library.yml','Build exact app (without Vercel paid preview)','tests/dao-hexagrams.test.mjs'],
    ['admin-seo-dashboard.yml','Production build','tests/admin-seo-dashboard.test.mjs'],
    ['compact-lead-capture-ci.yml','TypeScript and production build with unchanged payment gates','tests/compact-lead-channel-handoff.test.mjs'],
  ]){
    const source=workflow(file);
    assert.ok(source.includes('- name: '+step+'\n        '+guarded+'\n'),file+' global build must be delegated to protected Core');
    assert.ok(source.includes(contract),file+' original specialist contracts still mandatory');
  }
  const crm=workflow('hh-crm-source-check.yml');
  assert.match(crm,/^  crm:\s*$/m);
  assert.doesNotMatch(crm,/^  build:\s*$/m);
  assert.ok(crm.includes('tests/crm-security-contract.test.mjs'));
  assert.ok(crm.includes("if: ${{ always() && github.event_name == 'workflow_dispatch' }}"));
  const app=workflow('hh-app-browser.yml');
  assert.equal((app.match(/^      matrix:/gm)||[]).length,1);
  assert.ok(app.includes("fromJSON(github.event_name == 'workflow_dispatch'"),
    'ordinary PR must route to just one core Chromium job');
  assert.ok(app.includes('{"include":[{"browser":"chromium","suite":"core"}]}'),
    'ordinary PR must have exactly one browser task');
  assert.ok(app.includes('{"browser":"webkit","suite":"extended"}'),
    'legacy full matrix must run only when manually requested');
  assert.ok(app.includes('run: test "$MATRIX_RESULT" = success'));
  const voice=workflow('andrey-voice-free-contract.yml');
  assert.doesNotMatch(voice,/^  production-build:\s*$/m);
  assert.match(voice,/^  redis-atomic:\s*$/m);
  assert.ok(voice.includes('test_andrey_voice_local_engine.py'));
  assert.ok(voice.includes('Independent Next.js production build'));
  const perf=workflow('hh-public-performance-audit.yml');
  assert.ok(perf.includes("if: ${{ github.event_name != 'pull_request' }}"));
  assert.match(perf,/^  push:\s*$/m);
  const services=workflow('hh-public-services-production.yml');
  assert.ok(services.includes('npm run build')&&services.includes('node scripts/verify-public-services-production.mjs'));
  assert.ok(!services.includes('npx tsc --noEmit'));
});

test('Mandala PR runs focused source contracts and manual dispatch owns exhaustive media engines', () => {
  const yaml = workflow('holistic-support-mandala.yml');
  const source = readFileSync(join(root, 'scripts', 'verify-holistic-mandala-browser.mjs'), 'utf8');
  assert.match(yaml, /focused-unit-types-build:/);
  assert.doesNotMatch(yaml, /mandala-next-v1-/, 'obsolete Next compiler cache removed');
  assert.match(yaml, /^  workflow_dispatch:/m);
  assert.ok(yaml.includes("if: github.event_name == 'workflow_dispatch' && steps.impact.outputs.browser == 'true'"), 'full media browser must be manual-only');
  assert.ok(yaml.includes("if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}"),
    'mandatory Core owns production PR typecheck; standalone TypeScript remains');
  assert.match(yaml, /run: npm run build/);
  assert.match(yaml, /node scripts\/verify-holistic-mandala-browser\.mjs/);
  assert.match(source, /const engines = \[\["webkit", webkit\], \["chromium", chromium\]\]/);
  assert.match(source, /for \(const \{ locale, width \} of orderedViewports\)/);
  assert.doesNotMatch(source, /viewports\.slice\(from, from \+ 2\)/, 'no extra same-engine contexts');
  assert.match(source, /Promise\.allSettled\(engines\.map\(runEngine\)\)/);
  assert.match(source, /if \(rejectedEngines\.length\)/);
  assert.match(source, /assert\.equal\(passes, viewports\.length \* engines\.length/);
  for (const contract of [
    'locale: "ru", width: 320', 'locale: "ru", width: 390', 'locale: "ru", width: 430',
    'locale: "en", width: 390', 'locale: "es", width: 390',
    'ffprobe', 'ffmpeg', 'data-mandala-video-download', 'data-video-audio-player',
    'data-video-photo-consent', 'assert.deepEqual(uploaded,', 'pageerror',
  ]) assert.ok(source.includes(contract), 'lost real acceptance contract ' + contract);
});

test('core release checkout preserves ancestry jobs and pins exact base for bounded aggregation', () => {
  const source = workflow('hh-pr-core-release.yml');
  const scope = source.split(/^  scope:/m)[1]?.split(/^  code:/m)[0];
  const code = source.split(/^  code:/m)[1]?.split(/^  release-ready:/m)[0];
  const release = source.split(/^  release-ready:/m)[1];
  for (const [name, job] of [['scope', scope], ['code', code]]) {
    assert.match(job, /fetch-depth:\s*0/, `${name} requires ancestry for verified merge-parent selection`);
    assert.match(job, /git merge-base --is-ancestor/, `${name} must retain fail-closed ancestry verification`);
    assert.doesNotMatch(job, /fetch-depth:\s*2/);
  }
  assert.equal((source.match(/fetch-depth:\s*0/g) ?? []).length, 2);
  assert.match(release, /fetch-depth:\s*2/, 'aggregation only needs exact commit content, not ancestry');
  assert.equal((source.match(/fetch-depth:\s*2/g) ?? []).length, 1);
  assert.equal((release.match(/Pin exact production base for shallow checkout/g) ?? []).length, 1);
  assert.equal((release.match(/git fetch --no-tags --depth=1 origin "\$BASE_SHA"/g) ?? []).length, 1);
  assert.equal((release.match(/git cat-file -e "\$BASE_SHA\^\{commit\}"/g) ?? []).length, 2);
  assert.match(source, /git diff --no-renames --name-only -z/, 'scope must still diff actual base');
  assert.match(release, /git show/, 'immutable base specialist aggregate must remain');
  assert.match(release, /scripts\/ci-specialist-aggregate\.mjs/);
  assert.match(release, /timeout-minutes: 45/);
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});

test('native auto-merge preserves stacked-child ancestry while keeping squash for unrelated PRs', () => {
  const source = readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  assert.match(source, /pull_request_target:/);
  assert.match(source, /pull-requests: write/);
  assert.match(source, /head\.repo\.full_name == github\.repository/);
  assert.match(source, /draft == false/);
  assert.ok(source.includes('PR_HEAD_BRANCH: ${{ steps.ready.outputs.branch }}'));
  // A parent with an open child (even Draft) must retain its ancestry.
  assert.ok(source.includes('gh pr list --repo "$GH_REPO" --state open --base "$PR_HEAD_BRANCH" --json number --limit 1'));
  assert.match(source, /if ! stacked_children=/, 'failed child lookup must fail closed');
  assert.match(source, /0\) merge_option=--squash; export HH_EXPECTED_MERGE_METHOD=SQUASH/);
  assert.match(source, /1\) merge_option=--merge; export HH_EXPECTED_MERGE_METHOD=MERGE/);
  assert.ok(source.includes('gh pr merge "$PR_NUMBER" --auto "$merge_option" --match-head-commit "$PR_HEAD"'));
  assert.match(source, /attempt<=3/);
  assert.match(source, /Unable to determine if workflow can be created or updated due to timeout/);
  assert.ok(source.includes('.headRefOid == env.PR_HEAD and .autoMergeRequest.mergeMethod == env.HH_EXPECTED_MERGE_METHOD'));
  assert.doesNotMatch(source, /checkout@|--admin|--delete-branch/);
});

test('core production build is the single TypeScript gate and cannot ignore errors', () => {
  const core=workflow('hh-pr-core-release.yml');
  const config=readFileSync(join(root,'next.config.ts'),'utf8');
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  assert.doesNotMatch(core,/run: npx --no-install tsc --noEmit --pretty false/);
  assert.match(core,/run: npm run build/);
  assert.equal(pkg.scripts.build,'next build');
  assert.doesNotMatch(config,/ignoreBuildErrors/);
});

test('core cancels only when a synchronize event changes the PR head', () => {
  const source = workflow('hh-pr-core-release.yml');
  assert.ok(source.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"));
  assert.match(source, /group: hh-pr-core-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}/);
});

test('central CI utilities isolate non-PR runs and cancel only for a new PR head', () => {
  for (const [file, prefix] of [['hh-actionlint.yml', 'hh-workflow-lint'], ['hh-pr-sweep-guard.yml', 'hh-pr-sweep-guard']]) {
    const source = workflow(file);
    assert.ok(source.includes("group: " + prefix + "-${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"), file);
    assert.ok(source.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"), file);
  }
});

test('report-only production pushes rerun original report progress assertions without repeating Next build', () => {
  const src=workflow('hh-reports-development-program.yml');
  const isolated=src.split('  isolated-unit-lint-build:')[1];
  assert.ok(isolated, 'Retained reports workflow must keep real tests');
  assert.ok(src.includes("branches: ['codex/reports-development-program-20261017', 'codex/public-book-library']"), 'Post-merge production verification must remain');
  for(const command of ['tests/report-progress-before-after.test.mjs','tests/client-report-before-after-rings.test.mjs','tests/session-publication-review.test.mjs']) {
    assert.ok(isolated.includes(command),'Original report test missing: '+command);
  }
  const step=isolated.split('      - name: Verify production Next.js build without preview deployment')[1]?.split('      - ')[0] || isolated.split('      - name: Verify production Next.js build without preview deployment')[1];
  assert.ok(step, 'Standalone build fallback must remain');
  assert.ok(step.includes("github.ref != 'refs/heads/codex/public-book-library'"), 'No redundant prod-push Next build');
  assert.ok(step.includes("github.event_name == 'workflow_dispatch'"), 'Manual validation keeps a full build');
  assert.ok(step.includes("github.event.pull_request.base.ref != 'codex/public-book-library'"), 'Nonproduction PRs retain build');
  assert.match(step,/run: npm run build/);
});

test('trusted native auto-merge can use a repo-scoped token to preserve push events', () => {
  const source = workflow('hh-native-auto-merge.yml');
  assert.ok(source.includes('GH_TOKEN: ${{ secrets.HH_AUTOMERGE_TOKEN || github.token }}'));
  assert.match(source, /pull_request_target:/);
  assert.doesNotMatch(source, /checkout@|--admin/);
});

test('release aggregation selects and verifies the actual tested merge parent', () => {
  const source = workflow('hh-pr-core-release.yml');
  assert.ok(source.includes('HH_TRUSTED_BASE_SHA='), 'the tested merge parent must be exported');
  assert.ok(source.includes('git rev-parse HEAD^2'), 'the checkout must belong to the exact PR head');
  assert.ok(source.includes('compare/$BASE_SHA...$first_parent'), 'a newer checkout parent must descend from the event base');
  assert.ok(source.includes('git show "$HH_TRUSTED_BASE_SHA:scripts/ci-specialist-aggregate.mjs"'));
});

test('verified merge checkout uses the tested base and PR-only diff, and fails closed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hh-trusted-merge-base-'));
  const common = { ...process.env, HOME: dir, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Synthetic', GIT_AUTHOR_EMAIL: 'synthetic@example.invalid',
    GIT_COMMITTER_NAME: 'Synthetic', GIT_COMMITTER_EMAIL: 'synthetic@example.invalid' };
  const run = (cmd, args, env = {}) => spawnSync(cmd, args, { cwd: dir, encoding: 'utf8', timeout: 10000, env: { ...common, ...env } });
  const git = (...args) => { const out = run('git', ['-c', 'core.hooksPath=/dev/null', ...args]); assert.equal(out.status, 0, out.stderr); return out.stdout.trim(); };
  try {
    git('init', '--quiet');
    writeFileSync(join(dir, 'original.txt'), 'base'); git('add', '.'); git('commit', '--quiet', '-m', 'base');
    const eventBase = git('rev-parse', 'HEAD');
    git('switch', '--quiet', '-c', 'feature');
    writeFileSync(join(dir, 'pr.txt'), 'change'); git('add', '.'); git('commit', '--quiet', '-m', 'PR');
    const head = git('rev-parse', 'HEAD');
    git('switch', '--quiet', '-c', 'production', eventBase);
    writeFileSync(join(dir, 'other.txt'), 'unrelated production'); git('add', '.'); git('commit', '--quiet', '-m', 'production');
    const actualBase = git('rev-parse', 'HEAD');
    git('merge', '--quiet', '--no-ff', 'feature', '-m', 'GitHub merge');
    const merge = git('rev-parse', 'HEAD');
    const env = { HH_TRUSTED_BASE_SHA: actualBase, GITHUB_SHA: merge };
    assert.equal(verifiedCheckoutBase(env, { head }, dir), actualBase);
    assert.deepEqual(checkoutChangedRows(actualBase, dir), [{ status: 'A', filename: 'pr.txt' }]);
    assert.throws(() => verifiedCheckoutBase({ ...env, HH_TRUSTED_BASE_SHA: eventBase }, { head }, dir), /UNVERIFIED_MERGE_CHECKOUT/);
    assert.throws(() => verifiedCheckoutBase({ ...env, GITHUB_SHA: eventBase }, { head }, dir), /UNVERIFIED_MERGE_CHECKOUT/);
    assert.throws(() => verifiedCheckoutBase(env, { head: eventBase }, dir), /UNVERIFIED_MERGE_CHECKOUT/);

    const source = workflow('hh-pr-core-release.yml');
    const step = source.match(/^      - name: Pin exact production base for shallow checkout\n([\s\S]*?)(?=^      - (?:name|uses):)/m);
    assert.ok(step, 'trusted base step must exist');
    const block = step[1].match(/^        run: \|\n([\s\S]*)$/m);
    assert.ok(block, 'trusted base step must contain a shell script');
    const shell = block[1].replace(/^          /gm, '');
    const gh = join(dir, 'gh');
    writeFileSync(gh, '#!/bin/sh\nprintf "%s\\n" "$TEST_COMPARE_STATUS"\n'); chmodSync(gh, 0o700);
    const output = join(dir, 'github-env');
    const variables = { PATH: dir + ':' + process.env.PATH, BASE_SHA: eventBase, PR_HEAD_SHA: head,
      GITHUB_SHA: merge, GITHUB_REPOSITORY: 'andylitvinov-design/books', GITHUB_ENV: output, TEST_COMPARE_STATUS: 'ahead' };
    const ok = run('bash', ['--noprofile', '--norc', '-c', shell], variables);
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(readFileSync(output, 'utf8').trim(), 'HH_TRUSTED_BASE_SHA=' + actualBase);
    assert.notEqual(run('bash', ['--noprofile', '--norc', '-c', shell], { ...variables, TEST_COMPARE_STATUS: 'diverged' }).status, 0);
    assert.notEqual(run('bash', ['--noprofile', '--norc', '-c', shell], { ...variables, PR_HEAD_SHA: eventBase }).status, 0);
    assert.notEqual(run('bash', ['--noprofile', '--norc', '-c', shell], { ...variables, GITHUB_SHA: eventBase }).status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('five other specialists delegate TypeScript/build while Public Journey single-owner consolidation remains intact', () => {
  const core = workflow('hh-pr-core-release.yml');
  assert.match(core, /name: Exact proposed release production build and TypeScript check/);
  assert.match(core, /run: npm run build/);
  assert.match(core, /^  release-ready:/m);
  const gate = "if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  for (const [file, name, command] of [
    ['hh-growth-studio.yml','Next.js build','npm run build'],
    ['hh-messages-wellness-v2.yml','TypeScript check','npx --no-install tsc --noEmit'],
  ]) {
    const src = workflow(file);
    assert.ok(src.includes('- name: ' + name + '\n        ' + gate + '\n        run: ' + command), file + ' must preserve nonproduction check');
  }
  // This owner was consolidated independently in production; do not restore its retired jobs.
  const journey = workflow('hh-public-journey-wave1.yml');
  for (const evidence of ['node scripts/verify-public-pathway-mobile.mjs',
    'node scripts/verify-public-pathway-toronto-mobile.mjs',
    'tests/public-pathway-toronto.test.mjs',
    'Whole-project TypeScript outside protected production PRs',
    'Build exact candidate once for both real-browser suites']) {
    assert.ok(journey.includes(evidence), 'consolidated Public Journey owner lost '+evidence);
  }
  for (const [file, evidence] of [
    ['practice-google-browser.yml',['node scripts/verify-practice-post-google-browser.mjs','tests/practice-google-return-and-services-v5.test.mjs']],
    ['practice-visual-browser.yml',['node scripts/verify-practice-visual-browser.mjs','tests/compare-ui-screenshots.test.mjs']],
    ['hh-alchemy-mobile-acceptance.yml',['node scripts/verify-alchemy-one-screen.mjs','npm run build','tests/alchemy-soul-mobile-landing.test.mjs']],
  ]) {
    const src = workflow(file);
    assert.ok(src.includes('if [[ "$GITHUB_EVENT_NAME" != "pull_request" || "${GITHUB_BASE_REF:-}" != "codex/public-book-library" ]]; then'), file + ' nonproduction TypeScript must remain');
    assert.ok(src.includes('npx --no-install tsc --noEmit'), file + ' must keep nonproduction TypeScript');
    assert.ok(src.includes("Full TypeScript delegated to required Core release-ready"), file + ' must delegate production typing');
    for (const item of evidence) assert.ok(src.includes(item), file + ' must preserve ' + item);
    assert.doesNotMatch(src, /continue-on-error:\s*true/);
  }
});


test('Practice visual PR does not repeat Google-auth browser or old Chromium/WebKit overlays', () => {
  const source = workflow('practice-visual-browser.yml');
  const core = workflow('hh-pr-core-release.yml');
  assert.match(source, /^  pull_request:/m, 'retain fast source tests on PR');
  assert.match(source, /^  push:/m, 'retain post-merge real browser visuals');
  for (const name of [
    'Install Chromium and WebKit for synthetic UI verification',
    'Render and verify real Practice page at 320, 354, 390 and 430 pixels',
    'Generate reproducible Chromium-vs-WebKit visual overlays',
  ]) {
    assert.ok(source.includes('- name: '+name+"\n        if: github.event_name != 'pull_request'"),
      'duplicate browser work must not run for ordinary PR: '+name);
  }
  assert.match(source, /node --test tests\/compare-ui-screenshots\.test\.mjs/,
    'current visual tooling source contracts must still run');
  assert.ok(!source.includes('tests/capture-public-ui-reference.test.mjs tests/practitioner-preview-auth.test.mjs'),
    'Google auth source tests have a distinct owner');
  assert.match(core, /^  release-ready:/m);
});

test('native CI interruption recovery is one-time, exact-head and never bypasses failing code', () => {
  const workflow = readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  assert.match(workflow, /^  workflow_run:/m);
  assert.match(workflow, /^      - 'HH PR core release gate'$/m);
  const repair=workflow.split(/^  recover-interrupted-core:\s*$/m)[1];
  assert.ok(repair,'missing recovery job');
  for(const guard of [
    "github.event_name == 'workflow_run'",
    'event.run_attempt !== 1',
    'event.event !== "pull_request"',
    'event.repository?.full_name !== fullRepo',
    'event.head_repository?.full_name !== fullRepo',
    'live.head.sha !== reference.head.sha',
    'reference.base?.sha !== live.base.sha',
    'fresh.run_attempt !== 1',
    'jobData.total_count > 100',
    'event.conclusion !== "failure"',
    '["cancelled","skipped","timed_out"].includes(job.conclusion)',
    'github.rest.actions.reRunWorkflow',
  ]) assert.ok(repair.includes(guard),'recovery lost safety guard: '+guard);
  assert.match(repair,/actions: write/);
  assert.match(repair,/concurrency:/);
  assert.doesNotMatch(repair,/continue-on-error:|gh pr merge|update-branch|checkout@|force:/);
  assert.match(repair,/new release-ready SUCCESS still required/);
});

test('native AutoMerge reevaluates on CI completion, guards exact HEAD and avoids repeat ARM', () => {
  const source = workflow('hh-native-auto-merge.yml');
  const enable = source.split('  enable:\n')[1]?.split('  recover-interrupted-core:\n')[0];
  assert.ok(enable, 'missing event-driven enable job');
  assert.match(source, /^  workflow_run:\s*$/m);
  const workflowRun=source.split('  workflow_run:\n')[1]?.split('    types: [completed]')[0];
  assert.ok(workflowRun,'the trusted Core completion hook must exist');
  const callbacks=[...workflowRun.matchAll(/^\s+- '([^']+)'/gm)].map(match=>match[1]);
  assert.deepEqual(callbacks,['HH PR core release gate'],
    'Core release-ready already aggregates specialists; redundant callbacks exhaust the owner PAT');
  assert.ok(enable.includes("github.event_name == 'workflow_run'"), 'not event-driven');
  assert.ok(enable.includes("github.event.workflow_run.conclusion == 'success'"), 'must wake on successful CI');
  assert.ok(enable.includes('run.event !== "pull_request"'), 'must ignore other triggers');
  assert.ok(enable.includes('pr.draft'), 'must skip Draft');
  assert.ok(enable.includes('pr.head.repo?.full_name !== fullRepo'), 'must skip forks');
  assert.ok(enable.includes('pr.mergeable !== true'), 'must refuse conflicted PRs');
  assert.ok(enable.includes('expectedHead !== pr.head.sha'), 'must reject stale PR events');
  assert.ok(enable.includes('branch: pr.head.ref, per_page: 100'), 'must query PR branch because CI head_sha may be synthetic');
  assert.ok(enable.includes('completedRunId && !observed.some(run => run.id === completedRunId)'), 'must reject stale or misassociated CI events');
  assert.ok(enable.includes('coreRun.conclusion !== "success"'), 'must require green core CI');
  assert.ok(enable.includes('run.status !== "completed"'), 'must wait for ongoing specialists');
  assert.ok(enable.includes('["success","skipped","neutral"].includes(run.conclusion)'), 'must refuse red CI');
  assert.ok(enable.includes('"$current_method" == "$HH_EXPECTED_MERGE_METHOD"'), 'must avoid repeat ARM');
  assert.ok(enable.includes('current_method" != NONE'), 'must refuse unsafe merge-method switch');
  assert.ok(enable.includes('gh pr merge "$PR_NUMBER" --auto "$merge_option" --match-head-commit "$PR_HEAD"'));
  const recover = source.split(/^  recover-interrupted-core:\s*$/m)[1];
  assert.ok(recover?.includes("github.event.workflow_run.name == 'HH PR core release gate'"),
    'core interruption repair must not run for every specialist completion');
  assert.doesNotMatch(enable, /checkout@|--admin|--delete-branch|continue-on-error:/);
});


test('event-driven AutoMerge zero-required fallback remains normal protected exact-base merge only', () => {
  const source = workflow('hh-native-auto-merge.yml');
  const enable = source.split('  enable:\n')[1]?.split('  recover-interrupted-core:\n')[0];
  assert.ok(enable, 'missing trusted event-driven AutoMerge');
  assert.ok(enable.includes('core.setOutput("base", pr.base.sha);'));
  assert.ok(enable.includes('PR_BASE_SHA: ${{ steps.ready.outputs.base }}'));
  assert.ok(enable.includes("if grep -Eq 'Pull request is in (clean|unstable) status'"),
    'direct merge fallback must respond only to exact GitHub zero-required queue rejection');
  assert.ok(enable.includes('repos/$GH_REPO/rulesets/26269892'),
    're-read production hosted ruleset immediately before fallback');
  assert.ok(enable.includes('"$enforcement" != active || "$required_count" != 0'),
    'required contexts restored: normal protected fallback must stop');
  assert.ok(enable.includes('repos/$GH_REPO/git/ref/heads/codex/public-book-library'),
    'must independently read current production tip');
  assert.ok(enable.includes('"$current_base" != "$PR_BASE_SHA"'),
    'never merge after the production base changes');
  assert.ok(enable.includes('(.headRefOid == env.PR_HEAD)'),
    'immediately recheck exact PR HEAD');
  assert.ok(enable.includes('(.autoMergeRequest == null)'),
    'must not replace existing native AutoMerge');
  assert.ok(enable.includes('gh pr merge "$PR_NUMBER" "$merge_option" --match-head-commit "$PR_HEAD"'),
    'fallback must use the same protected merge method and optimistic HEAD lease');
  assert.ok(enable.includes('coreRun.conclusion !== "success"'),
    'never fall back if the current Core CI failed');
  assert.ok(enable.includes('run.status !== "completed"'),
    'never fall back while a current specialist workflow is still running');
  assert.doesNotMatch(enable, /--admin|--force|bypass_rulesets|continue-on-error:|checkout@/);
});

test('native AutoMerge wakes once after Core and reserves owner PAT for actual protected merge', () => {
  const source = readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  const marker='  workflow_run:\n', start=source.indexOf(marker);
  const end=source.indexOf('    types: [completed]',start);
  assert.ok(start>=0 && end>start,'Core workflow_run event must be preserved');
  const callbacks=[...source.slice(start,end).matchAll(/^\s+- '([^']+)'/gm)].map(match=>match[1]);
  assert.deepEqual(callbacks,['HH PR core release gate'],
    'no duplicate specialist CI wakeups that exhaust owner token');
  const readyStart=source.indexOf('      - name: Verify live PR and completed exact-head CI');
  const armStart=source.indexOf('      - name: Enable native auto-merge for this exact head',readyStart);
  assert.ok(readyStart>0 && armStart>readyStart);
  const readOnly=source.slice(readyStart,armStart);
  assert.ok(readOnly.includes('github-token: ${{ github.token }}'),
    'read-only preflight must use per-repo Actions token');
  assert.doesNotMatch(readOnly,/HH_AUTOMERGE_TOKEN/,
    'owner PAT must not be spent on every read-only CI wakeup');
  assert.ok(source.includes('GH_TOKEN: ${{ secrets.HH_AUTOMERGE_TOKEN || github.token }}'),
    'protected merge still uses the explicitly configured owner token');
  assert.ok(readOnly.includes('coreRun.conclusion !== "success"'));
  assert.ok(readOnly.includes('expectedHead !== pr.head.sha'));
  assert.ok(source.includes('1) merge_option=--merge'));
  assert.ok(!source.includes('recover-missing-required-ci:'), 'legacy recovery must not consume API budget');
  assert.ok(source.includes('recover-interrupted-core:'));
});

test('new hh-core-verified is a short fail-closed Core-only status, not specialist approval',()=>{
  const source=workflow('hh-pr-core-release.yml');
  const coreSection=source.match(/^  hh-core-verified:\n[\s\S]*?(?=^  release-ready:)/m)?.[0];
  assert.ok(coreSection,'new Core status must exist alongside old release-ready during migration');
  assert.match(coreSection,/^    name: hh-core-verified$/m);
  assert.match(coreSection,/^    needs: \[scope, code\]$/m);
  assert.match(coreSection,/^    if: always\(\)$/m);
  assert.match(coreSection,/^    timeout-minutes: 3$/m);
  assert.match(coreSection,/\[\[ "\$SCOPE_RESULT" == success \]\]/);
  assert.match(coreSection,/\[\[ "\$CODE_RESULT" == success \]\]/);
  assert.match(coreSection,/\[\[ "\$CODE_RESULT" == skipped \]\]/);
  assert.match(coreSection,/PR_DRAFT: \$\{\{ github\.event\.pull_request\.draft \}\}/);
  assert.doesNotMatch(coreSection,/ci-specialist-aggregate\.mjs|gh api|checkout@v4/);
  // A green Core result alone must NOT remove the old release specialist gate.
  assert.match(source,/^  release-ready:/m);
  assert.match(source,/ci-specialist-aggregate\.mjs/);
});

test('production-base impact analyzer runs CI-only contracts without unrelated Next build',()=>{
  const source=workflow('hh-pr-core-release.yml');
  const allow=source.split('# CI-only allowlist')[1]?.split('esac')[0];
  assert.ok(allow?.includes('lib/ci/production-base-impact.mjs'),'pure CI module must use CI-only route');
  assert.match(source,/node --test tests\/ci-workflow-globs\.test\.mjs tests\/workflow-next-route-filters\.test\.mjs tests\/ci-specialist-aggregate\.test\.mjs/);
  assert.ok(source.includes("if: needs.scope.outputs.ci_only != 'true'"),'CI-only route must not run full Next build');
});

test('event-driven CI recognizes synthetic merge SHA only through exact PR source and base', async () => {
  const native = workflow('hh-native-auto-merge.yml');
  const begin = native.indexOf('          script: |\n', native.indexOf('  enable:\n'));
  const end = native.indexOf('      - name: Enable native auto-merge for this exact head', begin);
  assert.ok(begin > 0 && end > begin, 'trusted preflight script missing');
  const lines = native.slice(begin + '          script: |\n'.length, end).split('\n');
  const code = lines.map(line => line.startsWith('            ') ? line.slice(12) : line).join('\n');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const preflight = new AsyncFunction('github', 'core', 'context', code);
  const repoName = 'andylitvinov-design/books';
  const head = 'a'.repeat(40), base = 'b'.repeat(40), synthetic = 'f'.repeat(40);
  const live = {
    number: 42, state: 'open', draft: false, mergeable: true, mergeable_state: 'clean',
    base: {ref: 'codex/public-book-library', sha: base},
    head: {sha: head, ref: 'feature/safe', repo: {full_name: repoName}},
  };
  const good = {
    id: 103, workflow_id: 31, event: 'pull_request', head_branch: live.head.ref,
    head_sha: synthetic, name: 'HH PR core release gate',
    path: '.github/workflows/hh-pr-core-release.yml@refs/pull/42/merge',
    status: 'completed', conclusion: 'success', created_at: '2026-11-01T14:00:00Z',
    pull_requests: [{number: 42, head: {ref: live.head.ref, sha: head},
      base: {ref: live.base.ref, sha: base}}],
  };
  const specialist = {...good, id: 104, workflow_id: 32, name: 'Holistic Support mandala release checks',
    path: '.github/workflows/holistic-support-mandala.yml@refs/pull/42/merge'};
  const event = {
    repo: {owner: 'andylitvinov-design', repo: 'books'},
    eventName: 'workflow_run',
    payload: {workflow_run: {id: 103, event: 'pull_request', conclusion: 'success',
      repository: {full_name: repoName}, head_repository: {full_name: repoName},
      head_branch: live.head.ref, pull_requests: [{number: 42,
        base: {ref: live.base.ref}}]}},
  };
  async function decide(runs, testedLive = live, expectedEvent = event, totalCount = runs.length) {
    const outputs = {}, args = [];
    const github = {rest: {
      pulls: {get: async () => ({data: testedLive}),
        list: async () => ({data: [testedLive]})},
      actions: {listWorkflowRunsForRepo: async params => {
        args.push(params);
        return {data: {total_count: totalCount, workflow_runs: runs}};
      }},
    }};
    await preflight(github, {setOutput: (k, v) => { outputs[k] = v; }, info: () => {}}, expectedEvent);
    if (args.length) {
      assert.equal(args[0].branch, live.head.ref, 'query must be branch-scoped');
      assert.equal(args[0].head_sha, undefined, 'synthetic workflow SHA is not source SHA');
    }
    return outputs.eligible === 'true';
  }
  assert.equal(await decide([good, specialist]), true, 'exact source association accepts synthetic CI SHA');
  assert.equal(await decide([good, {...specialist, conclusion: 'failure'}]), false, 'red specialist blocks ARM');
  assert.equal(await decide([{...good, pull_requests: []}]), false, 'missing association fails closed');
  assert.equal(await decide([{...good, pull_requests: [{
    number: 42, head: {ref: live.head.ref, sha: 'c'.repeat(40)}, base: live.base
  }]}]), false, 'old source SHA cannot authorize new HEAD');
  assert.equal(await decide([{...good, pull_requests: [{
    number: 42, head: live.head, base: {ref: live.base.ref, sha: 'c'.repeat(40)}
  }]}]), false, 'old production base cannot authorize ARM');
  assert.equal(await decide([good, specialist], {...live, draft: true}), false, 'Draft does not ARM');
  assert.equal(await decide([good, specialist], {...live, mergeable: false, mergeable_state: 'dirty'}), false,
    'conflicted PR does not ARM');
  assert.equal(await decide([good, specialist], live, {...event, payload: {
    workflow_run: {...event.payload.workflow_run, id: 999},
  }}), false, 'stale completion event cannot ARM');
  const historical = Array.from({length: 98}, (_, i) => ({
    ...good, id: 200 + i, pull_requests: [{number: 42,
      head: {ref: live.head.ref, sha: 'c'.repeat(40)}, base: live.base}],
  }));
  assert.equal(await decide([good, specialist, ...historical], live, event, 220), true,
    'more than 100 total historical runs does not hide current complete HEAD evidence');
  assert.equal(await decide(Array.from({length: 100}, (_, i) => ({
    ...good, id: 300 + i,
  })), live, event, 102), false, 'truncated current-head checks fail closed');
});
