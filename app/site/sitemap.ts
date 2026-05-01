import type { MetadataRoute } from "next";
import { brand, blog } from "./lib/copy";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = brand.marketingUrl.replace(/\/$/, "");
  const now = new Date();
  const staticRoutes = [
    "",
    "/platform",
    "/fqhc",
    "/firms",
    "/pricing",
    "/security",
    "/company",
    "/blog",
    "/contact",
  ];
  const posts = blog.posts.map((p) => `/blog/${p.slug}`);
  return [...staticRoutes, ...posts].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
  }));
}
