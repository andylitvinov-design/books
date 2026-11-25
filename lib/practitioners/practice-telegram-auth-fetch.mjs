// Reuse the existing verified owner -> admin bridge only when its admin API
// cookie is absent. Never expose an admin token to JavaScript or create a new
// authentication path: the server still checks the owner's Google session,
// practitioner identity and same-origin request.
export async function fetchPracticeTelegramAudio(fetcher, signal) {
  const listPath='/api/admin/materials/telegram'
  const options={credentials:'same-origin',cache:'no-store',signal}
  let response=await fetcher(listPath,options)
  if(response.status===404){
    // The owner can open My Practice with a valid Google session without ever
    // visiting /admin; its scoped admin API cookie has not been issued yet.
    const bridge=await fetcher('/api/app/practitioner/open',{
      ...options,method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({destination:'materials'}),
    })
    if(!bridge.ok)throw Error('OWNER_AUDIO_AUTH_REQUIRED')
    const handoff=await bridge.json().catch(()=>null)
    if(handoff?.redirectUrl!=='/admin/materials')
      throw Error('OWNER_AUDIO_AUTH_REQUIRED')
    // The cookie is HttpOnly and scoped to /api/admin. Fetch it once; the
    // verified bridge response is never treated as media authorization.
    response=await fetcher(listPath,options)
  }
  if(!response.ok)throw Error('OWNER_AUDIO_UNAVAILABLE')
  const result=await response.json()
  if(!Array.isArray(result?.files))throw Error('OWNER_AUDIO_INVALID_LIST')
  return result.files
}
