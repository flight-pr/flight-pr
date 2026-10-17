import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/matrimoni", "/eventi", "/portfolio", "/chi-siamo", "/contatti", "/privacy", "/cookie-policy"].map(path => ({ url: `https://flightpr.net${path}`, lastModified: new Date(), changeFrequency: path === "" ? "monthly" : "yearly", priority: path === "" ? 1 : .7 })); }
