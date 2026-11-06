export type IHelpLocale = "ru"|"en"|"es";
export type IHelpAction = {id:string;label:string;prompt:string;reply:string;href?:string;track?:"video"|"meditation"|"hint"};
export type IHelpPageContext = {greeting:string;section:string;actions:IHelpAction[]};
export function pageHelpFromRoute(input?:{locale?:IHelpLocale;pathname?:string;hash?:string;activeTab?:string;photo?:boolean}):IHelpPageContext;
