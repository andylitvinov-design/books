/** Canonical account-owned private MP4 path; also enforced by PostgreSQL. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function aiPersonalVideoMasterKey(accountId,jobId){
 if(typeof accountId!=='string'||typeof jobId!=='string'||
    !UUID.test(accountId)||!UUID.test(jobId))throw Error('AI_VIDEO_ACCOUNT_KEY_INVALID')
 return 'personal-videos/'+accountId.toLowerCase()+'/'+jobId.toLowerCase()+'/master.mp4'
}

/**
 * A cleanup claim is NOT an arbitrary path from a webhook. Reconstruct the
 * canonical account/job path and compare exactly before deleting a private
 * Supabase object. Never infer ownership from the user's message.
 */
export function aiCanonicalOrphanObjectKey(row){
 if(typeof row?.object_key!=='string'||typeof row?.video_job_id!=='string')
  return null
 const match=/^personal-videos\/([a-f0-9-]{36})\/([a-f0-9-]{36})\/master\.mp4$/.exec(row.object_key)
 if(!match||match[2]!==row.video_job_id)return null
 try{
  const canonical=aiPersonalVideoMasterKey(match[1],match[2])
  return canonical===row.object_key?canonical:null
 }catch{return null}
}
