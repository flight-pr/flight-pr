import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/portfolio/demo-", "/intranet", "/api/", "/t/"] }, sitemap: "https://flightpr.it/sitemap.xml" }; }
