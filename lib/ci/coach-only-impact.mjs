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

// The shared dispatcher remains scoped only if every executable top-level
// statement inside the reviewed window is a guarded My Coach route.
function onlyGatedCoachBranches(block, expectedRoute = null) {
  let offset=0, found=0;
  const guard=/^if\s*\(\s*joined\s*===\s*['"](my-coach\/[a-z0-9/-]+)['"]\s*\)\s*\{/;
  const skip=()=>{
    while(offset<block.length){
      if(/\s/.test(block[offset])){offset++;continue;}
      if(block.startsWith('//',offset)){
        const end=block.indexOf('\n',offset);
        offset=end<0?block.length:end;
        continue;
      }
      if(block.startsWith('/*',offset)){
        const end=block.indexOf('*/',offset+2);
        if(end<0)return false;
        offset=end+2;
        continue;
      }
      return true;
    }
    return true;
  };
  while(offset<block.length){
    if(!skip())return false;
    if(offset>=block.length)break;
    const match=guard.exec(block.slice(offset));
    if(!match || (expectedRoute && match[1] !== expectedRoute))return false;
    offset+=match[0].length;
    found++;
    if(found>12)return false;
    let depth=1,quote=null;
    for(;offset<block.length;offset++){
      const c=block[offset],next=block[offset+1];
      if(quote){
        if(c==='\\'){offset++;continue;}
        if(c===quote)quote=null;
        continue;
      }
      if(c==="'"||c==='"'){quote=c;continue;}
      // Complex template interpolation is not proven by this narrow parser.
      if(c===String.fromCharCode(96))return false;
      if(c==='/'&&next==='/'){
        const end=block.indexOf('\n',offset);
        offset=end<0?block.length:end;
        continue;
      }
      if(c==='/'&&next==='*'){
        const end=block.indexOf('*/',offset+2);
        if(end<0)return false;
        offset=end+1;
        continue;
      }
      if(c==='{')depth++;
      if(c==='}'){
        depth--;
        if(depth===0){offset++;break;}
        if(depth<0)return false;
      }
    }
    if(depth!==0||quote)return false;
  }
  return expectedRoute ? found===1 : found>0;
}

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
      !onlyGatedCoachBranches(onlyCoach))
    return null;
  // The two anchor comments delimit only the already-authenticated Coach
  // branch. Never discard any global middleware, auth or adjacent API logic.
  return lines.slice(0, first).concat(['<ONLY_MY_COACH_DISPATCH>'], lines.slice(last))
    .filter(line => !COACH_IMPORT.test(line)).join('\n');
}

// Current dispatcher (method-session transport): prove isolation for the two
// existing text branches only. Keep every shared import, session/cookie helper,
// quota, Live token/checkpoint and adjacent API statement byte-for-byte identical.
// Unlike the old anchor, this does not treat method-session helpers as Coach-only.
function modernDispatcherWithoutCoachText(source) {
  if (typeof source !== 'string' || source.length < 100 || source.length > 250_000 || source.includes('\r'))
    return null;
  let lines = source.split('\n');
  const blocks = [
    ["    if (joined === 'my-coach/stream') {",
      '    // An authenticated, one-use credential constrained to a single FREE',
      'my-coach/stream'],
    ["    if (joined === 'my-coach/turn') {", END, 'my-coach/turn'],
  ];
  for (const [start, end, route] of blocks) {
    const first = lines.indexOf(start), last = lines.indexOf(end);
    if (first < 0 || last <= first || last-first > 160 ||
        first !== lines.lastIndexOf(start) || last !== lines.lastIndexOf(end) ||
        !onlyGatedCoachBranches(lines.slice(first,last).join('\n'), route))
      return null;
    lines = lines.slice(0,first).concat(['<ONLY_EXISTING_COACH_TEXT:'+route+'>'], lines.slice(last));
  }
  return lines.join('\n');
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
  const modernBefore = modernDispatcherWithoutCoachText(before);
  const modernAfter = modernDispatcherWithoutCoachText(after);
  if (modernBefore !== null && modernAfter !== null) return modernBefore === modernAfter;
  const unchangedBefore = commonDispatcherWithoutCoach(before);
  const unchangedAfter = commonDispatcherWithoutCoach(after);
  // A missing, renamed, deleted, modified shared auth or unknown function
  // remains FULL. A raw string equality check cannot be fooled by line ranges.
  return unchangedBefore !== null && unchangedAfter !== null &&
    unchangedBefore === unchangedAfter;
}
