// Only the matching newly onboarded account may pause a completed Save for
// an optional installation offer. This never activates on ordinary sign-in.
export function shouldPauseNewSignupSave({pendingAccountId,accountId,installEligible}){
  return Boolean(pendingAccountId && accountId && pendingAccountId===accountId &&
    installEligible===true)
}


// A first completed Google/Cabinet onboarding may also offer an optional
// MANUAL WhatsApp contact on desktop, even when PWA installation is unavailable.
// Never trigger on ordinary returning sign-in or a different account.
export function shouldOfferWhatsAppAfterSignup({pendingAccountId,accountId}){
  return typeof pendingAccountId==='string'&&pendingAccountId.length>0&&
    pendingAccountId===accountId
}
