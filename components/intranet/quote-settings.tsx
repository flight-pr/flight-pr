"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { LoaderCircle, Save, Upload, X } from "lucide-react";
import { quoteSettingsSchema, type QuoteSettings } from "@/lib/intranet/quote-settings";
import { useStaff } from "./shell";
import { api } from "./ui";
import { SettingsNavigation } from "./settings-navigation";

export function QuoteSettingsPage() {
  const profile = useStaff(); const canEdit = profile.role === "admin";
  const [form, setForm] = useState<QuoteSettings | null>(null);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false); const [readingLogo, setReadingLogo] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api<QuoteSettings>("quote-settings").then((data) => { if (!cancelled) setForm(data); }).catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [attempt]);
  function set<K extends keyof QuoteSettings>(key: K, value: QuoteSettings[K]) { setForm((f) => f && { ...f, [key]: value }); setSuccess(""); }
  async function selectLogo(file?: File) {
    if (!file) return; setError(""); setSuccess("");
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2 * 1024 * 1024) { setError("Scegli un file PNG o JPG di massimo 2 MB."); return; }
    setReadingLogo(true);
    try {
      const value = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Impossibile leggere il logo. Riprova.")); reader.readAsDataURL(file); });
      set("logo_data_url", value);
    } catch (e) { setError((e as Error).message); } finally { setReadingLogo(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    const parsed = quoteSettingsSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ")); return; }
    setBusy(true);
    try { setForm(await api<QuoteSettings>("quote-settings", "PUT", parsed.data)); setSuccess("Impostazioni salvate. Verranno usate nei nuovi preventivi del team."); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <>
    <div className="staff-page-heading"><div><h1>IMPOSTAZIONI PREVENTIVI</h1><p>L’identità aziendale e i dati di partenza per ogni nuova proposta.</p></div></div>
    <SettingsNavigation active="quotes"/>
    {!canEdit && <div className="staff-notice">Le impostazioni sono condivise da tutto il team. Solo gli amministratori possono modificarle.</div>}
    {error && <div className="staff-error" role="alert">{error}{!form && <button className="staff-text-button" onClick={() => { setError(""); setAttempt((v) => v + 1); }}>Riprova</button>}</div>}
    {success && <p className="staff-success" role="status">{success}</p>}
    {!form ? !error && <div className="staff-loading" role="status"><LoaderCircle className="staff-spin"/> Caricamento impostazioni…</div> : <form onSubmit={save} className="staff-quote-settings-form">
      <fieldset disabled={!canEdit || busy || readingLogo} className="staff-settings-fields">
        <section className="staff-card staff-settings-section"><div><h2>Dati aziendali</h2><p>I recapiti e i dati fiscali dell’emittente, precompilati nei preventivi.</p></div><div className="staff-settings-inputs">
          <label>Ragione sociale / nome azienda<input required maxLength={160} value={form.company_name} onChange={(e) => set("company_name", e.target.value)}/></label>
          <div className="staff-form-grid"><label>Partita IVA<input maxLength={40} value={form.vat_number} onChange={(e) => set("vat_number", e.target.value)}/></label><label>Codice fiscale<input maxLength={40} value={form.tax_code} onChange={(e) => set("tax_code", e.target.value)}/></label></div>
          <label>Indirizzo sede<textarea rows={3} maxLength={500} placeholder="Via, numero civico, CAP, città e provincia" value={form.address} onChange={(e) => set("address", e.target.value)}/></label>
          <div className="staff-form-grid"><label>Email aziendale<input type="email" maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)}/></label><label>Telefono aziendale<input type="tel" maxLength={50} value={form.phone} onChange={(e) => set("phone", e.target.value)}/></label></div>
          <label>Sito web<input type="url" placeholder="https://…" maxLength={300} value={form.website} onChange={(e) => set("website", e.target.value)}/></label>
        </div></section>
        <section className="staff-card staff-settings-section"><div><h2>Logo nei PDF</h2><p>Viene inserito nell’intestazione di ogni preventivo. PNG o JPG, massimo 2 MB.</p></div><div className="staff-settings-inputs">
          <div className="staff-settings-logo-preview">{form.logo_data_url ? <Image src={form.logo_data_url} alt="Logo aziendale per i preventivi" width={300} height={100} unoptimized/> : <strong>{form.company_name || "Il tuo logo"}</strong>}</div>
          <label className="staff-settings-logo-input"><span><Upload size={16}/> Carica logo<input type="file" accept="image/png,image/jpeg" aria-label="Carica logo" onChange={(e) => { void selectLogo(e.target.files?.[0]); e.currentTarget.value = ""; }}/></span></label>
          {form.logo_data_url && <button type="button" className="staff-text-button staff-danger" onClick={() => set("logo_data_url", "")}><X size={15}/> Rimuovi logo</button>}
          <p className="staff-form-hint">Senza logo, il PDF mostra il nome dell’azienda. Il logo salvato verrà usato anche dai membri del team.</p>
        </div></section>
        <section className="staff-card staff-settings-section"><div><h2>Dati predefiniti</h2><p>Valori iniziali per le nuove proposte, modificabili prima di scaricare il PDF.</p></div><div className="staff-settings-inputs">
          <div className="staff-form-grid"><label>Prefisso numero preventivo<input required maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9_-]*" value={form.number_prefix} onChange={(e) => set("number_prefix", e.target.value)}/></label><label>Validità (giorni)<input required type="number" min={1} max={3650} step={1} value={form.validity_days} onChange={(e) => set("validity_days", Number(e.target.value))}/></label></div>
          <p className="staff-form-hint">Il prefisso precede data e riferimento del preventivo; il numero resta modificabile nel documento.</p>
          <label>Oggetto predefinito<input required maxLength={200} value={form.default_title} onChange={(e) => set("default_title", e.target.value)}/></label>
          <label>Descrizione voce predefinita<textarea required rows={2} maxLength={1000} value={form.default_item_description} onChange={(e) => set("default_item_description", e.target.value)}/></label>
          <div className="staff-form-grid"><label>Quantità predefinita<input required type="number" min="0.01" max={100000} step="0.01" value={form.default_quantity} onChange={(e) => set("default_quantity", Number(e.target.value))}/></label><label>Prezzo unitario predefinito (€)<input required type="number" min={0} max={10000000} step="0.01" value={form.default_unit_price} onChange={(e) => set("default_unit_price", Number(e.target.value))}/></label><label>IVA predefinita (%)<input required type="number" min={0} max={100} step="0.01" value={form.default_vat} onChange={(e) => set("default_vat", Number(e.target.value))}/></label><label>Sconto predefinito (%)<input required type="number" min={0} max={100} step="0.01" value={form.default_discount} onChange={(e) => set("default_discount", Number(e.target.value))}/></label></div>
          <label>Condizioni di pagamento<textarea rows={4} maxLength={1500} placeholder="Acconto, saldo, tempi e modalità di pagamento…" value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)}/></label>
          <label>Note e condizioni predefinite<textarea rows={5} maxLength={4000} placeholder="Consegna, revisioni incluse e altre condizioni…" value={form.default_notes} onChange={(e) => set("default_notes", e.target.value)}/></label>
        </div></section>
      </fieldset>
      {canEdit && <div className="staff-settings-save"><p>Le modifiche saranno usate nei nuovi preventivi; i PDF già scaricati mantengono i propri dati.</p><button className="staff-button" disabled={busy || readingLogo}><Save size={16}/>{busy ? "Salvataggio…" : readingLogo ? "Lettura logo…" : "Salva impostazioni"}</button></div>}
    </form>}
  </>;
}
