import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowUpRight, Clock, Mail, MapPin, Phone, Plus } from "lucide-react";
import { Navbar } from "@/components/site-shell";
import { media } from "@/data/media";
import { SITE_ORIGIN } from "@/lib/site-origins";
import type { Landing } from "@/lib/intranet/types";
import { LegacyLandingView } from "./legacy-landing-view";
import { LandingGallery } from "./landing-gallery";
import "./landing.css";
type Content = Omit<Landing, "id" | "created_at" | "updated_at" | "status" | "slug" | "title">;
const fonts = { manrope: "var(--font-sans), sans-serif", cormorant: "var(--font-serif), Georgia, serif", montserrat: "var(--font-display), sans-serif", georgia: "Georgia, serif" };
export function LandingView({ landing, embedded = false }: { landing: Content; embedded?: boolean }) {
  if (!["location", "attivita"].includes(landing.template)) return <LegacyLandingView landing={landing} embedded={embedded}/>;
  const business = landing.template === "attivita";
  const gallery = (landing.gallery || []).filter((p) => p.url.startsWith("https://"));
  const hero = landing.image_url.startsWith("https://") ? landing.image_url : "";
  const introImage = landing.intro_image_url || gallery[0]?.url || hero;
  const featureImage = landing.feature_image_url || introImage;
  const font = landing.heading_font && landing.heading_font in fonts ? landing.heading_font : business ? "manrope" : "cormorant";
  const accent = /^#[0-9a-f]{6}$/i.test(landing.accent) ? landing.accent : "#f36a21";
  const rawHref = landing.cta_url;
  const safe = !Array.from(rawHref).some((c) => c === "\\" || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) && /^(?:\/(?!\/)|https:\/\/|mailto:|tel:|#[A-Za-z])/.test(rawHref);
  const href = safe ? rawHref.startsWith("/") ? `${SITE_ORIGIN}${rawHref}` : rawHref : `${SITE_ORIGIN}/contatti`;
  const cta = (className = "lp-primary") => embedded ? <span className={className}>{landing.cta_label}<ArrowUpRight size={18}/></span> : <a href={href} className={className}>{landing.cta_label}<ArrowUpRight size={18}/></a>;
  return <div className={`lp-page lp-v2 lp-${landing.template} ${embedded ? "lp-embedded" : ""}`} style={{ "--lp-accent": accent, "--lp-heading-font": fonts[font], "--lp-heading-weight": font === "montserrat" ? 800 : font === "manrope" ? 500 : 400 } as CSSProperties}>
    {business ? <><div className="lp-demo-banner">Questa pagina web è una DEMO offerta da <a href={SITE_ORIGIN}>Flight P.R.</a></div><header className="lp-business-navbar"><a href="#inizio" className="lp-business-logo">{landing.heading}</a><nav aria-label="Navigazione della pagina"><a href="#chi-siamo">Chi siamo</a>{!!landing.offerings?.length && <a href="#servizi">Servizi</a>}{!!gallery.length && <a href="#galleria">Galleria</a>}<a href="#contatti">Contatti <ArrowUpRight size={14}/></a></nav><a href="#contatti" className="lp-business-mobile-contact">Contattaci <ArrowUpRight size={16}/></a></header></> : <Navbar baseUrl={SITE_ORIGIN} embedded={embedded}/>}
    <section className={`lp-full-hero ${!hero ? "lp-full-hero-empty" : ""}`} id="inizio">
      {hero && <Image src={hero} alt="" fill unoptimized priority sizes="100vw" className="lp-full-hero-image"/>}<div className="lp-full-hero-overlay"/>
      <div className="lp-hero-center">{landing.eyebrow && <p className="lp-eyebrow">{landing.eyebrow}</p>}<h1>{landing.heading}</h1><p className="lp-hero-subtitle">{landing.hero_subtitle || (business ? "Il nostro lavoro. La tua prossima esperienza." : landing.location_address || "Un luogo, infinite emozioni.")}</p>{cta()}</div><a className="lp-scroll-cue" href="#chi-siamo">SCOPRI DI PIÙ <span>↓</span></a>
    </section>
    <section className="lp-about lp-content-width" id="chi-siamo"><div className="lp-about-copy"><p className="lp-eyebrow">{business ? "01 / CHI SIAMO" : "IL LUOGO, LA SUA STORIA"}</p><h2>{landing.intro_title || (business ? "La passione si vede nei dettagli." : "C’è un luogo per ogni storia.")}</h2><p className="lp-about-lead">{landing.description}</p>{landing.location_details && <p className="lp-body-copy">{landing.location_details}</p>}{cta("lp-text-cta")}</div><div className="lp-about-image">{introImage ? <Image src={introImage} alt={`${landing.heading} — spazi e dettagli`} fill unoptimized sizes="(max-width: 700px) 90vw, 45vw"/> : <div className="lp-image-placeholder"><span>Uno spazio da raccontare.</span></div>}</div></section>
    {!!landing.offerings?.length && <section className="lp-offerings lp-content-width" id="servizi"><div className="lp-section-intro"><p className="lp-eyebrow">{business ? "02 / COSA FACCIAMO" : "SPAZI & ESPERIENZE"}</p><h2>{landing.services_title || (business ? "Pensato per te. Curato in ogni dettaglio." : "Il tuo evento, la tua atmosfera.")}</h2></div><div className="lp-offering-grid">{landing.offerings.map((item, index) => <article key={index}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.description}</p><ArrowUpRight size={25} aria-hidden="true"/></article>)}</div></section>}
    {business && landing.feature_title && <section className="lp-feature"><div className="lp-feature-image">{featureImage ? <Image src={featureImage} alt={landing.feature_title} fill unoptimized sizes="(max-width: 700px) 100vw, 50vw"/> : <div className="lp-image-placeholder"><span>Il tuo prossimo progetto.</span></div>}</div><div className="lp-feature-copy"><p className="lp-eyebrow">IL NOSTRO MODO DI LAVORARE</p><h2>{landing.feature_title}</h2><p className="lp-body-copy">{landing.feature_text}</p>{cta()}</div></section>}
    {!!gallery.length && <LandingGallery photos={gallery} title={landing.gallery_title || (business ? "Il nostro mondo, da vicino." : "La bellezza, da ogni prospettiva.")} name={landing.heading}/>}
    {business && !!landing.faq?.length && <section className="lp-faq lp-content-width"><div><p className="lp-eyebrow">LE RISPOSTE, IN CHIARO</p><h2>Domande frequenti</h2></div><div>{landing.faq.map((item, index) => <details key={index}><summary>{item.question}<Plus size={18} aria-hidden="true"/></summary><p>{item.answer}</p></details>)}</div></section>}
    {business && <section className="lp-final-contact"><div className="lp-content-width"><p className="lp-eyebrow">FACCIAMO IL PRIMO PASSO</p><h2>{landing.contact_title || "La prossima idea parte da una conversazione."}</h2>{landing.contact_description && <p>{landing.contact_description}</p>}{cta()}</div></section>}
    <footer className="lp-location-footer" id="contatti"><div className="lp-content-width"><div><span className="lp-footer-label">{business ? "VIENI A CONOSCERCI" : "TI ASPETTIAMO QUI"}</span><h2>{landing.heading}</h2>{landing.footer_info && <p>{landing.footer_info}</p>}</div><address>{landing.location_address && <p><MapPin size={17}/>{landing.location_address}</p>}{landing.contact_email && <a href={`mailto:${landing.contact_email}`}><Mail size={17}/>{landing.contact_email}</a>}{landing.contact_phone && <a href={`tel:${landing.contact_phone.replace(/[^+\d]/g, "")}`}><Phone size={17}/>{landing.contact_phone}</a>}{landing.opening_hours && <p><Clock size={17}/>{landing.opening_hours}</p>}</address></div></footer>
    <aside className="lp-flight-promo"><div className="lp-content-width"><a href={SITE_ORIGIN} className="lp-promo-brand"><Image src={media.logo} width={65} height={52} alt="Flight P.R." unoptimized/><span>FLIGHT P.R.<small>PERSONAL RECORDING</small></span></a><div><p>{business ? "La tua attività merita un sito così." : "Il tuo prossimo evento, il nostro sguardo."}</p><span>{business ? "Siti web, contenuti e nuove prospettive per il tuo brand." : "Fotografia, film e riprese aeree. Diamo forma ai tuoi ricordi."}</span></div><a href={`${SITE_ORIGIN}/contatti`} className="lp-promo-link">Scopri Flight P.R. <ArrowUpRight size={18}/></a></div></aside>
  </div>;
}
