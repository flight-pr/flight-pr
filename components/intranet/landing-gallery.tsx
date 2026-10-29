"use client";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef } from "react";
import type { LandingPhoto } from "@/lib/intranet/types";
export function LandingGallery({ photos, title, name }: { photos: LandingPhoto[]; title: string; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  function move(direction: number) { const element = track.current; if (!element) return; element.scrollBy({ left: element.clientWidth * .8 * direction, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard focus is required to scroll this gallery without a pointer.
  return <section className="lp-gallery-section" id="galleria" aria-label="Galleria fotografica"><div className="lp-gallery-heading"><div><p className="lp-eyebrow">LUCE, SPAZI E DETTAGLI</p><h2>{title}</h2></div><div className="lp-gallery-controls"><button type="button" onClick={() => move(-1)} aria-label="Foto precedenti"><ArrowLeft size={20}/></button><button type="button" onClick={() => move(1)} aria-label="Foto successive"><ArrowRight size={20}/></button></div></div><div ref={track} className="lp-gallery-track" tabIndex={0} role="region" aria-label="Scorri le fotografie">{photos.map((photo, index) => <figure key={`${photo.url}-${index}`}><Image src={photo.url} alt={photo.caption || `${name} - foto ${index + 1}`} width={1400} height={1000} unoptimized loading="lazy" sizes="(max-width: 700px) 85vw, 45vw"/>{photo.caption && <figcaption>{photo.caption}</figcaption>}<span className="lp-gallery-index">{String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span></figure>)}</div></section>;
}
