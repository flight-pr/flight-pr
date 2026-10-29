import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { domainRoute } from "@/lib/domain-routing";
import { maintenanceHtml, showSiteMaintenance } from "@/lib/site-maintenance";
export async function proxy(request: NextRequest) {
  // Next can normalize nextUrl to the internal server origin behind a proxy.
  const hostname = (request.headers.get("host") || request.nextUrl.host).split(":")[0].toLowerCase();
  const route = domainRoute(hostname, request.nextUrl.pathname);
  if (route.kind === "deny") return new NextResponse("Pagina non trovata", { status: 404, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "private, no-store" } });
  if (route.kind === "redirect") { const target = new URL(route.origin || request.url); target.pathname = route.path; target.search = request.nextUrl.search; return NextResponse.redirect(target, 308); }
  if (showSiteMaintenance(hostname, request.nextUrl.pathname, process.env.SITE_MAINTENANCE === "true")) {
    return new NextResponse(maintenanceHtml, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Retry-After": "3600" } });
  }
  const target = route.kind === "rewrite" ? new URL(route.path, request.url) : null;
  if (target) target.search = request.nextUrl.search;
  const makeResponse = () => target ? NextResponse.rewrite(target, { request }) : NextResponse.next({ request });
  let response = makeResponse();
  const staffRequest = hostname === "dash.flightpr.it" || request.nextUrl.pathname.startsWith("/intranet") || request.nextUrl.pathname.startsWith("/api/intranet/");
  if (!staffRequest || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return response;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (items) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = makeResponse(); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
  } });
  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store"); return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
