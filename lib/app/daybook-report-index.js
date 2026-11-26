import 'server-only'
import {transaction} from './database.js'
import {AppError} from '../assessments/contracts.js'
import {getPublishedClientSession} from '../clients/session-delivery-service.js'
import {reportWeekIndexItem,validReportGoalId} from '../consultations/report-program.mjs'

// Ownership only; never read or disclose private goal answers to practitioners.
export async function verifyReportGoal(config,actor,goalId){
  if(!validReportGoalId(goalId))return null
  const row=await transaction(config,actor,async db=>(await db.query(
    'select id from app_private.coaching_goals where id=$1 and account_id=$2',[goalId,actor.id])).rows[0])
  return row?.id||null
}
export async function listSavedProgramReports(config,store,actor,program,goalId=null){
  if(!['clarity','business','goal'].includes(program))throw new AppError('INVALID_REPORT_PROGRAM',400)
  const verifiedGoalId=program==='goal'?await verifyReportGoal(config,actor,goalId):null
  if(program==='goal'&&!verifiedGoalId)return {reports:[],limited:false}
  const rows=await transaction(config,actor,async db=>(await db.query(
    'select id,legacy_client_id,source_session_id,source_revision,source_hash,occurred_on from app.saved_sessions where account_id=$1 and removed_at is null order by occurred_on desc,saved_at desc,id limit 151',
    [actor.id])).rows)
  const reports=[]
  for(let offset=0;offset<Math.min(rows.length,150);offset+=4){
    const items=await Promise.all(rows.slice(offset,Math.min(offset+4,150)).map(async row=>{
      try{
        const session=await getPublishedClientSession(config,store,row.legacy_client_id,row.source_session_id,{
          expectedSource:{revision:row.source_revision,hash:row.source_hash}})
        const kind=session.reportFormat==='pdf'?'pdf':session.report?.kind
        if(!kind)return null
        const record={kind,status:'active',programPlacement:session.programPlacement}
        const occurredOn=row.occurred_on instanceof Date?row.occurred_on.toISOString().slice(0,10):String(row.occurred_on).slice(0,10)
        return reportWeekIndexItem(program,{id:row.id,occurredOn},record,verifiedGoalId)
      }catch(error){
        if(error instanceof AppError&&['SESSION_UNAVAILABLE','SESSION_CHANGED','NOT_FOUND'].includes(error.code))return null
        throw error
      }
    }))
    reports.push(...items.filter(Boolean))
  }
  return {reports,limited:rows.length>150}
}
