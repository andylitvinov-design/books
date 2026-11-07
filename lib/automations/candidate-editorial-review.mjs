/**
 * Owner-only relevance triage for research candidates.
 * Deliberately NOT a rights, source-media or Vault admission workflow.
 * Decisions never update app_private.video_source_candidates_v2 or app.video_vault_assets_v1.
 */
const CANDIDATES='app_private.video_source_candidates_v2';
const REVIEWS='app_private.video_candidate_editorial_reviews_v1';
const EVENTS='app_private.video_candidate_editorial_events_v1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const EDITORIAL_DECISIONS=Object.freeze({
  shortlist:'shortlisted_for_rights_review',
  needs_evidence:'needs_more_evidence',
  reject:'rejected',
});
const REASONS=Object.freeze({
  shortlist:'owner_visual_preselection',
  needs_evidence:'source_metadata_unclear',
  reject:'not_relevant',
});

export function validateCandidateEditorialAction(data){
  if(!data||typeof data!=='object'||Array.isArray(data)||
    Object.keys(data).length!==3||
    Object.keys(data).some(k=>!['candidateId','decision','requestId'].includes(k))||
    typeof data.candidateId!=='string'||!UUID.test(data.candidateId)||
    typeof data.requestId!=='string'||!UUID.test(data.requestId)||
    typeof data.decision!=='string'||!Object.hasOwn(EDITORIAL_DECISIONS,data.decision))
    throw Error('INVALID_CANDIDATE_REVIEW');
  return {candidateId:data.candidateId,requestId:data.requestId,
    state:EDITORIAL_DECISIONS[data.decision],reason:REASONS[data.decision]};
}

export async function reviewResearchCandidate(db,raw){
  if(!db||typeof db.query!=='function')throw Error('EDITORIAL_DB_UNAVAILABLE');
  const action=validateCandidateEditorialAction(raw);
  // Reference only a real research candidate, never accept a client-provided URL, licence or asset path.
  const src=await db.query(`select candidate_id from ${CANDIDATES}
    where candidate_id=$1 and review_state='research_only' and rights_state='unverified'`,[action.candidateId]);
  if(src.rows.length!==1)return {status:'not_found',rightsApproved:false,vaultEligible:false};
  // One event per request ID; replay never updates state again.
  const event=await db.query(`insert into ${EVENTS}
    (candidate_id,operation_id,decision,reason,actor_scope)
    values($1,$2,$3,$4,'owner') on conflict(operation_id) do nothing returning event_id`,
    [action.candidateId,action.requestId,action.state,action.reason]);
  if(event.rows.length!==1)return {status:'replayed',rightsApproved:false,vaultEligible:false};
  const write=await db.query(`insert into ${REVIEWS}
    (candidate_id,decision,reason,reviewed_at) values($1,$2,$3,now())
    on conflict(candidate_id) do update set decision=excluded.decision,
      reason=excluded.reason,reviewed_at=excluded.reviewed_at returning candidate_id,decision`,
    [action.candidateId,action.state,action.reason]);
  if(write.rows.length!==1)throw Error('EDITORIAL_WRITE_UNCONFIRMED');
  return {status:'reviewed',decision:action.state,rightsApproved:false,
    vaultEligible:false,publicationAuthorized:false,mediaVerified:false};
}

/** Private DB-only read, capped to avoid a new unbounded content surface. */
export async function readCandidateEditorialReviews(db,{limit=40}={}){
  if(!db||typeof db.query!=='function'||!Number.isInteger(limit)||limit<1||limit>40)
    throw Error('EDITORIAL_INVALID_READ');
  const r=await db.query(`select r.candidate_id,r.decision,r.reason,r.reviewed_at
    from ${REVIEWS} r join ${CANDIDATES} c on c.candidate_id=r.candidate_id
    order by c.first_seen_at desc limit $1`,[limit]);
  return r.rows;
}

/** Only decisions for the forty candidate IDs visible on this owner's page. */
export async function readCandidateEditorialReviewsForPage(db,candidateIds){
  if(!db||typeof db.query!=='function'||!Array.isArray(candidateIds)||
     candidateIds.length>40||candidateIds.some(id=>typeof id!=='string'||!UUID.test(id))||
     new Set(candidateIds).size!==candidateIds.length)
    throw Error('EDITORIAL_INVALID_PAGE_IDS');
  if(!candidateIds.length)return [];
  const r=await db.query(`select r.candidate_id,r.decision,r.reason,r.reviewed_at
     from ${REVIEWS} r join ${CANDIDATES} c on c.candidate_id=r.candidate_id
     where r.candidate_id = ANY($1::uuid[])
     order by c.first_seen_at desc,c.candidate_id desc limit 40`,[candidateIds]);
  return r.rows;
}
