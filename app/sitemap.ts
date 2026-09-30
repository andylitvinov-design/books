import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/data/seo";
import { metadataBaseFor } from "@/data/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = metadataBaseFor();
  const languages = Object.fromEntries(["en", "ru", "es"].map(locale => [locale, new URL(`/${locale}/about`, base).href]));
  const entries = getSitemapEntries(base.toString()).map(entry =>
    /^\/(en|ru)\/about$/.test(new URL(entry.url).pathname)
      ? { ...entry, alternates: { languages } }
      : entry);
  return [...entries, { url: new URL("/es/about", base).href, changeFrequency: "monthly", priority: 0.8, alternates: { languages } }];
}
