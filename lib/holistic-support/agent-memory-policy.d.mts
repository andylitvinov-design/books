import type { LanguageState } from "./language-agent.mjs";
export const AGENT_MEMORY_VERSION:string;
export const AGENT_MEMORY_KEYS:readonly ["preferred_name","communication_style","response_length","avoid_format","personal_accent"];
export type AgentMemoryKind=typeof AGENT_MEMORY_KEYS[number];
export type AgentPreference={kind:AgentMemoryKind;value:string};
export function validateMemoryPreference(kind:string,value:unknown):string|null;
export function approvedMemoryForLocalPrompt(items:unknown):AgentPreference[];
export function applyAgentMemoryForTurn(previous:LanguageState,memory:unknown):LanguageState;
export function proposeAgentMemoryPreference(message:unknown):AgentPreference|null;
