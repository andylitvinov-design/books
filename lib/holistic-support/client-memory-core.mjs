/**
 * Holistic House Client Memory & Care Journey — OFFLINE REFERENCE CORE.
 * This file has NO DB, network, encryption, user identity or deployment side effects.
 * Never use these helpers as an authorization layer on their own: the caller MUST
 * verify the current authenticated actor, verified Telegram↔account binding,
 * live consent from Supabase, RLS, sensitive-data gates and practitioner↔request
 * proof in a server transaction. Client-provided flags/role aren't trustworthy.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATEGORIES = new Set(['goal','current_desired_state','resource','boundary','practice_feedback','commitment']);
const SCOPES = new Set(['coaching','support','learning','media']);
const SOURCE_KINDS = new Set(['client_explicit','client_confirmed_ai','checkin_self_report','learning_progress','practitioner_shared']);
// Conservative privacy gate, not a diagnosis: highly sensitive disclosures require opt-in.
export function likelySensitiveDisclosure(value) {
  return typeof value==='string' && /\b(?:diagnos(?:is|ed)|suicid(?:e|al)|medication|prescription|panic attack|sexual assault|abuse|depression|trauma|depresi[oó]n|diagn[oó]stic|medicamento|suicidio)\b|(?:диагноз|суицид|лекарств|насили|депресс|паническ(?:ая|ие) атак|травматическ)/iu.test(value)
}
const ACTIONS = Object.freeze({
  accept: { from: ['offered', 'proposed'], to: 'accepted', role: 'client', event: 'accepted' },
  decline: { from: ['offered', 'proposed'], to: 'declined', role: 'client', event: 'declined' },
  start: { from: ['accepted', 'paused'], to: 'in_progress', role: 'client', event: 'started' },
  self_report: { from: ['accepted', 'in_progress'], to: 'self_reported', role: 'client', event: 'self_reported' },
  revise_report: { from: ['self_reported'], to: 'self_reported', role: 'client', event: 'revised_report' },
  pause: { from: ['accepted', 'in_progress'], to: 'paused', role: 'client', event: 'paused' },
  review: { from: ['self_reported'], to: 'reviewed', role: 'master', event: 'reviewed' },
  request_revision: { from: ['self_reported'], to: 'in_progress', role: 'master', event: 'requested_revision' },
  cancel: { from: ['offered','accepted','in_progress','paused','self_reported'], to: 'cancelled', role: 'master', event: 'cancelled' },
  archive: { from: ['reviewed','declined','cancelled','self_reported'], to: 'archived', role: 'client', event: 'archived' },
});
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function uuid(value) { return typeof value==='string' && UUID.test(value); }
function iso(value) { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toISOString() : fail('INVALID_TIME'); }
function allowedText(value) { return typeof value==='string' && value.trim().length>0 && value.trim().length<=300 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value); }

/** Use only after trusted server auth, consent, age and safety gates. This builds
 * an ephemeral proposal; it does NOT save memory. */
export function proposeMemory({accountId, category, scope='coaching', privacyClass='general', value, sourceKind='client_explicit', now=new Date()} = {}) {
  if (!uuid(accountId) || !CATEGORIES.has(category) || !SCOPES.has(scope) ||
      !['general','sensitive'].includes(privacyClass) || !SOURCE_KINDS.has(sourceKind) ||
      !allowedText(value)) fail('INVALID_MEMORY_PROPOSAL');
  if (privacyClass!=='sensitive' && likelySensitiveDisclosure(value)) fail('SENSITIVE_DATA_REQUIRES_SPECIAL_CONSENT');
  return Object.freeze({accountId,category,scope,privacyClass,value:value.trim(),sourceKind,
    proposedAt:iso(now),status:'proposal',persistent:false});
}
/** consent is a trusted server read; userConfirmed must be the user's direct action.
 * Write the returned record only via encrypted owner-only transactional storage. */
export function confirmMemory(proposal,{accountId,consent,userConfirmed,recordId,operationId,now=new Date()}={}) {
  if (!uuid(accountId) || !uuid(recordId) || !uuid(operationId) ||
      proposal?.status!=='proposal' || proposal?.accountId!==accountId || !allowedText(proposal?.value))
    fail('MEMORY_IDENTITY_OR_PAYLOAD_INVALID');
  if (userConfirmed!==true) fail('CONFIRMATION_REQUIRED');
  if (consent?.memory_enabled!==true) fail('MEMORY_CONSENT_REQUIRED');
  if (proposal.privacyClass==='sensitive' && consent.sensitive_enabled!==true) fail('SENSITIVE_CONSENT_REQUIRED');
  const at = new Date(iso(now));
  const days=proposal.privacyClass==='sensitive'?90:365;
  return Object.freeze({id:recordId,operationId,accountId,category:proposal.category,
    scope:proposal.scope,privacyClass:proposal.privacyClass,
    value:proposal.value,sourceKind:proposal.sourceKind,
    status:'confirmed',confidence:'client_confirmed',confirmedAt:at.toISOString(),
    expiresAt:new Date(at.getTime()+days*86400000).toISOString(),revision:0});
}
/** Prevent any private recall when the channel identity isn't verified, consent
 * has been revoked, or the safety gate has diverted the interaction. */
export function canRecall({accountId,verifiedAccountId,consent,risk='clear',stopped=false,guest=false}={}) {
  return uuid(accountId) && verifiedAccountId===accountId && !guest && !stopped &&
    risk==='clear' && consent?.memory_enabled===true;
}
const weights=Object.freeze({boundary:140,goal:110,commitment:100,current_desired_state:90,
  practice_feedback:85,resource:60});
const timestamp = value => { const time=Date.parse(value||''); return Number.isFinite(time)?time:0; };
/** The caller supplies only already decrypted, owner-authorized candidate items.
 * The function additionally rejects mismatched owner, expired, unconfirmed and
 * sensitive records unless separate consent is currently active. */
export function selectRecall(items,context,{now=new Date(),max=8}={}) {
  if (!canRecall(context)) return [];
  const current=timestamp(iso(now));
  if (!Array.isArray(items) || !Number.isInteger(max) || max<0 || max>8) fail('INVALID_RECALL');
  const focus=typeof context.topic==='string'?context.topic.toLocaleLowerCase().trim().slice(0,100):'';
  return items.filter(item=>item && item.accountId===context.accountId &&
      item.status==='confirmed' && CATEGORIES.has(item.category) &&
      (item.privacyClass!=='sensitive'||context.consent.sensitive_enabled===true) &&
      timestamp(item.expiresAt)>current && timestamp(item.confirmedAt)<=current &&
      allowedText(item.value))
    .map(item=>({item,score:(weights[item.category]||0)+(item.pinned===true?15:0)+
      (focus && item.value.toLocaleLowerCase().includes(focus)?8:0)+
      Math.min(12,Math.max(0,(timestamp(item.confirmedAt)-current)/86400000+12))}))
    .sort((a,b)=>b.score-a.score || timestamp(b.item.confirmedAt)-timestamp(a.item.confirmedAt) ||
      String(a.item.id||'').localeCompare(String(b.item.id||'')))
    .slice(0,max).map(row=>row.item);
}
/** Accepted, self-reported and paused assignments may contextualize a next step;
 * never present declined/proposed/offered or another client's task as accepted. */
export function selectClientTasks(tasks,context,{max=3}={}) {
  if (!canRecall(context)) return [];
  if(!Array.isArray(tasks)||!Number.isInteger(max)||max<0||max>3)fail('INVALID_TASK_RECALL');
  return tasks.filter(t=>t && t.clientAccountId===context.accountId &&
    ['accepted','in_progress','paused','self_reported'].includes(t.status))
    .sort((a,b)=>(a.dueOn||'9999-12-31').localeCompare(b.dueOn||'9999-12-31') ||
      String(a.id||'').localeCompare(String(b.id||''))).slice(0,max);
}
/** actorRole is a result of trusted server identity & DB authorization, never
 * the role string from an HTTP/Telegram input body. For master actions,
 * authorizedMaster must be the fresh practitioner↔consultation proof. */
export function transitionTask(task,{actorAccountId,actorRole,authorizedMaster=false,action,
 expectedRevision,operationId,now=new Date()}={}) {
  if (!task || !uuid(task.id) || !uuid(task.clientAccountId) || !uuid(actorAccountId) ||
      !uuid(operationId) || !Number.isSafeInteger(expectedRevision) || expectedRevision<0 ||
      !Number.isSafeInteger(task.revision) || task.revision<0 || !Object.hasOwn(ACTIONS,action))
    fail('INVALID_TASK_TRANSITION');
  const rule=ACTIONS[action];
  if (actorRole!==rule.role ||
      (actorRole==='client' && actorAccountId!==task.clientAccountId) ||
      (actorRole==='master' && (!authorizedMaster || task.origin!=='master_assignment' ||
        !uuid(task.practitionerAccountId) || task.practitionerAccountId!==actorAccountId)))
    fail('TASK_FORBIDDEN');
  // Even a repeated operation requires CURRENT authorization, because master
  // access or a client↔session binding may have been revoked since last turn.
  if (task.lastOperationId===operationId) {
    if(task.lastAction!==action || task.lastActorId!==actorAccountId)fail('IDEMPOTENCY_CONFLICT');
    return {task,event:null,duplicate:true};
  }
  if (expectedRevision!==task.revision) fail('STALE_REVISION');
  if (!rule.from.includes(task.status)) fail('INVALID_TASK_STATE');
  const when=iso(now);
  const changed={...task,status:rule.to,revision:task.revision+1,updatedAt:when,
    lastOperationId:operationId,lastAction:action,lastActorId:actorAccountId};
  if(action==='accept') changed.acceptedAt=when;
  if(action==='self_report')changed.selfReportedAt=when;
  if(action==='review')changed.reviewedAt=when;
  return {task:Object.freeze(changed),event:Object.freeze({taskId:task.id,
    clientAccountId:task.clientAccountId,actorAccountId,kind:rule.event,
    operationId,occurredAt:when}),duplicate:false};
}
export const memoryCoreVersion='2.0.0-reference';
