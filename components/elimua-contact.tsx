"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";

type Props = { children: React.ReactNode; className?: string; floating?: boolean; "aria-label"?: string };

export function ElimuaContact({ children, className = "", floating = false, "aria-label": ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  function submit(form: FormData) {
    const name = String(form.get("name") ?? "").trim();
    const event = String(form.get("event") ?? "");
    const date = String(form.get("date") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const body = `Ciao Elisa, sono ${name}.\n\nOccasione: ${event}${date ? `\nData: ${date}` : ""}${message ? `\n\n${message}` : ""}\n\nVorrei informazioni sul tuo servizio make-up / hair styling.`;
    window.location.href = `https://wa.me/393347415575?text=${encodeURIComponent(body)}`;
    setOpen(false);
  }
  return <>
    <button type="button" className={className} aria-label={ariaLabel} onClick={() => setOpen(true)}>{children}</button>
    <dialog className="eli-dialog" ref={dialog} onClick={(event) => { if (event.target === dialog.current) setOpen(false); }} onClose={() => setOpen(false)} aria-labelledby="eli-dialog-title">
      <div className="eli-dialog-inner"><button className="eli-dialog-close" onClick={() => setOpen(false)} aria-label="Chiudi"><X size={18}/></button><p className="eli-eyebrow">Una bellezza che ti somiglia</p><h2 id="eli-dialog-title">Raccontami<br/><em>il tuo momento.</em></h2><p className="eli-dialog-lead">Lasciami qualche dettaglio: preparerò un messaggio WhatsApp per iniziare a parlarne.</p>
        <form action={submit} className="eli-form"><label>Il tuo nome<input name="name" autoComplete="name" required placeholder="Come ti chiami?"/></label><div className="eli-form-row"><label>Occasione<select name="event" defaultValue=""><option value="" disabled>Scegli</option><option>Sposa</option><option>Cerimonia</option><option>Shooting / set</option><option>Evento</option><option>Altro</option></select></label><label>Data (se la conosci)<input name="date" type="date"/></label></div><label>Un messaggio<textarea name="message" rows={3} placeholder="Raccontami cosa hai in mente…"/></label><button type="submit" className="eli-button">Continua su WhatsApp <ArrowRight size={16}/></button><small>Il messaggio si apre nella tua app: potrai rivederlo prima di inviarlo.</small></form><a className="eli-dialog-email" href="mailto:elisafranzo04@gmail.com">Oppure scrivimi via email <ArrowUpRight size={14}/></a></div>
    </dialog>
  </>;
}
