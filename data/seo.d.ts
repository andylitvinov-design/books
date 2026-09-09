export type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: "weekly" | "monthly";
  priority: number;
  alternates?: { languages: { ru: string; en: string } };
};

export function getSitemapEntries(baseUrl: string): SitemapEntry[];
export function getRobotsPolicy(baseUrl: string): { rules: { userAgent: string; allow: string }; sitemap: string };
