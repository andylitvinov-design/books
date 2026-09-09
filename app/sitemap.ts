import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/data/seo";
import { metadataBaseFor } from "@/data/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return getSitemapEntries(metadataBaseFor().toString());
}
