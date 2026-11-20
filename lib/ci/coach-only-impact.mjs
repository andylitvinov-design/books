// Fail-closed proof that a shared App API dispatcher edit is isolated to My Coach.
// This never waives Core, app/auth/IA or coaching-specific checks. Public Services
// and Site Video can skip an unrelated second full Next/browser build ONLY when
// both the exact-HEAD source diff and every changed path prove independence.
export const SHARED_COACH_DISPATCHER = 'app/api/app/[...path]/route.js';

const START = '    // Signed-in, stateless dialogue for the selected My Coach persona. Client';
const END = '    // A synthetic preflight proves verified ZDR free-model access before any';
const COACH_IMPORT = /^import \{[A-Za-z0-9_, ]+\} from '@\/lib\/(?:app\/coaching-brain|coaching\/[a-z0-9-]+\.mjs)'$/;
const OWNED_COACH_PATHS = [
  /^app\/api\/app\/my-coach\/(?:[a-z0-9-]+\/)*route\.(?:js|ts)$/i,
  /^components\/my-coach-[a-z0-9._-]+\.(?:jsx|tsx|css)$/i,
  /^lib\/(?:coaching\/[a-z0-9._/-]+|personal-coaching\/[a-z0-9._/-]+|app\/coaching-brain\.js)$/i,
  /^tests\/(?:coaching-[a-z0-9._-]+|my-coach-[a-z0-9._-]+)\.test\.mjs$/i,
  /^docs\/coaching\/[a-z0-9._-]+\.md$/i,
];
const SENSITIVE = /(?:^|[\/._-])(?:admin|auth|authorization|billing|booking|cabinet|checkout|client|consent|credential|crm|database|identity|login|medical|migration|password|patient|payment|permission|private|privacy|rls|secret|security|session|storage|supabase|token|wallet)(?:$|[\/._-])/i;
const INDEPENDENT_TEST = 'tests/practice-public-private-unified.test.mjs';

function commonDispatcherWithoutCoach(source) {
  if (typeof source !== 'string' || source.length < 100 || source.length > 250_000 || source.includes('\r'))
    return null;
  const lines = source.split('\n');
  const first = lines.indexOf(START), last = lines.indexOf(END);
  if (first < 0 || last <= first || last - first > 160 ||
      lines.lastIndexOf(START) !== first || lines.lastIndexOf(END) !== last)
    return null;
  const onlyCoach = lines.slice(first, last).join('\n');
  if (!onlyCoach.includes("joined === 'my-coach/turn'") ||
      /\bjoined\s*===\s*['"](?!my-coach\/)[^'"]+/.test(onlyCoach))
    return null;
  // The two anchor comments delimit only the already-authenticated Coach
  // branch. Never discard any global middleware, auth or adjacent API logic.
  return lines.slice(0, first).concat(['<ONLY_MY_COACH_DISPATCH>'], lines.slice(last))
    .filter(line => !COACH_IMPORT.test(line)).join('\n');
}

export function verifiedCoachOnlySharedRouting(changed, before, after) {
  if (!Array.isArray(changed) || changed.length < 1 || changed.length > 60)
    return false;
  const seen = new Set();
  let hasDispatcher = false;
  for (const row of changed) {
    const path = row?.filename, status = row?.status;
    if (typeof path !== 'string' || path.length < 2 || path.length > 256 ||
        path.startsWith('/') || path.includes('\0') || path.includes('\n') ||
        path.split('/').some(x => !x || x === '.' || x === '..') ||
        row?.previous_filename || seen.has(path) ||
        !['M','A','modified','added'].includes(status))
      return false;
    seen.add(path);
    if (path === SHARED_COACH_DISPATCHER) {
      if (status !== 'M' && status !== 'modified') return false;
      hasDispatcher = true;
    } else if (path !== INDEPENDENT_TEST &&
               (SENSITIVE.test(path) || !OWNED_COACH_PATHS.some(re => re.test(path)))) {
      return false;
    }
  }
  if (!hasDispatcher) return false;
  const unchangedBefore = commonDispatcherWithoutCoach(before);
  const unchangedAfter = commonDispatcherWithoutCoach(after);
  // A missing, renamed, deleted, modified shared auth or unknown function
  // remains FULL. A raw string equality check cannot be fooled by line ranges.
  return unchangedBefore !== null && unchangedAfter !== null &&
    unchangedBefore === unchangedAfter;
}
