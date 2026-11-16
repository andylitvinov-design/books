import type {FreeGreetingCharacter} from './free-greeting-catalog.mjs';
export type {FreeGreetingCharacter} from './free-greeting-catalog.mjs';
export const FREE_GREETING_DURATION:3.5;
export const FREE_GREETING_IDS:readonly FreeGreetingCharacter[];
export type FreeGreetingCue = {
  character:FreeGreetingCharacter;
  requested:FreeGreetingCharacter;
  start:number;
  seconds:number;
  alpha:number;
  wave:number;
  bob:number;
};
export function freeGreetingCue(seconds:number,duration:number,character:FreeGreetingCharacter,sceneKey?:string,theme?:string):FreeGreetingCue|null;
export function paintFreeGreeting(
  ctx:CanvasRenderingContext2D,
  seconds:number,
  duration:number,
  character:FreeGreetingCharacter,
  aspect?:'landscape'|'portrait'|'square',
  sceneKey?:string,
  theme?:string
):boolean;
