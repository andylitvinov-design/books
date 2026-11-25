// Only account-bound, server-priced credit metadata crosses this boundary.
// The local video component NEVER submits photos, prompts, sound or Blob here.
const base='/api/app/video-credits/'
async function get(action){
  const response=await fetch(base+action,{credentials:'same-origin',cache:'no-store'})
  if(!response.ok){
    // Anonymous visitors may build their first film locally; only the
    // verified 401 from the account server grants guest status. Other
    // failures must NEVER fall through to a free paid-credit export.
    if(action==='status'&&response.status===401){
      const body=await response.json().catch(()=>null)
      if(body?.error==='SIGN_IN_REQUIRED')throw Error('SIGN_IN_REQUIRED')
    }
    throw Error('VIDEO_CREDITS_UNAVAILABLE')
  }
  return response.json()
}
export const fetchVideoCreditCatalog=()=>get('catalog')
export const fetchVideoCreditStatus=()=>get('status')
export async function postVideoCreditAction(action,body,{timeoutMs=15000,accountId}={}){
  if(!['hold','complete','release'].includes(action))throw Error('INVALID_CREDIT_ACTION')
  // A lost response does not tell us whether the server settled. Callers
  // can retry the same operation ID after this deadline.
  const controller=new AbortController()
  const deadline=setTimeout(()=>controller.abort(),
    Number.isFinite(timeoutMs)?Math.max(10,Math.min(30000,timeoutMs)):15000)
  try{
    const response=await fetch(base+action,{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json',...(accountId?{'x-hh-account-id':accountId}:{})},body:JSON.stringify(body),
      signal:controller.signal
    })
    const data=await response.json()
    if(!response.ok)throw Error(data.error||'VIDEO_CREDITS_UNAVAILABLE')
    // Update visible balances only after this real server-acknowledged change.
    if(typeof window!=='undefined')window.dispatchEvent(new Event('hh:video-credits-changed'))
    return data
  }catch(error){
    if(controller.signal.aborted)throw Error('VIDEO_CREDITS_UNAVAILABLE')
    throw error
  }finally{clearTimeout(deadline)}
}
export function releaseVideoCreditOnExit(operationId){
  // Best-effort on unmount; the backend also expires holds after 30 minutes.
  void fetch(base+'release',{
    method:'POST',credentials:'same-origin',keepalive:true,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({operationId}),
  }).catch(()=>{})
}
