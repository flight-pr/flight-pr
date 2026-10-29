"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { quoteMoney, quoteSchema, quoteTotals, type Quote } from "@/lib/intranet/quote";
import type { Contact } from "@/lib/intranet/types";
import { quoteDefaultNotes, quoteIssuerDetails, type QuoteSettings } from "@/lib/intranet/quote-settings";
import { api, Modal, today } from "./ui";
function contactFields(c: Contact) { return { recipient: c.company ? `${c.company} / ${c.name}` : c.name, recipient_details: [c.email, c.phone].filter(Boolean).join("\n") }; }
type QuoteEditorProps = { contact?: Contact; contacts?: Contact[]; onClose: () => void };
export function QuoteEditor(props: QuoteEditorProps) {
  const [settings, setSettings] = useState<QuoteSettings | null>(null);
  const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api<QuoteSettings>("quote-settings").then((data) => { if (!cancelled) setSettings(data); }).catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [attempt]);
  if (!settings) return <Modal title="Crea preventivo PDF" onClose={props.onClose}><div className="staff-editor-form">{error ? <><p className="staff-error" role="alert">{error}</p><button className="staff-button" onClick={() => { setError(""); setAttempt((v) => v + 1); }}>Riprova</button></> : <p role="status">Caricamento dati aziendali e impostazioni…</p>}</div></Modal>;
  return <QuoteForm {...props} settings={settings}/>;
}
function QuoteForm({ contact, contacts = [], onClose, settings }: QuoteEditorProps & { settings: QuoteSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<Quote>(() => {
    const day = today(); const expiry = new Date(`${day}T12:00:00Z`); expiry.setUTCDate(expiry.getUTCDate() + settings.validity_days);
    return { number: `${settings.number_prefix}-${day.replaceAll("-", "")}-${Date.now().toString().slice(-6)}`, issued_on: day, valid_until: expiry.toISOString().slice(0, 10), title: settings.default_title, recipient: "", recipient_details: "", issuer_details: quoteIssuerDetails(settings), notes: quoteDefaultNotes(settings), items: [{ description: contact?.services.join(" · ") || settings.default_item_description, quantity: contact?.value ? 1 : settings.default_quantity, unit_price: Number(contact?.value || settings.default_unit_price) }], discount: settings.default_discount, vat: settings.default_vat, ...(contact ? contactFields(contact) : {}) };
  });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  function set<K extends keyof Quote>(key: K, value: Quote[K]) { setForm((f) => ({ ...f, [key]: value })); }
  const totals = quoteTotals(form);
  async function download(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const parsed = quoteSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ")); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/intranet/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (!response.ok) { if (response.status === 401) router.push("/intranet/login"); const data = await response.json(); throw new Error(data.error || "Generazione non riuscita."); }
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `preventivo-${form.number.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Modal title="Il prossimo progetto, nero su bianco." subtitle={`Componi il preventivo e scarica il PDF ${settings.company_name}.`} onClose={() => { if (!busy) onClose(); }} wide><form onSubmit={download} className="staff-editor-form staff-quote-form">
    {error && <p className="staff-error" role="alert">{error}</p>}
    {!!contacts.length && <label>Precompila da un cliente<select defaultValue="" onChange={(e) => { const c = contacts.find((c) => c.id === e.target.value); if (c) setForm((f) => ({ ...f, ...contactFields(c) })); }}><option value="">Seleziona un cliente</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
    <div className="staff-form-grid"><label>Numero preventivo<input required maxLength={80} value={form.number} onChange={(e) => set("number", e.target.value)}/></label><label>Oggetto<input required maxLength={200} value={form.title} onChange={(e) => set("title", e.target.value)}/></label><label>Data emissione<input required type="date" value={form.issued_on} onChange={(e) => set("issued_on", e.target.value)}/></label><label>Valido fino al<input required type="date" min={form.issued_on} value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)}/></label></div>
    <label>Intestatario<input required maxLength={300} value={form.recipient} onChange={(e) => set("recipient", e.target.value)}/></label>
    <div className="staff-form-grid"><label>Dati cliente / fatturazione<textarea rows={4} maxLength={2000} placeholder="Indirizzo, partita IVA, codice fiscale, email…" value={form.recipient_details} onChange={(e) => set("recipient_details", e.target.value)}/></label><label>Dati emittente<textarea rows={4} maxLength={2000} value={form.issuer_details} onChange={(e) => set("issuer_details", e.target.value)}/></label></div>
    <h3>Voci del preventivo</h3><div className="staff-quote-items">{form.items.map((item, index) => <div className="staff-quote-item" key={index}><label>Descrizione {index + 1}<textarea required rows={2} maxLength={1000} value={item.description} onChange={(e) => set("items", form.items.map((v, i) => i === index ? { ...v, description: e.target.value } : v))}/></label><label>Quantità<input type="number" required min="0.01" max="100000" step="0.01" value={item.quantity} onChange={(e) => set("items", form.items.map((v, i) => i === index ? { ...v, quantity: Number(e.target.value) } : v))}/></label><label>Prezzo unitario (€)<input type="number" required min={0} max={10000000} step="0.01" value={item.unit_price} onChange={(e) => set("items", form.items.map((v, i) => i === index ? { ...v, unit_price: Number(e.target.value) } : v))}/></label><span>{quoteMoney(totals.rows[index])}</span><button type="button" className="staff-icon-button staff-danger" aria-label={`Rimuovi voce ${index + 1}`} disabled={form.items.length === 1} onClick={() => set("items", form.items.filter((_, i) => i !== index))}><Trash2 size={17}/></button></div>)}</div>
    <button type="button" className="staff-button staff-button-light" disabled={form.items.length >= 50} onClick={() => set("items", [...form.items, { description: "", quantity: 1, unit_price: 0 }])}><Plus size={16}/> Aggiungi voce</button>
    <div className="staff-form-grid"><label>Sconto (%)<input type="number" required min={0} max={100} step="0.01" value={form.discount} onChange={(e) => set("discount", Number(e.target.value))}/></label><label>IVA (%)<input type="number" required min={0} max={100} step="0.01" value={form.vat} onChange={(e) => set("vat", Number(e.target.value))}/></label></div>
    <dl className="staff-quote-totals" aria-live="polite"><div><dt>Subtotale</dt><dd>{quoteMoney(totals.subtotal)}</dd></div><div><dt>Sconto</dt><dd>− {quoteMoney(totals.discount)}</dd></div><div><dt>Imponibile</dt><dd>{quoteMoney(totals.taxable)}</dd></div><div><dt>IVA</dt><dd>{quoteMoney(totals.vat)}</dd></div><div><dt>Totale</dt><dd>{quoteMoney(totals.total)}</dd></div></dl>
    <label>Note e condizioni<textarea rows={4} maxLength={6000} placeholder="Consegna, modalità di pagamento, validità degli accordi…" value={form.notes} onChange={(e) => set("notes", e.target.value)}/></label><p className="staff-form-hint">Il PDF viene scaricato sul tuo dispositivo. Compila dati fiscali e condizioni prima dell’invio; il preventivo non viene archiviato nel CRM.</p>
    <div className="staff-form-actions"><button type="button" disabled={busy} className="staff-button staff-button-light" onClick={onClose}>Chiudi</button><button disabled={busy} className="staff-button"><Download size={16}/>{busy ? "Generazione…" : "Scarica preventivo PDF"}</button></div>
  </form></Modal>;
}
