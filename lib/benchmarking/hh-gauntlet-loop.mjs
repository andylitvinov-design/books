// Offline, deterministic policy for the Holistic House OpenCode Gauntlet pilot.
// This module NEVER makes model/provider calls.
export const FREE_MODELS = Object.freeze([
  'opencode/glm-5.3-flash-free',
  'opencode/deepseek-v4.1-flash-free',
]);

export const SAFE_EDIT_FILES = Object.freeze([
  'components/free-express-wizard.tsx',
  'components/free-express-wizard.module.css',
  'components/personal-express-enquiry.tsx',
  'tests/free-express-wizard-v2.test.mjs',
  'tests/free-express-unified-v2.test.mjs',
  'tests/free-express-mobile-consent-layout.test.mjs',
]);

export const REQUIRED_CRITERIA = Object.freeze([
  'en-ru-es',
  'mobile-320-430',
  'opt-in',
  'single-lead',
  'privacy',
  'regressions',
]);

export const CONTRACT_TESTS = Object.freeze([
  'tests/free-express-wizard-v2.test.mjs',
  'tests/free-express-unified-v2.test.mjs',
  'tests/free-express-owner-reply.test.mjs',
  'tests/free-express-retention.test.mjs',
  'tests/free-express-mobile-consent-layout.test.mjs',
]);

export function parseGauntletArgs(argv) {
  const options = {
    run: false,
    model: FREE_MODELS[0],
    rounds: 2,
    timeoutSeconds: 240,
  };
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--run' || key === '--check') {
      if (seen.has('mode')) throw new Error('Choose exactly one mode');
      seen.add('mode');
      options.run = key === '--run';
      continue;
    }
    if (!['--model', '--rounds', '--timeout-seconds'].includes(key))
      throw new Error('Unknown argument: ' + key);
    if (seen.has(key)) throw new Error('Repeated argument: ' + key);
    seen.add(key);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + key);
    if (key === '--model') options.model = value;
    if (key === '--rounds') options.rounds = Number(value);
    if (key === '--timeout-seconds') options.timeoutSeconds = Number(value);
  }
  if (!FREE_MODELS.includes(options.model))
    throw new Error('Model is not in the verified-free allowlist; no paid fallback, including Step 5 Preview');
  if (!Number.isInteger(options.rounds) || options.rounds < 1 || options.rounds > 3)
    throw new Error('Rounds must be an integer from 1 to 3');
  if (!Number.isInteger(options.timeoutSeconds) || options.timeoutSeconds < 60 || options.timeoutSeconds > 600)
    throw new Error('Timeout must be an integer from 60 to 600 seconds');
  return options;
}

export function changedPathsFromPorcelain(text) {
  return [...new Set(text.split('\n').filter(Boolean).map(line => {
    if (line.length < 4 || line[2] !== ' ')
      throw new Error('Cannot safely parse git status entry');
    return line.slice(3);
  }))];
}

export function checkEditScope(paths) {
  if (!paths.length) return { ok: false, reason: 'No candidate change to assess' };
  const forbidden = paths.filter(path => !SAFE_EDIT_FILES.includes(path));
  if (forbidden.length) return { ok: false, reason: 'Outside safe pilot scope: ' + forbidden.join(', ') };
  if (paths.length > 5) return { ok: false, reason: 'Too many changed files for one pilot' };
  return { ok: true, reason: 'Changes limited to approved UI and synthetic test files' };
}

function extractResponseText(output) {
  const eventTexts = [];
  for (const line of output.split('\n')) {
    try {
      const event = JSON.parse(line);
      if (event?.type === 'text' && typeof event?.part?.text === 'string')
        eventTexts.push(event.part.text);
      else if (event?.part?.type === 'text' && typeof event.part.text === 'string')
        eventTexts.push(event.part.text);
    } catch { /* OpenCode may use human-readable output. */ }
  }
  return eventTexts.length ? eventTexts.join('\n') : output;
}

export function parseCriticVerdict(raw) {
  const text = extractResponseText(String(raw)).trim();
  const candidate = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] ||
    text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  let report;
  try { report = JSON.parse(candidate); }
  catch { return { passed: false, reason: 'Critic did not return valid structured JSON' }; }
  if (!report || typeof report !== 'object' || !Array.isArray(report.criteria) ||
      !Array.isArray(report.findings) || !['PASS', 'FAIL'].includes(report.decision))
    return { passed: false, reason: 'Critic JSON is missing decision, criteria or findings' };
  const entries = new Map();
  for (const criterion of report.criteria) {
    if (!criterion || !REQUIRED_CRITERIA.includes(criterion.id) ||
        !['PASS', 'FAIL', 'UNKNOWN'].includes(criterion.status) ||
        typeof criterion.evidence !== 'string' || criterion.evidence.trim().length < 8 ||
        entries.has(criterion.id))
      return { passed: false, reason: 'Invalid, duplicate or unsupported criterion evidence' };
    entries.set(criterion.id, criterion);
  }
  if (REQUIRED_CRITERIA.some(id => !entries.has(id)))
    return { passed: false, reason: 'Critic omitted mandatory criteria' };
  if (report.findings.some(x => typeof x !== 'string' || x.length > 1000))
    return { passed: false, reason: 'Critic findings are not bounded strings' };
  return {
    passed: report.decision === 'PASS' &&
      REQUIRED_CRITERIA.every(id => entries.get(id).status === 'PASS') &&
      report.findings.length === 0,
    reason: report.decision,
    findings: report.findings.slice(0, 8),
    criteria: [...entries.values()],
  };
}
