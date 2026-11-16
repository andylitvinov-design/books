// Private dialogue history is distinct from preference memory and voice consent.
// A transcript can contain sensitive language. No history is stored by default.
export const CHAT_HISTORY_VERSION='hh-agent-chat-history-v1';
export const CHAT_HISTORY_MAX_PAIRS=30;
export const CHAT_HISTORY_MAX_USER=2000;
export const CHAT_HISTORY_MAX_ASSISTANT=4000;
export function validateChatPair(user,assistant){
 if(typeof user!=='string'||typeof assistant!=='string')return null;
 const u=user.trim(),a=assistant.trim();
 if(!u||!a||u.length>CHAT_HISTORY_MAX_USER||a.length>CHAT_HISTORY_MAX_ASSISTANT)return null;
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(u+a))return null;
 return {user:u,assistant:a};
}
export function validChatTurnId(value){
 return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);
}
