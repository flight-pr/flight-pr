"use client";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/intranet/${path}`, { method, headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  let data; try { data = await response.json(); } catch { throw new Error("Il server non ha risposto correttamente. Riprova."); }
  if (!response.ok) { if (response.status === 401) window.location.assign("/intranet/login"); throw new Error(data.error || "Operazione non riuscita."); } return data as T;
}
export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`staff-dialog ${wide ? "staff-dialog-wide" : ""}`} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === ref.current) { const rect = ref.current.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose(); } }} aria-label={title}><div className="staff-dialog-header"><div><p className="staff-kicker">FLIGHT WORKSPACE</p><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button onClick={onClose} aria-label="Chiudi finestra" className="staff-icon-button"><X size={20}/></button></div>{children}</dialog>;
}
export function Empty({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) { return <div className="staff-empty"><span aria-hidden="true">↗</span><h3>{title}</h3><p>{copy}</p>{action}</div>; }
export function date(value: string | null, withTime = false) { if (!value) return "—"; return new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleString("it-IT", withTime ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" } : { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" }); }
export function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export function money(value: number) { return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value); }
export function Status({ value }: { value: string }) { return <span className={`staff-status status-${value.toLowerCase().replace(/\s/g, "-")}`}><i/>{({ uploading: "Caricamento", ready: "Disponibile", revoked: "Revocato", expired: "Scaduto", draft: "Bozza", published: "Pubblicata" } as Record<string, string>)[value] || value}</span>; }
