"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StaffBrand } from "./brand";
import { staffActivationUrl, SITE_ORIGIN } from "@/lib/site-origins";
import { browserAuth } from "@/lib/intranet/browser";
export function Activate() {
  const [ready, setReady] = useState(false); const [error, setError] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function init() {
      try {
        const auth = browserAuth(); const url = new URL(window.location.href); const hash = new URLSearchParams(url.hash.slice(1));
        const code = url.searchParams.get("code"); const tokenHash = url.searchParams.get("token_hash"); const type = url.searchParams.get("type");
        history.replaceState(null, "", new URL(staffActivationUrl(location.origin)).pathname);
        if (hash.get("error") || url.searchParams.get("error")) throw new Error("Link non valido o scaduto. Richiedi un nuovo invito o recupera la password.");
        if (tokenHash) { if (type !== "recovery" && type !== "invite") throw new Error("Tipo di link non valido."); const { error } = await auth.auth.verifyOtp({ token_hash: tokenHash, type }); if (error) throw error; }
        else if (code) { const { error } = await auth.auth.exchangeCodeForSession(code); if (error) throw error; }
        else if (hash.get("access_token") && hash.get("refresh_token")) { const { error } = await auth.auth.setSession({ access_token: hash.get("access_token")!, refresh_token: hash.get("refresh_token")! }); if (error) throw error; }
        const { data: { user } } = await auth.auth.getUser();
        if (!user) throw new Error("Link non valido o scaduto. Richiedi un nuovo invito o recupera la password.");
        setReady(true);
      } catch { setError("Link non valido o scaduto. Richiedi un nuovo invito o recupera la password."); }
    } void init();
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); if (password !== confirm) { setError("Le password non coincidono."); return; } setBusy(true);
    try { const { error } = await browserAuth().auth.updateUser({ password }); if (error) throw new Error("Password non accettata. Usa almeno 12 caratteri e riprova."); location.assign("/intranet"); }
    catch (error) { setError(error instanceof Error ? error.message : "Operazione non riuscita."); } finally { setBusy(false); }
  }
  return <main id="main" className="staff-standalone"><div className="staff-card staff-activation"><Link href={SITE_ORIGIN} className="staff-wordmark"><StaffBrand/></Link><p className="staff-kicker">IL TUO ACCOUNT</p><h1>Imposta la password.</h1><p>Scegli una password di almeno 12 caratteri per accedere al workspace.</p>{error && <p className="staff-error" role="alert">{error}</p>}{ready && <form onSubmit={submit}><label>Nuova password<input type="password" minLength={12} maxLength={128} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}/></label><label>Conferma password<input type="password" minLength={12} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}/></label><button className="staff-button" disabled={busy}>{busy ? "Salvataggio…" : "Salva e accedi"}</button></form>}<Link href="/intranet/login" className="staff-text-button">Torna al login</Link></div></main>;
}
