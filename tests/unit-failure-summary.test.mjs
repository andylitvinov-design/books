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
  assert.deepEqual(result.failureFiles, [{ file, failures: 1 }]);
  assert.equal(result.droppedFailureFileRecords, 0);
  assert.equal(result.droppedFailureFileMarkers, 0);
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
  assert.deepEqual(result.failureFiles, []);
});

test('relative public path accepted; a different file cannot become the assertion location', () => {
  const result = collect([...failure(`${file}:15`), `    private (${root}/tests/other.test.mjs:20:1)`, '  ...']);
  assert.deepEqual(result.failures[0].location, { file, line: 15, column: null });
  assert.equal(result.failures[0].assertionLocation, null);
});

test('passing test locations and error-like log text are negative controls', () => {
  const result = collect(['ok 1 - passing', `  location: '${root}/${file}:20:1'`, "  name: 'AssertionError'", '  ...', '# fail 0']);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.failureFiles, []);
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
  assert.deepEqual(result.failureFiles, []);
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
  assert.deepEqual(result.failureFiles, [{ file, failures: LIMITS.failures + 5 }]);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 65536);
});

test('all scanned markers are grouped before either output cap, with exact omitted and unknown counts', () => {
  const paths = Array.from({ length: LIMITS.failureFiles + 3 }, (_, index) => `tests/group-${String(index).padStart(4, '0')}.test.mjs`);
  const collector = createFailureCollector({ allowedPaths: paths, repositoryRoot: root });
  for (const path of [...paths.flatMap(path => [path, path]), ...Array(3).fill(paths.at(-1))]) {
    for (const line of [...failure(`${path}:1:1`), '  ...']) collector.line(line);
  }
  for (const path of ['tests/untracked-private.test.mjs:1:1', 'https://private.invalid/?token=SECRET']) {
    for (const line of [...failure(path), '  ...']) collector.line(line);
  }
  const result = collector.result();
  assert.equal(result.failures.length, LIMITS.failures);
  assert.equal(result.failureFiles.length, LIMITS.failureFiles);
  assert.deepEqual(result.failureFiles[0], { file: paths.at(-1), failures: 5 });
  assert.deepEqual(result.failureFiles.slice(1), paths.slice(0, LIMITS.failureFiles - 1).map(file => ({ file, failures: 2 })));
  assert.equal(result.droppedFailureFileRecords, 3);
  assert.equal(result.droppedFailureFileMarkers, 6);
  assert.equal(result.unknownLocationFailures, 2);
  assert.equal(result.observedFailureMarkers, paths.length * 2 + 5);
  assert.equal(result.droppedFailureRecords, result.observedFailureMarkers - LIMITS.failures);
  assert.equal(result.failureFiles.reduce((sum, group) => sum + group.failures, 0) + result.droppedFailureFileMarkers + result.unknownLocationFailures, result.observedFailureMarkers);
  assert.deepEqual(collector.result(), result, 'repeated result/boundary calls never double-count');
  collector.boundary();
  assert.deepEqual(collector.result(), result);
  assert.doesNotMatch(JSON.stringify(result), /untracked-private|private\.invalid|SECRET|private title/);
});

test('a gap, unknown locations and footer totals never invent per-file failures', () => {
  const collector = createFailureCollector({ allowedPaths: [file], repositoryRoot: root });
  collector.line('not ok 1 - private prefix');
  collector.boundary();
  collector.line(`  location: '${file}:3:1'`);
  collector.line('# fail 999');
  for (const line of [...failure(`${file}:4:1`), '  ...']) collector.line(line);
  collector.line('not ok 3 - private partial');
  collector.oversizedLine();
  collector.boundary();
  const result = collector.result();
  assert.deepEqual(result.failureFiles, [{ file, failures: 1 }]);
  assert.equal(result.counters.fail, 999);
  assert.equal(result.observedFailureMarkers, 3);
  assert.equal(result.unknownLocationFailures, 2);
  assert.equal(result.droppedFailureFileRecords, 0);
  assert.equal(result.droppedFailureFileMarkers, 0);
});

test('an 80-record synthetic excerpt cannot reconstruct 301 unseen failures from a footer', () => {
  const lines = Array.from({ length: 80 }, () => [...failure(`${file}:1:1`), '  ...']).flat();
  const result = collect([...lines, '# fail 381']);
  assert.equal(result.counters.fail, 381);
  assert.equal(result.observedFailureMarkers, 80);
  assert.deepEqual(result.failureFiles, [{ file, failures: 80 }]);
  assert.equal(result.droppedFailureRecords, 0);
  assert.equal(result.droppedFailureFileRecords, 0);
  assert.equal(result.droppedFailureFileMarkers, 0);
  assert.equal(result.unknownLocationFailures, 0);
});

test('maximum-length grouped paths and detailed coordinates keep serialized output bounded', () => {
  const paths = Array.from({ length: LIMITS.failureFiles + 1 }, (_, index) => `tests/${String(index).padStart(4, '0')}-${'x'.repeat(236)}.test.mjs`);
  assert.ok(paths.every(path => Buffer.byteLength(path) === LIMITS.pathBytes));
  const collector = createFailureCollector({ allowedPaths: paths, repositoryRoot: root });
  for (const path of paths) {
    for (const line of [...failure(`${path}:10000000:1000000`), `    private (${path}:10000000:1000000)`, '  ...']) collector.line(line);
  }
  const result = collector.result();
  assert.equal(result.failures.length, LIMITS.failures);
  assert.ok(result.failures.every(record => record.assertionLocation !== null));
  assert.equal(result.failureFiles.length, LIMITS.failureFiles);
  assert.equal(result.droppedFailureFileRecords, 1);
  assert.equal(result.droppedFailureFileMarkers, 1);
  assert.ok(Buffer.byteLength(JSON.stringify(result, null, 2)) < 192 * 1024);
});

test('group keys still require a canonical path within the bounded allowlist', () => {
  const paths = Array.from({ length: 10001 }, (_, index) => `tests/allowed-${index}.test.mjs`);
  const collector = createFailureCollector({ allowedPaths: paths, repositoryRoot: root });
  for (const path of [paths[0], paths[9999], paths[10000]]) {
    for (const line of [...failure(`${path}:1:1`), '  ...']) collector.line(line);
  }
  const result = collector.result();
  assert.deepEqual(result.failureFiles, [paths[0], paths[9999]].map(file => ({ file, failures: 1 })));
  assert.equal(result.unknownLocationFailures, 1);
  assert.equal(result.observedFailureMarkers, 3);
});

test('original scan, detail, line and path limits remain fixed alongside the grouped-record cap', () => {
  assert.deepEqual(LIMITS, { segmentBytes: 16 * 1024 * 1024, chunkBytes: 64 * 1024, lineBytes: 4096, failures: 80, failureFiles: 256, pathBytes: 256 });
  const result = collect([]);
  assert.deepEqual(result.failureFiles, []);
  assert.equal(result.droppedFailureFileRecords, 0);
  assert.equal(result.droppedFailureFileMarkers, 0);
  assert.equal(result.observedFailureMarkers, 0);
  assert.equal(result.unknownLocationFailures, 0);
  assert.deepEqual(result.counters, {});
});

test('invalid allowlist entries never enable arbitrary private paths', () => {
  const collector = createFailureCollector({ allowedPaths: ['tests/secret?token.test.mjs', '../tests/secret.test.mjs'], repositoryRoot: root });
  collector.line('not ok 1 - private'); collector.line("  location: 'tests/secret?token.test.mjs:1:1'");
  assert.equal(collector.result().failures[0].location, null);
});

test('exit receipt keeps command and pipefail failure, rejects malformed or incomplete evidence', () => {
  assert.deepEqual(parseExitCodes('7 0 7\n'), { command: 7, capture: 0, pipeline: 7 });
  assert.deepEqual(parseExitCodes('7 9 9\n'), { command: 7, capture: 9, pipeline: 9 });
  assert.deepEqual(parseExitCodes('0 9 9\n'), { command: 0, capture: 9, pipeline: 9 });
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
