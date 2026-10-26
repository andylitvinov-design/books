import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { LIMITS, boundedJson, summarizeUnitLog, trackedTestPaths } from '../scripts/summarize-ia-unit-log.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedPath = 'tests/synthetic-example.test.mjs';
const sentinel = 'SYNTHETIC_PRIVATE_VALUE_MUST_NOT_BE_EXPORTED';
const totals = (fail = 1, pass = 0) => `1..${fail + pass}\n# tests ${fail + pass}\n# suites 0\n# pass ${pass}\n# fail ${fail}\n# cancelled 0\n# skipped 0\n# todo 0\n`;
const failure = (cwd, sequence = 1, indent = '') => `${indent}not ok ${sequence} - ${sentinel}\n${indent}  ---\n${indent}  location: '${cwd}/${allowedPath}:12:3'\n${indent}  error: |-\n${indent}    ${sentinel}\n${indent}    location: '${cwd}/tests/not-allowed.test.mjs:1:1'\n${indent}    not ok 99 - ${sentinel}\n${indent}  stack: |-\n${indent}    ${sentinel}\n${indent}  ...\n`;

async function fixture(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ia-unit-summary-'));
  const input = path.join(root, 'unit.log');
  const statusFile = path.join(root, 'status.json');
  await writeFile(statusFile, JSON.stringify({ npmExit: 1, teeExit: 0 }));
  const run = (options = {}) => summarizeUnitLog({ input, statusFile, cwd: root,
    allowedPaths: new Set([allowedPath]), stepOutcome: 'failure', ...options });
  try { await callback({ root, input, statusFile, run }); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test('observes only allowlisted locations and numeric TAP outcomes, never names or diagnostic bodies', async () => {
  await fixture(async ({ root, input, run }) => {
    await writeFile(input, `TAP version 13\n${failure(root)}${totals()}`);
    const summary = await run();
    assert.equal(summary.summaryStatus, 'observed_only');
    assert.equal(summary.fullInventoryGuaranteed, false);
    assert.deepEqual(summary.failures, [{ path: allowedPath, line: 12, column: 3, sequence: 1, indent: 0, failed: 1 }]);
    assert.equal(summary.totals.fail, 1);
    assert.equal(summary.totalsStatus, 'observed');
    assert.equal(summary.observed.failureRecords, 1);
    const json = boundedJson(summary);
    assert.ok(!json.includes(sentinel));
    for (const key of ['name', 'error', 'stack', 'expected', 'actual', 'source', 'env']) {
      assert.ok(!Object.hasOwn(summary.failures[0], key));
    }
    assert.ok(!json.includes(root));
  });
});

test('successful capture stays observational without inventing failures', async () => {
  await fixture(async ({ input, statusFile, run }) => {
    await writeFile(input, `TAP version 13\nok 1 - ${sentinel}\n${totals(0, 1)}`);
    await writeFile(statusFile, JSON.stringify({ npmExit: 0, teeExit: 0 }));
    const summary = await run({ stepOutcome: 'success' });
    assert.equal(summary.summaryStatus, 'observed_only');
    assert.equal(summary.totals.fail, 0);
    assert.equal(summary.totals.pass, 1);
    assert.deepEqual(summary.failures, []);
    assert.equal(summary.fullInventoryGuaranteed, false);
    assert.ok(!boundedJson(summary).includes(sentinel));
  });
});

test('unknown, traversal, escaped, external and unallowlisted locations remain null', async () => {
  await fixture(async ({ root, input, run }) => {
    const locations = [
      `${root}/tests/unknown.test.mjs:1:1`,
      `${root}/tests/../private.test.mjs:1:1`,
      `/unrelated/${allowedPath}:1:1`,
      `file://${root}/${allowedPath}:1:1`,
      `${root}/${allowedPath}:0:1`,
      `${root}/${allowedPath}:1000000001:1`,
      `${root}/tests/${sentinel}\\.test.mjs:1:1`,
    ];
    let log = 'TAP version 13\n';
    for (let i = 0; i < locations.length; i++) log += `not ok ${i + 1} - ${sentinel}\n  ---\n  location: '${locations[i]}'\n  ...\n`;
    await writeFile(input, log + totals(locations.length));
    const summary = await run();
    assert.equal(summary.failures.length, locations.length);
    assert.ok(summary.failures.every((x) => x.path === null && x.line === null && x.column === null));
    assert.equal(summary.observed.unknownLocations, locations.length);
    assert.ok(!boundedJson(summary).includes(sentinel));
  });
});

test('nested failures are separate observed records, not inferred leaf failures', async () => {
  await fixture(async ({ root, input, run }) => {
    await writeFile(input, `TAP version 13\n# Subtest: ${sentinel}\n${failure(root, 1, '    ')}${failure(root, 1)}${totals(2)}`);
    const summary = await run();
    assert.equal(summary.observed.failureRecords, 2);
    assert.deepEqual(summary.failures.map((x) => x.indent), [4, 0]);
    assert.equal(summary.fullInventoryGuaranteed, false);
  });
});

test('missing or repeated totals are explicit and never filled from failure record counts', async () => {
  await fixture(async ({ root, input, run }) => {
    await writeFile(input, `TAP version 13\n${failure(root)}1..1\n# tests 1\n`);
    let summary = await run();
    assert.equal(summary.totalsStatus, 'incomplete');
    assert.equal(summary.totals.fail, null);
    assert.equal(summary.summaryStatus, 'observed_incomplete');
    await writeFile(input, `TAP version 13\n${failure(root)}${totals()}# fail 99\n`);
    summary = await run();
    assert.equal(summary.totalsStatus, 'incomplete');
    assert.ok(Object.values(summary.totals).every((x) => x === null));
  });
});

test('spec, unrecognised and repeated TAP formats never yield a full inventory or inferred totals', async () => {
  await fixture(async ({ root, input, run }) => {
    for (const log of [`✖ ${sentinel}\nℹ tests 1\nℹ fail 1\n`, 'random output\n',
      `TAP version 13\n${failure(root)}TAP version 13\n${totals()}`]) {
      await writeFile(input, log);
      const summary = await run();
      assert.equal(summary.summaryStatus, 'format_unknown');
      assert.equal(summary.format, 'unknown');
      assert.equal(summary.totalsStatus, 'unknown');
      assert.deepEqual(summary.failures, []);
      assert.ok(Object.values(summary.totals).every((x) => x === null));
      assert.ok(!boundedJson(summary).includes(sentinel));
    }
  });
});

test('malformed reserved footer fields invalidate totals even after or before valid duplicate fields', async () => {
  await fixture(async ({ root, input, run }) => {
    const known = `TAP version 13\n${failure(root)}${totals()}`;
    for (const bad of ['nope', '-1', '1.5', 'NaN', '', '1e2', '+1', '1 trailing', '\t1']) {
      for (const log of [known + `# fail ${bad}\n`,
        known.replace('# fail 1', `# fail ${bad}\n# fail 1`)]) {
        await writeFile(input, log);
        const summary = await run();
        assert.equal(summary.summaryStatus, 'observed_incomplete');
        assert.equal(summary.totalsStatus, 'incomplete');
        assert.ok(summary.issues.includes('invalid_total'));
        assert.ok(Object.values(summary.totals).every((x) => x === null));
        assert.ok(!boundedJson(summary).includes(sentinel));
      }
    }
    await writeFile(input, known + '# fail\n');
    const summary = await run();
    assert.equal(summary.totalsStatus, 'incomplete');
    assert.ok(Object.values(summary.totals).every((x) => x === null));
  });
});

test('mixed spec or unsupported result forms under a TAP header are explicitly unknown', async () => {
  await fixture(async ({ root, input, run }) => {
    for (const marker of [`✖ ${sentinel}`, `✔ ${sentinel}`, `ℹ fail 1`, `▶ ${sentinel}`,
      `not ok nope - ${sentinel}`, `ok`, `\u001b[31m✖\u001b[39m ${sentinel}`]) {
      for (const knownRecords of ['', failure(root)]) {
        await writeFile(input, `TAP version 13\n${knownRecords}${marker}\n${totals()}`);
        const summary = await run();
        assert.equal(summary.summaryStatus, 'format_unknown');
        assert.equal(summary.format, 'unknown');
        assert.equal(summary.totalsStatus, 'unknown');
        assert.ok(summary.issues.includes('unsupported_result_format'));
        assert.deepEqual(summary.failures, []);
        assert.ok(Object.values(summary.totals).every((x) => x === null));
        assert.ok(!boundedJson(summary).includes(sentinel));
      }
    }
    // No numeric footer is used to invent unsupported result records.
    await writeFile(input, `TAP version 13\nUNSUPPORTED ${sentinel}\n${totals()}`);
    const summary = await run();
    assert.equal(summary.summaryStatus, 'format_unknown');
    assert.equal(summary.totals.fail, null);
    assert.deepEqual(summary.failures, []);
  });
});

test('spec-like and malformed-footer text inside diagnostic bodies or ordinary TAP comments stays private and ignored', async () => {
  await fixture(async ({ root, input, run }) => {
    const body = failure(root).replace('  error: |-\n',
      `  error: |-\n    ✖ ${sentinel}\n    ℹ fail 1\n    # fail nope\n`);
    await writeFile(input, `TAP version 13\n# ordinary diagnostic ${sentinel}\n# ✖ ${sentinel}\n# ℹ fail 1\n${body}${totals()}`);
    const summary = await run();
    assert.equal(summary.summaryStatus, 'observed_only');
    assert.equal(summary.totalsStatus, 'observed');
    assert.equal(summary.totals.fail, 1);
    assert.equal(summary.failures.length, 1);
    assert.ok(!boundedJson(summary).includes(sentinel));
  });
});

test('a numeric failure total exceeding observed failure records is disclosed without inventing records', async () => {
  await fixture(async ({ root, input, run }) => {
    await writeFile(input, `TAP version 13\n${failure(root)}${totals(2)}`);
    const summary = await run();
    assert.equal(summary.summaryStatus, 'observed_incomplete');
    assert.ok(summary.issues.includes('failure_records_not_reconciled'));
    assert.equal(summary.failures.length, 1);
    assert.equal(summary.totals.fail, 2);
    assert.equal(summary.fullInventoryGuaranteed, false);
  });
});

test('truncated diagnostics and unterminated lines are explicitly incomplete', async () => {
  await fixture(async ({ root, input, run }) => {
    await writeFile(input, `TAP version 13\nnot ok 1 - ${sentinel}\n  ---\n  location: '${root}/${allowedPath}:12:3'\n  error: ${sentinel}`);
    const summary = await run();
    assert.equal(summary.summaryStatus, 'observed_incomplete');
    assert.ok(summary.issues.includes('unterminated_diagnostic'));
    assert.ok(summary.issues.includes('unterminated_input_line'));
    assert.equal(summary.totals.fail, null);
    assert.ok(!boundedJson(summary).includes(sentinel));
  });
});

test('capture failures, missing files, skipped and cancelled steps are not reported as success', async () => {
  await fixture(async ({ root, input, statusFile, run }) => {
    let summary = await run({ stepOutcome: 'skipped' });
    assert.equal(summary.summaryStatus, 'not_run');
    summary = await run();
    assert.equal(summary.summaryStatus, 'capture_missing');
    await writeFile(input, `TAP version 13\n${failure(root)}${totals()}`);
    await writeFile(statusFile, JSON.stringify({ npmExit: 143, teeExit: 1 }));
    summary = await run({ stepOutcome: 'cancelled' });
    assert.equal(summary.summaryStatus, 'observed_incomplete');
    assert.ok(summary.issues.includes('unit_cancelled'));
    assert.ok(summary.issues.includes('capture_output_error'));
    await writeFile(statusFile, sentinel.repeat(10));
    summary = await run();
    assert.ok(summary.issues.includes('capture_status_missing'));
    assert.ok(!boundedJson(summary).includes(sentinel));
  });
});

test('record, line and serialized-byte limits are bounded and disclosed', async () => {
  await fixture(async ({ root, input, run }) => {
    let log = `TAP version 13\n# ${sentinel.repeat(200)}\n`;
    for (let i = 0; i < LIMITS.failureRecords + 3; i++) log += failure(root, i + 1);
    await writeFile(input, log + totals(LIMITS.failureRecords + 3));
    const summary = await run();
    assert.equal(summary.failures.length, LIMITS.failureRecords);
    assert.equal(summary.observed.omittedRecords, 3);
    assert.equal(summary.observed.oversizeLines, 1);
    assert.ok(summary.issues.includes('record_limit'));
    assert.ok(summary.issues.includes('line_byte_limit'));
    assert.ok(Buffer.byteLength(boundedJson(summary)) <= LIMITS.outputBytes);
    assert.ok(!boundedJson(summary).includes(sentinel));
    assert.throws(() => boundedJson({ unsupported: 'x'.repeat(LIMITS.outputBytes) }));
  });
});

test('input-byte limit prevents an oversized raw file from becoming an unbounded parse', async () => {
  await fixture(async ({ input, run }) => {
    const handle = await open(input, 'w');
    await handle.write('TAP version 13\n');
    await handle.truncate(LIMITS.inputBytes + 1);
    await handle.close();
    const summary = await run();
    assert.equal(summary.observed.inputBytes, LIMITS.inputBytes);
    assert.ok(summary.issues.includes('input_byte_limit'));
    assert.equal(summary.summaryStatus, 'observed_incomplete');
    assert.equal(summary.totals.fail, null);
  });
});

test('Git allowlist uses tracked regular test paths, not source contents or arbitrary paths', async () => {
  await fixture(async ({ root }) => {
    const git = (...args) => {
      const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 0);
    };
    git('init', '-q');
    await mkdir(path.join(root, 'tests'));
    await writeFile(path.join(root, allowedPath), sentinel);
    await writeFile(path.join(root, 'tests/not-a-test.txt'), sentinel);
    git('add', '--', 'tests');
    assert.deepEqual([...trackedTestPaths(root)], [allowedPath]);
  });
});

test('workflow capture preserves npm exit, output, and ordinary shell failure blocking including tee errors and signals',
  { skip: process.platform !== 'linux' }, async () => {
    const workflow = await readFile(path.join(repository, '.github/workflows/ia-v2.yml'), 'utf8');
    const match = /      - id: ia_unit_tests\n        run: \|\n([\s\S]*?)        env:\n/.exec(workflow);
    assert.ok(match);
    const wrapper = match[1].split('\n').filter(Boolean).map((line) => line.slice(10)).join('\n') + '\n';
    assert.equal((wrapper.match(/npm run test:unit/g) || []).length, 1);
    assert.ok(!wrapper.includes('--test-reporter'));
    assert.ok(workflow.includes('if: always()\n        continue-on-error: true'));
    await fixture(async ({ root }) => {
      const bin = path.join(root, 'bin'); await mkdir(bin);
      const npm = path.join(bin, 'npm');
      const wrapperFile = path.join(root, 'wrapper.sh'); await writeFile(wrapperFile, wrapper);
      const cases = [['success', 0], ['failure', 1], ['distinct', 42], ['interrupt', 130], ['terminated', 143],
        ['self-term', 143], ['tee-error-success', 0], ['tee-error-failure', 42], ['status-write-error', 42]];
      for (const [name, code] of cases) {
        await writeFile(npm, '#!/bin/bash\n[[ "$*" = "run test:unit" ]] || exit 97\nprintf "synthetic-start\\nsynthetic-middle\\nsynthetic-end\\n"\n'
          + (name === 'self-term' ? 'kill -TERM "$$"\n' : `exit ${code}\n`), { mode: 0o755 });
        const localWrapper = name.startsWith('tee-error')
          ? wrapper.replace('unit_log="$RUNNER_TEMP/ia222-unit.log"', 'unit_log="/dev/full"')
          : name === 'status-write-error'
            ? wrapper.replace('unit_status_file="$RUNNER_TEMP/ia222-unit-status.json"', 'unit_status_file="$RUNNER_TEMP"') : wrapper;
        await writeFile(wrapperFile, localWrapper);
        const env = { PATH: `${bin}:/usr/bin:/bin`, RUNNER_TEMP: root };
        const result = spawnSync('/bin/bash', ['--noprofile', '--norc', '-eo', 'pipefail', wrapperFile], { env, encoding: 'utf8' });
        assert.equal(result.status, code, name);
        assert.ok(result.stdout.includes('synthetic-start\nsynthetic-middle\nsynthetic-end\n'), name);
        const gated = spawnSync('/bin/bash', ['-c', '/bin/bash --noprofile --norc -eo pipefail "$1" && printf downstream', 'probe', wrapperFile],
          { env, encoding: 'utf8' });
        assert.equal(gated.stdout.includes('downstream'), code === 0, name);
        if (name !== 'status-write-error') {
          const status = JSON.parse(await readFile(path.join(root, 'ia222-unit-status.json'), 'utf8'));
          assert.equal(status.npmExit, code, name);
          if (name.startsWith('tee-error')) assert.notEqual(status.teeExit, 0, name);
        }
      }
    });
  });

test('CLI parser failure emits a fixed bounded marker, never input or exception contents', async () => {
  await fixture(async ({ root, input, statusFile }) => {
    await writeFile(input, sentinel);
    const output = path.join(root, 'evidence/summary.json');
    const result = spawnSync(process.execPath, [path.join(repository, 'scripts/summarize-ia-unit-log.mjs'), input, statusFile, output, 'failure'],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.ok(!result.stdout.includes(sentinel));
    assert.ok(!result.stderr.includes(sentinel));
    assert.equal(result.stderr, 'IA unit inventory unavailable or incomplete (diagnostic parser error).\n');
    const json = await readFile(output, 'utf8');
    assert.ok(!json.includes(sentinel));
    assert.equal(JSON.parse(json).summaryStatus, 'parser_error');
  });
});
