export type TelegramRequestLocale="ru"|"en"|"es";
export declare const HOLISTIC_TELEGRAM_ACCOUNT:"holistichouse";
export declare function telegramServiceRequestDraft(service:string,locale:TelegramRequestLocale):string|null;
export declare function telegramServiceRequestUrl(service:string,locale:TelegramRequestLocale):string|null;
export declare function parseTelegramServiceDraft(value:unknown):{service:string;locale:TelegramRequestLocale;name:string}|null;
export declare function telegramBusinessRequestFromUpdate(update:unknown,now?:number):{service:string;locale:TelegramRequestLocale;name:string;connectionId:string;chatId:string;messageId:number;updateId:number}|null;
export declare function isHolisticBusinessConnection(value:unknown,id:string,ownerId?:string):boolean;
export declare function telegramBusinessRequestReply(request:{service:string;locale:TelegramRequestLocale}):string|null;
