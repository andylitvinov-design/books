export declare const PUBLIC_TRAFFIC_SOURCES: readonly string[];
export declare function safePublicPagePath(input: unknown): string | null;
export declare function safePublicSource(input: unknown): string | null;
export declare function sourceFromPublicEntry(href: string, referrer?: string): string;
