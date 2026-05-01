import type { MetadataRoute } from "next";
import { brand } from "./lib/copy";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${brand.marketingUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
