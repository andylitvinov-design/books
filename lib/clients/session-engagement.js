import 'server-only'
import {transaction} from '../app/database.js'
import {AppError} from '../assessments/contracts.js'
import {validUuid} from './delivery-model.js'
import {parseEngagementCommand,ENGAGEMENT_NOTICE_VERSION} from './session-engagement-policy.mjs'

const forbidden=()=>{throw new AppError('SESSION_UNAVAILABLE',404)}
const constrained=access=> {
  if(!validUuid(access?.grantId)||!validUuid(access?.sessionId)||!validUuid(access?.clientId))
    forbidden()
}
export async function readShareEngagementConsent(config,access,viewerId) {
  constrained(access)
  if(!validUuid(viewerId))forbidden()
  return transaction(config,null,async db=>{
    const row=(await db.query(
      'select accepted from app_private.client_session_engagement_consents where viewer_id=$1 and grant_id=$2',
      [viewerId,access.grantId])).rows[0]
    return Boolean(row?.accepted)
  },{server:true})
}
export async function writeShareEngagement(config,access,viewerId,input) {
  constrained(access)
  if(!validUuid(viewerId))forbidden()
  let command
  try{command=parseEngagementCommand(input)}
  catch{throw new AppError('INVALID_ENGAGEMENT_EVENT',400)}
  return transaction(config,null,async db=>{
    // Serialize consent changes and event writes for this protected viewer session.
    // A concurrent opt-out cannot leave a late write behind.
    const current=(await db.query(
      'select accepted from app_private.client_session_engagement_consents where viewer_id=$1 and grant_id=$2 for update',
      [viewerId,access.grantId])).rows[0]
    if(command.op==='consent') {
      if(current) await db.query(
        'update app_private.client_session_engagement_consents set accepted=$3,updated_at=now() where viewer_id=$1 and grant_id=$2',
        [viewerId,access.grantId,command.accepted])
      else await db.query(
        'insert into app_private.client_session_engagement_consents(viewer_id,grant_id,accepted,notice_version) values($1,$2,$3,$4)',
        [viewerId,access.grantId,command.accepted,ENGAGEMENT_NOTICE_VERSION])
      if(!command.accepted)await db.query(
        'delete from app_private.client_session_engagement_events where viewer_id=$1 and grant_id=$2',
        [viewerId,access.grantId])
      return {accepted:command.accepted}
    }
    if(!current?.accepted)throw new AppError('ENGAGEMENT_CONSENT_REQUIRED',403)
    // Server time only. Never trust client timestamps, path, source/identifiers.
    if(command.kind==='active') {
      await db.query(
        `insert into app_private.client_session_engagement_events
          (id,viewer_id,grant_id,kind,active_seconds,minute_bucket)
          values($1,$2,$3,'active',$4,date_trunc('minute',now()))
          on conflict do nothing`,
        [command.id,viewerId,access.grantId,command.seconds])
      await db.query(
        `update app_private.client_session_engagement_events
           set active_seconds=greatest(active_seconds,$3)
         where viewer_id=$1 and grant_id=$2
           and kind='active' and minute_bucket=date_trunc('minute',now())`,
        [viewerId,access.grantId,command.seconds])
    } else {
      await db.query(
        `insert into app_private.client_session_engagement_events
          (id,viewer_id,grant_id,kind) values($1,$2,$3,$4)
          on conflict (id) do nothing`,
        [command.id,viewerId,access.grantId,command.kind])
    }
    return {accepted:true}
  },{server:true})
}
export async function readOwnerShareEngagement(config,clientId,sessionId) {
  if(!validUuid(clientId)||!validUuid(sessionId))forbidden()
  return transaction(config,null,async db=>{
    // Both identifiers are validated by getOwnerSession + requireAdminRequest
    // before this function is called. This query cannot cross legacy clients.
    const grant=(await db.query(
      'select id from app_private.client_session_share_grants where legacy_client_id=$1 and session_id=$2',
      [clientId,sessionId])).rows[0]
    if(!grant)return {hasLink:false,viewCount:0,viewerSessions:0,activeSeconds:0,actions:[],recent:[]}
    const summary=(await db.query(
      `select count(*) filter(where kind='opened')::int as views,
          count(distinct viewer_id)::int as viewers,
          coalesce(sum(active_seconds),0)::int as seconds
        from app_private.client_session_engagement_events
        where grant_id=$1 and created_at>=now()-interval '90 days'`,
      [grant.id])).rows[0]
    const actions=(await db.query(
      `select kind,count(*)::int as count
         from app_private.client_session_engagement_events
         where grant_id=$1 and created_at>=now()-interval '90 days'
           and kind not in ('active','opened')
         group by kind order by count desc,kind limit 9`,
      [grant.id])).rows
    const recent=(await db.query(
      `select kind,created_at from app_private.client_session_engagement_events
         where grant_id=$1 and created_at>=now()-interval '90 days'
           and kind<>'active'
         order by created_at desc,id desc limit 20`,
      [grant.id])).rows
    return {hasLink:true,viewCount:summary?.views||0,viewerSessions:summary?.viewers||0,
      activeSeconds:summary?.seconds||0,actions:actions.map(row=>({kind:row.kind,count:row.count})),
      recent:recent.map(row=>({kind:row.kind,occurredAt:row.created_at}))}
  },{server:true})
}
