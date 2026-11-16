export type AgentMemoryTurnItem={kind:string;value:string};
export type AgentMemoryTurnCheck={verified:boolean;items:AgentMemoryTurnItem[]};
export function currentOwnerMatchesMemory(reply:unknown,expectedOwner:string):boolean;
export function verifiedAgentMemoryForTurn(reply:unknown,expectedOwner:string):AgentMemoryTurnCheck;
