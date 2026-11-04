import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/demo", "/datenschutz", "/impressum"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: p ? "yearly" : "monthly", priority: p ? 0.4 : 1 }));
}
