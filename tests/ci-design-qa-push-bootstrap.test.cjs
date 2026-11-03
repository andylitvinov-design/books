'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const workflow = readFileSync('.github/workflows/hh-nightly-public-crawl.yml', 'utf8');

test('daily Toronto Design QA has a bounded one-time workflow-push recovery', () => {
  assert.ok(workflow.includes("cron: '7 5 * * *'"));
  assert.ok(workflow.includes("timezone: 'America/Toronto'"));
  const scopedPush = [
    '  push:',
    "    branches: ['codex/bootstrap-books']",
    "    paths: ['.github/workflows/hh-nightly-public-crawl.yml']"
  ].join('\n');
  assert.ok(workflow.includes(scopedPush), 'push may only target its own workflow file');
  const [seoPart,designPart] = workflow.split('  design-bible-public:');
  assert.ok(!!designPart);
  assert.ok(designPart.includes("github.event_name == 'push'"));
  assert.ok(designPart.includes("github.event_name == 'workflow_dispatch'"));
  assert.ok(designPart.includes("github.event.schedule == '7 5 * * *'"));
  assert.ok(designPart.includes('issues: write'));
  assert.ok(designPart.includes('scripts/holistic-light-design-qa.mjs'));
  assert.ok(designPart.includes('scripts/holistic-light-qa-handoff.mjs'));
  const seoJob = seoPart.split('  audit:')[1];
  assert.ok(!!seoJob);
  assert.ok(!seoJob.includes("github.event_name == 'push'"),
    'SEO audit must not run on one-time Design QA bootstrap');
  assert.ok(seoJob.includes("github.event.schedule == '15 7 * * *'"));
});
