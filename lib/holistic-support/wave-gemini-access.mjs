// Finite account access requests; a self-declaration is NOT verification.
export const requestKey='hh_wave_public_gemini_request';
export const eligibilityKey='hh_wave_public_gemini';
export function accessStatus(metadata,now=Date.now()){
 const a=metadata?.[eligibilityKey],r=metadata?.[requestKey];
 if(a?.version===1&&a.adultVerified===true&&a.eligibleRegionVerified===true&&a.publicGeminiConsent===true&&Number.isSafeInteger(a.expiresAtMs)&&a.expiresAtMs>now)return 'eligible';
 return r?.version===1&&r.status==='pending'&&r.adultDeclared===true&&r.regionDeclared===true&&r.publicConsent===true?'pending':'not_enabled';
}
export function accessRequestPatch(body,now=Date.now()){
 if(!body||typeof body!=='object'||Array.isArray(body))return null;
 if(body.action==='revoke'&&Object.keys(body).length===1)return {
  [requestKey]:{version:1,status:'revoked',atMs:now},
  [eligibilityKey]:{version:1,adultVerified:false,eligibleRegionVerified:false,publicGeminiConsent:false,expiresAtMs:now},
 };
 if(body.action!=='request'||Object.keys(body).length!==4||body.adultDeclared!==true||body.regionDeclared!==true||body.publicConsent!==true)return null;
 return {[requestKey]:{version:1,status:'pending',adultDeclared:true,regionDeclared:true,publicConsent:true,atMs:now}};
}
