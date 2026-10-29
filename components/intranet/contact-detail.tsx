"use client";
import { useCallback, useEffect, useState } from "react";
import { FileDown, Pencil, Save } from "lucide-react";
import { statuses, type Activity, type Contact, type Staff } from "@/lib/intranet/types";
import { api, date, Modal, money, Status } from "./ui";
import { ContactEditor } from "./contact-editor";
import { QuoteEditor } from "./quote-editor";

export function ContactDetail({ contact, staff, onClose, onSaved }: { contact: Contact; staff: Staff[]; onClose: () => void; onSaved: (message?: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [pipeline, setPipeline] = useState<{ status: Contact["status"]; followUp: string } | null>(null);
  const status = pipeline?.status ?? contact.status;
  const followUp = pipeline?.followUp ?? (contact.follow_up || "");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const loadHistory = useCallback(async () => {
    try { setActivities(await api<Activity[]>(`activities?contact=${contact.id}`)); }
    catch (e) { setError((e as Error).message); }
    finally { setHistoryLoading(false); }
  }, [contact.id]);
  useEffect(() => {
    let cancelled = false;
    api<Activity[]>(`activities?contact=${contact.id}`).then((items) => { if (!cancelled) setActivities(items); }).catch((e) => { if (!cancelled) setError((e as Error).message); }).finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [contact.id]);
  async function updatePipeline(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api(`contacts?id=${contact.id}&pipeline=1`, "PATCH", { status, follow_up: followUp || null });
      await onSaved("Pipeline aggiornata."); setPipeline(null); await loadHistory();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function addUpdate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("activities", "POST", { contact_id: contact.id, body: note });
      setNote(""); await onSaved("Aggiornamento aggiunto."); await loadHistory();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (editing) return <ContactEditor contact={contact} staff={staff} onClose={() => setEditing(false)} onSaved={async (message) => { await onSaved(message); await loadHistory(); }}/>;
  if (quoting) return <QuoteEditor contact={contact} onClose={() => setQuoting(false)}/>;
  return <Modal title={contact.name} subtitle="Scheda cliente · informazioni e avanzamento del progetto" onClose={() => { if (!busy) onClose(); }} wide>
    <div className="staff-contact-detail">
      <section className="staff-contact-summary">
        {error && <p role="alert" className="staff-error">{error}</p>}
        <div className="staff-detail-actions"><Status value={contact.status}/><button className="staff-button staff-button-light" onClick={() => setEditing(true)} disabled={busy}><Pencil size={15}/> Modifica dati cliente</button><button className="staff-button" onClick={() => setQuoting(true)} disabled={busy}><FileDown size={15}/> Crea preventivo PDF</button></div>
        <p className="staff-kicker">IL CLIENTE</p>
        <dl className="staff-detail-info">{[
          ["Nome / referente", contact.name], ["Azienda", contact.company || "—"],
          ["Email", contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : "—"],
          ["Telefono", contact.phone ? <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}>{contact.phone}</a> : "—"],
          ["Servizi", contact.services.join(" · ") || "Da definire"], ["Valore stimato", money(Number(contact.value))],
          ["Data evento", date(contact.event_date)], ["Follow-up", date(contact.follow_up)],
          ["Referente interno", staff.find((s) => s.id === contact.owner_id)?.name || "Da assegnare"],
          ["Creato il", date(contact.created_at, true)], ["Ultima modifica", date(contact.updated_at, true)],
        ].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <h3>Note del progetto</h3><p className="staff-detail-notes">{contact.notes || "Nessuna nota inserita."}</p>
      </section>
      <aside className="staff-contact-history">
        <p className="staff-kicker">STATO & PIPELINE</p>
        <form onSubmit={updatePipeline} className="staff-pipeline-form"><label>Stato attuale<select value={status} onChange={(e) => setPipeline({ status: e.target.value as Contact["status"], followUp })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label><label>Prossimo follow-up<input type="date" value={followUp} onChange={(e) => setPipeline({ status, followUp: e.target.value })}/></label><button className="staff-button" disabled={busy || (status === contact.status && followUp === (contact.follow_up || ""))}><Save size={15}/> Aggiorna pipeline</button></form>
        <h3>Aggiornamenti</h3><form onSubmit={addUpdate}><label>Aggiungi un aggiornamento<textarea required maxLength={4000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Chiamata, incontro, accordi o prossimi passi…"/></label><button className="staff-button staff-button-light" disabled={busy || !note.trim()}>{busy ? "Salvataggio…" : "Aggiungi aggiornamento"}</button></form>
        <div className="staff-history-list" aria-live="polite">{historyLoading ? <p>Caricamento cronologia…</p> : activities.length ? activities.map((a) => <article key={a.id}><span className="staff-activity-dot"/><div><p>{a.body}</p><small>{staff.find((s) => s.id === a.author_id)?.name || "Team"} · {date(a.created_at, true)}</small></div></article>) : <p>Nessun aggiornamento.</p>}</div>
      </aside>
    </div>
  </Modal>;
}
