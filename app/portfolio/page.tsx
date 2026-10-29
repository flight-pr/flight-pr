import type { Metadata } from "next";
import { PortfolioGrid } from "@/components/portfolio-grid";
import { Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Gli album fotografici di Flight P.R., tra matrimoni, feste e anniversari.",
  alternates: { canonical: "/portfolio" },
};

export default function Portfolio() {
  return <main id="main" className="portfolio-page"><header className="page-header"><Eyebrow>Portfolio · Album</Eyebrow><h1>Storie.<br /><em>Ognuna diversa.</em></h1><p>Feste, matrimoni e anniversari: ogni occasione ha volti, gesti ed emozioni da ritrovare.</p></header><section className="portfolio-section" aria-label="Album fotografici"><PortfolioGrid /></section></main>;
}
