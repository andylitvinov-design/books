import { randomUUID } from 'node:crypto'
import { AppError } from '../assessments/contracts.js'
import { openSealed } from '../app/crypto.js'
import { createEmailStore } from './email-store.js'
import { createSmsStore } from './sms-store.js'
import {makeCrmContactCursor,parseCrmContactCursor} from './contact-pagination.js'
import { CRM_SEARCH_SCAN_CAP, CRM_SEARCH_RESULTS_CAP,
  parseCrmSearchQuery,parseCrmSearchStage,contactMatchesSearch } from './contact-search.js'
import { CRM_EXPORT_MAX_CONTACTS,exportCrmContactsCsv } from './contact-csv.js'

const ctx=(owner,id)=>({accountId:owner,recordId:id,field:'crm.contact'})
export const CRM_LEAD_TRIAGE_PAGE_SIZE=25
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
   async listUnplannedLeadsPage(rawCursor=null) {
     // Pure business-contact triage. A lead with an existing open task is
     // already scheduled; this never reads clinical reports or client profiles.
     let cursor=null
     if(rawCursor!==null) {
       try {cursor=parseCrmContactCursor(rawCursor,actor.id,config.encryptionKey)}
       catch {throw new AppError('INVALID_LEAD_CURSOR',400)}
     }
     const ownerFilter="c.owner_id=$1 and c.lifecycle='lead' and c.suppressed=false " +
       "and not exists (select 1 from app.crm_followups f where " +
       "f.owner_id=c.owner_id and f.contact_id=c.id and f.status='open')"
     const total=(await db.query(
       'select count(*)::int as total from app.crm_contacts c where '+ownerFilter,
       [actor.id],
     )).rows[0]?.total||0
     const rows=(await db.query(
       'select c.id,c.contact_ciphertext,c.source,c.locale,c.created_at, ' +
       "to_char(c.created_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') as cursor_at " +
       'from app.crm_contacts c where '+ownerFilter+
       ' and ($2::timestamptz is null or c.created_at<$2::timestamptz or ' +
       '(c.created_at=$2::timestamptz and c.id<$3::uuid)) ' +
       'order by c.created_at desc,c.id desc limit $4',
       [actor.id,cursor?.createdAt||null,cursor?.id||null,CRM_LEAD_TRIAGE_PAGE_SIZE+1],
     )).rows
     const page=rows.slice(0,CRM_LEAD_TRIAGE_PAGE_SIZE)
     return {
       total,
       leads:page.map(row=>{
         const decrypted=openSealed(row.contact_ciphertext,ctx(actor.id,row.id),config)
         const referenceCode=decrypted?.enquiry?.referenceCode
         return {
           id:row.id,displayName:decrypted?.displayName||'Contact',
           source:row.source,locale:row.locale,createdAt:row.created_at,
           referenceCode:typeof referenceCode==='string'&&/^HH-[A-F0-9]{12}$/.test(referenceCode)
             ?referenceCode:null,
         }
       }),
       nextCursor:rows.length>CRM_LEAD_TRIAGE_PAGE_SIZE?makeCrmContactCursor({
         ownerId:actor.id,createdAt:page[page.length-1].cursor_at,
         id:page[page.length-1].id,encryptionKey:config.encryptionKey,
       }):null,
     }
   },
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
       contacts:await createSmsStore(db,actor,config).listSmsEligibility(
         await createEmailStore(db,actor,config).listEmailEligibility(visible)),
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
