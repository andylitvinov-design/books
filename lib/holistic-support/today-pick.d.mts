export declare const SUPPORT_TEST_FOCUS: Readonly<Record<string, readonly string[]>>;
export declare function supportTestFocus(input?: {
  scores?: Record<string, number>;
  editedCheckins?: string[];
  goalSector?: string | null;
  category?: string | null;
}): string[];
export declare function supportTestHref(locale: string, options?: Parameters<typeof supportTestFocus>[0]): string;
