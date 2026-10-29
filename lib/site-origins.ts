export const SITE_ORIGIN = "https://flightpr.it";
export const DASH_ORIGIN = "https://dash.flightpr.it";
export const LANDING_ORIGIN = "https://app.flightpr.it";
export const TRANSFER_ORIGIN = "https://transfer.flightpr.it";
export const MEDIA_ORIGIN = "https://drive.flightpr.it";
export function isPreviewOrigin(origin: string) {
  try { const { hostname } = new URL(origin); return ["localhost", "127.0.0.1", "[::1]"].includes(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".vercel.app"); }
  catch { return false; }
}
export function publicLandingUrl(slug: string, origin?: string) { return `${origin && isPreviewOrigin(origin) ? `${origin}/lp` : LANDING_ORIGIN}/${encodeURIComponent(slug)}`; }
export function publicTransferUrl(token: string, origin?: string) { return `${origin && isPreviewOrigin(origin) ? `${origin}/t` : TRANSFER_ORIGIN}/${encodeURIComponent(token)}`; }
export function staffActivationUrl(origin: string) { return `${origin}${new URL(origin).hostname === "dash.flightpr.it" ? "/activate" : "/intranet/activate"}`; }
export function internalStaffPath(path: string) { return path.startsWith("/intranet") ? path : path === "/" ? "/intranet" : `/intranet${path}`; }
