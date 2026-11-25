export type AliPersonaId='alex'|'max'|'mira'|'sofia';
export type AliPersonaLocale='en'|'ru'|'es';
export type AliLocalized=Readonly<Record<AliPersonaLocale,string>>;
export type AliPersona=Readonly<{
 id:AliPersonaId;
 gender:'male'|'female';
 name:AliLocalized;
 role:AliLocalized;
 image:string;
 voice:Readonly<{rate:number;pitch:number;slot:number}>;
}>;
export const ALI_PERSONA_STORAGE_KEY:'hh:ai-chat-persona-v1';
export const ALI_PERSONA_EVENT:'hh:ai-chat-persona-changed';
export const ALI_PERSONAS:readonly AliPersona[];
export const ALI_DEFAULT_PERSONA_ID:'alex';
export function getAliPersona(id:unknown):AliPersona;
export function isAliPersonaId(id:unknown):id is AliPersonaId;
export function aliPersonaGreeting(personaId:AliPersonaId|string,locale?:AliPersonaLocale):string;
