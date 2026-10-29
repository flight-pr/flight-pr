import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { media } from "@/data/media";
import { Eyebrow, Reveal } from "@/components/ui";

export const metadata: Metadata = {
  title: "Eventi e conferenze",
  description: "Fotografia, video e riprese drone per diciottesimi, compleanni, eventi e conferenze con Flight P.R.",
  alternates: { canonical: "/eventi" },
};

const eventTypes = [
  { number: "01", title: "Matrimoni", copy: "Un racconto completo del giorno, dalle emozioni della cerimonia all’energia della festa." },
  { number: "02", title: "Diciottesimi", copy: "L’energia della festa, le persone vicine e i momenti che segnano un nuovo capitolo." },
  { number: "03", title: "Compleanni", copy: "Dai dettagli preparati con cura alle emozioni spontanee: un ricordo fedele all’atmosfera della giornata." },
  { number: "04", title: "Eventi privati", copy: "Copertura fotografica e video per feste, incontri e occasioni che riuniscono le persone." },
  { number: "05", title: "Conferenze", copy: "Relatori, pubblico, interventi e momenti di relazione raccontati con attenzione e discrezione." },
];

export default function Events() {
  return <main id="main">
    <section className="inner-hero events-hero"><Image src={media.services.events} fill priority unoptimized sizes="100vw" alt="Atmosfera di un evento, immagine stock temporanea"/><div className="hero-overlay"/><Reveal><Eyebrow>Fotografia · Film · Drone</Eyebrow><h1>Ogni evento<br/><em>merita di restare.</em></h1><p>Diciottesimi, compleanni, eventi e conferenze: raccontiamo persone, atmosfera e momenti con lo sguardo di Flight P.R.</p></Reveal></section>
    <section className="section editorial-intro"><Eyebrow>La stessa cura, storie diverse</Eyebrow><h2>Presenti dove<br/><em>succede qualcosa.</em></h2><p>I matrimoni sono il fulcro del nostro lavoro. Mettiamo la stessa attenzione anche nella copertura di feste private ed eventi professionali, adattando fotografia e video al ritmo di ogni occasione.</p></section>
    <section className="section event-types"><div className="section-heading"><div><Eyebrow>Le occasioni che raccontiamo</Eyebrow><h2>Ogni momento<br/><em>ha il suo ritmo.</em></h2></div></div><div className="event-types-grid">{eventTypes.map(({ number, title, copy }) => <article key={number}><div className="event-photo-slot" role="img" aria-label={`Spazio per una fotografia di ${title}`}><span>Foto {title.toLowerCase()}</span><small>Scatto originale da inserire</small></div><div className="event-type-copy"><span>{number}</span><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
    <section className="simple-cta"><h2>Ogni storia merita <em>di restare.</em></h2><Link href="/contatti" className="button-primary">Parliamo del vostro evento <ArrowRight/></Link></section>
  </main>;
}
