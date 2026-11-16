/** Owner-authenticated Command Center: one-shot, strictly origin-checked draft import.
 * No public API, DB writes, tokens, automatic task creation or agent dispatch.
 */
export const COMMANDER_ORIGIN='https://holistic-house-pr-monitor.vercel.app';
export const COMMANDER_PROTOCOL='hh.commander.task-transfer.v1';
const NONCE=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const title=s=>typeof s==='string'?s.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,140):'';
const bounded=(s,n)=>typeof s==='string'&&s.length<=n&&s.trim().length>0;

export function validateIncomingDraft(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 if(Object.keys(value).some(k=>!['title','summary','fullPrompt'].includes(k)))return null;
 if(!bounded(value.title,140)||!bounded(value.summary,800)||!bounded(value.fullPrompt,8500))return null;
 const name=title(value.title),description=value.summary.trim(),fullPrompt=value.fullPrompt.trim();
 if(name.length<6||description.length<10)return null;
 return {title:name,description,fullPrompt};
}

/** Mount only AFTER owner auth. Valid messages prefill a form; saving requires a click. */
export function attachCommanderDraftReceiver(onDraft,win=window){
 if(typeof onDraft!=='function'||typeof win?.addEventListener!=='function')return ()=>{};
 let pending=null;
 const onMessage=event=>{
  if(event.origin!==COMMANDER_ORIGIN||!event.source)return;
  const msg=event.data;
  if(!msg||msg.protocol!==COMMANDER_PROTOCOL||!NONCE.test(msg.nonce||''))return;
  if(msg.type==='HELLO'){
   pending={source:event.source,nonce:msg.nonce,expires:Date.now()+90000};
   try{event.source.postMessage({protocol:COMMANDER_PROTOCOL,type:'READY',nonce:msg.nonce},COMMANDER_ORIGIN)}catch{}
   return;
  }
  if(msg.type!=='DRAFT'||!pending||pending.source!==event.source||
   pending.nonce!==msg.nonce||Date.now()>pending.expires)return;
  const task=validateIncomingDraft(msg.task);
  if(!task)return;
  pending=null; // Consume before rendering. Replays cannot create duplicate drafts.
  onDraft(task);
  try{event.source.postMessage({protocol:COMMANDER_PROTOCOL,type:'RECEIVED_FOR_REVIEW',
    nonce:msg.nonce,saved:false,agentStarted:false},COMMANDER_ORIGIN)}catch{}
 };
 win.addEventListener('message',onMessage);
 return ()=>{pending=null;win.removeEventListener('message',onMessage)};
}
