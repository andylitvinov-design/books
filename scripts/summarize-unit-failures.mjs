import { execFileSync } from 'node:child_process';
import { closeSync, constants, fstatSync, mkdirSync, openSync, readSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Positive allowlists only: never retain test titles, messages, expected/actual
// values, stack text, URLs, headers or environment values from the raw log.
export const LIMITS = Object.freeze({ segmentBytes: 16 * 1024 * 1024, chunkBytes: 64 * 1024, lineBytes: 4096, failures: 80, failureFiles: 256, pathBytes: 256 });
const CLASSES = new Set(['Error', 'AssertionError', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'AggregateError', 'URIError', 'EvalError']);
const TYPES = new Set(['testCodeFailure', 'subtestsFailed', 'cancelledByParent', 'testTimeoutFailure', 'testAborted', 'hookFailed', 'uncaughtException', 'unhandledRejection']);
const OUTCOMES = new Set(['success', 'failure', 'cancelled', 'skipped']);
const safePath = value => typeof value === 'string' && value.length <= LIMITS.pathBytes && /^tests\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.test\.mjs$/.test(value);
const number = (value, max = 10_000_000) => /^\d{1,9}$/.test(String(value)) && Number(value) <= max ? Number(value) : null;

export function createFailureCollector({ allowedPaths = [], repositoryRoot = '' } = {}) {
  const allowed = new Set(allowedPaths.filter(safePath).slice(0, 10000));
  const failures = [], counters = {}, failureFiles = new Map();
  let current = null, markerCount = 0, droppedFailures = 0, unknownLocations = 0, oversizedLines = 0, tapHeaderSeen = false;
  const locate = value => {
    let candidate = value;
    for (const prefix of [`file://${repositoryRoot}/`, `${repositoryRoot}/`]) {
      if (repositoryRoot && candidate.startsWith(prefix)) { candidate = candidate.slice(prefix.length); break; }
    }
    const match = /^(tests\/[^:]+):(\d{1,9})(?::(\d{1,9}))?$/.exec(candidate);
    if (!match || !allowed.has(match[1])) return null;
    const line = number(match[2]), column = match[3] ? number(match[3], 1_000_000) : null;
    if (!line || (match[3] && !column)) return null;
    return { file: match[1], line, column };
  };
  const finish = () => {
    if (!current) return;
    if (!current.location) unknownLocations++;
    // Count every scanned marker before the detailed-record cap. Keys can only
    // come from the bounded HEAD allowlist, never titles or raw diagnostic text.
    else failureFiles.set(current.location.file, (failureFiles.get(current.location.file) ?? 0) + 1);
    if (failures.length < LIMITS.failures) failures.push(current);
    else droppedFailures++;
    current = null;
  };
  return {
    boundary: finish,
    line(raw) {
      if (Buffer.byteLength(raw) > LIMITS.lineBytes) { oversizedLines++; return; }
      const line = raw.replace(/\r$/, '');
      if (line === 'TAP version 13') tapHeaderSeen = true;
      const count = /^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d{1,9})$/.exec(line);
      if (count) counters[count[1]] = number(count[2]);
      if (/^\s*not ok \d+(?:\s+-.*)?$/.test(line)) {
        finish(); markerCount++;
        current = { location: null, assertionLocation: null, errorClass: 'unknown', failureType: 'unknown' };
        return;
      }
      if (/^\s*ok \d+(?:\s+-.*)?$/.test(line) || /^\s*\.\.\.$/.test(line)) { finish(); return; }
      if (!current) return;
      const location = /^\s+location: (?:'([^']+)'|"([^"]+)"|(\S+))$/.exec(line);
      if (location && !current.location) current.location = locate(location[1] ?? location[2] ?? location[3]);
      const name = /^\s+name: ['"]?([A-Za-z]+)['"]?$/.exec(line);
      if (name && CLASSES.has(name[1])) current.errorClass = name[1];
      const type = /^\s+failureType: ['"]?([A-Za-z]+)['"]?$/.exec(line);
      if (type && TYPES.has(type[1])) current.failureType = type[1];
      // Only the public checkout path and numeric coordinates survive a frame.
      const frame = /^\s+[^\r\n]*\(([^()]+)\)$/.exec(line);
      if (frame && current.location && !current.assertionLocation) {
        const position = locate(frame[1]);
        if (position?.file === current.location.file) current.assertionLocation = position;
      }
    },
    oversizedLine() { oversizedLines++; },
    result() {
      finish();
      const groups = Array.from(failureFiles, ([file, count]) => ({ file, failures: count }))
        .sort((a, b) => b.failures - a.failures || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
      // These are observed markers only; missing or unscanned log bytes cannot
      // supply counts. Unknown locations remain separate from omitted groups.
      return { format: 'node-test-tap', tapHeaderSeen, counters, observedFailureMarkers: markerCount, unknownLocationFailures: unknownLocations, droppedFailureRecords: droppedFailures, oversizedLines, failures,
        failureFiles: groups.slice(0, LIMITS.failureFiles),
        droppedFailureFileRecords: Math.max(0, groups.length - LIMITS.failureFiles),
        droppedFailureFileMarkers: groups.slice(LIMITS.failureFiles).reduce((total, group) => total + group.failures, 0),
      };
    },
  };
}

// Reads at most a 16 MiB head and 16 MiB tail, in 64 KiB chunks. Oversized
// lines are discarded, not truncated into apparently valid records. A gap or
// partial boundary line is never joined to a different diagnostic block.
export function readBoundedLog(logPath, collector) {
  let fd;
  const state = { state: 'unreadable', bytes: null, scannedBytes: 0, omittedBytes: 0, partialBoundaryLines: 0 };
  try {
    fd = openSync(logPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = fstatSync(fd);
    if (!stat.isFile()) return { ...state, state: 'not-regular' };
    state.state = 'available'; state.bytes = stat.size;
    const cap = LIMITS.segmentBytes;
    const ranges = stat.size <= cap * 2 ? [[0, stat.size]] : [[0, cap], [stat.size - cap, stat.size]];
    state.omittedBytes = Math.max(0, stat.size - cap * 2);
    const chunk = Buffer.alloc(LIMITS.chunkBytes);
    for (const [start, end] of ranges) {
      collector.boundary();
      let pending = '', oversized = false, skipPartial = start > 0;
      for (let offset = start; offset < end;) {
        const size = readSync(fd, chunk, 0, Math.min(chunk.length, end - offset), offset);
        if (!size) break;
        offset += size; state.scannedBytes += size;
        let segmentStart = 0;
        for (let i = 0; i < size; i++) {
          if (chunk[i] !== 10) continue;
          const part = chunk.subarray(segmentStart, i);
          if (skipPartial) { state.partialBoundaryLines++; skipPartial = false; }
          else if (oversized || Buffer.byteLength(pending) + part.length > LIMITS.lineBytes) collector.oversizedLine();
          else collector.line(pending + part.toString('utf8'));
          pending = ''; oversized = false; segmentStart = i + 1;
        }
        const rest = chunk.subarray(segmentStart, size);
        if (!skipPartial && !oversized) {
          if (Buffer.byteLength(pending) + rest.length > LIMITS.lineBytes) { pending = ''; oversized = true; }
          else pending += rest.toString('utf8');
        }
      }
      if ((end !== stat.size && (pending || oversized)) || skipPartial) state.partialBoundaryLines++;
      else if (oversized) collector.oversizedLine();
      else if (pending) collector.line(pending);
    }
  } catch (error) {
    state.state = error?.code === 'ENOENT' ? 'missing' : 'unreadable';
  } finally { if (fd !== undefined) closeSync(fd); }
  return state;
}

export function parseExitCodes(value) {
  if (typeof value !== 'string' || value.length > 32) return null;
  const match = /^(\d{1,3}) (\d{1,3}) (\d{1,3})\n?$/.exec(value);
  if (!match) return null;
  const values = match.slice(1).map(value => number(value, 255));
  if (values.some(value => value === null) || values[2] !== (values[1] || values[0])) return null;
  return { command: values[0], capture: values[1], pipeline: values[2] };
}

function readExitCodes(path) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 32) return null;
    const buffer = Buffer.alloc(32), size = readSync(fd, buffer, 0, 32, 0);
    return parseExitCodes(buffer.subarray(0, size).toString());
  } catch { return null; }
  finally { if (fd !== undefined) closeSync(fd); }
}

export function writeUnitFailureSummary(localDirectory, outputPath) {
  let checkoutSha = null, paths = [], pathAllowlistAvailable = false;
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    const candidate = git('rev-parse', 'HEAD').trim();
    if (/^[a-f0-9]{40}$/.test(candidate)) checkoutSha = candidate;
    paths = git('ls-tree', '-r', '-z', '--name-only', 'HEAD', '--', 'tests').split('\0');
    pathAllowlistAvailable = paths.length <= 10000;
    if (!pathAllowlistAvailable) paths = [];
  } catch { paths = []; }
  const collector = createFailureCollector({ allowedPaths: paths, repositoryRoot: process.cwd() });
  const log = readBoundedLog(resolve(localDirectory, 'unit.log'), collector);
  const summary = {
    schemaVersion: 1, command: 'npm run test:unit', checkoutSha, pathAllowlistAvailable,
    stepOutcome: OUTCOMES.has(process.env.UNIT_TEST_OUTCOME) ? process.env.UNIT_TEST_OUTCOME : 'unknown',
    exitCodes: readExitCodes(resolve(localDirectory, 'exit.txt')), log,
    limits: LIMITS, ...collector.result(),
  };
  // null exits mean no complete receipt (e.g. cancellation), never success.
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.length !== 4) process.exitCode = 2;
  else {
    try { writeUnitFailureSummary(process.argv[2], process.argv[3]); }
    catch { process.stderr.write('Unit failure summary unavailable.\n'); process.exitCode = 1; }
  }
}
