import 'server-only'
import {transaction} from './database.js'
import {AppError} from '../assessments/contracts.js'
import {getPublishedSessionReport} from '../clients/session-delivery-service.js'
import {reportWeekIndexItem} from '../consultations/report-program.mjs'

export async function listSavedProgramReports(config,store,actor,program){
  if(!['clarity','business'].includes(program))throw new AppError('INVALID_REPORT_PROGRAM',400)
  const rows=await transaction(config,actor,async db=>(await db.query(
    'select id,legacy_client_id,source_session_id,source_revision,source_hash,occurred_on from app.saved_sessions where account_id=$1 and removed_at is null order by occurred_on desc,saved_at desc,id limit 151',
    [actor.id])).rows)
  const reports=[]
  for(let offset=0;offset<Math.min(rows.length,150);offset+=4){
    const items=await Promise.all(rows.slice(offset,Math.min(offset+4,150)).map(async row=>{
      try{
        const record=await getPublishedSessionReport(config,store,row.legacy_client_id,row.source_session_id,{
          expectedSource:{revision:row.source_revision,hash:row.source_hash}})
        const occurredOn=row.occurred_on instanceof Date?row.occurred_on.toISOString().slice(0,10):String(row.occurred_on).slice(0,10)
        return reportWeekIndexItem(program,{id:row.id,occurredOn},record)
      }catch(error){
        if(error instanceof AppError&&['SESSION_UNAVAILABLE','SESSION_CHANGED','NOT_FOUND'].includes(error.code))return null
        throw error
      }
    }))
    reports.push(...items.filter(Boolean))
  }
  return {reports,limited:rows.length>150}
}
