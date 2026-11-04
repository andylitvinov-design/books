export type UnifiedDockId = "mytube"|"video"|"ai"|"practice"|"master"|"profile";
export declare const UNIFIED_DOCK_IDS: readonly UnifiedDockId[];
export declare function isUnifiedMobileDockPath(pathname?:string):boolean;
export declare function unifiedMobileDockActive(pathname?:string,hash?:string):UnifiedDockId|null;
export declare function unifiedMobileDockHref(locale:string,id:UnifiedDockId):string|null;
