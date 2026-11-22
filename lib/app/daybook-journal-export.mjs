import {AppError,requireUUID,requireDate} from '../assessments/contracts.js'
import {journalWrite} from './daybook-journal-contract.mjs'

// Runs in the authenticated browser. No external upload and no hidden partial export.
export async function collectJournalExport(fetcher,accountId,isCurrent){
 requireUUID(accountId)
 const entries=[],ids=new Set(),cursors=new Set()
 let before=null,bytes=0
 const check=()=>{if(!isCurrent())throw new AppError('ACCOUNT_CHANGED',409)}
 do{
  check()
  const page=await fetcher('daybook-journal?limit=50'+(before?'&before='+encodeURIComponent(before):''),undefined,'GET',{accountId})
  check()
  if(!Array.isArray(page?.entries)||page.entries.length>50||!(page.nextCursor===null||typeof page.nextCursor==='string'))throw new AppError('JOURNAL_EXPORT_INVALID',409)
  for(const row of page.entries){
   if(ids.has(row.id))throw new AppError('JOURNAL_EXPORT_CHANGED',409)
   let entry
   try{
    if(!Number.isSafeInteger(row.revision)||row.revision<1)throw new Error('revision')
    const validated=journalWrite({id:row.id,operationId:row.id,revision:row.revision,text:row.text,tags:row.tags,kind:row.kind,locale:row.locale,timezone:row.timezone,localDay:row.localDay,goalId:row.goalId})
    delete validated.operationId
    entry={...validated,createdAt:requireDate(row.createdAt),updatedAt:requireDate(row.updatedAt)}
   }catch{throw new AppError('JOURNAL_EXPORT_INVALID',409)}
   bytes+=new TextEncoder().encode(JSON.stringify(entry)).byteLength
   // Bound browser memory; fail explicitly, never label a truncated file complete.
   if(bytes>32*1024*1024)throw new AppError('JOURNAL_EXPORT_TOO_LARGE',413)
   entries.push(entry);ids.add(entry.id)
  }
  before=page.nextCursor
  if(before!==null){
   requireUUID(before)
   if(!page.entries.length||page.entries.at(-1).id!==before||cursors.has(before))throw new AppError('JOURNAL_EXPORT_CHANGED',409)
   cursors.add(before)
  }
 }while(before)
 check()
 return {format:'holistic-house-daybook-v1',exportedAt:new Date().toISOString(),entries}
}
