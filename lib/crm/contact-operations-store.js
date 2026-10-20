import { randomUUID } from 'node:crypto'
import { AppError } from '../assessments/contracts.js'
import { openSealed } from '../app/crypto.js'
import { createEmailStore } from './email-store.js'
import { CRM_SEARCH_SCAN_CAP, CRM_SEARCH_RESULTS_CAP,
  parseCrmSearchQuery,parseCrmSearchStage,contactMatchesSearch } from './contact-search.js'
import { CRM_EXPORT_MAX_CONTACTS,exportCrmContactsCsv } from './contact-csv.js'

const ctx=(owner,id)=>({accountId:owner,recordId:id,field:'crm.contact'})
const hydrate=(row,actor,config)=>({
 id:row.id,...openSealed(row.contact_ciphertext,ctx(actor.id,row.id),config),
 locale:row.locale,lifecycle:row.lifecycle,source:row.source,
 emailVerified:row.email_verified,suppressed:row.suppressed,
 revision:row.revision,createdAt:row.created_at,
})

// Only called by createCrmRepository.withOwner after owner auth,
// SET LOCAL ROLE hh_crm_backend, JWT claims and active-account check.
export function createCrmContactOperationsStore(db,actor,config) {
 return {
   async searchContacts(query,stage='all') {
     let text,scopedStage
     try {text=parseCrmSearchQuery(query);scopedStage=parseCrmSearchStage(stage)}
     catch {throw new AppError('INVALID_CONTACT_SEARCH',400)}
     const rows=(await db.query(
       "select id,contact_ciphertext,locale,lifecycle,source,email_verified,suppressed,revision,created_at " +
       "from app.crm_contacts where owner_id=$1 " +
       "and ($2::text is null or lifecycle=$2::text) " +
       "order by created_at desc,id desc limit $3",
       [actor.id,scopedStage,CRM_SEARCH_SCAN_CAP+1],
     )).rows
     let scanned=0
     const matches=[]
     for(const row of rows.slice(0,CRM_SEARCH_SCAN_CAP)) {
       scanned++
       const contact=hydrate(row,actor,config)
       if(contactMatchesSearch(contact,text)) {
         matches.push(contact)
         if(matches.length>CRM_SEARCH_RESULTS_CAP)break
       }
     }
     const visible=matches.slice(0,CRM_SEARCH_RESULTS_CAP)
     return {
       contacts:await createEmailStore(db,actor,config).listEmailEligibility(visible),
       scanned,
       scanLimited:rows.length>CRM_SEARCH_SCAN_CAP,
       matchesLimited:matches.length>CRM_SEARCH_RESULTS_CAP,
       resultCap:CRM_SEARCH_RESULTS_CAP,
     }
   },
   async exportOwnerBusinessContacts() {
     const rows=(await db.query(
       "select id,contact_ciphertext,locale,lifecycle,source,email_verified,suppressed,revision,created_at " +
       "from app.crm_contacts where owner_id=$1 order by created_at desc,id desc limit $2",
       [actor.id,CRM_EXPORT_MAX_CONTACTS+1],
     )).rows
     if(rows.length>CRM_EXPORT_MAX_CONTACTS)
       throw new AppError('CRM_EXPORT_TOO_LARGE',413)
     const data=rows.map(row=>hydrate(row,actor,config))
     const csv=exportCrmContactsCsv(data)
     await db.query(
       "insert into app.crm_data_exports(id,owner_id,scope,format,record_count) " +
       "values($1,$2,'business_contacts','csv',$3)",
       [randomUUID(),actor.id,data.length],
     )
     return {csv,rows:data.length}
   },
   async listOwnerExportAudit() {
     const rows=(await db.query(
       "select id,record_count,created_at from app.crm_data_exports " +
       "where owner_id=$1 order by created_at desc,id desc limit 5",
       [actor.id],
     )).rows
     return rows.map(r=>({id:r.id,count:r.record_count,at:r.created_at}))
   },
 }
}
