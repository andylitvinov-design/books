import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const file=x=>readFileSync(new URL(x,root),'utf8');
test('Commander PR completion Next route uses existing verified owner session and fixed Edge',()=>{
 const s=file('app/api/app/commander/pr-completion/route.js');
 assert.match(s,/createRequestAuth/);
 assert.match(s,/requireSameOrigin/);
 assert.match(s,/await auth\.verified\(\)/);
 assert.match(s,/actor\.accessToken/);
 assert.match(s,/agent-commander-pr-completion-v1/);
 assert.match(s,/INVALID_PR_REQUEST/);
 assert.doesNotMatch(s,/HH_AUTOMERGE_TOKEN|service_role|GITHUB_TOKEN|github_pat_/);
});
test('new first-party Commander PR page accepts bare PR input without model inference',()=>{
 const p=file('app/commander/pr/PrCompletionClient.jsx');
 assert.match(p,/prNumber:pr,requestId:crypto\.randomUUID\(\)/);
 assert.match(p,/^const API='\/api\/app\/commander\/pr-completion'/m);
 assert.match(p,/const m=\/\^/);
 assert.match(p,/MERGED:'GitHub смержен'/);
 assert.match(p,/Production LIVE/);
 assert.doesNotMatch(p,/openrouter|localStorage|GITHUB_TOKEN|dangerouslySetInnerHTML/);
});
test('Edge function authenticates owner or signed exact-workflow OIDC, not model text',()=>{
 const s=file('supabase/functions/agent-commander-pr-completion-v1/index.ts');
 assert.match(s,/verifyGitHubActionsOidc|checkOidc/);
 assert.match(s,/crypto\.subtle\.verify/);
 assert.match(s,/hh-commander-pr/);
 assert.match(s,/hh-pr-ten-minute-watchdog\.yml@refs\/heads\/codex\/bootstrap-books/);
 assert.match(s,/authenticatedOwner\(req\)/);
 assert.match(s,/business_brain\.owner_access/);
 assert.match(s,/readPR\(number,\{terminalControlReadback=false\}=\{\}\)/);
 assert.match(s,/for update skip locked limit 1/);
 assert.match(s,/lease_token=\$1::uuid/);
 assert.match(s,/action==='arm_dispatch'/);
 assert.match(s,/dispatch_attempted_at=now\(\)/);
 assert.match(s,/dispatch_attempted_at is null/);
 assert.match(s,/state='LEASED'/);
 assert.match(s,/MERGE_READBACK_UNVERIFIED/);
 assert.match(s,/sourceVerified:true/);
 assert.doesNotMatch(s,/secrets\.HH_AUTOMERGE_TOKEN|Bearer github_pat|next\/api\/|force.*merge/);
});
test('private SQL schema has RLS, no anon/authenticated rights, single writer PR index',()=>{
 const s=file('supabase/migrations/20261116230500_commander_pr_completion_owner_queue.sql');
 assert.match(s,/commander_pr_completions_active_pr/);
 assert.match(s,/where state in \('QUEUED','LEASED','WATCHING'\)/);
 assert.match(s,/enable row level security/);
 assert.match(s,/revoke all on business_brain\.commander_pr_completions from public,anon,authenticated/);
});


test('server preserves numeric GitHub HTTP rejection reason instead of UNKNOWN',()=>{
 const edge=file('supabase/functions/agent-commander-pr-completion-v1/index.ts');
 const literal="const label=x=>typeof x==='string'&&/^[A-Z0-9_]{3,90}$/.test(x)?x:'UNKNOWN';";
 assert.ok(edge.includes(literal),'owner-safe code parser must preserve 403/422');
 const accepts=x=>typeof x==='string'&&/^[A-Z0-9_]{3,90}$/.test(x)?x:'UNKNOWN';
 assert.equal(accepts('OWNER_REPAIR_DISPATCH_HTTP_403'),'OWNER_REPAIR_DISPATCH_HTTP_403');
 assert.equal(accepts('OWNER_REPAIR_DISPATCH_HTTP_422'),'OWNER_REPAIR_DISPATCH_HTTP_422');
 assert.equal(accepts('any invalid injected input'),'UNKNOWN');
});
test('worker wake remains signed to one GitHub workflow and fails closed for foreign callbacks',()=>{
 const s=file('supabase/functions/agent-commander-pr-completion-v1/index.ts');
 assert.match(s,/\['schedule','workflow_dispatch','workflow_run','push'\]\.includes\(claims\.event_name\)/);
 assert.match(s,/claims\.workflow_ref!==OWNER_WORKFLOW/);
 assert.match(s,/claims\.ref!=='refs\/heads\/codex\/bootstrap-books'/);
 assert.match(s,/claims\.repository!==REPO/);
 assert.match(s,/claims\.aud!==AUD/);
 assert.match(s,/crypto\.subtle\.verify/);
 assert.doesNotMatch(s,/\['schedule','workflow_dispatch','push'\]\.includes\(claims\.event_name\)/);
});
test('owner PR HEAD follows independently GitHub verified source, never spending a second repair grant',()=>{
 const s=file('supabase/functions/agent-commander-pr-completion-v1/index.ts');
 assert.match(s,/if\(state==='WATCHING'&&body\.headSha!==prior\[0\]\.requested_head_sha\)/);
 assert.match(s,/await readPR\(prior\[0\]\.pr_number\)/);
 assert.match(s,/current\.state==='open'&&current\.draft!==true/);
 assert.match(s,/current\.head\.sha===body\.headSha/);
 assert.match(s,/requested_head_sha=coalesce\(\$10::text,requested_head_sha\)/);
 assert.match(s,/lease_until>now\(\) returning \*/);
 assert.match(s,/dispatch_attempted_at is null/);
 assert.doesNotMatch(s,/set dispatch_attempted_at=null/);
});

test('only signed proven non-dispatch capacity denial may re-arm the source CAS',()=>{
 const edge=file('supabase/functions/agent-commander-pr-completion-v1/index.ts');
 assert.match(edge,/const SAFE_CAPACITY_HOLDS=new Set/);
 assert.match(edge,/body\.noDispatchVerified===true/);
 assert.match(edge,/body\.dispatchAccepted!==true/);
 assert.match(edge,/prior\[0\]\.dispatch_accepted!==true/);
 assert.match(edge,/prior\[0\]\.dispatch_attempted_at!=null/);
 assert.match(edge,/SAFE_CAPACITY_HOLDS\.has\(code\)/);
 assert.match(edge,/dispatch_attempted_at=case when \$11::boolean then null else dispatch_attempted_at end/);
 assert.match(edge,/safeCapacityRetryDeferred:verifiedNoDispatch/);
 assert.doesNotMatch(edge,/set dispatch_attempted_at=null/);
 const allowed=edge.match(/const SAFE_CAPACITY_HOLDS=new Set\(\[([\s\S]*?)\]\);/)[1];
 for(const code of ['OWNER_REPAIR_DIRECT_RESERVED_REQUIRES_REVIEW',
  'OWNER_REPAIR_DIRECT_CLAIMED_AWAITING_OUTCOME',
  'OWNER_REPAIR_DISPATCH_AMBIGUOUS_NO_RETRY'])
  assert.equal(allowed.includes(code),false,code);
});

// Historical BLOCKED requests must be observed without spending a fresh model
// or source-write grant. A former control PR can become MERGED only via a
// signed worker plus a second independent GitHub readback.
test('stale BLOCKED requests use read-only cooldown, preserve lease restart intent and terminal GitHub proof',()=>{
 const src=file('supabase/functions/agent-commander-pr-completion-v1/index.ts');
 assert.match(src,/state='BLOCKED' and \(last_checked_at is null or last_checked_at<now\(\)-interval '45 minutes'\)/);
 assert.match(src,/row\.evidence\?\.blockedRecheckOnly===true/);
 assert.doesNotMatch(src,/row\.state==='LEASED'&&row\.evidence\?\.blockedRecheckOnly===true/);
 assert.match(src,/dispatchEligibleOnce:first/);
 assert.match(src,/const first=!previouslyBlocked&&row\.dispatch_attempted_at==null/);
 assert.match(src,/blockedRecheckOnly:previouslyBlocked/);
 assert.match(src,/previousReasonCode:previouslyBlocked\?label\(row\.reason_code\):null/);
 assert.match(src,/terminalControlReadback:body\.blockedRecheckOnly===true&&/);
 assert.match(src,/prior\[0\]\.evidence\?\.blockedRecheckOnly===true/);
 assert.match(src,/controlTerminal=terminalControlReadback&&pr\.state==='closed'/);
 assert.match(src,/pr\.base\?\.ref==='codex\/bootstrap-books'/);
 assert.match(src,/pr\.base\?\.repo\?\.full_name!==REPO/);
 assert.match(src,/lease_until>now\(\)/);
});
