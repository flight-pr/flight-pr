import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Staff } from "./types";

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function authConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
export async function serverAuth() {
  if (!authConfigured()) throw new ApiError(503, "Configura Supabase per attivare l’area staff.");
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: {
    getAll: () => jar.getAll(),
    setAll: (items) => { try { items.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server components refresh through proxy.ts. */ } },
  } });
}
export function adminDb() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) throw new ApiError(503, "Configura la chiave server di Supabase.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function requireStaff(admin = false) {
  const db = await serverAuth();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new ApiError(401, "Accedi con il tuo account staff.");
  const { data: profile, error: profileError } = await db.from("staff_profiles").select("*").eq("id", user.id).maybeSingle();
  if (profileError) throw new ApiError(503, "Database intranet non disponibile. Verifica la migrazione SQL.");
  if (!profile?.active) throw new ApiError(403, "Questo account non è abilitato all’area staff.");
  if (admin && profile.role !== "admin") throw new ApiError(403, "Questa operazione è riservata agli amministratori.");
  return { db, user, profile: profile as Staff };
}
export function checkOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== expected) throw new ApiError(403, "Origine della richiesta non consentita.");
}
export function dbError(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new ApiError(409, "Esiste già un elemento con questo indirizzo o identificativo.");
  throw new ApiError(400, "Impossibile salvare. Verifica i dati e riprova.");
}
export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ") }, { status: 400 });
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Richiesta JSON non valida." }, { status: 400 });
  console.error("Intranet request failed", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json({ error: "Servizio temporaneamente non disponibile. Riprova tra poco." }, { status: 500 });
}
export function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } }); }
