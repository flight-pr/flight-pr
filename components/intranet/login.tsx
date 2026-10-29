"use client";
import { ArrowRight, ArrowUpRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { media } from "@/data/media";
import { StaffBrand } from "./brand";
import { useState } from "react";
import { staffActivationUrl, SITE_ORIGIN } from "@/lib/site-origins";
import { browserAuth } from "@/lib/intranet/browser";

export function Login({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [reset, setReset] = useState(false); const [notice, setNotice] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const auth = browserAuth();
      if (reset) {
        const { error } = await auth.auth.resetPasswordForEmail(email, { redirectTo: staffActivationUrl(location.origin) });
        if (error) throw new Error("Impossibile inviare la richiesta. Riprova tra poco.");
        setNotice("Se l’indirizzo è registrato, riceverai un’email per impostare una nuova password.");
      } else {
        const { error } = await auth.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Email o password non valide. Verifica le credenziali.");
        window.location.assign("/intranet");
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Accesso non riuscito."); }
    finally { setBusy(false); }
  }
  return <main id="main" className="staff-login"><section className="staff-login-story"><div className="staff-login-media" aria-hidden="true"><Image src={media.hero} alt="" fill unoptimized priority sizes="(max-width: 760px) 100vw, 55vw"/><div className="hero-overlay"/><div className="hero-grain"/></div><Link href={SITE_ORIGIN} className="staff-wordmark"><StaffBrand subtitle="PERSONAL RECORDING"/></Link><div className="staff-login-copy"><p className="staff-kicker">THE BACKSTAGE OF EVERY STORY</p><h1>Le grandi storie.<br/>Iniziano <em>qui.</em></h1><p>Persone, progetti e nuove prospettive.<br/>Uno spazio per far volare il nostro lavoro.</p></div><div className="staff-login-foot"><span>FLIGHT WORKSPACE / 01</span><Link href={SITE_ORIGIN}>Torna al sito <ArrowUpRight size={14}/></Link></div></section><section className="staff-login-panel"><div className="staff-login-top"><span className="staff-access-dot"/> WORKSPACE RISERVATO</div><div className="staff-login-form"><div className="staff-icon-box"><LockKeyhole size={23}/></div><p className="staff-kicker">BENVENUTO NEL BACKSTAGE</p><h2>{reset ? "Recupera l’accesso." : "Il tuo spazio di lavoro."}</h2><p>{reset ? "Ti invieremo un link per reimpostare la password." : "Accedi con il tuo account Flight P.R. e riprendi da dove avevi lasciato."}</p>{!configured && <div className="staff-notice" role="status"><strong>Configurazione necessaria</strong><br/>L’accesso sarà disponibile dopo il collegamento a Supabase. Le istruzioni si trovano in <code>docs/intranet.md</code>.</div>}<form onSubmit={submit}><label>Email di lavoro<input type="email" autoComplete="username" placeholder="nome@flightpr.it" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!configured}/></label>{!reset && <label>Password<div className="staff-password"><input type={show ? "text" : "password"} autoComplete="current-password" placeholder="La tua password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={!configured}/><button type="button" aria-label={show ? "Nascondi password" : "Mostra password"} onClick={() => setShow(!show)}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>}<button type="button" className="staff-forgot" onClick={() => { setReset(!reset); setError(""); setNotice(""); }}>{reset ? "Torna al login" : "Hai dimenticato la password?"}</button>{error && <div className="staff-error" role="alert">{error}</div>}{notice && <div className="staff-success" role="status">{notice}</div>}<button className="staff-button staff-login-submit" disabled={!configured || busy}>{busy ? "Attendi…" : reset ? "Invia link di recupero" : "Accedi al workspace"}<ArrowRight size={18}/></button></form><div className="staff-login-help"><ShieldCheck size={18}/><span>Accesso riservato allo staff autorizzato.<br/>Per un account, contatta l’amministratore.</span></div></div><div className="staff-login-copyright">© {new Date().getFullYear()} FLIGHT P.R. <span>FATTO PER IL NOSTRO TEAM.</span></div></section></main>;
}
