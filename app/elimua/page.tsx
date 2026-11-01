import type { Metadata } from "next";
import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, Camera, MapPin, Menu, Sparkles } from "lucide-react";
import { ElimuaContact } from "@/components/elimua-contact";
import { ElimuaInstagramWorks } from "@/components/elimua-instagram-works";
import "./elimua.css";

export const metadata: Metadata = {
  title: "Eli MUA | Make-up artist a Roma",
  description: "Make-up e hair styling per spose, cerimonie, shooting ed eventi. La bellezza, a modo tuo — Eli MUA, Roma.",
  robots: { index: false, follow: false },
};

const services = [
  { name: "Bridal beauty", text: "Un look sposa studiato insieme: prove, make-up e hair styling in armonia con te e con il tuo giorno." },
  { name: "Cerimonia & occasioni", text: "Un make-up che ti fa sentire speciale, dalla luce del giorno fino all’ultimo brindisi." },
  { name: "Make-up fotografico", text: "Texture, forme e dettagli pensati per valorizzarti davanti all’obiettivo e sotto ogni luce." },
  { name: "Hair styling", text: "Acconciature raccolte o morbide, curate perché il tuo look abbia un’unica, naturale direzione." },
];
const workPosts = [
  { id: "DeeC6AyAG5b", title: "Preparazione sposa", type: "Bridal make-up" },
  { id: "DebV6gkiFJG", title: "Sguardo intenso", type: "Make-up cerimonia" },
  { id: "DfE3VyqiEKj", title: "Wedding day", type: "Make-up & hair" },
];

export default function ElimuaPage() {
  return <main id="main" className="eli-site">
    <div className="eli-topline"><span>Make-up artist · Hair stylist</span><a href="https://www.instagram.com/eli_mua_" target="_blank" rel="noreferrer">Roma e dintorni <MapPin size={12}/></a></div>
    <header className="eli-nav"><a className="eli-logo" href="#home" aria-label="Eli MUA, home"><span className="eli-swish">e</span><span className="eli-word"><b>ELI_MUA_</b><small>MAKEUP ARTIST</small></span></a><nav aria-label="Navigazione"><a href="#mondo">Il mio mondo</a><a href="#servizi">Servizi</a><a href="#lavori">Lavori</a></nav><ElimuaContact className="eli-nav-cta">Prenota il tuo look <ArrowUpRight size={15}/></ElimuaContact><a className="eli-mobile" href="#contatti" aria-label="Vai ai contatti"><Menu size={21}/></a></header>

    <section className="eli-hero" id="home"><div className="eli-hero-photo"><Image src="/elimua/hero-elisa-2026.webp" alt="Elisa realizza il make-up di una modella durante una preparazione beauty" fill priority sizes="(max-width: 760px) 100vw, 54vw"/><span className="eli-photo-credit">MAKE-UP BY ELI MUA</span></div><div className="eli-hero-copy"><p className="eli-eyebrow"><i/> La bellezza, a modo tuo</p><h1>La tua luce.<br/><em>Il tuo momento.</em></h1><p className="eli-hero-lead">Make-up e hair styling pensati per valorizzare ciò che ti rende unica. Con tecnica, ascolto e un’attenzione speciale ai dettagli.</p><div className="eli-hero-actions"><ElimuaContact className="eli-button">Raccontami il tuo evento <ArrowRight size={16}/></ElimuaContact><a className="eli-underlink" href="#servizi">Scopri i servizi <ArrowDown size={14}/></a></div><div className="eli-hero-sign"><span>e</span><small>ELISA FRANZINI<br/>MAKE-UP ARTIST</small></div></div><div className="eli-hero-index"><span>01</span><i/></div></section>

    <section className="eli-intro" id="mondo"><div className="eli-intro-copy"><p className="eli-eyebrow">Piacere, sono Elisa</p><h2>La bellezza non si<br/>nasconde. <em>Si riconosce.</em></h2><p>Ogni viso ha una luce diversa. Il mio lavoro è ascoltare la tua idea, capire come vuoi sentirti e trasformarla in un make-up che ti somiglia davvero.</p><p>Mi occupo di trucco e hair styling per spose, cerimonie, set fotografici ed eventi: un’esperienza attenta, curata e costruita intorno a te.</p><a href="https://www.instagram.com/eli_mua_" target="_blank" rel="noreferrer" className="eli-text-link"><Camera size={17}/> Segui i miei lavori <ArrowUpRight size={14}/></a></div><div className="eli-intro-art" aria-hidden="true"><div className="eli-orbit eli-orbit-one"/><div className="eli-orbit eli-orbit-two"/><span>e</span><small>BEAUTY<br/>IN YOUR<br/>OWN LIGHT</small></div></section>

    <section className="eli-services" id="servizi"><div className="eli-section-head"><div><p className="eli-eyebrow">Un look per ogni occasione</p><h2>La cura è<br/><em>nei dettagli.</em></h2></div><p>Dal primo confronto al tocco finale: ogni servizio parte dall’ascolto e prende forma insieme a te.</p></div><div className="eli-service-list">{services.map((service)=><article className="eli-service" key={service.name}><h3>{service.name}</h3><p>{service.text}</p><ElimuaContact className="eli-service-link" aria-label={`Chiedi informazioni: ${service.name}`}><ArrowUpRight size={18}/></ElimuaContact></article>)}</div><div className="eli-service-foot"><Sparkles size={17}/><span>Ogni proposta è personalizzata. Scrivimi per raccontarmi la tua occasione.</span><ElimuaContact className="eli-text-link">Chiedi informazioni <ArrowRight size={14}/></ElimuaContact></div></section>

    <section className="eli-work" id="lavori"><div className="eli-section-head"><div><p className="eli-eyebrow">Dal profilo di Eli</p><h2>Il make-up,<br/><em>in ogni luce.</em></h2></div><div className="eli-work-intro"><p>Una selezione di lavori reali: bridal beauty, cerimonia e preparazioni curate fino all’ultimo dettaglio.</p><a href="https://www.instagram.com/eli_mua_" target="_blank" rel="noreferrer" className="eli-text-link"><Camera size={16}/> Vedi il profilo completo <ArrowUpRight size={14}/></a></div></div><ElimuaInstagramWorks posts={workPosts}/></section>

    <section className="eli-quote"><Image className="eli-quote-backdrop" src="/elimua/quote-backdrop-2026.webp" alt="" fill sizes="100vw" aria-hidden="true"/><div className="eli-quote-shade" aria-hidden="true"/><div className="eli-quote-mark">“</div><p>Il make-up non stravolge.<br/><em>Risalta i punti di forza</em><br/>che sono già tuoi.</p><span>— ELI MUA</span><div className="eli-quote-line"/></section>

    <section className="eli-booking"><div className="eli-booking-art"><span className="eli-booking-e">e</span><i/><small>YOUR MOMENT<br/>YOUR BEAUTY</small></div><div className="eli-booking-copy"><p className="eli-eyebrow">Parliamo del tuo prossimo evento</p><h2>Cominciamo<br/><em>da te.</em></h2><p>Scrivimi la data, l’occasione e come vorresti sentirti. Ti risponderò per capire insieme il look più adatto e i prossimi passi.</p><ElimuaContact className="eli-button eli-button-light">Richiedi informazioni <ArrowRight size={16}/></ElimuaContact></div></section>

    <footer className="eli-footer" id="contatti"><a className="eli-logo eli-logo-footer" href="#home"><span className="eli-swish">e</span><span className="eli-word"><b>ELI_MUA_</b><small>MAKEUP ARTIST</small></span></a><div className="eli-footer-note"><span>ELISA FRANZINI</span><small>Make-up artist & hair stylist<br/>Roma e dintorni</small></div><div className="eli-footer-links"><a href="mailto:elisafranzo04@gmail.com">elisafranzo04@gmail.com</a><a href="tel:+393347415575">+39 334 741 5575</a><a href="https://www.instagram.com/eli_mua_" target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={13}/></a></div><div className="eli-footer-bottom"><span>© {new Date().getFullYear()} Eli MUA</span><span>Make-up che ti somiglia.</span><a href="#home">Torna su ↑</a></div></footer>
    <ElimuaContact floating className="eli-floating">Contattami <ArrowUpRight size={15}/></ElimuaContact>
    <div className="eli-demo"><span>✳</span> Concept website <b>by Flight P.R.</b></div>
  </main>;
}
