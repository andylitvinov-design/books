export type TelegramRequestLocale="ru"|"en"|"es";
export declare const HOLISTIC_TELEGRAM_ACCOUNT:"holistichouse";
export declare function telegramServiceRequestDraft(service:string,locale:TelegramRequestLocale):string|null;
export declare function telegramServiceRequestUrl(service:string,locale:TelegramRequestLocale):string|null;
export declare function parseTelegramServiceDraft(value:unknown):{service:string;locale:TelegramRequestLocale;name:string}|null;
export declare function telegramBusinessRequestFromUpdate(update:unknown,now?:number):{service:string;locale:TelegramRequestLocale;name:string;connectionId:string;chatId:string;messageId:number;updateId:number}|null;
export declare function isHolisticBusinessConnection(value:unknown,id:string,ownerId?:string):boolean;
export declare function telegramBusinessRequestReply(request:{service:string;locale:TelegramRequestLocale}):string|null;


export declare function telegramBusinessMessageFromUpdate(update:unknown,now?:number):
 {connectionId:string;chatId:string;messageId:number;updateId:number;text:string;
 request:{service:string;locale:TelegramRequestLocale;name:string}|null}|null;
export declare function telegramBusinessClientChoice(text:unknown):
 {kind:'format';value:'online'|'inperson'|'async'}|{kind:'confirm'|'cancel'|'stop'}|null;
export declare function telegramBusinessConversationReply(type:'format'|'confirm'|'submitted'|'cancelled'|'stopped'|'unavailable',input:
 {locale?:TelegramRequestLocale;service?:string;format?:string|null;referenceCode?:string|null}):string|null;

export declare function telegramBusinessServiceTitle(service:string,locale:TelegramRequestLocale):string|null;
