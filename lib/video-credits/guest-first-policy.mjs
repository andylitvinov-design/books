// Local first-video generation costs zero external compute and requires no account.
// This grants NO server credits and NEVER bypasses the paid/account ledger.
export function canStartFirstGuestVideo({viewer,catalog,guestUsed=false,hasPendingResult=false,hasCreditHold=false}){
  if(!catalog||hasCreditHold)return false
  if(viewer==='guest')return !guestUsed&&!hasPendingResult
  if(viewer==='signed_in')return !catalog.chargeRequired||(catalog.ready===true&&catalog.blocked!==true)
  return false
}
