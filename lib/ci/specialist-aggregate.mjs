import { matchesGlob } from 'node:path';

export const TARGET = 'codex/public-book-library';
export const WORKFLOW_PREFIX = '.github/workflows/';
const ASSERT_REPO = /^[\w.-]+\/[\w.-]+$/;

function cleanYamlValue(value) {
  const raw = value.trim().replace(/\s+#.*$/, '').trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  return raw;
}

function parseList(value, label) {
  const input = value.trim();
  if (!input) return null;
  if (!input.startsWith('[') || !input.endsWith(']')) throw Error('UNSUPPORTED_INLINE_LIST:' + label);
  const items = [];
  let current = '', quote = null, depth = 0;
  for (const ch of input.slice(1, -1)) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
    } else if (ch === '{') { depth++; current += ch; }
    else if (ch === '}') { depth--; current += ch; }
    else if (ch === ',' && depth === 0) {
      items.push(cleanYamlValue(current)); current = '';
    } else current += ch;
  }
  if (quote || depth !== 0) throw Error('MALFORMED_LIST:' + label);
  if (current.trim()) items.push(cleanYamlValue(current));
  if (items.some(x => !x)) throw Error('EMPTY_PATTERN:' + label);
  return items;
}

// Strict reader for the GitHub Actions on: pull_request fields we use.
// actionlint independently validates full YAML. Any unfamiliar trigger shape
// fails CLOSED rather than assuming the specialist is unrelated.
export function parsePrTrigger(source, filename = 'workflow') {
  if (typeof source !== 'string') throw Error('INVALID_WORKFLOW:' + filename);
  const lines = source.replace(/\r/g, '').split('\n');
  const root = lines.findIndex(line => /^on:\s*(?:#.*)?$/.test(line));
  const inline = lines.find(line => /^on:\s*\S/.test(line) && !/^on:\s*#/.test(line));
  if (root < 0) {
    if (!inline) throw Error('MISSING_ON:' + filename);
    const val = inline.replace(/^on:\s*/, '').trim();
    const events = val.startsWith('[') ? parseList(val, filename + ':on') : [cleanYamlValue(val)];
    if (!events.includes('pull_request')) return null;
    return { branches: null, paths: null, pathsIgnore: null, branchesIgnore: null, types: null };
  }
  const all = [];
  for (let i = root + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^[^\s#][^:]*:/.test(line)) break;
    all.push(line);
  }
  const start = all.findIndex(line => /^  pull_request:\s*(?:#.*)?$/.test(line));
  if (start < 0) {
    if (all.some(line => /^  pull_request_target:/.test(line))) return null;
    if (all.some(line => /^  pull_request:/.test(line))) throw Error('UNSUPPORTED_PR_TRIGGER:' + filename);
    return null;
  }
  const block = [];
  for (let i = start + 1; i < all.length; i++) {
    if (/^  [\w-]+:/.test(all[i])) break;
    block.push(all[i]);
  }
  const result = { branches: null, paths: null, pathsIgnore: null, branchesIgnore: null, types: null };
  const keys = { branches: 'branches', 'branches-ignore': 'branchesIgnore', paths: 'paths', 'paths-ignore': 'pathsIgnore', types: 'types' };
  let current = null;
  for (const line of block) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const key = /^    ([\w-]+):\s*(.*)$/.exec(line);
    if (key) {
      current = Object.hasOwn(keys, key[1]) ? keys[key[1]] : null;
      if (current) result[current] = parseList(key[2], filename + ':' + current) || [];
      continue;
    }
    const item = /^      -\s+(.+)$/.exec(line);
    if (item && current) {
      const value = cleanYamlValue(item[1]);
      if (!value) throw Error('EMPTY_PATTERN:' + filename);
      result[current].push(value);
    } else if (item || /^\s*[^#]/.test(line)) {
      throw Error('UNSUPPORTED_TRIGGER_VALUE:' + filename + ':' + line.trim());
    }
  }
  for (const name of ['branches', 'paths', 'types', 'pathsIgnore', 'branchesIgnore']) {
    if (result[name]?.length === 0) throw Error('EMPTY_FILTER:' + filename + ':' + name);
  }
  if (result.paths && result.pathsIgnore) throw Error('CONFLICTING_PATH_FILTERS:' + filename);
  if (result.branches && result.branchesIgnore) throw Error('CONFLICTING_BRANCH_FILTERS:' + filename);
  return result;
}

function oneMatches(value, patterns, defaultValue = false) {
  if (!patterns) return defaultValue;
  let included = false;
  for (const original of patterns) {
    if (/[\r\n]/.test(original) || original.includes('$' + '{{')) throw Error('UNSAFE_GLOB');
    const negative = original.startsWith('!');
    const glob = negative ? original.slice(1) : original;
    if (!glob) throw Error('EMPTY_GLOB');
    if (matchesGlob(value, glob)) included = !negative;
  }
  return included;
}

export function matchesTrigger(trigger, changed, target = TARGET) {
  if (!trigger) return false;
  if (!Array.isArray(changed) || changed.length === 0) throw Error('EMPTY_CHANGED_FILES');
  if (trigger.types && !trigger.types.some(x => ['opened', 'synchronize', 'reopened', 'ready_for_review'].includes(x))) {
    return false;
  }
  if (trigger.branches && !oneMatches(target, trigger.branches)) return false;
  if (trigger.branchesIgnore && oneMatches(target, trigger.branchesIgnore)) return false;
  if (trigger.paths) return changed.some(file => oneMatches(file, trigger.paths));
  if (trigger.pathsIgnore) return changed.some(file => !oneMatches(file, trigger.pathsIgnore));
  return true;
}

export function expectedWorkflows({base, current, changed, target = TARGET}) {
  if (!(base instanceof Map) || !(current instanceof Map)) throw Error('WORKFLOW_SOURCES_UNAVAILABLE');
  const expected = [];
  for (const filename of new Set([...base.keys(), ...current.keys()])) {
    if (!filename.startsWith(WORKFLOW_PREFIX) || !/\.ya?ml$/.test(filename)) continue;
    if (filename === WORKFLOW_PREFIX + 'hh-pr-core-release.yml') continue;
    const oldTrigger = base.has(filename) ? parsePrTrigger(base.get(filename), filename) : null;
    const newTrigger = current.has(filename) ? parsePrTrigger(current.get(filename), filename) : null;
    if (matchesTrigger(oldTrigger, changed, target) || matchesTrigger(newTrigger, changed, target)) expected.push(filename);
  }
  return expected.sort();
}


// Reviewed, BASE-trusted migrations ONLY. This is not a general skip list.
// A migration is permitted only when its old workflow is removed, the existing
// replacement workflow is byte-identical to the verified BASE version and the
// replacement's PR path/branch filter actually covers this exact changed-file set.
export const APPROVED_SPECIALIST_REPLACEMENTS = Object.freeze({
  '.github/workflows/hh-crm-event-channels.yml': '.github/workflows/hh-event-referral-contract.yml',
  '.github/workflows/psychometric-research-catalogue.yml': '.github/workflows/hh-assessment-quality.yml',
});

export function resolveExpectedSpecialists({base, current, changed, expected, target = TARGET}) {
  if (!(base instanceof Map) || !(current instanceof Map) ||
      !Array.isArray(changed) || !changed.length || !Array.isArray(expected)) {
    throw Error('MIGRATION_INPUTS_INVALID');
  }
  const delegated = [], actual = new Set(expected);
  for (const old of expected) {
    const replacement = APPROVED_SPECIALIST_REPLACEMENTS[old];
    if (!replacement || !base.has(old) || current.has(old)) continue;
    if (!base.has(replacement) || !current.has(replacement) ||
        base.get(replacement) !== current.get(replacement) ||
        !actual.has(replacement)) {
      throw Error('UNTRUSTED_SPECIALIST_REPLACEMENT:' + old);
    }
    const trusted = parsePrTrigger(base.get(replacement), replacement);
    const proposed = parsePrTrigger(current.get(replacement), replacement);
    if (!matchesTrigger(trusted, changed, target) ||
        !matchesTrigger(proposed, changed, target)) {
      throw Error('REPLACEMENT_OUTSIDE_REVIEWED_SCOPE:' + old);
    }
    actual.delete(old);
    delegated.push({retired: old, replacement});
  }
  return {expected: [...actual].sort(), delegated};
}

function validAssociation(run, pr) {
  return run.event === 'pull_request' && run.head_sha === pr.head.sha &&
    run.head_repository?.full_name === pr.base.repo.full_name &&
    Array.isArray(run.pull_requests) && run.pull_requests.some(item =>
      item.number === pr.number && item.base?.ref === TARGET && item.head?.sha === pr.head.sha);
}

export function inspectWorkflowRuns({ expected, runs, pr }) {
  if (!pr?.head?.sha || !pr?.base?.sha || !pr?.base?.repo?.full_name ||
      pr.base.ref !== TARGET || pr.state !== 'open' || pr.draft || !pr.number) throw Error('PR_NOT_RELEASE_READY');
  if (!Array.isArray(expected) || !Array.isArray(runs)) throw Error('NO_WORKFLOW_EVIDENCE');
  const latest = new Map();
  const pushFailures = [], orphanFailures = [];
  for (const run of runs) {
    if (run.head_sha !== pr.head.sha) continue;
    if (run.event === 'push' && run.head_branch === pr.head.ref &&
      run.head_repository?.full_name === pr.base.repo.full_name &&
      run.status === 'completed' && run.conclusion !== 'success') {
      pushFailures.push(String(run.id) + ':' + (run.conclusion || 'unknown'));
    }
    if (run.event === 'pull_request' && run.head_branch === pr.head.ref &&
        run.head_repository?.full_name === pr.base.repo.full_name &&
        !validAssociation(run, pr) && run.status === 'completed' && run.conclusion !== 'success') {
      orphanFailures.push(String(run.id) + ':' + (run.conclusion || 'unknown'));
    }
    if (!validAssociation(run, pr)) continue;
    const path = String(run.path || '').split('@')[0];
    if (!path.startsWith(WORKFLOW_PREFIX)) continue;
    const prev = latest.get(path);
    if (!prev || Number(run.id) > Number(prev.id) ||
        (run.id === prev.id && Number(run.run_attempt || 1) > Number(prev.run_attempt || 1))) latest.set(path, run);
  }
  const missing = [], pending = [], failed = [], passed = [], observedUnrelated = [];
  for (const [filename, run] of latest) {
    if (filename === WORKFLOW_PREFIX + 'hh-pr-core-release.yml' || expected.includes(filename)) continue;
    if (run.status !== 'completed' || run.conclusion !== 'success') {
      observedUnrelated.push(filename + ':' + (run.conclusion || run.status || 'unknown'));
    }
  }
  for (const filename of expected) {
    const run = latest.get(filename);
    if (!run) missing.push(filename);
    else if (run.status !== 'completed') pending.push(filename + ':' + run.status);
    else if (run.conclusion !== 'success') failed.push(filename + ':' + run.conclusion);
    else passed.push(run);
  }
  return {missing,pending,failed,pushFailures,orphanFailures,observedUnrelated,passed};
}

export function inspectJobs(jobs, filename) {
  if (!Array.isArray(jobs) || !jobs.length) throw Error('ZERO_JOB_WORKFLOW:' + filename);
  const bad = jobs.filter(job => job.status !== 'completed' || job.conclusion !== 'success');
  if (bad.length) throw Error('UNSUCCESSFUL_SPECIALIST_JOB:' + filename + ':' + bad.map(job => job.name + '=' + job.conclusion).join(','));
  return jobs.length;
}

export function validateParameters(env) {
  const repo = env.GITHUB_REPOSITORY, number = Number(env.HH_PR_NUMBER);
  if (!ASSERT_REPO.test(repo || '') || !Number.isSafeInteger(number) || number < 1 ||
      !/^[0-9a-f]{40}$/.test(env.HH_HEAD_SHA || '') || !/^[0-9a-f]{40}$/.test(env.HH_BASE_SHA || '') ||
      !env.GITHUB_TOKEN) throw Error('INVALID_RELEASE_GATE_CONTEXT');
  return {repo,number,head:env.HH_HEAD_SHA,base:env.HH_BASE_SHA,token:env.GITHUB_TOKEN};
}