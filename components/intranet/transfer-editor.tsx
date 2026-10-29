"use client";
import { Check, CheckCircle2, Copy, File, FileUp, Link2, LoaderCircle, Send, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatBytes, MAX_FILE_SIZE, type Contact } from "@/lib/intranet/types";
import { publicTransferUrl } from "@/lib/site-origins";
import { api, Modal } from "./ui";
type Created = { id: string; token: string; files: { id: string; name: string; size: number }[]; partSize: number };
function putPart(url: string, blob: Blob, signal: AbortSignal, progress: (bytes: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("Caricamento annullato.")); return; }
    const xhr = new XMLHttpRequest(); const abort = () => xhr.abort();
    const clean = () => signal.removeEventListener("abort", abort);
    signal.addEventListener("abort", abort, { once: true });
    xhr.open("PUT", url); xhr.timeout = 20 * 60 * 1000;
    xhr.upload.onprogress = (event) => progress(event.loaded);
    xhr.onload = () => { clean(); if (xhr.status >= 200 && xhr.status < 300) { const etag = xhr.getResponseHeader("ETag"); if (!etag) reject(new Error("ETag non disponibile: verifica che il CORS di R2 esponga ETag.")); else resolve(etag); } else reject(new Error("R2 non ha accettato il file. Controlla la connessione e riprova.")); };
    xhr.onerror = () => { clean(); reject(new Error("Connessione a R2 non riuscita. Verifica la rete e la configurazione CORS.")); };
    xhr.ontimeout = () => { clean(); reject(new Error("Caricamento troppo lento. Controlla la connessione e riprova.")); };
    xhr.onabort = () => { clean(); reject(new Error("Caricamento annullato.")); };
    xhr.send(blob);
  });
}
export function TransferEditor({ contacts, onClose, onSaved }: { contacts: Contact[]; onClose: () => void; onSaved: (id: string, token: string) => Promise<void> }) {
  const [files, setFiles] = useState<File[]>([]); const [title, setTitle] = useState(""); const [recipient, setRecipient] = useState(""); const [message, setMessage] = useState(""); const [days, setDays] = useState(7); const [contactId, setContactId] = useState("");
  const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0); const [currentFile, setCurrentFile] = useState(""); const [error, setError] = useState(""); const [drag, setDrag] = useState(false); const [link, setLink] = useState(""); const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null); const controller = useRef<AbortController | null>(null);
  useEffect(() => { if (!busy) return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [busy]);
  useEffect(() => () => controller.current?.abort(), []);
  function addFiles(incoming: FileList | File[]) {
    const next = [...files]; let issue = "";
    for (const file of Array.from(incoming)) {
      if (!file.size) { issue = "I file vuoti non possono essere trasferiti."; continue; }
      if (file.size > MAX_FILE_SIZE) { issue = "Ogni file può pesare al massimo 100 GB."; continue; }
      if (next.length >= 50) { issue = "Massimo 50 file per trasferimento."; break; }
      if (next.reduce((sum, f) => sum + f.size, 0) + file.size > 500 * 1024 ** 3) { issue = "Massimo 500 GB per trasferimento."; continue; }
      if (!next.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) next.push(file);
    }
    setFiles(next); setError(issue); if (!title && next.length) setTitle(next[0].name.replace(/\.[^.]+$/, "").slice(0, 160));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!files.length) { setError("Seleziona almeno un file."); return; }
    setBusy(true); setError(""); setProgress(0); const signal = new AbortController(); controller.current = signal; let created: Created | undefined;
    const total = files.reduce((sum, f) => sum + f.size, 0); let done = 0;
    try {
      created = await api<Created>("transfers", "POST", { title, recipient, message, days, contact_id: contactId || null, files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })) });
      if (signal.signal.aborted) throw new Error("Caricamento annullato.");
      for (let i = 0; i < files.length; i++) {
        const file = files[i]; const entry = created.files[i]; const parts: { PartNumber: number; ETag: string }[] = []; setCurrentFile(file.name);
        for (let offset = 0, part = 1; offset < file.size; offset += created.partSize, part++) {
          const blob = file.slice(offset, Math.min(offset + created.partSize, file.size)); let etag = "";
          for (let attempt = 0; attempt < 3; attempt++) {
            if (signal.signal.aborted) throw new Error("Caricamento annullato.");
            try { const signed = await api<{ url: string }>(`transfers/${created.id}`, "POST", { action: "sign", fileId: entry.id, partNumber: part }); etag = await putPart(signed.url, blob, signal.signal, (bytes) => setProgress(Math.min(99, (done + bytes) / total * 100))); break; }
            catch (error) { if (attempt === 2 || signal.signal.aborted) throw error; }
          }
          parts.push({ PartNumber: part, ETag: etag }); done += blob.size; setProgress(Math.min(99, done / total * 100));
        }
        if (signal.signal.aborted) throw new Error("Caricamento annullato.");
        await api(`transfers/${created.id}`, "POST", { action: "complete-file", fileId: entry.id, parts });
      }
      if (signal.signal.aborted) throw new Error("Caricamento annullato.");
      await api(`transfers/${created.id}`, "POST", { action: "finish" });
      setProgress(100); setLink(publicTransferUrl(created.token, location.origin)); await onSaved(created.id, created.token);
    } catch (error) {
      setError((error as Error).message);
      if (created) { try { await api(`transfers/${created.id}`, "POST", { action: "revoke" }); } catch { setError(`${(error as Error).message} La pulizia dei file verrà ritentata automaticamente dal processo pianificato.`); } }
    } finally { setBusy(false); controller.current = null; }
  }
  async function copy() { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError("Copia il link dal campo qui sotto."); } }
  return <Modal title={link ? "La tua storia è pronta a partire." : "Un nuovo trasferimento."} subtitle={link ? "Condividi il link con chi vuoi. Nessun account richiesto al destinatario." : "Foto, film, progetti. Direttamente al tuo cliente."} onClose={() => { if (!busy) onClose(); }}>{link ? <div className="staff-transfer-success"><span><CheckCircle2 size={42}/></span><h3>File caricati. Tutto pronto.</h3><p>{files.length} file · {formatBytes(files.reduce((s, f) => s + f.size, 0))} · disponibile per {days} giorni</p><label>Link da condividere<div className="staff-share-input"><Link2 size={17}/><input readOnly value={link} onFocus={(e) => e.target.select()}/><button onClick={copy} aria-label="Copia link">{copied ? <Check size={18}/> : <Copy size={18}/>}</button></div></label>{error && <p className="staff-error" role="alert">{error}</p>}<div className="staff-form-actions"><a className="staff-button staff-button-light" href={`mailto:${recipient}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${message ? message + "\n\n" : ""}Scarica i file: ${link}\nIl link è disponibile per ${days} giorni.`)}`}>Apri email <Send size={15}/></a><button className="staff-button" onClick={onClose}>Fatto <Check size={16}/></button></div><p className="staff-form-hint">Conserva il link: generandone uno nuovo dal pannello, quello precedente viene disattivato.</p></div> : <form className="staff-editor-form" onSubmit={submit}>{error && <div className="staff-error" role="alert">{error}</div>}<fieldset disabled={busy} className="staff-upload-fields"><div className={`staff-dropzone ${drag ? "is-dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); if (!busy) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) addFiles(e.dataTransfer.files); }}><UploadCloud size={35}/><h3>Le tue storie, qui.</h3><p>Trascina i file oppure <button type="button" onClick={() => input.current?.click()}>sfoglia il dispositivo</button></p><small>Fino a 100 GB per file · 50 file · 500 GB totali</small><input ref={input} type="file" multiple className="staff-sr-only" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} aria-label="Seleziona file da trasferire"/></div>{files.length > 0 && <div className="staff-upload-file-list">{files.map((f, i) => <div key={`${f.name}-${i}`}><File size={17}/><span><strong>{f.name}</strong><small>{formatBytes(f.size)}</small></span><button type="button" aria-label={`Rimuovi ${f.name}`} onClick={() => setFiles((fs) => fs.filter((_, n) => i !== n))}><Trash2 size={16}/></button></div>)}<footer>{files.length} file selezionati<span>{formatBytes(files.reduce((s, f) => s + f.size, 0))}</span></footer></div>}<label>Titolo del trasferimento<input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Il film di Giulia e Marco"/></label><div className="staff-form-grid"><label>Email destinatario <span className="staff-optional">(facoltativa)</span><input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="cliente@esempio.it"/></label><label>Scadenza del link<select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[1, 3, 7, 14, 30].map((n) => <option value={n} key={n}>{n} {n === 1 ? "giorno" : "giorni"}</option>)}</select></label></div><label>Associa a un cliente<select value={contactId} onChange={(e) => setContactId(e.target.value)}><option value="">Nessun cliente associato</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Un messaggio per il destinatario<textarea rows={3} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Le vostre immagini, pronte da rivivere…"/></label></fieldset>{busy && <div className="staff-upload-progress" role="status"><div><span><LoaderCircle size={15} className="staff-spin"/>{progress >= 99 ? "Verifica dei file…" : currentFile || "Preparazione…"}</span><strong>{Math.floor(progress)}%</strong></div><progress max={100} value={progress} aria-label="Avanzamento del trasferimento"/><small>Mantieni aperta questa pagina fino al completamento.</small></div>}<div className="staff-form-actions">{busy ? <button type="button" className="staff-text-button staff-danger" onClick={() => controller.current?.abort()}>Annulla caricamento</button> : <button type="button" className="staff-button staff-button-light" onClick={onClose}>Annulla</button>}<button className="staff-button" disabled={busy || !files.length}><FileUp size={17}/>{busy ? "Trasferimento in corso…" : "Carica e crea link"}</button></div><p className="staff-form-hint">L’email non viene inviata automaticamente: al termine potrai copiare il link o aprire il tuo programma di posta.</p></form>}</Modal>;
}
