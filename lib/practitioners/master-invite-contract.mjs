// Pure and browser-safe. Invitation secrets are 32-byte random opaque tokens.
export const MASTER_INVITE_TOKEN_PATTERN=/^[A-Za-z0-9_-]{43}$/;
export const MASTER_INVITE_PENDING_KEY='hh-master-invite-claim-v1';
export const MASTER_INVITE_TTL_DAYS=30;
export function masterInviteToken(value){
  return typeof value==='string'&&MASTER_INVITE_TOKEN_PATTERN.test(value);
}
export function masterInviteName(value){
  if(typeof value!=='string')throw new Error('INVALID_NAME');
  const name=value.trim().replace(/\s+/gu,' ');
  if(name.length<2||[...name].length>120||/[\u0000-\u001f\u007f]/u.test(name))
    throw new Error('INVALID_NAME');
  return name;
}
export function masterInviteLocale(value){
  if(!['en','ru','es'].includes(value))throw new Error('INVALID_LOCALE');
  return value;
}
export function masterInviteContinuation(value,locale,now=Date.now()){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  return masterInviteToken(value.token)&&value.locale===locale
    &&['en','ru','es'].includes(locale)
    &&Number.isSafeInteger(value.createdAt)&&value.createdAt<=now
    &&now-value.createdAt<10*60*1000;
}
