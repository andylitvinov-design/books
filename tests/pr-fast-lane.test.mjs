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
  assert.match(source, /tsc --noEmit/);
  assert.match(source, /npm run build/);
  assert.match(source, /ci-specialist-aggregate\.mjs/);
  assert.match(source, /git show/);
  assert.match(source, /HH_HEAD_REPO/);
  assert.match(source, /HH_BASE_SHA:scripts\/ci-specialist-aggregate\.mjs/);
  assert.match(source, /HH_HEAD_SHA/);
  assert.match(source, /HH_BASE_SHA/);
  assert.match(source, /actions: read/);
  assert.match(source, /pull-requests: read/);
  assert.match(source, /timeout-minutes: 20/);
  assert.match(source, /\[\[ "\$SCOPE_RESULT" == success \]\]/);
  assert.match(source, /\[\[ "\$CODE_RESULT" == success \]\]/);
  assert.doesNotMatch(source, /continue-on-error:\s*true/);
});

test('PR automation policy and agent entry point require specialist safety gates', () => {
  const docs = readFileSync(join(root, 'docs', 'operations', 'PR_FAST_LANE_20261029.md'), 'utf8');
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(docs, /necessary but not sufficient/);
  for (const requiredSafetyGate of ['RLS', 'auth', 'privacy', 'payment']) {
    assert.match(docs, new RegExp(requiredSafetyGate, 'i'));
  }
  assert.match(docs, /GitHub administrator setup|administrator setup/i);
  assert.match(agents, /PR_FAST_LANE_20261029\.md/);
  assert.match(agents, /release-ready/);
});

// Exercise only the classifier shell block in a disposable synthetic Git repository.
// Never execute workflow jobs, package scripts, application modules or providers.
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

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

test('Director-only changes run Mandala media QA, not unrelated public services E2E',()=>{
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
  ]){
    assert.equal(covers(service,file),false,file+' should not run unrelated Alchemy/storefront');
    assert.equal(covers(mandala,file),true,file+' must still run real video/browser checks');
  }
  for(const file of [
    'components/mandala-free-video-studio.tsx',
    'components/mandala-meditation-client.tsx',
    'components/holistic-support-mobile.tsx',
    'scripts/verify-holistic-master-browser.mjs',
    'scripts/verify-holistic-support-recommendations-mobile.mjs',
    'app/en/holistic-support/mandala/page.tsx',
    'tests/practitioner-remote-energy-support.test.mjs',
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
];

for (const [name, from, to, operation, expected, event = 'pull_request', missingBase = false] of classifierCases) {
  test(`docs-only classifier: ${name}`, () => {
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
      const block = source.match(/        run: \|\n([\s\S]*?)^  code:/m);
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
        assert.equal(readFileSync(join(dir, 'output'), 'utf8').trim(), `docs_only=${expected}`);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

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
    assert.ok(!patterns.includes('.github/workflows/' + name), name + ' must use core/actionlint for YAML-only changes');
    assert.ok(patterns.includes('package.json') && patterns.includes('package-lock.json'), name + ' lost dependency change coverage');
    assert.ok(patterns.some(pattern => /^app\/|^components\/|^lib\/|^tests\//.test(pattern)), name + ' lost product source coverage');
  }
});

test('App R1 and IA retain specialist tests but avoid duplicate global validation on production PRs', () => {
  const core = workflow('hh-pr-core-release.yml');
  assert.match(core, /run: npm run build/);
  assert.match(core, /tsc --noEmit/);
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
  assert.match(ia, /run: npm run test:unit/);
  assert.match(ia, /run: npm run build/);
  assert.match(ia, /run: npm run verify:ia-v2/);
});

test('four source-only specialist suites delegate duplicate TypeScript or build to unconditional production release-ready', () => {
  const skip = "if: $" + "{{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  const core = workflow('hh-pr-core-release.yml');
  assert.match(core, /run: npm run build/);
  assert.match(core, /tsc --noEmit/);
  const specs=[
    ['hh-growth-journey.yml',[['TypeScript compatibility','npx --no-install tsc --noEmit'],['Production build','npm run build']],['tests/growth-journey-public.test.mjs','tests/topic-journey-account-scope.test.mjs']],
    ['hh-public-test-collections.yml',[['Verify Next.js production build','npm run build']],['tests/public-test-topic-collections.test.mjs','tests/profile-construct-axes.test.mjs']],
    ['hh-course-presets.yml',[['Next production compile','npm run build']],['tests/course-presets.test.mjs','tests/course-free-slot-restart.test.mjs']],
    ['hh-kling-video.yml',[['TypeScript','npx tsc --noEmit'],['Next.js build','npm run build']],['tests/kling-video.test.mjs','tests/kling-avatar.test.mjs']],
  ];
  for(const [filename,guardedSteps,domainContracts] of specs){
    const s=workflow(filename);
    for(const [name,command] of guardedSteps){
      const exact='- name: '+name+'\n        '+skip+'\n        run: '+command;
      assert.ok(s.includes(exact), filename+' must retain global '+name+' outside production-targeted PR only');
    }
    for(const src of domainContracts) assert.ok(s.includes(src),filename+' domain contract removed: '+src);
    assert.ok(!s.includes('continue-on-error: true'),filename+' cannot bypass real test errors');
  }
  for(const filename of ['hh-course-presets.yml','hh-kling-video.yml']) {
    const s=workflow(filename);
    assert.match(s,/^concurrency:/m,filename+' must cancel outdated PR runs');
    assert.match(s,/cancel-in-progress: \$\{\{ github.event_name == 'pull_request' \}\}/);
  }
});
