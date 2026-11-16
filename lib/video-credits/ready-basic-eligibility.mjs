// UI preflight for the existing local Basic-video exporter. This is not an
// entitlement or debit: the authenticated server still holds/settles credits.
export function readyBasicVideoAccess({catalog,session,balanceCredits,guestFirstVideoUsed=false}) {
  const denied=reason=>({allowed:false,reason,chargeCredits:0});
  if(!catalog)return denied('checking');
  if(catalog.blocked||(catalog.chargeRequired&&!catalog.ready))return denied('unavailable');
  if(!catalog.chargeRequired)return {allowed:true,reason:null,chargeCredits:0};
  if(!Number.isSafeInteger(catalog.priceCredits)||catalog.priceCredits<=0)return denied('unavailable');
  if(session==='guest')return guestFirstVideoUsed?denied('guest_used'):
    {allowed:true,reason:null,chargeCredits:0};
  if(session==='checking')return denied('checking');
  if(session!=='signed_in')return denied('unavailable');
  if(!Number.isSafeInteger(balanceCredits)||balanceCredits<0)return denied('unavailable');
  if(balanceCredits<catalog.priceCredits)return denied('insufficient');
  return {allowed:true,reason:null,chargeCredits:catalog.priceCredits};
}
