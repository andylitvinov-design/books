/** Canonical account-owned private MP4 path; also enforced by PostgreSQL. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function aiPersonalVideoMasterKey(accountId,jobId){
 if(typeof accountId!=='string'||typeof jobId!=='string'||
    !UUID.test(accountId)||!UUID.test(jobId))throw Error('AI_VIDEO_ACCOUNT_KEY_INVALID')
 return 'personal-videos/'+accountId.toLowerCase()+'/'+jobId.toLowerCase()+'/master.mp4'
}
