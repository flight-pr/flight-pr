"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";

type Props = { children: React.ReactNode; className?: string; "aria-label"?: string };
export function ManzoneContact({ children, className = "", "aria-label": ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  function submit(data: FormData) {
    const name = String(data.get("name") ?? "").trim();
    const date = String(data.get("date") ?? "").trim();
    const venue = String(data.get("venue") ?? "").trim();
    const kind = String(data.get("kind") ?? "").trim();
    const note = String(data.get("note") ?? "").trim();
    const body = `Buongiorno, sono ${name}.\n\nOccasione: ${kind}${date ? `\nData: ${date}` : ""}${venue ? `\nLocation: ${venue}` : ""}${note ? `\n\n${note}` : ""}\n\nVorrei informazioni sui vostri allestimenti floreali.`;
    window.location.href = `mailto:info@albertomanzone.it?subject=${encodeURIComponent("Informazioni per il mio evento")}&body=${encodeURIComponent(body)}`;
    setOpen(false);
  }
  return <>
    <button type="button" className={className} aria-label={ariaLabel} onClick={() => setOpen(true)}>{children}</button>
    <dialog className="man-dialog" ref={dialog} onClick={e => { if (e.target === dialog.current) setOpen(false); }} onClose={() => setOpen(false)} aria-labelledby="man-dialog-title">
      <div className="man-dialog-inner">
        <button className="man-dialog-close" type="button" onClick={() => setOpen(false)} aria-label="Chiudi"><X size={18}/></button>
        <p className="man-kicker">Il vostro giorno, raccontato dai fiori</p>
        <h2 id="man-dialog-title">Cominciamo<br/><em>da un’idea.</em></h2>
        <p className="man-dialog-lead">Lasciateci qualche dettaglio: prepareremo un’email per iniziare a immaginare insieme il vostro allestimento.</p>
        <form action={submit} className="man-form">
          <label>Il vostro nome<input name="name" autoComplete="name" required placeholder="Come vi chiamiamo?"/></label>
          <div className="man-form-row"><label>Occasione<select name="kind" defaultValue="Matrimonio"><option>Matrimonio</option><option>Evento privato</option><option>Evento aziendale</option><option>Altro</option></select></label><label>Data<input name="date" type="date"/></label></div>
          <label>Location<input name="venue" placeholder="Città o location, se già scelta"/></label>
          <label>Un messaggio<textarea name="note" rows={3} placeholder="Che atmosfera immaginate?"/></label>
          <button type="submit" className="man-button">Prepara l’email <ArrowRight size={16}/></button>
          <small>L’email si aprirà nel vostro programma di posta, pronta per essere riletta e inviata.</small>
        </form>
        <a className="man-dialog-email" href="mailto:info@albertomanzone.it">Oppure scrivici direttamente <ArrowUpRight size={14}/></a>
      </div>
    </dialog>
  </>;
}
