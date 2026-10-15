// Browser-side owner readiness check. Existing /admin cookies are deliberately
// path-scoped; migrate an already authenticated owner's session once if the
// API cannot see its separate /api/admin cookie. No secret reaches JavaScript.
export async function getRecorderReadiness(clientId,{request=fetch}={}) {
  const endpoint='/api/admin/clients/'+encodeURIComponent(clientId)+'/sessions/status'
  const opts={method:'GET',credentials:'same-origin',cache:'no-store'}
  let response=await request(endpoint,opts)
  if(response.status===401) {
    const bridge=await request('/admin/api/recorder-auth',{
      method:'POST',credentials:'same-origin',cache:'no-store',
    })
    if(bridge.ok) response=await request(endpoint,opts)
  }
  const data=await response.json().catch(()=>({}))
  if(response.status===401)throw new Error('ADMIN_SIGN_IN_REQUIRED')
  if(!response.ok||data.ready!==true)throw new Error(data.error||'MEDIA_STORAGE_UNAVAILABLE')
  return data
}
