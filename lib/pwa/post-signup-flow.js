// Only the matching newly onboarded account may pause a completed Save for
// an optional installation offer. This never activates on ordinary sign-in.
export function shouldPauseNewSignupSave({pendingAccountId,accountId,installEligible}){
  return Boolean(pendingAccountId && accountId && pendingAccountId===accountId &&
    installEligible===true)
}
