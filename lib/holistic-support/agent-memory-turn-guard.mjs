import {approvedMemoryForLocalPrompt} from './agent-memory-policy.mjs';

const BINDING=/^[a-f0-9]{64}$/u;
const denied=()=>({verified:false,items:[]});
// A browser fingerprint is not auth; the verified server's fresh reply must match.
export function currentOwnerMatchesMemory(reply,expectedOwner){
  return typeof expectedOwner==='string'&&BINDING.test(expectedOwner)&&
    !!reply&&typeof reply==='object'&&!Array.isArray(reply)&&
    reply.ownerBinding===expectedOwner;
}
export function verifiedAgentMemoryForTurn(reply,expectedOwner){
  if(!currentOwnerMatchesMemory(reply,expectedOwner)||
    reply.consent!==true||reply.useInDialogue!==true)return denied();
  return {verified:true,items:approvedMemoryForLocalPrompt(reply.items)};
}
