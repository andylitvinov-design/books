import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, open, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Observational only: Node reporter text is not a stable programmatic API.
// Never export names, diagnostic bodies, stacks, arbitrary paths or error text.
export const LIMITS = Object.freeze({
  inputBytes: 64 * 1024 * 1024,
  lineBytes: 4096,
  failureRecords: 512,
  pathBytes: 240,
  outputBytes: 256 * 1024,
  number: 1_000_000_000,
});
const TOTAL_KEYS = ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo'];
const OUTCOMES = new Set(['success', 'failure', 'cancelled', 'skipped']);
const emptyTotals = () => Object.fromEntries(TOTAL_KEYS.map((key) => [key, null]));
const validNumber = (value) => Number.isSafeInteger(value) && value >= 0 && value <= LIMITS.number;
const integer = (value) => /^\d+$/.test(value) && validNumber(Number(value)) ? Number(value) : null;
const safePath = (value) => typeof value === 'string'
  && Buffer.byteLength(value) <= LIMITS.pathBytes
  && /^tests\/[A-Za-z0-9_./-]+\.test\.mjs$/.test(value)
  && value.split('/').every((part) => part !== '' && part !== '.' && part !== '..');

export function trackedTestPaths(cwd) {
  // Read Git index metadata only, never test source or live application data.
  const output = execFileSync('git', ['ls-files', '--stage', '-z', '--', 'tests'], {
    cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
  });
  const result = new Set();
  for (const entry of output.split('\0')) {
    const match = /^100(?:644|755) [a-f0-9]{40,64} 0\t(.+)$/.exec(entry);
    if (match && safePath(match[1])) result.add(match[1]);
  }
  return result;
}

function locationFromLine(line, indent, cwd, allowed) {
  const prefix = `${' '.repeat(indent)}location: `;
  if (!line.startsWith(prefix)) return null;
  const value = line.slice(prefix.length);
  // This is the exact simple quoted Node TAP form observed in existing IA logs.
  // Escapes, URLs, unknown forms and non-checkout paths are deliberately rejected.
  const match = /^'([^'\\\r\n]+):(\d+):(\d+)'$/.exec(value);
  if (!match) return null;
  const prefixPath = `${path.resolve(cwd)}${path.sep}`;
  if (!match[1].startsWith(prefixPath)) return null;
  const relative = match[1].slice(prefixPath.length);
  const lineNumber = integer(match[2]);
  const column = integer(match[3]);
  if (!safePath(relative) || !allowed.has(relative) || lineNumber === null || column === null
      || lineNumber === 0 || column === 0) return null;
  return { path: relative, line: lineNumber, column };
}

async function captureStatus(filename) {
  let handle;
  try {
    handle = await open(filename, 'r');
    const info = await handle.stat();
    if (!info.isFile() || info.size > 128) return null;
    const buffer = Buffer.alloc(129);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 128) return null;
    const value = JSON.parse(buffer.subarray(0, bytesRead).toString('utf8'));
    const exit = (x) => Number.isInteger(x) && x >= 0 && x <= 255;
    return exit(value.npmExit) && exit(value.teeExit)
      ? { npmExit: value.npmExit, teeExit: value.teeExit } : null;
  } catch { return null; }
  finally { await handle?.close().catch(() => {}); }
}

export async function summarizeUnitLog({ input, statusFile, cwd, allowedPaths, stepOutcome }) {
  const issues = new Set();
  const summary = {
    schemaVersion: 1,
    scope: 'observed-location-only',
    fullInventoryGuaranteed: false,
    summaryStatus: 'observed_only',
    format: 'unknown',
    unitStepOutcome: OUTCOMES.has(stepOutcome) ? stepOutcome : 'unknown',
    capture: { npmExit: null, teeExit: null },
    limits: LIMITS,
    observed: { inputBytes: 0, oversizeLines: 0, failureRecords: 0, unknownLocations: 0,
      retainedRecords: 0, omittedRecords: 0, rootPlanCount: null },
    totalsStatus: 'unknown',
    totals: emptyTotals(),
    issues: [],
    failures: [],
  };
  const capture = await captureStatus(statusFile);
  if (capture) {
    summary.capture = capture;
    if (capture.teeExit !== 0) issues.add('capture_output_error');
    if ((stepOutcome === 'success' && capture.npmExit !== 0)
        || (stepOutcome === 'failure' && capture.npmExit === 0)) issues.add('exit_outcome_mismatch');
  } else issues.add('capture_status_missing');
  if (stepOutcome === 'cancelled') issues.add('unit_cancelled');
  if (stepOutcome === 'skipped') issues.add('unit_not_run');

  let headers = 0;
  let rootPlans = 0;
  let lastResultIndent = null;
  let diagnosticIndent = null;
  let pending = null;
  const totalSeen = new Set();
  let duplicateTotals = false;
  let invalidTotals = false;
  let unsupportedResultFormat = false;
  let resultRecords = 0;
  const allowed = new Set([...allowedPaths].filter(safePath));
  const finish = () => {
    if (!pending) return;
    if (pending.path === null) summary.observed.unknownLocations++;
    if (summary.failures.length < LIMITS.failureRecords) summary.failures.push(pending);
    else issues.add('record_limit');
    pending = null;
  };
  const consume = (line) => {
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (diagnosticIndent !== null) {
      if (line === `${' '.repeat(diagnosticIndent)}...`) {
        diagnosticIndent = null;
        finish();
      } else if (pending) {
        const location = locationFromLine(line, diagnosticIndent, cwd, allowed);
        if (location && pending.path === null) Object.assign(pending, location);
      }
      return;
    }
    if (lastResultIndent !== null && line === `${' '.repeat(lastResultIndent + 2)}---`) {
      diagnosticIndent = lastResultIndent + 2;
      return;
    }
    if (line === 'TAP version 13') { headers++; return; }
    if (headers !== 1) return;
    const result = /^( {0,64})(not ok|ok) (\d+)(?: - .*)?$/.exec(line);
    if (result) {
      resultRecords++;
      finish();
      lastResultIndent = result[1].length;
      if (result[2] === 'not ok') {
        summary.observed.failureRecords++;
        const sequence = integer(result[3]);
        if (sequence === null) issues.add('invalid_record_number');
        pending = { path: null, line: null, column: null, sequence,
          indent: lastResultIndent, failed: 1 };
      }
      return;
    }
    // Recognize unsupported reporter/result markers only outside diagnostics.
    // Do not parse names or mistake ordinary TAP comments for spec output.
    const structuralLine = line.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
    if (/^ *(?:[✖✘×✔✓▶ℹ])(?:\s|$)/.test(structuralLine)
        || /^ *(?:not ok|ok)(?:\s|$)/.test(structuralLine)) {
      unsupportedResultFormat = true;
      issues.add('unsupported_result_format');
      return;
    }
    const plan = /^1\.\.(\d+)$/.exec(line);
    if (plan) {
      finish(); rootPlans++;
      summary.observed.rootPlanCount = integer(plan[1]);
      if (summary.observed.rootPlanCount === null) issues.add('invalid_plan');
      return;
    }
    // Reserve footer field names before validating their values. Otherwise a
    // malformed duplicate could silently leave an earlier numeric total intact.
    const field = /^# (tests|suites|pass|fail|cancelled|skipped|todo)(?:[ \t].*|$)$/.exec(line);
    if (field) {
      const key = field[1];
      if (totalSeen.has(key)) duplicateTotals = true;
      totalSeen.add(key);
      const total = /^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/.exec(line);
      const value = total ? integer(total[2]) : null;
      summary.totals[key] = value;
      if (value === null || rootPlans !== 1) {
        invalidTotals = true;
        issues.add('invalid_total');
      }
    }
  };

  let remainder = Buffer.alloc(0);
  let discardingLine = false;
  let missing = false;
  try {
    const inputStat = await stat(input);
    if (!inputStat.isFile()) throw new Error();
    if (inputStat.size > LIMITS.inputBytes) issues.add('input_byte_limit');
    // Fixed-size chunks and a fixed-size line buffer avoid loading source dumps.
    for await (const chunk of createReadStream(input, { highWaterMark: 16 * 1024, end: LIMITS.inputBytes - 1 })) {
      summary.observed.inputBytes += chunk.length;
      let from = 0;
      while (from < chunk.length) {
        const newline = chunk.indexOf(10, from);
        const end = newline === -1 ? chunk.length : newline;
        const segment = chunk.subarray(from, end);
        if (!discardingLine) {
          if (remainder.length + segment.length > LIMITS.lineBytes) {
            remainder = Buffer.alloc(0); discardingLine = true;
            summary.observed.oversizeLines++; issues.add('line_byte_limit');
          } else remainder = Buffer.concat([remainder, segment]);
        }
        if (newline !== -1) {
          if (!discardingLine) consume(remainder.toString('utf8'));
          remainder = Buffer.alloc(0); discardingLine = false;
        }
        from = end + 1;
      }
    }
    if (remainder.length || discardingLine) issues.add('unterminated_input_line');
    if (diagnosticIndent !== null) issues.add('unterminated_diagnostic');
  } catch {
    missing = true;
    issues.add('input_unavailable');
  }
  finish();
  // A nonempty footer without any supported result records is ambiguous even
  // if the unrecognized lines do not use known spec symbols. Do not infer them.
  const droppedResultPossible = ['line_byte_limit', 'input_byte_limit', 'unterminated_input_line']
    .some((issue) => issues.has(issue));
  if (headers === 1 && resultRecords === 0 && summary.totals.tests > 0 && !droppedResultPossible) {
    unsupportedResultFormat = true;
    issues.add('unsupported_result_format');
  }
  if (summary.totals.fail > summary.observed.failureRecords) issues.add('failure_records_not_reconciled');
  if (headers === 1 && !unsupportedResultFormat) {
    summary.format = 'node-tap-observed';
    if (rootPlans !== 1) issues.add('root_plan_missing_or_repeated');
    if (totalSeen.size === TOTAL_KEYS.length && !duplicateTotals && !invalidTotals && rootPlans === 1
        && TOTAL_KEYS.every((key) => summary.totals[key] !== null)) summary.totalsStatus = 'observed';
    else { summary.totalsStatus = 'incomplete'; issues.add('totals_incomplete_or_repeated'); }
  } else {
    issues.add('format_unknown');
    summary.totals = emptyTotals();
    summary.failures = [];
    // Counts remain observations of recognisable records, not an inventory claim.
  }
  if (duplicateTotals || invalidTotals) summary.totals = emptyTotals();
  if (headers !== 1 || unsupportedResultFormat) summary.summaryStatus = 'format_unknown';
  else if (issues.size) summary.summaryStatus = 'observed_incomplete';
  if (missing) summary.summaryStatus = stepOutcome === 'skipped' ? 'not_run' : 'capture_missing';
  summary.observed.retainedRecords = summary.failures.length;
  summary.observed.omittedRecords = summary.observed.failureRecords - summary.failures.length;
  summary.issues = [...issues];
  return summary;
}

export function boundedJson(summary) {
  // Fail closed instead of serializing arbitrary diagnostic content on overflow.
  const value = JSON.stringify(summary, null, 2) + '\n';
  if (Buffer.byteLength(value) > LIMITS.outputBytes) throw new Error('summary-size-limit');
  return value;
}

async function main() {
  const [input, statusFile, output, stepOutcome] = process.argv.slice(2);
  let failed = false;
  let summary;
  try {
    if (!input || !statusFile || !output) throw new Error();
    summary = await summarizeUnitLog({ input, statusFile, cwd: process.cwd(),
      allowedPaths: trackedTestPaths(process.cwd()), stepOutcome });
  } catch {
    failed = true;
    summary = { schemaVersion: 1, summaryStatus: 'parser_error', fullInventoryGuaranteed: false,
      totalsStatus: 'unknown', totals: emptyTotals(), failures: [] };
  }
  try {
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, boundedJson(summary), { mode: 0o600 });
  } catch { failed = true; }
  if (failed) {
    process.stderr.write('IA unit inventory unavailable or incomplete (diagnostic parser error).\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
