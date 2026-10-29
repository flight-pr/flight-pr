import { publicLandingUrl } from "@/lib/site-origins";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { adminDb } from "@/lib/intranet/server";
import type { Landing } from "@/lib/intranet/types";
import { LandingView } from "@/components/intranet/landing-view";
export const dynamic = "force-dynamic";
const getLanding = cache(async (slug: string) => { const { data, error } = await adminDb().from("landing_pages").select("*").eq("slug", slug).eq("status", "published").maybeSingle(); if (error) throw new Error("Landing non disponibile"); return data as Landing | null; });
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const landing = await getLanding(slug); if (!landing) return { title: "Pagina non trovata", robots: { index: false } };
  return { title: landing.title, description: landing.description.slice(0, 160), robots: landing.template === "attivita" ? { index: false, follow: false } : { index: true, follow: true }, alternates: { canonical: publicLandingUrl(slug) }, openGraph: { title: landing.title, description: landing.description.slice(0, 160), url: publicLandingUrl(slug), ...(landing.image_url ? { images: [landing.image_url] } : {}) } };
}
export default async function PublicLanding({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const landing = await getLanding(slug); if (!landing) notFound(); return <main id="main"><LandingView landing={landing}/></main>; }
