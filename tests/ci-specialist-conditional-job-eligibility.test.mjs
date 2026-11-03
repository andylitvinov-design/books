import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectJobs, trustedConditionallyInapplicableJobs } from '../lib/ci/specialist-aggregate.mjs';

const repository='andylitvinov-design/books';
const pr=(headRef='feat/mytube-unified-six-bottom',baseRef='codex/public-book-library')=>({
  number:3213,state:'open',draft:false,
  head:{sha:'a'.repeat(40),ref:headRef,repo:{full_name:repository}},
  base:{sha:'b'.repeat(40),ref:baseRef,repo:{full_name:repository}},
});
const workflow=`on:
  pull_request:
    branches: ['codex/public-book-library']
jobs:
  writer-practical-focused:
    if: ${{ github.event_name == 'pull_request' && (github.event.pull_request.base.ref == 'codex/holistic-intelligence-core-20261029' || github.event.pull_request.base.ref == 'codex/public-book-library') && github.head_ref == 'feat/meditation-writer-device-v1-20261030' }}
    runs-on: ubuntu-24.04
  axis-unit-types-build:
    runs-on: ubuntu-24.04
`;
test('BASE condition false for this exact PR makes only that skipped job advisory',()=>{
  const allowed=trustedConditionallyInapplicableJobs(workflow,pr());
  assert.deepEqual(allowed,['writer-practical-focused']);
  const jobs=[
    {name:'writer-practical-focused',status:'completed',conclusion:'skipped'},
    {name:'axis-unit-types-build',status:'completed',conclusion:'success'},
  ];
  assert.equal(inspectJobs(jobs,'.github/workflows/hh-profile-axis-matching.yml',allowed),2);
  assert.throws(()=>inspectJobs(jobs,'.github/workflows/hh-profile-axis-matching.yml',[]),
    /UNSUCCESSFUL_SPECIALIST_JOB/);
});
test('same BASE condition remains required when the exact PR head matches',()=>{
  const allowed=trustedConditionallyInapplicableJobs(workflow,pr('feat/meditation-writer-device-v1-20261030'));
  assert.deepEqual(allowed,[]);
  const jobs=[
    {name:'writer-practical-focused',status:'completed',conclusion:'skipped'},
    {name:'axis-unit-types-build',status:'completed',conclusion:'success'},
  ];
  assert.throws(()=>inspectJobs(jobs,'.github/workflows/hh-profile-axis-matching.yml',allowed),
    /UNSUCCESSFUL_SPECIALIST_JOB/);
});
test('unknown functions, contexts and non-single-line guards never waive a skipped job',()=>{
  const unknownFunction=workflow.replace(
    "github.head_ref == 'feat/meditation-writer-device-v1-20261030'",
    "startsWith(github.head_ref, 'feat/meditation-writer-device-')");
  const unknownContext=workflow.replace('github.head_ref','github.actor');
  const multiline=workflow.replace(/    if: (.+)/, "    if: >-
      $1");
  assert.deepEqual(trustedConditionallyInapplicableJobs(unknownFunction,pr()),[]);
  assert.deepEqual(trustedConditionallyInapplicableJobs(unknownContext,pr()),[]);
  assert.deepEqual(trustedConditionallyInapplicableJobs(multiline,pr()),[]);
});
