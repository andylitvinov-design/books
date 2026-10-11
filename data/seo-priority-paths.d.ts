// Curated public SEO pages with reciprocal locale alternates.
export declare const SEO_PRIORITY_LOCALES: readonly ["en", "ru", "es"];
export declare const SEO_PRIORITY_PAGE_FAMILIES: ReadonlyArray<Readonly<{
  id: string;
  suffix: string;
  priority: number;
}>>;
export declare function getPrioritySitemapEntries(baseUrl: string): Array<{
  url: string;
  changeFrequency: "monthly";
  priority: number;
  alternates: { languages: Record<"en" | "ru" | "es", string> };
}>;
