import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createFailureCollector, LIMITS, parseExitCodes } from '../scripts/summarize-unit-failures.mjs';

const root = '/checkout/public-repository';
const file = 'tests/public-example.test.mjs';
const collect = lines => {
  const collector = createFailureCollector({ allowedPaths: [file], repositoryRoot: root });
  for (const line of lines) collector.line(line);
  return collector.result();
};
const failure = (location = `file://${root}/${file}:12:3`) => [
  'not ok 1 - private title must not survive', '  ---', `  location: '${location}'`,
  "  failureType: 'testCodeFailure'", "  name: 'AssertionError'",
];

test('retains only checkout-allowlisted failure coordinates and fixed enums', () => {
  const result = collect(['TAP version 13', ...failure(), `    TestContext.<anonymous> (file://${root}/${file}:19:4)`, '  ...', '# tests 2', '# pass 1', '# fail 1']);
  assert.equal(result.tapHeaderSeen, true);
  assert.deepEqual(result.counters, { tests: 2, pass: 1, fail: 1 });
  assert.deepEqual(result.failures, [{ location: { file, line: 12, column: 3 }, assertionLocation: { file, line: 19, column: 4 }, errorClass: 'AssertionError', failureType: 'testCodeFailure' }]);
  assert.equal(result.observedFailureMarkers, 1);
});

test('titles, actual/expected values, credentials, headers, URL queries and user content are absent', () => {
  const secrets = ['sk_live_SECRET_SENTINEL', 'Bearer PRIVATE_SENTINEL', 'person@example.invalid', 'https://private.invalid/?token=TOKEN_SENTINEL', 'USER_CONTENT_SENTINEL', 'PrivateTokenSentinel'];
  const result = collect([...failure(), ...secrets.flatMap(secret => [`  error: '${secret}'`, `  expected: '${secret}'`, `  actual: '${secret}'`, `  ${secret}`, `  name: '${secret}'`, `  failureType: '${secret}'`]), '  ...']);
  const serialized = JSON.stringify(result);
  for (const secret of secrets) assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes('private title'), false);
  assert.equal(serialized.includes(root), false);
});

for (const value of [
  `https://private.invalid/${file}:12:3`, `/private/${file}:12:3`,
  `file://${root}/${file}:12:3?token=SECRET`, `${file}:12:3 SECRET`,
  `${file}:0:3`, `${file}:12:0`, `${file}:999999999:3`,
  'tests/untracked-secret.test.mjs:1:2', `tests/../${file}:1:2`,
  `file://${root}/tests/%70ublic-example.test.mjs:12:3`,
]) test(`rejects noncanonical location ${value.replace(root, '<checkout>')}`, () => {
  const result = collect([...failure(value), '  ...']);
  assert.equal(result.failures[0].location, null);
  assert.equal(result.unknownLocationFailures, 1);
});

test('relative public path accepted; a different file cannot become the assertion location', () => {
  const result = collect([...failure(`${file}:15`), `    private (${root}/tests/other.test.mjs:20:1)`, '  ...']);
  assert.deepEqual(result.failures[0].location, { file, line: 15, column: null });
  assert.equal(result.failures[0].assertionLocation, null);
});

test('passing test locations and error-like log text are negative controls', () => {
  const result = collect(['ok 1 - passing', `  location: '${root}/${file}:20:1'`, "  name: 'AssertionError'", '  ...', '# fail 0']);
  assert.deepEqual(result.failures, []);
  assert.equal(result.observedFailureMarkers, 0);
  assert.equal(result.counters.fail, 0);
});

test('a segment boundary cannot associate a tail location with a prefix failure', () => {
  const collector = createFailureCollector({ allowedPaths: [file], repositoryRoot: root });
  collector.line('not ok 1 - private'); collector.boundary();
  collector.line(`  location: '${root}/${file}:20:1'`);
  const result = collector.result();
  assert.equal(result.failures[0].location, null);
  assert.equal(result.unknownLocationFailures, 1);
});

test('oversized lines are discarded, counters are bounded, and absent TAP is not success', () => {
  const result = collect([...failure(), `  name: 'TypeError'${' '.repeat(LIMITS.lineBytes)}`, '# fail 999999999999', '  ...']);
  assert.equal(result.oversizedLines, 1);
  assert.equal(result.failures[0].errorClass, 'AssertionError');
  assert.equal(result.counters.fail, undefined);
  assert.equal(result.tapHeaderSeen, false);
  assert.deepEqual(collect([]).counters, {});
});

test('failure count and serialized output stay bounded; dropped records remain explicit', () => {
  const lines = Array.from({ length: LIMITS.failures + 5 }, (_, index) => [`not ok ${index + 1} - PRIVATE`, `  location: '${root}/${file}:20:1'`, '  ...']).flat();
  const result = collect(lines);
  assert.equal(result.failures.length, LIMITS.failures);
  assert.equal(result.droppedFailureRecords, 5);
  assert.equal(result.observedFailureMarkers, LIMITS.failures + 5);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 65536);
});

test('invalid allowlist entries never enable arbitrary private paths', () => {
  const collector = createFailureCollector({ allowedPaths: ['tests/secret?token.test.mjs', '../tests/secret.test.mjs'], repositoryRoot: root });
  collector.line('not ok 1 - private'); collector.line("  location: 'tests/secret?token.test.mjs:1:1'");
  assert.equal(collector.result().failures[0].location, null);
});

test('exit receipt keeps command and pipefail failure, rejects malformed or incomplete evidence', () => {
  assert.deepEqual(parseExitCodes('7 0 7\n'), { command: 7, capture: 0, pipeline: 7 });
  assert.deepEqual(parseExitCodes('7 9 9\n'), { command: 7, capture: 9, pipeline: 9 });
  assert.deepEqual(parseExitCodes('0 0 0\n'), { command: 0, capture: 0, pipeline: 0 });
  for (const value of [null, '', '0 0', '7 0 0', '0 9 0', '256 0 256', '0 0 0\nSECRET', 'SECRET'.repeat(100)]) assert.equal(parseExitCodes(value), null);
});

test('workflow preserves the fatal full command and uploads only the exact sanitized summary', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ia-v2.yml', import.meta.url), 'utf8');
  const block = workflow.slice(workflow.indexOf('      - name: Broad unit tests'), workflow.indexOf('      - name: Source-content validators'));
  assert.match(block, /set -euo pipefail/);
  assert.match(block, /npm run test:unit 2>&1 \| tee "\$RUNNER_TEMP\/ia-unit-local\/unit\.log"/);
  assert.match(block, /statuses=\("\$\{PIPESTATUS\[@\]\}"\)/);
  assert.match(block, /exit "\$pipeline_exit"/);
  assert.match(block, /if: always\(\)[\s\S]*UNIT_TEST_OUTCOME: \$\{\{ steps\.unit_tests\.outcome \}\}/);
  assert.match(block, /path: \$\{\{ runner\.temp \}\}\/ia-unit-summary\.json/);
  assert.doesNotMatch(block, /continue-on-error|\|\| true|--test-name-pattern|--test-skip-pattern/);
  assert.equal((block.match(/npm run test:unit/g) ?? []).length, 1);
  assert.doesNotMatch(block, /path:.*(?:unit\.log|ia-unit-local|\*)/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /path: \/tmp\/ia222-evidence\//);
});
