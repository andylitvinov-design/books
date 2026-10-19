// Shared browser-side owner Materials transport.
// The established /admin -> /api/admin session upgrade is available only to
// someone already authenticated as practitioner; never issue a new login.
export async function ownerMaterialApi(path,{method='GET',body,fetcher=fetch}={}){
  if(typeof path!=='string'||!path.startsWith('/api/admin/materials'))
    throw new Error('MATERIAL_UNAVAILABLE')
  const options={method,credentials:'same-origin',cache:'no-store',
    ...(body!==undefined?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})}
  let response=await fetcher(path,options)
  if(response.status===404){
    const bridge=await fetcher('/admin/api/recorder-auth',{
      method:'POST',credentials:'same-origin',cache:'no-store',
    }).catch(()=>null)
    if(bridge?.ok)response=await fetcher(path,options)
  }
  const data=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(response.status===404?
    'ADMIN_SIGN_IN_REQUIRED':data.error||'MATERIAL_UNAVAILABLE')
  return data
}
