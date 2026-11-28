/** Owner-scoped, metadata-only projection of previously fetched coach history. Drafts are not reviewed reports. */
function validStart(start,end){return typeof start==='string'&&Number.isFinite(Date.parse(start))&&Date.parse(start)<=Date.parse(end)?start:null}
export function selectLastCoachSession(reviewed,drafts){
 const records=new Map();
 for(const x of Array.isArray(reviewed)?reviewed:[]){
  if(x?.provenance!=='client_reviewed_dialogue'||typeof x.id!=='string'||!Number.isFinite(Date.parse(x.completedAt)))continue;
  records.set(x.id,{id:x.id,personaId:x.personaId,courseSessionId:x.courseSessionId,date:x.completedAt,startedAt:validStart(x.startedAt,x.completedAt),durationSeconds:x.durationSeconds,status:'reviewed'});
 }
 for(const x of Array.isArray(drafts)?drafts:[]){
  if(typeof x?.id!=='string'||records.has(x.id)||!Number.isFinite(Date.parse(x.updatedAt))||!Number.isInteger(x.turnCount)||x.turnCount<1)continue;
  records.set(x.id,{id:x.id,personaId:x.personaId,courseSessionId:x.courseSessionId,date:x.updatedAt,startedAt:validStart(x.startedAt,x.updatedAt),durationSeconds:x.durationSeconds,status:'draft'});
 }
 return [...records.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)||a.id.localeCompare(b.id))[0]||null;
}
