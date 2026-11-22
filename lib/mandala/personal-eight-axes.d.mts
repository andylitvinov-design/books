export type PersonalAxisId="anchor"|"connection"|"freedom"|"agency"|"love"|"dignity"|"self-realization"|"recognition";
export type AxisLocale="ru"|"en"|"es";
export type AxisScore={now?:number|null;desired?:number|null};
export type PersonalAxisDefinition={
 readonly id:PersonalAxisId;readonly meaningAxisId:string;readonly photo:string;
 readonly labels:Readonly<Record<AxisLocale,string>>;
 readonly descriptions:Readonly<Record<AxisLocale,string>>;
};
export const PERSONAL_EIGHT_AXES:readonly PersonalAxisDefinition[];
export function validAxisRating(value:unknown):value is number;
export function axisDifference(ratings?:AxisScore|null):number|null;
export function completedAxisCount(scores?:Record<string,AxisScore>|null):number;
export function completedPersonalAxes(scores:Record<string,AxisScore>|undefined|null,focusId:string|undefined|null):boolean;