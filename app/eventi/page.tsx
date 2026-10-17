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
  { number: "01", title: "Diciottesimi", copy: "L’energia della festa, le persone vicine e i momenti che segnano un nuovo capitolo." },
  { number: "02", title: "Compleanni", copy: "Dai dettagli preparati con cura alle emozioni spontanee: un ricordo fedele all’atmosfera della giornata." },
  { number: "03", title: "Eventi", copy: "Copertura fotografica e video per feste private, incontri e occasioni che riuniscono le persone." },
  { number: "04", title: "Conferenze", copy: "Relatori, pubblico, interventi e momenti di relazione raccontati con attenzione e discrezione." },
];

export default function Events() {
  return <main id="main">
    <section className="inner-hero events-hero"><Image src={media.services.events} fill priority unoptimized sizes="100vw" alt="Atmosfera di un evento, immagine stock temporanea"/><div className="hero-overlay"/><Reveal><Eyebrow>Fotografia · Film · Drone</Eyebrow><h1>Ogni evento<br/><em>merita di restare.</em></h1><p>Diciottesimi, compleanni, eventi e conferenze: raccontiamo persone, atmosfera e momenti con lo sguardo di Flight P.R.</p></Reveal></section>
    <section className="section editorial-intro"><Eyebrow>La stessa cura, storie diverse</Eyebrow><h2>Presenti dove<br/><em>succede qualcosa.</em></h2><p>I matrimoni sono il fulcro del nostro lavoro. Mettiamo la stessa attenzione anche nella copertura di feste private ed eventi professionali, adattando fotografia e video al ritmo di ogni occasione.</p></section>
    <section className="section event-types"><div className="section-heading"><div><Eyebrow>Le occasioni che raccontiamo</Eyebrow><h2>Ogni momento<br/><em>ha il suo ritmo.</em></h2></div></div><div className="event-types-grid">{eventTypes.map(({ number, title, copy }) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="simple-cta"><h2>Parliamo del vostro evento.</h2><Link href="/contatti" className="button-primary">Raccontateci cosa state organizzando <ArrowRight/></Link></section>
  </main>;
}
