import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
const core = read('hh-pr-core-release.yml');
const gate = "if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";

test('Core owns production PR type/build and specialists retain independent nonproduction checks',()=>{
  assert.match(core,/name: Exact proposed release production build and TypeScript check/);
  assert.match(core,/run: npm run build/);
  assert.match(core,/^  release-ready:/m);
  for(const name of ['hh-growth-journey.yml','hh-course-presets.yml']){
    const s=read(name);
    assert.ok(s.includes("      - 'tests/ci-growth-course-core-reuse.test.mjs'"),name+' policy test path missing');
    assert.ok(s.includes("run: node --test tests/ci-growth-course-core-reuse.test.mjs"),name+' policy test execution missing');
    assert.ok(s.includes("    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}"),name+' Draft work not gated');
    assert.ok(s.includes(gate),name+' nonproduction build gate missing');
    assert.doesNotMatch(s,/continue-on-error:\s*true/);
  }
});
test('Growth journey retains business, consent and account scope verification',()=>{
  const s=read('hh-growth-journey.yml');
  for(const path of ['tests/growth-journey-public.test.mjs','tests/business-consultation-finder.test.mjs',
    'tests/business-service-browser.test.mjs','tests/topic-journey-account-scope.test.mjs'])
    assert.ok(s.includes(path),'Growth evidence lost '+path);
  assert.doesNotMatch(s,/business-journey-consultation-banner\.test\.mjs/,
    'Retired Business landing oracle must not block current directions');
  assert.match(s,/name: TypeScript compatibility\n        if:/);
  assert.match(s,/name: Production build\n        if:/);
});
test('Course presets retain private saves, concurrency and curricula',()=>{
  const s=read('hh-course-presets.yml');
  for(const path of ['tests/course-presets.test.mjs','tests/my-course.test.mjs','tests/course-dashboard-integration.test.mjs',
    'tests/course-concurrency-ui.test.mjs','tests/course-free-slot-restart.test.mjs',
    'tests/energywork-ai-course-private-save.test.mjs']) assert.ok(s.includes(path),'Course evidence lost '+path);
  assert.ok(s.includes("--test-skip-pattern='one private six-milestone route reuses tests, insights and keeps mobile bottom navigation'"), 'Only one obsolete six-tab layout oracle may be skipped; original course suite remains');
  assert.ok(s.includes("group: hh-course-presets-${{ github.event_name == 'pull_request' && github.event.pull_request.number || github.run_id }}"));
  assert.ok(s.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' }}"));
});
