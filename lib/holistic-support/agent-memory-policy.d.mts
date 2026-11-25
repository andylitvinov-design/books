export const AGENT_MEMORY_VERSION:string;
export const AGENT_MEMORY_KEYS:readonly ["preferred_name","communication_style","response_length","avoid_format","personal_accent"];
export type AgentPreference={kind:string;value:string};
export function validateMemoryPreference(kind:string,value:unknown):string|null;
export function approvedMemoryForLocalPrompt(items:unknown):AgentPreference[];
export function applyAgentMemoryForTurn<T extends {address?:string;brevity?:string;excluded?:string[]}>(previous:T,memory:unknown):T;
export function proposeAgentMemoryPreference(message:unknown):AgentPreference|null;
