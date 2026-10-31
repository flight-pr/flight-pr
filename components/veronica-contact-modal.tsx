"use client";

import { ArrowUpRight, Heart, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

const OPEN_EVENT = "white-maison:open-contact";

export function ContactTrigger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>{children}</button>;
}

export function ContactPopup() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState("");
  useEffect(() => {
    const open = () => { setWhatsAppUrl(""); dialogRef.current?.showModal(); };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const [name, email, phone, service, message] = ["name", "email", "phone", "service", "message"].map((key) => String(form.get(key) ?? "").trim());
    const text = [
      `Buongiorno White Maison, sono ${name}.`,
      service ? `Vorrei informazioni su: ${service}.` : "",
      message,
      email ? `La mia email: ${email}` : "",
      phone ? `Il mio telefono: ${phone}` : "",
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/393514647079?text=${encodeURIComponent(text)}`;
    setWhatsAppUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return <dialog className="va-dialog" ref={dialogRef} aria-labelledby="va-dialog-title" onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current?.close(); }} onClose={() => setWhatsAppUrl("")}>
    <div className="va-dialog-inner"><button className="va-dialog-close" type="button" aria-label="Chiudi il modulo" onClick={() => dialogRef.current?.close()}><X size={18}/></button>
      <p className="va-kicker">WHITE MAISON · ROMA</p><h2 id="va-dialog-title">Raccontaci il tuo<br/><em>prossimo momento.</em></h2><p className="va-dialog-intro">Lasciaci qualche dettaglio: prepareremo un primo contatto su misura per te.</p>
      {whatsAppUrl ? <div className="va-form-success"><Heart size={20}/><p>Il tuo messaggio è pronto. Completa l’invio nella finestra WhatsApp appena aperta.</p><a href={whatsAppUrl} target="_blank" rel="noreferrer">Apri WhatsApp <ArrowUpRight size={14}/></a></div> : <form className="va-contact-form" onSubmit={submit}>
        <label>Il tuo nome <span>*</span><input autoComplete="name" name="name" required placeholder="Come ti chiami?"/></label>
        <div className="va-form-row"><label>Email<input autoComplete="email" name="email" type="email" placeholder="nome@email.it"/></label><label>Telefono<input autoComplete="tel" name="phone" type="tel" placeholder="Il tuo numero"/></label></div>
        <label>Di cosa vuoi parlare?<select name="service" defaultValue=""><option value="">Scegli un servizio</option><option>Atelier sposa / cerimonia</option><option>Capelli e colore</option><option>Acconciatura e make-up sposa</option><option>Barber shop</option><option>Nails ed epilazione</option><option>Japanese Head SPA</option><option>Altro</option></select></label>
        <label>Il tuo messaggio <span>*</span><textarea name="message" required rows={3} placeholder="Raccontaci cosa hai in mente…"/></label>
        <button className="va-button va-button-dark" type="submit">Continua su WhatsApp <ArrowUpRight size={16}/></button>
        <small>Il messaggio verrà composto in WhatsApp e inviato solo dopo la tua conferma.</small>
      </form>}
    </div>
  </dialog>;
}
