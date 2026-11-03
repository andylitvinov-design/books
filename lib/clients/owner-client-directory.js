// Read-only summaries of owner-created clinical client records.
// These records live in the existing encrypted prescription store; do not
// merge them with account-bound service enquiries using names/contact text.
const bounded=(value,length)=>typeof value==='string'?value.trim().slice(0,length):''
export function ownerClientSummary(record){
  if(!record||typeof record!=='object')return null
  const id=bounded(record.id,40),name=bounded(record.fullName,200)
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||!name)return null
  return {
    id,name,
    phone:bounded(record.phone,80),email:bounded(record.email,254),
    status:record.status==='archived'?'archived':'active',
    createdAt:bounded(record.createdAt,36),
    updatedAt:bounded(record.updatedAt,36),
  }
}
export function ownerClientDirectory(records){
  return (Array.isArray(records)?records:[])
    .map(ownerClientSummary).filter(Boolean)
    .sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt))||a.name.localeCompare(b.name))
}
export function ownerClientDocumentSummary(records){
  const documents=Array.isArray(records)?records:[]
  return {
    documentCount:documents.length,
    latestDocumentDate:documents.map(item=>bounded(item?.dateIssued,36)).filter(Boolean).sort().at(-1)||null,
  }
}
