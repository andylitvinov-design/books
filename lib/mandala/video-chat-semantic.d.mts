export type VideoChatSemanticInput={
 locale:"ru"|"en"|"es";stage:"category"|"topic"|"scenario"|"idea"|"phrase";
 utterance:string;options:Array<{id:string;label:string}>;
};
export function parseVideoChatSemanticInput(value:unknown):VideoChatSemanticInput|null;
export function validateVideoChatSemanticChoice(text:string,options:ReadonlyArray<{id:string;label:string}>):
 {optionId:string;confidence:number}|null;
export function suggestVideoChatSemanticChoice(input:VideoChatSemanticInput,
 env?:Record<string,string|undefined>,fetcher?:typeof fetch):
 Promise<{optionId?:string;confidence?:number;provider?:string;error?:string}>;
