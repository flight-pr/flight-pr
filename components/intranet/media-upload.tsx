"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { formatBytes } from "@/lib/intranet/types";
async function prepareImage(file: File) {
  if (file.size > 25 * 1024 * 1024) throw new Error("Ogni immagine può pesare al massimo 25 MB.");
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) throw new Error("Scegli un’immagine JPG, PNG, WebP o AVIF.");
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d"); if (!context) throw new Error("Il browser non può preparare l’immagine."); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encode = (quality: number) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Impossibile ottimizzare l’immagine.")), "image/webp", quality));
    let blob = await encode(.84); if (blob.size > 3 * 1024 * 1024) blob = await encode(.65);
    if (blob.size > 3 * 1024 * 1024) throw new Error("L’immagine è troppo complessa. Scegli un file più piccolo.");
    return blob;
  } finally { bitmap.close(); }
}
export async function uploadSiteImage(file: File) {
  const prepared = await prepareImage(file); const body = new FormData(); body.set("file", prepared, "image.webp");
  const response = await fetch("/api/intranet/media", { method: "POST", body }); const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Caricamento non riuscito. Riprova.");
  return data as { url: string; width: number; height: number; bytes: number };
}
export function MediaUpload({ label, value, onChange, onBusyChange, onError }: { label: string; value: string; onChange: (url: string) => void; onBusyChange: (busy: boolean) => void; onError: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const [info, setInfo] = useState("");
  async function upload(file?: File) {
    if (!file) return; setBusy(true); onBusyChange(true); onError("");
    try { const image = await uploadSiteImage(file); onChange(image.url); setInfo(`WebP · ${image.width} × ${image.height} · ${formatBytes(image.bytes)}`); }
    catch (e) { onError((e as Error).message); } finally { setBusy(false); onBusyChange(false); }
  }
  return <div className="staff-media-upload"><span className="staff-media-label">{label}</span>{value && <div className="staff-media-thumbnail"><Image src={value} alt={label} unoptimized fill sizes="300px"/></div>}<div><button type="button" className="staff-button staff-button-light" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle size={16} className="staff-spin"/> : <ImagePlus size={16}/>} {busy ? "Ottimizzazione e upload…" : value ? "Sostituisci foto" : "Carica foto"}</button>{value && <button type="button" className="staff-icon-button staff-danger" aria-label={`Rimuovi ${label.toLowerCase()}`} disabled={busy} onClick={() => { onChange(""); setInfo(""); }}><X size={16}/></button>}</div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label={`Carica ${label.toLowerCase()}`} className="staff-sr-only" disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ""; }}/><small>{info || "JPG, PNG, WebP o AVIF fino a 25 MB. Conversione automatica in WebP per il sito."}</small></div>;
}
