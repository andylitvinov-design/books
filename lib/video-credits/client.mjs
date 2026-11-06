// Only account-bound, server-priced credit metadata crosses this boundary.
// The local video component NEVER submits photos, prompts, sound or Blob here.
const base='/api/app/video-credits/'
async function get(action){
  const response=await fetch(base+action,{credentials:'same-origin',cache:'no-store'})
  if(!response.ok)throw Error('VIDEO_CREDITS_UNAVAILABLE')
  return response.json()
}
export const fetchVideoCreditCatalog=()=>get('catalog')
export const fetchVideoCreditStatus=()=>get('status')
export async function postVideoCreditAction(action,body){
  if(!['hold','complete','release'].includes(action))throw Error('INVALID_CREDIT_ACTION')
  const response=await fetch(base+action,{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
  })
  const data=await response.json()
  if(!response.ok)throw Error(data.error||'VIDEO_CREDITS_UNAVAILABLE')
  return data
}
export function releaseVideoCreditOnExit(operationId){
  // Best-effort on unmount; the backend also expires holds after 30 minutes.
  void fetch(base+'release',{
    method:'POST',credentials:'same-origin',keepalive:true,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({operationId}),
  }).catch(()=>{})
}
