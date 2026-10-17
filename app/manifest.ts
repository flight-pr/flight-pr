import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "Flight P.R. — Flight Personal Recording", short_name: "Flight P.R.", description: "Fotografia, film e drone per matrimoni, feste, eventi e conferenze.", start_url: "/", display: "standalone", background_color: "#080808", theme_color: "#080808", lang: "it" }; }
