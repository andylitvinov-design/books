export type Locale="ru"|"en"|"es";
export type AxisScore={now?:number|null;desired?:number|null};
export type Axis={readonly id:string;readonly legacy:string;readonly image:string;readonly ru:readonly [string,string];readonly en:readonly [string,string];readonly es:readonly [string,string]};
export const PERSONAL_EIGHT_AXES:ReadonlyArray<Axis>;
export function isAxisRating(n:unknown):n is number;
export function axisGap(score?:AxisScore|null):number|null;
export function axisCompletedCount(scores?:Record<string,AxisScore>|null):number;
export function axesFormComplete(scores:Record<string,AxisScore>|undefined|null,selected:string|undefined|null):boolean;
