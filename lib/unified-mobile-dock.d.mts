export type UnifiedDockId = "mytube"|"video"|"ai"|"practice"|"coach"|"services"|"profile";
export declare const UNIFIED_DOCK_IDS: readonly UnifiedDockId[];
export declare function isUnifiedMobileDockHomePath(pathname?:string):boolean;
export declare function isUnifiedMobileDockAppPath(pathname?:string):boolean;
export declare function isUnifiedMobileDockEditorialPath(pathname?:string):boolean;
export declare function isUnifiedMobileDockPath(pathname?:string):boolean;
export declare function unifiedMobileDockActive(pathname?:string,hash?:string):UnifiedDockId|null;
export declare function unifiedMobileDockHref(locale:string,id:UnifiedDockId):string|null;
