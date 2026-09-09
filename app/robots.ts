import type { MetadataRoute } from "next";

import { getRobotsPolicy } from "@/data/seo";
import { metadataBaseFor } from "@/data/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return getRobotsPolicy(metadataBaseFor().toString());
}
