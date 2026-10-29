import type { Metadata } from "next";
import "@/components/intranet/intranet.css";
export const metadata: Metadata = { title: "Area staff", robots: { index: false, follow: false }, alternates: { canonical: null }, referrer: "no-referrer" };
export default function IntranetLayout({ children }: { children: React.ReactNode }) { return children; }
