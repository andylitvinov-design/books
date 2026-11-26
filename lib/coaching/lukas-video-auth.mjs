/** Server-only use with the existing createRequestAuth(request, config).
 * Never construct the auth client from a user-provided identity or metadata.
 * Google registration means a verified Google identity linked to the same
 * canonical Supabase account; it is not a browser-supplied provider string.
 */
export async function requireLukasGoogleActor(auth) {
 try {
   const actor=await auth.verified()
   const {data,error}=await auth.client.auth.getUser()
   const user=data?.user
   if(error||!actor?.id||user?.id!==actor.id||user.is_anonymous===true||!Array.isArray(user.identities)||!user.identities.some(i=>i.provider==='google'&&i.user_id===actor.id))return null
   return actor
 }catch{return null}
}

/** The exemption is derived exclusively from the existing single-owner server
 * allowlist AND its active practitioner record. Never use client flags, metadata
 * or a generic admin role. The owner must also have verified Google access. */
export async function resolveLukasVideoAccess(auth,{ownerEmailAllowed,ownerPractitionerActive}={}) {
 const actor=await requireLukasGoogleActor(auth)
 if(!actor)return null
 let ownerExempt=false
 if(typeof ownerEmailAllowed==='function'&&ownerEmailAllowed(actor)===true){
   try{ownerExempt=typeof ownerPractitionerActive==='function'&&await ownerPractitionerActive(actor)===true}catch{return null}
 }
 return {actor,googleVerified:true,ownerExempt}
}
